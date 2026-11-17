"use client";
import * as React from "react";
import * as D from "@radix-ui/react-dialog";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { motion, AnimatePresence, animate, useMotionValue, useTransform } from "framer-motion";
import { X, Minus, Plus, Loader2 } from "lucide-react";

export const cn = (...a: any[]) => twMerge(clsx(a));

/* ---------- Button ---------- */
const btn = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-semibold transition-colors disabled:opacity-50 disabled:pointer-events-none select-none",
  {
    variants: {
      variant: {
        primary: "bg-leaf text-white hover:bg-leaf-deep",
        dark: "bg-pine text-white hover:bg-leaf-deep",
        accent: "bg-saffron text-pine hover:brightness-95",
        outline: "border border-line bg-white text-ink hover:border-leaf hover:text-leaf",
        ghost: "text-muted hover:bg-leaf-soft hover:text-leaf-deep",
        danger: "bg-rose text-white hover:brightness-95",
      },
      size: { sm: "h-8 px-3 text-[13px] rounded-lg", md: "h-10 px-4 text-sm rounded-xl", lg: "h-12 px-5 text-[15px] rounded-2xl", icon: "h-9 w-9 rounded-xl" },
    },
    defaultVariants: { variant: "primary", size: "md" },
  }
);
export function Button({ className, variant, size, asChild, loading, children, ...p }: React.ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof btn> & { asChild?: boolean; loading?: boolean }) {
  // Mode asChild: Slot wajib menerima tepat satu elemen anak, jadi jangan sisipkan ikon loading.
  if (asChild) return <Slot className={cn(btn({ variant, size }), className)} {...(p as any)}>{children}</Slot>;
  const C: any = "button";
  return (
    <C className={cn(btn({ variant, size }), className)} disabled={loading || p.disabled} {...p}>
      {loading && <Loader2 className="size-4 animate-spin" />}
      {children}
    </C>
  );
}

/* ---------- Card ---------- */
export function Card({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-[var(--radius-card)] border border-line bg-white p-4 sm:p-5", className)} {...p} />;
}
export function CardTitle({ children, hint, right, className }: { children: React.ReactNode; hint?: React.ReactNode; right?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("mb-3 flex items-start gap-3", className)}>
      <div className="min-w-0 flex-1">
        <h3 className="text-[15px] font-bold text-ink">{children}</h3>
        {hint && <p className="mt-0.5 text-[13px] text-muted">{hint}</p>}
      </div>
      {right}
    </div>
  );
}

/* ---------- Form ---------- */
export const inputCls = "h-10 w-full rounded-xl border border-line bg-white px-3 text-sm text-ink placeholder:text-[#9aa8a0] focus:border-leaf focus:outline-none focus:ring-2 focus:ring-leaf/20";
export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(({ className, ...p }, ref) => <input ref={ref} className={cn(inputCls, className)} {...p} />);
Input.displayName = "Input";
export function Select({ className, children, ...p }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn(inputCls, "appearance-none bg-[length:16px] bg-[right_10px_center] bg-no-repeat pr-8", className)}
      style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%235E6F65' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")" }} {...p}>
      {children}
    </select>
  );
}
export function Textarea({ className, ...p }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(inputCls, "h-auto min-h-20 py-2", className)} {...p} />;
}
export function Field({ label, children, className, hint }: { label: React.ReactNode; children: React.ReactNode; className?: string; hint?: React.ReactNode }) {
  return (
    <label className={cn("block", className)}>
      <span className="mb-1.5 block text-[13px] font-semibold text-muted">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  );
}

/* ---------- Stepper angka ---------- */
export function Stepper({ value, onChange, min = 0, max = 999, tone = "leaf", label, compact }: { value: string | number; onChange: (v: string) => void; min?: number; max?: number; tone?: "leaf" | "saffron" | "sky" | "rose" | "amber" | "ink"; label?: string; compact?: boolean }) {
  const n = value === "" ? 0 : Number(value) || 0;
  const set = (x: number) => onChange(String(Math.max(min, Math.min(max, x))));
  const ring: Record<string, string> = { leaf: "focus-within:border-leaf", saffron: "focus-within:border-saffron", sky: "focus-within:border-sky", rose: "focus-within:border-rose", amber: "focus-within:border-amber", ink: "focus-within:border-ink" };
  return (
    <div className={cn("flex items-center rounded-xl border border-line bg-white", ring[tone], compact ? "h-9" : "h-10")}>
      <button type="button" aria-label={"Kurangi " + (label || "")} onClick={() => set(n - 1)} className="grid h-full w-8 shrink-0 place-items-center text-muted hover:text-ink"><Minus className="size-3.5" /></button>
      <input aria-label={label} inputMode="numeric" value={value} placeholder="0"
        onChange={(e) => onChange(e.target.value.replace(/[^0-9]/g, "").slice(0, 3))}
        className="tabular h-full w-full min-w-[2.6ch] bg-transparent px-0 text-center text-[15px] font-bold text-ink outline-none" />
      <button type="button" aria-label={"Tambah " + (label || "")} onClick={() => set(n + 1)} className="grid h-full w-8 shrink-0 place-items-center text-muted hover:text-ink"><Plus className="size-3.5" /></button>
    </div>
  );
}

/* ---------- Segmented ---------- */
export function Segmented<T extends string>({ value, onChange, options, id, className }: { value: T; onChange: (v: T) => void; options: { value: T; label: React.ReactNode }[]; id: string; className?: string }) {
  return (
    <div className={cn("inline-flex rounded-xl bg-mist p-1", className)} role="tablist">
      {options.map((o) => (
        <button key={o.value} role="tab" aria-selected={value === o.value} onClick={() => onChange(o.value)}
          className={cn("relative flex-1 whitespace-nowrap rounded-lg px-3 py-1.5 text-[13px] font-semibold transition-colors", value === o.value ? "text-white" : "text-muted hover:text-ink")}>
          {value === o.value && <motion.span layoutId={"seg-" + id} className="absolute inset-0 rounded-lg bg-pine" transition={{ type: "spring", bounce: 0.2, duration: 0.4 }} />}
          <span className="relative">{o.label}</span>
        </button>
      ))}
    </div>
  );
}

/* ---------- Badge ---------- */
const badge = cva("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11.5px] font-bold", {
  variants: { tone: { leaf: "bg-leaf-soft text-leaf-deep", saffron: "bg-saffron-soft text-[#9a4f0f]", sky: "bg-sky-soft text-sky", rose: "bg-rose-soft text-rose", amber: "bg-amber-soft text-amber", muted: "bg-mist text-muted" } },
  defaultVariants: { tone: "muted" },
});
export function Badge({ tone, className, ...p }: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badge>) {
  return <span className={cn(badge({ tone }), className)} {...p} />;
}

/* ---------- Angka beranimasi ---------- */
export function CountUp({ value, decimals = 0, className }: { value: number; decimals?: number; className?: string }) {
  const mv = useMotionValue(0);
  const txt = useTransform(mv, (v) => v.toLocaleString("id-ID", { minimumFractionDigits: decimals, maximumFractionDigits: decimals }));
  React.useEffect(() => { const c = animate(mv, value || 0, { duration: 0.9, ease: [0.22, 1, 0.36, 1] }); return c.stop; }, [value, mv]);
  return <motion.span className={cn("tabular", className)}>{txt}</motion.span>;
}

/* ---------- Progress ---------- */
export function Bar({ value, className, tone = "leaf" }: { value: number; className?: string; tone?: "leaf" | "saffron" | "sky" }) {
  const c = { leaf: "bg-leaf", saffron: "bg-saffron", sky: "bg-sky" }[tone];
  return (
    <div className={cn("h-2 overflow-hidden rounded-full bg-mist", className)}>
      <motion.div className={cn("h-full rounded-full", c)} initial={{ width: 0 }} animate={{ width: Math.max(0, Math.min(100, value)) + "%" }} transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }} />
    </div>
  );
}
export function Ring({ value, size = 120, stroke = 11, children, track = "rgba(255,255,255,.14)", color = "#EE8A35" }: { value: number; size?: number; stroke?: number; children?: React.ReactNode; track?: string; color?: string }) {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r;
  return (
    <div className="relative grid shrink-0 place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke={track} strokeWidth={stroke} fill="none" />
        <motion.circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={stroke} fill="none" strokeLinecap="round"
          strokeDasharray={c} initial={{ strokeDashoffset: c }} animate={{ strokeDashoffset: c * (1 - Math.max(0, Math.min(100, value)) / 100) }} transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }} />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">{children}</div>
    </div>
  );
}

/* ---------- Dialog ---------- */
export function Dialog({ open, onOpenChange, title, description, children, footer, wide }: { open: boolean; onOpenChange: (o: boolean) => void; title: React.ReactNode; description?: React.ReactNode; children: React.ReactNode; footer?: React.ReactNode; wide?: boolean }) {
  return (
    <D.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open && (
          <D.Portal forceMount>
            <D.Overlay asChild forceMount>
              <motion.div className="fixed inset-0 z-50 bg-pine/55 backdrop-blur-[2px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
            </D.Overlay>
            <D.Content asChild forceMount>
              <motion.div
                className={cn("fixed inset-x-0 bottom-0 z-50 max-h-[92dvh] overflow-y-auto rounded-t-3xl bg-white p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl sm:inset-auto sm:left-1/2 sm:top-1/2 sm:w-[calc(100%-2rem)] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-3xl", wide ? "sm:max-w-2xl" : "sm:max-w-lg")}
                initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 40 }} transition={{ type: "spring", bounce: 0.15, duration: 0.45 }}>
                <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-line sm:hidden" />
                <div className="mb-4 flex items-start gap-3">
                  <div className="flex-1">
                    <D.Title className="text-lg font-bold text-ink">{title}</D.Title>
                    {description ? <D.Description className="mt-1 text-[13px] text-muted">{description}</D.Description> : <D.Description className="sr-only">{String(title)}</D.Description>}
                  </div>
                  <D.Close asChild><Button variant="ghost" size="icon" aria-label="Tutup"><X className="size-4" /></Button></D.Close>
                </div>
                {children}
                {footer && <div className="mt-5 flex flex-wrap items-center justify-end gap-2">{footer}</div>}
              </motion.div>
            </D.Content>
          </D.Portal>
        )}
      </AnimatePresence>
    </D.Root>
  );
}

/* ---------- Misc ---------- */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-xl bg-[#e6ede8]", className)} />;
}
export function Empty({ icon, title, children }: { icon?: React.ReactNode; title: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-[var(--radius-card)] border border-dashed border-line bg-white/60 px-6 py-10 text-center">
      {icon && <div className="mb-3 text-leaf">{icon}</div>}
      <p className="font-semibold text-ink">{title}</p>
      {children && <div className="mt-1 max-w-md text-[13px] text-muted">{children}</div>}
    </div>
  );
}

/* Belah ketupat — bentuk inti logo, dipakai untuk peta juz */
export function Diamond({ on, label, size = 26, tone = "leaf", onClick, title }: { on?: boolean; label?: React.ReactNode; size?: number; tone?: "leaf" | "saffron"; onClick?: () => void; title?: string }) {
  const Comp: any = onClick ? "button" : "div";
  const fill = on ? (tone === "leaf" ? "bg-leaf text-white" : "bg-saffron text-white") : "bg-white text-muted border border-line";
  return (
    <Comp type={onClick ? "button" : undefined} onClick={onClick} title={title} aria-pressed={onClick ? !!on : undefined}
      className={cn("group relative grid place-items-center", onClick && "cursor-pointer")} style={{ width: size * 1.42, height: size * 1.42 }}>
      <motion.span layout className={cn("absolute rotate-45 rounded-[5px] transition-colors", fill, onClick && !on && "group-hover:border-leaf")} style={{ width: size, height: size }}
        animate={{ scale: on ? 1 : 0.92 }} transition={{ type: "spring", bounce: 0.5, duration: 0.35 }} />
      {label != null && <span className={cn("relative text-[10px] font-bold tabular", on ? "text-white" : "text-muted")}>{label}</span>}
    </Comp>
  );
}
/** Peta 30 juz: hijau = hafalan selesai, oranye = juz itu sudah diujikan. */
export function JuzLattice({ selected, diuji = [], size = 18, onToggle }: { selected: number[]; diuji?: number[]; size?: number; onToggle?: (j: number) => void }) {
  const set = new Set(selected), uji = new Set(diuji);
  return (
    <div className="flex flex-wrap" style={{ gap: 2 }}>
      {Array.from({ length: 30 }, (_, i) => i + 1).map((j) => (
        <Diamond key={j} on={set.has(j) || uji.has(j)} tone={uji.has(j) ? "saffron" : "leaf"} size={size} label={size >= 16 ? j : undefined}
          title={"Juz " + j + (uji.has(j) ? " · sudah diuji" : set.has(j) ? " · selesai, belum diuji" : "")} onClick={onToggle ? () => onToggle(j) : undefined} />
      ))}
    </div>
  );
}
export function JuzLegend({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] text-muted", className)}>
      <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rotate-45 rounded-[2px] bg-leaf" />Selesai, belum diuji</span>
      <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rotate-45 rounded-[2px] bg-saffron" />Sudah diuji</span>
    </div>
  );
}
/** Siklus ketuk peta juz: kosong → selesai (hijau) → sudah diuji (oranye) → kosong. */
export function juzCycle(sel: number[], uji: number[], j: number): [number[], number[]] {
  const srt = (l: number[]) => [...l].sort((a, b) => a - b);
  if (uji.includes(j)) return [sel.filter((x) => x !== j), uji.filter((x) => x !== j)];
  if (sel.includes(j)) return [sel, srt([...uji, j])];
  return [srt([...sel, j]), uji];
}
