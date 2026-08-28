/**
 * Where each role belongs when it has nowhere better to be.
 *
 * Used in two places that were previously inconsistent, and the inconsistency
 * is what let a delivery account onto the customer marketplace:
 *
 *   - after signing in (`GuestRoute`), which sent anything that was not an
 *     admin or a farmer to `/dashboard` — the customer area;
 *   - when a route refuses a role (`ProtectedRoute`), which sent them to `/`,
 *     the public shopfront.
 *
 * Both now ask here, so adding a fifth role means changing one line rather than
 * finding every redirect and hoping none was missed.
 *
 * A delivery account has no business in either of those places. It exists to
 * carry orders, it can read customers' addresses, and it cannot buy anything —
 * dropping it on a shopping page is at best confusing and at worst invites
 * somebody to try.
 */
export function homeFor(role) {
  switch (role) {
    case 'admin':
      return '/admin'
    case 'farmer':
      return '/farmer'
    case 'delivery':
      return '/delivery'
    default:
      return '/dashboard'
  }
}

/** Roles that should never see the public marketplace or the customer area. */
export const STAFF_ONLY_ROLES = ['delivery']

/**
 * Where to land somebody after they place an order.
 *
 * Not `/dashboard/requests` for everyone. That route is customer-only, so a
 * farmer or an admin who checked out placed the order successfully and was then
 * bounced by the role guard to their own home — no confirmation, no order in
 * sight, and every reason to think it had failed and try again.
 */
export function ordersLandingFor(role) {
  switch (role) {
    case 'admin':
      return '/admin/orders'
    // Farmers buy from each other; their purchases are kept apart from the
    // orders they receive as a seller.
    case 'farmer':
      return '/farmer/purchases'
    default:
      return '/dashboard/requests'
  }
}
