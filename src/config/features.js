/**
 * Feature switches for things the backend cannot currently deliver.
 *
 * The website's counterpart to `AppConfig` in the app, and deliberately the
 * same shape: one boolean, checked wherever the UI would lead somebody into
 * the flow. Two clients disagreeing about what works is its own bug.
 */

/**
 * Whether "Forgot password?" is offered anywhere.
 *
 * Off, because password reset needs MAIL_USERNAME and MAIL_PASSWORD set on the
 * server and they are not. A reset form that silently sends nothing is worse
 * than no form at all: the person submits it, is told to check their inbox, and
 * waits for a message that was never sent — then assumes the account is broken
 * rather than the feature.
 *
 * The page, the route and the reset flow all stay. This only decides whether
 * anything leads to them, so turning it back on once mail is configured is this
 * one flag rather than a re-implementation.
 *
 * `/reset-password` is deliberately NOT gated: a link already in somebody's
 * inbox, or one an admin issues by hand, must still work.
 */
export const PASSWORD_RESET_ENABLED = false;
