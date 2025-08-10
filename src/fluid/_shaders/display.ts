export const display = `
    precision highp float;
    precision mediump sampler2D;

    varying vec2 vUv;
    uniform sampler2D uTexture;

    void main() {
        vec3 col = texture2D(uTexture, vUv).rgb;
        col = col / (col + vec3(1.0));
        col = pow(col, vec3(0.8));        
        gl_FragColor = vec4(col, 1.0);
    }
`
