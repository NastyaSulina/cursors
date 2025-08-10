import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'

import styles from './FluidCanvas.module.scss'

import { CONFIG, DENSITY_OPTS, RED_NEAREST_OPTS, VELOCITY_OPTS } from './constants'
import {
    createAdvectionMaterial,
    createCurlMaterial,
    createDisplayMaterial,
    createDivergenceMaterial,
    createGradientMaterial,
    createPressureClearMaterial,
    createPressureSolveMaterial,
    createSplatMaterial,
    createVorticityMaterial,
} from './materials'
import { DoubleFBO, Pointer, disposeDoubleFBO, makeDoubleFBO } from './_utils'

export const FluidCanvas = () => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null)

    let velocity: DoubleFBO
    let density: DoubleFBO
    let pressure: DoubleFBO
    let curlFramebuffer: THREE.WebGLRenderTarget
    let divergenceFramebuffer: THREE.WebGLRenderTarget

    let simulationWidth: number
    let simulationHeight: number
    let texelSize: THREE.Vector2

    const advectionMaterial = useMemo(() => createAdvectionMaterial(), [])
    const splatMaterial = useMemo(() => createSplatMaterial(), [])
    const displayMaterial = useMemo(() => createDisplayMaterial(), [])
    const curlMaterial = useMemo(() => createCurlMaterial(), [])
    const vorticityMaterial = useMemo(() => createVorticityMaterial(), [])
    const divergenceMaterial = useMemo(() => createDivergenceMaterial(), [])
    const pressureClearMaterial = useMemo(() => createPressureClearMaterial(), [])
    const pressureSolveMaterial = useMemo(() => createPressureSolveMaterial(), [])
    const gradientMaterial = useMemo(() => createGradientMaterial(), [])

    useEffect(() => {
        const canvas = canvasRef.current!
        const gl = new THREE.WebGLRenderer({
            canvas,
            antialias: false,
            alpha: false,
            depth: false,
            stencil: false,
            powerPreference: 'high-performance',
        })

        gl.autoClear = false
        gl.setPixelRatio(1)

        const pointer = new Pointer(canvas, CONFIG.COLOR_INTERVAL)
        const simulationScene = new THREE.Scene()
        const simulationCamera = new THREE.Camera()
        const fullScreenQuad = new THREE.Mesh(
            new THREE.PlaneGeometry(2, 2),
            new THREE.MeshBasicMaterial(),
        )

        simulationScene.add(fullScreenQuad)

        let lastT = performance.now()

        const initFramebuffers = () => {
            if (velocity) {
                disposeDoubleFBO(velocity)
                disposeDoubleFBO(density)
                disposeDoubleFBO(pressure)

                curlFramebuffer.dispose()
                divergenceFramebuffer.dispose()
            }

            simulationWidth = Math.max(1, Math.floor(canvas.clientWidth / CONFIG.DOWNSAMPLE))
            simulationHeight = Math.max(1, Math.floor(canvas.clientHeight / CONFIG.DOWNSAMPLE))
            texelSize = new THREE.Vector2(1 / simulationWidth, 1 / simulationHeight)

            gl.setSize(canvas.clientWidth, canvas.clientHeight, false)

            velocity = makeDoubleFBO(simulationWidth, simulationHeight, VELOCITY_OPTS)
            density = makeDoubleFBO(simulationWidth, simulationHeight, DENSITY_OPTS)
            pressure = makeDoubleFBO(simulationWidth, simulationHeight, RED_NEAREST_OPTS)
            curlFramebuffer = new THREE.WebGLRenderTarget(
                simulationWidth,
                simulationHeight,
                RED_NEAREST_OPTS,
            )
            divergenceFramebuffer = new THREE.WebGLRenderTarget(
                simulationWidth,
                simulationHeight,
                RED_NEAREST_OPTS,
            )

            splatMaterial.uniforms.texelSize.value = texelSize
            advectionMaterial.uniforms.texelSize.value = texelSize
            curlMaterial.uniforms.texelSize.value = texelSize
            vorticityMaterial.uniforms.texelSize.value = texelSize
            divergenceMaterial.uniforms.texelSize.value = texelSize
            pressureClearMaterial.uniforms.texelSize.value = texelSize
            pressureSolveMaterial.uniforms.texelSize.value = texelSize
            gradientMaterial.uniforms.texelSize.value = texelSize
            displayMaterial.uniforms.texelSize.value = texelSize

            splatMaterial.uniforms.aspectRatio.value = simulationWidth / simulationHeight
            splatMaterial.uniforms.radius.value = CONFIG.SPLAT_RADIUS
            vorticityMaterial.uniforms.curl.value = CONFIG.CURL_STRENGTH
            pressureClearMaterial.uniforms.value.value = CONFIG.PRESSURE_DISS

            lastT = performance.now()
        }

        initFramebuffers()
        window.addEventListener('resize', initFramebuffers)

        const executePass = (
            material: THREE.ShaderMaterial,
            renderTarget: THREE.WebGLRenderTarget | null,
        ) => {
            ;(fullScreenQuad as THREE.Mesh).material = material

            gl.setRenderTarget(renderTarget)
            gl.render(simulationScene, simulationCamera)
            gl.setRenderTarget(null)
        }

        let raf = 0
        const frame = (now: number) => {
            raf = requestAnimationFrame(frame)

            const deltaTime = Math.min((now - lastT) / 1000, CONFIG.MAX_DELTA)
            lastT = now

            // Advect velocity
            advectionMaterial.uniforms.uVelocity.value = velocity.read.texture
            advectionMaterial.uniforms.uSource.value = velocity.read.texture
            advectionMaterial.uniforms.dissipation.value = CONFIG.VELOCITY_DISS
            advectionMaterial.uniforms.dt.value = deltaTime
            executePass(advectionMaterial, velocity.write)
            velocity.swap()

            // Advect density
            advectionMaterial.uniforms.uVelocity.value = velocity.read.texture
            advectionMaterial.uniforms.uSource.value = density.read.texture
            advectionMaterial.uniforms.dissipation.value = CONFIG.DENSITY_DISS
            executePass(advectionMaterial, density.write)
            density.swap()

            if (pointer.moved) {
                // Splat velocity
                splatMaterial.uniforms.uTarget.value = velocity.read.texture
                splatMaterial.uniforms.point.value.copy(pointer.uv)
                splatMaterial.uniforms.color.value.set(pointer.dx, -pointer.dy, 1)
                executePass(splatMaterial, velocity.write)
                velocity.swap()

                // Splat density
                splatMaterial.uniforms.uTarget.value = density.read.texture
                splatMaterial.uniforms.color.value
                    .copy(pointer.color)
                    .multiplyScalar(CONFIG.SPLAT_COLOR_SCALE)
                executePass(splatMaterial, density.write)
                density.swap()

                pointer.reset()
            }

            // Compute curl
            curlMaterial.uniforms.uVelocity.value = velocity.read.texture
            executePass(curlMaterial, curlFramebuffer)

            // Vorticity confinement
            vorticityMaterial.uniforms.uVelocity.value = velocity.read.texture
            vorticityMaterial.uniforms.uCurl.value = curlFramebuffer.texture
            vorticityMaterial.uniforms.dt.value = deltaTime
            executePass(vorticityMaterial, velocity.write)
            velocity.swap()

            // Compute divergence
            divergenceMaterial.uniforms.uVelocity.value = velocity.read.texture
            executePass(divergenceMaterial, divergenceFramebuffer)

            // Clear pressure buffer
            pressureClearMaterial.uniforms.uTexture.value = pressure.read.texture
            executePass(pressureClearMaterial, pressure.write)
            pressure.swap()

            // Pressure solve (Jacobi)
            pressureSolveMaterial.uniforms.uDivergence.value = divergenceFramebuffer.texture
            for (let i = 0; i < CONFIG.PRESSURE_ITERATIONS; i++) {
                pressureSolveMaterial.uniforms.uPressure.value = pressure.read.texture
                executePass(pressureSolveMaterial, pressure.write)
                pressure.swap()
            }

            // Subtract pressure gradient
            gradientMaterial.uniforms.uPressure.value = pressure.read.texture
            gradientMaterial.uniforms.uVelocity.value = velocity.read.texture
            executePass(gradientMaterial, velocity.write)
            velocity.swap()

            // Render to screen
            displayMaterial.uniforms.uTexture.value = density.read.texture
            executePass(displayMaterial, null)
        }

        raf = requestAnimationFrame(frame)

        return () => {
            cancelAnimationFrame(raf)
            window.removeEventListener('resize', initFramebuffers)
            pointer.dispose()

            disposeDoubleFBO(velocity)
            disposeDoubleFBO(density)
            disposeDoubleFBO(pressure)
            curlFramebuffer.dispose()
            divergenceFramebuffer.dispose()
            ;(fullScreenQuad.geometry as THREE.BufferGeometry).dispose()
            ;(fullScreenQuad.material as THREE.Material).dispose()

            advectionMaterial.dispose()
            splatMaterial.dispose()
            curlMaterial.dispose()
            vorticityMaterial.dispose()
            divergenceMaterial.dispose()
            pressureClearMaterial.dispose()
            pressureSolveMaterial.dispose()
            gradientMaterial.dispose()
            displayMaterial.dispose()

            gl.dispose()
        }
    }, [])

    return <canvas ref={canvasRef} className={styles.canvas} />
}
