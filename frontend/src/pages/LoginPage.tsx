import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { FolderKanban, Globe, Eye, EyeOff } from 'lucide-react';
import { useBranding } from '../context/BrandingContext';

export default function LoginPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { branding, colors } = useBranding();
  const [userOrEmail, setUserOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // Mock login — accept anything
    if (userOrEmail && password) {
      navigate('/');
    } else {
      setError(t('login.invalidCredentials'));
    }
  };

  const toggleLang = () => {
    i18n.changeLanguage(i18n.language === 'es' ? 'en' : 'es');
  };

  return (
    <div className={`min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center p-4`}>
      <div className="absolute top-4 right-4">
        <button
          onClick={toggleLang}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-gray-500 hover:bg-white/80 transition-colors"
        >
          <Globe className="w-4 h-4" />
          {i18n.language === 'es' ? 'English' : 'Español'}
        </button>
      </div>

      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl ${colors.bg600} mb-4`}>
            {branding.logoUrl ? (
              <img src={branding.logoUrl} alt={branding.logoText} className="w-10 h-10 object-contain" />
            ) : (
              <FolderKanban className="w-8 h-8 text-white" />
            )}
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{branding.logoText}</h1>
          <p className="text-gray-500 mt-1">{t('login.title')}</p>
        </div>

        <form onSubmit={handleLogin} className="bg-white rounded-2xl border border-gray-200 shadow-lg p-8 space-y-5">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-3">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              {t('login.userOrEmail')}
            </label>
            <input
              type="text"
              value={userOrEmail}
              onChange={(e) => { setUserOrEmail(e.target.value); setError(''); }}
              className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              placeholder="usuario@empresa.com"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              {t('login.password')}
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(''); }}
                className="w-full border border-gray-200 rounded-lg px-4 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className={`w-full ${colors.bg600} text-white rounded-lg py-2.5 text-sm font-medium ${colors.hover700} transition-colors focus:outline-none focus:ring-2 ${colors.ring} focus:ring-offset-2`}
          >
            {t('login.login')}
          </button>

          <div className="text-center">
            <button type="button" className={`text-sm ${colors.text600} hover:opacity-80 transition-colors`}>
              {t('login.forgotPassword')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
