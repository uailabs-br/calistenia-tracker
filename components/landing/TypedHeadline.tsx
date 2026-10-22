"use client";

import { useEffect, useState } from "react";

/**
 * Título do herói com a palavra do meio trocando, como se estivesse sendo
 * digitada. Não é enfeite: é o que diz, sem precisar de uma frase extra, que o
 * app serve pra treino livre em geral — calistenia é o nicho de entrada, não o
 * limite.
 *
 * O texto completo vai num `sr-only` pra quem usa leitor de tela, e a parte
 * animada fica `aria-hidden`: ninguém deveria ouvir a frase se remontando.
 * O primeiro render (servidor e cliente) mostra a palavra inteira, então a
 * animação só começa depois do mount e a hidratação não vê diferença.
 */
const WORDS = ["a força", "a mobilidade", "o equilíbrio"] as const;

const TYPE_MS = 65;
const DELETE_MS = 30;
const HOLD_MS = 1900;
const GAP_MS = 300;

export function TypedHeadline() {
  const [index, setIndex] = useState(0);
  const [text, setText] = useState<string>(WORDS[0]);
  const [deleting, setDeleting] = useState(false);
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    setAnimate(true);
  }, []);

  useEffect(() => {
    if (!animate) return;
    const full = WORDS[index];
    const done = text === full;
    const empty = text === "";
    const delay = deleting ? (empty ? GAP_MS : DELETE_MS) : done ? HOLD_MS : TYPE_MS;

    const timer = setTimeout(() => {
      if (!deleting) {
        if (done) setDeleting(true);
        else setText(full.slice(0, text.length + 1));
      } else if (empty) {
        setDeleting(false);
        setIndex((i) => (i + 1) % WORDS.length);
      } else {
        setText(text.slice(0, -1));
      }
    }, delay);

    return () => clearTimeout(timer);
  }, [animate, text, deleting, index]);

  return (
    <h1 className="display mt-5 text-4xl leading-[1.05] sm:text-5xl">
      <span className="sr-only">
        Desbloqueie a força, a mobilidade e o equilíbrio do seu corpo
      </span>
      <span aria-hidden className="block">
        Desbloqueie
      </span>
      <span aria-hidden className="block min-h-[1.05em]">
        {text}
        <span
          className="anim-caret ml-1 inline-block w-[0.07em] self-stretch align-baseline"
          style={{ background: "var(--ac)", height: "0.78em" }}
        />
      </span>
      <span aria-hidden className="block">
        do seu corpo
      </span>
    </h1>
  );
}
