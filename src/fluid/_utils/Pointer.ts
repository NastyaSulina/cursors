import * as THREE from 'three'

export class Pointer {
    public x = 0
    public y = 0
    public dx = 0
    public dy = 0
    public moved = false

    public readonly color = new THREE.Vector3(1, 1, 1)
    public readonly uv = new THREE.Vector2()

    private readonly canvas: HTMLCanvasElement
    private readonly colorInterval: number
    private lastColorTime = 0
    private hue = Math.random()
    private readonly tmpColor = new THREE.Color()

    constructor(canvas: HTMLCanvasElement, colorInterval = 150) {
        this.canvas = canvas
        this.colorInterval = colorInterval

        this.canvas.addEventListener('pointermove', this.handleMove, { passive: true })
        this.canvas.addEventListener('pointerleave', this.handleLeave, { passive: true })
    }

    public reset = () => {
        this.moved = false
    }

    public dispose = () => {
        this.canvas.removeEventListener('pointermove', this.handleMove)
        this.canvas.removeEventListener('pointerleave', this.handleLeave)
    }

    private handleLeave = () => {
        this.moved = false
        this.dx = 0
        this.dy = 0
    }

    private handleMove = (e: PointerEvent) => {
        const rect = this.canvas.getBoundingClientRect()

        const nextX = e.clientX - rect.left
        const nextY = e.clientY - rect.top

        this.dx = (nextX - this.x) * 8
        this.dy = (nextY - this.y) * 8
        this.x = nextX
        this.y = nextY
        this.moved = true

        this.uv.set(this.x / this.canvas.clientWidth, 1 - this.y / this.canvas.clientHeight)

        const now = performance.now()
        if (now - this.lastColorTime > this.colorInterval) {
            this.hue = (this.hue + 0.618033988749895) % 1 // Золотое сечение

            this.tmpColor.setHSL(this.hue, 0.9, 0.4)
            this.color.set(this.tmpColor.r, this.tmpColor.g, this.tmpColor.b)

            this.lastColorTime = now
        }
    }
}
