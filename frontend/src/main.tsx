import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { FirebaseAuthProvider } from './state/FirebaseAuthProvider'
import { RecordsProvider } from './state/RecordsContext'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <FirebaseAuthProvider>
      <RecordsProvider>
        <App />
      </RecordsProvider>
    </FirebaseAuthProvider>
  </StrictMode>,
)
