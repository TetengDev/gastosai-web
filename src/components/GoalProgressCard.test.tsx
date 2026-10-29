import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import GoalProgressCard from "./GoalProgressCard";
import { getGoals, type Goal } from "../api/goals";
import { formatCurrencyAmount } from "../lib/formatters";

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

const renderStrip = () =>
  render(
    <MemoryRouter>
      <GoalProgressCard />
    </MemoryRouter>,
  );

const coin = () => document.querySelector('[data-testid="coin"]');

describe("GoalProgressCard strip", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it.each([
    ["ON_TRACK", "bg-brand"],
    ["BEHIND", "bg-warn-ink"],
    ["COMPLETED", "bg-brand"],
  ] as const)("tones a %s goal's meter %s", async (status, fill) => {
    mockGetGoals.mockResolvedValue([goal({ status })]);
    renderStrip();
    const bar = await screen.findByRole("progressbar", { name: "Trip fund" });
    expect(bar.querySelector('[data-testid="meter-fill"]')).toHaveClass(fill);
  });

  it("never hatches a goal past its target", async () => {
    mockGetGoals.mockResolvedValue([goal({ status: "ON_TRACK", progressPercent: 120 })]);
    renderStrip();
    const bar = await screen.findByRole("progressbar", { name: "Trip fund" });
    expect(bar.querySelector('[data-testid="meter-overflow"]')).toBeNull();
  });

  it("pairs every meter with its figures in words", async () => {
    const g = goal();
    mockGetGoals.mockResolvedValue([g]);
    renderStrip();
    const tile = (await screen.findByRole("progressbar", { name: "Trip fund" })).closest("li")!;
    expect(tile).toHaveTextContent(
      `${formatCurrencyAmount(g.savedAmount, "PHP")} of ${formatCurrencyAmount(g.targetAmount, "PHP")} · 25%`,
    );
  });

  it("lists active goals before completed ones and leaves paused goals out", async () => {
    mockGetGoals.mockResolvedValue([
      goal({ id: 1, name: "Done", status: "COMPLETED", progressPercent: 100 }),
      goal({ id: 2, name: "Resting", status: "PAUSED" }),
      goal({ id: 3, name: "Later", targetDate: "2027-06-01" }),
      goal({ id: 4, name: "Sooner", targetDate: "2026-12-01" }),
    ]);
    renderStrip();
    await screen.findByText("Sooner");
    const names = within(screen.getByRole("list")).getAllByRole("progressbar").map((b) => b.getAttribute("aria-label"));
    expect(names).toEqual(["Sooner", "Later", "Done"]);
  });

  it("celebrates a COMPLETED goal once, keyed goal-<id>", async () => {
    mockGetGoals.mockResolvedValue([goal({ id: 42, status: "COMPLETED", progressPercent: 100 })]);
    const first = renderStrip();
    await screen.findByRole("progressbar", { name: "Trip fund" });
    expect(coin()).not.toBeNull();
    expect(localStorage.getItem("ga.celebrate.anon.goal-42")).toBe("1");
    first.unmount();

    renderStrip();
    await screen.findByRole("progressbar", { name: "Trip fund" });
    expect(coin()).toBeNull();
  });

  it("does not celebrate a goal that is still in progress", async () => {
    mockGetGoals.mockResolvedValue([goal({ status: "ON_TRACK", progressPercent: 99 })]);
    renderStrip();
    await screen.findByRole("progressbar", { name: "Trip fund" });
    expect(coin()).toBeNull();
  });

  it("offers to set a goal when there are none", async () => {
    mockGetGoals.mockResolvedValue([]);
    renderStrip();
    expect(await screen.findByRole("link", { name: /set a goal/i })).toHaveAttribute("href", "/goals");
  });
});
