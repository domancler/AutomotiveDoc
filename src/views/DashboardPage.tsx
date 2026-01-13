import { useMemo } from "react";
import { fascicoli } from "@/mock/fascicoli";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/ui/components/card";
import { Badge } from "@/ui/components/badge";
import { formatEuro } from "@/lib/utils";
import { PieChart, Pie, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";

export function DashboardPage() {
  const kpi = useMemo(() => {
    const total = fascicoli.length;
    const inCorso = fascicoli.filter((f) => f.stato === "In compilazione" || f.stato === "In approvazione").length;
    const firmati = fascicoli.filter((f) => f.stato === "Firmato").length;
    const valoreTot = fascicoli.reduce((sum, f) => sum + f.valore, 0);
    return { total, inCorso, firmati, valoreTot };
  }, []);

  const statoData = useMemo(() => {
    const map = new Map<string, number>();
    for (const f of fascicoli) map.set(f.stato, (map.get(f.stato) ?? 0) + 1);
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }, []);

  const progressData = useMemo(() => {
    // "Fake" bucket progress
    const buckets = [
      { name: "0-25", value: 0 },
      { name: "26-50", value: 0 },
      { name: "51-75", value: 0 },
      { name: "76-100", value: 0 },
    ];
    for (const f of fascicoli) {
      const p = f.progress;
      if (p <= 25) buckets[0].value++;
      else if (p <= 50) buckets[1].value++;
      else if (p <= 75) buckets[2].value++;
      else buckets[3].value++;
    }
    return buckets;
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Panoramica</h1>
        <p className="text-sm text-muted-foreground">
          KPI e trend (mock) per il ciclo di vita dei fascicoli contrattuali.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle>Fascicoli</CardTitle>
            <CardDescription>Totale a sistema</CardDescription>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">{kpi.total}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>In corso</CardTitle>
            <CardDescription>In compilazione / approvazione</CardDescription>
          </CardHeader>
          <CardContent className="flex items-end justify-between">
            <div className="text-3xl font-semibold">{kpi.inCorso}</div>
            <Badge>Operativi</Badge>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Firmati</CardTitle>
            <CardDescription>Fascicoli completati</CardDescription>
          </CardHeader>
          <CardContent className="flex items-end justify-between">
            <div className="text-3xl font-semibold">{kpi.firmati}</div>
            <Badge variant="success">OK</Badge>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Valore</CardTitle>
            <CardDescription>Somma valore vendite</CardDescription>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{formatEuro(kpi.valoreTot)}</CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Distribuzione per stato</CardTitle>
            <CardDescription>Numero fascicoli per stato</CardDescription>
          </CardHeader>
          <CardContent className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={statoData} dataKey="value" nameKey="name" innerRadius={60} outerRadius={100} />
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
                <Bar dataKey="value" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
