import api from "./client";
import type { components } from "./generated/schema";

type Schemas = components["schemas"];

/**
 * springdoc expresses neither presence nor nullability: every response property
 * arrives optional and never nullable, which is wrong in both directions. These
 * two put it back — `Complete` for the fields the API always sends, `Nullable`
 * for the ones it sends as `null` (a free account has no renewal date and no
 * billing period).
 */
type Complete<T> = { [K in keyof T]-?: T[K] };
type Nullable<T, K extends keyof T> = Omit<Complete<T>, K> & {
  [P in K]-?: Exclude<T[P], undefined> | null;
};

export type BillingPeriod = Schemas["CheckoutRequest"]["period"];

/**
 * The contract types `planKey` with the full plan enum and `currency` as a bare
 * string, because both are shared with other endpoints. `/subscription/pricing`
 * lists exactly one thing: the premium plan, priced in pesos. Both values still
 * come from the contract's own types; only the narrowing is added, so widening
 * either of them upstream breaks the build here.
 */
export type PricingItem = Omit<Complete<Schemas["PricingItem"]>, "planKey" | "currency"> & {
  planKey: Extract<Schemas["PricingItem"]["planKey"], "PREMIUM">;
  currency: Extract<Schemas["PricingItem"]["currency"], string> & "PHP";
};

export type SubscriptionInfo = Nullable<
  Schemas["SubscriptionResponse"],
  "currentPeriodEnd" | "billingPeriod"
>;

export type CheckoutRequest = Schemas["CheckoutRequest"];
export type CheckoutResponse = Complete<Schemas["CheckoutResponse"]>;

export const getPricing = (): Promise<PricingItem[]> =>
  api.get<PricingItem[]>("/subscription/pricing").then((r) => r.data);

export const getSubscription = (): Promise<SubscriptionInfo> =>
  api.get<SubscriptionInfo>("/subscription").then((r) => r.data);

export const startCheckout = (period: BillingPeriod): Promise<CheckoutResponse> => {
  const body: CheckoutRequest = { period };
  return api.post<CheckoutResponse>("/subscription/checkout", body).then((r) => r.data);
};
