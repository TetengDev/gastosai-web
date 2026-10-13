import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import GoalProgressCard from "./GoalProgressCard";
import { getGoals, type Goal } from "../api/goals";

vi.mock("../api/goals", () => ({ getGoals: vi.fn() }));

const mockGetGoals = vi.mocked(getGoals);

const goal = (over: Partial<Goal> = {}): Goal => ({
  id: 1,
  name: "Trip fund",
  targetAmount: 10000000,
  savedAmount: 2500000,
  targetDate: null,
  paused: false,
  currency: "PHP",
  status: "ON_TRACK",
  progressPercent: 25,
  createdAt: "2026-09-01T12:00:00+08:00",
  ...over,
});

const renderCard = () =>
  render(
    <MemoryRouter>
      <GoalProgressCard />
    </MemoryRouter>,
  );

describe("GoalProgressCard meters", () => {
  beforeEach(() => vi.clearAllMocks());

  it.each([
    ["ON_TRACK", "bg-brand"],
    ["COMPLETED", "bg-brand"],
    ["BEHIND", "bg-warn-ink"],
    ["PAUSED", "bg-ink-3"],
  ] as const)("tones a %s goal's meter %s", async (status, fill) => {
    mockGetGoals.mockResolvedValue([goal({ status })]);
    renderCard();
    const bar = await screen.findByRole("progressbar", { name: "Trip fund" });
    expect(bar.querySelector('[data-testid="meter-fill"]')).toHaveClass(fill);
  });

  it("never hatches a goal past its target", async () => {
    mockGetGoals.mockResolvedValue([goal({ status: "COMPLETED", progressPercent: 120 })]);
    renderCard();
    const bar = await screen.findByRole("progressbar", { name: "Trip fund" });
    expect(bar.querySelector('[data-testid="meter-overflow"]')).toBeNull();
  });
});
