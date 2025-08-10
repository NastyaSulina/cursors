import * as THREE from 'three'

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

const commonFlags = {
    depthTest: false,
    depthWrite: false,
    transparent: false,
    blending: THREE.NoBlending,
} as const

export function createAdvectionMaterial() {
    return new THREE.ShaderMaterial({
        ...commonFlags,
        vertexShader: base,
        fragmentShader: advection,
        uniforms: {
            texelSize: { value: new THREE.Vector2() },
            uVelocity: { value: null },
            uSource: { value: null },
            dissipation: { value: CONFIG.VELOCITY_DISS },
            dt: { value: 0 },
        },
    })
}

export function createSplatMaterial() {
    return new THREE.ShaderMaterial({
        ...commonFlags,
        vertexShader: base,
        fragmentShader: splat,
        uniforms: {
            texelSize: { value: new THREE.Vector2() },
            uTarget: { value: null },
            aspectRatio: { value: 1 },
            color: { value: new THREE.Vector3() },
            point: { value: new THREE.Vector2() },
            radius: { value: CONFIG.SPLAT_RADIUS },
        },
    })
}

export function createCurlMaterial() {
    return new THREE.ShaderMaterial({
        ...commonFlags,
        vertexShader: base,
        fragmentShader: curl,
        uniforms: {
            texelSize: { value: new THREE.Vector2() },
            uVelocity: { value: null },
        },
    })
}

export function createVorticityMaterial() {
    return new THREE.ShaderMaterial({
        ...commonFlags,
        vertexShader: base,
        fragmentShader: vorticity,
        uniforms: {
            texelSize: { value: new THREE.Vector2() },
            uVelocity: { value: null },
            uCurl: { value: null },
            curl: { value: CONFIG.CURL_STRENGTH },
            dt: { value: 0 },
        },
    })
}

export function createDivergenceMaterial() {
    return new THREE.ShaderMaterial({
        ...commonFlags,
        vertexShader: base,
        fragmentShader: divergence,
        uniforms: {
            texelSize: { value: new THREE.Vector2() },
            uVelocity: { value: null },
        },
    })
}

export function createPressureClearMaterial() {
    return new THREE.ShaderMaterial({
        ...commonFlags,
        vertexShader: base,
        fragmentShader: clear,
        uniforms: {
            texelSize: { value: new THREE.Vector2() },
            uTexture: { value: null },
            value: { value: CONFIG.PRESSURE_DISS },
        },
    })
}

export function createPressureSolveMaterial() {
    return new THREE.ShaderMaterial({
        ...commonFlags,
        vertexShader: base,
        fragmentShader: pressure,
        uniforms: {
            texelSize: { value: new THREE.Vector2() },
            uPressure: { value: null },
            uDivergence: { value: null },
        },
    })
}

export function createGradientMaterial() {
    return new THREE.ShaderMaterial({
        ...commonFlags,
        vertexShader: base,
        fragmentShader: gradientSubtract,
        uniforms: {
            texelSize: { value: new THREE.Vector2() },
            uVelocity: { value: null },
            uPressure: { value: null },
        },
    })
}

export function createDisplayMaterial() {
    return new THREE.ShaderMaterial({
        ...commonFlags,
        vertexShader: base,
        fragmentShader: display,
        uniforms: {
            texelSize: { value: new THREE.Vector2() },
            uTexture: { value: null },
        },
    })
}
