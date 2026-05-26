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
import RevisionsDiff from '@/components/admin/RevisionsDiff';
import DossierJournal from '@/components/admin/DossierJournal';
import MonEnregistrementPage from '@/pages/entreprise/MonEnregistrementPage';
// Note: DossierAuditTrail retire (spec K3 : "Audit trail du dossier (supprimé)").
// CommentairesAncres n'est plus instancie ici directement : il est embarque
// dans MonEnregistrementPage en mode 'treat'.

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
  // K7 : score par rubrique
  const [scoresParRubrique, setScoresParRubrique] = useState<Record<string, number>>({});
  // K6 : score detaille par critere du bareme officiel (7 criteres)
  const [scoresParCritere, setScoresParCritere] = useState<Record<string, { note: number; commentaire: string }>>({});
  const [scoreManuel, setScoreManuel] = useState<number>(0);
  const [recommandations, setRecommandations] = useState('');

  // K6 : bareme officiel ARTCI (cf. ScoringService backend). 7 criteres, total 100 pts.
  const BAREME_CRITERES: Array<{ key: string; label: string; max: number; rubrique: string }> = [
    { key: 'connaissance_loi_2013', label: 'Connaissance de la loi 2013-450', max: 5, rubrique: 'identification' },
    { key: 'designation_dpo', label: "Désignation d'un DPO / CPD", max: 20, rubrique: 'cadre_juridique' },
    { key: 'formalites_artci', label: 'Formalités ARTCI effectuées (déclaration + autorisation)', max: 30, rubrique: 'registre' },
    { key: 'registre_traitements', label: 'Registre des traitements à jour', max: 15, rubrique: 'registre' },
    { key: 'information_personnes', label: 'Information des personnes concernées', max: 10, rubrique: 'registre' },
    { key: 'contrats_sous_traitants', label: 'Contrats sous-traitants conformes', max: 10, rubrique: 'sous_traitance_transferts' },
    { key: 'politique_securite', label: 'Politique de sécurité formalisée', max: 10, rubrique: 'securite' },
  ];

  // Plafonds officiels du bareme ARTCI (total = 100).
  // Cf. spec K5 « Consulter la grille des critères de scoring : mettre en tableau ».
  const BAREME_RUBRIQUES: Array<{ key: string; label: string; max: number; description: string }> = [
    { key: 'identification', label: 'Identification & connaissance du cadre', max: 15,
      description: 'Connaissance Loi 2013-450, identification claire de l\'entité, secteur d\'activité, GPS.' },
    { key: 'cadre_juridique', label: 'Désignation DPO', max: 15,
      description: 'DPO habilité ARTCI, profil conforme Arrêté 511, courrier officiel.' },
    { key: 'registre', label: 'Registre & formalités traitements', max: 30,
      description: 'Registre tenu, formalités effectuées, catégories de données complètes, bases légales, finalités explicites.' },
    { key: 'sous_traitance_transferts', label: 'Sous-traitance & transferts', max: 15,
      description: 'Contrats sous-traitants conformes, transferts CEDEAO documentés, autorisations.' },
    { key: 'securite', label: 'Sécurité & formation', max: 25,
      description: 'Charte protection, mesures techniques + organisationnelles, formations, gestion violations.' },
  ];

  useEffect(() => {
    if (!entiteId) return;
    setLoading(true);
    adminApi.commencerTraiter(entiteId)
      .then((t) => {
        setTraitement(t);
        setCommentaires(t.commentaires_par_rubrique ?? {});
        setScoresParRubrique(t.scores_par_rubrique ?? {});
        setScoresParCritere(t.scores_par_critere ?? {});
        setScoreManuel(t.score_manuel ?? 0);
        setRecommandations(t.recommandations ?? '');
      })
      .catch(() => setError("Impossible de charger le traitement."))
      .finally(() => setLoading(false));
  }, [entiteId]);

  // Recalcule le score total quand les sous-scores changent
  useEffect(() => {
    const sum = Object.values(scoresParRubrique).reduce((s, v) => s + (Number(v) || 0), 0);
    if (sum > 0) setScoreManuel(Math.min(100, sum));
  }, [scoresParRubrique]);

  async function handleSave() {
    if (!traitement) return;
    setSaving(true); setError(''); setSuccess('');
    try {
      const updated = await adminApi.updateTraitement(traitement.id, {
        commentaires_par_rubrique: commentaires,
        scores_par_rubrique: scoresParRubrique,
        scores_par_critere: scoresParCritere,
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

      {/* Journal agrege des evenements du dossier (workflow + retours + signalements) */}
      <DossierJournal entiteId={traitement.entite_id} />

      {/* Historique des revisions + diff semantique (modele PR §6.2) */}
      <RevisionsDiff entiteId={traitement.entite_id} />

      {/* Formulaire DCP — affiche EXACTEMENT comme l'entreprise l'a renseigne
          (meme stepper, memes sections), en lecture seule, avec le panneau
          de commentaires ancres pour permettre a l'editeur de commenter
          chaque rubrique. Cf. spec : "il peut ajouter des commentaires". */}
      <div className="mb-4">
        <MonEnregistrementPage
          mode={isReadOnly ? 'view' : 'treat'}
          entiteId={traitement.entite_id}
        />
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

      {/* Etape 4 : Saisie manuelle du score par rubrique + total (K5 + K7) */}
      <div className="card mb-4">
        <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
          <Award className="w-5 h-5 text-[var(--artci-green)]" />
          Score final et niveau de conformité
        </h2>

        {/* K5 : Grille des criteres en TABLEAU */}
        <details className="border border-gray-200 rounded mb-4">
          <summary className="cursor-pointer p-3 hover:bg-gray-50 flex items-center gap-2 text-sm font-semibold text-gray-700">
            <BookOpen className="w-4 h-4 text-[var(--artci-orange)]" />
            Consulter la grille des critères de scoring
          </summary>
          <div className="p-3 border-t border-gray-100 bg-gray-50">
            <p className="text-xs font-semibold mb-2 text-gray-700">
              Grille interne ARTCI (5 rubriques, total 100 points) :
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border border-gray-200">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="text-left p-2 border border-gray-200">Rubrique</th>
                    <th className="text-center p-2 border border-gray-200 w-20">Max</th>
                    <th className="text-left p-2 border border-gray-200">Critères évalués</th>
                  </tr>
                </thead>
                <tbody>
                  {BAREME_RUBRIQUES.map((r) => (
                    <tr key={r.key}>
                      <td className="p-2 border border-gray-200 font-semibold">{r.label}</td>
                      <td className="p-2 border border-gray-200 text-center font-mono">{r.max} pts</td>
                      <td className="p-2 border border-gray-200 text-gray-600">{r.description}</td>
                    </tr>
                  ))}
                  <tr className="bg-gray-50 font-bold">
                    <td className="p-2 border border-gray-200">Total</td>
                    <td className="p-2 border border-gray-200 text-center font-mono">100 pts</td>
                    <td className="p-2 border border-gray-200" />
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-xs text-gray-700 mt-3 pt-2 border-t border-gray-200">
              <strong>Seuils :</strong> Score = 100 → <em>Conforme</em> · 70–99 → <em>Partiellement conforme</em> · 0–69 → <em>Non conforme</em>.
            </p>
          </div>
        </details>

        {/* K6 : Evaluation detaillee par critere (bareme officiel ARTCI) */}
        <details className="border border-gray-200 rounded mb-4">
          <summary className="cursor-pointer p-3 hover:bg-gray-50 flex items-center gap-2 text-sm font-semibold text-gray-700">
            <Award className="w-4 h-4 text-[var(--artci-green)]" />
            Évaluation détaillée par critère (barème officiel, 7 critères)
            <span className="ml-auto text-xs text-gray-500 font-normal">
              Total saisi : {Object.values(scoresParCritere).reduce((s, v) => s + (Number(v?.note) || 0), 0)} / 100
            </span>
          </summary>
          <div className="p-3 border-t border-gray-100">
            <p className="text-xs text-gray-500 mb-3">
              Saisissez une note 0..max pour chaque critère officiel du barème ARTCI.
              Un commentaire optionnel peut justifier la note. Cet outil aide à la décision
              mais ne remplace pas la saisie par rubrique ci-dessous (qui détermine le score final).
            </p>
            <div className="space-y-3">
              {BAREME_CRITERES.map((c) => {
                const v = scoresParCritere[c.key] ?? { note: 0, commentaire: '' };
                return (
                  <div key={c.key} className="border border-gray-100 rounded p-3 bg-gray-50">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex-1">
                        <p className="text-sm font-semibold">{c.label}</p>
                        <p className="text-xs text-gray-500">
                          Rubrique : <em>{c.rubrique}</em> · Max : {c.max} pts
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <input
                          type="number"
                          min={0}
                          max={c.max}
                          value={v.note ?? 0}
                          onChange={(e) => {
                            const n = Math.max(0, Math.min(c.max, Number(e.target.value) || 0));
                            setScoresParCritere((prev) => ({
                              ...prev,
                              [c.key]: { note: n, commentaire: prev[c.key]?.commentaire ?? '' },
                            }));
                          }}
                          disabled={isReadOnly}
                          className="text-center font-semibold w-16"
                        />
                        <span className="text-xs text-gray-500">/ {c.max}</span>
                      </div>
                    </div>
                    <textarea
                      rows={2}
                      value={v.commentaire ?? ''}
                      onChange={(e) =>
                        setScoresParCritere((prev) => ({
                          ...prev,
                          [c.key]: { note: prev[c.key]?.note ?? 0, commentaire: e.target.value },
                        }))
                      }
                      disabled={isReadOnly}
                      placeholder="Commentaire (optionnel) : justification de la note..."
                      className="w-full text-sm"
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </details>

        {/* K7 : saisie manuelle par rubrique (avec score auto reference) */}
        <p className="text-xs text-gray-500 mb-3">
          Saisissez votre évaluation pour chaque rubrique. Le <strong>score total</strong> est calculé automatiquement.
          La proposition algorithmique (« Score auto ») n'est qu'une référence.
        </p>
        <div className="overflow-x-auto mb-4">
          <table className="w-full text-sm border border-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left p-2 border border-gray-200">Rubrique</th>
                <th className="text-center p-2 border border-gray-200 w-24">Maximum</th>
                <th className="text-center p-2 border border-gray-200 w-32">Score manuel</th>
              </tr>
            </thead>
            <tbody>
              {BAREME_RUBRIQUES.map((r) => (
                <tr key={r.key}>
                  <td className="p-2 border border-gray-200">{r.label}</td>
                  <td className="p-2 border border-gray-200 text-center text-gray-500">{r.max}</td>
                  <td className="p-2 border border-gray-200 text-center">
                    <input
                      type="number"
                      min={0}
                      max={r.max}
                      value={scoresParRubrique[r.key] ?? ''}
                      onChange={(e) => {
                        const v = Math.max(0, Math.min(r.max, Number(e.target.value) || 0));
                        setScoresParRubrique((prev) => ({ ...prev, [r.key]: v }));
                      }}
                      disabled={isReadOnly}
                      placeholder="0"
                      className="text-center font-semibold w-20"
                    />
                  </td>
                </tr>
              ))}
              <tr className="bg-orange-50 font-bold">
                <td className="p-2 border border-gray-200">Score total</td>
                <td className="p-2 border border-gray-200 text-center text-gray-500">100</td>
                <td className="p-2 border border-gray-200 text-center">
                  <span className="text-xl text-[var(--artci-orange)]">{scoreManuel}/100</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center bg-gray-50 p-3 rounded">
          <div>
            <p className="text-xs text-gray-500">Score automatique (référence)</p>
            <p className="text-lg font-bold text-gray-700">{traitement.score_automatique ?? '-'} / 100</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Score manuel (somme des rubriques)</p>
            <p className="text-lg font-bold text-[var(--artci-orange)]">{scoreManuel} / 100</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Niveau de conformité</p>
            <span className={cn(getNiveauColor(traitement.niveau_conformite), 'text-base')}>
              {scoreManuel >= 100 ? 'Conforme' : scoreManuel >= 70 ? 'Partiellement conforme' : 'Non conforme'}
            </span>
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
