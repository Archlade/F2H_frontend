import { CheckCircle, Leaf, Truck, Package, Star, ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import SellAsFarmerButton from '../components/SellAsFarmerButton'
import { useSeo, useJsonLd } from '../utils/seo'

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
    number: '04', title: 'Farmer Confirms', emoji: '✅',
    desc: 'The farmer sets your produce aside and confirms the order. From this point the total is fixed and your delivery day is set.',
  },
  {
    number: '05', title: 'Receive Fresh Food', emoji: '📦',
    desc: 'Get your order delivered to your door or pick it up fresh from the farm. Leave a review to help other customers.',
  },
]

/**
 * Answers, shared by the visible FAQ and the FAQPage structured data below.
 *
 * One source deliberately: Google requires the markup to match the text a
 * visitor actually sees, and maintaining two copies is how they stop matching.
 */
const FAQS = [
  {
    q: 'Is F2H Market free to use?',
    a: 'Yes. Signing up and browsing is free. You only pay for the groceries you order, in cash when they are delivered.',
  },
  {
    q: 'How do I pay for my order?',
    a: 'Every order is cash on delivery. Nothing is charged up front and no card details are stored — you pay our delivery person in cash at your door.',
  },
  {
    q: 'What is a weekly basket?',
    a: 'A standing order of the vegetables your household uses each week. You choose the produce and a delivery day once, and it arrives every week without reordering. You can change it, pause it while you are away, or stop it whenever you like.',
  },
  {
    q: 'Is there a minimum order?',
    a: 'Yes, ₹300. You can reach it with a single product or by adding several items from different farms to your cart.',
  },
  {
    q: 'How do I know the farmers are genuine?',
    a: 'Every farm is verified by our team before it can sell, and verified farms carry a badge on their profile. You can see who grew your food and read reviews from other customers.',
  },
  {
    q: 'Can I cancel an order?',
    a: 'You can cancel any time before the farmer confirms it. After that the produce has been set aside for you, so cancelling is no longer one-sided — contact us and we will sort it out with the farm.',
  },
  {
    q: 'Where does F2H Market deliver?',
    a: 'Deliveries run wherever we have farms nearby. Enter your address at checkout and the site will show you the farms that can reach you.',
  },
  {
    q: 'What if something is wrong with my order?',
    a: 'Leave a review on the product or farm, and email support@creepycode.com. Because you pay at the door, you can raise a problem before any money changes hands.',
  },
]

export default function HowItWorksPage() {
  useSeo('How It Works', 'How F2H Market works: order farm-fresh groceries from local farmers and pay cash on delivery. No cards, no subscriptions, no middlemen.')

  // FAQ rich results. Google can show these answers directly beneath the
  // listing, which takes up more of the page and answers the question before
  // anyone clicks. Built from FAQS so the markup always matches what is on
  // screen — mismatched FAQ markup is ignored at best.
  useJsonLd('faq-schema', {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQS.map(({ q, a }) => ({
      '@type': 'Question',
      name: q,
      acceptedAnswer: { '@type': 'Answer', text: a },
    })),
  })
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
            ...FAQS,
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
