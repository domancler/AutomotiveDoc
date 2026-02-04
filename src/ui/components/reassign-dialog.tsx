import * as React from "react";

import type { Role } from "@/auth/roles";
import { DEMO_USERS } from "@/auth/auth";
import type { Fascicolo } from "@/mock/fascicoli";
import { States, type StateCode } from "@/workflow/states";

import { Button } from "@/ui/components/button";
import { cn } from "@/lib/utils";

export type ReassignPayload = {
  targetRole: Role;
  fromUserId: string;
  newUserId: string;
  note: string;
};

export type Candidate = {
  targetRole: Role;
  label: string;
  currentUserId: string;
  currentUserName: string;
  state?: StateCode;
};

function roleLabel(role: Role) {
  switch (role) {
    case "COMMERCIALE":
      return "Venditore";
    case "BO":
      return "BackOffice Anagrafico";
    case "BOF":
      return "BackOffice Finanziario";
    case "BOU":
      return "BackOffice Permuta";
    case "CONSEGNATORE":
      return "Operatore Consegna";
    case "VRC":
      return "Controllo Consegna";
    default:
      return role;
  }
}

function nameById(userId?: string | null) {
  if (!userId) return "—";
  const u = DEMO_USERS.find((x) => x.id === userId);
  return u?.name || u?.username || userId;
}

export function getReassignCandidates(f: Fascicolo): { mode: "direct" | "choose"; candidates: Candidate[] } {
  const anyF: any = f;
  const wf = anyF.workflow as { overall?: StateCode; bo?: StateCode; bof?: StateCode; bou?: StateCode } | undefined;
  const overall = (wf?.overall ?? anyF.workflowState) as StateCode | undefined;

  // Stati "macro" con owner unico
  if (overall === States.NUOVO) {
    const ownerId = anyF.ownerId as string | undefined;
    if (ownerId) {
      return {
        mode: "direct",
        candidates: [
          {
            targetRole: "COMMERCIALE",
            label: `${roleLabel("COMMERCIALE")} — ${nameById(ownerId)}`,
            currentUserId: ownerId,
            currentUserName: nameById(ownerId),
            state: overall,
          },
        ],
      };
    }
  }

  if (overall === States.IN_FINALIZZAZIONE) {
    const cur = anyF.inChargeDelivery as string | null | undefined;
    if (cur) {
      return {
        mode: "direct",
        candidates: [
          {
            targetRole: "CONSEGNATORE",
            label: `${roleLabel("CONSEGNATORE")} — ${nameById(cur)}`,
            currentUserId: cur,
            currentUserName: nameById(cur),
            state: overall,
          },
        ],
      };
    }
  }

  if (overall === States.CONSEGNA_IN_VERIFICA) {
    const cur = anyF.inChargeVRC as string | null | undefined;
    if (cur) {
      return {
        mode: "direct",
        candidates: [
          {
            targetRole: "VRC",
            label: `${roleLabel("VRC")} — ${nameById(cur)}`,
            currentUserId: cur,
            currentUserName: nameById(cur),
            state: overall,
          },
        ],
      };
    }
  }

  if (overall === States.CONSEGNA_DA_CONTROLLARE) {
    // In "da controllare" la palla è sull'Operatore Consegna: è lui che deve integrare.
    const cur = anyF.inChargeDelivery as string | null | undefined;
    if (cur) {
      return {
        mode: "direct",
        candidates: [
          {
            targetRole: "CONSEGNATORE",
            label: `${roleLabel("CONSEGNATORE")} — ${nameById(cur)}`,
            currentUserId: cur,
            currentUserName: nameById(cur),
            state: overall,
          },
        ],
      };
    }
  }

  // Micro-stati (validazione BO): scegli quale incarico cambiare
  if (overall === States.DA_VALIDARE_BO) {
    const boState = wf?.bo;
    const bofState = wf?.bof;
    const bouState = wf?.bou;

    const pickUserForBranch = (role: Role, branchState?: StateCode) => {
      if (!branchState) return null;
      // Escludiamo "in attesa di presa in carico": non c'è un incaricato e da specifica è vietato.
      if (
        branchState === States.DA_VALIDARE_BO ||
        branchState === States.DA_VALIDARE_BOF ||
        branchState === States.DA_VALIDARE_BOU
      )
        return null;

      // In "Da controllare" l'incarico può essere già stato liberato: usiamo lastInCharge*
      if (branchState === States.DA_RIVEDERE_BO) return anyF.lastInChargeBO ?? anyF.inChargeBO ?? null;
      if (branchState === States.DA_RIVEDERE_BOF) return anyF.lastInChargeBOF ?? anyF.inChargeBOF ?? null;
      if (branchState === States.DA_RIVEDERE_BOU) return anyF.lastInChargeBOU ?? anyF.inChargeBOU ?? null;

      if (role === "BO") return anyF.inChargeBO ?? null;
      if (role === "BOF") return anyF.inChargeBOF ?? null;
      if (role === "BOU") return anyF.inChargeBOU ?? null;
      return null;
    };

    const out: Candidate[] = [];

    // In validazione, il venditore può essere "responsabile" quando uno o più rami sono in "da controllare".
    // Da specifica, il Supervisore può riassegnare anche il venditore (stesso ruolo) senza cambiare stato.
    const ownerId = anyF.ownerId as string | undefined;
    if (ownerId) {
      out.push({
        targetRole: "COMMERCIALE",
        label: `${roleLabel("COMMERCIALE")} — ${nameById(ownerId)}`,
        currentUserId: ownerId,
        currentUserName: nameById(ownerId),
        state: overall,
      });
    }

    const boUser = pickUserForBranch("BO", boState);
    if (boUser) {
      out.push({
        targetRole: "BO",
        label: `${roleLabel("BO")} — ${nameById(boUser)}`,
        currentUserId: boUser,
        currentUserName: nameById(boUser),
        state: boState,
      });
    }

    const bofUser = pickUserForBranch("BOF", bofState);
    if (bofUser) {
      out.push({
        targetRole: "BOF",
        label: `${roleLabel("BOF")} — ${nameById(bofUser)}`,
        currentUserId: bofUser,
        currentUserName: nameById(bofUser),
        state: bofState,
      });
    }

    const bouUser = pickUserForBranch("BOU", bouState);
    if (bouUser) {
      out.push({
        targetRole: "BOU",
        label: `${roleLabel("BOU")} — ${nameById(bouUser)}`,
        currentUserId: bouUser,
        currentUserName: nameById(bouUser),
        state: bouState,
      });
    }

    return { mode: out.length === 1 ? "direct" : "choose", candidates: out };
  }

  return { mode: "choose", candidates: [] };
}

export function ReassignDialog({
  open,
  fascicolo,
  onConfirm,
  onOpenChange,
}: {
  open: boolean;
  fascicolo: Fascicolo;
  onConfirm: (payload: ReassignPayload) => void;
  onOpenChange: (open: boolean) => void;
}) {
  const { mode, candidates } = React.useMemo(() => getReassignCandidates(fascicolo), [fascicolo]);

  const [step, setStep] = React.useState<1 | 2>(1);
  const [chosenIdx, setChosenIdx] = React.useState(0);
  const [newUserId, setNewUserId] = React.useState<string>("");
  const [note, setNote] = React.useState("");

  React.useEffect(() => {
    if (!open) return;
    setStep(mode === "direct" ? 2 : 1);
    setChosenIdx(0);
    setNewUserId("");
    setNote("");
  }, [open, mode]);

  React.useEffect(() => {
    if (step !== 2) return;
    const c = candidates[chosenIdx];
    if (!c) return;
    const first = DEMO_USERS.find((u) => u.role === c.targetRole && u.id !== c.currentUserId);
    setNewUserId(first?.id ?? "");
  }, [step, chosenIdx, candidates]);

  React.useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onOpenChange(false);
    }
    if (open) {
      document.addEventListener("keydown", onKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [open, onOpenChange]);

  if (!open) return null;

  const current = candidates[chosenIdx];
  const replacements = current
    ? DEMO_USERS.filter((u) => u.role === current.targetRole && u.id !== current.currentUserId)
    : [];

  const canConfirm = !!current && !!newUserId && note.trim().length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <button className="absolute inset-0 bg-black/40" aria-label="Chiudi" onClick={() => onOpenChange(false)} />

      <div className="relative w-full max-w-lg rounded-2xl border bg-background p-5 shadow-xl">
        <div className="space-y-1">
          <div className="text-base font-semibold">Riassegna fascicolo</div>
          <div className="text-sm text-muted-foreground">
            Cambia l'utente assegnato senza modificare stato o flusso (runtime).
          </div>
        </div>

        {candidates.length === 0 ? (
          <div className="mt-4 rounded-xl border bg-muted/30 p-4 text-sm text-muted-foreground">
            In questo stato non ci sono incarichi riassegnabili.
          </div>
        ) : null}

        {candidates.length > 0 ? (
          <div className="mt-4 space-y-4">
            {step === 1 ? (
              <div className="space-y-2">
                <div className="text-sm font-medium">Chi vuoi sostituire?</div>
                <select
                  className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                  value={String(chosenIdx)}
                  onChange={(e) => setChosenIdx(Number(e.target.value))}
                >
                  {candidates.map((c, idx) => (
                    <option key={`${c.targetRole}-${idx}`} value={String(idx)}>
                      {c.label}
                    </option>
                  ))}
                </select>
                <div className="text-xs text-muted-foreground">
                  Seleziona l'incarico (ruolo) da riassegnare.
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="text-sm font-medium">Incarico da riassegnare</div>
                <div className="rounded-xl border bg-card p-3 text-sm">
                  <div className="font-medium">{roleLabel(current!.targetRole)}</div>
                  <div className="text-muted-foreground">Attuale: {current!.currentUserName}</div>
                </div>
              </div>
            )}

            {step === 2 ? (
              <div className="space-y-2">
                <div className="text-sm font-medium">Sostituto</div>
                <select
                  className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                  value={newUserId}
                  onChange={(e) => setNewUserId(e.target.value)}
                >
                  {replacements.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name ? `${u.name} — ${u.username}` : u.username}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}

            {step === 2 ? (
              <div className="space-y-2">
                <div className="text-sm font-medium">Nota (obbligatoria)</div>
                <textarea
                  className={cn(
                    "min-h-[96px] w-full resize-none rounded-xl border bg-background p-3 text-sm",
                    "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  )}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Scrivi il motivo della riassegnazione..."
                  autoFocus
                />
                {note.trim().length === 0 ? (
                  <div className="text-xs text-muted-foreground">Inserisci una nota per poter confermare.</div>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annulla
          </Button>

          {step === 1 ? (
            <Button onClick={() => setStep(2)} disabled={candidates.length === 0}>
              Avanti
            </Button>
          ) : (
            <Button
              disabled={!canConfirm}
              onClick={() => {
                if (!canConfirm) return;
                const c = current!;
                onConfirm({
                  targetRole: c.targetRole,
                  fromUserId: c.currentUserId,
                  newUserId,
                  note: note.trim(),
                });
              }}
            >
              Conferma riassegnazione
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
