import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import OTPInput from '@/components/auth/OTPInput';
import * as authApi from '@/api/auth.api';
import { ROUTES } from '@/utils/constants';

export default function VerifyOTPPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as { email?: string; type?: string } | null;

  const email = state?.email ?? '';
  const type = state?.type ?? 'inscription';

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  async function handleComplete(code: string) {
    setError('');
    setIsLoading(true);

    try {
      await authApi.verifyOTP({ email, code, type });
      setSuccess(true);
      setTimeout(() => {
        navigate(ROUTES.LOGIN, { replace: true });
      }, 2000);
    } catch {
      setError('Code invalide ou expiré. Veuillez réessayer.');
    } finally {
      setIsLoading(false);
    }
  }

  if (!email) {
    return (
      <div className="text-center">
        <p className="text-gray-500 mb-4">Aucun email fourni.</p>
        <Link to={ROUTES.REGISTER} className="text-[var(--artci-orange)] hover:underline">
          Retour à l'inscription
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-center mb-4">
        <ShieldCheck className="w-12 h-12 text-[var(--artci-orange)]" />
      </div>
      <h2 className="text-xl font-bold text-center mb-1" style={{ color: 'var(--artci-black)' }}>
        Vérification OTP
      </h2>
      <p className="text-sm text-gray-500 text-center mb-6">
        Entrez le code à 6 chiffres envoyé à <strong>{email}</strong>
      </p>

      {error && <div className="alert alert-danger mb-4">{error}</div>}
      {success && (
        <div className="alert alert-success mb-4">
          Email vérifié avec succès ! Redirection vers la connexion...
        </div>
      )}

      <OTPInput onComplete={handleComplete} disabled={isLoading || success} />

      <p className="text-xs text-gray-400 text-center mt-4">
        Le code expire dans 10 minutes.
      </p>
    </div>
  );
}
