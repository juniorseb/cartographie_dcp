/**
 * Commentaires ancres par rubrique (modele PR §6.3).
 *
 * - Affichage groupe par rubrique (Partie 1..5)
 * - Action AGENT : creer un nouveau commentaire ancre, resoudre un commentaire
 * - Reponse entreprise visible si presente
 * - Etat open / resolved tres visible (couleurs, icones)
 */
import { useState, useCallback } from 'react';
import {
  MessageCircle, Plus, CheckCircle2, Clock, X as XIcon, Reply, Pencil,
} from 'lucide-react';
import { useApi } from '@/hooks/useApi';
import { useAuth } from '@/hooks/useAuth';
import * as adminApi from '@/api/admin.api';
import type { CommentaireDossierItem } from '@/api/admin.api';

const RUBRIQUES_TRAITER = [
  { key: 'identification', label: 'Partie 1 — Identification' },
  { key: 'cadre_juridique', label: 'Partie 2 — Cadre juridique' },
  { key: 'registre', label: 'Partie 3 — Registre & traitements' },
  { key: 'sous_traitance_transferts', label: 'Partie 4 — Sous-traitance & transferts' },
  { key: 'securite', label: 'Partie 5 — Sécurité & formation' },
];

interface CommentairesAncresProps {
  entiteId: string;
  /** Si true (mode lecture seule), pas d'ajout ni de resolution. */
  readOnly?: boolean;
  /** Callback en cas de modification (parent peut recharger les compteurs). */
  onChange?: () => void;
}

export default function CommentairesAncres({
  entiteId, readOnly, onChange,
}: CommentairesAncresProps) {
  const { user } = useAuth();
  const currentUserId = user?.id;

  const [filter, setFilter] = useState<'all' | 'open' | 'resolved'>('all');
  const fetcher = useCallback(
    () => adminApi.listCommentaires(entiteId, filter === 'all' ? undefined : { etat: filter }),
    [entiteId, filter]
  );
  const { data: commentaires, isLoading, refetch } = useApi(fetcher, [entiteId, filter]);

  const [openRubrique, setOpenRubrique] = useState<string | null>(null);
  const [newContenu, setNewContenu] = useState('');
  const [newSousQuestion, setNewSousQuestion] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Threads : id du commentaire auquel on est en train de repondre
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');

  // Edition : id du commentaire en cours d'edition
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  const list: CommentaireDossierItem[] = commentaires ?? [];
  const openCount = list.filter((c) => c.etat === 'open').length;

  // Construction des threads : un commentaire racine + ses reponses (parent_id)
  const racines = list.filter((c) => !c.parent_id);
  const reponsesParParent: Record<string, CommentaireDossierItem[]> = {};
  list.forEach((c) => {
    if (c.parent_id) {
      reponsesParParent[c.parent_id] = reponsesParParent[c.parent_id] ?? [];
      reponsesParParent[c.parent_id].push(c);
    }
  });

  const groupes = RUBRIQUES_TRAITER.map((r) => ({
    ...r,
    items: racines.filter((c) => c.rubrique === r.key),
  }));

  async function handleAdd(rubrique: string) {
    if (!newContenu.trim()) {
      setError('Contenu requis.');
      return;
    }
    setSaving(true); setError('');
    try {
      await adminApi.addCommentaire(entiteId, {
        rubrique,
        sous_question: newSousQuestion.trim() || undefined,
        contenu: newContenu.trim(),
      });
      setNewContenu(''); setNewSousQuestion('');
      setOpenRubrique(null);
      refetch();
      onChange?.();
    } catch {
      setError("Erreur lors de l'ajout du commentaire.");
    } finally { setSaving(false); }
  }

  async function handleResolve(commentaireId: string) {
    try {
      await adminApi.resoudreCommentaire(commentaireId);
      refetch();
      onChange?.();
    } catch {
      setError('Erreur lors de la résolution.');
    }
  }

  async function handleReply(parentId: string, rubrique: string) {
    if (!replyText.trim()) return;
    try {
      await adminApi.addCommentaire(entiteId, {
        rubrique,
        contenu: replyText.trim(),
        parent_id: parentId,
      });
      setReplyText('');
      setReplyingToId(null);
      refetch();
      onChange?.();
    } catch {
      setError("Erreur lors de l'envoi de la réponse.");
    }
  }

  async function handleEdit(commentaireId: string) {
    if (!editText.trim()) return;
    try {
      await adminApi.editerCommentaire(commentaireId, editText.trim());
      setEditingId(null);
      setEditText('');
      refetch();
    } catch {
      setError("Erreur lors de l'édition.");
    }
  }

  return (
    <div className="card mb-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <MessageCircle className="w-5 h-5 text-[var(--brand-primary)]" />
          Commentaires ancrés
          {openCount > 0 && (
            <span className="text-xs font-medium bg-orange-100 text-orange-800 px-2 py-0.5 rounded">
              {openCount} ouvert(s)
            </span>
          )}
        </h2>
        <div className="inline-flex rounded border border-gray-200 bg-white overflow-hidden text-xs">
          {(['all', 'open', 'resolved'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-2 py-1 font-medium transition-colors ${
                filter === f
                  ? 'bg-[var(--brand-secondary)] text-white'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              {f === 'all' ? 'Tous' : f === 'open' ? 'Ouverts' : 'Résolus'}
            </button>
          ))}
        </div>
      </div>

      {error && <div className="alert alert-danger mb-3 text-xs">{error}</div>}

      {isLoading ? (
        <p className="text-sm text-gray-500">Chargement…</p>
      ) : (
        <div className="space-y-3">
          {groupes.map((g) => (
            <div key={g.key} className="border border-gray-200 rounded">
              <div className="flex items-center justify-between p-3 bg-gray-50 border-b border-gray-200">
                <span className="font-semibold text-sm">{g.label}</span>
                <div className="flex items-center gap-2">
                  {g.items.length > 0 && (
                    <span className="text-xs text-gray-500">
                      {g.items.filter((c) => c.etat === 'open').length} ouvert(s) /
                      {' '}{g.items.length} total
                    </span>
                  )}
                  {!readOnly && (
                    <button
                      onClick={() => setOpenRubrique(openRubrique === g.key ? null : g.key)}
                      className="btn btn-outline text-xs flex items-center gap-1 px-2 py-1"
                    >
                      <Plus className="w-3 h-3" /> Commenter
                    </button>
                  )}
                </div>
              </div>

              {openRubrique === g.key && !readOnly && (
                <div className="p-3 bg-orange-50 border-b border-orange-100">
                  <input
                    type="text"
                    placeholder="Sous-question / champ visé (optionnel, ex: dpo.dpo_habilite)"
                    value={newSousQuestion}
                    onChange={(e) => setNewSousQuestion(e.target.value)}
                    className="w-full text-xs mb-2"
                  />
                  <textarea
                    rows={3}
                    placeholder="Votre commentaire ancré sur cette rubrique…"
                    value={newContenu}
                    onChange={(e) => setNewContenu(e.target.value)}
                    className="w-full text-sm mb-2"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => { setOpenRubrique(null); setNewContenu(''); setNewSousQuestion(''); }}
                      className="btn btn-outline text-xs px-3 py-1"
                    >
                      Annuler
                    </button>
                    <button
                      onClick={() => handleAdd(g.key)}
                      disabled={saving}
                      className="btn btn-primary text-xs px-3 py-1"
                    >
                      {saving ? '…' : 'Ajouter'}
                    </button>
                  </div>
                </div>
              )}

              {g.items.length === 0 ? (
                <div className="p-3 text-xs text-gray-400 italic">
                  Aucun commentaire sur cette rubrique.
                </div>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {g.items.map((c) => {
                    const replies = reponsesParParent[c.id] ?? [];
                    const canEdit = !readOnly && c.etat === 'open' && c.agent_id === currentUserId;
                    const isResolved = c.etat === 'resolved';
                    return (
                      <li key={c.id} className={`p-3 ${isResolved ? 'opacity-70' : ''}`}>
                        <CommentBlock
                          c={c}
                          isReply={false}
                          canResolve={!readOnly && c.etat === 'open'}
                          canEdit={canEdit}
                          editing={editingId === c.id}
                          editText={editText}
                          onStartEdit={() => { setEditingId(c.id); setEditText(c.contenu); }}
                          onCancelEdit={() => { setEditingId(null); setEditText(''); }}
                          onSaveEdit={() => handleEdit(c.id)}
                          onChangeEdit={setEditText}
                          onResolve={() => handleResolve(c.id)}
                        />
                        {/* Thread de reponses */}
                        {replies.length > 0 && (
                          <div className="ml-6 mt-2 border-l-2 border-gray-200 pl-3 space-y-2">
                            {replies.map((reply) => {
                              const replyCanEdit = !readOnly && reply.etat === 'open' && reply.agent_id === currentUserId;
                              return (
                                <CommentBlock
                                  key={reply.id}
                                  c={reply}
                                  isReply
                                  canResolve={false}
                                  canEdit={replyCanEdit}
                                  editing={editingId === reply.id}
                                  editText={editText}
                                  onStartEdit={() => { setEditingId(reply.id); setEditText(reply.contenu); }}
                                  onCancelEdit={() => { setEditingId(null); setEditText(''); }}
                                  onSaveEdit={() => handleEdit(reply.id)}
                                  onChangeEdit={setEditText}
                                />
                              );
                            })}
                          </div>
                        )}
                        {/* Champ de reponse */}
                        {!readOnly && (
                          replyingToId === c.id ? (
                            <div className="ml-6 mt-2 p-2 bg-gray-50 border border-gray-200 rounded">
                              <textarea
                                rows={2}
                                value={replyText}
                                onChange={(e) => setReplyText(e.target.value)}
                                placeholder="Votre réponse en thread…"
                                className="w-full text-xs mb-2"
                              />
                              <div className="flex justify-end gap-2">
                                <button
                                  onClick={() => { setReplyingToId(null); setReplyText(''); }}
                                  className="btn btn-outline text-xs px-2 py-0.5"
                                >
                                  Annuler
                                </button>
                                <button
                                  onClick={() => handleReply(c.id, c.rubrique)}
                                  disabled={!replyText.trim()}
                                  className="btn btn-primary text-xs px-2 py-0.5"
                                >
                                  Répondre
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button
                              onClick={() => { setReplyingToId(c.id); setReplyText(''); }}
                              className="ml-6 mt-1 text-[10px] text-gray-500 hover:text-[var(--brand-primary)] flex items-center gap-1"
                            >
                              <Reply className="w-3 h-3" /> Répondre
                            </button>
                          )
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Garde-fou convergence rappele a l'agent */}
      {openCount > 0 && !readOnly && (
        <div className="alert alert-warning mt-4 text-xs flex items-start gap-2">
          <XIcon className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>
            <strong>{openCount} commentaire(s) ouvert(s)</strong> — la convergence n'est pas atteinte.
            Vous ne pourrez pas soumettre ce traitement à validation N+1 tant que tous les
            commentaires ne sont pas résolus (ou retournés à l'entreprise).
          </span>
        </div>
      )}
    </div>
  );
}

interface CommentBlockProps {
  c: CommentaireDossierItem;
  isReply: boolean;
  canResolve: boolean;
  canEdit: boolean;
  editing: boolean;
  editText: string;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSaveEdit: () => void;
  onChangeEdit: (v: string) => void;
  onResolve?: () => void;
}

function CommentBlock({
  c, isReply, canResolve, canEdit, editing,
  editText, onStartEdit, onCancelEdit, onSaveEdit, onChangeEdit, onResolve,
}: CommentBlockProps) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          {!isReply && (
            c.etat === 'open' ? (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-orange-100 text-orange-800">
                <Clock className="w-3 h-3" /> Open
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-green-100 text-green-800">
                <CheckCircle2 className="w-3 h-3" /> Resolved
              </span>
            )
          )}
          {!isReply && c.sous_question && (
            <span className="text-[10px] text-gray-500 font-mono bg-gray-100 px-1.5 py-0.5 rounded">
              {c.sous_question}
            </span>
          )}
          <span className="text-[10px] text-gray-400">
            {c.agent_nom ?? '?'}
            {c.auteur_role && (
              <span className="ml-1 text-gray-300">({c.auteur_role})</span>
            )}
            {' · '}
            {c.cree_le ? new Date(c.cree_le).toLocaleString('fr-FR') : '-'}
            {c.edited_at && (
              <span className="italic ml-1">· édité {new Date(c.edited_at).toLocaleString('fr-FR')}</span>
            )}
          </span>
        </div>
        {editing ? (
          <div>
            <textarea
              rows={3}
              value={editText}
              onChange={(e) => onChangeEdit(e.target.value)}
              className="w-full text-sm mb-2"
            />
            <div className="flex justify-end gap-2">
              <button onClick={onCancelEdit} className="btn btn-outline text-xs px-2 py-0.5">
                Annuler
              </button>
              <button
                onClick={onSaveEdit}
                disabled={!editText.trim()}
                className="btn btn-primary text-xs px-2 py-0.5"
              >
                Enregistrer
              </button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-800 whitespace-pre-wrap">{c.contenu}</p>
        )}

        {!isReply && c.reponse_entreprise && (
          <div className="mt-2 p-2 bg-blue-50 border-l-2 border-blue-400 rounded">
            <p className="text-[10px] font-semibold text-blue-800 mb-0.5">
              Réponse de l'entreprise
              {c.repondu_le && (
                <span className="font-normal text-blue-600 ml-1">
                  · {new Date(c.repondu_le).toLocaleString('fr-FR')}
                </span>
              )}
            </p>
            <p className="text-xs text-blue-900 whitespace-pre-wrap">{c.reponse_entreprise}</p>
          </div>
        )}
      </div>
      <div className="flex flex-col gap-1 flex-shrink-0">
        {canEdit && !editing && (
          <button
            onClick={onStartEdit}
            className="text-[10px] text-gray-500 hover:text-[var(--brand-primary)] flex items-center gap-1"
            title="Éditer (auteur uniquement, avant résolution)"
          >
            <Pencil className="w-3 h-3" /> Éditer
          </button>
        )}
        {canResolve && onResolve && (
          <button
            onClick={onResolve}
            className="btn btn-outline text-xs flex items-center gap-1 px-2 py-1 text-green-700 border-green-200 hover:bg-green-50"
            title="Marquer comme résolu (action agent uniquement)"
          >
            <CheckCircle2 className="w-3.5 h-3.5" /> Résoudre
          </button>
        )}
      </div>
    </div>
  );
}
