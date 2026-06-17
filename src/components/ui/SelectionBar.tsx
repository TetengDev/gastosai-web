import { Trash2 } from "lucide-react";
import Button from "./Button";

interface Props {
  count: number;
  onDelete: () => void;
  onClear: () => void;
  deleting?: boolean;
  /** Singular noun, e.g. "budget" → "1 budget selected". */
  noun?: string;
  /** Plural form; defaults to `noun + "s"` (override for irregulars, e.g. "categories"). */
  nounPlural?: string;
}

/** Selection action bar shown above a list/grid when one or more rows are selected. */
export default function SelectionBar({ count, onDelete, onClear, deleting = false, noun = "item", nounPlural }: Props) {
  if (count === 0) return null;
  const label = count === 1 ? noun : (nounPlural ?? `${noun}s`);
  return (
    <div className="flex items-center justify-between rounded-xl border border-edge bg-[#b30000]/5 px-4 py-2.5">
      <span className="text-sm text-ink">
        {count} {label} selected
      </span>
      <div className="flex items-center gap-3">
        <button onClick={onClear} className="text-sm text-ink-3 transition-colors hover:text-ink">
          Clear
        </button>
        <Button variant="danger" size="sm" onClick={onDelete} disabled={deleting}>
          <Trash2 className="h-3.5 w-3.5" />
          {deleting ? "Deleting…" : `Delete selected (${count})`}
        </Button>
      </div>
    </div>
  );
}
