import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../api/client", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

import api from "../api/client";
import { getPricing, getSubscription, startCheckout } from "../api/subscription";
import type { PricingItem, SubscriptionInfo } from "../api/types";

const mockApi = vi.mocked(api);

describe("centavos formatting", () => {
  it("converts 14900 centavos to ₱149.00", () => {
    const centavos = 14900;
    const result = "₱" + (centavos / 100).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    expect(result).toBe("₱149.00");
  });

  it("converts 129000 centavos to ₱1,290.00", () => {
    const centavos = 129000;
    const result = "₱" + (centavos / 100).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    expect(result).toBe("₱1,290.00");
  });

  it("converts 0 centavos to ₱0.00", () => {
    const centavos = 0;
    const result = "₱" + (centavos / 100).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    expect(result).toBe("₱0.00");
  });
});

describe("getPricing", () => {
  beforeEach(() => vi.clearAllMocks());

  it("calls GET /subscription/pricing and returns data", async () => {
    const items: PricingItem[] = [
      { planKey: "PREMIUM", period: "MONTHLY", amountCentavos: 14900, currency: "PHP" },
    ];
    mockApi.get = vi.fn().mockResolvedValue({ data: items });

    const result = await getPricing();
    expect(mockApi.get).toHaveBeenCalledWith("/subscription/pricing");
    expect(result).toEqual(items);
  });
});

describe("getSubscription", () => {
  beforeEach(() => vi.clearAllMocks());

  it("calls GET /subscription and returns data", async () => {
    const sub: SubscriptionInfo = {
      plan: "FREE",
      status: "INACTIVE",
      currentPeriodEnd: null,
      billingPeriod: null,
    };
    mockApi.get = vi.fn().mockResolvedValue({ data: sub });

    const result = await getSubscription();
    expect(mockApi.get).toHaveBeenCalledWith("/subscription");
    expect(result).toEqual(sub);
  });
});

describe("startCheckout", () => {
  beforeEach(() => vi.clearAllMocks());

  it("calls POST /subscription/checkout with period and returns checkoutUrl", async () => {
    const response = { checkoutUrl: "https://checkout.paymongo.com/test" };
    mockApi.post = vi.fn().mockResolvedValue({ data: response });

    const result = await startCheckout("MONTHLY");
    expect(mockApi.post).toHaveBeenCalledWith("/subscription/checkout", { period: "MONTHLY" });
    expect(result.checkoutUrl).toBe("https://checkout.paymongo.com/test");
  });

  it("works for ANNUAL period", async () => {
    const response = { checkoutUrl: "https://checkout.paymongo.com/annual" };
    mockApi.post = vi.fn().mockResolvedValue({ data: response });

    const result = await startCheckout("ANNUAL");
    expect(mockApi.post).toHaveBeenCalledWith("/subscription/checkout", { period: "ANNUAL" });
    expect(result.checkoutUrl).toBe("https://checkout.paymongo.com/annual");
  });
});
