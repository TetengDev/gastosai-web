// Set VITE_BILLING_ENABLED=false to hide all payment/upgrade UI (free-launch mode).
// Any other value (or unset) keeps billing visible.
export const BILLING_ENABLED = import.meta.env.VITE_BILLING_ENABLED !== "false";
