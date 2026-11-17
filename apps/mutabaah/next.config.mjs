/** @type {import('next').NextConfig} */
// Situs statis: API berjalan di Supabase Edge Function (lib/api.ts), bukan di Netlify Functions.
// Build portal Cloudflare: NEXT_PUBLIC_BASE_PATH=/mutabaah NEXT_PUBLIC_PORTAL=1 (aset di /mutabaah/_next).
const base = process.env.NEXT_PUBLIC_BASE_PATH || "";
const nextConfig = {
  reactStrictMode: true, output: "export", images: { unoptimized: true }, eslint: { ignoreDuringBuilds: true },
  ...(base ? { basePath: base, trailingSlash: true } : {}),
};
export default nextConfig;
