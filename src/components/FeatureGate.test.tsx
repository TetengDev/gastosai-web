import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, vi, beforeEach } from "vitest";
import FeatureGate from "./FeatureGate";
import { useEntitlements, type UseEntitlements } from "../hooks/useEntitlements";

vi.mock("../hooks/useEntitlements", () => ({ useEntitlements: vi.fn() }));

const mockUseEntitlements = vi.mocked(useEntitlements);

function stub(has: boolean, loading: boolean): UseEntitlements {
  return { entitlements: null, has: () => has, loading };
}

describe("FeatureGate", () => {
  beforeEach(() => mockUseEntitlements.mockReset());

  it("renders children when entitled", () => {
    mockUseEntitlements.mockReturnValue(stub(true, false));
    render(<FeatureGate feature="ADVANCED_INSIGHTS"><div>secret</div></FeatureGate>);
    expect(screen.queryByText("secret")).not.toBeNull();
  });

  it("renders children optimistically while loading", () => {
    mockUseEntitlements.mockReturnValue(stub(false, true));
    render(<FeatureGate feature="ADVANCED_INSIGHTS"><div>secret</div></FeatureGate>);
    expect(screen.queryByText("secret")).not.toBeNull();
  });

  it("shows an upgrade prompt when locked", () => {
    mockUseEntitlements.mockReturnValue(stub(false, false));
    render(
      <MemoryRouter>
        <FeatureGate feature="ADVANCED_INSIGHTS"><div>secret</div></FeatureGate>
      </MemoryRouter>
    );
    expect(screen.queryByText("secret")).toBeNull();
    expect(screen.queryByText(/Premium feature/i)).not.toBeNull();
  });

  it("renders a custom fallback when locked", () => {
    mockUseEntitlements.mockReturnValue(stub(false, false));
    render(
      <FeatureGate feature="EXPORT_CSV" fallback={<div>custom-fallback</div>}>
        <div>secret</div>
      </FeatureGate>,
    );
    expect(screen.queryByText("custom-fallback")).not.toBeNull();
    expect(screen.queryByText("secret")).toBeNull();
  });
});
