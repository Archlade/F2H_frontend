import { Link } from 'react-router-dom'
import {
  ArrowRight, Calendar, CheckCircle2, Leaf, PauseCircle, Repeat,
  ShieldCheck, ShoppingBasket, Truck, Wallet,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { basketPaths } from '../utils/basketPaths'
import { useSeo } from '../utils/seo'

/**
 * The public front door to weekly baskets.
 *
 * This exists as its own page rather than a section of the family-packs page,
 * which is where it used to live. Family packs were removed from the website;
 * the basket's only public entry point went with them, leaving a feature that
 * was fully built and completely undiscoverable — reachable only by a customer
 * who was already signed in and already knew to look in their dashboard.
 *
 * So: no curated packs here, no pack listing, nothing that reintroduces the
 * removed feature. Just the build-your-own recurring basket.
 */

const STEPS = [
  {
    icon: ShoppingBasket,
    title: 'Pick your farm and your produce',
    body: 'Choose a nearby farm, then add the vegetables your household actually gets through in a week. Set the quantity for each one.',
  },
  {
    icon: Calendar,
    title: 'Choose a delivery day',
    body: 'Pick the weekday that suits you. The same basket is then prepared and delivered on that day, every week, without you reordering.',
  },
  {
    icon: Truck,
    title: 'The farmer confirms once',
    body: 'Your chosen farm accepts the basket a single time. After that each week’s delivery is created automatically.',
  },
  {
    icon: Wallet,
    title: 'Pay cash at the door',
    body: 'Nothing is charged up front and no card is stored. You pay our delivery person in cash when the basket arrives.',
  },
]

const REASSURANCES = [
  { icon: PauseCircle, label: 'Pause or cancel any week' },
  { icon: ShieldCheck, label: 'No card details, ever' },
  { icon: Leaf, label: 'Picked the morning it ships' },
]

export default function WeeklyBasketPage() {
  useSeo('Weekly Vegetable Basket Delivery', 'Set up a weekly vegetable basket once and it arrives every week. Choose your produce and day, pause any time, pay cash on delivery.')
  const { isAuthenticated, user, loading } = useAuth()

  // Nothing is decided until the session has resolved.
  //
  // `isAuthenticated` is false while /auth/me is still in flight, so rendering
  // straight away showed a signed-in visitor the logged-out "Get started"
  // button for a beat, then swapped it — or, for a farmer, removed it
  // entirely. A control that appears and then vanishes reads as a bug, and it
  // is one: the page was answering a question it did not have the answer to
  // yet.
  const resolved = !loading

  // Farmers buy baskets too — they have households like anyone else, and the
  // API has always allowed it. Only admins are excluded: they have no customer
  // dashboard to land in and /dashboard/* would bounce them off a role guard.
  const isBuyer = !isAuthenticated || user?.role !== 'admin'

  // Farmers live under /farmer, customers under /dashboard, and the segments
  // differ too — basketPaths is the one place that knows. Signed out, both lead
  // to /auth and the destination is decided once they have an account.
  const paths = basketPaths(user?.role)
  const buildHref = isAuthenticated ? paths.create : '/auth'
  const manageHref = isAuthenticated ? paths.list : '/auth'

  // Reserves the button row's height so the hero does not jump when the
  // session lands. Same footprint, nothing drawn.
  const ctaPlaceholder = <div style={{ height: 52, marginBottom: 28 }} aria-hidden="true" />

  return (
    <div className="container section-sm weekly-basket-page">
      <div className="fp-hero">
        <div className="fp-hero__grid">
          <div>
            <div className="fp-hero__tag">
              <Repeat size={14} /> THE SAME BASKET, EVERY WEEK
            </div>
            <h1 className="fp-hero__title">
              Your weekly vegetables,<br />ordered once.
            </h1>
            <p className="fp-hero__desc">
              Build a basket from a local farm, choose the day you want it, and it arrives
              every week on its own. Change it, pause it, or stop it whenever you like.
            </p>

            {!resolved ? ctaPlaceholder : isBuyer ? (
              <div className="flex gap-3 flex-wrap" style={{ marginBottom: 28 }}>
                <Link
                  to={buildHref}
                  className="btn btn-accent btn-lg touch-target font-bold"
                  style={{ borderRadius: 'var(--radius-full)' }}
                >
                  {isAuthenticated ? 'Build my weekly basket' : 'Get started'}
                  <ArrowRight size={18} />
                </Link>
                <Link
                  to={manageHref}
                  className="btn btn-secondary btn-lg touch-target"
                  style={{
                    borderRadius: 'var(--radius-full)',
                    background: 'rgba(255,255,255,0.15)',
                    color: 'white',
                    borderColor: 'rgba(255,255,255,0.3)',
                  }}
                >
                  Manage my basket
                </Link>
              </div>
            ) : (
              // Says why there is no button, rather than leaving a gap where
              // one obviously belongs.
              <p
                style={{
                  marginBottom: 28, maxWidth: 420, lineHeight: 1.6,
                  color: 'rgba(255,255,255,0.85)', fontSize: '0.9375rem',
                }}
              >
                You&rsquo;re signed in as an admin. Baskets are approved and managed
                from Admin &rarr; Weekly Baskets.
              </p>
            )}

            <div
              className="flex gap-4 flex-wrap text-xs font-semibold"
              style={{ color: 'rgba(255,255,255,0.85)' }}
            >
              {REASSURANCES.map(({ icon: Icon, label }) => (
                <span key={label} className="flex items-center gap-1.5">
                  <Icon size={15} color="#34d399" /> {label}
                </span>
              ))}
            </div>
          </div>

          <div className="fp-hero__illustration">
            <div className="fp-hero__float-badge fp-hero__float-badge--1">
              <div style={{
                width: 32, height: 32, borderRadius: '50%', background: '#dcfce7',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Repeat size={18} color="#16a34a" />
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-gray-500)' }}>Set up once</div>
                <div>Arrives every week</div>
              </div>
            </div>

            <div className="fp-hero__card-stack" style={{ display: 'flex', flexDirection: 'column' }}>
              <div className="flex items-center justify-between" style={{ color: 'white', marginBottom: 12 }}>
                <span className="badge" style={{ background: '#34d399', color: '#064e3b', fontWeight: 800 }}>
                  YOUR BASKET
                </span>
                <span className="text-xs font-semibold">Every Tuesday</span>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 16, padding: 16, color: 'white' }}>
                <div className="font-bold text-lg" style={{ marginBottom: 4 }}>Built by you</div>
                <div className="text-xs" style={{ color: 'rgba(255,255,255,0.8)' }}>
                  Tomatoes 2kg &bull; Onions 1kg &bull; Spinach 500g &bull; Carrots 1kg
                </div>
              </div>
              <div className="flex items-center justify-between" style={{ marginTop: 'auto', paddingTop: 12 }}>
                <div>
                  <div className="text-xs" style={{ color: 'rgba(255,255,255,0.7)' }}>Paid in cash on delivery</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 900, color: 'white' }}>No card needed</div>
                </div>
              </div>
            </div>

            <div className="fp-hero__float-badge fp-hero__float-badge--2">
              <div style={{
                width: 32, height: 32, borderRadius: '50%', background: '#fef3c7',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <PauseCircle size={18} color="#d97706" />
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-gray-500)' }}>Going away?</div>
                <div>Pause any week</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ paddingTop: '2.5rem', marginBottom: '1.75rem' }}>
        <h2 className="text-h3">How a weekly basket works</h2>
        <p className="text-sm text-muted">Four steps, and only the first one takes any thought.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {STEPS.map(({ icon: Icon, title, body }, i) => (
          <div
            key={title}
            className="card"
            style={{
              padding: 24,
              borderRadius: 'var(--radius-2xl)',
              border: '1px solid var(--color-gray-200)',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div
              style={{
                width: 44, height: 44, borderRadius: 'var(--radius-lg)',
                background: 'var(--color-primary-50)', color: 'var(--color-primary-600)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: 14,
              }}
            >
              <Icon size={22} />
            </div>
            <div className="text-xs font-bold text-muted" style={{ letterSpacing: '0.04em', marginBottom: 6 }}>
              STEP {i + 1}
            </div>
            <h3 className="text-h4" style={{ marginBottom: 8 }}>{title}</h3>
            <p className="text-sm text-muted" style={{ lineHeight: 1.6 }}>{body}</p>
          </div>
        ))}
      </div>

      <div
        className="card"
        style={{
          marginTop: 32,
          padding: 32,
          borderRadius: 'var(--radius-2xl)',
          background: 'var(--color-primary-50)',
          borderColor: 'var(--color-primary-200)',
          textAlign: 'center',
        }}
      >
        <CheckCircle2 size={34} color="var(--color-primary-600)" style={{ margin: '0 auto 12px' }} />
        <h3 className="text-h3" style={{ marginBottom: 8 }}>One basket. One farm. Every week.</h3>
        <p className="text-sm text-muted" style={{ maxWidth: 520, margin: '0 auto 22px', lineHeight: 1.7 }}>
          A basket comes from a single farm, so everything in it is picked together and travels
          together. Want produce from somewhere else too? Start a second basket.
        </p>
        {resolved && isBuyer && (
          <Link
            to={buildHref}
            className="btn btn-primary btn-lg touch-target font-bold"
            style={{ borderRadius: 'var(--radius-full)' }}
          >
            {isAuthenticated ? 'Build my weekly basket' : 'Create an account to start'}
            <ArrowRight size={18} />
          </Link>
        )}
      </div>
    </div>
  )
}
