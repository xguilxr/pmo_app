import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, Navigate } from 'react-router-dom';
import { FolderKanban, Globe, Eye, EyeOff, Loader2, Sun, Moon } from 'lucide-react';
import { login, isAuthenticated } from '../services/auth';
import { useTheme } from '../context/ThemeContext';

export default function LoginPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { isDark, toggleTheme } = useTheme();

  if (isAuthenticated()) {
    return <Navigate to="/" replace />;
  }

  const [userOrEmail, setUserOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userOrEmail || !password) {
      setError(t('login.invalidCredentials'));
      return;
    }
    setLoading(true);
    setError('');
    try {
      await login(userOrEmail, password);
      navigate('/');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error de autenticacion';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const toggleLang = () => {
    i18n.changeLanguage(i18n.language === 'es' ? 'en' : 'es');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-[#0c0e1c]">
      {/* Background gradient orbs */}
      <div className="absolute top-[-30%] left-[-15%] w-[700px] h-[700px] rounded-full bg-gradient-to-br from-indigo-600/15 to-transparent blur-3xl" />
      <div className="absolute bottom-[-30%] right-[-15%] w-[700px] h-[700px] rounded-full bg-gradient-to-tl from-violet-600/10 to-transparent blur-3xl" />
      <div className="absolute top-[40%] left-[50%] w-[400px] h-[400px] rounded-full bg-indigo-500/5 blur-3xl" />

      {/* Grid pattern overlay */}
      <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.5) 1px, transparent 1px)', backgroundSize: '32px 32px' }} />

      {/* Top controls */}
      <div className="absolute top-5 right-5 flex items-center gap-2">
        <button
          onClick={toggleTheme}
          className="flex items-center justify-center w-9 h-9 rounded-xl text-white/30 hover:text-white/60 hover:bg-white/5 transition-all"
        >
          {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
        <button
          onClick={toggleLang}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] text-white/30 hover:text-white/60 hover:bg-white/5 transition-all font-light"
        >
          <Globe className="w-4 h-4" />
          {i18n.language === 'es' ? 'English' : 'Espanol'}
        </button>
      </div>

      <div className="w-full max-w-[400px] relative z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl btn-gradient mb-5">
            <FolderKanban className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-medium text-white tracking-tight">PMO Platform</h1>
          <p className="text-white/30 text-[13px] mt-1.5 font-light">{t('login.title')}</p>
        </div>

        {/* Login card */}
        <form onSubmit={handleLogin} className="rounded-2xl border border-white/[0.06] bg-white/[0.04] backdrop-blur-xl p-8 space-y-5 shadow-2xl shadow-black/20">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-[13px] rounded-xl px-4 py-3 font-light">
              {error}
            </div>
          )}

          <div>
            <label className="block text-[11px] font-normal text-white/40 uppercase tracking-widest mb-2">
              {t('login.userOrEmail')}
            </label>
            <input
              type="text"
              value={userOrEmail}
              onChange={(e) => { setUserOrEmail(e.target.value); setError(''); }}
              className="w-full border border-white/[0.08] bg-white/[0.04] rounded-xl px-4 py-3 text-[13px] text-white/90 placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent/40 transition-all font-light"
              placeholder="usuario@empresa.com"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-[11px] font-normal text-white/40 uppercase tracking-widest mb-2">
              {t('login.password')}
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(''); }}
                className="w-full border border-white/[0.08] bg-white/[0.04] rounded-xl px-4 py-3 pr-10 text-[13px] text-white/90 placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent/40 transition-all font-light"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-white/20 hover:text-white/50 transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full btn-gradient text-white rounded-xl py-3 text-[13px] font-normal tracking-wide disabled:opacity-50 transition-all"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : t('login.login')}
          </button>

          <div className="text-center">
            <button type="button" className="text-[12px] text-white/30 hover:text-accent transition-colors font-light">
              {t('login.forgotPassword')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
