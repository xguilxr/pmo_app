import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { KeyRound, Eye, EyeOff, Loader2, CheckCircle2, ShieldAlert } from 'lucide-react';
import { api } from '../services/api';

export default function ChangePasswordPage() {
  const navigate = useNavigate();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNext, setShowNext] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const policyOk = next.length >= 12 && /[A-Z]/.test(next) && /\d/.test(next);
  const matches = next.length > 0 && next === confirm;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!current || !next || !confirm) {
      setError('Completa todos los campos.');
      return;
    }
    if (!policyOk) {
      setError('La nueva contraseña no cumple la política.');
      return;
    }
    if (!matches) {
      setError('La confirmación no coincide.');
      return;
    }
    setLoading(true);
    try {
      await api.post('/auth/change-password', {
        current_password: current,
        new_password: next,
      });
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cambiar la contraseña');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="max-w-lg mx-auto mt-12 liquid-modal rounded-2xl p-8 text-center space-y-4">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-emerald-500/15">
          <CheckCircle2 className="w-7 h-7 text-emerald-400" />
        </div>
        <h2 className="text-lg font-medium">Contraseña actualizada</h2>
        <p className="text-[13px] text-text-tertiary">
          La próxima vez que inicies sesión, usa la nueva contraseña.
        </p>
        <button
          onClick={() => navigate('/')}
          className="btn-gradient text-white rounded-xl px-5 py-2.5 text-[13px] font-medium"
        >
          Ir al dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto mt-6">
      <div className="liquid-modal rounded-2xl p-8 space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-accent/15 flex items-center justify-center">
            <KeyRound className="w-5 h-5 text-accent" />
          </div>
          <div>
            <h1 className="text-[17px] font-medium">Cambiar contraseña</h1>
            <p className="text-[12px] text-text-tertiary font-light">
              La nueva clave reemplaza la actual inmediatamente.
            </p>
          </div>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-[13px] rounded-xl px-4 py-3 font-light flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[11px] font-normal text-text-tertiary uppercase tracking-widest mb-1.5">
              Contraseña actual
            </label>
            <div className="relative">
              <input
                type={showCurrent ? 'text' : 'password'}
                value={current}
                onChange={(e) => setCurrent(e.target.value)}
                className="w-full border border-border bg-surface rounded-xl px-4 py-2.5 pr-10 text-[13px] focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                className="absolute right-3 top-2.5 text-text-tertiary hover:text-text-secondary"
              >
                {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-normal text-text-tertiary uppercase tracking-widest mb-1.5">
              Nueva contraseña
            </label>
            <div className="relative">
              <input
                type={showNext ? 'text' : 'password'}
                value={next}
                onChange={(e) => setNext(e.target.value)}
                className="w-full border border-border bg-surface rounded-xl px-4 py-2.5 pr-10 text-[13px] focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all"
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowNext(!showNext)}
                className="absolute right-3 top-2.5 text-text-tertiary hover:text-text-secondary"
              >
                {showNext ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <ul className="mt-2 text-[11px] space-y-0.5 font-light">
              <li className={next.length >= 12 ? 'text-emerald-500' : 'text-text-tertiary'}>
                • Mínimo 12 caracteres
              </li>
              <li className={/[A-Z]/.test(next) ? 'text-emerald-500' : 'text-text-tertiary'}>
                • Al menos una mayúscula
              </li>
              <li className={/\d/.test(next) ? 'text-emerald-500' : 'text-text-tertiary'}>
                • Al menos un dígito
              </li>
            </ul>
          </div>

          <div>
            <label className="block text-[11px] font-normal text-text-tertiary uppercase tracking-widest mb-1.5">
              Confirmar nueva contraseña
            </label>
            <input
              type={showNext ? 'text' : 'password'}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="w-full border border-border bg-surface rounded-xl px-4 py-2.5 text-[13px] focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all"
              autoComplete="new-password"
            />
            {confirm.length > 0 && !matches && (
              <p className="text-[11px] text-red-400 mt-1 font-light">No coincide con la nueva contraseña.</p>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="px-4 py-2.5 text-[13px] font-medium text-text-secondary hover:text-text-primary"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !policyOk || !matches}
              className="btn-gradient text-white rounded-xl px-5 py-2.5 text-[13px] font-medium disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
