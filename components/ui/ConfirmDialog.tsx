"use client";

/** Diálogo modal de confirmação para ações destrutivas (sair, resetar). */
export function ConfirmDialog({
  title,
  message,
  confirmLabel,
  cancelLabel = "cancelar",
  danger = false,
  onConfirm,
  onCancel,
}: {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div
      className="anim-fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
      onClick={onCancel}
    >
      <div
        className="anim-scale-in w-full max-w-sm rounded-2xl border border-border bg-surface p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="mt-2 text-sm leading-snug text-muted">{message}</p>
        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="tap flex-1 rounded-xl border border-border bg-surface2 py-3 font-medium text-muted"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="tap flex-1 rounded-xl py-3 font-medium"
            style={
              danger
                ? { background: "#FF6B6B", color: "#0e0e0f" }
                : { background: "var(--color-text)", color: "var(--color-bg)" }
            }
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
