import { useRef, useState } from 'react'
import { Camera, Loader, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { uploadsAPI } from '../api'
import UserAvatar from './UserAvatar'
import { MAX_UPLOAD_MB, IMAGE_ACCEPT, isProbablyImage, prepareImageForUpload } from '../utils/image'

const MAX_MB = MAX_UPLOAD_MB

/**
 * Circular photo picker. Uploads the chosen file and hands the resulting
 * URL back through onChange — the parent decides when to persist it.
 */
export default function AvatarUpload({ user, value, onChange, size = 128, hint }) {
  const inputRef = useRef(null)
  const [uploading, setUploading] = useState(false)

  const pickFile = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = '' // let the same file be re-selected after a failure
    if (!file) return

    if (!isProbablyImage(file)) {
      toast.error('Please choose an image file')
      return
    }

    setUploading(true)
    try {
      // Converts iPhone HEIC to JPEG, fixes rotation and shrinks large photos
      // before the size check, so a 12MP camera shot still goes through.
      const prepared = await prepareImageForUpload(file)
      if (prepared.size > MAX_MB * 1024 * 1024) {
        toast.error(`Image must be smaller than ${MAX_MB}MB`)
        return
      }
      const res = await uploadsAPI.uploadImage(prepared, 'avatars')
      onChange(res.data.url)
      toast.success('Photo uploaded')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to upload photo')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        title="Change profile photo"
        style={{
          position: 'relative',
          width: size,
          height: size,
          borderRadius: '50%',
          padding: 0,
          border: 'none',
          background: 'none',
          cursor: uploading ? 'wait' : 'pointer',
          display: 'block',
        }}
      >
        <UserAvatar user={user} src={value || null} size={size} />
        <span
          style={{
            position: 'absolute',
            right: 2,
            bottom: 2,
            width: 34,
            height: 34,
            borderRadius: '50%',
            background: 'var(--color-primary-600, #16a34a)',
            color: 'white',
            border: '2px solid white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {uploading ? <Loader size={16} className="animate-spin" /> : <Camera size={16} />}
        </span>
      </button>

      <input
        ref={inputRef}
        type="file"
        accept={IMAGE_ACCEPT}
        onChange={pickFile}
        style={{ display: 'none' }}
      />

      <div style={{ textAlign: 'center' }}>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="btn btn-secondary btn-sm"
          style={{ fontSize: '0.8125rem' }}
        >
          {uploading ? 'Uploading…' : value ? 'Change photo' : 'Upload photo'}
        </button>
        {value && !uploading && (
          <button
            type="button"
            onClick={() => onChange('')}
            title="Remove photo"
            style={{
              marginLeft: 8,
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              color: 'var(--color-gray-500, #6b7280)',
              verticalAlign: 'middle',
            }}
          >
            <Trash2 size={15} />
          </button>
        )}
        <p style={{ margin: '8px 0 0', fontSize: '0.75rem', color: 'var(--color-gray-500, #6b7280)' }}>
          {hint || `JPG, PNG, WebP or iPhone HEIC · up to ${MAX_MB}MB`}
        </p>
      </div>
    </div>
  )
}
