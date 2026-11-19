import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Wordmark from "./Wordmark";

/** The roll doubles every letter, so the risk is a screen reader hearing "GGaass…" or eight letters. */
describe("Wordmark", () => {
  it("is named GastosAI exactly once, with every rolled letter hidden", () => {
    render(
      <a href="/">
        <Wordmark />
      </a>
    );
    expect(screen.getByRole("link", { name: "GastosAI" })).toBeInTheDocument();
  });

  it("stacks each letter twice, inside an aria-hidden box", () => {
    const { container } = render(<Wordmark />);
    const visual = container.querySelector("[aria-hidden='true']")!;
    const letters = [...visual.querySelectorAll(".ga-roll-letter")];

    expect(letters.map((l) => l.textContent)).toEqual(["GG", "aa", "ss", "tt", "oo", "ss", "AA", "II"]);
  });

  it("keeps AI in the brand green, and only AI", () => {
    const { container } = render(<Wordmark />);
    const branded = [...container.querySelectorAll(".ga-roll-letter.text-brand")].map((l) => l.textContent);

    expect(branded).toEqual(["AA", "II"]);
  });
});
