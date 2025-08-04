export const randomHueColor = (): [number, number, number] => {
    const h = Math.random()
    const s = 0.9 // насыщенность
    const l = 0.1 // светлота
    let r = 0,
        g = 0,
        b = 0

    function hue2rgb(p: number, q: number, t: number): number {
        if (t < 0) t += 1
        if (t > 1) t -= 1
        if (t < 1 / 6) return p + (q - p) * 6 * t
        if (t < 1 / 2) return q
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
        return p
    }
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s
    const p = 2 * l - q
    r = hue2rgb(p, q, h + 1 / 3)
    g = hue2rgb(p, q, h)
    b = hue2rgb(p, q, h - 1 / 3)

    return [r, g, b]
}
