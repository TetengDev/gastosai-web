import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

describe("BILLING_ENABLED flag", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
    vi.doUnmock("../config/billing");
  });

  it("defaults to true when the env var is unset", async () => {
    const { BILLING_ENABLED } = await import("../config/billing");
    expect(BILLING_ENABLED).toBe(true);
  });

  it("is false only for the literal string 'false'", async () => {
    vi.stubEnv("VITE_BILLING_ENABLED", "false");
    vi.resetModules();
    const { BILLING_ENABLED } = await import("../config/billing");
    expect(BILLING_ENABLED).toBe(false);
  });

  it("stays true for any other value", async () => {
    vi.stubEnv("VITE_BILLING_ENABLED", "0");
    vi.resetModules();
    const { BILLING_ENABLED } = await import("../config/billing");
    expect(BILLING_ENABLED).toBe(true);
  });
});

describe("UpgradePrompt with billing disabled", () => {
  afterEach(() => {
    vi.resetModules();
    vi.doUnmock("../config/billing");
  });

  it("hides the upgrade CTA when billing is disabled", async () => {
    vi.doMock("../config/billing", () => ({ BILLING_ENABLED: false }));
    const { default: UpgradePrompt } = await import("../components/UpgradePrompt");
    render(
      <MemoryRouter>
        <UpgradePrompt feature="ADVANCED_INSIGHTS" />
      </MemoryRouter>,
    );
    expect(screen.getByText(/Premium feature/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Upgrade to Premium/i })).not.toBeInTheDocument();
  });

  it("shows the upgrade CTA when billing is enabled", async () => {
    vi.doMock("../config/billing", () => ({ BILLING_ENABLED: true }));
    const { default: UpgradePrompt } = await import("../components/UpgradePrompt");
    render(
      <MemoryRouter>
        <UpgradePrompt feature="ADVANCED_INSIGHTS" />
      </MemoryRouter>,
    );
    expect(screen.getByRole("button", { name: /Upgrade to Premium/i })).toBeInTheDocument();
  });
});
