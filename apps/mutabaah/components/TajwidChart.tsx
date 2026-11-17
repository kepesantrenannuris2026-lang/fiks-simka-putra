"use client";
import * as React from "react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine } from "recharts";
import { Mic2 } from "lucide-react";
import { Card, CardTitle, Segmented } from "./ui";

/** Grafik capaian makhraj & hukum tajwid per bulan (dari penilaian di menu Santri). */
export default function TajwidChart({ t }: { t: any }) {
  const [mode, setMode] = React.useState<"nilai" | "bplus">("nilai");
  if (!t) return null;
  const data = t.labels.map((l: string, i: number) => ({
    l,
    makhraj: mode === "nilai" ? t.makhraj_avg[i] : t.makhraj_bplus[i],
    tajwid: mode === "nilai" ? t.tajwid_avg[i] : t.tajwid_bplus[i],
    n: t.dinilai[i],
  }));
  return (
    <Card>
      <CardTitle hint="Dari penilaian makhraj & tajwid di menu Santri"
        right={<Segmented id="tajwid-mode" value={mode} onChange={(v) => setMode(v as any)} options={[{ value: "nilai", label: "Nilai" }, { value: "bplus", label: "% B+" }]} />}>
        Capaian tajwid
      </CardTitle>
      {!t.total_dinilai ? (
        <div className="grid place-items-center gap-2 rounded-2xl bg-mist px-4 py-8 text-center">
          <Mic2 className="size-7 text-muted" />
          <p className="text-[13px] font-semibold">Belum ada penilaian pada periode ini</p>
          <p className="max-w-xs text-[12px] text-muted">Isi lewat menu <b>Santri</b> → ketuk <b>⋯</b> pada kartu santri → <b>Penilaian makhraj & tajwid</b>.</p>
        </div>
      ) : (
        <>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#DCE5DF" vertical={false} />
                <XAxis dataKey="l" tick={{ fontSize: 11, fill: "#5B6B62" }} tickLine={false} axisLine={false} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "#5B6B62" }} tickLine={false} axisLine={false} />
                {mode === "nilai" ? <ReferenceLine y={80} stroke="#EE8A35" strokeDasharray="4 4" /> : <ReferenceLine y={80} stroke="#EE8A35" strokeDasharray="4 4" />}
                <Tooltip formatter={(v: any, k: any) => [v == null ? "–" : mode === "nilai" ? v : v + "%", k === "makhraj" ? "Makhraj" : "Tajwid"]}
                  labelFormatter={(l: any, p: any) => `${l}${p?.[0]?.payload?.n ? ` · ${p[0].payload.n} santri dinilai` : ""}`} />
                <Line type="monotone" dataKey="makhraj" stroke="#2F6BD8" strokeWidth={2.5} dot={{ r: 3 }} connectNulls />
                <Line type="monotone" dataKey="tajwid" stroke="#17873F" strokeWidth={2.5} dot={{ r: 3 }} connectNulls />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-4 text-[12px] text-muted">
            <span className="flex items-center gap-1.5"><span className="h-1 w-4 rounded bg-sky" />Makhraj</span>
            <span className="flex items-center gap-1.5"><span className="h-1 w-4 rounded bg-leaf" />Hukum tajwid</span>
            <span className="flex items-center gap-1.5"><span className="h-0 w-4 border-t-2 border-dashed border-saffron" />{mode === "nilai" ? "Batas B+ (80)" : "80%"}</span>
          </div>
        </>
      )}
    </Card>
  );
}
