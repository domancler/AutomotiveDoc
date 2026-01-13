import type { Role } from "@/auth/roles";

export type StoredUser = {
  id: string;
  username: string;
  name?: string;
  role: Role;
};

const LS_KEY = "automotivedoc_user";

function roleFromUsername(username: string): Role {
  const u = username.toLowerCase().trim();
  if (u === "admin") return "ADMIN";
  if (u === "amministrativo") return "AMMINISTRATIVO";
  if (u === "responsabile") return "RESPONSABILE";
  if (u === "commerciale" || u === "dom") return "COMMERCIALE";
  if (u === "backoffice" || u === "bo") return "BO";
  if (u === "bof" || u === "finanziario") return "BOF";
  if (u === "bou" || u === "usato") return "BOU";
  if (u === "consegnatore") return "CONSEGNATORE";
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
  if (typeof password !== "string" || password !== "password") {
    throw new Error("Password non valida (usa: password)");
  }

  const clean = username.trim();

  const user: StoredUser = {
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
