import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import AiInsightsCard from "./AiInsightsCard";

vi.mock("../hooks/useAiAvailability", () => ({ useAiAvailability: () => true }));
vi.mock("../api/insights", () => ({
  getTopCategoryInsight: vi.fn().mockRejectedValue(new Error("429")),
  getMonthSummaryInsight: vi.fn().mockRejectedValue(new Error("429")),
  getRecommendationsInsight: vi.fn().mockRejectedValue(new Error("429")),
}));

describe("AiInsightsCard", () => {
  // It now sits on the dashboard, whose markup carries no colour literals.
  it("says it could not load in the danger token when every insight fails", async () => {
    const { container } = render(
      <MemoryRouter>
        <AiInsightsCard month="2026-10" />
      </MemoryRouter>,
    );
    expect(await screen.findByText("Unable to load AI insights.")).toHaveClass("text-danger");
    expect(container.innerHTML).not.toMatch(/#[0-9a-fA-F]{6}/);
  });
});
