/**
 * Commentaires ARTCI ancres - vue entreprise (modele PR §6.3).
 *
 * - Affichage groupe par rubrique
 * - L'entreprise peut REPONDRE au commentaire (mais ne peut pas le resoudre :
 *   seul l'agent ARTCI peut marquer 'resolved')
 * - Place a integrer en haut du formulaire MonEnregistrementPage quand le
 *   dossier est en attente de complements (degrise apres retour ARTCI)
 */
import { useState, useCallback } from 'react';
import {
  MessageCircle, Clock, CheckCircle2, Send, ChevronDown,
} from 'lucide-react';
import { useApi } from '@/hooks/useApi';
import * as entrepriseApi from '@/api/entreprise.api';
import type { CommentaireEntrepriseItem } from '@/api/entreprise.api';

const RUBRIQUES_LABELS: Record<string, string> = {
  identification: 'Partie 1 — Identification',
  cadre_juridique: 'Partie 2 — Cadre juridique',
  registre: 'Partie 3 — Registre & traitements',
  sous_traitance_transferts: 'Partie 4 — Sous-traitance & transferts',
  securite: 'Partie 5 — Sécurité & formation',
};

export default function CommentairesARTCI() {
  const fetcher = useCallback(() => entrepriseApi.listMesCommentaires(), []);
  const { data, isLoading, refetch } = useApi(fetcher, []);

  const [reponses, setReponses] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  if (isLoading) return null;
  if (!data || data.total_open === 0 && Object.keys(data.rubriques).length === 0) {
    return null; // Rien a afficher
  }

  async function handleRepondre(c: CommentaireEntrepriseItem) {
    const reponse = reponses[c.id]?.trim();
    if (!reponse) return;
    setSavingId(c.id);
    try {
      await entrepriseApi.repondreCommentaire(c.id, reponse);
      setReponses((prev) => ({ ...prev, [c.id]: '' }));
      refetch();
    } catch {
      // silent : on n'interrompt pas la frappe
    } finally { setSavingId(null); }
  }

  const totalOpen = data.total_open;

  return (
    <details
      open={totalOpen > 0}
      className="border-2 border-orange-300 bg-orange-50 rounded mb-6"
    >
      <summary className="cursor-pointer p-4 flex items-center gap-3">
        <MessageCircle className="w-5 h-5 text-orange-600 flex-shrink-0" />
        <div className="flex-1">
          <h3 className="font-bold text-base text-orange-900">
            Commentaires de l'ARTCI
          </h3>
          <p className="text-xs text-orange-800 mt-0.5">
            {totalOpen > 0 ? (
              <><strong>{totalOpen}</strong> commentaire(s) à traiter avant de re-soumettre votre dossier.</>
            ) : (
              "Tous les commentaires ont été résolus par l'ARTCI."
            )}
          </p>
        </div>
        <ChevronDown className="w-4 h-4 text-orange-600" />
      </summary>

      <div className="p-4 pt-0 space-y-3">
        {Object.entries(data.rubriques).map(([rubKey, items]) => (
          <div key={rubKey} className="border border-orange-200 rounded bg-white">
            <p className="px-3 py-2 bg-orange-100 text-xs font-bold text-orange-900 border-b border-orange-200">
              {RUBRIQUES_LABELS[rubKey] ?? rubKey}
            </p>
            <ul className="divide-y divide-gray-100">
              {items.map((c) => (
                <li key={c.id} className="p-3">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    {c.etat === 'open' ? (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-orange-100 text-orange-800">
                        <Clock className="w-3 h-3" /> À traiter
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-green-100 text-green-800">
                        <CheckCircle2 className="w-3 h-3" /> Résolu par l'ARTCI
                      </span>
                    )}
                    <span className="text-[10px] text-gray-400">
                      {c.agent_nom ?? 'ARTCI'} · {c.cree_le ? new Date(c.cree_le).toLocaleString('fr-FR') : '-'}
                    </span>
                  </div>
                  {c.sous_question && (
                    <p className="text-[10px] text-gray-500 font-mono mb-1">
                      Champ : {c.sous_question}
                    </p>
                  )}
                  <p className="text-sm text-gray-800 whitespace-pre-wrap mb-2">
                    {c.contenu}
                  </p>

                  {/* Reponse existante */}
                  {c.reponse_entreprise && (
                    <div className="p-2 bg-blue-50 border-l-2 border-blue-400 rounded mb-2">
                      <p className="text-[10px] font-semibold text-blue-800">
                        Votre réponse
                        {c.repondu_le && (
                          <span className="font-normal text-blue-600 ml-1">
                            · {new Date(c.repondu_le).toLocaleString('fr-FR')}
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-blue-900 whitespace-pre-wrap">
                        {c.reponse_entreprise}
                      </p>
                    </div>
                  )}

                  {/* Champ de reponse (si commentaire toujours open) */}
                  {c.etat === 'open' && (
                    <div className="flex gap-2 items-end">
                      <textarea
                        rows={2}
                        placeholder="Répondre à ce commentaire (optionnel - n'oubliez pas de corriger la rubrique)…"
                        value={reponses[c.id] ?? ''}
                        onChange={(e) => setReponses((prev) => ({ ...prev, [c.id]: e.target.value }))}
                        className="flex-1 text-xs"
                      />
                      <button
                        onClick={() => handleRepondre(c)}
                        disabled={savingId === c.id || !reponses[c.id]?.trim()}
                        className="btn btn-outline text-xs flex items-center gap-1 px-2 py-1"
                      >
                        <Send className="w-3 h-3" />
                        {savingId === c.id ? '…' : 'Répondre'}
                      </button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
        <p className="text-[10px] text-orange-700 italic mt-2">
          Note : seul l'agent ARTCI peut marquer un commentaire comme résolu après vérification.
        </p>
      </div>
    </details>
  );
}
