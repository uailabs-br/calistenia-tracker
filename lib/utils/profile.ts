/** Nome do usuário para a saudação da home. Local, fora do backup (trivial de redigitar). */

const KEY = "calistenia:profile-name";

export function getProfileName(): string {
  if (typeof window === "undefined") return "";
  return (localStorage.getItem(KEY) ?? "").trim();
}

export function setProfileName(name: string): void {
  const clean = name.trim();
  if (clean) localStorage.setItem(KEY, clean);
  else localStorage.removeItem(KEY);
}
