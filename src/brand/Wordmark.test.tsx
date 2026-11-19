/// <reference types="node" />
import { readFileSync } from "node:fs";
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

  it("moves the letters only inside a no-preference reduced-motion query", () => {
    const css = readFileSync("src/index.css", "utf-8");
    const query = "@media (prefers-reduced-motion: no-preference)";
    const rolls = /\.ga-roll-letter > span\s*\{[^}]*(^|[\s;{])transform\s*:/m;
    // Cut every no-preference block out by brace depth; what remains must never move a letter.
    let outside = css;
    let inside = "";
    for (let at = outside.indexOf(query); at !== -1; at = outside.indexOf(query)) {
      let i = outside.indexOf("{", at) + 1;
      for (let depth = 1; depth > 0; i++) depth += outside[i] === "{" ? 1 : outside[i] === "}" ? -1 : 0;
      inside += outside.slice(at, i);
      outside = outside.slice(0, at) + outside.slice(i);
    }

    expect(inside).toMatch(rolls);
    expect(outside).not.toMatch(rolls);
  });
});
