"use client";

import { useId } from "react";
import { useModalA11y } from "@/lib/utils/useModalA11y";
import { Portal } from "./Portal";

/** Diálogo modal de confirmação para ações destrutivas (sair, resetar). */
export function ConfirmDialog({
  title,
  message,
  confirmLabel,
  cancelLabel = "Cancelar",
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
  const ref = useModalA11y<HTMLDivElement>(onCancel);
  const titleId = useId();
  const descId = useId();

  return (
    <Portal>
    <div
      className="anim-fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
      onClick={onCancel}
    >
      <div
        ref={ref}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        tabIndex={-1}
        className="anim-scale-in w-full max-w-sm rounded-2xl border border-border bg-surface p-5 outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id={titleId} className="text-lg font-semibold">
          {title}
        </h2>
        <p id={descId} className="mt-2 text-sm leading-snug text-muted">
          {message}
        </p>
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
                ? { background: "var(--color-danger)", color: "var(--color-on-accent)" }
                : { background: "var(--color-text)", color: "var(--color-bg)" }
            }
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
    </Portal>
  );
}
