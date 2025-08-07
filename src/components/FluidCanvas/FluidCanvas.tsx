import React, { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { Canvas, useFrame, useThree, extend } from '@react-three/fiber'
import { useFBO } from '@react-three/drei'

import { CONFIG } from './constants'
import { Pointer } from './_utils'
import {
    AdvectionMaterial,
    SplatMaterial,
    CurlMaterial,
    VorticityMaterial,
    DivergenceMaterial,
    PressureClearMaterial,
    PressureSolveMaterial,
    GradientMaterial,
    DisplayMaterial,
} from './materials'
import { executePass } from './executePass'

import { useDoubleFBO } from '@/hooks'

extend({
    AdvectionMaterial,
    SplatMaterial,
    CurlMaterial,
    VorticityMaterial,
    DivergenceMaterial,
    PressureClearMaterial,
    PressureSolveMaterial,
    GradientMaterial,
    DisplayMaterial,
})

const FluidSimulation: React.FC = () => {
    const { gl, size } = useThree()
    const canvasElement = gl.domElement as HTMLCanvasElement

    const simulationWidth = Math.floor(size.width / CONFIG.DOWNSAMPLE)
    const simulationHeight = Math.floor(size.height / CONFIG.DOWNSAMPLE)
    const simulationScene = useMemo(() => new THREE.Scene(), [])
    const simulationCamera = useMemo(() => new THREE.Camera(), [])
    const texelSize = new THREE.Vector2(1 / simulationWidth, 1 / simulationHeight)

    const fullScreenQuad = useMemo(() => {
        const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.MeshBasicMaterial())
        simulationScene.add(mesh)

        return mesh
    }, [simulationScene])

    const pointer = useMemo(
        () => new Pointer(canvasElement, CONFIG.COLOR_INTERVAL),
        [canvasElement],
    )
    useEffect(() => () => pointer.dispose(), [pointer])

    const density = useDoubleFBO(simulationWidth, simulationHeight, CONFIG.FBO_OPTIONS)
    const velocity = useDoubleFBO(simulationWidth, simulationHeight, CONFIG.FBO_OPTIONS)
    const pressure = useDoubleFBO(simulationWidth, simulationHeight, CONFIG.FBO_OPTIONS)
    const curlFramebuffer = useFBO(simulationWidth, simulationHeight, CONFIG.FBO_OPTIONS)
    const divergenceFramebuffer = useFBO(simulationWidth, simulationHeight, CONFIG.FBO_OPTIONS)

    const advectionMaterial = useMemo(() => new AdvectionMaterial(), [])
    const splatMaterial = useMemo(() => new SplatMaterial(), [])
    const curlMaterial = useMemo(() => new CurlMaterial(), [])
    const vorticityMaterial = useMemo(() => new VorticityMaterial(), [])
    const divergenceMaterial = useMemo(() => new DivergenceMaterial(), [])
    const gradientMaterial = useMemo(() => new GradientMaterial(), [])
    const pressureClearMaterial = useMemo(() => new PressureClearMaterial(), [])
    const pressureSolveMaterial = useMemo(() => new PressureSolveMaterial(), [])
    const displayMaterial = useMemo(() => new DisplayMaterial(), [])

    const scratchColor = useMemo(() => new THREE.Vector3(), [])

    useFrame(({ clock }) => {
        gl.autoClear = false
        gl.clear()

        const deltaTime = Math.min(clock.getDelta(), CONFIG.MAX_DELTA)
        const pointerUV = pointer.uv

        // 1. SPLAT (вливание)
        if (pointer.moved) {
            executePass(
                gl,
                simulationScene,
                simulationCamera,
                fullScreenQuad,
                splatMaterial,
                {
                    texelSize,
                    aspectRatio: simulationWidth / simulationHeight,
                    uTarget: velocity.read.texture,
                    color: scratchColor
                        .set(pointer.dx, -pointer.dy, 1)
                        .multiplyScalar(CONFIG.SPLAT_FORCE),
                    point: pointerUV,
                    radius: CONFIG.SPLAT_RADIUS,
                },
                velocity.write,
            )
            velocity.swap()

            executePass(
                gl,
                simulationScene,
                simulationCamera,
                fullScreenQuad,
                splatMaterial,
                {
                    texelSize,
                    aspectRatio: simulationWidth / simulationHeight,
                    uTarget: density.read.texture,
                    color: scratchColor
                        .copy(pointer.color)
                        .multiplyScalar(CONFIG.SPLAT_COLOR_SCALE),
                    point: pointerUV,
                    radius: CONFIG.SPLAT_RADIUS,
                },
                density.write,
            )
            density.swap()
            pointer.reset()
        }

        // 2. Advect velocity
        executePass(
            gl,
            simulationScene,
            simulationCamera,
            fullScreenQuad,
            advectionMaterial,
            {
                uVelocity: velocity.read.texture,
                uSource: velocity.read.texture,
                dissipation: CONFIG.VELOCITY_DISS,
                texelSize,
                dt: deltaTime,
            },
            velocity.write,
        )
        velocity.swap()

        // 3. Advect density
        executePass(
            gl,
            simulationScene,
            simulationCamera,
            fullScreenQuad,
            advectionMaterial,
            {
                uVelocity: velocity.read.texture,
                uSource: density.read.texture,
                dissipation: CONFIG.DENSITY_DISS,
                texelSize,
                dt: deltaTime,
            },
            density.write,
        )
        density.swap()

        // 4. Compute curl
        executePass(
            gl,
            simulationScene,
            simulationCamera,
            fullScreenQuad,
            curlMaterial,
            {
                uVelocity: velocity.read.texture,
                texelSize,
            },
            curlFramebuffer,
        )

        // 5. Vorticity confinement
        executePass(
            gl,
            simulationScene,
            simulationCamera,
            fullScreenQuad,
            vorticityMaterial,
            {
                uVelocity: velocity.read.texture,
                uCurl: curlFramebuffer.texture,
                curl: CONFIG.CURL_STRENGTH,
                texelSize,
                dt: deltaTime,
            },
            velocity.write,
        )
        velocity.swap()

        // 6. Compute divergence
        executePass(
            gl,
            simulationScene,
            simulationCamera,
            fullScreenQuad,
            divergenceMaterial,
            { uVelocity: velocity.read.texture, texelSize },
            divergenceFramebuffer,
        )

        // 7. Clear pressure buffer
        executePass(
            gl,
            simulationScene,
            simulationCamera,
            fullScreenQuad,
            pressureClearMaterial,
            {
                uTexture: pressure.read.texture,
                value: CONFIG.PRESSURE_DISS,
                texelSize,
            },
            pressure.write,
        )
        pressure.swap()

        // 8. Pressure solve (Jacobi iterations)
        for (let i = 0; i < CONFIG.PRESSURE_ITERATIONS; i++) {
            executePass(
                gl,
                simulationScene,
                simulationCamera,
                fullScreenQuad,
                pressureSolveMaterial,
                {
                    uPressure: pressure.read.texture,
                    uDivergence: divergenceFramebuffer.texture,
                    texelSize,
                },
                pressure.write,
            )
            pressure.swap()
        }

        // 9. Subtract pressure gradient
        executePass(
            gl,
            simulationScene,
            simulationCamera,
            fullScreenQuad,
            gradientMaterial,
            {
                uPressure: pressure.read.texture,
                uVelocity: velocity.read.texture,
                texelSize,
            },
            velocity.write,
        )
        velocity.swap()

        // 10. Render to screen
        executePass(
            gl,
            simulationScene,
            simulationCamera,
            fullScreenQuad,
            displayMaterial,
            { uTexture: density.read.texture, texelSize },
            null,
        )
    }, 1)

    return null
}

export const FluidCanvas: React.FC = () => (
    <Canvas gl={{ antialias: false, alpha: false }}>
        <FluidSimulation />
    </Canvas>
)
