"use client";
let TOKEN = "";
/** Server API: Supabase Edge Function (bisa diganti lewat NEXT_PUBLIC_API_URL saat build). */
const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://yvcqcgbzdsrjkskvcmqq.supabase.co/functions/v1/api";
let onExpired: () => void = () => {};
export function setToken(t: string) { TOKEN = t; }
export function setOnExpired(f: () => void) { onExpired = f; }

export async function rpc<T = any>(fn: string, ...args: any[]): Promise<T> {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + TOKEN, "x-region": "ap-southeast-1" },
    body: JSON.stringify({ fn, args }),
  });
  let j: any;
  try { j = await res.json(); } catch { throw new Error("Server tidak merespons. Periksa koneksi internet."); }
  if (!j.ok) {
    if (/Sesi berakhir/.test(j.error)) onExpired();
    throw new Error(j.error);
  }
  return j.data as T;
}
