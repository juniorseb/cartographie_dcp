/**
 * Page "Traiter un dossier" pour l'editeur/admin (spec §6 reunion 07/05).
 *
 * 7 etapes :
 * 1. Reception du dossier (formulaire complet + score auto)
 * 2. Commentaires par rubrique
 * 3. Verification documentaire
 * 4. Saisie du score final (manuel) + niveau conformite calcule auto
 * 5. Recommandations
 * 6. Soumission pour validation N+1
 * 7. (cote validateur) Approuve ou Retourne
 */
import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Save, Send, MessageSquare, CheckCircle, XCircle, AlertTriangle, Award, BookOpen, ChevronDown } from 'lucide-react';
import * as adminApi from '@/api/admin.api';
import Loading from '@/components/common/Loading';
import { useAuth } from '@/hooks/useAuth';
import { hasMinRole } from '@/components/admin/AdminSidebar';
import { ROUTES } from '@/utils/constants';
import { cn } from '@/utils/cn';
import type { Traitement } from '@/api/admin.api';
import CommentairesAncres from '@/components/admin/CommentairesAncres';
import RevisionsDiff from '@/components/admin/RevisionsDiff';
import DossierAuditTrail from '@/components/admin/DossierAuditTrail';

const RUBRIQUES = [
  { key: 'identification', label: 'Partie 1 — Identification de l\'entité' },
  { key: 'cadre_juridique', label: 'Partie 2 — Cadre juridique et conformité administrative' },
  { key: 'registre', label: 'Partie 3 — Registre et cartographie des traitements' },
  { key: 'sous_traitance_transferts', label: 'Partie 4 — Sous-traitance et transfert' },
  { key: 'securite', label: 'Partie 5 — Sécurité et formation' },
];

function getNiveauColor(niveau: string | null): string {
  if (!niveau) return 'badge';
  const low = niveau.toLowerCase();
  if (low.includes('non conforme')) return 'badge badge-encours';
  if (low.includes('partiellement') || low.includes('démarche') || low.includes('demarche'))
    return 'badge badge-achevee';
  if (low.includes('conforme')) return 'badge badge-conforme';
  return 'badge';
}

export default function TraiterDossierPage() {
  const { entiteId } = useParams<{ entiteId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdminPlus = user && hasMinRole(user.role, 'admin');

  const [traitement, setTraitement] = useState<Traitement | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [validatingDecision, setValidatingDecision] = useState<'approuve' | 'retourne' | null>(null);
  const [motifRetour, setMotifRetour] = useState('');

  // Etat local pour les commentaires et le score (debounced save)
  const [commentaires, setCommentaires] = useState<Record<string, string>>({});
  const [scoreManuel, setScoreManuel] = useState<number>(0);
  const [recommandations, setRecommandations] = useState('');

  useEffect(() => {
    if (!entiteId) return;
    setLoading(true);
    adminApi.commencerTraiter(entiteId)
      .then((t) => {
        setTraitement(t);
        setCommentaires(t.commentaires_par_rubrique ?? {});
        setScoreManuel(t.score_manuel ?? 0);
        setRecommandations(t.recommandations ?? '');
      })
      .catch(() => setError("Impossible de charger le traitement."))
      .finally(() => setLoading(false));
  }, [entiteId]);

  async function handleSave() {
    if (!traitement) return;
    setSaving(true); setError(''); setSuccess('');
    try {
      const updated = await adminApi.updateTraitement(traitement.id, {
        commentaires_par_rubrique: commentaires,
        score_manuel: scoreManuel,
        recommandations,
      });
      setTraitement(updated);
      setSuccess('Brouillon sauvegardé.');
    } catch {
      setError("Erreur lors de la sauvegarde.");
    } finally { setSaving(false); }
  }

  async function handleSubmit() {
    if (!traitement) return;
    if (!window.confirm('Soumettre ce traitement pour validation N+1 ?')) return;
    setSubmitting(true); setError(''); setSuccess('');
    try {
      // sauvegarder d'abord puis soumettre
      await adminApi.updateTraitement(traitement.id, {
        commentaires_par_rubrique: commentaires,
        score_manuel: scoreManuel,
        recommandations,
      });
      const t = await adminApi.soumettreTraitement(traitement.id);
      setTraitement(t);
      setSuccess('Traitement soumis pour validation.');
    } catch {
      setError("Erreur lors de la soumission.");
    } finally { setSubmitting(false); }
  }

  async function handleValider(decision: 'approuve' | 'retourne') {
    if (!traitement) return;
    if (decision === 'retourne' && !motifRetour.trim()) {
      setError('Motif requis pour retourner le dossier.');
      return;
    }
    setValidatingDecision(decision);
    setError('');
    try {
      const t = await adminApi.validerTraitement(traitement.id, decision, motifRetour || undefined);
      setTraitement(t);
      setSuccess(decision === 'approuve' ? 'Traitement approuvé.' : 'Dossier retourné à l\'entreprise.');
    } catch {
      setError("Erreur lors de la décision.");
    } finally { setValidatingDecision(null); }
  }

  if (loading) return <Loading fullPage text="Chargement du dossier..." />;
  if (!traitement) return <div className="p-6">{error || 'Traitement introuvable.'}</div>;

  const isReadOnly = traitement.statut !== 'en_cours';
  const showValidation = isAdminPlus && traitement.statut === 'soumis_validation';

  return (
    <div className="max-w-5xl mx-auto pb-12">
      <Link
        to={ROUTES.ADMIN_PANIER}
        className="inline-flex items-center gap-2 text-[var(--artci-green)] hover:underline text-sm mb-4"
      >
        <ArrowLeft className="w-4 h-4" /> Retour au panier
      </Link>

      <div className="card mb-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold">{traitement.entite_denomination}</h1>
            <p className="text-sm text-gray-500">N° CC : {traitement.entite_numero_cc}</p>
          </div>
          <div className="text-right">
            <div className="text-xs text-gray-500 mb-1">Score automatique</div>
            <div className="text-3xl font-bold text-[var(--artci-orange)]">
              {traitement.score_automatique ?? '-'}<span className="text-lg">/100</span>
            </div>
          </div>
        </div>
      </div>

      {error && <div className="alert alert-danger mb-4">{error}</div>}
      {success && <div className="alert alert-success mb-4">{success}</div>}

      {traitement.statut === 'soumis_validation' && (
        <div className="alert alert-info mb-4">
          Ce traitement est en attente de validation N+1.
        </div>
      )}

      {traitement.statut === 'valide' && (
        <div className="alert alert-success mb-4 flex items-center gap-2">
          <CheckCircle className="w-5 h-5" /> Traitement approuvé.
        </div>
      )}

      {traitement.statut === 'retourne_entreprise' && (
        <div className="alert alert-warning mb-4">
          <strong>Dossier retourné à l'entreprise.</strong>
          {traitement.motif_retour && (
            <p className="text-sm mt-1">Motif : {traitement.motif_retour}</p>
          )}
        </div>
      )}

      {/* Historique des revisions + diff semantique (modele PR §6.2) */}
      <RevisionsDiff entiteId={traitement.entite_id} />

      {/* Audit trail global du dossier (manœuvre A) */}
      <DossierAuditTrail entiteId={traitement.entite_id} />

      {/* Commentaires ancres (modele PR) - source de verite */}
      <CommentairesAncres
        entiteId={traitement.entite_id}
        readOnly={isReadOnly}
      />

      {/* Lecture des reponses du formulaire par rubrique (vue de reference).
          Le champ commentaire ci-dessous est conserve pour retrocompat avec
          les anciens dossiers ; les nouveaux commentaires se font via le
          composant ancre ci-dessus. */}
      <div className="card mb-4">
        <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-[var(--artci-orange)]" />
          Réponses du formulaire (par rubrique)
        </h2>
        <p className="text-xs text-gray-500 mb-4">
          Vue lecture des réponses fournies par l'entreprise. Les commentaires sont à
          ajouter dans le bloc « Commentaires ancrés » ci-dessus.
        </p>
        <div className="space-y-3">
          {RUBRIQUES.map((r) => {
            const reponses = (traitement.reponses_formulaire as Record<string, unknown>)[r.key];
            const hasContent = !!(reponses && typeof reponses === 'object' && Object.keys(reponses as object).length > 0);
            return (
              <details key={r.key} className="border border-gray-200 rounded">
                <summary className="cursor-pointer p-3 hover:bg-gray-50">
                  <span className="font-semibold text-sm">{r.label}</span>
                  {hasContent && <span className="ml-2 text-xs text-green-600">✓ Renseignée</span>}
                </summary>
                <div className="p-3 border-t border-gray-100 bg-gray-50">
                  {hasContent ? (
                    <pre className="text-xs whitespace-pre-wrap text-gray-700 mb-3 max-h-64 overflow-y-auto">
                      {JSON.stringify(reponses, null, 2)}
                    </pre>
                  ) : (
                    <p className="text-xs italic text-gray-400 mb-3">Aucune réponse fournie</p>
                  )}
                  <label className="text-xs font-semibold block mb-1">Vos commentaires</label>
                  <textarea
                    rows={3}
                    value={commentaires[r.key] ?? ''}
                    onChange={(e) => setCommentaires((prev) => ({ ...prev, [r.key]: e.target.value }))}
                    placeholder="Vos remarques sur cette rubrique..."
                    disabled={isReadOnly}
                    className="w-full text-sm"
                  />
                </div>
              </details>
            );
          })}
        </div>
      </div>

      {/* Resume feedbacks consolides : tous les commentaires saisis ci-dessus */}
      {Object.values(commentaires).some((c) => c?.trim()) && (
        <div className="card mb-4">
          <details>
            <summary className="cursor-pointer font-bold text-sm flex items-center gap-2 mb-2">
              <MessageSquare className="w-4 h-4 text-[var(--artci-orange)]" />
              Vos feedbacks consolidés
              <ChevronDown className="w-3 h-3 ml-auto" />
            </summary>
            <div className="mt-3 space-y-3">
              {RUBRIQUES.map((r) => {
                const c = commentaires[r.key]?.trim();
                if (!c) return null;
                return (
                  <div key={r.key} className="border-l-2 border-orange-300 pl-3">
                    <p className="text-xs font-semibold text-gray-700 mb-1">{r.label}</p>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{c}</p>
                  </div>
                );
              })}
            </div>
          </details>
        </div>
      )}

      {/* Etape 4 : score manuel + niveau auto + grille des criteres */}
      <div className="card mb-4">
        <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
          <Award className="w-5 h-5 text-[var(--artci-green)]" />
          Score final et niveau de conformité
        </h2>

        {/* Page dediee criteres de scoring : disposee en accordion ici */}
        <details className="border border-gray-200 rounded mb-4">
          <summary className="cursor-pointer p-3 hover:bg-gray-50 flex items-center gap-2 text-sm font-semibold text-gray-700">
            <BookOpen className="w-4 h-4 text-[var(--artci-orange)]" />
            Consulter la grille des critères de scoring
          </summary>
          <div className="p-3 border-t border-gray-100 bg-gray-50 text-xs text-gray-700 space-y-2">
            <p className="font-semibold">Grille interne ARTCI (7 critères, total 100 points)</p>
            <ul className="list-disc list-inside space-y-1">
              <li><strong>Connaissance du cadre légal</strong> (10 pts) — connaissance Loi 2013-450, ARTCI, obligations RT.</li>
              <li><strong>Désignation DPO</strong> (15 pts) — DPO habilité ARTCI, profil conforme Arrêté 511.</li>
              <li><strong>Formalités préalables</strong> (15 pts) — déclaration/autorisation effectuée selon catégories de données.</li>
              <li><strong>Registre des traitements</strong> (15 pts) — tenu, à jour, sous forme structurée.</li>
              <li><strong>Information des personnes</strong> (10 pts) — mentions, droits, supports diffusés.</li>
              <li><strong>Sous-traitance & transferts</strong> (15 pts) — contrats conformes, garanties, autorisations.</li>
              <li><strong>Sécurité & formation</strong> (20 pts) — charte, mesures techniques+organisationnelles, formation, gestion violations.</li>
            </ul>
            <p className="pt-2 border-t border-gray-200">
              <strong>Seuils :</strong> Score 100 = <em>Conforme</em> · 70-99 = <em>Partiellement conforme</em> · 0-70 = <em>Non conforme</em>.
            </p>
          </div>
        </details>

        <p className="text-xs text-gray-500 mb-4">
          Le score automatique est <strong>une proposition</strong>. Vous pouvez le modifier selon votre jugement
          et la grille interne de l'ARTCI. Le niveau de conformité est calculé automatiquement :
          <br />
          • Score = 100 → <strong>Conforme</strong>
          <br />
          • Score [70 – 99] → <strong>Partiellement conforme</strong>
          <br />
          • Score [0 – 70[ → <strong>Non conforme</strong>
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
          <div>
            <label className="text-xs font-semibold block mb-1">Score manuel (0 – 100)</label>
            <input
              type="number" min={0} max={100}
              value={scoreManuel}
              onChange={(e) => setScoreManuel(Math.max(0, Math.min(100, Number(e.target.value) || 0)))}
              disabled={isReadOnly}
              className="text-2xl font-bold w-24"
            />
          </div>
          <div>
            <p className="text-xs text-gray-500">Niveau de conformité</p>
            <span className={cn(getNiveauColor(traitement.niveau_conformite), 'text-base')}>
              {scoreManuel >= 100 ? 'Conforme' : scoreManuel >= 70 ? 'Partiellement conforme' : 'Non conforme'}
            </span>
          </div>
          <div>
            <p className="text-xs text-gray-500">Score automatique (référence)</p>
            <p className="text-lg font-bold text-gray-700">{traitement.score_automatique ?? '-'} / 100</p>
          </div>
        </div>
      </div>

      {/* Etape 5 : Recommandations */}
      <div className="card mb-4">
        <h2 className="text-lg font-bold mb-3">Recommandations</h2>
        <textarea
          rows={5}
          value={recommandations}
          onChange={(e) => setRecommandations(e.target.value)}
          placeholder="Recommandations à formuler pour l'entreprise..."
          disabled={isReadOnly}
          className="w-full"
        />
      </div>

      {/* Etape 6 : Actions de l'editeur */}
      {!isReadOnly && (
        <div className="flex flex-col sm:flex-row gap-3 justify-end mb-4">
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn btn-outline flex items-center gap-2"
          >
            {saving ? <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> : <Save className="w-4 h-4" />}
            Sauvegarder le brouillon
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="btn btn-primary flex items-center gap-2"
          >
            {submitting ? <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> : <Send className="w-4 h-4" />}
            Soumettre pour validation N+1
          </button>
        </div>
      )}

      {/* Etape 7 : Validation (Admin / Super Admin) */}
      {showValidation && (
        <div className="card border-l-4 border-[var(--artci-orange)]">
          <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-[var(--artci-orange)]" />
            Validation (Admin)
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            Examiner le traitement de l'éditeur ci-dessus et décider d'approuver ou de retourner.
          </p>
          <div className="form-group">
            <label className="text-xs font-semibold">Motif (requis si retour)</label>
            <textarea
              rows={3}
              value={motifRetour}
              onChange={(e) => setMotifRetour(e.target.value)}
              placeholder="Motif détaillé si vous retournez le dossier à l'éditeur..."
            />
          </div>
          <div className="flex gap-3 justify-end">
            <button
              onClick={() => handleValider('retourne')}
              disabled={validatingDecision !== null}
              className="btn btn-outline flex items-center gap-2"
            >
              <XCircle className="w-4 h-4" /> Retourner à l'éditeur
            </button>
            <button
              onClick={() => handleValider('approuve')}
              disabled={validatingDecision !== null}
              className="btn btn-primary flex items-center gap-2"
            >
              <CheckCircle className="w-4 h-4" /> Approuver
            </button>
          </div>
        </div>
      )}

      {traitement.statut === 'valide' && (
        <div className="flex justify-end">
          <button onClick={() => navigate(ROUTES.ADMIN_PANIER)} className="btn btn-outline">
            Retour au panier
          </button>
        </div>
      )}
    </div>
  );
}
