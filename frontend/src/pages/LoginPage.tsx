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
      const msg = err instanceof Error ? err.message : 'Error de autenticación';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const toggleLang = () => {
    i18n.changeLanguage(i18n.language === 'es' ? 'en' : 'es');
  };

  return (
    <div className="min-h-screen bg-surface-secondary flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background gradient orbs */}
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-accent/5 blur-3xl" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-accent/5 blur-3xl" />

      {/* Top controls */}
      <div className="absolute top-4 right-4 flex items-center gap-2">
        <button
          onClick={toggleTheme}
          className="flex items-center justify-center w-9 h-9 rounded-xl text-text-tertiary hover:bg-surface-hover transition-all"
        >
          {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
        <button
          onClick={toggleLang}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[13px] text-text-tertiary hover:bg-surface-hover transition-all"
        >
          <Globe className="w-4 h-4" />
          {i18n.language === 'es' ? 'English' : 'Español'}
        </button>
      </div>

      <div className="w-full max-w-[400px] relative z-10">
        {/* Logo section */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-accent shadow-lg shadow-accent/25 mb-4">
            <FolderKanban className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-text-primary tracking-tight">PMO Platform</h1>
          <p className="text-text-tertiary text-[13px] mt-1">{t('login.title')}</p>
        </div>

        {/* Login form */}
        <form onSubmit={handleLogin} className="bg-surface rounded-2xl border border-border shadow-xl shadow-black/5 dark:shadow-black/20 p-8 space-y-5">
          {error && (
            <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-[13px] rounded-xl px-4 py-3 font-medium">
              {error}
            </div>
          )}

          <div>
            <label className="block text-[12px] font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
              {t('login.userOrEmail')}
            </label>
            <input
              type="text"
              value={userOrEmail}
              onChange={(e) => { setUserOrEmail(e.target.value); setError(''); }}
              className="w-full border border-border bg-surface rounded-xl px-4 py-2.5 text-[13px] text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all"
              placeholder="usuario@empresa.com"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-[12px] font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
              {t('login.password')}
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(''); }}
                className="w-full border border-border bg-surface rounded-xl px-4 py-2.5 pr-10 text-[13px] text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5 text-text-tertiary hover:text-text-secondary transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-accent text-white rounded-xl py-2.5 text-[13px] font-semibold hover:bg-accent-hover transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-accent/30 focus:ring-offset-2 focus:ring-offset-surface disabled:opacity-50 shadow-sm shadow-accent/25"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : t('login.login')}
          </button>

          <div className="text-center">
            <button type="button" className="text-[13px] text-accent hover:opacity-80 transition-colors font-medium">
              {t('login.forgotPassword')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
