import api from "./client";
import type { BillingPeriod, PricingItem, SubscriptionInfo } from "./types";

const publicApi = api;

export const getPricing = (): Promise<PricingItem[]> =>
  publicApi.get<PricingItem[]>("/subscription/pricing").then((r) => r.data);

export const getSubscription = (): Promise<SubscriptionInfo> =>
  api.get<SubscriptionInfo>("/subscription").then((r) => r.data);

export const startCheckout = (period: BillingPeriod): Promise<{ checkoutUrl: string }> =>
  api.post<{ checkoutUrl: string }>("/subscription/checkout", { period }).then((r) => r.data);
