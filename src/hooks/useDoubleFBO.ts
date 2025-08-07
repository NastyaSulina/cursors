import { useRef, useEffect, useCallback } from 'react'
import { useFBO } from '@react-three/drei'
import * as THREE from 'three'

export interface DoubleFBO {
    read: THREE.WebGLRenderTarget
    write: THREE.WebGLRenderTarget
    swap(): void
}

export function useDoubleFBO(
    width: number,
    height: number,
    options?: {
        depth?: boolean
    } & THREE.RenderTargetOptions,
): DoubleFBO {
    const rtA = useFBO(width, height, options)
    const rtB = useFBO(width, height, options)

    const ref = useRef<DoubleFBO>({ read: rtA, write: rtB, swap: () => {} })

    useEffect(() => {
        ref.current.read = rtA
        ref.current.write = rtB
    }, [rtA, rtB])

    const swap = useCallback(() => {
        const buf = ref.current
        ;[buf.read, buf.write] = [buf.write, buf.read]
    }, [])

    ref.current.swap = swap

    return ref.current
}
