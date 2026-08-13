import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Send, MessageCircle, Search, Check, CheckCheck, ArrowLeft } from 'lucide-react'
import { chatAPI } from '../api'
import { useAuth } from '../context/AuthContext'
import { useSocket } from '../context/SocketContext'
import toast from 'react-hot-toast'

function formatTime(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export default function ChatPage() {
  const { chatId: paramChatId } = useParams()
  const { user } = useAuth()
  const socket = useSocket()
  const navigate = useNavigate()

  const [chats, setChats] = useState([])
  const [activeChat, setActiveChat] = useState(null)
  const [messages, setMessages] = useState([])
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [typing, setTyping] = useState(false)
  const [otherTyping, setOtherTyping] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const messagesEndRef = useRef(null)
  const typingTimeoutRef = useRef(null)
  const textareaRef = useRef(null)

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  // Load chat list
  useEffect(() => {
    chatAPI.list().then(({ data }) => setChats(data || []))
  }, [])

  // Load chat when ID changes
  useEffect(() => {
    if (!paramChatId) {
      setActiveChat(null)
      return
    }
    const id = Number(paramChatId)
    setLoading(true)
    Promise.all([
      chatAPI.get(id),
      chatAPI.getMessages(id),
    ]).then(([chatRes, msgRes]) => {
      setActiveChat(chatRes.data)
      setMessages((msgRes.data.messages || []).reverse())
      setLoading(false)
      scrollToBottom()
      // Join socket room
      socket?.joinChat(id)
    }).catch(() => {
      toast.error('Failed to load chat')
      setLoading(false)
    })

    return () => {
      socket?.leaveChat(id)
    }
  }, [paramChatId])

  // Socket listeners
  useEffect(() => {
    if (!socket || !paramChatId) return

    const unsubs = []

    // New message
    unsubs.push(socket.on('new_message', (data) => {
      if (String(data.chat_id) === String(paramChatId)) {
        setMessages((prev) => [...prev, data.message])
        scrollToBottom()
      } else {
        // Update unread count in chat list
        setChats((prev) => prev.map((c) => c.id === data.chat_id ? { ...c, unread_count: (c.unread_count || 0) + 1, last_message: data.message } : c))
      }
    }))

    // Typing
    unsubs.push(socket.on('user_typing', (data) => {
      if (String(data.chat_id) === String(paramChatId) && data.user_id !== user?.id) {
        setOtherTyping(data.is_typing)
      }
    }))

    return () => unsubs.forEach((u) => u())
  }, [socket, paramChatId, user?.id])

  useEffect(() => { scrollToBottom() }, [messages])

  const handleSend = async (e) => {
    e.preventDefault()
    const content = message.trim()
    if (!content || !activeChat || sending) return

    setSending(true)
    setMessage('')
    try {
      const { data } = await chatAPI.sendMessage(activeChat.id, { content })
      setMessages((prev) => [...prev, data])
      scrollToBottom()
      // Update chat list
      setChats((prev) => prev.map((c) => c.id === activeChat.id ? { ...c, last_message: data } : c))
    } catch {
      toast.error('Failed to send message')
      setMessage(content)
    } finally {
      setSending(false)
    }
  }

  const handleTyping = () => {
    if (!typing) {
      setTyping(true)
      socket?.sendTyping(activeChat?.id, true)
    }
    clearTimeout(typingTimeoutRef.current)
    typingTimeoutRef.current = setTimeout(() => {
      setTyping(false)
      socket?.sendTyping(activeChat?.id, false)
    }, 2000)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend(e)
    }
  }

  const selectChat = (chat) => {
    const basePath = user?.role === 'farmer' ? '/farmer' : '/dashboard'
    navigate(`${basePath}/chat/${chat.id}`)
    setActiveChat(chat)
  }

  const handleBackToList = () => {
    const basePath = user?.role === 'farmer' ? '/farmer' : '/dashboard'
    navigate(`${basePath}/chat`)
    setActiveChat(null)
  }

  const filteredChats = chats.filter((c) => {
    const name = c.farmer_id === user?.id ? c.customer?.full_name : c.farmer?.farm_name || c.farmer?.full_name
    return name?.toLowerCase().includes(searchQuery.toLowerCase())
  })

  const getOtherPerson = (chat) => {
    if (!chat) return null
    if (chat.farmer_id === user?.id) return { name: chat.customer?.full_name, initials: chat.customer?.full_name?.split(' ').map((n) => n[0]).join('') }
    return { name: chat.farmer?.farm_name || chat.farmer?.full_name, initials: (chat.farmer?.farm_name || chat.farmer?.full_name)?.[0] || '?' }
  }

  return (
    <div className="chat-layout">
      {/* Chat list */}
      <div className={`chat-list ${paramChatId ? 'hidden-mobile-pane' : ''}`}>
        <div style={{ padding: '16px', borderBottom: '1px solid var(--color-gray-100)' }}>
          <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: 12 }}>Messages</h3>
          <div className="input-icon-wrap">
            <Search size={16} className="icon-left" />
            <input className="form-input touch-target" placeholder="Search conversations..." value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ padding: '8px 8px 8px 36px', fontSize: '0.875rem' }}
              aria-label="Search conversations"
            />
          </div>
        </div>

        {filteredChats.length === 0 ? (
          <div className="empty-state" style={{ padding: '40px 20px' }}>
            <div className="empty-state__icon"><MessageCircle size={24} /></div>
            <p className="text-sm">No conversations yet</p>
          </div>
        ) : filteredChats.map((chat) => {
          const other = getOtherPerson(chat)
          const isActive = String(chat.id) === String(paramChatId)
          return (
            <div
              key={chat.id}
              className={`chat-item ${isActive ? 'active' : ''}`}
              onClick={() => selectChat(chat)}
            >
              <div className="avatar-placeholder avatar-md" style={{ fontSize: '0.875rem', flexShrink: 0 }}>
                {other?.initials}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="flex-between" style={{ marginBottom: 2 }}>
                  <span className="font-semibold text-dark truncate" style={{ fontSize: '0.9375rem' }}>
                    {other?.name}
                  </span>
                  <span className="text-xs text-muted">
                    {chat.last_message ? formatTime(chat.last_message.created_at) : ''}
                  </span>
                </div>
                <div className="truncate text-sm text-muted">
                  {chat.last_message?.content || 'No messages yet'}
                </div>
              </div>
              {chat.unread_count > 0 && (
                <div className="notif-badge__dot" style={{ position: 'static', width: 20, height: 20, fontSize: '0.65rem', flexShrink: 0 }}>
                  {chat.unread_count}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Chat window */}
      {activeChat ? (
        <div className={`chat-window ${!paramChatId ? 'hidden-mobile-pane' : ''}`}>
          {/* Header with Mobile Back Button */}
          <div className="chat-window__header">
            <button
              className="btn btn-ghost btn-icon touch-target show-mobile-back"
              onClick={handleBackToList}
              aria-label="Back to chat list"
            >
              <ArrowLeft size={20} />
            </button>

            {(() => {
              const other = getOtherPerson(activeChat)
              return (
                <>
                  <div className="avatar-placeholder avatar-md" style={{ fontSize: '0.875rem' }}>
                    {other?.initials}
                  </div>
                  <div>
                    <div className="font-semibold text-dark">{other?.name}</div>
                    <div className="text-xs text-muted">
                      {otherTyping ? 'Typing...' : 'Active now'}
                    </div>
                  </div>
                  {activeChat.request && (
                    <div className="badge badge-info" style={{ marginLeft: 'auto' }}>
                      Order #{activeChat.request_id}
                    </div>
                  )}
                </>
              )
            })()}
          </div>

          {/* Messages */}
          <div className="chat-messages">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className={`message-bubble ${i % 2 === 0 ? 'theirs' : 'mine'}`}>
                  <div className="skeleton" style={{ width: `${100 + i * 40}px`, height: 40, borderRadius: 18 }} />
                </div>
              ))
            ) : messages.length === 0 ? (
              <div className="empty-state" style={{ padding: '60px 0' }}>
                <div className="empty-state__icon"><MessageCircle size={28} /></div>
                <p className="text-sm">Start the conversation!</p>
              </div>
            ) : messages.map((msg) => {
              const isMine = msg.sender_id === user?.id
              return (
                <div key={msg.id} className={`message-bubble ${isMine ? 'mine' : 'theirs'}`}>
                  <div className="message-bubble__content">{msg.content}</div>
                  <div className="message-bubble__time flex items-center gap-1">
                    {formatTime(msg.created_at)}
                    {isMine && <CheckCheck size={12} color={msg.is_read ? 'var(--color-primary-400)' : 'var(--color-gray-400)'} />}
                  </div>
                </div>
              )
            })}
            {otherTyping && (
              <div className="message-bubble theirs">
                <div className="message-bubble__content" style={{ display: 'flex', gap: 4, alignItems: 'center', padding: '10px 16px' }}>
                  {[0,1,2].map((i) => (
                    <div key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-gray-400)', animation: `bounce 1s ease-in-out ${i * 0.15}s infinite` }} />
                  ))}
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form className="chat-input-bar" onSubmit={handleSend}>
            <textarea
              ref={textareaRef}
              rows={1}
              placeholder="Type a message..."
              value={message}
              onChange={(e) => { setMessage(e.target.value); handleTyping() }}
              onKeyDown={handleKeyDown}
              aria-label="Message input"
              style={{ fontFamily: 'var(--font-sans)' }}
            />
            <button type="submit" className="btn btn-primary btn-icon touch-target" disabled={!message.trim() || sending}
              aria-label="Send message">
              <Send size={18} />
            </button>
          </form>
        </div>
      ) : (
        <div className={`chat-window flex flex-center flex-col ${!paramChatId ? 'hidden-mobile-pane' : ''}`} style={{ gap: 16 }}>
          <div className="empty-state__icon" style={{ width: 80, height: 80, borderRadius: 'var(--radius-2xl)' }}>
            <MessageCircle size={36} color="var(--color-gray-400)" />
          </div>
          <h3 className="text-h4">Your Messages</h3>
          <p className="text-muted text-sm">Select a conversation to start chatting</p>
        </div>
      )}

      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); }
          40% { transform: translateY(-6px); }
        }
      `}</style>
    </div>
  )
}
