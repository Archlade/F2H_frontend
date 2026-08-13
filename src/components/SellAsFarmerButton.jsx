import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import BecomeFarmerModal from './BecomeFarmerModal'
import toast from 'react-hot-toast'

/**
 * The "Sell as a farmer" call to action, in whatever style the page needs.
 *
 * Behaviour depends on who is looking:
 *   guest    → registration with the farmer role preselected (a plain Link, so
 *              it still opens in a new tab on middle-click)
 *   customer → the upgrade modal, because /auth redirects signed-in users away
 *              and the link therefore did nothing
 *   farmer   → straight to their dashboard
 *   admin    → a short explanation
 *
 * Renders a real <Link> for guests rather than a button so that the common case
 * keeps normal link semantics.
 */
export default function SellAsFarmerButton({ className, style, children }) {
  const { isAuthenticated, isFarmer, isAdmin, loading } = useAuth()
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()

  // While the session is resolving, `isAuthenticated` is false — which would
  // send an already-signed-in visitor to the registration page if they were
  // quick. The button looks identical; it just declines to act on a guess.
  if (loading) {
    return (
      <span className={className} style={{ ...style, opacity: 0.7, cursor: 'default' }} aria-disabled="true">
        {children}
      </span>
    )
  }

  if (!isAuthenticated) {
    return (
      <Link to="/auth?mode=register&role=farmer" className={className} style={style}>
        {children}
      </Link>
    )
  }

  const handleClick = () => {
    if (isFarmer) { navigate('/farmer'); return }
    if (isAdmin) { toast('Admin accounts cannot sell produce.'); return }
    setOpen(true)
  }

  return (
    <>
      <button type="button" className={className} style={style} onClick={handleClick}>
        {children}
      </button>
      <BecomeFarmerModal
        open={open}
        onClose={() => setOpen(false)}
        onDone={() => navigate('/farmer')}
      />
    </>
  )
}
