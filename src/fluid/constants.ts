import * as THREE from 'three'

export const CONFIG = {
    DOWNSAMPLE: 1,
    VELOCITY_DISS: 0.998,
    // Чем ниже коэффициент, тем быстрее след растворяется
    DENSITY_DISS: 0.98,
    PRESSURE_DISS: 0.95,
    PRESSURE_ITERATIONS: 30,
    CURL_STRENGTH: 2,
    SPLAT_RADIUS: 0.005,
    SPLAT_COLOR_SCALE: 0.5,

    MAX_DELTA: 0.016,
    COLOR_INTERVAL: 100,
}

const DEFAULT_OPTS = {
    type: THREE.HalfFloatType,
    depthBuffer: false,
    stencilBuffer: false,
    samples: 0,
}

export const VELOCITY_OPTS = {
    format: THREE.RGFormat,
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    ...DEFAULT_OPTS,
}

export const RED_NEAREST_OPTS = {
    format: THREE.RedFormat,
    minFilter: THREE.NearestFilter,
    magFilter: THREE.NearestFilter,
    ...DEFAULT_OPTS,
}

export const DENSITY_OPTS = {
    format: THREE.RGBAFormat,
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    ...DEFAULT_OPTS,
}
