import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Goals from "./Goals";
import { createGoal, getGoals, updateGoal, type Goal } from "../api/goals";

vi.mock("../api/goals", () => ({
  getGoals: vi.fn(),
  createGoal: vi.fn(),
  updateGoal: vi.fn(),
  deleteGoal: vi.fn(),
}));

const mockGetGoals = vi.mocked(getGoals);
const mockCreateGoal = vi.mocked(createGoal);
const mockUpdateGoal = vi.mocked(updateGoal);

const goal = (over: Partial<Goal> = {}): Goal => ({
  id: 1,
  name: "Emergency Fund",
  targetAmount: 10000000,
  savedAmount: 2500050,
  targetDate: null,
  paused: false,
  currency: "PHP",
  status: "ON_TRACK",
  progressPercent: 25,
  createdAt: "2026-09-01T12:00:00+08:00",
  ...over,
});

/**
 * A goal carries two amount fields, both parsed by hand in `buildRequest` rather than through
 * `ExpenseModal`. These assert what the API layer is handed: integer centavos, and the same
 * value back out of an edit that never touched the amount.
 */
describe("Goals amounts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetGoals.mockResolvedValue([]);
    mockCreateGoal.mockResolvedValue(goal());
    mockUpdateGoal.mockResolvedValue(goal());
  });

  // [target, saved] — index order of the two number inputs in the modal.
  const amountFields = () => screen.getAllByRole("spinbutton");

  const openAdd = async () => {
    render(<Goals />);
    fireEvent.click((await screen.findAllByRole("button", { name: /Add Goal/ }))[0]);
    await screen.findByPlaceholderText("e.g. Emergency Fund");
  };

  const submit = () =>
    fireEvent.click(screen.getAllByRole("button", { name: "Add Goal" }).at(-1)!);

  it.each([
    ["150.75", 15075],
    ["1.15", 115],
    ["100000", 10000000],
    ["25000.50", 2500050],
  ])("sends a target of %s as %i centavos", async (typed, expected) => {
    await openAdd();

    fireEvent.change(screen.getByPlaceholderText("e.g. Emergency Fund"), { target: { value: "Fund" } });
    fireEvent.change(amountFields()[0], { target: { value: typed } });
    submit();

    await waitFor(() => expect(mockCreateGoal).toHaveBeenCalledTimes(1));
    expect(mockCreateGoal.mock.calls[0][0].targetAmount).toBe(expected);
  });

  it("sends both amounts as centavos, and an empty saved field as 0", async () => {
    await openAdd();

    fireEvent.change(screen.getByPlaceholderText("e.g. Emergency Fund"), { target: { value: "Fund" } });
    fireEvent.change(amountFields()[0], { target: { value: "100000" } });
    fireEvent.change(amountFields()[1], { target: { value: "8.87" } });
    submit();

    await waitFor(() => expect(mockCreateGoal).toHaveBeenCalledTimes(1));
    expect(mockCreateGoal.mock.calls[0][0]).toMatchObject({ targetAmount: 10000000, savedAmount: 887 });
  });

  // An untouched "Saved So Far" is the empty string, and the parser rejects that — so the form
  // maps it to a literal 0 rather than letting it fail validation or arrive as `NaN`.
  it("sends an empty saved field as 0 centavos", async () => {
    await openAdd();

    fireEvent.change(screen.getByPlaceholderText("e.g. Emergency Fund"), { target: { value: "Fund" } });
    fireEvent.change(amountFields()[0], { target: { value: "100000" } });
    submit();

    await waitFor(() => expect(mockCreateGoal).toHaveBeenCalledTimes(1));
    expect(mockCreateGoal.mock.calls[0][0].savedAmount).toBe(0);
  });

  it("refuses a third decimal place instead of rounding it into a target nobody set", async () => {
    await openAdd();

    fireEvent.change(screen.getByPlaceholderText("e.g. Emergency Fund"), { target: { value: "Fund" } });
    fireEvent.change(amountFields()[0], { target: { value: "150.755" } });
    submit();

    expect(await screen.findByText(/at most two decimal places/)).toBeTruthy();
    expect(mockCreateGoal).not.toHaveBeenCalled();
  });

  it("round-trips an edited goal without moving either amount", async () => {
    mockGetGoals.mockResolvedValue([goal()]);
    render(<Goals />);

    fireEvent.click(await screen.findByTitle("Edit"));
    await screen.findByPlaceholderText("e.g. Emergency Fund");
    expect(amountFields()[0]).toHaveValue(100000);
    expect(amountFields()[1]).toHaveValue(25000.5);

    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));

    await waitFor(() => expect(mockUpdateGoal).toHaveBeenCalledTimes(1));
    expect(mockUpdateGoal.mock.calls[0][1]).toMatchObject({ targetAmount: 10000000, savedAmount: 2500050 });
  });
});
