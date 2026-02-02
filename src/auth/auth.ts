import type { Role } from "@/auth/roles";

export type StoredUser = {
  id: string;
  username: string;
  name?: string;
  email?: string;
  role: Role;
};

const LS_KEY = "automotivedoc_user";

export const DEMO_USERS: StoredUser[] = [
  // Nominativi realistici (inventati) per screenshot e manuale utente
  { id: "admin", username: "admin", name: "Paolo Riva", email: "p.riva@automotivedoc.it", role: "ADMIN" },
  { id: "sup", username: "supervisore", name: "Stefano Marchetti", email: "s.marchetti@automotivedoc.it", role: "RESPONSABILE" },
  { id: "ven", username: "venditore", name: "Luca Rinaldi", email: "l.rinaldi@automotivedoc.it", role: "COMMERCIALE" },
  { id: "bo", username: "bo", name: "Sara Conti", email: "s.conti@automotivedoc.it", role: "BO" },
  { id: "bof", username: "bof", name: "Andrea Moretti", email: "a.moretti@automotivedoc.it", role: "BOF" },
  { id: "bou", username: "bou", name: "Elena Gallo", email: "e.gallo@automotivedoc.it", role: "BOU" },
  { id: "del", username: "consegna", name: "Michele Russo", email: "m.russo@automotivedoc.it", role: "CONSEGNATORE" },
  { id: "vrc", username: "controllo", name: "Valentina De Luca", email: "v.deluca@automotivedoc.it", role: "VRC" },
];

function roleFromUsername(username: string): Role {
  const u = username.toLowerCase().trim();
  if (u === "admin") return "ADMIN";
  if (u === "amministrativo") return "AMMINISTRATIVO";
  if (u === "responsabile" || u === "supervisore") return "RESPONSABILE";
  if (u === "commerciale" || u === "venditore") return "COMMERCIALE";
  if (u === "backoffice" || u === "bo") return "BO";
  if (u === "bof" || u === "finanziario") return "BOF";
  if (u === "bou" || u === "usato") return "BOU";
  if (u === "consegnatore" || u === "consegna") return "CONSEGNATORE";
  if (u === "vrc" || u === "verificatore") return "VRC";
  return "COMMERCIALE";
}

export function getStoredUser(): StoredUser | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StoredUser;
  } catch {
    return null;
  }
}

export function setStoredUser(user: StoredUser | null) {
  if (!user) localStorage.removeItem(LS_KEY);
  else localStorage.setItem(LS_KEY, JSON.stringify(user));
}

export async function login(username: unknown, password: unknown): Promise<StoredUser> {
  // ✅ robusto runtime
  if (typeof username !== "string" || !username.trim()) {
    throw new Error("Inserisci username");
  }
  const clean = username.trim();

  // password fittizia e opzionale: se presente, non viene validata
  void password;

  // Demo users (uno per ruolo)
  const demo = DEMO_USERS.find((u) => u.username.toLowerCase() === clean.toLowerCase());
  const user: StoredUser = demo
    ? { ...demo, username: clean }
    : {
        id: clean.toLowerCase(),
        username: clean,
        name: clean,
        email: undefined,
        role: roleFromUsername(clean),
      };

  setStoredUser(user);
  return user;
}

export function logout() {
  setStoredUser(null);
}
