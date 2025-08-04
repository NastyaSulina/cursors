import { useRef } from 'react'
import * as THREE from 'three'
import { Canvas, useFrame, useThree, extend } from '@react-three/fiber'
import { shaderMaterial } from '@react-three/drei'

import { base, display } from './shaders'

const GradientTrailMaterial = shaderMaterial(
    { color: new THREE.Color('#6a00ce'), opacity: 0.5, intensity: 5.0, time: 0.0, freq: 3.0 },
    base,
    display,
)

extend({ GradientTrailMaterial })

export const SimpleTrail = ({ points = 15, width = 0.1 }: { points?: number; width?: number }) => {
    const meshRef = useRef<THREE.Mesh>(null!)
    const materialRef = useRef<THREE.ShaderMaterial>(null!)

    const history = useRef<THREE.Vector3[]>(Array(points).fill(new THREE.Vector3(0, 0, 0)))

    const { pointer, viewport } = useThree()

    useFrame(({ clock }) => {
        materialRef.current.uniforms.time.value = clock.getElapsedTime()

        const x = (pointer.x * viewport.width) / 2
        const y = (pointer.y * viewport.height) / 2
        const cur = new THREE.Vector3(x, y, 0)

        // Добавляем новые точки, если нужно
        const last = history.current[0]
        if (last.distanceTo(cur) > width * 2) {
            history.current.unshift(cur.clone())
            history.current.pop()
        }

        const attr = meshRef.current.geometry.getAttribute('position')

        // Обновляем позиции всех вершин:
        for (let i = 0; i < points; i++) {
            const p = history.current[points - 1 - i]

            attr.setXYZ(i * 2, p.x, p.y - width / 2, p.z)
            attr.setXYZ(i * 2 + 1, p.x, p.y + width / 2, p.z)
        }

        // Обновляем геометрию
        attr.needsUpdate = true
    })

    return (
        <mesh ref={meshRef} position-z={-0.01}>
            <planeGeometry args={[1, width, points - 1, 1]} isBufferGeometry />
            {/* eslint-disable-next-line @typescript-eslint/ban-ts-comment */}
            {/* @ts-ignore */}
            <gradientTrailMaterial
                ref={materialRef}
                transparent
                depthWrite={false}
                side={THREE.DoubleSide}
                blending={THREE.AdditiveBlending}
            />
        </mesh>
    )
}

export const FluidScene = () => {
    return (
        <>
            <color attach='background' args={['#000']} />
            <ambientLight intensity={1} />

            <SimpleTrail points={20} width={0.05} />
        </>
    )
}

export const FluidCanvas = () => {
    return (
        <Canvas>
            <FluidScene />
        </Canvas>
    )
}
