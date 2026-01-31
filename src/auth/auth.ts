import type { Role } from "@/auth/roles";

export type StoredUser = {
  id: string;
  username: string;
  name?: string;
  role: Role;
};

const LS_KEY = "automotivedoc_user";

export const DEMO_USERS: StoredUser[] = [
  { id: "admin", username: "admin", name: "Admin", role: "ADMIN" },
  { id: "sup", username: "supervisore", name: "Supervisore", role: "RESPONSABILE" },
  { id: "ven", username: "venditore", name: "Venditore", role: "COMMERCIALE" },
  { id: "bo", username: "bo", name: "BackOffice Anagrafico", role: "BO" },
  { id: "bof", username: "bof", name: "BackOffice Finanziario", role: "BOF" },
  { id: "bou", username: "bou", name: "BackOffice Permuta", role: "BOU" },
  { id: "del", username: "consegna", name: "Operatore consegna", role: "CONSEGNATORE" },
  { id: "vrc", username: "controllo", name: "Controllo consegna", role: "VRC" },
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
        role: roleFromUsername(clean),
      };

  setStoredUser(user);
  return user;
}

export function logout() {
  setStoredUser(null);
}
