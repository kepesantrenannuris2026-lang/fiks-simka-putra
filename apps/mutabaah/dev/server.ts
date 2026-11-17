// Server uji lokal (Node) yang memakai dispatcher yang sama dengan Edge Function.
import http from "node:http";
import { handleRpc, runJob } from "../lib/rpc";
const H = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, content-type, x-region", "Access-Control-Allow-Methods": "POST, OPTIONS", "content-type": "application/json" };
http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") { res.writeHead(204, H); return res.end(); }
  let raw = ""; req.on("data", (c) => (raw += c)); await new Promise((r) => req.on("end", r));
  let body: any = {}; try { body = JSON.parse(raw || "{}"); } catch {}
  const out = await handleRpc(body, String(req.headers.authorization || ""), (job) => { runJob(job); });
  res.writeHead(200, H); res.end(JSON.stringify(out));
}).listen(Number(process.env.PORT || 3300), () => console.log("dev api :" + (process.env.PORT || 3300)));
