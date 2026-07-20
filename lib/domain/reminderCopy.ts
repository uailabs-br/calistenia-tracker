/** Frases de lembrete de treino (tom leve). */
const REMINDERS = [
  "Bora treinar? O placar da semana só anda se você aparecer.",
  "Dia de treino. 30 minutos e a skill fica mais perto.",
  "A barra tá te esperando. Constância vale mais que treino perfeito.",
  "Hoje tem treino. Seu eu de daqui a um mês agradece.",
  "Menos rolagem, mais montada. Bora pro treino de hoje.",
];

/**
 * Escolhe uma frase de forma determinística pela data — a mesma data mostra
 * sempre a mesma frase (sem repetir a cada render), variando entre dias.
 */
export function reminderCopy(dateKey: string, pool: string[] = REMINDERS): string {
  let h = 0;
  for (const c of dateKey) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return pool[h % pool.length];
}
