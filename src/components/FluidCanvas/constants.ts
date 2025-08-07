import * as THREE from 'three'

export const CONFIG = {
    DOWNSAMPLE: 2,
    VELOCITY_DISS: 0.998,
    DENSITY_DISS: 0.99,
    PRESSURE_DISS: 0.98,
    PRESSURE_ITERATIONS: 8,
    CURL_STRENGTH: 8,
    COLOR_INTERVAL: 150,
    MAX_DELTA: 0.016,

    SPLAT_RADIUS: 0.01,
    SPLAT_COLOR_SCALE: 1.5,
    SPLAT_FORCE: 30,

    FBO_OPTIONS: {
        type: THREE.HalfFloatType,
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
    },
}
