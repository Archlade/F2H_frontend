/**
 * Where a person's own weekly basket lives, per role.
 *
 * Customers and farmers use the same screens but sit under different layouts,
 * and the segments cannot simply be shared: `/farmer/family-pack-orders` was
 * already taken by the farmer's *supply* side — the weekly deliveries they fill
 * for other people. Mounting the buy side on the same path made React Router
 * match the first one and quietly serve the wrong screen.
 *
 * So the farmer's own basket lives at `/farmer/my-basket`, and this is the one
 * place that knows it. Anything linking to a basket asks here rather than
 * building a path from a role check, because a path built in six places drifts
 * in six places.
 */
export function basketPaths(role) {
  if (role === 'farmer') {
    return {
      list: '/farmer/my-basket',
      create: '/farmer/my-basket/new',
      edit: (id) => `/farmer/my-basket/${id}/edit`,
      addresses: '/farmer/addresses',
    }
  }
  return {
    list: '/dashboard/family-pack-orders',
    create: '/dashboard/family-pack/new',
    edit: (id) => `/dashboard/family-pack/${id}/edit`,
    addresses: '/dashboard/addresses',
  }
}
