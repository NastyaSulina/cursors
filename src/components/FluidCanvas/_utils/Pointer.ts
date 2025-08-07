import * as THREE from 'three'

export class Pointer {
    public x = 0
    public y = 0
    public dx = 0
    public dy = 0
    public moved = false
    public color = new THREE.Vector3(1, 1, 1)

    private lastColorTime = 0
    private readonly canvas: HTMLCanvasElement
    private readonly colorInterval: number

    constructor(canvas: HTMLCanvasElement, colorInterval = 150) {
        this.canvas = canvas
        this.colorInterval = colorInterval

        this.canvas.addEventListener('pointermove', this.handleMove)
        this.canvas.addEventListener('pointerleave', this.reset)
    }

    public reset = (): void => {
        this.moved = false
    }

    private handleMove = (e: PointerEvent): void => {
        const now = performance.now()
        const rect = this.canvas.getBoundingClientRect()

        const nextX = e.clientX - rect.left
        const nextY = e.clientY - rect.top

        this.dx = (nextX - this.x) * 10
        this.dy = (nextY - this.y) * 10
        this.x = nextX
        this.y = nextY
        this.moved = true

        if (now - this.lastColorTime > this.colorInterval) {
            this.randomizeColor()
            this.lastColorTime = now
        }
    }

    private randomizeColor() {
        const hue = Math.random()
        const col = new THREE.Color().setHSL(hue, 0.9, 0.1)

        this.color.set(col.r, col.g, col.b)
    }

    public get uv(): THREE.Vector2 {
        return new THREE.Vector2(
            this.x / this.canvas.clientWidth,
            1 - this.y / this.canvas.clientHeight,
        )
    }

    public dispose(): void {
        this.canvas.removeEventListener('pointermove', this.handleMove)
        this.canvas.removeEventListener('pointerleave', this.reset)
    }
}
