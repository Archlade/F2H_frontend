import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { API_ORIGIN_URL } from '../api'
import { io } from 'socket.io-client'
import { useAuth } from './AuthContext'

const SocketContext = createContext(null)

export function SocketProvider({ children }) {
  const { isAuthenticated, user } = useAuth()
  const socketRef = useRef(null)
  const [connected, setConnected] = useState(false)
  const listeners = useRef({})

  useEffect(() => {
    if (!isAuthenticated) {
      if (socketRef.current) {
        socketRef.current.disconnect()
        socketRef.current = null
        setConnected(false)
      }
      return
    }

    // The API's origin, not the site's.
    //
    // This was `io('/')`, which connects to whatever host is serving the page.
    // In development that works because Vite proxies /socket.io to Flask. In
    // production the site is on f2hmarket.com and the API is on
    // api.f2hmarket.com:8443, so it dialled a host with no Socket.IO server —
    // and because the app degrades quietly when the socket is down, chat and
    // live order updates would simply never arrive, with nothing in the UI to
    // say why.
    // `|| '/'` because API_ORIGIN_URL is empty in development, and socket.io
    // needs a target: '/' means "this origin", which Vite then proxies to Flask.
    const socket = io(API_ORIGIN_URL || '/', {
      withCredentials: true,
      transports: ['websocket', 'polling'],
    })

    socketRef.current = socket

    socket.on('connect', () => setConnected(true))
    socket.on('disconnect', () => setConnected(false))

    // Proxy events to registered listeners
    socket.onAny((event, data) => {
      const handlers = listeners.current[event] || []
      handlers.forEach((h) => h(data))
    })

    return () => {
      socket.disconnect()
      socketRef.current = null
    }
  }, [isAuthenticated, user?.id])

  const on = (event, handler) => {
    if (!listeners.current[event]) listeners.current[event] = []
    listeners.current[event].push(handler)
    return () => {
      listeners.current[event] = listeners.current[event].filter((h) => h !== handler)
    }
  }

  const emit = (event, data) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(event, data)
    }
  }

  const joinChat = (chatId) => emit('join_chat', { chat_id: chatId })
  const leaveChat = (chatId) => emit('leave_chat', { chat_id: chatId })
  const sendTyping = (chatId, isTyping) => emit('typing', { chat_id: chatId, is_typing: isTyping })

  return (
    <SocketContext.Provider value={{ connected, on, emit, joinChat, leaveChat, sendTyping }}>
      {children}
    </SocketContext.Provider>
  )
}

export function useSocket() {
  return useContext(SocketContext)
}
