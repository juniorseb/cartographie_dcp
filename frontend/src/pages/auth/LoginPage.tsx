import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { LogIn, Info, Copy, Check } from 'lucide-react';
import PasswordInput from '@/components/auth/PasswordInput';
import { useAuth } from '@/hooks/useAuth';
import { ROUTES } from '@/utils/constants';

const TEST_ACCOUNTS = [
  { email: 'entrepriseA@test.ci', label: 'Entreprise A' },
  { email: 'entrepriseB@test.ci', label: 'Entreprise B' },
  { email: 'entrepriseC@test.ci', label: 'Entreprise C' },
  { email: 'entrepriseD@test.ci', label: 'Entreprise D' },
];
const TEST_PASSWORD = 'Test@1234';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isLoading } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);

  function fillTestAccount(testEmail: string) {
    setEmail(testEmail);
    setPassword(TEST_PASSWORD);
    setError('');
  }

  async function copyToClipboard(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedEmail(label);
      setTimeout(() => setCopiedEmail(null), 1500);
    } catch {
      // ignore
    }
  }

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || ROUTES.ENTREPRISE_DASHBOARD;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    try {
      const result = await login(email, password, 'entreprise');
      if (result?.password_must_change || result?.password_expired) {
        navigate(ROUTES.ENTREPRISE_CHANGE_PASSWORD, {
          replace: true,
          state: { forced: true, reason: result?.password_must_change ? 'must_change' : 'expired' },
        });
      } else {
        navigate(from, { replace: true });
      }
    } catch {
      setError('Email ou mot de passe incorrect.');
    }
  }

  return (
    <div>
      <h2 className="text-xl font-bold text-center mb-1" style={{ color: 'var(--artci-black)' }}>
        Connexion
      </h2>
      <p className="text-sm text-gray-500 text-center mb-6">
        Accédez à votre espace entreprise
      </p>

      {error && <div className="alert alert-danger mb-4">{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="email">Adresse email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="votre@email.com"
            required
            autoComplete="email"
          />
        </div>

        <div className="form-group">
          <label htmlFor="password">Mot de passe</label>
          <PasswordInput
            id="password"
            value={password}
            onChange={setPassword}
            placeholder="Votre mot de passe"
          />
        </div>

        <div className="flex justify-end mb-4">
          <Link
            to={ROUTES.FORGOT_PASSWORD}
            className="text-sm text-[var(--artci-orange)] hover:underline"
          >
            Mot de passe oublié ?
          </Link>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="btn btn-primary w-full flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <div className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }} />
          ) : (
            <>
              <LogIn className="w-4 h-4" />
              Se connecter
            </>
          )}
        </button>
      </form>

      <p className="text-sm text-center mt-6 text-gray-500">
        Pas encore de compte ?{' '}
        <Link to={ROUTES.REGISTER} className="text-[var(--artci-orange)] font-semibold hover:underline">
          S'inscrire
        </Link>
      </p>

      {/* Comptes de test (visibles uniquement en mode developpement / demo) */}
      <div className="mt-6 p-3 bg-gray-50 border border-dashed border-gray-300 rounded">
        <div className="flex items-center gap-2 mb-2">
          <Info className="w-4 h-4 text-gray-500" />
          <span className="text-xs font-semibold text-gray-700">Comptes entreprise de test</span>
        </div>
        <div className="text-xs text-gray-500 mb-2">
          Mot de passe commun : <code className="bg-white px-1 py-0.5 rounded border">{TEST_PASSWORD}</code>
          <button
            type="button"
            onClick={() => copyToClipboard(TEST_PASSWORD, 'pwd')}
            className="ml-2 text-gray-400 hover:text-gray-700 align-middle"
            title="Copier le mot de passe"
          >
            {copiedEmail === 'pwd' ? <Check className="inline w-3 h-3 text-green-500" /> : <Copy className="inline w-3 h-3" />}
          </button>
        </div>
        <div className="grid grid-cols-2 gap-1">
          {TEST_ACCOUNTS.map((acc) => (
            <button
              key={acc.email}
              type="button"
              onClick={() => fillTestAccount(acc.email)}
              className="text-xs text-left px-2 py-1 bg-white border border-gray-200 rounded hover:border-[var(--artci-orange)] hover:bg-orange-50 transition-colors"
              title={`Pré-remplir avec ${acc.email}`}
            >
              <span className="font-semibold text-gray-700">{acc.label}</span>
              <span className="block text-gray-500 truncate">{acc.email}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
