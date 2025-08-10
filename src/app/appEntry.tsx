import { createRoot } from 'react-dom/client'
import React from 'react'

import './styles/globalStyles.scss'
import { FluidCanvas } from '@/fluid'

const root = createRoot(document.getElementById('root') as HTMLElement)

export const App = () => {
    return <FluidCanvas />
}

root.render(
    <React.StrictMode>
        <App />
    </React.StrictMode>,
)
