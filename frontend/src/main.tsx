import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { BrandingProvider } from './context/BrandingContext'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrandingProvider>
      <App />
    </BrandingProvider>
  </StrictMode>,
)
