import { useMemo, type ReactNode } from "react";
import { useFascicoli } from "@/mock/useFascicoliStore";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/ui/components/card";
import { Badge } from "@/ui/components/badge";
import { formatEuro } from "@/lib/utils";
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

type ChartDatum = { name: string; value: number };

const COLORS = ["#60a5fa", "#34d399", "#fbbf24", "#f87171", "#a78bfa", "#22d3ee", "#fb7185"];

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
    code === States.PRONTO_PER_LA_CONSEGNA ||
    code === States.DA_VALIDARE_CONSEGNA ||
    code === States.VERIFICHE_CONSEGNA ||
    code === States.DA_RIVEDERE_VRC
  );
}

function isVrcConsegnaState(code?: StateCode): boolean {
  if (!code) return false;
  return (
    code === States.DA_VALIDARE_CONSEGNA ||
    code === States.VERIFICHE_CONSEGNA ||
    code === States.DA_RIVEDERE_VRC
  );
}

/** Macro stati per dashboard (overview) */
function macroLabel(code?: StateCode): string {
  if (!code) return "—";
  if (code === States.BOZZA) return "Bozza";
  if (code === States.NUOVO) return "Nuovo";
  if (isBackOfficeState(code)) return "Validazione BackOffice";
  if (code === States.APPROVATO) return "Approvato";
  if (code === States.PRONTO_PER_LA_CONSEGNA) return "Pronto per la consegna";
  if (isVrcConsegnaState(code)) return "Consegna";
  if (code === States.CONSEGNATO) return "Completato";
  return "Altro";
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
  switch (code) {
    case States.PRONTO_PER_LA_CONSEGNA:
      return "Pronto per la consegna";
    case States.DA_VALIDARE_CONSEGNA:
      return "Consegna - in attesa di presa in carico";
    case States.VERIFICHE_CONSEGNA:
      return "Consegna - in verifica";
    case States.DA_RIVEDERE_VRC:
      return "Consegna - da controllare";
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
  badge?: React.ReactNode;
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
    const completati = fascicoli.filter((f) => f.workflow?.overall === States.CONSEGNATO).length;

    const inValidazioneBO = fascicoli.filter((f) => isBackOfficeState(f.workflow?.overall)).length;
    const prontoConsegna = fascicoli.filter((f) => f.workflow?.overall === States.PRONTO_PER_LA_CONSEGNA).length;
    const inControlloConsegna = fascicoli.filter((f) => isVrcConsegnaState(f.workflow?.overall)).length;
    const inDeliveryArea = fascicoli.filter((f) => isDeliveryAreaState(f.workflow?.overall)).length;

    const valoreTot = fascicoli.reduce((sum, f) => sum + (f.valore ?? 0), 0);

    return { total, completati, inValidazioneBO, prontoConsegna, inControlloConsegna, inDeliveryArea, valoreTot };
  }, [fascicoli]);

  const macroStatusData = useMemo<ChartDatum[]>(() => {
    const map = new Map<string, number>();
    for (const f of fascicoli) {
      increment(map, macroLabel(f.workflow?.overall));
    }
    return toChartData(map, [
      "Bozza",
      "Nuovo",
      "Validazione BackOffice",
      "Approvato",
      "Pronto per la consegna",
      "Consegna",
      "Completato",
      "Altro",
      "—",
    ]);
  }, [fascicoli]);

  const boDetailData = useMemo<ChartDatum[]>(() => {
    const map = new Map<string, number>();

    for (const f of fascicoli) {
      // Conteggiamo solo fascicoli che sono nella macro-area "Validazione BackOffice"
      if (macroLabel(f.workflow?.overall) !== "Validazione BackOffice") continue;

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
      "Pronto per la consegna",
      "Consegna - in attesa di presa in carico",
      "Consegna - in verifica",
      "Consegna - da controllare",
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
          title="Validazione BO"
          description="Fascicoli in lavorazione BackOffice"
          value={kpi.inValidazioneBO}
          badge={<Badge>BackOffice</Badge>}
        />
        <DashboardCard
          title="Pronto consegna"
          description="Presi in carico da Operatore consegna"
          value={kpi.prontoConsegna}
          badge={<Badge variant="warning">Operatore</Badge>}
        />
        <DashboardCard
          title="Controllo consegna"
          description="In lavorazione al controllo consegna"
          value={kpi.inControlloConsegna}
          badge={<Badge variant="warning">VRC</Badge>}
        />
        <DashboardCard
          title="Valore"
          description="Somma valore vendite"
          value={formatEuro(kpi.valoreTot)}
          badge={<Badge variant="success">€</Badge>}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Distribuzione per macro-stato</CardTitle>
            <CardDescription>Vista sintetica (senza micro-stati BO / consegna)</CardDescription>
          </CardHeader>
          <CardContent className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={macroStatusData} dataKey="value" nameKey="name" innerRadius={60} outerRadius={105}>
                  {macroStatusData.map((_, idx) => (
                    <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
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
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" fill="#60a5fa" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Dettaglio BackOffice</CardTitle>
            <CardDescription>Micro-stati dei rami (BO / BOF / BOU)</CardDescription>
          </CardHeader>
          <CardContent className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={boDetailData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" fill="#34d399" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Dettaglio Consegna</CardTitle>
            <CardDescription>Micro-stati della fase consegna / controllo consegna</CardDescription>
          </CardHeader>
          <CardContent className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={consegnaDetailData} dataKey="value" nameKey="name" innerRadius={60} outerRadius={105}>
                  {consegnaDetailData.map((_, idx) => (
                    <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <DashboardCard
          title="Completati"
          description="Fascicoli conclusi"
          value={kpi.completati}
          badge={<Badge variant="success">OK</Badge>}
        />
      </div>
    </div>
  );
}
