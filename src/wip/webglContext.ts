import { Ext, Format } from './types'

const _formatCache = new Map<string, Format | null>()

export function getSupportedFormat(
    gl: WebGL2RenderingContext,
    internalFormat: GLenum,
    format: GLenum,
    type: GLenum,
): Format | null {
    const key = `${internalFormat}_${format}_${type}`
    if (_formatCache.has(key)) return _formatCache.get(key)!

    if (supportRenderTextureFormat(gl, internalFormat, format, type)) {
        const fmt = { internalFormat, format }
        _formatCache.set(key, fmt)
        return fmt
    }

    // fallback HDR → RG16F → RGBA16F
    if (internalFormat === gl.R16F) {
        const fallback = getSupportedFormat(gl, gl.RG16F, gl.RG, type)
        _formatCache.set(key, fallback)
        return fallback
    }
    if (internalFormat === gl.RG16F) {
        const fallback = getSupportedFormat(gl, gl.RGBA16F, gl.RGBA, type)
        _formatCache.set(key, fallback)
        return fallback
    }

    _formatCache.set(key, null)
    return null
}

const _fboCache = new Map<string, boolean>()

export function supportRenderTextureFormat(
    gl: WebGL2RenderingContext,
    internalFormat: GLenum,
    format: GLenum,
    type: GLenum,
    size: number = 1,
): boolean {
    const key = `${internalFormat}_${format}_${type}_${size}`
    if (_fboCache.has(key)) return _fboCache.get(key)!

    const tex = gl.createTexture()!
    gl.bindTexture(gl.TEXTURE_2D, tex)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, size, size, 0, format, type, null)

    const fbo = gl.createFramebuffer()!
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo)
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0)

    const ok = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE
    gl.deleteFramebuffer(fbo)
    gl.deleteTexture(tex)
    _fboCache.set(key, ok)
    return ok
}

// --- Основная функция инициализации контекста ---
export function getWebGLContext(canvas: HTMLCanvasElement): {
    gl: WebGL2RenderingContext
    ext: Ext
} {
    const gl = canvas.getContext('webgl2', {
        alpha: false,
        depth: false,
        stencil: false,
        antialias: false,
    }) as WebGL2RenderingContext | null

    if (!gl) {
        throw new Error('WebGL2 не поддерживается в этом браузере')
    }

    // Простейшие float-расширения
    gl.getExtension('EXT_color_buffer_float') // обычно нужно для рендеринга в RGBA16F
    const linearFilterExt = gl.getExtension('OES_texture_float_linear')
    const halfFloatTexType = gl.HALF_FLOAT

    // Фон
    gl.clearColor(0, 0, 0, 1)

    // «Internal» форматы, которые мы хотим проверить
    const internalRGBA = gl.RGBA16F
    const internalRG = gl.RG16F
    const internalR = gl.R16F

    // Вычисляем первый рабочий вариант для каждого
    const formatRGBA = getSupportedFormat(gl, internalRGBA, gl.RGBA, halfFloatTexType)!
    const formatRG = getSupportedFormat(gl, internalRG, gl.RG, halfFloatTexType)!
    const formatR = getSupportedFormat(gl, internalR, gl.RED, halfFloatTexType)!

    return {
        gl,
        ext: {
            formatRGBA,
            formatRG,
            formatR,
            halfFloatTexType,
            linearFilterExt,
            supportLinearFiltering: !!linearFilterExt,
        },
    }
}
