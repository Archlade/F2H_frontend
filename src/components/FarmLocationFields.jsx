import { useState } from 'react'
import { MapPin, Loader, Check } from 'lucide-react'

import { INDIAN_STATES } from '../utils/validators'

/**
 * Where the farm is — the field group, shared by every screen that asks.
 *
 * One component for signup, the become-a-farmer modal and the farm profile,
 * because three copies of a four-box address form is three places for the
 * required fields to drift apart from what the server will accept.
 *
 * **The address is required; the coordinates are not.** The button fills them
 * in when the browser offers a position, and signing up works without it — a
 * farmer on a desktop, or one who declines the prompt, must still be able to
 * finish. What they lose by skipping it is stated rather than implied: the
 * distance sort is how most customers arrive, and a farm with no pin never
 * ranks in it.
 */
export default function FarmLocationFields({
  value,
  onChange,
  errors = {},
  disabled = false,
  /** Shown above the fields. Omitted where the screen already has a heading. */
  heading = 'Where is your farm?',
  note = 'Customers see this on your farm page, and use it to find farms near them.',
}) {
  const [locating, setLocating] = useState(false)
  const [locateError, setLocateError] = useState('')

  const set = (key, next) => onChange({ ...value, [key]: next })
  const hasPin = value.latitude !== '' && value.longitude !== ''

  const useMyLocation = () => {
    setLocateError('')
    if (!navigator.geolocation) {
      setLocateError('This browser cannot share a location. The address above is enough.')
      return
    }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocating(false)
        onChange({
          ...value,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        })
      },
      () => {
        setLocating(false)
        // Deliberately not an error style: nothing has gone wrong with the
        // form, and the farmer can still finish. Saying so is the point —
        // a red message here reads as "you cannot continue".
        setLocateError('Could not read your location. You can still continue, '
          + 'or add the pin later from your farm profile.')
      },
      { timeout: 8000, enableHighAccuracy: true },
    )
  }

  return (
    <div style={{
      border: '1px solid var(--color-gray-200)',
      borderRadius: 'var(--radius-lg)',
      padding: 16,
      display: 'flex', flexDirection: 'column', gap: 12,
    }}>
      {heading && (
        <div>
          <div className="font-semibold flex items-center gap-2">
            <MapPin size={15} color="var(--color-primary-600)" /> {heading}
          </div>
          {note && <p className="text-xs text-muted" style={{ marginTop: 4 }}>{note}</p>}
        </div>
      )}

      <div className="form-group" style={{ marginBottom: 0 }}>
        <label className="form-label" htmlFor="farm-address">
          Farm address or village <span style={{ color: 'var(--color-error)' }}>*</span>
        </label>
        <input
          id="farm-address" className="form-input" disabled={disabled}
          placeholder="Kallar village, Mettupalayam taluk"
          value={value.address_line1}
          onChange={(e) => set('address_line1', e.target.value)}
          autoComplete="address-line1"
        />
        {errors.address_line1 && <span className="form-error">{errors.address_line1}</span>}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label" htmlFor="farm-city">
            City or town <span style={{ color: 'var(--color-error)' }}>*</span>
          </label>
          <input
            id="farm-city" className="form-input" disabled={disabled}
            placeholder="Mettupalayam" value={value.city}
            onChange={(e) => set('city', e.target.value)}
            autoComplete="address-level2"
          />
          {errors.city && <span className="form-error">{errors.city}</span>}
        </div>

        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label" htmlFor="farm-state">
            State <span style={{ color: 'var(--color-error)' }}>*</span>
          </label>
          {/* A list, not a text box. The server checks the state against the
              states India Post delivers to and then against the PIN's region,
              so a typed "Tamilnadu" is a refusal the farmer has to work out
              for themselves. */}
          <select
            id="farm-state" className="form-input" disabled={disabled}
            value={value.state} onChange={(e) => set('state', e.target.value)}
          >
            <option value="">Select a state…</option>
            {INDIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          {errors.state && <span className="form-error">{errors.state}</span>}
        </div>
      </div>

      <div className="form-group" style={{ marginBottom: 0, maxWidth: 200 }}>
        <label className="form-label" htmlFor="farm-pin">
          PIN code <span style={{ color: 'var(--color-error)' }}>*</span>
        </label>
        <input
          id="farm-pin" className="form-input" disabled={disabled}
          placeholder="641305" inputMode="numeric" maxLength={6}
          value={value.postal_code}
          onChange={(e) => set('postal_code', e.target.value.replace(/\D/g, ''))}
          autoComplete="postal-code"
        />
        {errors.postal_code && <span className="form-error">{errors.postal_code}</span>}
      </div>

      {/* The map pin. Optional, and what it buys is said plainly rather than
          left as a button nobody understands the cost of skipping. */}
      <div style={{ borderTop: '1px solid var(--color-gray-100)', paddingTop: 12 }}>
        <div className="flex items-center gap-3 flex-wrap">
          <button
            type="button" className="btn btn-secondary btn-sm"
            onClick={useMyLocation} disabled={disabled || locating}
          >
            {locating
              ? <><Loader size={14} className="animate-spin" /> Reading your location…</>
              : <><MapPin size={14} /> {hasPin ? 'Update the map pin' : 'Use my current location'}</>}
          </button>

          {hasPin ? (
            <span className="text-xs" style={{ color: 'var(--color-success)', fontWeight: 600 }}>
              <Check size={12} style={{ verticalAlign: '-2px' }} /> Pin saved — your farm will
              show in “nearest farms” results
            </span>
          ) : (
            <span className="text-xs text-muted">
              Optional. Without it your farm won’t appear when customers sort by distance.
            </span>
          )}
        </div>
        {locateError && (
          <p className="text-xs text-muted" style={{ marginTop: 6 }}>{locateError}</p>
        )}
      </div>
    </div>
  )
}
