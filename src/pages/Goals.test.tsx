import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Goals from "./Goals";
import { createGoal, getGoals, updateGoal, type Goal } from "../api/goals";
import { AuthProvider } from "../context/AuthContext";
import { celebrationKey } from "../lib/celebrateStore";

vi.mock("../api/goals", () => ({
  getGoals: vi.fn(),
  createGoal: vi.fn(),
  updateGoal: vi.fn(),
  deleteGoal: vi.fn(),
}));

const mockGetGoals = vi.mocked(getGoals);
const mockCreateGoal = vi.mocked(createGoal);
const mockUpdateGoal = vi.mocked(updateGoal);

// Celebrations are per account, so the page renders inside a signed-in AuthProvider, as in the app.
const ACCOUNT = "a@example.com";

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem("token", "t");
  localStorage.setItem("auth_user", JSON.stringify({ email: ACCOUNT, name: "A", role: "USER" }));
});

const renderGoals = () =>
  render(
    <AuthProvider>
      <Goals />
    </AuthProvider>,
  );

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
    renderGoals();
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
    renderGoals();

    fireEvent.click(await screen.findByTitle("Edit"));
    await screen.findByPlaceholderText("e.g. Emergency Fund");
    expect(amountFields()[0]).toHaveValue(100000);
    expect(amountFields()[1]).toHaveValue(25000.5);

    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));

    await waitFor(() => expect(mockUpdateGoal).toHaveBeenCalledTimes(1));
    expect(mockUpdateGoal.mock.calls[0][1]).toMatchObject({ targetAmount: 10000000, savedAmount: 2500050 });
  });
});

describe("Goals meters", () => {
  beforeEach(() => vi.clearAllMocks());

  it.each([
    ["ON_TRACK", "bg-brand"],
    ["BEHIND", "bg-warn-ink"],
    ["PAUSED", "bg-ink-3"],
  ] as const)("tones a %s goal's meter %s, named for the goal", async (status, fill) => {
    mockGetGoals.mockResolvedValue([goal({ status, progressPercent: 40 })]);
    renderGoals();
    const bar = await screen.findByRole("progressbar", { name: "Emergency Fund" });
    expect(bar).toHaveAttribute("aria-valuenow", "40");
    expect(bar.querySelector('[data-testid="meter-fill"]')).toHaveClass(fill);
  });
});

// --- One card per goal, Add savings, the Achieved group (TEN-442) ---------------------------

// By the card's heading: the Add savings dialog also names the goal.
const card = (name: string) => screen.getByRole("heading", { name }).closest("div.group") as HTMLElement;
const seen = (event: string) => localStorage.getItem(celebrationKey(ACCOUNT, event)) === "1";
const coin = () => document.querySelector('[data-testid="coin"]');
const pisos = () => document.querySelectorAll("[data-piso-state]");

/** Opens the Add savings dialog on the named goal's card. */
const openAddSavings = async (name = "Emergency Fund") => {
  await screen.findByText(name);
  fireEvent.click(within(card(name)).getByRole("button", { name: "Add savings" }));
  return screen.findByLabelText(/Amount to add/);
};

describe("Goals cards", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdateGoal.mockResolvedValue(goal());
  });

  // Status and percentage disagree on purpose: where a goal sits is the server's status, never a
  // client reading of the number.
  const MIXED = [
    goal({ id: 1, progressPercent: 100, status: "ON_TRACK", targetDate: "2026-12-31" }),
    goal({ id: 2, name: "Laptop", progressPercent: 60, status: "COMPLETED" }),
  ];

  it("gives a goal in progress Add savings and its target date, and a COMPLETED one no Add savings", async () => {
    mockGetGoals.mockResolvedValue(MIXED);
    renderGoals();
    await screen.findByText("Laptop");

    expect(within(card("Emergency Fund")).getByRole("button", { name: "Add savings" })).toBeTruthy();
    expect(within(card("Emergency Fund")).getByRole("progressbar", { name: "Emergency Fund" })).toBeTruthy();
    expect(card("Emergency Fund")).toHaveTextContent("By Dec 31, 2026");
    expect(within(card("Laptop")).queryByRole("button", { name: "Add savings" })).toBeNull();
  });

  it("files a COMPLETED goal in a closed Achieved group, out of the list in progress", async () => {
    mockGetGoals.mockResolvedValue(MIXED);
    renderGoals();

    const details = (await screen.findByText("Achieved (1)")).closest("details")!;
    expect(details.open).toBe(false);
    expect(within(details).getByText("Laptop")).toBeTruthy();
    expect(within(details).queryByText("Emergency Fund")).toBeNull();

    const inProgress = screen.getByRole("list", { name: "Goals in progress" });
    expect(within(inProgress).getByText("Emergency Fund")).toBeTruthy();
    expect(within(inProgress).queryByText("Laptop")).toBeNull();
  });

  it("shows no Achieved group when no goal is COMPLETED", async () => {
    mockGetGoals.mockResolvedValue([goal({ progressPercent: 100, status: "ON_TRACK" })]);
    renderGoals();
    await screen.findByText("Emergency Fund");
    expect(screen.queryByText(/Achieved/)).toBeNull();
  });

  it("keeps the card markup on tokens, with no raw hex colour", async () => {
    mockGetGoals.mockResolvedValue([
      goal({ id: 1, status: "ON_TRACK" }),
      goal({ id: 2, name: "B", status: "BEHIND" }),
      goal({ id: 3, name: "C", status: "PAUSED", paused: true }),
      goal({ id: 4, name: "D", status: "COMPLETED", progressPercent: 100 }),
    ]);
    const { container } = renderGoals();
    await screen.findByText("D");
    expect(container.innerHTML).not.toMatch(/#[0-9a-fA-F]{3,6}\b/);
  });
});

describe("Goals Add savings", () => {
  beforeEach(() => vi.clearAllMocks());

  it("opens with one empty field, the amount to add, and no name field", async () => {
    mockGetGoals.mockResolvedValue([goal()]);
    renderGoals();
    const field = await openAddSavings();

    expect(field).toHaveValue(null);
    expect(screen.getAllByRole("spinbutton")).toHaveLength(1);
    expect(screen.queryByRole("textbox")).toBeNull();
    expect(screen.queryByPlaceholderText("e.g. Emergency Fund")).toBeNull();
  });

  it.each([
    [400_000, 450_000],
    [2_000_000, 2_050_000],
  ])("adds ₱500 to %i centavos saved and sends %i, every other field unchanged", async (saved, expected) => {
    const g = goal({ savedAmount: saved, targetDate: "2026-12-31" });
    mockGetGoals.mockResolvedValue([g]);
    mockUpdateGoal.mockResolvedValue({ ...g, savedAmount: expected });
    renderGoals();
    fireEvent.change(await openAddSavings(), { target: { value: "500" } });
    fireEvent.click(screen.getByRole("button", { name: "Add" }));

    await waitFor(() => expect(mockUpdateGoal).toHaveBeenCalledTimes(1));
    expect(mockUpdateGoal).toHaveBeenCalledWith(1, {
      name: "Emergency Fund",
      targetAmount: 10000000,
      savedAmount: expected,
      targetDate: "2026-12-31",
      paused: false,
      currency: "PHP",
    });
  });

  it.each([
    ["500.005", /at most two decimal places/],
    ["0", /greater than 0/],
    ["-5", /greater than 0/],
  ])("refuses %s and sends nothing", async (typed, message) => {
    mockGetGoals.mockResolvedValue([goal()]);
    renderGoals();
    fireEvent.change(await openAddSavings(), { target: { value: typed } });
    fireEvent.click(screen.getByRole("button", { name: "Add" }));

    expect(await screen.findByText(message)).toBeTruthy();
    expect(mockUpdateGoal).not.toHaveBeenCalled();
  });

  // The base is the goal as the page holds it at submit, not as it was when the dialog opened.
  it("adds to the refetched saved amount when the list reloads while the dialog is open", async () => {
    mockGetGoals.mockResolvedValueOnce([goal({ savedAmount: 400_000 })]);
    mockGetGoals.mockResolvedValueOnce([goal({ savedAmount: 1_000_000 })]);
    mockUpdateGoal.mockResolvedValue(goal({ savedAmount: 1_050_000 }));
    renderGoals();
    const field = await openAddSavings();

    fireEvent.click(screen.getByTitle("Reload"));
    await waitFor(() => expect(mockGetGoals).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(card("Emergency Fund")).toHaveTextContent("₱10,000.00"));

    fireEvent.change(field, { target: { value: "500" } });
    fireEvent.click(screen.getByRole("button", { name: "Add" }));
    await waitFor(() => expect(mockUpdateGoal).toHaveBeenCalledTimes(1));
    expect(mockUpdateGoal.mock.calls[0][1].savedAmount).toBe(1_050_000);
  });

  it("sends once when Add is pressed twice while the first is in flight", async () => {
    mockGetGoals.mockResolvedValue([goal()]);
    mockUpdateGoal.mockReturnValue(new Promise(() => {}));
    renderGoals();
    fireEvent.change(await openAddSavings(), { target: { value: "500" } });
    const add = screen.getByRole("button", { name: "Add" });
    fireEvent.click(add);
    fireEvent.click(add);

    await waitFor(() => expect(add).toHaveAttribute("aria-disabled", "true"));
    expect(mockUpdateGoal).toHaveBeenCalledTimes(1);
  });

  it("keeps the dialog open with an error when the save fails", async () => {
    mockGetGoals.mockResolvedValue([goal()]);
    mockUpdateGoal.mockRejectedValue(new Error("boom"));
    renderGoals();
    fireEvent.change(await openAddSavings(), { target: { value: "500" } });
    fireEvent.click(screen.getByRole("button", { name: "Add" }));

    expect(await screen.findByText("Could not add savings. Try again.")).toBeTruthy();
    expect(screen.getByLabelText(/Amount to add/)).toBeTruthy();
  });
});

describe("Goals celebration", () => {
  beforeEach(() => vi.clearAllMocks());

  it("celebrates goal-<id> once the server answers COMPLETED, and files the goal under Achieved", async () => {
    mockGetGoals.mockResolvedValue([goal({ savedAmount: 9_950_000, progressPercent: 99.5 })]);
    // 99% and COMPLETED: the status, not the number, is what celebrates.
    mockUpdateGoal.mockResolvedValue(goal({ savedAmount: 10_000_000, progressPercent: 99, status: "COMPLETED" }));
    renderGoals();
    fireEvent.change(await openAddSavings(), { target: { value: "500" } });
    fireEvent.click(screen.getByRole("button", { name: "Add" }));

    await waitFor(() => expect(coin()).not.toBeNull());
    expect(seen("goal-1")).toBe(true);
    expect(screen.getByRole("img", { name: "Celebrating" })).toBeTruthy();
    expect(pisos()).toHaveLength(1);
    expect(within(screen.getByText("Achieved (1)").closest("details")!).getByText("Emergency Fund")).toBeTruthy();
  });

  it("does not celebrate a 100% goal the server has not marked COMPLETED", async () => {
    mockGetGoals.mockResolvedValue([goal({ savedAmount: 9_950_000, progressPercent: 99.5 })]);
    mockUpdateGoal.mockResolvedValue(goal({ savedAmount: 10_000_000, progressPercent: 100, status: "ON_TRACK" }));
    renderGoals();
    fireEvent.change(await openAddSavings(), { target: { value: "500" } });
    fireEvent.click(screen.getByRole("button", { name: "Add" }));

    await waitFor(() => expect(mockUpdateGoal).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.queryByLabelText(/Amount to add/)).toBeNull());
    expect(coin()).toBeNull();
    expect(seen("goal-1")).toBe(false);
  });

  it("celebrates a goal already COMPLETED on load, once", async () => {
    mockGetGoals.mockResolvedValue([goal({ status: "COMPLETED", progressPercent: 100 })]);
    renderGoals();
    await waitFor(() => expect(coin()).not.toBeNull());
    expect(seen("goal-1")).toBe(true);
  });

  it("does not replay a goal whose celebration has been seen", async () => {
    localStorage.setItem(celebrationKey(ACCOUNT, "goal-1"), "1");
    mockGetGoals.mockResolvedValue([goal({ status: "COMPLETED", progressPercent: 100 })]);
    renderGoals();
    await screen.findByText("Achieved (1)");
    expect(coin()).toBeNull();
    expect(pisos()).toHaveLength(1);
  });
});

describe("Goals header and loading", () => {
  beforeEach(() => vi.clearAllMocks());

  it("names the header Piso for its mood once the goals have loaded, art hidden inside", async () => {
    mockGetGoals.mockResolvedValue([goal()]);
    renderGoals();
    const face = await screen.findByRole("img", { name: "Resting" });
    expect(face.querySelector("[data-piso-state]")?.closest('[aria-hidden="true"]')).not.toBeNull();
    expect(pisos()).toHaveLength(1);
  });

  it("says how many goals are in progress, paused ones included", async () => {
    mockGetGoals.mockResolvedValue([
      goal({ id: 1 }),
      goal({ id: 2, name: "B", status: "PAUSED", paused: true }),
      goal({ id: 3, name: "C", status: "COMPLETED" }),
    ]);
    renderGoals();
    expect(await screen.findByText("2 goals in progress")).toBeTruthy();
  });

  it("says every goal is reached when none is left in progress", async () => {
    mockGetGoals.mockResolvedValue([goal({ status: "COMPLETED" })]);
    renderGoals();
    expect(await screen.findByText("Every goal reached")).toBeTruthy();
  });

  it("keeps the cards when a reload fails, and says so inline with a retry", async () => {
    mockGetGoals.mockResolvedValueOnce([goal()]);
    mockGetGoals.mockRejectedValueOnce(new Error("down"));
    renderGoals();
    await screen.findByText("Emergency Fund");

    fireEvent.click(screen.getByTitle("Reload"));
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Could not load your goals.");
    expect(within(alert).getByRole("button", { name: "Try again" })).toBeTruthy();
    expect(screen.getByText("Emergency Fund")).toBeTruthy();
  });

  it("offers Try again when the first load fails", async () => {
    mockGetGoals.mockRejectedValueOnce(new Error("down"));
    mockGetGoals.mockResolvedValueOnce([goal()]);
    renderGoals();

    fireEvent.click(await screen.findByRole("button", { name: "Try again" }));
    expect(await screen.findByText("Emergency Fund")).toBeTruthy();
  });

  it("shows Piso's empty state, and no header Piso, when there are no goals", async () => {
    mockGetGoals.mockResolvedValue([]);
    renderGoals();
    expect(await screen.findByText("No savings goals yet")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Add your first goal" })).toBeTruthy();
    expect([...pisos()].map((p) => p.getAttribute("data-piso-state"))).toEqual(["empty"]);
  });
});
