// Payment hook. TODAY: simulated, no money moves, no card data is handled.
// TO GO LIVE WITH STRIPE: replace the body of chargeCard with a PaymentIntent
// call (stripe customer = donor.stripe_customer_id, off_session, confirm true),
// store STRIPE_SECRET_KEY as a Pages secret, and return {status:'succeeded', ref: pi.id}.
// The rest of the app (donations table, receipts, UI) already uses charge_status/charge_ref.
export async function chargeCard({ amountCents, currency, donor, env }) {
  return { status: 'simulated', ref: 'SIM-' + crypto.randomUUID().slice(0, 8).toUpperCase(), live: false };
}
