import * as THREE from 'three'

export const executePass = (
    gl: THREE.WebGLRenderer,
    scene: THREE.Scene,
    camera: THREE.Camera,
    quadMesh: THREE.Mesh,
    material: THREE.ShaderMaterial,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    uniforms: Record<string, any>,
    renderTarget: THREE.WebGLRenderTarget | null,
) => {
    quadMesh.material = material

    for (const uniformName in uniforms) {
        material.uniforms[uniformName].value = uniforms[uniformName]
    }

    gl.setRenderTarget(renderTarget)
    gl.render(scene, camera)
    gl.setRenderTarget(null)
}
