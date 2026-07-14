"use client";

import { useEffect, useState } from "react";

const WEEKDAYS = [
  "Domingo",
  "Segunda",
  "Terça",
  "Quarta",
  "Quinta",
  "Sexta",
  "Sábado",
];

function greetingFor(hour: number): string {
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}

/** Saudação por horário + dia/data. Só monta no cliente (evita mismatch). */
export function HomeGreeting() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => setNow(new Date()), []);

  if (!now) return <div className="h-14 pt-8" />;

  const date = now.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
  });

  return (
    <header className="pt-8 pb-2">
      <p className="font-mono text-xs uppercase tracking-wide text-muted">
        {WEEKDAYS[now.getDay()]} · {date}
      </p>
      <h1 className="mt-1 text-2xl font-semibold leading-tight">
        {greetingFor(now.getHours())}
      </h1>
    </header>
  );
}
