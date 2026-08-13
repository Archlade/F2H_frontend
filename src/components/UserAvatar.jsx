/**
 * Shows a user's photo when they have one, falling back to their initials.
 * Sizes match the .avatar-placeholder helpers in index.css.
 */
const SIZES = { sm: 32, md: 40, lg: 56, xl: 72 }

export default function UserAvatar({ user, src, size = 'md', className = '', style = {} }) {
  const px = typeof size === 'number' ? size : SIZES[size] || SIZES.md
  const url = src ?? user?.avatar_url
  const initials = [user?.first_name?.[0], user?.last_name?.[0]].filter(Boolean).join('') || '?'

  const base = {
    width: px,
    height: px,
    borderRadius: '50%',
    flexShrink: 0,
    ...style,
  }

  if (url) {
    return (
      <img
        src={url}
        alt={user?.full_name || 'Profile photo'}
        className={className}
        style={{ ...base, objectFit: 'cover', display: 'block' }}
      />
    )
  }

  return (
    <div
      className={`avatar-placeholder ${className}`}
      style={{ ...base, fontSize: Math.round(px * 0.36) }}
    >
      {initials.toUpperCase()}
    </div>
  )
}
