import { useState } from 'react';
import { RefreshCw, CheckCircle } from 'lucide-react';
import * as entrepriseApi from '@/api/entreprise.api';

export default function RenouvellementPage() {
  const [motif, setMotif] = useState('');
  const [dateExpiration, setDateExpiration] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    try {
      const result = await entrepriseApi.demanderRenouvellement({
        motif: motif || undefined,
        date_expiration_agrement: dateExpiration || undefined,
      });
      setSuccess(`Demande de renouvellement créée (statut : ${result.statut}).`);
      setMotif('');
      setDateExpiration('');
    } catch {
      setError('Erreur lors de la demande de renouvellement. Vérifiez que vous êtes conforme.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl mb-6">Renouvellement</h1>

      <div className="card card-green">
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
          <RefreshCw className="w-5 h-5 text-[var(--artci-green)]" />
          Demande de renouvellement
        </h3>

        <div className="alert alert-info mb-4">
          Cette fonctionnalité est réservée aux entités ayant le statut « Conforme ».
        </div>

        {error && <div className="alert alert-danger mb-4">{error}</div>}
        {success && (
          <div className="alert alert-success mb-4 flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="date_expiration">Date d'expiration de l'agrément</label>
            <input
              id="date_expiration"
              type="date"
              value={dateExpiration}
              onChange={(e) => setDateExpiration(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label htmlFor="motif">Motif (optionnel)</label>
            <textarea
              id="motif"
              value={motif}
              onChange={(e) => setMotif(e.target.value)}
              placeholder="Décrivez le motif de votre demande de renouvellement..."
              rows={4}
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
                <RefreshCw className="w-4 h-4" />
                Soumettre la demande
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
