// Saat dijalankan di Supabase, Pool disediakan oleh fungsi pemuat (npm:pg).
const P = globalThis.__pgPool;
export const Pool = P;
export default { Pool: P };
