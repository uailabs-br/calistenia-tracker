/**
 * Ilustração do RepDB na paleta do app. O dataset só tem arquivo opaco, com
 * fundo azul claro, que briga com a UI escura. A correção é duotone em CSS puro:
 * inverter a luminância joga o fundo pro preto e a figura pro claro, e o
 * multiply pinta o que sobrou na cor do accent (`--ac`, herdado ou via `accent`).
 * Nenhuma imagem é modificada nem republicada.
 *
 * Sem "use client" de propósito: a landing é estática e usa este componente sem
 * passar handler; quem precisa de `onError` já é cliente.
 */
export function DuotoneImage({
  src,
  alt,
  accent,
  lazy = false,
  onError,
  className = "",
}: {
  src: string;
  alt: string;
  /** Cor da figura; sem ela usa o `--ac` do ancestral. */
  accent?: string;
  lazy?: boolean;
  onError?: () => void;
  className?: string;
}) {
  return (
    <div
      className={`relative isolate overflow-hidden rounded-card bg-black ${className}`}
      style={accent ? ({ "--ac": accent } as React.CSSProperties) : undefined}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        width={512}
        height={512}
        loading={lazy ? "lazy" : undefined}
        decoding="async"
        crossOrigin="anonymous"
        referrerPolicy="no-referrer"
        onError={onError}
        className="aspect-square w-full object-cover [filter:grayscale(1)_invert(1)_brightness(1.08)]"
      />
      <span aria-hidden className="absolute inset-0 bg-[var(--ac)] mix-blend-multiply" />
    </div>
  );
}
