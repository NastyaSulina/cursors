import * as THREE from 'three'
import { shaderMaterial } from '@react-three/drei'

import {
    base,
    advection,
    splat,
    curl,
    divergence,
    vorticity,
    pressure,
    gradientSubtract,
    clear,
    display,
} from './_shaders'
import { CONFIG } from './constants'

const defaultUV = new THREE.Vector2()
const defaultColor = new THREE.Vector3()

export const AdvectionMaterial = shaderMaterial(
    {
        texelSize: defaultUV,
        dissipation: CONFIG.VELOCITY_DISS,
        uVelocity: null,
        uSource: null,
        dt: 0,
    },
    base,
    advection,
)

export const SplatMaterial = shaderMaterial(
    {
        texelSize: defaultUV,
        uTarget: null,
        aspectRatio: 1,
        color: defaultColor,
        point: defaultUV,
        radius: CONFIG.SPLAT_RADIUS,
    },
    base,
    splat,
)

export const CurlMaterial = shaderMaterial({ texelSize: defaultUV, uVelocity: null }, base, curl)

export const VorticityMaterial = shaderMaterial(
    {
        texelSize: defaultUV,
        uVelocity: null,
        uCurl: null,
        curl: CONFIG.CURL_STRENGTH,
        dt: 0,
    },
    base,
    vorticity,
)

export const DivergenceMaterial = shaderMaterial(
    { texelSize: defaultUV, uVelocity: null },
    base,
    divergence,
)

export const GradientMaterial = shaderMaterial(
    { texelSize: defaultUV, uPressure: null, uVelocity: null },
    base,
    gradientSubtract,
)

export const PressureClearMaterial = shaderMaterial(
    { texelSize: defaultUV, uTexture: null, value: CONFIG.PRESSURE_DISS },
    base,
    clear,
)

export const PressureSolveMaterial = shaderMaterial(
    { texelSize: defaultUV, uPressure: null, uDivergence: null },
    base,
    pressure,
)

export const DisplayMaterial = shaderMaterial(
    { uTexture: null, texelSize: defaultUV },
    base,
    display,
)
