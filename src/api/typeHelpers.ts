/**
 * Shared type helpers for the generated contract types.
 *
 * springdoc expresses neither presence nor nullability: every response property
 * arrives optional and never nullable, which is wrong in both directions. These
 * two put it back — `Complete` for the fields the API always sends, `Nullable`
 * for the ones it sends as `null`. Each `src/api/` module says which of its own
 * fields are which; the mechanics live here so there is one copy to fix.
 */
export type Complete<T> = { [K in keyof T]-?: T[K] };

export type Nullable<T, K extends keyof T> = Omit<Complete<T>, K> & {
  [P in K]-?: Exclude<T[P], undefined> | null;
};

/**
 * The contract types several backend enums as bare strings, so a handful of
 * modules narrow them to a local union. That narrowing is silent: when the
 * contract later publishes the real enum with a member the local union does not
 * list, `Extract<string, ...> & Local` keeps compiling and the new member is
 * quietly dropped.
 *
 * `CoversContractUnion` is the guard. It resolves to `true` while the contract
 * field is still a bare string, and to `true` once the contract narrows to a
 * union the local union covers. Anything the local union misses resolves to
 * those missing members, which fails `AssertContractUnionCovered` and names them
 * in the compiler error.
 *
 * The failing case is exercised in `typeHelpers.test.ts`.
 */
type ContractStrings<ContractField> = Extract<ContractField, string>;

type UncoveredContractMembers<ContractField, Local extends string> =
  string extends ContractStrings<ContractField>
    ? never
    : Exclude<ContractStrings<ContractField>, Local>;

export type CoversContractUnion<ContractField, Local extends string> = [
  UncoveredContractMembers<ContractField, Local>,
] extends [never]
  ? true
  : UncoveredContractMembers<ContractField, Local>;

/**
 * Apply to a `CoversContractUnion` result: it compiles to `true` and fails to
 * satisfy its constraint — printing the missing members — when it is not.
 */
export type AssertContractUnionCovered<T extends true> = T;
