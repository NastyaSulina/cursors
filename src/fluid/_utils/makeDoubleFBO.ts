import * as THREE from 'three'

export interface DoubleFBO {
    read: THREE.WebGLRenderTarget
    write: THREE.WebGLRenderTarget
    swap(): void
}

export const makeDoubleFBO = (
    width: number,
    height: number,
    options?: {
        depth?: boolean
    } & THREE.RenderTargetOptions,
): DoubleFBO => {
    let renderTargetA = new THREE.WebGLRenderTarget(width, height, options)
    let renderTargetB = new THREE.WebGLRenderTarget(width, height, options)

    return {
        get read() {
            return renderTargetA
        },
        get write() {
            return renderTargetB
        },
        swap() {
            ;[renderTargetA, renderTargetB] = [renderTargetB, renderTargetA]
        },
    }
}

export const disposeDoubleFBO = (d: DoubleFBO) => {
    d.read.dispose()
    d.write.dispose()
}
