import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import ErrorBoundary from './components/ErrorBoundary'
import { AuthProvider } from './context/AuthContext'
import { SocketProvider } from './context/SocketContext'
import { CartProvider } from './context/CartContext'
import './index.css'
import 'leaflet/dist/leaflet.css'

/* Does nothing unless the URL carries ?layout-debug=1. See utils/layoutDebug.js
   — it exists because iOS Safari has no developer tools, so this is the only
   way to see what a phone is actually laying out.

   Imported dynamically behind import.meta.env.DEV so Vite drops it from the
   production bundle entirely. As a static import it shipped to every visitor:
   inert without the query parameter, but it builds its panel with innerHTML,
   and a debug tool with a markup sink is not worth carrying on a live site for
   a feature only ever used on a developer's phone. */
if (import.meta.env.DEV) {
  import('./utils/layoutDebug').then(({ initLayoutDebug }) => initLayoutDebug())
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {/* Outermost, so a throw anywhere below shows the error rather than
        unmounting the tree and leaving a white page. */}
    <ErrorBoundary>
    <BrowserRouter>
      <AuthProvider>
        <SocketProvider>
          {/* Inside AuthProvider: the cart is per-user and reloads when the
              session changes, so signing out clears it. */}
          <CartProvider>
            <App />
          </CartProvider>
        </SocketProvider>
      </AuthProvider>
    </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>
)
