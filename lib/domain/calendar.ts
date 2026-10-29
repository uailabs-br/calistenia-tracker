import { shiftDays } from "@/lib/utils/date";

/**
 * Evento de agenda (.ics) pro próximo treino. É o lembrete que funciona sem
 * servidor: o app não consegue notificar com ele fechado, mas o calendário do
 * celular consegue, e o alarme vai dentro do evento.
 *
 * Horário "flutuante" (sem fuso): 7h é 7h no fuso de quem abre, que é o que a
 * pessoa escolheu.
 */
export function buildIcs(input: {
  uid: string;
  title: string;
  description: string;
  /** dateKey YYYY-MM-DD */
  date: string;
  /** HH:MM */
  time: string;
  minutes: number;
  /** carimbo do evento (ms); separado pra teste */
  now: number;
}): string {
  const { uid, title, description, date, time, minutes, now } = input;
  const start = `${date.replaceAll("-", "")}T${time.replace(":", "")}00`;
  const [h, m] = time.split(":").map(Number);
  const endTotal = h * 60 + m + minutes;
  const endDate = shiftDays(date, Math.floor(endTotal / (24 * 60)));
  const endMin = endTotal % (24 * 60);
  const end = `${endDate.replaceAll("-", "")}T${pad(Math.floor(endMin / 60))}${pad(endMin % 60)}00`;
  const stamp = new Date(now).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Gravks//Treino//PT-BR",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${uid}@gravks`,
    `DTSTAMP:${stamp}`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${escapeText(title)}`,
    `DESCRIPTION:${escapeText(description)}`,
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    `DESCRIPTION:${escapeText(title)}`,
    "TRIGGER:PT0M",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ].join("\r\n");
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** RFC 5545: barra, ponto e vírgula, vírgula e quebra de linha são escapados. */
function escapeText(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

/**
 * Dia sugerido pro próximo treino: com até 3 por semana, um dia de folga entre
 * eles (depois de amanhã); com mais, amanhã.
 */
export function suggestedGap(weekGoal: number): 1 | 2 {
  return weekGoal <= 3 ? 2 : 1;
}
