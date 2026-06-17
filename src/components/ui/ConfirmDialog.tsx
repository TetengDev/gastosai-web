import type { ReactNode } from "react";
import Modal from "./Modal";
import Button from "./Button";

interface Props {
  open: boolean;
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Disables buttons + shows the busy label while an async action runs. */
  loading?: boolean;
  /** Optional error text shown above the actions. */
  error?: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
  loading = false,
  error,
  onConfirm,
  onCancel,
}: Props) {
  return (
    <Modal open={open} onClose={onCancel} maxWidthClass="max-w-sm">
      <h3 className="mb-2 font-display text-xl font-medium text-ink-hi">{title}</h3>
      <div className="mb-4 text-sm leading-relaxed text-ink-2">{message}</div>
      {error && (
        <p className="mb-4 rounded-xl bg-[#b30000]/10 px-4 py-2.5 text-sm text-[#b30000]">
          {error}
        </p>
      )}
      <div className="flex gap-3">
        <Button variant="secondary" className="flex-1" onClick={onCancel} disabled={loading}>
          {cancelLabel}
        </Button>
        <Button variant="danger" className="flex-1" onClick={onConfirm} disabled={loading}>
          {loading ? "Working…" : confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
