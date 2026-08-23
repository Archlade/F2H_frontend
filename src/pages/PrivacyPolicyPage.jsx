import { Link } from 'react-router-dom'
import { Mail, ShieldCheck } from 'lucide-react'
import { useSeo } from '../utils/seo'

/**
 * F2H Market's privacy policy.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * BEFORE THIS GOES LIVE — three things only you can fill in
 * ─────────────────────────────────────────────────────────────────────────────
 *
 *   1. `OPERATOR.legalName`   — the registered name of the business or person
 *                               that operates F2H Market.
 *   2. `OPERATOR.address`     — the registered address.
 *   3. `OPERATOR.grievance`   — the Grievance Officer's name.
 *
 * They are marked `TODO` below and render as an obvious placeholder rather than
 * being invented, because a privacy policy naming the wrong entity is worse
 * than one that is plainly unfinished.
 *
 * India's Digital Personal Data Protection Act 2023 requires a published
 * contact for a Data Protection Officer or a person able to answer questions on
 * the operator's behalf. `support@creepycode.com` is used as that address; point
 * it somewhere a person reads if that is not right.
 *
 * ── This describes the code, not a template ─────────────────────────────────
 *
 * Every claim below was checked against the source when it was written:
 * the columns in `backend/app/models/`, the third parties in `requirements.txt`
 * and `config.py`, and the deletion behaviour in
 * `backend/app/services/account_deletion.py`. If any of those change, this has
 * to change with them — a policy that describes something the software does not
 * do is a liability, not a protection.
 */

const OPERATOR = {
  legalName: 'TODO — registered business name',
  address: 'TODO — registered address',
  grievance: 'TODO — Grievance Officer name',
  email: 'support@creepycode.com',
}

const EFFECTIVE = '22 August 2026'

const SECTIONS = [
  {
    id: 'what-we-collect',
    title: 'What we collect',
    body: [
      'Only what an order needs. There is no tracking of you across other websites and no advertising profile.',
    ],
    groups: [
      {
        heading: 'When you create an account',
        items: [
          'Your name, email address and phone number.',
          'A password, which is stored only as a one-way hash — we cannot read it, and neither can anyone who obtains the database.',
          'A profile photo, if you upload one.',
        ],
      },
      {
        heading: 'When you place an order',
        items: [
          'Delivery addresses: recipient name, phone, address lines, city, state and PIN code.',
          'Map coordinates for an address, when you set them, so a delivery can be found.',
          'What you ordered, how much of it, the price, and any note you added for the farmer or the driver.',
        ],
      },
      {
        heading: 'If you sell on F2H',
        items: [
          'Your farm name, description, photos and farming details, which are shown publicly on your farm page.',
          'Your farm location, used to show customers which farms are near them.',
          'Payout details, where you provide them. These are visible only to you and to an administrator settling a payment.',
        ],
      },
      {
        heading: 'While you use the service',
        items: [
          'Reviews and ratings you write, shown publicly with your name.',
          'Products you favourite or recently viewed, and what is in your cart.',
          'A device token, if you allow notifications, so a message can reach your phone.',
          'For administrator accounts only: the IP address and browser of actions taken in the admin area, kept as an audit trail.',
        ],
      },
    ],
  },
  {
    id: 'payment',
    title: 'Payment — what we never hold',
    body: [
      'F2H Market is cash on delivery. You pay the person who brings your order, at your door.',
      'We therefore never ask for, transmit or store card numbers, UPI PINs, net-banking credentials or any other payment instrument. There is no payment gateway in the service. This is not a promise about how carefully we handle that data — it is that the data never exists.',
    ],
  },
  {
    id: 'why',
    title: 'Why we use it',
    items: [
      'To take, prepare and deliver your order, and to let you and the farmer see its progress.',
      'To reach you about an order — a confirmation, a delay, a weekly basket due in two days.',
      'To let you sign in and stay signed in.',
      'To show farms near you, when you have given a location.',
      'To prevent fraud and abuse, and to investigate a problem when one is reported.',
      'To meet legal and tax obligations on the records of a completed sale.',
    ],
  },
  {
    id: 'sharing',
    title: 'Who else sees it',
    body: [
      'We do not sell personal data. We do not share it for anyone else’s advertising. It is disclosed only in these situations:',
    ],
    items: [
      'The farmer fulfilling your order sees your name, delivery address, phone number and what you ordered — they cannot deliver it otherwise.',
      'Whoever delivers the order sees the same, for the same reason.',
      'Google, as the provider of Firebase Cloud Messaging, handles push notifications sent to your phone. The message content passes through their service.',
      'Our email provider handles messages we send you, such as a password reset.',
      'Our hosting provider stores the database on our behalf.',
      'A public authority, where the law requires it and we are satisfied the request is lawful.',
    ],
  },
  {
    id: 'location',
    title: 'Location',
    body: [
      'Location is used to show farms near you and to help a delivery arrive at the right door. It is collected only when you provide it — by setting a delivery address on a map, or by allowing the app to read your device location.',
      'You can decline, and the service still works: you can type an address instead, and browse every farm without any location at all. If you change your mind, remove the coordinates from the address or withdraw the permission in your device settings.',
    ],
  },
  {
    id: 'cookies',
    title: 'Cookies and similar technologies',
    body: [
      'The website sets a small number of cookies, all of them necessary for it to work. There are no advertising or analytics cookies, and no third-party trackers.',
    ],
    items: [
      'A sign-in cookie, so you are not asked for your password on every page. It is httpOnly, meaning scripts on the page cannot read it, and it expires 24 hours after it is issued.',
      'A refresh cookie, which lets your browser get a new sign-in cookie without you typing your password again. It expires after 30 days.',
      'A CSRF token, which is what lets the server tell a genuine action of yours from one a hostile site tried to make on your behalf.',
    ],
    after: [
      'The mobile app does not use cookies. It stores the equivalent tokens in the operating system’s secure storage.',
    ],
  },
  {
    id: 'retention',
    title: 'How long we keep it',
    body: [
      'Your account and its data are kept while the account is open. Records of a completed order are kept afterwards, because a sale is a financial and tax record and the farmer on the other side of it has the same interest in it that you do.',
    ],
  },
  {
    id: 'deletion',
    title: 'Deleting your account',
    body: [
      'You can delete your account from your profile at any time, on the website or in the app. It asks for your password first, because it cannot be undone.',
      'It is refused only while an order is still in flight — where goods or money are still owed in one direction — because deleting mid-order leaves the other party with a counterparty who no longer exists. Finish or cancel those first.',
    ],
    groups: [
      {
        heading: 'What is erased',
        items: [
          'Every delivery address and saved location.',
          'Your notification device tokens.',
          'Your name, email address, phone number and profile photo, which are overwritten.',
          'A farm profile’s name, description, photos and payout details, which are overwritten.',
          'Your password, replaced with a value no password can produce, so the account cannot be signed into again.',
        ],
      },
      {
        heading: 'What remains',
        items: [
          'Records of completed orders, with your name shown as a deleted user. These are the financial records of a sale that also involves someone else.',
          'Reviews you wrote, shown against a deleted user, so a farm’s rating is not silently rewritten.',
        ],
      },
    ],
  },
  {
    id: 'rights',
    title: 'Your rights',
    body: [
      'Under India’s Digital Personal Data Protection Act, 2023, you can ask us to:',
    ],
    items: [
      'Tell you what personal data of yours we hold and who it has been shared with.',
      'Correct anything inaccurate, incomplete or out of date. Most of it you can edit yourself from your profile.',
      'Erase your data, which the account deletion above does directly.',
      'Nominate someone to exercise these rights on your behalf if you die or become incapacitated.',
    ],
    after: [
      'Write to the address at the end of this page and we will respond. If you are not satisfied with our answer, you may complain to the Data Protection Board of India.',
    ],
  },
  {
    id: 'security',
    title: 'How it is protected',
    items: [
      'Traffic between your device and our servers is encrypted in transit.',
      'Passwords are stored as one-way hashes and are never recoverable, by us or by anyone else.',
      'Sign-in cookies are httpOnly and cannot be read by scripts on the page.',
      'Administrator actions are recorded in an audit log.',
      'No system is perfectly secure. If a breach affects your data, we will tell you and the Data Protection Board as the law requires.',
    ],
  },
  {
    id: 'children',
    title: 'Children',
    body: [
      'F2H Market is not intended for anyone under 18, and we do not knowingly collect data from children. If you believe a child has created an account, write to us and we will remove it.',
    ],
  },
  {
    id: 'changes',
    title: 'Changes to this policy',
    body: [
      'If this policy changes in a way that affects you, we will say so in the app and on the website rather than quietly changing the date at the top. The effective date above always tells you which version you are reading.',
    ],
  },
]

function Bullets({ items }) {
  return (
    <ul style={{ paddingLeft: 22, margin: '10px 0', display: 'flex', flexDirection: 'column', gap: 8 }}>
      {items.map((text) => (
        <li key={text} className="text-body text-muted" style={{ lineHeight: 1.7 }}>{text}</li>
      ))}
    </ul>
  )
}

export default function PrivacyPolicyPage() {
  useSeo(
    'Privacy Policy',
    'What F2H Market collects, why, who it is shared with, and how to delete your account. Cash on delivery — we never hold card or UPI details.'
  )

  const unfinished = Object.values(OPERATOR).some((v) => v.startsWith('TODO'))

  return (
    <div className="container section-sm legal-page">
      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        <div className="flex items-center gap-2" style={{ marginBottom: 8 }}>
          <ShieldCheck size={20} color="var(--color-primary-600)" />
          <span className="section-label" style={{ margin: 0 }}>Legal</span>
        </div>
        <h1 className="text-h1" style={{ marginBottom: 10 }}>Privacy Policy</h1>
        <p className="text-sm text-muted" style={{ marginBottom: 28 }}>
          Effective {EFFECTIVE}. This policy covers f2hmarket.com and the F2H Market mobile app.
        </p>

        {/*
          Renders only while the operator details are placeholders. It is a
          deliberate eyesore: a policy that names no legal entity is not
          enforceable and should not be quietly shipped. Fill in OPERATOR at the
          top of this file and it disappears on its own.
        */}
        {unfinished && (
          <div
            className="card"
            style={{
              padding: 16, marginBottom: 28, borderRadius: 'var(--radius-lg)',
              background: '#fff4e5', borderColor: '#f5b95c',
            }}
          >
            <strong style={{ display: 'block', marginBottom: 4 }}>
              This policy is not finished.
            </strong>
            <span className="text-sm text-muted">
              The operator&rsquo;s legal name, registered address and Grievance Officer
              still need filling in — see <code>OPERATOR</code> in{' '}
              <code>src/pages/PrivacyPolicyPage.jsx</code>. This notice disappears
              once they are set.
            </span>
          </div>
        )}

        <p className="text-body" style={{ lineHeight: 1.8, marginBottom: 32 }}>
          F2H Market connects farmers directly with households. To bring you an order we
          need a few things about you — your name, where to deliver, and how to reach you
          if something changes. This page says exactly what we collect, why, who else sees
          it, and how to take it back.
        </p>

        {SECTIONS.map((section) => (
          <section key={section.id} id={section.id} style={{ marginBottom: 36 }}>
            <h2 className="text-h3" style={{ marginBottom: 12 }}>{section.title}</h2>

            {section.body?.map((text) => (
              <p key={text} className="text-body text-muted" style={{ lineHeight: 1.8, marginBottom: 12 }}>
                {text}
              </p>
            ))}

            {section.items && <Bullets items={section.items} />}

            {section.groups?.map((group) => (
              <div key={group.heading} style={{ marginTop: 16 }}>
                <h3 className="text-h4" style={{ marginBottom: 4 }}>{group.heading}</h3>
                <Bullets items={group.items} />
              </div>
            ))}

            {section.after?.map((text) => (
              <p key={text} className="text-body text-muted" style={{ lineHeight: 1.8, marginTop: 12 }}>
                {text}
              </p>
            ))}
          </section>
        ))}

        <section id="contact" style={{ marginBottom: 12 }}>
          <h2 className="text-h3" style={{ marginBottom: 12 }}>Contact us</h2>
          <p className="text-body text-muted" style={{ lineHeight: 1.8, marginBottom: 12 }}>
            For anything on this page — a question, a correction, or a request to see or
            erase what we hold — write to us and a person will answer.
          </p>
          <div
            className="card"
            style={{ padding: 20, borderRadius: 'var(--radius-lg)', lineHeight: 1.9 }}
          >
            <div><strong>{OPERATOR.legalName}</strong></div>
            <div className="text-muted">{OPERATOR.address}</div>
            <div className="text-muted">Grievance Officer: {OPERATOR.grievance}</div>
            <a href={`mailto:${OPERATOR.email}`} className="flex items-center gap-2" style={{ marginTop: 8 }}>
              <Mail size={15} /> {OPERATOR.email}
            </a>
          </div>
        </section>

        <p className="text-sm text-muted" style={{ marginTop: 28 }}>
          <Link to="/">Back to F2H Market</Link>
        </p>
      </div>
    </div>
  )
}
