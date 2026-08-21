import { describe, expect, it } from "vitest";
import type {
  AssertContractUnionCovered,
  Complete,
  CoversContractUnion,
  Nullable,
} from "./typeHelpers";

/**
 * These are type-level helpers, so most of what is worth proving is proven by
 * the compiler: this file is inside `tsc -b`, and every assertion below fails
 * the typecheck rather than the test run when it stops holding. The runtime
 * `expect`s pin the same facts to values, so a green suite is evidence too.
 */

/** How the contract types a field today: bare string, optional, never null. */
type ContractStillBareString = { expenseType?: string };

/** How it would look once the contract publishes the real enum. */
type ContractNarrowed = { expenseType?: "PERSONAL" | "BUSINESS" };

/** And once that enum gains a member the local union below does not list. */
type ContractGrewAMember = { expenseType?: "PERSONAL" | "BUSINESS" | "TRUST" };

type LocalUnion = "PERSONAL" | "BUSINESS";

/**
 * The three cases the guard has to get right. The first two compile, which is
 * the assertion — `AssertContractUnionCovered` accepts nothing but `true`.
 */
export type BareStringIsAccepted = AssertContractUnionCovered<
  CoversContractUnion<ContractStillBareString["expenseType"], LocalUnion>
>;
export type CoveredUnionIsAccepted = AssertContractUnionCovered<
  CoversContractUnion<ContractNarrowed["expenseType"], LocalUnion>
>;

/**
 * The deliberately failing case, and the whole point of the guard: `TRUST` is
 * in the contract and not in `LocalUnion`, so `CoversContractUnion` resolves to
 * `"TRUST"` instead of `true` and the assertion below does not type-check. The
 * `@ts-expect-error` is what proves it — delete the `| "TRUST"` above and this
 * file stops compiling, because the suppressed error stops happening.
 */
type UncoveredResult = CoversContractUnion<ContractGrewAMember["expenseType"], LocalUnion>;
// @ts-expect-error `UncoveredResult` is `"TRUST"`, not `true`: the contract has
// a member the local union does not list, which is exactly the failure this
// guard exists to cause.
export type MissingMemberIsRejected = AssertContractUnionCovered<UncoveredResult>;

describe("CoversContractUnion", () => {
  it("resolves to true while the contract field is a bare string", () => {
    const covered: CoversContractUnion<ContractStillBareString["expenseType"], LocalUnion> = true;
    expect(covered).toBe(true);
  });

  it("resolves to true when the local union covers the contract union", () => {
    const covered: CoversContractUnion<ContractNarrowed["expenseType"], LocalUnion> = true;
    expect(covered).toBe(true);
  });

  it("resolves to the missing members, not true, when the contract grows one", () => {
    const missing: CoversContractUnion<ContractGrewAMember["expenseType"], LocalUnion> = "TRUST";
    expect(missing).toBe("TRUST");
  });
});

describe("Complete", () => {
  it("makes every optional contract property required", () => {
    // Omitting `icon` would not compile: `Complete` stripped the `?`.
    const complete: Complete<{ id?: string; icon?: string }> = { id: "e1", icon: "🍜" };
    expect(complete).toEqual({ id: "e1", icon: "🍜" });
  });
});

describe("Nullable", () => {
  it("makes the named properties required and null-accepting", () => {
    const withNull: Nullable<{ id?: string; icon?: string }, "icon"> = { id: "c1", icon: null };
    const withValue: Nullable<{ id?: string; icon?: string }, "icon"> = { id: "c1", icon: "🍜" };
    expect(withNull.icon).toBeNull();
    expect(withValue.icon).toBe("🍜");
  });
});
