import { createElement } from "react";
import { categoryIcon } from "../lib/categoryIcon";
import { getCategoryColor } from "../lib/formatters";
import { cn } from "./ui";

interface Props {
  name: string;
  /** Optional explicit icon key (from Category.icon). */
  icon?: string | null;
  className?: string;
}

/** Category label as a pill with its icon, tinted by the category color. */
export default function CategoryChip({ name, icon, className }: Props) {
  const color = getCategoryColor(name).chart;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-edge-2 bg-surface-4 px-2.5 py-1 text-[13px] text-ink",
        className
      )}
    >
      {createElement(categoryIcon(name, icon), { className: "h-3.5 w-3.5 shrink-0", style: { color } })}
      {name}
    </span>
  );
}
