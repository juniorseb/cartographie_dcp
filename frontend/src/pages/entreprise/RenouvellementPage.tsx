import { useState } from 'react';
import { RefreshCw, CheckCircle, FileText, FilePlus2, Lock } from 'lucide-react';
import * as entrepriseApi from '@/api/entreprise.api';
import { cn } from '@/utils/cn';

type Tab = 'renouvellement' | 'autorisation' | 'declaration';

export default function FormalitesPage() {
  const [tab, setTab] = useState<Tab>('renouvellement');
  const [motif, setMotif] = useState('');
  const [dateExpiration, setDateExpiration] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Pour la version courante : Autorisation et Déclaration restent grisés
  // tant que l'ARTCI n'a pas répondu à la demande initiale.
  const autorisationActive = false;
  const declarationActive = false;

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

  function TabBtn({
    value, label, icon: Icon, disabled,
  }: { value: Tab; label: string; icon: typeof RefreshCw; disabled?: boolean }) {
    const active = tab === value;
    return (
      <button
        onClick={() => !disabled && setTab(value)}
        disabled={disabled}
        className={cn(
          'flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors',
          active && !disabled
            ? 'border-[var(--artci-green)] text-[var(--artci-green)]'
            : 'border-transparent text-gray-500 hover:text-gray-700',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      >
        <Icon className="w-4 h-4" />
        {label}
        {disabled && <Lock className="w-3 h-3" />}
      </button>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl mb-2">Formalités</h1>
      <p className="text-sm text-gray-500 mb-6">
        Gérez vos formalités auprès de l'ARTCI : renouvellement, demandes d'autorisation et déclarations.
      </p>

      <div className="card">
        <div className="flex border-b border-gray-200 mb-6 overflow-x-auto">
          <TabBtn value="renouvellement" label="Renouvellement" icon={RefreshCw} />
          <TabBtn value="autorisation" label="Autorisation" icon={FilePlus2} disabled={!autorisationActive} />
          <TabBtn value="declaration" label="Déclaration" icon={FileText} disabled={!declarationActive} />
        </div>

        {tab === 'renouvellement' && (
          <>
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
          </>
        )}

        {tab === 'autorisation' && (
          <div className="text-center py-10 text-gray-500">
            <FilePlus2 className="w-10 h-10 mx-auto mb-3 text-gray-300" />
            <p className="text-sm">
              Les demandes d'autorisation (transfert de données, traitement de données sensibles,
              changement de DPO, etc.) seront activées par l'ARTCI selon votre dossier.
            </p>
          </div>
        )}

        {tab === 'declaration' && (
          <div className="text-center py-10 text-gray-500">
            <FileText className="w-10 h-10 mx-auto mb-3 text-gray-300" />
            <p className="text-sm">
              Les déclarations seront activées par l'ARTCI selon le retour donné à votre dossier.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
