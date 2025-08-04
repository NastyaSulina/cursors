import {
    advectionManualFilteringSource,
    advectionSource,
    baseVertexSource,
    clearSource,
    curlSource,
    displaySource,
    divergenceSource,
    gradientSubtractSource,
    pressureSource,
    splatSource,
    vorticitySource,
} from './shaders'
import { Pointer, Config, Ext, DoubleFBO, FBO } from './types'
import { randomHueColor } from './utils'
import { getWebGLContext } from './webglContext'

const config: Config = {
    TEXTURE_DOWNSAMPLE: 1,
    DENSITY_DISSIPATION: 0.97,
    VELOCITY_DISSIPATION: 0.99,
    PRESSURE_DISSIPATION: 0.95,
    PRESSURE_ITERATIONS: 30,
    SPLAT_RADIUS: 0.005,
    CURL: 7,
}

class PointerImpl implements Pointer {
    id = -1
    x = 0
    y = 0
    dx = 0
    dy = 0
    down = false
    moved = false
    color: [number, number, number] = [30, 0, 300]
    lastColorTime = 0
}

class GLProgram {
    program: WebGLProgram
    uniforms: Record<string, WebGLUniformLocation | null> = {}

    constructor(vs: WebGLShader, fs: WebGLShader) {
        const prg = gl.createProgram()
        if (!prg) throw new Error('Failed to create program')
        this.program = prg
        gl.attachShader(prg, vs)
        gl.attachShader(prg, fs)
        gl.linkProgram(prg)
        if (!gl.getProgramParameter(prg, gl.LINK_STATUS)) {
            throw new Error(gl.getProgramInfoLog(prg) || 'Link error')
        }
        const count = gl.getProgramParameter(prg, gl.ACTIVE_UNIFORMS) as number
        for (let i = 0; i < count; i++) {
            const info = gl.getActiveUniform(prg, i)
            if (info) this.uniforms[info.name] = gl.getUniformLocation(prg, info.name)
        }
    }

    bind() {
        gl.useProgram(this.program)
    }
}

function compileShader(gl: WebGL2RenderingContext, type: GLenum, source: string): WebGLShader {
    const sh = gl.createShader(type)!
    gl.shaderSource(sh, source)
    gl.compileShader(sh)
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        throw new Error(gl.getShaderInfoLog(sh)!)
    }
    return sh
}

function initFramebuffers(): void {
    textureWidth = gl.drawingBufferWidth >> config.TEXTURE_DOWNSAMPLE
    textureHeight = gl.drawingBufferHeight >> config.TEXTURE_DOWNSAMPLE

    const texType = ext.halfFloatTexType
    const { formatRGBA: rgba, formatRG: rg, formatR: r } = ext

    density = createDoubleFBO(
        2,
        textureWidth,
        textureHeight,
        rgba.internalFormat,
        rgba.format,
        texType,
        ext.supportLinearFiltering ? gl.LINEAR : gl.NEAREST,
    )
    velocity = createDoubleFBO(
        0,
        textureWidth,
        textureHeight,
        rg.internalFormat,
        rg.format,
        texType,
        ext.supportLinearFiltering ? gl.LINEAR : gl.NEAREST,
    )
    divergence = createFBO(
        4,
        textureWidth,
        textureHeight,
        r.internalFormat,
        r.format,
        texType,
        gl.NEAREST,
    )
    curl = createFBO(
        5,
        textureWidth,
        textureHeight,
        r.internalFormat,
        r.format,
        texType,
        gl.NEAREST,
    )
    pressure = createDoubleFBO(
        6,
        textureWidth,
        textureHeight,
        r.internalFormat,
        r.format,
        texType,
        gl.NEAREST,
    )
}

function createFBO(
    texId: number,
    w: number,
    h: number,
    internalFormat: number,
    format: number,
    type: number,
    param: number,
): [WebGLTexture, WebGLFramebuffer, number] {
    gl.activeTexture(gl.TEXTURE0 + texId)
    const texture = gl.createTexture()!
    gl.bindTexture(gl.TEXTURE_2D, texture)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, param)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, param)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, w, h, 0, format, type, null)

    const fbo = gl.createFramebuffer()!
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo)
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0)
    gl.viewport(0, 0, w, h)
    gl.clear(gl.COLOR_BUFFER_BIT)

    return [texture, fbo, texId]
}

function createDoubleFBO(
    texId: number,
    w: number,
    h: number,
    internalFormat: number,
    format: number,
    type: number,
    param: number,
) {
    let fbo1 = createFBO(texId, w, h, internalFormat, format, type, param)
    let fbo2 = createFBO(texId + 1, w, h, internalFormat, format, type, param)

    return {
        get read() {
            return fbo1
        },
        get write() {
            return fbo2
        },
        swap() {
            ;[fbo1, fbo2] = [fbo2, fbo1]
        },
    }
}

function update(): void {
    resizeCanvas()

    const now = Date.now()
    const dt = Math.min((now - lastTime) / 1000, 0.016)
    lastTime = now

    gl.viewport(0, 0, textureWidth, textureHeight)

    if (splatStack.length > 0) multipleSplats(splatStack.pop()!)

    // Advection: velocity
    advectionProgram.bind()
    gl.uniform2f(advectionProgram.uniforms.texelSize, 1 / textureWidth, 1 / textureHeight)
    gl.uniform1i(advectionProgram.uniforms.uVelocity, velocity.read[2])
    gl.uniform1i(advectionProgram.uniforms.uSource, velocity.read[2])
    gl.uniform1f(advectionProgram.uniforms.dt, dt)
    gl.uniform1f(advectionProgram.uniforms.dissipation, config.VELOCITY_DISSIPATION)
    blit(velocity.write[1])
    velocity.swap()

    // Advection: density
    gl.uniform1i(advectionProgram.uniforms.uVelocity, velocity.read[2])
    gl.uniform1i(advectionProgram.uniforms.uSource, density.read[2])
    gl.uniform1f(advectionProgram.uniforms.dissipation, config.DENSITY_DISSIPATION)
    blit(density.write[1])
    density.swap()

    // Splat from pointers
    if (pointer.moved) {
        splat(pointer.x, pointer.y, pointer.dx, pointer.dy, pointer.color)
        pointer.moved = false
    }

    // Compute curl
    curlProgram.bind()
    gl.uniform2f(curlProgram.uniforms.texelSize, 1 / textureWidth, 1 / textureHeight)
    gl.uniform1i(curlProgram.uniforms.uVelocity, velocity.read[2])
    blit(curl[1])

    // Vorticity
    vorticityProgram.bind()
    gl.uniform2f(vorticityProgram.uniforms.texelSize, 1 / textureWidth, 1 / textureHeight)
    gl.uniform1i(vorticityProgram.uniforms.uVelocity, velocity.read[2])
    gl.uniform1i(vorticityProgram.uniforms.uCurl, curl[2])
    gl.uniform1f(vorticityProgram.uniforms.curl, config.CURL)
    gl.uniform1f(vorticityProgram.uniforms.dt, dt)
    blit(velocity.write[1])
    velocity.swap()

    // Divergence
    divergenceProgram.bind()
    gl.uniform2f(divergenceProgram.uniforms.texelSize, 1 / textureWidth, 1 / textureHeight)
    gl.uniform1i(divergenceProgram.uniforms.uVelocity, velocity.read[2])
    blit(divergence[1])

    // Clear & Pressure solve
    clearProgram.bind()
    let pId = pressure.read[2]
    gl.activeTexture(gl.TEXTURE0 + pId)
    gl.bindTexture(gl.TEXTURE_2D, pressure.read[0])
    gl.uniform1i(clearProgram.uniforms.uTexture, pId)
    gl.uniform1f(clearProgram.uniforms.value, config.PRESSURE_DISSIPATION)
    blit(pressure.write[1])
    pressure.swap()

    pressureProgram.bind()
    gl.uniform2f(pressureProgram.uniforms.texelSize, 1 / textureWidth, 1 / textureHeight)
    gl.uniform1i(pressureProgram.uniforms.uDivergence, divergence[2])
    pId = pressure.read[2]
    gl.uniform1i(pressureProgram.uniforms.uPressure, pId)
    gl.activeTexture(gl.TEXTURE0 + pId)
    for (let i = 0; i < config.PRESSURE_ITERATIONS; i++) {
        gl.bindTexture(gl.TEXTURE_2D, pressure.read[0])
        blit(pressure.write[1])
        pressure.swap()
    }

    // Gradient subtraction
    gradienSubtractProgram.bind()
    gl.uniform2f(gradienSubtractProgram.uniforms.texelSize, 1 / textureWidth, 1 / textureHeight)
    gl.uniform1i(gradienSubtractProgram.uniforms.uPressure, pressure.read[2])
    gl.uniform1i(gradienSubtractProgram.uniforms.uVelocity, velocity.read[2])
    blit(velocity.write[1])
    velocity.swap()

    // Display to screen
    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight)
    displayProgram.bind()
    gl.uniform1i(displayProgram.uniforms.uTexture, density.read[2])
    blit(null)

    requestAnimationFrame(update)
}

function splat(
    x: number,
    y: number,
    dx: number,
    dy: number,
    color: [number, number, number],
): void {
    splatProgram.bind()
    gl.uniform1i(splatProgram.uniforms.uTarget, velocity.read[2])
    gl.uniform1f(splatProgram.uniforms.aspectRatio, canvas.width / canvas.height)
    gl.uniform2f(splatProgram.uniforms.point, x / canvas.width, 1 - y / canvas.height)
    gl.uniform3f(splatProgram.uniforms.color, dx, -dy, 1)
    gl.uniform1f(splatProgram.uniforms.radius, config.SPLAT_RADIUS)
    blit(velocity.write[1])
    velocity.swap()

    const COLOR_SCALE = 1.5

    gl.uniform1i(splatProgram.uniforms.uTarget, density.read[2])
    gl.uniform3f(
        splatProgram.uniforms.color,
        color[0] * COLOR_SCALE,
        color[1] * COLOR_SCALE,
        color[2] * COLOR_SCALE,
    )
    blit(density.write[1])
    density.swap()
}

function multipleSplats(amount: number): void {
    for (let i = 0; i < amount; i++) {
        const color: [number, number, number] = [
            Math.random() * 10,
            Math.random() * 10,
            Math.random() * 10,
        ]
        const x = canvas.width * Math.random()
        const y = canvas.height * Math.random()
        const dx = 1000 * (Math.random() - 0.5)
        const dy = 1000 * (Math.random() - 0.5)

        splat(x, y, dx, dy, color)
    }
}

function resizeCanvas(): void {
    if (canvas.width !== canvas.clientWidth || canvas.height !== canvas.clientHeight) {
        canvas.width = canvas.clientWidth
        canvas.height = canvas.clientHeight
        initFramebuffers()
    }
}

const splatStack: number[] = []

const canvas = document.getElementsByTagName('canvas')[0] as HTMLCanvasElement
canvas.width = canvas.clientWidth
canvas.height = canvas.clientHeight

const { gl, ext }: { gl: WebGL2RenderingContext; ext: Ext } = getWebGLContext(canvas)
const pointer: Pointer = new PointerImpl()

let textureWidth: number
let textureHeight: number
let density: DoubleFBO
let velocity: DoubleFBO
let divergence: FBO
let curl: FBO
let pressure: DoubleFBO

initFramebuffers()

// Compile shaders
const baseVertexShader = compileShader(gl, gl.VERTEX_SHADER, baseVertexSource)
const clearShader = compileShader(gl, gl.FRAGMENT_SHADER, clearSource)
const displayShader = compileShader(gl, gl.FRAGMENT_SHADER, displaySource)
const splatShader = compileShader(gl, gl.FRAGMENT_SHADER, splatSource)
const advectionManualFilteringShader = compileShader(
    gl,
    gl.FRAGMENT_SHADER,
    advectionManualFilteringSource,
)
const advectionShader = compileShader(gl, gl.FRAGMENT_SHADER, advectionSource)
const divergenceShader = compileShader(gl, gl.FRAGMENT_SHADER, divergenceSource)
const curlShader = compileShader(gl, gl.FRAGMENT_SHADER, curlSource)
const vorticityShader = compileShader(gl, gl.FRAGMENT_SHADER, vorticitySource)
const pressureShader = compileShader(gl, gl.FRAGMENT_SHADER, pressureSource)
const gradientSubtractShader = compileShader(gl, gl.FRAGMENT_SHADER, gradientSubtractSource)

// Create programs
const clearProgram = new GLProgram(baseVertexShader, clearShader)
const displayProgram = new GLProgram(baseVertexShader, displayShader)
const splatProgram = new GLProgram(baseVertexShader, splatShader)
const advectionProgram = new GLProgram(
    baseVertexShader,
    ext.supportLinearFiltering ? advectionShader : advectionManualFilteringShader,
)
const divergenceProgram = new GLProgram(baseVertexShader, divergenceShader)
const curlProgram = new GLProgram(baseVertexShader, curlShader)
const vorticityProgram = new GLProgram(baseVertexShader, vorticityShader)
const pressureProgram = new GLProgram(baseVertexShader, pressureShader)
const gradienSubtractProgram = new GLProgram(baseVertexShader, gradientSubtractShader)

const blit = (() => {
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer())
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, -1, 1, 1, 1, 1, -1]), gl.STATIC_DRAW)
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer())
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array([0, 1, 2, 0, 2, 3]), gl.STATIC_DRAW)
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)
    gl.enableVertexAttribArray(0)

    return (destination: WebGLFramebuffer | null) => {
        gl.bindFramebuffer(gl.FRAMEBUFFER, destination)
        gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0)
    }
})()

let lastTime: number = Date.now()
update()

const COLOR_INTERVAL = 150

canvas.addEventListener(
    'pointermove',
    (e: PointerEvent) => {
        e.preventDefault()
        const rect = canvas.getBoundingClientRect()
        const x = e.clientX - rect.left
        const y = e.clientY - rect.top
        const now = performance.now()

        pointer.down = true
        pointer.moved = pointer.down

        pointer.dx = (x - pointer.x) * 10
        pointer.dy = (y - pointer.y) * 10
        pointer.x = x
        pointer.y = y

        if (now - pointer.lastColorTime > COLOR_INTERVAL) {
            pointer.color = randomHueColor()
            pointer.lastColorTime = now
        }
    },
    { passive: false },
)

canvas.addEventListener('pointerleave', () => {
    pointer.down = false
})
