import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>,
)

// ===== LÓGICA PARA OCULTAR LA PANTALLA DE CARGA =====
// Buscamos el div que creamos en el index.html
const splashScreen = document.getElementById('splash-screen');

if (splashScreen) {
  // Le aplicamos una transición suave de opacidad (definida en el index.html)
  splashScreen.style.opacity = '0';
  
  // Después de medio segundo (que dura la transición), lo quitamos del flujo
  setTimeout(() => {
    splashScreen.style.display = 'none';
  }, 500); 
}