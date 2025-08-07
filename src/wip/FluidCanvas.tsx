import { useEffect, useRef } from 'react'

import styles from './FluidCanvas.module.scss'

export const FluidCanvas = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null)

    useEffect(() => {
        import('./effect')
    }, [])

    return (
        <section className={styles.container}>
            <canvas ref={canvasRef} />
        </section>
    )
}
