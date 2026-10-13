import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Pricing, { PREMIUM_FEATURE_GROUPS } from "./Pricing";
import { getPricing, startCheckout, type PricingItem } from "../api/subscription";
import { useEntitlements, type UseEntitlements } from "../hooks/useEntitlements";
import { formatCentavos } from "../lib/formatters";

vi.mock("../api/subscription", () => ({
  getPricing: vi.fn(),
  startCheckout: vi.fn(),
}));

vi.mock("../hooks/useEntitlements", () => ({ useEntitlements: vi.fn() }));

const mockGetPricing = vi.mocked(getPricing);
const mockStartCheckout = vi.mocked(startCheckout);
const mockUseEntitlements = vi.mocked(useEntitlements);

/**
 * The nine premium feature strings, written out rather than read back from the component.
 *
 * This is the one list in the suite that is deliberately not derived. The regrouping in TEN-433
 * moves all nine into three clusters, and the failure it can hide is one of them being dropped on
 * the way — which a test that read `PREMIUM_FEATURE_GROUPS` would drop in lockstep. The strings
 * are the contract; the grouping is the implementation.
 */
const NINE_FEATURES = [
  "Unlimited transactions",
  "AI-powered analytics & insights",
  "Natural-language assistant",
  "CSV & PDF export",
  "Budget forecasting",
  "Multi-month trend analysis",
  "Custom categories",
  "Spending anomaly detection",
  "Professional & Gen Z chat tones",
];

const FREE_FEATURES = [
  "Up to 50 transactions/month",
  "Basic expense tracking",
  "Category management",
  "Manual insights",
];

const MONTHLY: PricingItem = {
  period: "MONTHLY",
  amountCentavos: 19_900,
  currency: "PHP",
} as PricingItem;

const ANNUAL: PricingItem = {
  period: "ANNUAL",
  amountCentavos: 179_100,
  currency: "PHP",
} as PricingItem;

/** The component's own arithmetic, re-derived so the expectation is not a copied number. */
const savings = Math.round((1 - ANNUAL.amountCentavos / (MONTHLY.amountCentavos * 12)) * 100);

const free = (loading = false): UseEntitlements => ({
  entitlements: { plan: "FREE", status: "ACTIVE" } as UseEntitlements["entitlements"],
  has: () => false,
  loading,
});

const premium = (): UseEntitlements => ({
  entitlements: { plan: "PREMIUM", status: "ACTIVE" } as UseEntitlements["entitlements"],
  has: () => true,
  loading: false,
});

describe("Pricing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetPricing.mockResolvedValue([MONTHLY, ANNUAL]);
    mockUseEntitlements.mockReturnValue(free());
  });

  const setup = async () => {
    const view = render(<Pricing />);
    await screen.findByText(formatCentavos(MONTHLY.amountCentavos));
    return view;
  };

  // --- The nine features --------------------------------------------------

  it("renders all nine premium features", async () => {
    await setup();

    for (const feature of NINE_FEATURES) {
      expect(screen.getByText(feature)).toBeInTheDocument();
    }
  });

  it("groups the nine into three named clusters of three, losing none and rewording none", () => {
    const flat = PREMIUM_FEATURE_GROUPS.flatMap((g) => g.features);

    expect(PREMIUM_FEATURE_GROUPS).toHaveLength(3);
    for (const group of PREMIUM_FEATURE_GROUPS) {
      expect(group.features).toHaveLength(3);
      expect(group.title.length).toBeGreaterThan(0);
    }
    expect([...flat].sort()).toEqual([...NINE_FEATURES].sort());
  });

  it("renders each cluster's name", async () => {
    await setup();

    for (const group of PREMIUM_FEATURE_GROUPS) {
      expect(screen.getByText(group.title)).toBeInTheDocument();
    }
  });

  it("still renders the four free-plan features", async () => {
    await setup();

    for (const feature of FREE_FEATURES) {
      expect(screen.getByText(feature)).toBeInTheDocument();
    }
  });

  // --- The annual saving, once ---------------------------------------------

  it("prints the annual saving exactly once on the monthly tab", async () => {
    await setup();

    expect(screen.getAllByText(`~${savings}% off`)).toHaveLength(1);
  });

  it("prints the annual saving exactly once on the annual tab too", async () => {
    await setup();

    fireEvent.click(screen.getByRole("button", { name: /Annual/ }));
    await screen.findByText(formatCentavos(ANNUAL.amountCentavos));

    // It used to render in the period toggle and again under the price.
    expect(screen.getAllByText(new RegExp(`~${savings}% off`))).toHaveLength(1);
  });

  it("omits the saving entirely when only one period came back", async () => {
    mockGetPricing.mockResolvedValue([MONTHLY]);
    await setup();

    expect(screen.queryByText(/% off/)).not.toBeInTheDocument();
  });

  // --- Prices and periods ---------------------------------------------------

  it("renders the active period's price, formatted from centavos", async () => {
    await setup();

    expect(screen.getByText(formatCentavos(MONTHLY.amountCentavos))).toBeInTheDocument();
    expect(screen.getByText("per month")).toBeInTheDocument();
    expect(screen.getByText("₱0")).toBeInTheDocument();
    expect(screen.getByText("forever")).toBeInTheDocument();
  });

  it("swaps to the annual price and caption on the annual tab", async () => {
    await setup();

    fireEvent.click(screen.getByRole("button", { name: /Annual/ }));

    expect(await screen.findByText(formatCentavos(ANNUAL.amountCentavos))).toBeInTheDocument();
    expect(screen.getByText("per year")).toBeInTheDocument();
  });

  // --- Hierarchy: the paid plan must read as the recommendation -------------

  it("marks the premium plan as the recommended one", async () => {
    const { container } = await setup();

    expect(screen.getByText(/Recommended|Most popular/i)).toBeInTheDocument();
    // The free tile is a plain panel; primacy is carried by the premium tile's own treatment.
    const premiumTile = container.querySelector('[data-plan="premium"]')!;
    const freeTile = container.querySelector('[data-plan="free"]')!;
    expect(premiumTile).toBeTruthy();
    expect(freeTile).toBeTruthy();
    expect(premiumTile.className).not.toBe(freeTile.className);
  });

  /** The error path too: `#b30000` moved onto `--ga-danger`, so nothing here is a literal. */
  it("keeps no hardcoded hex colour, on the happy path or the error path", async () => {
    mockStartCheckout.mockRejectedValue({ response: { data: { message: "Card declined." } } });
    const { container } = await setup();
    expect(container.innerHTML).not.toMatch(/#[0-9a-fA-F]{6}/);

    fireEvent.click(screen.getByRole("button", { name: "Upgrade to Premium" }));
    await screen.findByText("Card declined.");

    expect(container.innerHTML).not.toMatch(/#[0-9a-fA-F]{6}/);
  });

  it("does not put Piso on the pricing table", async () => {
    const { container } = await setup();

    expect(container.querySelectorAll("[data-piso-state]")).toHaveLength(0);
  });

  // --- Checkout and error paths ---------------------------------------------

  it("starts checkout for the selected period", async () => {
    mockStartCheckout.mockResolvedValue({ checkoutUrl: "https://pay.example/abc" });
    await setup();

    fireEvent.click(screen.getByRole("button", { name: "Upgrade to Premium" }));

    await waitFor(() => expect(mockStartCheckout).toHaveBeenCalledWith("MONTHLY"));
  });

  it("surfaces the server's message when checkout fails", async () => {
    mockStartCheckout.mockRejectedValue({ response: { data: { message: "Card declined." } } });
    await setup();

    fireEvent.click(screen.getByRole("button", { name: "Upgrade to Premium" }));

    expect(await screen.findByText("Card declined.")).toBeInTheDocument();
  });

  it("falls back to its own message when the failure carries none", async () => {
    mockStartCheckout.mockRejectedValue(new Error("network"));
    await setup();

    fireEvent.click(screen.getByRole("button", { name: "Upgrade to Premium" }));

    expect(
      await screen.findByText("Failed to start checkout. Please try again.")
    ).toBeInTheDocument();
  });

  it("reports a pricing fetch failure instead of an empty table", async () => {
    mockGetPricing.mockRejectedValue(new Error("down"));
    render(<Pricing />);

    expect(await screen.findByText("Failed to load pricing. Please refresh.")).toBeInTheDocument();
  });

  it("shows the premium plan as current for a subscriber", async () => {
    mockUseEntitlements.mockReturnValue(premium());
    await setup();

    expect(screen.queryByRole("button", { name: "Upgrade to Premium" })).not.toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Current plan" })).toHaveLength(1);
  });

  it("keeps the PayMongo footnote", async () => {
    await setup();

    expect(
      screen.getByText(/Payments are processed securely by PayMongo/)
    ).toBeInTheDocument();
  });
});
