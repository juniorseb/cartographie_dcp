import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail } from 'lucide-react';
import * as authApi from '@/api/auth.api';
import { ROUTES } from '@/utils/constants';

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);

    try {
      await authApi.forgotPassword(email);
      setSent(true);
    } catch {
      // On affiche le succès même en erreur (anti-énumération)
      setSent(true);
    } finally {
      setIsLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="text-center">
        <Mail className="w-12 h-12 text-[var(--artci-orange)] mx-auto mb-4" />
        <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--artci-black)' }}>
          Email envoyé
        </h2>
        <p className="text-sm text-gray-500 mb-6">
          Si un compte existe avec l'adresse <strong>{email}</strong>, un code de réinitialisation a été envoyé.
        </p>
        <button
          className="btn btn-primary w-full mb-4"
          onClick={() => navigate(ROUTES.RESET_PASSWORD, { state: { email } })}
        >
          J'ai reçu le code
        </button>
        <Link to={ROUTES.LOGIN} className="text-sm text-[var(--artci-orange)] hover:underline">
          Retour à la connexion
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-xl font-bold text-center mb-1" style={{ color: 'var(--artci-black)' }}>
        Mot de passe oublié
      </h2>
      <p className="text-sm text-gray-500 text-center mb-6">
        Entrez votre adresse email pour recevoir un code de réinitialisation.
      </p>

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="fp_email">Adresse email</label>
          <input
            id="fp_email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="votre@email.com"
            required
            autoComplete="email"
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="btn btn-primary w-full flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <div className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }} />
          ) : (
            'Envoyer le code'
          )}
        </button>
      </form>

      <p className="text-sm text-center mt-6">
        <Link to={ROUTES.LOGIN} className="text-[var(--artci-orange)] hover:underline">
          Retour à la connexion
        </Link>
      </p>
    </div>
  );
}
