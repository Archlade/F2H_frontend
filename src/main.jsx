import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { AuthProvider } from './context/AuthContext'
import { SocketProvider } from './context/SocketContext'
import { CartProvider } from './context/CartContext'
import './index.css'
import 'leaflet/dist/leaflet.css'
import { initLayoutDebug } from './utils/layoutDebug'

/* Does nothing unless the URL carries ?layout-debug=1. See utils/layoutDebug.js
   — it exists because iOS Safari has no developer tools, so this is the only
   way to see what a phone is actually laying out. */
initLayoutDebug()

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
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
  </React.StrictMode>
)
