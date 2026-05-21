/**
 * Page de verification de l'email du Representant legal via lien magique.
 * URL : /verification-rl?token=...
 */
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import * as authApi from '@/api/auth.api';
import { ROUTES } from '@/utils/constants';

type Status = 'loading' | 'success' | 'error';

export default function VerifyRLEmailPage() {
  const [params] = useSearchParams();
  const token = params.get('token');
  const [status, setStatus] = useState<Status>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Lien invalide : aucun jeton fourni.');
      return;
    }
    let cancelled = false;
    (async () => {
      const res = await authApi.verifyRLEmail(token);
      if (cancelled) return;
      setStatus(res.ok ? 'success' : 'error');
      setMessage(res.message);
    })();
    return () => { cancelled = true; };
  }, [token]);

  return (
    <div className="text-center py-6">
      {status === 'loading' && (
        <>
          <Loader2 className="w-14 h-14 text-orange-500 mx-auto mb-4 animate-spin" />
          <h2 className="text-xl font-bold mb-2">Vérification en cours...</h2>
        </>
      )}
      {status === 'success' && (
        <>
          <CheckCircle2 className="w-14 h-14 text-green-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Email vérifié</h2>
          <p className="text-sm text-gray-700 mb-4">{message}</p>
          <p className="text-sm text-gray-500 mb-6">
            L'ARTCI poursuivra la vérification de votre dossier d'inscription.
            Vous recevrez vos identifiants par email après validation.
          </p>
        </>
      )}
      {status === 'error' && (
        <>
          <XCircle className="w-14 h-14 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Vérification impossible</h2>
          <p className="text-sm text-gray-700 mb-6">{message}</p>
        </>
      )}
      <Link to={ROUTES.LOGIN} className="btn btn-outline inline-block no-underline">
        Retour à la connexion
      </Link>
    </div>
  );
}
