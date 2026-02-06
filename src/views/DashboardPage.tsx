import { useMemo, type ReactNode } from "react";
import { useFascicoli } from "@/mock/useFascicoliStore";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/ui/components/card";
import { Badge } from "@/ui/components/badge";
import { States, type StateCode } from "@/workflow/states";
import type { Fascicolo } from "@/mock/fascicoli";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { STATUS_COLORS, tint } from "@/ui/fascicoli/statusColors";

type ChartDatum = { name: string; value: number };

const CHART_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "hsl(var(--chart-6))",
];

const GRID_STROKE = "hsl(var(--border))";
const AXIS_STROKE = "hsl(var(--border))";
const TICK_FILL = "hsl(var(--muted-foreground))";
const TOOLTIP_STYLE = {
  backgroundColor: "hsl(var(--popover))",
  border: `1px solid hsl(var(--border))`,
  borderRadius: 12,
  color: "hsl(var(--foreground))",
} as const;
const TOOLTIP_LABEL_STYLE = { color: "hsl(var(--foreground))", fontWeight: 600 } as const;
const TOOLTIP_ITEM_STYLE = { color: "hsl(var(--foreground))" } as const;
const LEGEND_STYLE = { color: "hsl(var(--muted-foreground))", fontSize: 12 } as const;

function isBackOfficeState(code?: StateCode): boolean {
  if (!code) return false;
  return (
    code === States.DA_VALIDARE_BO ||
    code === States.VERIFICHE_BO ||
    code === States.DA_RIVEDERE_BO ||
    code === States.VALIDATO_BO ||
    code === States.DA_VALIDARE_BOF ||
    code === States.VERIFICHE_BOF ||
    code === States.DA_RIVEDERE_BOF ||
    code === States.VALIDATO_BOF ||
    code === States.DA_VALIDARE_BOU ||
    code === States.VERIFICHE_BOU ||
    code === States.DA_RIVEDERE_BOU ||
    code === States.VALIDATO_BOU
  );
}

function isDeliveryAreaState(code?: StateCode): boolean {
  if (!code) return false;
  return (
    code === States.IN_FINALIZZAZIONE ||
    code === States.CONSEGNA_IN_ATTESA_PRESA_IN_CARICO ||
    code === States.CONSEGNA_IN_VERIFICA ||
    code === States.CONSEGNA_DA_CONTROLLARE
  );
}

function isVrcConsegnaState(code?: StateCode): boolean {
  if (!code) return false;
  return (
    code === States.CONSEGNA_IN_ATTESA_PRESA_IN_CARICO ||
    code === States.CONSEGNA_IN_VERIFICA ||
    code === States.CONSEGNA_DA_CONTROLLARE
  );
}

/** Macro stati per dashboard (overview) */
function macroLabel(code?: StateCode): string {
  if (!code) return "—";
  if (code === States.BOZZA) return "Bozza";
  if (code === States.NUOVO) return "Nuovo";
  // Nel grafico "Distribuzione per macro-stato" vogliamo una vista davvero sintetica:
  // tutti i micro-stati di validazione (BO/BOF/BOU) confluiscono in "In validazione".
  if (
    code === States.DA_VALIDARE_BO ||
    code === States.DA_VALIDARE_BOF ||
    code === States.DA_VALIDARE_BOU ||
    code === States.VERIFICHE_BO ||
    code === States.VERIFICHE_BOF ||
    code === States.VERIFICHE_BOU ||
    code === States.DA_RIVEDERE_BO ||
    code === States.DA_RIVEDERE_BOF ||
    code === States.DA_RIVEDERE_BOU ||
    code === States.VALIDATO_BO ||
    code === States.VALIDATO_BOF ||
    code === States.VALIDATO_BOU
  )
    return "In validazione";
  if (code === States.APPROVATO) return "Approvato";
  // Stesso discorso per consegna: micro-stati confluiscono nel macro "Consegna".
  if (
    code === States.IN_FINALIZZAZIONE ||
    code === States.CONSEGNA_IN_ATTESA_PRESA_IN_CARICO ||
    code === States.CONSEGNA_IN_VERIFICA ||
    code === States.CONSEGNA_DA_CONTROLLARE
  )
    return "Consegna";
  if (code === States.COMPLETATO) return "Completato";
  if (code === States.ANNULLATO) return "Annullato";
  // meglio vedere il codice reale che un generico "Altro"
  return code;
}

function macroColor(label: string): string {
  switch (label) {
    case "Bozza":
      return STATUS_COLORS.BOZZA;
    case "Nuovo":
      return STATUS_COLORS.NUOVO;
    case "In validazione":
      return STATUS_COLORS.VALIDAZIONE;
    case "Approvato":
      return STATUS_COLORS.APPROVATO;
    case "Consegna":
      return STATUS_COLORS.CONSEGNA;
    case "Completato":
      return STATUS_COLORS.COMPLETATO;
    case "Annullato":
      return STATUS_COLORS.ANNULLATO;
    default:
      return STATUS_COLORS.BOZZA;
  }
}

function consegnaMicroColor(label: string): string {
  const base = STATUS_COLORS.CONSEGNA;
  if (label.startsWith("Finalizzazione")) return tint(base, 0.55);
  if (label === "In attesa di presa in carico") return tint(base, 0.40);
  if (label === "In verifica") return tint(base, 0.25);
  if (label === "Da controllare") return tint(base, 0.12);
  return tint(base, 0.65);
}

function increment(map: Map<string, number>, key: string, by = 1) {
  map.set(key, (map.get(key) ?? 0) + by);
}

function toChartData(map: Map<string, number>, order?: string[]): ChartDatum[] {
  const entries = Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  if (!order?.length) return entries.sort((a, b) => b.value - a.value);
  const index = new Map(order.map((k, i) => [k, i]));
  return entries.sort((a, b) => (index.get(a.name) ?? 999) - (index.get(b.name) ?? 999));
}

/** Micro-stati BO (per grafico dettagli BO) */
function boMicroLabel(code?: StateCode): string {
  switch (code) {
    case States.DA_VALIDARE_BO:
    case States.DA_VALIDARE_BOF:
    case States.DA_VALIDARE_BOU:
      return "In attesa di presa in carico";
    case States.VERIFICHE_BO:
    case States.VERIFICHE_BOF:
    case States.VERIFICHE_BOU:
      return "In verifica";
    case States.DA_RIVEDERE_BO:
    case States.DA_RIVEDERE_BOF:
    case States.DA_RIVEDERE_BOU:
      return "Da controllare";
    case States.VALIDATO_BO:
    case States.VALIDATO_BOF:
    case States.VALIDATO_BOU:
      return "Validato";
    default:
      return "—";
  }
}

/** Micro-stati Consegna / controllo consegna */
function consegnaMicroLabel(code?: StateCode): string {
  // Il grafico "Dettaglio consegna" è già contestualizzato alla consegna:
  // qui mostriamo quindi SOLO la parte specifica, senza prefisso "Consegna –".
  switch (code) {
    case States.IN_FINALIZZAZIONE:
      return "In finalizzazione";
    case States.CONSEGNA_IN_ATTESA_PRESA_IN_CARICO:
      return "In attesa di presa in carico";
    case States.CONSEGNA_IN_VERIFICA:
      return "In verifica";
    case States.CONSEGNA_DA_CONTROLLARE:
      return "Da controllare";
    default:
      return "—";
  }
}

function enabledBoBranches(f: Fascicolo): Array<"BO" | "BOF" | "BOU"> {
  const out: Array<"BO" | "BOF" | "BOU"> = ["BO"];
  if (f.workflow?.bof || f.hasFinanziamento) out.push("BOF");
  if (f.workflow?.bou || f.hasPermuta) out.push("BOU");
  return out;
}

function getBranchState(f: Fascicolo, branch: "BO" | "BOF" | "BOU"): StateCode | undefined {
  if (!f.workflow) return undefined;
  if (branch === "BO") return f.workflow.bo;
  if (branch === "BOF") return f.workflow.bof;
  return f.workflow.bou;
}

function DashboardCard(props: {
  title: string;
  description: string;
  value: ReactNode;
  badge?: ReactNode;
}) {
  const { title, description, value, badge } = props;
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className={badge ? "flex items-end justify-between" : "text-3xl font-semibold"}>
        <div className={badge ? "text-3xl font-semibold" : undefined}>{value}</div>
        {badge ? <div>{badge}</div> : null}
      </CardContent>
    </Card>
  );
}

export function DashboardPage() {
  const fascicoli = useFascicoli();

  const kpi = useMemo(() => {
    const total = fascicoli.length;

    const findEventAt = (f: Fascicolo, contains: string): Date | null => {
      const hit = f.timeline?.find((t) => (t.event ?? "").includes(contains));
      if (!hit?.at) return null;
      const d = new Date(hit.at);
      return Number.isNaN(d.getTime()) ? null : d;
    };

    const createdAt = (f: Fascicolo): Date | null => {
      const d = new Date(f.createdAt);
      return Number.isNaN(d.getTime()) ? null : d;
    };

    const daysBetween = (a: Date, b: Date) => (b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24);

    const avg = (values: number[]) => {
      if (!values.length) return null;
      return values.reduce((s, v) => s + v, 0) / values.length;
    };

    // Creazione → Approvato
    const approvalDurations: number[] = [];
    // Approvato → Completato
    const postApprovalDurations: number[] = [];
    // Creazione → Completato
    const totalDurations: number[] = [];

    for (const f of fascicoli) {
      const c = createdAt(f);
      const a = findEventAt(f, "Fascicolo approvato");
      const done = findEventAt(f, "Consegna completata");

      if (c && a) approvalDurations.push(daysBetween(c, a));
      if (a && done) postApprovalDurations.push(daysBetween(a, done));
      if (c && done) totalDurations.push(daysBetween(c, done));
    }

    const avgApprovalDays = avg(approvalDurations);
    const avgPostApprovalDays = avg(postApprovalDurations);
    const avgTotalDays = avg(totalDurations);

    return { total, avgApprovalDays, avgPostApprovalDays, avgTotalDays };
  }, [fascicoli]);

  const macroStatusData = useMemo<ChartDatum[]>(() => {
    const map = new Map<string, number>();
    for (const f of fascicoli) {
      increment(map, macroLabel(f.workflow?.overall));
    }
    return toChartData(map, [
      "Bozza",
      "Nuovo",
      "In validazione",
      "Approvato",
      "Consegna",
      "Completato",
      "Annullato",
      "—",
    ]);
  }, [fascicoli]);

  const boDetailData = useMemo<ChartDatum[]>(() => {
    const map = new Map<string, number>();

    for (const f of fascicoli) {
      // Conteggiamo solo fascicoli che sono nella fase BackOffice
      if (!isBackOfficeState(f.workflow?.overall)) continue;

      for (const branch of enabledBoBranches(f)) {
        const s = getBranchState(f, branch);
        // Se un ramo non è attivo / non ha stato, lo ignoriamo
        if (!s) continue;
        increment(map, boMicroLabel(s));
      }
    }

    return toChartData(map, [
      "In attesa di presa in carico",
      "In verifica",
      "Da controllare",
      "Validato",
      "—",
    ]);
  }, [fascicoli]);

  const consegnaDetailData = useMemo<ChartDatum[]>(() => {
    const map = new Map<string, number>();

    for (const f of fascicoli) {
      if (!isDeliveryAreaState(f.workflow?.overall)) continue;
      increment(map, consegnaMicroLabel(f.workflow?.overall));
    }

    return toChartData(map, [
      "In finalizzazione",
      "In attesa di presa in carico",
      "In verifica",
      "Da controllare",
      "—",
    ]);
  }, [fascicoli]);

  const progressData = useMemo<ChartDatum[]>(() => {
    const buckets: ChartDatum[] = [
      { name: "0-25", value: 0 },
      { name: "26-50", value: 0 },
      { name: "51-75", value: 0 },
      { name: "76-100", value: 0 },
    ];
    for (const f of fascicoli) {
      const p = f.progress ?? 0;
      if (p <= 25) buckets[0].value++;
      else if (p <= 50) buckets[1].value++;
      else if (p <= 75) buckets[2].value++;
      else buckets[3].value++;
    }
    return buckets;
  }, [fascicoli]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Panoramica</h1>
        <p className="text-sm text-muted-foreground">KPI e distribuzioni sul ciclo di vita dei fascicoli.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <DashboardCard title="Fascicoli" description="Totale a sistema" value={kpi.total} />

        <DashboardCard
          title="Tempo medio approvazione"
          description="Creazione → Approvato"
          value={kpi.avgApprovalDays == null ? "—" : `${kpi.avgApprovalDays.toFixed(1)} gg`}
          badge={<Badge>⏱️</Badge>}
        />

        <DashboardCard
          title="Tempo medio consegna"
          description="Approvato → Completato"
          value={kpi.avgPostApprovalDays == null ? "—" : `${kpi.avgPostApprovalDays.toFixed(1)} gg`}
          badge={<Badge variant="warning">🚚</Badge>}
        />

        <DashboardCard
          title="Tempo medio complessivo"
          description="Creazione → Completato"
          value={kpi.avgTotalDays == null ? "—" : `${kpi.avgTotalDays.toFixed(1)} gg`}
          badge={<Badge variant="success">⏳</Badge>}
        />
      </div>

<div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Distribuzione per stati principali</CardTitle>
            <CardDescription>Vista sintetica</CardDescription>
          </CardHeader>
          <CardContent className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={macroStatusData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={60}
                  outerRadius={105}
                  stroke="hsl(var(--background))"
                  strokeWidth={2}
                >
                  {macroStatusData.map((entry) => (
                    <Cell
                      key={entry.name}
                      fill={macroColor(entry.name)}
                      stroke="rgba(0,0,0,0.06)"
                      strokeWidth={1}
                    />
                  ))}
                </Pie>
                <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={TOOLTIP_LABEL_STYLE} itemStyle={TOOLTIP_ITEM_STYLE} />
                <Legend wrapperStyle={LEGEND_STYLE} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Avanzamento</CardTitle>
            <CardDescription>Bucket percentuale di completamento</CardDescription>
          </CardHeader>
          <CardContent className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={progressData}>
                <CartesianGrid stroke={GRID_STROKE} strokeDasharray="3 3" strokeOpacity={0.35} />
                <XAxis
                  dataKey="name"
                  tick={{ fill: TICK_FILL, fontSize: 12 }}
                  axisLine={{ stroke: AXIS_STROKE }}
                  tickLine={{ stroke: AXIS_STROKE }}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fill: TICK_FILL, fontSize: 12 }}
                  axisLine={{ stroke: AXIS_STROKE }}
                  tickLine={{ stroke: AXIS_STROKE }}
                />
                <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={TOOLTIP_LABEL_STYLE} itemStyle={TOOLTIP_ITEM_STYLE} />
                <Bar dataKey="value" fill={CHART_COLORS[0]} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Dettaglio In Validazione</CardTitle>
            <CardDescription>Stati della fase</CardDescription>
          </CardHeader>
          <CardContent className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={boDetailData}>
                <CartesianGrid stroke={GRID_STROKE} strokeDasharray="3 3" strokeOpacity={0.35} />
                <XAxis
                  dataKey="name"
                  tick={{ fill: TICK_FILL, fontSize: 12 }}
                  axisLine={{ stroke: AXIS_STROKE }}
                  tickLine={{ stroke: AXIS_STROKE }}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fill: TICK_FILL, fontSize: 12 }}
                  axisLine={{ stroke: AXIS_STROKE }}
                  tickLine={{ stroke: AXIS_STROKE }}
                />
                <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={TOOLTIP_LABEL_STYLE} itemStyle={TOOLTIP_ITEM_STYLE} />
                <Bar dataKey="value" fill={tint(STATUS_COLORS.VALIDAZIONE, 0.25)} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Dettaglio Consegna</CardTitle>
            <CardDescription>Stati della fase</CardDescription>
          </CardHeader>
          <CardContent className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={consegnaDetailData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={60}
                  outerRadius={105}
                  stroke="hsl(var(--background))"
                  strokeWidth={2}
                >
                  {consegnaDetailData.map((entry) => (
                    <Cell
                      key={entry.name}
                      fill={consegnaMicroColor(entry.name)}
                      stroke="rgba(0,0,0,0.06)"
                      strokeWidth={1}
                    />
                  ))}
                </Pie>
                <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={TOOLTIP_LABEL_STYLE} itemStyle={TOOLTIP_ITEM_STYLE} />
                <Legend wrapperStyle={LEGEND_STYLE} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
