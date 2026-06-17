import type { ReactNode } from "react";
import { Trash2 } from "lucide-react";

interface Props {
  title: string;
  /** Plain subtitle text, or custom node (e.g. with inline links). */
  subtitle?: ReactNode;
  /** Right-aligned actions (buttons). */
  actions?: ReactNode;
  /** When provided, renders a red "Delete all" link inline with the subtitle. */
  onDeleteAll?: () => void;
}

export default function PageHeader({
  title,
  subtitle,
  actions,
  onDeleteAll,
}: Props) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-5">
      <div>
        <h1 className="m-0 font-display text-4xl font-medium tracking-tight text-ink-hi md:text-[44px]">
          {title}
        </h1>
        {(subtitle || onDeleteAll) && (
          <div className="mt-2 flex items-center gap-3 text-[15px] text-ink-2">
            {subtitle}
            {onDeleteAll && (
              <button
                onClick={onDeleteAll}
                className="inline-flex cursor-pointer items-center gap-1 text-[#b30000] transition-opacity hover:opacity-80"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete all
              </button>
            )}
          </div>
        )}
      </div>
      {actions && <div className="flex items-center gap-3.5">{actions}</div>}
    </div>
  );
}
