"use client";

import { useRef, useState } from "react";
import { useModalA11y } from "@/lib/utils/useModalA11y";
import { Portal } from "./Portal";

/**
 * Casca de todo overlay modal: portal, fundo escuro que fecha no toque e painel
 * com trava de foco, Esc e scroll lock (useModalA11y). Dialog e Sheet são os
 * dois formatos prontos; use a casca direto só quando nenhum dos dois serve.
 */
export function ModalShell({
  labelledBy,
  describedBy,
  role = "dialog",
  onClose,
  overlayClassName,
  panelClassName,
  panelStyle,
  children,
}: {
  labelledBy: string;
  describedBy?: string;
  role?: "dialog" | "alertdialog";
  onClose: () => void;
  overlayClassName: string;
  panelClassName: string;
  panelStyle?: React.CSSProperties;
  children: React.ReactNode;
}) {
  const ref = useModalA11y<HTMLDivElement>(onClose);
  return (
    <Portal>
      <div className={`anim-fade-in fixed inset-0 bg-black/60 ${overlayClassName}`} onClick={onClose}>
        <div
          ref={ref}
          role={role}
          aria-modal="true"
          aria-labelledby={labelledBy}
          aria-describedby={describedBy}
          tabIndex={-1}
          className={`outline-none ${panelClassName}`}
          style={panelStyle}
          onClick={(e) => e.stopPropagation()}
        >
          {children}
        </div>
      </div>
    </Portal>
  );
}

/** Diálogo centralizado: confirmação e formulário curto. */
export function Dialog({
  className = "",
  ...props
}: Omit<React.ComponentProps<typeof ModalShell>, "overlayClassName" | "panelClassName" | "panelStyle"> & {
  className?: string;
}) {
  return (
    <ModalShell
      {...props}
      overlayClassName="z-50 flex items-center justify-center px-4"
      panelClassName={`anim-scale-in w-full max-w-sm rounded-2xl border border-border bg-surface p-5 ${className}`}
    />
  );
}

/** Arrasto (px) a partir do qual soltar a alça fecha a sheet. */
const DISMISS_DRAG = 110;

/**
 * Sheet que sobe do rodapé, com alça. `draggable`: arrastar a alça pra baixo
 * fecha — só onde o conteúdo não rola, senão o gesto briga com o scroll.
 * O padding vai em `className`: a alça desconta 8px do topo pra área de toque
 * dela não empurrar o conteúdo. `style` chega no painel: é por ele que entra a
 * cor do treino (accentVars), já que o portal não herda o `--ac` da tela.
 */
export function Sheet({
  labelledBy,
  onClose,
  draggable = false,
  className,
  style,
  children,
}: {
  labelledBy: string;
  onClose: () => void;
  draggable?: boolean;
  className: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}) {
  const [dragY, setDragY] = useState(0);
  const startY = useRef<number | null>(null);

  const drag = draggable
    ? {
        onTouchStart: (e: React.TouchEvent) => {
          startY.current = e.touches[0].clientY;
        },
        onTouchMove: (e: React.TouchEvent) => {
          if (startY.current === null) return;
          const dy = e.touches[0].clientY - startY.current;
          if (dy > 0) setDragY(dy);
        },
        onTouchEnd: () => {
          if (dragY > DISMISS_DRAG) onClose();
          setDragY(0);
          startY.current = null;
        },
      }
    : {};

  return (
    <ModalShell
      labelledBy={labelledBy}
      onClose={onClose}
      overlayClassName="z-40 flex items-end justify-center"
      panelClassName={`anim-slide-up w-full max-w-md rounded-t-2xl border-t border-border bg-surface ${className}`}
      panelStyle={dragY ? { ...style, transform: `translateY(${dragY}px)`, transition: "none" } : style}
    >
      <div
        className={`-mt-2 flex justify-center py-2 ${draggable ? "cursor-grab active:cursor-grabbing" : ""}`}
        aria-hidden={draggable ? undefined : true}
        {...drag}
      >
        <div className="h-1 w-10 rounded-full bg-border" />
      </div>
      {children}
    </ModalShell>
  );
}
