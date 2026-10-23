"use client";

import { useEffect, useRef } from "react";

/**
 * Número que rola como odômetro ao mudar: sobe quando aumenta, desce quando
 * diminui. A `key` remonta o span a cada valor, o que reinicia a animação; o
 * pai precisa de `overflow-hidden` pra o número entrando não vazar.
 */
export function RollingNumber({ value, suffix = "" }: { value: number; suffix?: string }) {
  const prev = useRef(value);
  const dir = value > prev.current ? "up" : value < prev.current ? "down" : null;
  useEffect(() => {
    prev.current = value;
  }, [value]);

  return (
    <span key={value} className={`inline-block ${dir ? `anim-roll-${dir}` : ""}`}>
      {value}
      {suffix}
    </span>
  );
}
