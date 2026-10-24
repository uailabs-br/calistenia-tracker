"use client";

import { useState } from "react";
import { DuotoneImage } from "@/components/ui/DuotoneImage";

const LABELS = ["início", "topo"];

/**
 * Poses do movimento (início → topo; uma só em isometria). Só monta com o
 * "como executar" aberto, então nada é baixado antes disso. Offline na primeira
 * vez: a imagem falha e some, sem quebrar o resto do cartão.
 */
/** A figura é tingida com o `--ac` do container (a cor do treino). */
export function ExerciseMedia({ urls, name }: { urls: string[]; name: string }) {
  const [failed, setFailed] = useState<Set<string>>(new Set());
  const shown = urls.filter((u) => !failed.has(u));

  if (shown.length === 0) {
    return (
      <p className="mt-2 text-xs text-muted">
        Demonstração indisponível agora — abre uma vez com internet que ela fica salva.
      </p>
    );
  }

  return (
    <figure className="mt-2">
      <div className="flex gap-2">
        {shown.map((url, i) => (
          <div key={url} className="min-w-0 flex-1">
            <DuotoneImage
              src={url}
              alt={`${name} — ${urls.length > 1 ? LABELS[urls.indexOf(url)] : "posição"}`}
              onError={() => setFailed((prev) => new Set(prev).add(url))}
            />
            {urls.length > 1 && (
              <p className="mt-1 text-center font-mono text-2xs text-muted">
                {LABELS[urls.indexOf(url)] ?? ""}
                {i < shown.length - 1 ? " →" : ""}
              </p>
            )}
          </div>
        ))}
      </div>
    </figure>
  );
}
