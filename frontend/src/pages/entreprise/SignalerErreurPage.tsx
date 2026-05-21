/**
 * Page entreprise : signaler une erreur sur sa fiche/dossier.
 * Le signalement est transmis aux Super Administrateurs ARTCI.
 */
import { useState } from 'react';
import { AlertTriangle, Send, CheckCircle2, Clock } from 'lucide-react';
import { useApi } from '@/hooks/useApi';
import * as entrepriseApi from '@/api/entreprise.api';
import type { SignalementErreurItem } from '@/api/entreprise.api';
import Loading from '@/components/common/Loading';

const STATUT_LABELS: Record<SignalementErreurItem['statut'], { label: string; className: string }> = {
  open: { label: 'En attente', className: 'bg-yellow-100 text-yellow-800' },
  in_progress: { label: 'En cours de traitement', className: 'bg-blue-100 text-blue-800' },
  resolved: { label: 'Résolu', className: 'bg-green-100 text-green-800' },
  dismissed: { label: 'Rejeté', className: 'bg-gray-200 text-gray-700' },
};

const RUBRIQUES = [
  'Identification',
  'Cadre juridique',
  'Registre & traitements',
  'Sous-traitance & transferts',
  'Sécurité & formation',
  'Score / Niveau de conformité',
  'Publication sur la carte',
  'Autre',
];

export default function SignalerErreurPage() {
  const [sujet, setSujet] = useState('');
  const [rubrique, setRubrique] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const { data: signalements, isLoading, refetch } = useApi(
    () => entrepriseApi.listMesSignalements(),
    []
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!sujet.trim() || !description.trim()) {
      setFeedback({ type: 'error', msg: 'Sujet et description sont obligatoires.' });
      return;
    }
    setSubmitting(true);
    setFeedback(null);
    try {
      await entrepriseApi.creerSignalement({
        sujet: sujet.trim(),
        description: description.trim(),
        rubrique_concernee: rubrique || undefined,
      });
      setFeedback({ type: 'success', msg: 'Signalement transmis aux Super Administrateurs ARTCI.' });
      setSujet('');
      setRubrique('');
      setDescription('');
      refetch();
    } catch {
      setFeedback({ type: 'error', msg: "Une erreur est survenue lors de l'envoi du signalement." });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto pb-12">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-1 flex items-center gap-3">
          <AlertTriangle className="w-7 h-7 text-orange-500" />
          Signaler une erreur
        </h1>
        <p className="text-sm text-gray-600">
          Un Super Administrateur ARTCI examinera votre signalement et vous fournira une réponse dans cet espace.
        </p>
      </div>

      {feedback && (
        <div className={`alert mb-4 ${feedback.type === 'success' ? 'alert-success' : 'alert-danger'}`}>
          {feedback.msg}
        </div>
      )}

      <form onSubmit={handleSubmit} className="card mb-8">
        <div className="form-group">
          <label htmlFor="sujet">Sujet *</label>
          <input
            id="sujet"
            type="text"
            value={sujet}
            onChange={(e) => setSujet(e.target.value)}
            placeholder="Ex : Score de conformité incorrect"
            maxLength={255}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="rubrique">Rubrique concernée</label>
          <select
            id="rubrique"
            value={rubrique}
            onChange={(e) => setRubrique(e.target.value)}
          >
            <option value="">— Sélectionnez (optionnel) —</option>
            {RUBRIQUES.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="description">Description détaillée *</label>
          <textarea
            id="description"
            rows={6}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Décrivez précisément l'erreur observée et les éléments concernés..."
            required
          />
        </div>

        <button type="submit" disabled={submitting} className="btn btn-primary flex items-center gap-2">
          {submitting ? (
            <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
          ) : (
            <Send className="w-4 h-4" />
          )}
          Envoyer le signalement
        </button>
      </form>

      {/* Historique des signalements */}
      <div>
        <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
          <Clock className="w-5 h-5 text-gray-600" />
          Mes signalements
        </h2>

        {isLoading ? (
          <Loading text="Chargement..." />
        ) : !signalements || signalements.length === 0 ? (
          <div className="card text-center text-sm text-gray-500 py-8">
            Vous n'avez pas encore envoyé de signalement.
          </div>
        ) : (
          <div className="space-y-3">
            {signalements.map((s) => {
              const statutInfo = STATUT_LABELS[s.statut];
              return (
                <div key={s.id} className="card">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <h3 className="font-semibold text-sm">{s.sujet}</h3>
                    <span className={`text-xs px-2 py-1 rounded font-medium ${statutInfo.className}`}>
                      {statutInfo.label}
                    </span>
                  </div>
                  {s.rubrique_concernee && (
                    <p className="text-xs text-gray-500 mb-2">Rubrique : {s.rubrique_concernee}</p>
                  )}
                  <p className="text-sm text-gray-700 whitespace-pre-wrap mb-2">{s.description}</p>
                  <p className="text-xs text-gray-400">
                    Soumis le {s.createdAt ? new Date(s.createdAt).toLocaleString('fr-FR') : '-'}
                  </p>
                  {s.reponse_admin && (
                    <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded">
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-700 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-semibold text-green-800 mb-1">Réponse de l'ARTCI</p>
                          <p className="text-sm text-green-900 whitespace-pre-wrap">{s.reponse_admin}</p>
                          {s.date_traitement && (
                            <p className="text-xs text-green-700 mt-2">
                              Le {new Date(s.date_traitement).toLocaleString('fr-FR')}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
