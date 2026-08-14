import { Link } from 'react-router-dom'
import { Leaf, ExternalLink, Share2, Globe, Mail } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="footer" role="contentinfo">
      <div className="container">
        <div className="footer__grid">
          {/* Brand */}
          <div>
            <Link to="/" className="footer__brand flex items-center" style={{ marginBottom: 16 }} aria-label="F2H Home">
              <picture>
                <source srcSet="/f2h-logo-darkbg.webp" type="image/webp" />
                <img
                  src="/f2h-logo-darkbg.png"
                  alt="F2H - Farmers to Home"
                  className="f2h-logo-img f2h-logo-img--footer"
                />
              </picture>
            </Link>
            <p style={{ fontSize: '0.9375rem', color: 'var(--color-gray-500)', lineHeight: 1.7, maxWidth: 260 }}>
              Connecting local farmers directly with customers for fresher, fairer food.
            </p>
            <div className="flex gap-3" style={{ marginTop: 20 }}>
            {[ExternalLink, Share2, Globe].map((Icon, i) => (
                <a key={i} href="#" aria-label="Social media" style={{
                  width: 36, height: 36, borderRadius: '10px', background: 'rgba(255,255,255,0.06)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'var(--color-gray-400)', transition: 'all 0.2s',
                }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; e.currentTarget.style.color = 'white'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = 'var(--color-gray-400)'; }}
                >
                  <Icon size={16} />
                </a>
              ))}
            </div>
          </div>

          {/* Marketplace */}
          <div>
            <h4 style={{ color: 'white', fontWeight: 700, fontSize: '0.9375rem', marginBottom: 16 }}>Marketplace</h4>
            {['Products', 'Farmers', 'Categories', 'How It Works'].map((l) => (
              <Link key={l} to={`/${l.toLowerCase().replace(/ /g, '-')}`} className="footer__link">{l}</Link>
            ))}
          </div>

          {/* Account */}
          <div>
            <h4 style={{ color: 'white', fontWeight: 700, fontSize: '0.9375rem', marginBottom: 16 }}>Account</h4>
            {[
              { label: 'Sign In', to: '/auth?mode=login' },
              { label: 'Register', to: '/auth?mode=register' },
              { label: 'Customer Dashboard', to: '/dashboard' },
              { label: 'Farmer Dashboard', to: '/farmer' },
            ].map(({ label, to }) => (
              <Link key={label} to={to} className="footer__link">{label}</Link>
            ))}
          </div>

          {/* Contact */}
          <div>
            <h4 style={{ color: 'white', fontWeight: 700, fontSize: '0.9375rem', marginBottom: 16 }}>Get in Touch</h4>
            <a
              href="mailto:support@creepycode.com"
              className="flex items-center gap-2 footer__link"
              style={{ padding: '4px 0' }}
            >
              <Mail size={15} /> support@creepycode.com
            </a>

            {/*
              The same two links declared in the Organization `sameAs` block in
              index.html, and they need to exist in both places. `sameAs` is a
              claim the site makes about itself; a real link on the page is the
              corroboration. Google treats a connection asserted in one
              direction only with noticeably less confidence, and for a brand as
              ambiguous as "F2H" that confidence is the whole game.

              `rel="me"` states authorship rather than mere reference — it is the
              conventional way to say "this profile is also me".
            */}
            <a
              href="https://share.google/2xEBxpDFisj1Gf2QD"
              className="flex items-center gap-2 footer__link"
              style={{ padding: '4px 0' }}
              target="_blank"
              rel="me noopener noreferrer"
            >
              <Globe size={15} /> F2H Market on Google
            </a>
            <a
              href="https://www.instagram.com/farm.to.home_"
              className="flex items-center gap-2 footer__link"
              style={{ padding: '4px 0' }}
              target="_blank"
              rel="me noopener noreferrer"
            >
              <Share2 size={15} /> @farm.to.home_ on Instagram
            </a>

            <p style={{ fontSize: '0.875rem', color: 'var(--color-gray-500)', marginTop: 16, lineHeight: 1.6 }}>
              Monday–Saturday<br />9:00 AM – 6:00 PM IST
            </p>
          </div>
        </div>

        <div className="divider" style={{ borderColor: 'rgba(255,255,255,0.06)' }} />
        <div className="flex-between" style={{ flexWrap: 'wrap', gap: 12, paddingTop: 24 }}>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-gray-600)' }}>
            © {new Date().getFullYear()} F2H — Farm to Home. All rights reserved.
          </p>
          <div className="flex gap-4">
            {['Privacy Policy', 'Terms of Service'].map((l) => (
              <a key={l} href="#" className="footer__link" style={{ display: 'inline', fontSize: '0.875rem' }}>{l}</a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  )
}
