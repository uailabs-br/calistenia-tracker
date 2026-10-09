"use client";

/** Interruptor (role=switch). Área de toque de 44px; o visual é a pílula de 44x24. */
export function Switch({
  checked,
  onToggle,
  label,
  disabled = false,
}: {
  checked: boolean;
  onToggle: () => void;
  /** Nome acessível — descreve o que liga/desliga. */
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={onToggle}
      className="tap -mr-1 inline-flex shrink-0 items-center justify-center disabled:opacity-40"
    >
      <span
        className="relative block transition-colors"
        style={{
          width: 44,
          height: 26,
          borderRadius: 9999,
          background: checked ? "var(--ac)" : "var(--color-surface2)",
          border: "1px solid var(--color-border)",
        }}
      >
        <span
          className="absolute top-[2px] block bg-white shadow transition-transform"
          style={{
            width: 20,
            height: 20,
            borderRadius: 9999,
            transform: checked ? "translateX(21px)" : "translateX(2px)",
          }}
        />
      </span>
    </button>
  );
}
