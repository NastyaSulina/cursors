export interface Config {
    TEXTURE_DOWNSAMPLE: number
    DENSITY_DISSIPATION: number
    VELOCITY_DISSIPATION: number
    PRESSURE_DISSIPATION: number
    PRESSURE_ITERATIONS: number
    CURL: number
    SPLAT_RADIUS: number
}

export interface Pointer {
    id: number
    x: number
    y: number
    dx: number
    dy: number
    down: boolean
    moved: boolean
    color: [number, number, number]
    lastColorTime: number
}

export type Format = { internalFormat: GLenum; format: GLenum }

export interface Ext {
    formatRGBA: Format
    formatRG: Format
    formatR: Format
    halfFloatTexType: GLenum
    linearFilterExt: OES_texture_float_linear | null
    supportLinearFiltering: boolean
}
export type FBO = [WebGLTexture, WebGLFramebuffer, number]
export interface DoubleFBO {
    read: FBO
    write: FBO
    swap(): void
}
