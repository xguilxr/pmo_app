import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { BrandingProvider } from './context/BrandingContext'
import { ThemeProvider } from './context/ThemeContext'
import { ToastProvider } from './context/ToastContext'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <BrandingProvider>
        <ToastProvider>
          <App />
        </ToastProvider>
      </BrandingProvider>
    </ThemeProvider>
  </StrictMode>,
)
