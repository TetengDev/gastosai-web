import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import ConfirmDialog from "./ConfirmDialog";

describe("ConfirmDialog", () => {
  it("is a dialog named by its title", () => {
    render(
      <ConfirmDialog open title="Delete goal?" message="It will be removed." onConfirm={() => {}} onCancel={() => {}} />,
    );
    expect(screen.getByRole("dialog", { name: "Delete goal?" })).toBeTruthy();
  });
});
