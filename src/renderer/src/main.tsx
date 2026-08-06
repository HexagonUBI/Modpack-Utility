import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import '@fontsource-variable/inter'
import App from './App'

const container = document.getElementById('root')
if (!container) throw new Error('Root container missing from index.html')

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>
)
