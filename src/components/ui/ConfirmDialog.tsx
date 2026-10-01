import { useEffect, useRef } from "react";

export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel,
  cancelLabel = "Keep it",
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  body?: string;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    confirmRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div className="dialog-backdrop" onClick={onCancel}>
      <div
        className="dialog"
        role="alertdialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
      >
        <p className="dialog-title">{title}</p>
        {body ? <p className="dialog-body">{body}</p> : null}
        <div className="row dialog-actions">
          <button type="button" className="btn secondary" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button type="button" ref={confirmRef} className="btn danger" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
