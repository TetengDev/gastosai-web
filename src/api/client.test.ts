import { describe, it, expect } from "vitest";
import { API_BASE_PATH, resolveBaseUrl } from "./client";

/**
 * The version path is the difference between decimal pesos and integer centavos, so it is worth
 * a test of its own: on `/api/v1` every amount in this app is a hundredfold too small, and the
 * types cannot catch it because both surfaces type money as `number`.
 */
describe("resolveBaseUrl", () => {
  it("speaks v2, the integer-centavos surface", () => {
    expect(API_BASE_PATH).toBe("/api/v2");
  });

  it("appends the version path to the configured host", () => {
    expect(resolveBaseUrl("http://localhost:8080")).toBe("http://localhost:8080/api/v2");
  });

  it("tolerates a trailing slash rather than serving //api/v2", () => {
    expect(resolveBaseUrl("http://localhost:8080/")).toBe("http://localhost:8080/api/v2");
    expect(resolveBaseUrl("http://localhost:8080///")).toBe("http://localhost:8080/api/v2");
  });

  it("falls back to a relative path when the host is unset", () => {
    expect(resolveBaseUrl(undefined)).toBe("/api/v2");
    expect(resolveBaseUrl("")).toBe("/api/v2");
  });
});
