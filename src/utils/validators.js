/**
 * Client-side mirrors of `backend/app/utils/validators.py`.
 *
 * The server is the authority — every one of these rules is enforced again on
 * the way in, and must be, because a browser check is a suggestion. These exist
 * so the person finds out while they are typing rather than after a round trip
 * and a red banner.
 *
 * If you change a rule here, change it there too. The messages are deliberately
 * word-for-word identical to the server's so the same problem never gets
 * described two different ways depending on where it was caught.
 */

// Deliberately not RFC 5322 — see the Python original for why.
const EMAIL_RE = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/

const EMAIL_TYPOS = {
  'gmial.com': 'gmail.com', 'gmai.com': 'gmail.com', 'gmail.co': 'gmail.com',
  'gnail.com': 'gmail.com', 'gmail.con': 'gmail.com', 'yahooo.com': 'yahoo.com',
  'yaho.com': 'yahoo.com', 'hotmial.com': 'hotmail.com', 'outlok.com': 'outlook.com',
  'rediffmial.com': 'rediffmail.com',
}

/** A human-readable problem with the email address, or null. */
export function emailProblem(email) {
  const value = (email || '').trim()
  if (!value) return 'Email is required'
  if (value.length > 254) return 'That email address is too long'
  if (value.includes(' ')) return 'An email address cannot contain spaces'
  if ((value.match(/@/g) || []).length !== 1) return 'Enter a valid email address, like name@example.com'
  if (!EMAIL_RE.test(value)) return 'Enter a valid email address, like name@example.com'

  const domain = value.split('@')[1].toLowerCase()
  if (EMAIL_TYPOS[domain]) return `Did you mean ${EMAIL_TYPOS[domain]}? Please check the address`
  if (domain.endsWith('.')) return 'Enter a valid email address, like name@example.com'
  return null
}

// India Post PIN codes: six digits, first digit 1–8. 0 and 9 were never
// allocated, which is how a mistyped PIN gets past a length check.
const PIN_RE = /^[1-8]\d{5}$/

export const INDIAN_STATES = [
  'Andaman and Nicobar Islands', 'Andhra Pradesh', 'Arunachal Pradesh', 'Assam',
  'Bihar', 'Chandigarh', 'Chhattisgarh', 'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi', 'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jammu and Kashmir',
  'Jharkhand', 'Karnataka', 'Kerala', 'Ladakh', 'Lakshadweep', 'Madhya Pradesh',
  'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha',
  'Puducherry', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana',
  'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
]

const STATE_ALIASES = {
  'orissa': 'odisha', 'pondicherry': 'puducherry', 'nct of delhi': 'delhi',
  'new delhi': 'delhi', 'tamilnadu': 'tamil nadu', 'kerela': 'kerala',
  'karnatka': 'karnataka', 'maharastra': 'maharashtra', 'j&k': 'jammu and kashmir',
  'uttaranchal': 'uttarakhand', 'bangalore': 'karnataka',
}

const STATE_SET = new Set(INDIAN_STATES.map(s => s.toLowerCase()))

/** The canonical lower-case state name, or null if we do not deliver there. */
export function normaliseState(state) {
  let value = (state || '').trim().toLowerCase().replace(/\s+/g, ' ')
  value = STATE_ALIASES[value] || value
  return STATE_SET.has(value) ? value : null
}

export function postalCodeProblem(postalCode) {
  const digits = (postalCode || '').replace(/\D/g, '')
  if (!digits) return 'PIN code is required'
  if (digits.length !== 6) return 'A PIN code is 6 digits'
  if (!PIN_RE.test(digits)) return 'That PIN code does not exist — Indian PIN codes start 1 to 8'
  return null
}

export function stateProblem(state) {
  if (!(state || '').trim()) return 'State is required'
  if (normaliseState(state) === null) return `"${state.trim()}" is not a state we recognise`
  return null
}

// First PIN digit -> the states that region covers.
const PIN_REGIONS = {
  '1': ['delhi', 'haryana', 'himachal pradesh', 'jammu and kashmir', 'ladakh', 'punjab', 'chandigarh'],
  '2': ['uttar pradesh', 'uttarakhand'],
  '3': ['rajasthan', 'gujarat', 'dadra and nagar haveli and daman and diu'],
  '4': ['chhattisgarh', 'goa', 'madhya pradesh', 'maharashtra'],
  '5': ['andhra pradesh', 'karnataka', 'telangana'],
  '6': ['kerala', 'lakshadweep', 'puducherry', 'tamil nadu'],
  '7': ['andaman and nicobar islands', 'arunachal pradesh', 'assam', 'manipur',
        'meghalaya', 'mizoram', 'nagaland', 'odisha', 'sikkim', 'tripura', 'west bengal'],
  '8': ['bihar', 'jharkhand'],
}

/**
 * Check the state and PIN, then check they describe the same place.
 *
 * The cross-check is the point: each field can be individually valid and still
 * be nowhere. Under cash on delivery that is a wasted trip with produce in the
 * van, so it is worth refusing while the form is still open.
 */
export function addressProblem(state, postalCode) {
  const stateIssue = stateProblem(state)
  if (stateIssue) return stateIssue
  const pinIssue = postalCodeProblem(postalCode)
  if (pinIssue) return pinIssue

  const canonical = normaliseState(state)
  const digits = (postalCode || '').replace(/\D/g, '')
  const region = PIN_REGIONS[digits[0]]
  // Unknown region passes: India Post reassigns ranges, and refusing a real
  // address is worse than accepting an odd one.
  if (region && !region.includes(canonical)) {
    return `PIN ${digits} is not in ${state.trim()} — please check the PIN code and state match`
  }
  return null
}

/**
 * Reduce a typed number to its bare 10 digits, or null.
 *
 * The country code and trunk prefix are stripped rather than rejected — people
 * write the same number as `9876543210`, `+91 98765 43210` and `098765 43210`,
 * and a form that refuses two of the three is a form they retype in irritation.
 */
export function normalisePhone(phone) {
  let digits = (phone || '').replace(/\D/g, '')
  if (digits.length === 12 && digits.startsWith('91')) digits = digits.slice(2)
  else if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1)
  return digits || null
}

/**
 * A human-readable problem with the phone number, or null.
 *
 * Ten digits — that is the whole rule. The first digit is deliberately not
 * checked: requiring 6–9 meant requiring an Indian mobile, which refused
 * landlines and anyone signing up from outside India. The length check catches
 * what that rule was really for — a typo or a half-typed number — without
 * deciding what kind of phone somebody is allowed to own.
 *
 * Mirrors `phone_problem` in backend/app/utils/validators.py, which is the one
 * that decides. Change them together.
 */
export function phoneProblem(phone) {
  if (!(phone || '').trim()) return 'Phone number is required'
  const digits = normalisePhone(phone)
  if (!digits) return 'Phone number is required'
  if (digits.length !== 10) return 'Enter a 10-digit phone number'
  return null
}
