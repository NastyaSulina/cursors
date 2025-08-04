import { useEffect, useRef } from 'react'

import styles from './Landing.module.scss'

export const Landing = () => {
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
