// Lingkungan Deno: sediakan process.env untuk kode bersama.
if (typeof globalThis.process === "undefined") globalThis.process = { env: {} };
try { Object.assign(globalThis.process.env, Deno.env.toObject()); } catch (_) {}
