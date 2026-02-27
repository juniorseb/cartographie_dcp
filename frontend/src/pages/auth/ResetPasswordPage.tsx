import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { KeyRound } from 'lucide-react';
import PasswordInput from '@/components/auth/PasswordInput';
import * as authApi from '@/api/auth.api';
import { ROUTES } from '@/utils/constants';

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const emailFromState = (location.state as { email?: string })?.email ?? '';

  const [email, setEmail] = useState(emailFromState);
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (newPassword !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }
    if (newPassword.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères.');
      return;
    }

    setIsLoading(true);
    try {
      await authApi.resetPassword(email, code, newPassword);
      setSuccess(true);
      setTimeout(() => navigate(ROUTES.LOGIN, { replace: true }), 2000);
    } catch {
      setError('Code invalide ou expiré.');
    } finally {
      setIsLoading(false);
    }
  }

  if (success) {
    return (
      <div className="text-center">
        <div className="alert alert-success mb-4">
          Mot de passe réinitialisé avec succès ! Redirection...
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-center mb-4">
        <KeyRound className="w-12 h-12 text-[var(--artci-orange)]" />
      </div>
      <h2 className="text-xl font-bold text-center mb-1" style={{ color: 'var(--artci-black)' }}>
        Réinitialiser le mot de passe
      </h2>
      <p className="text-sm text-gray-500 text-center mb-6">
        Entrez le code reçu par email et votre nouveau mot de passe.
      </p>

      {error && <div className="alert alert-danger mb-4">{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="rp_email">Email</label>
          <input
            id="rp_email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="votre@email.com"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="rp_code">Code OTP</label>
          <input
            id="rp_code"
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="Code à 6 chiffres"
            required
            maxLength={6}
            inputMode="numeric"
          />
        </div>

        <div className="form-group">
          <label htmlFor="rp_new_password">Nouveau mot de passe</label>
          <PasswordInput
            id="rp_new_password"
            value={newPassword}
            onChange={setNewPassword}
            placeholder="Min. 8 caractères"
            autoComplete="new-password"
          />
        </div>

        <div className="form-group">
          <label htmlFor="rp_confirm_password">Confirmation</label>
          <PasswordInput
            id="rp_confirm_password"
            value={confirmPassword}
            onChange={setConfirmPassword}
            placeholder="Confirmez le mot de passe"
            autoComplete="new-password"
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
            'Réinitialiser'
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
