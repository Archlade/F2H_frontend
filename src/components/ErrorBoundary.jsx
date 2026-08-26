import { Component } from 'react'

/**
 * Stops one broken component taking the whole page with it.
 *
 * React unmounts the entire tree when a render throws and nothing catches it,
 * which is why an error in one form leaves a completely white page. White tells
 * whoever hit it nothing at all — not what broke, not whether it was their
 * doing, not whether reloading will help. Worse, on a phone there is no console
 * to look in, so the fault is unreportable as well as unreadable.
 *
 * This shows the error text instead. Not a friendly euphemism: the actual
 * message and component stack, because the person most likely to see this is
 * the one who can fix it, and a screenshot of it is a bug report.
 *
 * A class component on purpose — `componentDidCatch` and `getDerivedStateFromError`
 * have no hook equivalent.
 */
export default class ErrorBoundary extends Component {
  state = { error: null, info: null, copied: false }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    this.setState({ info })
    // Still logged: a boundary that swallows the console entry makes the error
    // harder to debug than no boundary at all.
    console.error('Caught by ErrorBoundary:', error, info)
  }

  /// The whole report as one string, message first.
  text() {
    const { error, info } = this.state
    const name = error?.name || 'Error'
    const message = error?.message || String(error)
    return [
      `${name}: ${message}`,
      error?.stack ? `\n${error.stack}` : '',
      info?.componentStack ? `\ncomponents:${info.componentStack}` : '',
    ].join('')
  }

  copy = async () => {
    try {
      await navigator.clipboard.writeText(this.text())
      this.setState({ copied: true })
    } catch {
      // Clipboard is blocked outside a secure context and on some mobile
      // browsers. Selecting the text by hand still works, so this stays quiet.
      this.setState({ copied: false })
    }
  }

  render() {
    const { error, info, copied } = this.state
    if (!error) return this.props.children

    return (
      <div style={{ padding: 24, maxWidth: 720, margin: '0 auto' }}>
        <div className="card" style={{ padding: 24, borderRadius: 'var(--radius-2xl)' }}>
          <h1 className="text-h4" style={{ marginBottom: 8 }}>Something on this page broke</h1>
          <p className="text-sm text-muted" style={{ lineHeight: 1.6, marginBottom: 16 }}>
            The rest of the site still works. Reloading usually clears it — if it
            keeps happening, send this text along with what you were doing.
          </p>

          {/* Message first and on its own, because Safari's `error.stack`
              contains only frames — unlike Chrome, it omits the message line.
              Rendering `stack || message` therefore showed a wall of minified
              frames and hid the one sentence that says what actually broke. */}
          <pre style={{
            background: 'var(--color-gray-50)',
            border: '1px solid var(--color-gray-200)',
            borderRadius: 'var(--radius-lg)',
            padding: 12,
            fontSize: 12,
            lineHeight: 1.5,
            overflowX: 'auto',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}>
            {this.text()}
          </pre>

          <div className="flex gap-2" style={{ marginTop: 16 }}>
            <button
              type="button"
              className="btn btn-primary touch-target"
              onClick={() => window.location.reload()}
            >
              Reload the page
            </button>
            <button type="button" className="btn btn-secondary touch-target" onClick={this.copy}>
              {copied ? 'Copied' : 'Copy error'}
            </button>
            <button
              type="button"
              className="btn btn-secondary touch-target"
              onClick={() => this.setState({ error: null, info: null, copied: false })}
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    )
  }
}
