import { useState } from 'react';
import { Link2, Send, Clock, Upload } from 'lucide-react';
import { useApi } from '@/hooks/useApi';
import * as entrepriseApi from '@/api/entreprise.api';
import Loading from '@/components/common/Loading';
import ErrorDisplay from '@/components/common/ErrorDisplay';
import EmptyState from '@/components/common/EmptyState';
import { formatDate } from '@/utils/format';

interface RapprochementItem {
  id: string;
  numero_cc: string;
  raison: string;
  statut: 'en_attente' | 'approuve' | 'rejete';
  createdAt: string;
  commentaire_admin?: string;
}

const STATUT_CONFIG: Record<string, { label: string; className: string }> = {
  en_attente: { label: 'En attente', className: 'badge badge-encours' },
  approuve: { label: 'Approuvé', className: 'badge badge-conforme' },
  rejete: { label: 'Rejeté', className: 'badge badge-rejete' },
};

export default function RapprochementPage() {
  const [numeroCc, setNumeroCc] = useState('');
  const [raison, setRaison] = useState('');
  const [justificatif, setJustificatif] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const {
    data: rapprochements,
    isLoading,
    error: fetchError,
    refetch,
  } = useApi(
    () => entrepriseApi.getRapprochements() as Promise<RapprochementItem[]>,
    []
  );

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setJustificatif(file);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!numeroCc.trim()) {
      setError('Veuillez renseigner le numéro de compte contribuable.');
      return;
    }
    if (!raison.trim()) {
      setError('Veuillez expliquer la raison de votre demande.');
      return;
    }

    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const formData = new FormData();
      formData.append('numero_cc', numeroCc);
      formData.append('raison', raison);
      if (justificatif) {
        formData.append('justificatif', justificatif);
      }
      await entrepriseApi.createRapprochement(formData);
      setSuccess('Demande de rapprochement envoyée avec succès.');
      setNumeroCc('');
      setRaison('');
      setJustificatif(null);
      refetch();
    } catch {
      setError('Erreur lors de l\'envoi de la demande. Veuillez réessayer.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl mb-6 flex items-center gap-3">
        <Link2 className="w-7 h-7 text-[var(--artci-green)]" />
        Rapprochement
      </h1>

      {/* Explanation */}
      <div className="card card-green mb-6">
        <h3 className="text-lg font-bold mb-2">Qu'est-ce que le rapprochement ?</h3>
        <p className="text-sm text-gray-600">
          Le rapprochement vous permet de relier votre compte utilisateur à une entité
          déjà enregistrée dans le système par l'ARTCI. Si votre entreprise a été saisie
          lors d'un import ou par un agent ARTCI, vous pouvez demander à être rattaché(e)
          à cette fiche en fournissant le numéro de compte contribuable ainsi qu'un
          justificatif (extrait K-bis, attestation, etc.).
        </p>
      </div>

      {/* Form */}
      <div className="card mb-6">
        <h3 className="text-lg font-bold mb-4">Nouvelle demande de rapprochement</h3>

        {error && <div className="alert alert-danger mb-4">{error}</div>}
        {success && <div className="alert alert-success mb-4">{success}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="numero_cc">Numéro de Compte Contribuable *</label>
            <input
              id="numero_cc"
              type="text"
              value={numeroCc}
              onChange={(e) => setNumeroCc(e.target.value)}
              placeholder="Ex : CI-2024-00001"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="raison">Raison de la demande *</label>
            <textarea
              id="raison"
              value={raison}
              onChange={(e) => setRaison(e.target.value)}
              placeholder="Expliquez pourquoi vous souhaitez être rattaché(e) à cette entité..."
              rows={4}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="justificatif">Justificatif (optionnel)</label>
            <input
              id="justificatif"
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={handleFileChange}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-[var(--artci-green)] file:text-white hover:file:opacity-80 cursor-pointer"
            />
            <p className="text-xs text-gray-400 mt-1">
              Formats acceptés : PDF, JPG, PNG. Taille max : 5 Mo.
            </p>
          </div>

          {justificatif && (
            <p className="text-sm text-gray-500 mb-4 flex items-center gap-2">
              <Upload className="w-4 h-4" />
              Fichier sélectionné : <strong>{justificatif.name}</strong> ({(justificatif.size / 1024).toFixed(1)} Ko)
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="btn btn-primary w-full flex items-center justify-center gap-2"
          >
            {submitting ? (
              <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
            ) : (
              <>
                <Send className="w-4 h-4" />
                Envoyer la demande
              </>
            )}
          </button>
        </form>
      </div>

      {/* Existing requests */}
      <div>
        <h2 className="text-xl font-bold mb-4">Mes demandes</h2>

        {isLoading && <Loading text="Chargement des demandes..." />}
        {fetchError && <ErrorDisplay message={fetchError} onRetry={refetch} />}

        {!isLoading && !fetchError && (!rapprochements || rapprochements.length === 0) ? (
          <EmptyState
            title="Aucune demande"
            description="Vous n'avez soumis aucune demande de rapprochement pour le moment."
            icon={Link2}
          />
        ) : (
          !isLoading &&
          !fetchError &&
          rapprochements && (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>N° Compte Contribuable</th>
                    <th>Raison</th>
                    <th>Statut</th>
                    <th>Commentaire admin</th>
                  </tr>
                </thead>
                <tbody>
                  {rapprochements.map((r) => {
                    const config = STATUT_CONFIG[r.statut] ?? {
                      label: r.statut,
                      className: 'badge',
                    };
                    return (
                      <tr key={r.id}>
                        <td className="text-sm whitespace-nowrap">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-gray-400" />
                            {formatDate(r.createdAt)}
                          </span>
                        </td>
                        <td className="text-sm font-mono">{r.numero_cc}</td>
                        <td className="text-sm text-gray-700">{r.raison}</td>
                        <td>
                          <span className={config.className}>{config.label}</span>
                        </td>
                        <td className="text-sm text-gray-500">
                          {r.commentaire_admin || '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>
    </div>
  );
}
