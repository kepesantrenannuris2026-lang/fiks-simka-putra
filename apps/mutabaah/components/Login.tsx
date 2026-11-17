"use client";
import { TombolPasang } from "./InstallApp";
import * as React from "react";
import { motion } from "framer-motion";
import { rpc } from "@/lib/api";
import { Button, Input, Field } from "./ui";
import type { User } from "./App";
import LogoMotion from "./LogoMotion";

const AYAT = "وَلَقَدْ يَسَّرْنَا الْقُرْآنَ لِلذِّكْرِ فَهَلْ مِن مُّدَّكِرٍ".split(" ");

export default function Login({ onLogin }: { onLogin: (t: string, u: User) => void }) {
  const [u, setU] = React.useState("");
  const [p, setP] = React.useState("");
  const [err, setErr] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const userRef = React.useRef<HTMLInputElement>(null);
  React.useEffect(() => { if (window.matchMedia("(min-width: 1024px)").matches) userRef.current?.focus({ preventScroll: true }); }, []);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setErr(""); setBusy(true);
    try {
      const r: any = await rpc("login", u, p);
      if (!r.ok) setErr(r.msg); else onLogin(r.token, r.user);
    } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  };
  return (
    <div className="grid grid-cols-1 min-h-dvh lg:grid-cols-[1.1fr_1fr]">
      <section className="kufi-pattern relative flex flex-col justify-between overflow-hidden px-6 pb-10 pt-[max(2rem,env(safe-area-inset-top))] text-white sm:px-10 lg:px-14 lg:py-14">
        <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3">
          <span className="block size-2.5 rotate-45 rounded-[2px] bg-saffron" />
          <div className="leading-tight"><p className="text-sm text-white/70">Pesantren</p><p className="font-bold">Nurul Islam Tengaran</p></div>
        </motion.div>
        <div className="mt-10 lg:mt-0">
          <LogoMotion className="-ml-3 w-40 sm:w-52 lg:-ml-5 lg:w-64" />
          <figure className="mt-4 max-w-xl">
            <p dir="rtl" lang="ar" className="font-arab flex flex-wrap justify-end gap-x-2.5 text-[26px] leading-[1.9] text-saffron sm:gap-x-3 sm:text-4xl">
              {AYAT.map((w, i) => (
                <motion.span key={i} className="inline-block" initial={{ opacity: 0, y: 10, filter: "blur(6px)" }} animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  transition={{ delay: 1.2 + i * 0.16, duration: 0.6, ease: "easeOut" }}>{w}</motion.span>
              ))}
            </p>
            <motion.figcaption initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2 + AYAT.length * 0.16 + 0.2, duration: 0.7 }}
              className="mt-2 border-l-2 border-saffron/60 pl-3 text-[14px] italic leading-relaxed text-white/80">
              “Dan sungguh, telah Kami mudahkan Al-Qur’an untuk peringatan, maka adakah orang yang mau mengambil pelajaran?”
              <span className="mt-1 block text-xs not-italic tracking-wide text-white/50">QS. Al-Qamar [54]: 17</span>
            </motion.figcaption>
          </figure>
          <motion.h1 initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, duration: 0.5 }} className="mt-6 max-w-md text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl">
            Mutabaah capaian santri
          </motion.h1>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }} className="mt-4 max-w-md text-[15px] leading-relaxed text-white/75">
            Catat tahsin, ziyadah, dan murajaah setiap pekan. Pantau hafalan tiap santri sampai 30 juz, lengkap dengan raport untuk wali.
          </motion.p>
          <div className="mt-8 hidden gap-1.5 lg:flex" aria-hidden>
            {Array.from({ length: 30 }, (_, i) => (
              <motion.span key={i} className="block size-3 rotate-45 rounded-[3px]" style={{ background: i < 18 ? "#17873F" : i < 21 ? "#EE8A35" : "rgba(255,255,255,.14)" }}
                initial={{ opacity: 0, scale: 0.4 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.45 + i * 0.025 }} />
            ))}
          </div>
        </div>
        <p className="mt-10 hidden text-xs text-white/50 lg:block">Data tersimpan aman dan dicadangkan otomatis ke Spreadsheet pesantren.</p>
      </section>
      <section className="flex items-center justify-center bg-mist px-6 py-10 sm:px-10">
        <form onSubmit={submit} className="w-full max-w-sm">
          <h2 className="text-2xl font-extrabold tracking-tight">Masuk</h2>
          <p className="mt-1 text-sm text-muted">Gunakan akun musyrif atau pimpinan yang sama seperti sebelumnya.</p>
          <div className="mt-6 space-y-4">
            <Field label="Username"><Input autoComplete="username" value={u} onChange={(e) => setU(e.target.value)} ref={userRef} className="h-12" /></Field>
            <Field label="Password"><Input type="password" autoComplete="current-password" value={p} onChange={(e) => setP(e.target.value)} className="h-12" /></Field>
          </div>
          {err && <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="mt-4 rounded-xl bg-rose-soft px-3 py-2 text-sm text-rose">{err}</motion.p>}
          <Button type="submit" size="lg" className="mt-6 w-full" variant="dark" loading={busy}>Masuk</Button>
        </form>
        <div className="mt-4 flex justify-center"><TombolPasang variant="link" /></div>
      </section>
    </div>
  );
}
