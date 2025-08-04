export const display = `
    precision highp float;

    varying vec2 vUv;
    uniform vec3 color;
    uniform float opacity;
    uniform float intensity;
    uniform float time;
    uniform float freq;

    float hash(vec2 p) {
        p = fract(p * vec2(123.34,456.21));
        p += dot(p,p+45.32);

        return fract(p.x*p.y);
    }

    float noise(vec2 x) {
        vec2 i = floor(x), f = fract(x);
        float a=hash(i), b=hash(i+vec2(1,0)), c=hash(i+vec2(0,1)), d=hash(i+vec2(1,1));
        vec2 u=f*f*(3.0-2.0*f);

        return mix(a,b,u.x) + (c-a)*u.y*(1.0-u.x) + (d-b)*u.x*u.y;
    }

    void main() {
        vec2 nUv = vUv*freq + vec2(time*0.1);
        float n = noise(nUv);
        float fade = smoothstep(1.0, 0.0, vUv.y);
        vec3 col = color * intensity * (0.5 + 0.5*n);

        gl_FragColor = vec4(col, fade*opacity);
    }
`
