import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, Navigate, Link } from 'react-router-dom';
import { FolderKanban, ArrowLeft, Loader2, Mail, CheckCircle2 } from 'lucide-react';
import { isAuthenticated } from '../services/auth';
import { api } from '../services/api';

export default function ForgotPasswordPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  if (isAuthenticated()) {
    return <Navigate to="/" replace />;
  }

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError(t('forgotPassword.emailRequired'));
      return;
    }
    setLoading(true);
    setError('');
    try {
      await api.post('/auth/password-reset-request', { email });
      setSubmitted(true);
    } catch {
      // Always show success to avoid disclosing whether the email exists
      setSubmitted(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-[#132a4a]">
      <div className="absolute top-[-30%] left-[-15%] w-[700px] h-[700px] rounded-full bg-gradient-to-br from-blue-500/15 to-transparent blur-3xl" />
      <div className="absolute bottom-[-30%] right-[-15%] w-[700px] h-[700px] rounded-full bg-gradient-to-tl from-blue-600/10 to-transparent blur-3xl" />
      <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.5) 1px, transparent 1px)', backgroundSize: '32px 32px' }} />

      <div className="w-full max-w-[400px] relative z-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl btn-gradient mb-5">
            <FolderKanban className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-medium text-white tracking-tight">{t('forgotPassword.title')}</h1>
          <p className="text-white/30 text-[13px] mt-1.5 font-light">{t('forgotPassword.subtitle')}</p>
        </div>

        <div className="liquid-glass-border rounded-2xl p-8 space-y-5" style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(20px) saturate(180%)', boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.08), 0 8px 40px rgba(0,0,0,0.2)' }}>
          {submitted ? (
            <div className="text-center space-y-4 py-4">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-emerald-500/15">
                <CheckCircle2 className="w-7 h-7 text-emerald-400" />
              </div>
              <p className="text-[13px] text-white/80 font-light leading-relaxed">
                Registramos tu solicitud. El envío automático por correo aún no está habilitado;
                contacta al administrador de tu organización para recibir una contraseña temporal.
                Una vez dentro, podés cambiarla desde el menú de usuario.
              </p>
              <button onClick={() => navigate('/login')} className="w-full btn-gradient text-white rounded-xl py-3 text-[13px] font-medium tracking-wide transition-all">
                {t('forgotPassword.backToLogin')}
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <p className="text-[12px] text-white/50 font-light leading-relaxed">
                Ingresá tu correo. Tu administrador recibirá la alerta y podrá reiniciar tu contraseña desde el panel de usuarios.
              </p>

              {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-[13px] rounded-xl px-4 py-3 font-light">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-[11px] font-normal text-white/40 uppercase tracking-widest mb-2">
                  {t('forgotPassword.email')}
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 w-4 h-4 text-white/30" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setError(''); }}
                    className="w-full border border-white/[0.08] bg-white/[0.04] rounded-xl pl-10 pr-4 py-3 text-[13px] text-white/90 placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent/40 transition-all font-light"
                    placeholder="usuario@empresa.com"
                    autoFocus
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full btn-gradient text-white rounded-xl py-3 text-[13px] font-medium tracking-wide disabled:opacity-50 transition-all"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : t('forgotPassword.sendLink')}
              </button>

              <Link to="/login" className="flex items-center justify-center gap-2 text-[12px] text-white/30 hover:text-accent transition-colors font-light">
                <ArrowLeft className="w-3.5 h-3.5" />
                {t('forgotPassword.backToLogin')}
              </Link>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
