import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { KeyRound, AlertTriangle } from 'lucide-react';
import PasswordInput from '@/components/auth/PasswordInput';
import * as authApi from '@/api/auth.api';
import { ROUTES } from '@/utils/constants';

export default function ChangePasswordPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as { forced?: boolean; reason?: string } | null;
  const forced = !!state?.forced;
  const reason = state?.reason;
  const [currentPassword, setCurrentPassword] = useState('');
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
      await authApi.changePassword(currentPassword, newPassword);
      setSuccess(true);
      setTimeout(() => navigate(ROUTES.ENTREPRISE_DASHBOARD, { replace: true }), 2000);
    } catch {
      setError('Mot de passe actuel incorrect.');
    } finally {
      setIsLoading(false);
    }
  }

  if (success) {
    return (
      <div className="max-w-md mx-auto mt-10">
        <div className="card">
          <div className="alert alert-success">
            Mot de passe changé avec succès ! Redirection...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto mt-10">
      <div className="card card-orange">
        <div className="flex justify-center mb-4">
          <KeyRound className="w-10 h-10 text-[var(--artci-orange)]" />
        </div>
        <h2 className="text-xl font-bold text-center mb-1" style={{ color: 'var(--artci-black)' }}>
          Changer le mot de passe
        </h2>
        <p className="text-sm text-gray-500 text-center mb-6">
          {reason === 'must_change'
            ? "Première connexion : vous devez changer le mot de passe initial reçu par email."
            : reason === 'expired'
              ? "Votre mot de passe a expiré, veuillez le renouveler."
              : "Votre mot de passe a expiré ou vous souhaitez le modifier."}
        </p>

        {forced && (
          <div className="alert alert-warning mb-4 flex items-start gap-2 text-sm">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <div>
              {reason === 'must_change'
                ? "Pour des raisons de sécurité, vous devez définir votre propre mot de passe avant d'accéder à la plateforme."
                : "Vous devez renouveler votre mot de passe avant de continuer."}
            </div>
          </div>
        )}

        {error && <div className="alert alert-danger mb-4">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="cp_current">Mot de passe actuel</label>
            <PasswordInput
              id="cp_current"
              value={currentPassword}
              onChange={setCurrentPassword}
              placeholder="Mot de passe actuel"
            />
          </div>

          <div className="form-group">
            <label htmlFor="cp_new">Nouveau mot de passe</label>
            <PasswordInput
              id="cp_new"
              value={newPassword}
              onChange={setNewPassword}
              placeholder="Min. 8 caractères"
              autoComplete="new-password"
            />
          </div>

          <div className="form-group">
            <label htmlFor="cp_confirm">Confirmation</label>
            <PasswordInput
              id="cp_confirm"
              value={confirmPassword}
              onChange={setConfirmPassword}
              placeholder="Confirmez"
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
              'Changer le mot de passe'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
