import { API_ORIGIN_URL } from '../api'

/**
 * Photo pre-processing for uploads.
 *
 * iPhones save photos as HEIC, which no server-side default and no non-Apple
 * browser can decode. iOS *can* decode it natively, so we re-encode to JPEG in
 * the browser before the file ever leaves the device. That also:
 *   - applies EXIF rotation, so portrait photos stop arriving sideways
 *   - drops EXIF entirely, so GPS coordinates baked in by the camera aren't
 *     published with the photo
 *   - shrinks 12MP originals under the server's upload size limit
 *
 * If decoding fails (e.g. a HEIC dragged into desktop Chrome, which has no
 * HEIC decoder), the original file is returned unchanged and the server's
 * pillow-heif path handles the conversion instead.
 */

export const MAX_UPLOAD_MB = 10

// Long edge in pixels. 2560 keeps product photos crisp on a retina display
// while cutting a 12MP iPhone shot to a few hundred KB.
const MAX_DIMENSION = 2560
const JPEG_QUALITY = 0.85

// Anything the browser reports as an image, plus the HEIC/HEIF types iOS uses.
// Safari sometimes reports an empty `type` for HEIC, so extensions matter too.
const IMAGE_EXTENSIONS = /\.(jpe?g|png|webp|gif|bmp|heic|heif|avif)$/i

export const isProbablyImage = (file) =>
  !!file && (file.type.startsWith('image/') || IMAGE_EXTENSIONS.test(file.name || ''))

/**
 * What a file picker should offer.
 *
 * `image/*` alone is not enough on every platform: some Android file managers
 * and older Safari builds report HEIC with an empty or non-image MIME type, so
 * an iPhone photo can be greyed out in the picker despite being an image. The
 * explicit extensions put them back.
 *
 * This is a filter, not a guarantee — a picker can always be bypassed, which is
 * why `isProbablyImage` re-checks the chosen file and the server checks again
 * after that.
 */
export const IMAGE_ACCEPT = 'image/*,.heic,.heif'

const isHeic = (file) =>
  /hei[cf]/i.test(file.type || '') || /\.hei[cf]$/i.test(file.name || '')

const jpegName = (name) => `${(name || 'photo').replace(/\.[^./\\]+$/, '')}.jpg`

/** Decode a file into something canvas can draw, honouring EXIF orientation. */
async function decode(file) {
  // createImageBitmap is the only path that applies EXIF orientation reliably;
  // it's supported by Safari 15+ and every current Chrome/Firefox.
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(file, { imageOrientation: 'from-image' })
    } catch {
      // Fall through — older Safari rejects the options argument.
    }
    try {
      return await createImageBitmap(file)
    } catch {
      // Format not decodable here; try the <img> path below.
    }
  }

  const url = URL.createObjectURL(file)
  try {
    return await new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = () => reject(new Error('Could not decode image'))
      img.src = url
    })
  } finally {
    URL.revokeObjectURL(url)
  }
}

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Encoding failed'))),
      type,
      quality
    )
  })
}

/**
 * Returns a File ready to upload. Never throws — on any failure it hands back
 * the original file and lets the server decide.
 */
export async function prepareImageForUpload(file) {
  if (!file) return file

  const heic = isHeic(file)
  const oversized = file.size > MAX_UPLOAD_MB * 1024 * 1024

  let source
  try {
    source = await decode(file)
  } catch {
    return file
  }

  const width = source.width || source.naturalWidth
  const height = source.height || source.naturalHeight
  if (!width || !height) return file

  // Nothing to gain from re-encoding a small JPEG/PNG/WebP that's already fine.
  const needsResize = Math.max(width, height) > MAX_DIMENSION
  if (!heic && !oversized && !needsResize) {
    source.close?.()
    return file
  }

  const scale = needsResize ? MAX_DIMENSION / Math.max(width, height) : 1
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(width * scale)
  canvas.height = Math.round(height * scale)

  const ctx = canvas.getContext('2d')
  if (!ctx) return file
  // JPEG has no alpha; without this, transparent pixels turn black.
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height)
  source.close?.()

  try {
    let blob = await canvasToBlob(canvas, 'image/jpeg', JPEG_QUALITY)
    // A very large original can still land above the cap at default quality.
    if (blob.size > MAX_UPLOAD_MB * 1024 * 1024) {
      blob = await canvasToBlob(canvas, 'image/jpeg', 0.7)
    }
    return new File([blob], jpegName(file.name), {
      type: 'image/jpeg',
      lastModified: Date.now(),
    })
  } catch {
    return file
  }
}

/** Runs files through the pipeline in sequence to avoid memory spikes on phones. */
export async function prepareImagesForUpload(files) {
  const out = []
  for (const file of files) out.push(await prepareImageForUpload(file))
  return out
}

/**
 * Turn whatever the backend hands back into a URL this browser can load.
 *
 * The API returns relative paths like `/uploads/products/8f21c0.jpg`. In
 * development Vite proxies `/uploads` to Flask, so a bare relative path works
 * and nobody notices. In production the site is on `f2hmarket.com` and the API
 * is on `api.f2hmarket.com:8443` — a relative path then resolves against the
 * *site*, which serves no uploads, and every image on every page breaks.
 *
 * Three shapes arrive in practice:
 *
 *   /uploads/products/x.jpg          relative — needs the API origin prepended
 *   http://localhost:5000/uploads/…  absolute, but written by a backend that
 *                                    only knew its own address. Re-pointed.
 *   https://cdn.example.com/x.jpg    genuinely external — left alone.
 *
 * This is the browser twin of `AppConfig.resolveImageUrl` in the Flutter app,
 * which exists for the same reason and handles the same three cases.
 */
export function mediaUrl(url) {
  if (!url) return ''
  let value = String(url).trim().replace(/\\/g, '/')
  if (!value) return ''

  if (/^https?:\/\//i.test(value)) {
    try {
      const parsed = new URL(value)
      // Hosts that mean "the machine that wrote this URL", which is never the
      // machine reading it.
      const dev = ['localhost', '127.0.0.1', '0.0.0.0', '10.0.2.2']
      if (dev.includes(parsed.hostname)) {
        return `${API_ORIGIN_URL}${parsed.pathname}${parsed.search}`
      }
    } catch {
      return value
    }
    return value
  }

  return `${API_ORIGIN_URL}${value.startsWith('/') ? '' : '/'}${value}`
}
