import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles/index.css'
import { recoverFromChunkFailure } from './app/lazyWithRecovery'

// Vite can reject a module preload before React.lazy receives the error.
// Handle that phase as well so stale deployment graphs recover consistently.
window.addEventListener('vite:preloadError', (event) => {
  event.preventDefault()
  const recoveryKey = 'portfolio:chunk-recovery'
  if (!sessionStorage.getItem(recoveryKey)) {
    sessionStorage.setItem(recoveryKey, '1')
    recoverFromChunkFailure()
  }
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
