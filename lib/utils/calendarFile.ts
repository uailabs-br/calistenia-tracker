/**
 * Entrega o .ics pro sistema. No iPhone o Safari abre "Adicionar à agenda"; no
 * Android o arquivo baixa e abre no app de calendário.
 */
export function downloadIcs(ics: string, filename: string): void {
  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  // revogar na hora cancela o download em alguns navegadores
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
