import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LogIn, Shield } from 'lucide-react';
import PasswordInput from '@/components/auth/PasswordInput';
import { useAuth } from '@/hooks/useAuth';
import { ROUTES } from '@/utils/constants';
import logoArtci from '@/assets/logo_artci.png';

export default function AdminLoginPage() {
  const navigate = useNavigate();
  const { login, isLoading } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    try {
      await login(email, password, 'artci');
      navigate(ROUTES.ADMIN_DASHBOARD, { replace: true });
    } catch {
      setError('Identifiants incorrects.');
    }
  }

  return (
    <div className="min-h-screen bg-[var(--artci-gray-light)] flex flex-col items-center justify-center p-4">
      <Link to="/" className="mb-8 flex items-center gap-3 no-underline">
        <img src={logoArtci} alt="ARTCI" className="w-12 h-12 object-contain" />
        <div>
          <div className="font-bold text-lg text-[var(--artci-black)]">ARTCI</div>
          <div className="text-sm text-gray-500">Administration</div>
        </div>
      </Link>

      <div className="card w-full max-w-md" style={{ borderTop: '4px solid var(--artci-green)' }}>
        <div className="flex items-center gap-2 justify-center mb-1">
          <Shield className="w-5 h-5 text-[var(--artci-green)]" />
          <h2 className="text-xl font-bold text-center" style={{ color: 'var(--artci-black)' }}>
            Espace Administration
          </h2>
        </div>
        <p className="text-sm text-gray-500 text-center mb-6">
          Réservé au personnel ARTCI
        </p>

        {error && <div className="alert alert-danger mb-4">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="admin-email">Adresse email</label>
            <input
              id="admin-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="prenom.nom@artci.ci"
              required
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <label htmlFor="admin-password">Mot de passe</label>
            <PasswordInput
              id="admin-password"
              value={password}
              onChange={setPassword}
              placeholder="Votre mot de passe"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="btn btn-secondary w-full flex items-center justify-center gap-2"
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
          <Link to={ROUTES.LOGIN} className="text-[var(--artci-orange)] hover:underline">
            Espace Entreprise
          </Link>
        </p>
      </div>
    </div>
  );
}
