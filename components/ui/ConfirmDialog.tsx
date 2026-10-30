"use client";

import { useId } from "react";
import { Dialog } from "./Modal";

/** Diálogo modal de confirmação para ações destrutivas (sair, resetar). */
export function ConfirmDialog({
  title,
  message,
  confirmLabel,
  cancelLabel = "Cancelar",
  danger = false,
  secondaryLabel,
  onSecondary,
  onConfirm,
  onCancel,
}: {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  danger?: boolean;
  /** Atalho opcional acima dos botões (ex.: fazer backup antes de apagar tudo). */
  secondaryLabel?: string;
  onSecondary?: () => void;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const titleId = useId();
  const descId = useId();

  return (
    <Dialog role="alertdialog" labelledBy={titleId} describedBy={descId} onClose={onCancel}>
      <h2 id={titleId} className="text-lg font-semibold">
        {title}
      </h2>
      <p id={descId} className="mt-2 text-sm leading-snug text-muted">
        {message}
      </p>
      {secondaryLabel && onSecondary && (
        <button
          type="button"
          onClick={onSecondary}
          className="btn-neutral tap mt-4 w-full rounded-xl py-3 font-medium"
        >
          {secondaryLabel}
        </button>
      )}
      <div className={`dialog-actions ${secondaryLabel ? "mt-2" : "mt-5"} flex gap-2`}>
        <button
          type="button"
          onClick={onCancel}
          className="btn-neutral tap flex-1 rounded-xl py-3 font-medium text-muted"
        >
          {cancelLabel}
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className={`${danger ? "btn-danger" : "btn-inverse"} tap flex-1 rounded-xl py-3 font-medium`}
        >
          {confirmLabel}
        </button>
      </div>
    </Dialog>
  );
}
