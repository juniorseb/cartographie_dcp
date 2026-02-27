import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { LogIn } from 'lucide-react';
import PasswordInput from '@/components/auth/PasswordInput';
import { useAuth } from '@/hooks/useAuth';
import { ROUTES } from '@/utils/constants';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isLoading } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || ROUTES.ENTREPRISE_DASHBOARD;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    try {
      await login(email, password, 'entreprise');
      navigate(from, { replace: true });
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
    </div>
  );
}
