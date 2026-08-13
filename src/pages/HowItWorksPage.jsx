import { CheckCircle, Leaf, Truck, Package, MessageCircle, Star, ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import SellAsFarmerButton from '../components/SellAsFarmerButton'

const steps = [
  {
    number: '01', title: 'Browse & Discover', emoji: '🔍',
    desc: 'Search for fresh products near you using our location-aware marketplace. Filter by category, price, organic certification, or delivery options.',
  },
  {
    number: '02', title: 'Send a Request', emoji: '📤',
    desc: 'Found something you love? Send a purchase request to the farmer. Choose delivery or farm pickup — your preference, your schedule.',
  },
  {
    number: '03', title: 'Farmer Accepts', emoji: '✅',
    desc: 'The farmer reviews your request and either accepts or provides an alternative. You\'ll get notified instantly either way.',
  },
  {
    number: '04', title: 'Chat & Confirm', emoji: '💬',
    desc: 'Once accepted, a private chat opens between you and the farmer. Coordinate details, ask questions, confirm the order.',
  },
  {
    number: '05', title: 'Receive Fresh Food', emoji: '📦',
    desc: 'Get your order delivered to your door or pick it up fresh from the farm. Leave a review to help other customers.',
  },
]

export default function HowItWorksPage() {
  return (
    <div>
      {/* Hero */}
      <section style={{ background: 'linear-gradient(135deg, var(--color-primary-50), var(--color-accent-50))', padding: '100px 0 80px' }}>
        <div className="container" style={{ textAlign: 'center' }}>
          <div className="section-label">Simple & Transparent</div>
          <h1 className="text-display" style={{ marginBottom: 20 }}>How F2H Works</h1>
          <p className="text-body-lg text-muted" style={{ maxWidth: 560, margin: '0 auto 40px' }}>
            From farm to home in 5 easy steps. No middlemen, no mystery — just fresh food and real relationships.
          </p>
          <div className="flex flex-center gap-4" style={{ flexWrap: 'wrap' }}>
            <Link to="/products" className="btn btn-primary btn-lg">Start Shopping</Link>
            <SellAsFarmerButton className="btn btn-secondary btn-lg">
              <Leaf size={18} /> Become a Farmer
            </SellAsFarmerButton>
          </div>
        </div>
      </section>

      {/* Steps */}
      <section className="section">
        <div className="container">
          <div style={{ maxWidth: 720, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 40 }}>
            {steps.map((step, i) => (
              <div key={step.number} style={{
                display: 'flex', gap: 32, alignItems: 'flex-start',
                background: 'white', padding: '32px', borderRadius: 'var(--radius-2xl)',
                boxShadow: 'var(--shadow-card)', border: '1px solid var(--color-gray-100)',
                position: 'relative',
              }}>
                {/* Number */}
                <div style={{
                  width: 60, height: 60, flexShrink: 0,
                  background: 'linear-gradient(135deg, var(--color-primary-100), var(--color-primary-200))',
                  borderRadius: 'var(--radius-xl)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 800, fontSize: '1.125rem', color: 'var(--color-primary-700)',
                }}>
                  {step.number}
                </div>
                <div>
                  <div style={{ fontSize: '1.5rem', marginBottom: 8 }}>{step.emoji}</div>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: 10 }}>{step.title}</h2>
                  <p className="text-body text-muted" style={{ lineHeight: 1.7 }}>{step.desc}</p>
                </div>

                {/* Connector */}
                {i < steps.length - 1 && (
                  <div style={{
                    position: 'absolute', left: 50, bottom: -40, width: 2, height: 40,
                    background: 'linear-gradient(to bottom, var(--color-primary-300), transparent)',
                    zIndex: 1,
                  }} />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="section" style={{ background: 'var(--color-gray-50)' }}>
        <div className="container" style={{ maxWidth: 720 }}>
          <h2 className="text-h2" style={{ marginBottom: 40, textAlign: 'center' }}>Frequently Asked Questions</h2>
          {[
            { q: 'Is F2H free to use?', a: 'Signing up and browsing is completely free. You only pay for the products you purchase directly from farmers.' },
            { q: 'How do I know farmers are trustworthy?', a: 'All farmers go through a verification process by our admin team. Verified badges are prominently displayed on farmer profiles.' },
            { q: 'What payment methods are supported?', a: 'Payment details are coordinated directly between you and the farmer through our chat feature after a request is accepted.' },
            { q: 'Can I cancel a request?', a: 'Yes, you can cancel a pending request before the farmer accepts it. Once accepted and chat has started, please coordinate with the farmer.' },
            { q: 'How do farmers set their location?', a: 'Farmers set their farm location when registering or updating their profile. Customers are shown products sorted by proximity.' },
            { q: 'What if I\'m not happy with my order?', a: 'You can leave a review and contact our support team. We take quality and trust seriously on our platform.' },
          ].map(({ q, a }) => (
            <details key={q} style={{
              background: 'white', borderRadius: 'var(--radius-xl)', marginBottom: 12,
              border: '1px solid var(--color-gray-100)', boxShadow: 'var(--shadow-card)',
              overflow: 'hidden',
            }}>
              <summary style={{
                padding: '20px 24px', fontWeight: 700, cursor: 'pointer', listStyle: 'none',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                userSelect: 'none',
              }}>
                {q}
                <span style={{ fontSize: '1.5rem', lineHeight: 1, color: 'var(--color-primary-600)' }}>+</span>
              </summary>
              <div style={{ padding: '0 24px 20px', color: 'var(--color-gray-600)', lineHeight: 1.7 }}>{a}</div>
            </details>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section style={{ background: 'var(--color-primary-700)', padding: '80px 0' }}>
        <div className="container" style={{ textAlign: 'center' }}>
          <h2 style={{ fontFamily: 'Playfair Display', fontSize: 'clamp(2rem,4vw,3rem)', fontWeight: 800, color: 'white', marginBottom: 16 }}>
            Ready to taste the difference?
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '1.125rem', marginBottom: 40 }}>
            Join thousands enjoying farm-fresh food delivered to their doors.
          </p>
          <Link to="/auth?mode=register" className="btn btn-lg" style={{ background: 'white', color: 'var(--color-primary-700)', fontWeight: 700 }}>
            Get Started Free <ArrowRight size={18} />
          </Link>
        </div>
      </section>
    </div>
  )
}
