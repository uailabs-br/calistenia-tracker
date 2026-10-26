"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { getDurationFactor } from "@/lib/db/queries/duration";

/** Calibração da duração estimada (ver `getDurationFactor`); 1 enquanto carrega. */
export function useDurationFactor(): number {
  return useLiveQuery(() => getDurationFactor(), []) ?? 1;
}
