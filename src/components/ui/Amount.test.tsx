import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Amount from "./Amount";

describe("Amount", () => {
  it("formats pesos from centavos", () => {
    render(<Amount centavos={175050} />);
    expect(screen.getByText("₱1,750.50")).toBeInTheDocument();
  });

  it("keeps the minus sign, so colour is not the only signal", () => {
    render(<Amount centavos={-25000} tone="danger" />);
    expect(screen.getByText("-₱250.00")).toBeInTheDocument();
  });

  it("formats a foreign currency in its own symbol", () => {
    render(<Amount centavos={15075} currency="USD" />);
    expect(screen.getByText("$150.75")).toBeInTheDocument();
  });

  it("uses tabular figures at every size", () => {
    for (const size of ["hero", "row", "inline"] as const) {
      const { container, unmount } = render(<Amount centavos={100} size={size} />);
      expect(container.firstElementChild).toHaveClass("tabular-nums");
      unmount();
    }
  });
});
