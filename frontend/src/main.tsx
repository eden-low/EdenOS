import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { RecordsProvider } from './state/RecordsContext'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RecordsProvider>
      <App />
    </RecordsProvider>
  </StrictMode>,
)
