import React, { useState, useEffect } from 'react';
import { Lock, User, AlertCircle, ArrowRight, Eye, EyeOff, ShieldCheck, Sun, Moon } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useTheme } from '../../context/ThemeContext';

export const LoginView: React.FC = () => {
  const { login } = useApp();
  const { resolvedTheme, setThemeMode, toggleTheme } = useTheme();

  useEffect(() => {
    document.title = 'SIMKA.ID PUTRA - Sistem Monitoring Karakter & Akhlak Santri Putra';
  }, []);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setErrorMsg('Gagal masuk ke sistem. Silakan periksa username dan kata sandi.');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    try {
      const res = await login(username.trim(), password, rememberMe);
      if (!res.success) {
        setErrorMsg('Gagal masuk ke sistem. Silakan periksa username dan kata sandi.');
      }
    } catch {
      setErrorMsg('Gagal masuk ke sistem. Silakan periksa username dan kata sandi.');
    } finally {
      setIsLoading(false);
    }
  };

  const isDark = resolvedTheme === 'dark';

  return (
    <div
      className={`min-h-screen w-full flex flex-col items-center justify-between p-4 sm:p-6 select-none font-sans overflow-x-hidden transition-colors duration-200 relative ${
        isDark
          ? 'bg-[#07101F] text-slate-100'
          : 'bg-[#F8FAFC] text-slate-900'
      }`}
    >
      {/* Background Subtle Ambient Glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 overflow-hidden"
      >
        <div
          className={`absolute -top-32 left-1/2 -translate-x-1/2 w-[600px] h-[350px] rounded-full blur-[110px] opacity-40 transition-colors duration-300 ${
            isDark ? 'bg-emerald-600/20' : 'bg-emerald-400/25'
          }`}
        />
        <div
          className={`absolute -bottom-32 left-1/2 -translate-x-1/2 w-[500px] h-[300px] rounded-full blur-[120px] opacity-25 transition-colors duration-300 ${
            isDark ? 'bg-amber-600/15' : 'bg-amber-400/20'
          }`}
        />
      </div>

      {/* Top Floating Theme Switcher Quick Toggle (Accessible at Top Corner) */}
      <header className="w-full max-w-4xl flex items-center justify-between py-2 sm:py-3 z-10">
        <div className="flex items-center gap-2">
          {/* Subtle Institutional Tag */}
          <span
            className={`text-[11px] sm:text-[12px] font-semibold tracking-wide transition-colors ${
              isDark ? 'text-slate-400' : 'text-slate-600'
            }`}
          >
            Portal Pembinaan Santri
          </span>
        </div>

        {/* Quick Theme Switcher Button with Sun/Moon Icon & Tooltip */}
        <button
          type="button"
          onClick={toggleTheme}
          title={isDark ? 'Ganti ke Tema Terang' : 'Ganti ke Tema Gelap'}
          aria-label={isDark ? 'Ganti ke Tema Terang' : 'Ganti ke Tema Gelap'}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all duration-150 cursor-pointer shadow-xs ${
            isDark
              ? 'bg-[#0E1A2D] text-slate-200 border-[#1E3048] hover:border-emerald-500/50 hover:text-emerald-400 hover:bg-[#13233D]'
              : 'bg-white text-slate-700 border-slate-200 hover:border-emerald-500/50 hover:text-emerald-700 hover:bg-slate-50'
          }`}
        >
          {isDark ? (
            <>
              <Sun className="w-3.5 h-3.5 text-amber-400 transition-transform hover:rotate-45" />
              <span className="hidden sm:inline">Tema Terang</span>
            </>
          ) : (
            <>
              <Moon className="w-3.5 h-3.5 text-emerald-600 transition-transform hover:-rotate-12" />
              <span className="hidden sm:inline">Tema Gelap</span>
            </>
          )}
        </button>
      </header>

      {/* Center Form Wrapper */}
      <div className="w-full flex-1 flex flex-col items-center justify-center my-auto py-4 sm:py-6 max-w-md mx-auto z-10">
        
        {/* ============================================================ */}
        {/* 1. LOGO RESMI NURIS & 2. JUDUL & 3. SUBJUDUL */}
        {/* ============================================================ */}
        <div className="w-full text-center mb-5 sm:mb-6 flex flex-col items-center">
          {/* 1. Official SIMKA.ID Mosque Logo (Emerald Rounded Box with Green-Gold Mosque) */}
          <div className="mb-3.5 sm:mb-4 flex items-center justify-center">
            <img
              src="/logo-simka.png"
              alt="Logo Masjid SIMKA.ID"
              width={120}
              height={120}
              className="w-[100px] h-[100px] sm:w-[120px] sm:h-[120px] object-contain transition-transform duration-200 hover:scale-105 filter drop-shadow-md select-none rounded-[26px]"
              onError={(e) => {
                // Failsafe fallback path
                (e.target as HTMLImageElement).src = '/logo-simka.svg';
              }}
            />
          </div>

          {/* 2. Judul: SIMKA.ID PUTRA Pro V1 */}
          <div className="flex items-center justify-center gap-1.5 sm:gap-2">
            <h1
              className={`text-[25px] sm:text-[30px] font-black tracking-tight leading-tight transition-colors ${
                isDark ? 'text-white' : 'text-slate-900'
              }`}
            >
              SIMKA<span className="text-emerald-500 dark:text-emerald-400">.ID</span>
            </h1>
            <span
              className={`px-2 py-0.5 rounded text-[10px] sm:text-[11px] font-bold tracking-wider border transition-colors ${
                isDark
                  ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-300'
              }`}
            >
              PUTRA
            </span>
            <span
              className={`px-1.5 py-0.5 rounded text-[9.5px] sm:text-[10px] font-bold tracking-wider border transition-colors ${
                isDark
                  ? 'bg-slate-800 text-slate-300 border-slate-700'
                  : 'bg-slate-100 text-slate-600 border-slate-200'
              }`}
            >
              Pro V1
            </span>
          </div>

          {/* 3. Subjudul: Sistem Monitoring Karakter & Akhlak Santri Putra */}
          <p
            className={`text-[13px] sm:text-[14px] font-semibold mt-1 max-w-xs sm:max-w-md leading-relaxed tracking-wide transition-colors ${
              isDark ? 'text-emerald-300/90' : 'text-emerald-700'
            }`}
          >
            Sistem Monitoring Karakter &amp; Akhlak Santri Putra
          </p>

          {/* Nama Pesantren */}
          <p
            className={`text-[11px] sm:text-[12px] font-bold tracking-widest uppercase mt-0.5 transition-colors ${
              isDark ? 'text-[#F4B942]' : 'text-amber-600'
            }`}
          >
            PESANTREN NURUL ISLAM TENGARAN
          </p>
        </div>

        {/* ============================================================ */}
        {/* LOGIN CARD CONTAINER */}
        {/* ============================================================ */}
        <main
          className={`w-full rounded-2xl p-5 sm:p-7 transition-colors duration-200 border ${
            isDark
              ? 'bg-[#0E1A2D] border-[#1E3048] shadow-2xl shadow-black/80'
              : 'bg-white border-slate-200/90 shadow-xl shadow-slate-200/70'
          }`}
        >
          {/* Card Header */}
          <div className="mb-5 text-center sm:text-left">
            <h2
              className={`text-[17px] sm:text-[19px] font-bold tracking-tight transition-colors ${
                isDark ? 'text-white' : 'text-slate-900'
              }`}
            >
              Masuk ke Sistem
            </h2>
            <p
              className={`text-[12px] sm:text-[13px] mt-1 leading-relaxed transition-colors ${
                isDark ? 'text-slate-400' : 'text-slate-500'
              }`}
            >
              Gunakan username dan kata sandi Anda untuk mengakses sistem.
            </p>
          </div>

          {/* Error Alert */}
          {errorMsg && (
            <div
              role="alert"
              className={`mb-4 p-3 rounded-xl border flex items-start gap-2.5 text-xs animate-in fade-in duration-200 ${
                isDark
                  ? 'bg-rose-950/60 border-rose-800/50 text-rose-200'
                  : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}
            >
              <AlertCircle
                className={`w-4 h-4 shrink-0 mt-0.5 ${
                  isDark ? 'text-rose-400' : 'text-rose-600'
                }`}
              />
              <span className="leading-snug text-[12px] font-medium">{errorMsg}</span>
            </div>
          )}

          {/* ============================================================ */}
          {/* 4. FORMULIR USERNAME & PASSWORD */}
          {/* ============================================================ */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Field 1: USERNAME PENGGUNA */}
            <div>
              <label
                htmlFor="login-username"
                className={`block text-[11.5px] sm:text-[12px] font-bold uppercase tracking-wider mb-1.5 transition-colors ${
                  isDark ? 'text-emerald-300' : 'text-slate-700'
                }`}
              >
                USERNAME PENGGUNA
              </label>
              <div className="relative">
                <div
                  className={`absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none transition-colors ${
                    isDark ? 'text-emerald-400/70' : 'text-slate-400'
                  }`}
                >
                  <User className="w-4 h-4" />
                </div>
                <input
                  id="login-username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Masukkan username Anda"
                  required
                  autoCapitalize="none"
                  autoComplete="username"
                  className={`w-full rounded-xl pl-10 pr-3.5 py-2.5 sm:py-3 text-[13px] sm:text-[14px] font-medium border transition-all duration-150 focus:outline-none focus:ring-2 ${
                    isDark
                      ? 'bg-[#071322] border-[#1E3048] text-white placeholder-slate-500 focus:border-emerald-500 focus:ring-emerald-500/25'
                      : 'bg-slate-50/80 border-slate-300 text-slate-900 placeholder-slate-400 focus:bg-white focus:border-emerald-600 focus:ring-emerald-500/20'
                  }`}
                />
              </div>
            </div>

            {/* Field 2: KATA SANDI */}
            <div>
              <label
                htmlFor="login-password"
                className={`block text-[11.5px] sm:text-[12px] font-bold uppercase tracking-wider mb-1.5 transition-colors ${
                  isDark ? 'text-emerald-300' : 'text-slate-700'
                }`}
              >
                KATA SANDI
              </label>
              <div className="relative">
                <div
                  className={`absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none transition-colors ${
                    isDark ? 'text-emerald-400/70' : 'text-slate-400'
                  }`}
                >
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan kata sandi"
                  required
                  autoComplete="current-password"
                  className={`w-full rounded-xl pl-10 pr-10 py-2.5 sm:py-3 text-[13px] sm:text-[14px] font-medium border transition-all duration-150 focus:outline-none focus:ring-2 ${
                    isDark
                      ? 'bg-[#071322] border-[#1E3048] text-white placeholder-slate-500 focus:border-emerald-500 focus:ring-emerald-500/25'
                      : 'bg-slate-50/80 border-slate-300 text-slate-900 placeholder-slate-400 focus:bg-white focus:border-emerald-600 focus:ring-emerald-500/20'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className={`absolute inset-y-0 right-0 pr-3.5 flex items-center transition-colors cursor-pointer ${
                    isDark
                      ? 'text-slate-400 hover:text-emerald-300'
                      : 'text-slate-400 hover:text-emerald-700'
                  }`}
                  aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                  title={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* INGAT SAYA (Persistent Session) */}
            <div className="flex items-center justify-between pt-1">
              <label htmlFor="remember-me" className="flex items-start gap-2.5 cursor-pointer select-none">
                <input
                  id="remember-me"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className={`mt-0.5 w-4 h-4 rounded cursor-pointer accent-emerald-600 focus:ring-emerald-500 ${
                    isDark
                      ? 'border-[#1E3048] bg-[#071322]'
                      : 'border-slate-300 bg-white'
                  }`}
                />
                <div className="flex flex-col">
                  <span
                    className={`text-[12.5px] font-semibold transition-colors ${
                      isDark ? 'text-slate-200' : 'text-slate-800'
                    }`}
                  >
                    Ingat Saya
                  </span>
                  <span
                    className={`text-[10.5px] transition-colors ${
                      isDark ? 'text-slate-400' : 'text-slate-500'
                    }`}
                  >
                    Tetap masuk di perangkat ini
                  </span>
                </div>
              </label>

              <span
                className={`hidden sm:inline-flex items-center gap-1 text-[11px] font-semibold transition-colors ${
                  isDark ? 'text-emerald-400' : 'text-emerald-700'
                }`}
              >
                <ShieldCheck
                  className={`w-3.5 h-3.5 ${
                    isDark ? 'text-[#F4B942]' : 'text-amber-600'
                  }`}
                />
                <span>Terlindungi</span>
              </span>
            </div>

            {/* ============================================================ */}
            {/* 5. TOMBOL MASUK */}
            {/* ============================================================ */}
            <button
              id="btn-submit-login"
              type="submit"
              disabled={isLoading}
              className={`w-full mt-3 h-[44px] sm:h-[48px] flex items-center justify-center gap-2 px-4 rounded-xl text-white font-bold text-[13px] sm:text-[14px] transition-all cursor-pointer active:scale-[0.99] disabled:opacity-60 ${
                isDark
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-lg shadow-emerald-950/60'
                  : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-md shadow-emerald-600/25'
              }`}
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Masuk ke SIMKA.ID</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* ============================================================ */}
          {/* 6. PILIHAN TEMA TERANG / GELAP (KECIL, RAPI, MUDAH DITEMUKAN) */}
          {/* ============================================================ */}
          <div
            className={`mt-6 pt-4 border-t flex flex-col sm:flex-row items-center justify-between gap-2.5 transition-colors ${
              isDark ? 'border-[#1E3048]/80' : 'border-slate-200'
            }`}
          >
            <div className="flex items-center gap-1.5 text-[11.5px] font-medium text-slate-500 dark:text-slate-400">
              <span>Tema Tampilan</span>
            </div>

            {/* Segmented Control for Light / Dark Mode */}
            <div
              className={`inline-flex items-center p-1 rounded-xl border transition-colors shadow-xs ${
                isDark
                  ? 'bg-[#071322] border-[#1E3048]'
                  : 'bg-slate-100 border-slate-200'
              }`}
              role="radiogroup"
              aria-label="Pilih Tema Login"
            >
              <button
                type="button"
                onClick={() => setThemeMode('light')}
                role="radio"
                aria-checked={!isDark}
                title="Aktifkan Tema Terang"
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  !isDark
                    ? 'bg-white text-emerald-700 shadow-xs border border-slate-200'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-[#0E1A2D]'
                }`}
              >
                <Sun className={`w-3.5 h-3.5 shrink-0 ${!isDark ? 'text-amber-500' : 'text-slate-400'}`} />
                <span>Terang</span>
              </button>

              <button
                type="button"
                onClick={() => setThemeMode('dark')}
                role="radio"
                aria-checked={isDark}
                title="Aktifkan Tema Gelap"
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  isDark
                    ? 'bg-[#13233D] text-emerald-400 shadow-xs border border-emerald-500/30'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/60'
                }`}
              >
                <Moon className={`w-3.5 h-3.5 shrink-0 ${isDark ? 'text-emerald-400' : 'text-slate-500'}`} />
                <span>Gelap</span>
              </button>
            </div>
          </div>
        </main>
      </div>

      {/* ============================================================ */}
      {/* FOOTER LOGIN */}
      {/* ============================================================ */}
      <footer
        className={`w-full text-center text-[11px] sm:text-[12px] py-4 space-y-0.5 z-10 transition-colors ${
          isDark ? 'text-slate-400' : 'text-slate-500'
        }`}
      >
        <p
          className={`font-semibold transition-colors ${
            isDark ? 'text-slate-300' : 'text-slate-700'
          }`}
        >
          SIMKA.ID Pro V1 &bull; Dikelola Oleh Bidang Akhlak dan Karakter
        </p>
        <p>
          Kepesantrenan Nurul Islam Tengaran
        </p>
      </footer>
    </div>
  );
};
