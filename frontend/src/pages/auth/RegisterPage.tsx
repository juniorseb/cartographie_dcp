import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Building2, UserCheck, Landmark, User, ChevronRight, ChevronLeft, CheckCircle, Info, FileText, X } from 'lucide-react';
import * as authApi from '@/api/auth.api';
import { uploadToR2 } from '@/api/uploads.api';
import { ROUTES } from '@/utils/constants';
import { cn } from '@/utils/cn';
import type { StatutJuridiqueInscription } from '@/types/auth';

type Section = 1 | 2 | 3;

// Ordre spec : Demandeur -> Entreprise -> Representant legal
// (la personne qui remplit s'identifie d'abord, puis renseigne l'entite et son RL)
// S'applique uniquement aux personnes morales (droit prive/public) : une
// personne physique n'a ni entreprise ni representant legal distinct d'elle-meme.
const SECTIONS = [
  { num: 1 as Section, title: 'Demandeur', icon: UserCheck },
  { num: 2 as Section, title: 'Entreprise', icon: Building2 },
  { num: 3 as Section, title: 'Représentant légal', icon: UserCheck },
];

const TYPE_OPTIONS: {
  value: StatutJuridiqueInscription;
  label: string;
  description: string;
  icon: React.ElementType;
}[] = [
  {
    value: 'personne_physique',
    label: 'Personne physique',
    description: "Vous vous inscrivez en votre nom propre, sans entreprise ni document justificatif.",
    icon: User,
  },
  {
    value: 'pm_droit_prive',
    label: 'Personne morale de droit privé',
    description: 'Entreprise, association... (RCCM et DFE requis).',
    icon: Building2,
  },
  {
    value: 'pm_droit_public',
    label: 'Personne morale de droit public',
    description: 'Administration, établissement public, collectivité... (décret/arrêté de création requis).',
    icon: Landmark,
  },
];

// Validations regex
const EMAIL_REGEX = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
const PHONE_REGEX = /^[+]?[\d\s\-().]{6,30}$/;

interface UploadedDoc {
  name: string;
  size: number;
  file: File;
}

/** Formatte une erreur de soumission (partagé Personne physique / morale). */
function formatSubmitError(e: unknown): string {
  const err = e as {
    response?: {
      status?: number;
      // Le backend Flask renvoie soit {error, details?} (erreur metier
      // / validation), soit {message} (compat). On lit les deux.
      data?: {
        error?: string;
        message?: string;
        details?: Record<string, string[] | string> | string;
      };
    };
    message?: string;
  };
  const data = err?.response?.data;
  const backendMsg = data?.error || data?.message;
  const fieldErrors = typeof data?.details === 'object' ? data.details : undefined;

  if (fieldErrors && Object.keys(fieldErrors).length > 0) {
    const fmt = Object.entries(fieldErrors)
      .map(([field, msgs]) => `${field} : ${Array.isArray(msgs) ? msgs.join(', ') : msgs}`)
      .join(' | ');
    return `${backendMsg ?? 'Erreur de validation'} — ${fmt}`;
  }
  if (backendMsg) return backendMsg;
  if (!err?.response) {
    // Cas typique du cold start Render free : la requete a bien ete envoyee
    // mais la reponse n'est jamais arrivee (timeout cote navigateur). Le
    // backend a souvent traite avec succes — d'ou le 409 "email deja
    // utilise" au 2e essai. On le dit explicitement a l'utilisateur.
    return (
      "La requête a peut-être abouti mais la réponse n'est pas arrivée à temps "
      + "(le serveur peut être en cours de réveil). Vérifiez votre boîte mail "
      + "dans 1-2 minutes avant de retenter — vous avez peut-être déjà reçu un "
      + "email de confirmation."
    );
  }
  return "Erreur lors de l'inscription. Vérifiez vos informations et réessayez.";
}

export default function RegisterPage() {
  const [statutJuridique, setStatutJuridique] = useState<StatutJuridiqueInscription | null>(null);
  const [section, setSection] = useState<Section>(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const [form, setForm] = useState({
    // Personne morale — Section Entreprise
    denomination: '',
    numero_cc: '',
    telephone: '',
    adresse: '',
    ville: '',
    region: '',
    // Personne morale — Représentant légal (RL)
    rl_nom: '',
    rl_prenom: '',
    rl_fonction: '',
    rl_telephone: '',
    rl_email: '',
    // Personne morale — Demandeur (= ancien "DPO" de l'inscription, à ne pas confondre avec le DPO du formulaire principal)
    dem_nom: '',
    dem_prenom: '',
    dem_fonction: '',
    dem_telephone: '',
    dem_email: '',
    // Personne physique — la personne EST le déclarant
    pp_nom: '',
    pp_prenom: '',
    pp_fonction: '',
    pp_telephone: '',
    pp_email: '',
    pp_adresse: '',
    pp_ville: '',
    pp_region: '',
  });

  // Documents administratifs uploadés
  const [docRccm, setDocRccm] = useState<UploadedDoc | null>(null);
  const [docDfe, setDocDfe] = useState<UploadedDoc | null>(null);
  const [docDecret, setDocDecret] = useState<UploadedDoc | null>(null);

  function updateField(key: string, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function resetType() {
    setStatutJuridique(null);
    setSection(1);
    setError('');
  }

  function validateSection(s: Section): string {
    // Ordre spec : 1=Demandeur, 2=Entreprise, 3=RL
    if (s === 1) {
      if (!form.dem_nom.trim() || !form.dem_prenom.trim()) return 'Nom et prénom du Demandeur obligatoires.';
      if (!form.dem_email.trim() || !EMAIL_REGEX.test(form.dem_email)) return "L'email du Demandeur est obligatoire et doit être valide.";
      if (form.dem_telephone && !PHONE_REGEX.test(form.dem_telephone)) return 'Format de téléphone du Demandeur invalide.';
    }
    if (s === 2) {
      if (!form.denomination.trim() || form.denomination.trim().length < 2) return "La dénomination de l'entreprise est obligatoire (2 caractères minimum).";
      if (!form.numero_cc.trim()) return 'Le numéro CC est obligatoire.';
      if (form.telephone && !PHONE_REGEX.test(form.telephone)) return 'Format de téléphone invalide.';
      if (statutJuridique === 'pm_droit_public') {
        if (!docDecret) return "Le décret ou arrêté de création est obligatoire.";
      } else {
        if (!docRccm) return "Le RCCM (Registre du Commerce et du Crédit Mobilier) est obligatoire.";
        if (!docDfe) return "La DFE (Déclaration Fiscale d'Existence) est obligatoire.";
      }
    }
    if (s === 3) {
      if (!form.rl_nom.trim() || !form.rl_prenom.trim()) return 'Nom et prénom du représentant légal obligatoires.';
      if (!form.rl_email.trim() || !EMAIL_REGEX.test(form.rl_email)) return "L'email du représentant légal est obligatoire et doit être valide.";
      if (form.rl_telephone && !PHONE_REGEX.test(form.rl_telephone)) return 'Format de téléphone du représentant légal invalide.';
      if (form.dem_email && form.rl_email === form.dem_email) {
        return "L'email du Représentant légal doit être différent de celui du Demandeur.";
      }
    }
    return '';
  }

  function validatePersonnePhysique(): string {
    if (!form.pp_nom.trim() || !form.pp_prenom.trim()) return 'Nom et prénom obligatoires.';
    if (!form.pp_email.trim() || !EMAIL_REGEX.test(form.pp_email)) return "L'email est obligatoire et doit être valide.";
    if (form.pp_telephone && !PHONE_REGEX.test(form.pp_telephone)) return 'Format de téléphone invalide.';
    return '';
  }

  function goNext() {
    const err = validateSection(section);
    if (err) { setError(err); return; }
    setError('');
    if (section < 3) setSection(((section + 1) as Section));
  }

  function goPrev() {
    setError('');
    if (section > 1) setSection(((section - 1) as Section));
  }

  async function handleSubmitPersonnePhysique(e: React.FormEvent) {
    e.preventDefault();
    const err = validatePersonnePhysique();
    if (err) { setError(err); return; }
    setError('');
    setIsLoading(true);
    try {
      await authApi.register({
        statut_juridique: 'personne_physique',
        dg_nom: form.pp_nom,
        dg_prenom: form.pp_prenom,
        dg_fonction: form.pp_fonction || undefined,
        dg_telephone: form.pp_telephone || undefined,
        dg_email: form.pp_email,
        adresse: form.pp_adresse || undefined,
        ville: form.pp_ville || undefined,
        region: form.pp_region || undefined,
      });
      setSubmitted(true);
    } catch (e: unknown) {
      setError(formatSubmitError(e));
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    for (const s of [1, 2, 3] as Section[]) {
      const err = validateSection(s);
      if (err) { setSection(s); setError(err); return; }
    }
    setError('');
    setIsLoading(true);
    try {
      // 1) Upload des PDF directement vers Cloudflare R2 (le backend ne voit
      //    jamais les bytes -> pas de timeout / cold start sur le multipart).
      const documents: authApi.UploadedDocument[] = [];
      if (statutJuridique === 'pm_droit_public') {
        if (docDecret) {
          const up = await uploadToR2('inscriptions', docDecret.file);
          documents.push({ type: 'doc_decret_creation', r2_key: up.key, nom_fichier: up.filename, taille: up.size, mime_type: up.mime_type });
        }
      } else {
        if (docRccm) {
          const up = await uploadToR2('inscriptions', docRccm.file);
          documents.push({ type: 'doc_rccm', r2_key: up.key, nom_fichier: up.filename, taille: up.size, mime_type: up.mime_type });
        }
        if (docDfe) {
          const up = await uploadToR2('inscriptions', docDfe.file);
          documents.push({ type: 'doc_dfe', r2_key: up.key, nom_fichier: up.filename, taille: up.size, mime_type: up.mime_type });
        }
      }

      // 2) Inscription proprement dite : JSON pur (cles R2 seulement).
      // Note : on map les champs Demandeur → champs dpo_* en backend
      // (le "DPO" de l'inscription = "Demandeur" selon la nouvelle spec §9)
      await authApi.register(
        {
          statut_juridique: statutJuridique!,
          denomination: form.denomination,
          numero_cc: form.numero_cc,
          telephone: form.telephone || undefined,
          adresse: form.adresse || undefined,
          ville: form.ville || undefined,
          region: form.region || undefined,
          // Représentant légal
          dg_nom: form.rl_nom,
          dg_prenom: form.rl_prenom,
          dg_fonction: form.rl_fonction || undefined,
          dg_telephone: form.rl_telephone || undefined,
          dg_email: form.rl_email,
          // Demandeur (mapping vers anciens champs dpo_*)
          dpo_nom: form.dem_nom,
          dpo_prenom: form.dem_prenom,
          dpo_telephone: form.dem_telephone || undefined,
          dpo_email: form.dem_email,
        },
        documents,
      );
      setSubmitted(true);
    } catch (e: unknown) {
      setError(formatSubmitError(e));
    } finally {
      setIsLoading(false);
    }
  }

  if (submitted) {
    return (
      <div className="text-center py-6">
        <CheckCircle className="w-14 h-14 text-green-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold mb-2">Inscription enregistrée</h2>
        <p className="text-base text-gray-700 mb-6 font-semibold">
          Le processus d'inscription est en cours. Vous recevrez un email de confirmation.
        </p>
        <Link to={ROUTES.LOGIN} className="btn btn-outline inline-block no-underline">
          Retour à la connexion
        </Link>
      </div>
    );
  }

  // Étape 0 : choix du type de déclarant
  if (!statutJuridique) {
    return (
      <div>
        <h2 className="text-xl font-bold text-center mb-1" style={{ color: 'var(--artci-black)' }}>
          Inscription
        </h2>
        <p className="text-sm text-gray-500 text-center mb-6">
          Quel type de compte souhaitez-vous créer ?
        </p>
        <div className="space-y-3">
          {TYPE_OPTIONS.map(({ value, label, description, icon: Icon }) => (
            <button
              key={value}
              type="button"
              onClick={() => setStatutJuridique(value)}
              className="w-full text-left border border-gray-300 rounded-lg p-4 flex items-start gap-3 hover:border-[var(--artci-orange)] hover:bg-orange-50 transition-colors"
            >
              <Icon className="w-6 h-6 text-[var(--artci-orange)] flex-shrink-0 mt-0.5" />
              <div>
                <div className="font-bold text-sm">{label}</div>
                <div className="text-xs text-gray-500 mt-0.5">{description}</div>
              </div>
            </button>
          ))}
        </div>
        <p className="text-sm text-center mt-6 text-gray-500">
          Déjà un compte ?{' '}
          <Link to={ROUTES.LOGIN} className="text-[var(--artci-orange)] font-semibold hover:underline">
            Se connecter
          </Link>
        </p>
      </div>
    );
  }

  // Personne physique : un seul formulaire, pas de wizard entreprise/RL.
  if (statutJuridique === 'personne_physique') {
    return (
      <div>
        <button type="button" onClick={resetType} className="text-xs text-gray-500 hover:text-[var(--artci-orange)] flex items-center gap-1 mb-3">
          <ChevronLeft className="w-3 h-3" /> Changer de type de compte
        </button>
        <h2 className="text-xl font-bold text-center mb-1" style={{ color: 'var(--artci-black)' }}>
          Inscription — Personne physique
        </h2>
        <p className="text-sm text-gray-500 text-center mb-6">
          Vous vous inscrivez en votre nom propre.
        </p>

        {error && <div className="alert alert-danger mb-4">{error}</div>}

        <form onSubmit={handleSubmitPersonnePhysique}>
          <SectionPersonnePhysique form={form} updateField={updateField} />
          <div className="flex items-center justify-end mt-6">
            <button type="submit" disabled={isLoading} className="btn btn-primary flex items-center gap-2">
              {isLoading ? (
                <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
              ) : 'Soumettre l\'inscription'}
            </button>
          </div>
        </form>

        <p className="text-sm text-center mt-6 text-gray-500">
          Déjà un compte ?{' '}
          <Link to={ROUTES.LOGIN} className="text-[var(--artci-orange)] font-semibold hover:underline">
            Se connecter
          </Link>
        </p>
      </div>
    );
  }

  // Personne morale (droit privé / droit public) : wizard 3 étapes.
  return (
    <div>
      <button type="button" onClick={resetType} className="text-xs text-gray-500 hover:text-[var(--artci-orange)] flex items-center gap-1 mb-3">
        <ChevronLeft className="w-3 h-3" /> Changer de type de compte
      </button>
      <h2 className="text-xl font-bold text-center mb-1" style={{ color: 'var(--artci-black)' }}>
        Inscription
      </h2>
      <p className="text-sm text-gray-500 text-center mb-6">
        {statutJuridique === 'pm_droit_public'
          ? 'Personne morale de droit public (3 étapes)'
          : 'Personne morale de droit privé (3 étapes)'}
      </p>

      <div className="flex items-start justify-center mb-6">
        {SECTIONS.map(({ num, title, icon: Icon }, i) => (
          <div key={num} className="flex items-start">
            <div className="flex flex-col items-center text-center w-28">
              <div
                className={cn(
                  'w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm border-2',
                  section === num && 'bg-[var(--artci-orange)] text-white border-[var(--artci-orange)]',
                  section > num && 'bg-green-500 text-white border-green-500',
                  section < num && 'bg-white text-gray-400 border-gray-300'
                )}
              >
                {section > num ? '✓' : <Icon className="w-4 h-4" />}
              </div>
              <span className="text-[11px] font-semibold text-gray-600 mt-1">{title}</span>
            </div>
            {i < SECTIONS.length - 1 && (
              <div className={cn('h-0.5 w-8 sm:w-12 mt-[18px]', section > num ? 'bg-green-500' : 'bg-gray-300')} />
            )}
          </div>
        ))}
      </div>

      {error && <div className="alert alert-danger mb-4">{error}</div>}

      <form onSubmit={handleSubmit}>
        {section === 1 && (
          <SectionDemandeur form={form} updateField={updateField} />
        )}
        {section === 2 && (
          <SectionEntreprise
            form={form} updateField={updateField}
            statutJuridique={statutJuridique}
            docRccm={docRccm} setDocRccm={setDocRccm}
            docDfe={docDfe} setDocDfe={setDocDfe}
            docDecret={docDecret} setDocDecret={setDocDecret}
          />
        )}
        {section === 3 && <SectionRL form={form} updateField={updateField} />}

        <div className="flex items-center justify-between gap-3 mt-6">
          {section > 1 ? (
            <button type="button" onClick={goPrev} className="btn btn-outline flex items-center gap-2">
              <ChevronLeft className="w-4 h-4" /> Précédent
            </button>
          ) : <div />}
          {section < 3 ? (
            <button type="button" onClick={goNext} className="btn btn-primary flex items-center gap-2">
              Suivant <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button type="submit" disabled={isLoading} className="btn btn-primary flex items-center gap-2">
              {isLoading ? (
                <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
              ) : 'Soumettre l\'inscription'}
            </button>
          )}
        </div>
      </form>

      <p className="text-sm text-center mt-6 text-gray-500">
        Déjà un compte ?{' '}
        <Link to={ROUTES.LOGIN} className="text-[var(--artci-orange)] font-semibold hover:underline">
          Se connecter
        </Link>
      </p>
    </div>
  );
}

interface SectionProps {
  form: Record<string, string>;
  updateField: (k: string, v: string) => void;
}

function SectionEntreprise({
  form, updateField, statutJuridique,
  docRccm, setDocRccm, docDfe, setDocDfe, docDecret, setDocDecret,
}: SectionProps & {
  statutJuridique: StatutJuridiqueInscription;
  docRccm: UploadedDoc | null; setDocRccm: (d: UploadedDoc | null) => void;
  docDfe: UploadedDoc | null; setDocDfe: (d: UploadedDoc | null) => void;
  docDecret: UploadedDoc | null; setDocDecret: (d: UploadedDoc | null) => void;
}) {
  function handleFile(e: React.ChangeEvent<HTMLInputElement>, set: (d: UploadedDoc | null) => void) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.type !== 'application/pdf') {
      alert('Format invalide : seuls les fichiers PDF sont acceptés.');
      e.target.value = '';
      return;
    }
    if (f.size > 5 * 1024 * 1024) {
      alert('Fichier trop volumineux : 5 Mo maximum.');
      e.target.value = '';
      return;
    }
    set({ name: f.name, size: f.size, file: f });
  }

  const isDroitPublic = statutJuridique === 'pm_droit_public';

  return (
    <fieldset className="border border-gray-300 px-5 pt-2 pb-4">
      <legend className="px-3 font-bold text-base flex items-center gap-2 mx-auto">
        <Building2 className="w-4 h-4 text-[var(--artci-orange)]" />
        {isDroitPublic ? "Informations sur l'entité publique" : "Informations sur l'entreprise"}
      </legend>

      <div className="form-group">
        <label htmlFor="denomination">Dénomination *</label>
        <input id="denomination" type="text" required minLength={2}
          value={form.denomination} onChange={(e) => updateField('denomination', e.target.value)} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="form-group">
          <label htmlFor="numero_cc">N° Compte Contribuable *</label>
          <input id="numero_cc" type="text" required
            value={form.numero_cc} onChange={(e) => updateField('numero_cc', e.target.value)} />
        </div>
        <div className="form-group">
          <label htmlFor="telephone">Téléphone {isDroitPublic ? "de l'entité" : 'entreprise'}</label>
          <input id="telephone" type="tel" pattern="[+]?[\d\s\-.\(\)]{6,30}"
            value={form.telephone} onChange={(e) => updateField('telephone', e.target.value)} />
        </div>
      </div>
      <div className="form-group">
        <label htmlFor="adresse">Adresse</label>
        <input id="adresse" type="text"
          value={form.adresse} onChange={(e) => updateField('adresse', e.target.value)} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="form-group">
          <label htmlFor="ville">Ville</label>
          <input id="ville" type="text"
            value={form.ville} onChange={(e) => updateField('ville', e.target.value)} />
        </div>
        <div className="form-group">
          <label htmlFor="region">Région</label>
          <input id="region" type="text"
            value={form.region} onChange={(e) => updateField('region', e.target.value)} />
        </div>
      </div>

      {/* Spec 2.3 : Documents administratifs obligatoires */}
      <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded">
        <p className="text-sm font-bold mb-2 flex items-center gap-2">
          <FileText className="w-4 h-4 text-[var(--artci-orange)]" />
          Documents administratifs <span className="text-red-500">*</span>
        </p>

        {isDroitPublic ? (
          <>
            <p className="text-xs text-gray-600 mb-3">
              Téléversez le document officiel de création de votre entité (décret, arrêté...).
              <br />
              <span className="text-gray-500">Format accepté : PDF uniquement — taille max 5 Mo.</span>
            </p>
            <UploadField
              label="Décret / Arrêté de création *"
              doc={docDecret}
              onSelect={(e) => handleFile(e, setDocDecret)}
              onRemove={() => setDocDecret(null)}
            />
          </>
        ) : (
          <>
            <p className="text-xs text-gray-600 mb-3">
              Téléversez les documents officiels de votre entreprise (RCCM, DFE).
              <br />
              <span className="text-gray-500">Format accepté : PDF uniquement — taille max 5 Mo par fichier.</span>
            </p>
            <UploadField
              label="RCCM (Registre du Commerce et du Crédit Mobilier) *"
              doc={docRccm}
              onSelect={(e) => handleFile(e, setDocRccm)}
              onRemove={() => setDocRccm(null)}
            />
            <UploadField
              label="DFE (Déclaration Fiscale d'Existence) *"
              doc={docDfe}
              onSelect={(e) => handleFile(e, setDocDfe)}
              onRemove={() => setDocDfe(null)}
            />
          </>
        )}
      </div>
    </fieldset>
  );
}

function UploadField({
  label, doc, onSelect, onRemove,
}: {
  label: string;
  doc: UploadedDoc | null;
  onSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemove: () => void;
}) {
  return (
    <div className="mb-2">
      <label className="text-xs font-semibold block mb-1">{label}</label>
      {doc ? (
        <div className="flex items-center justify-between p-2 bg-green-50 border border-green-200 rounded text-xs">
          <span className="truncate">✓ {doc.name} ({Math.round(doc.size / 1024)} Ko)</span>
          <button type="button" onClick={onRemove} className="text-red-500 hover:text-red-700 ml-2">
            <X className="w-3 h-3" />
          </button>
        </div>
      ) : (
        <input
          type="file" accept="application/pdf"
          onChange={onSelect}
          className="text-xs"
        />
      )}
    </div>
  );
}

function SectionRL({ form, updateField }: SectionProps) {
  return (
    <fieldset className="border border-gray-300 px-5 pt-2 pb-4">
      <legend className="px-3 font-bold text-base flex items-center gap-2 mx-auto">
        <UserCheck className="w-4 h-4 text-[var(--artci-orange)]" />
        Représentant légal
      </legend>
      <div className="alert alert-info mb-4 flex items-start gap-2 text-sm">
        <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
        <div>
          L'email saisi ici servira d'identifiant de connexion au Représentant légal.
          Il recevra par email les informations pour confirmer l'inscription.
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="form-group">
          <label htmlFor="rl_nom">Nom *</label>
          <input id="rl_nom" type="text" required
            value={form.rl_nom} onChange={(e) => updateField('rl_nom', e.target.value)} />
        </div>
        <div className="form-group">
          <label htmlFor="rl_prenom">Prénom *</label>
          <input id="rl_prenom" type="text" required
            value={form.rl_prenom} onChange={(e) => updateField('rl_prenom', e.target.value)} />
        </div>
      </div>
      <div className="form-group">
        <label htmlFor="rl_fonction">Fonction</label>
        <input id="rl_fonction" type="text" placeholder="Ex : Directeur Général"
          value={form.rl_fonction} onChange={(e) => updateField('rl_fonction', e.target.value)} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="form-group">
          <label htmlFor="rl_telephone">Téléphone</label>
          <input id="rl_telephone" type="tel" pattern="[+]?[\d\s\-.\(\)]{6,30}"
            value={form.rl_telephone} onChange={(e) => updateField('rl_telephone', e.target.value)} />
        </div>
        <div className="form-group">
          <label htmlFor="rl_email">Email d'accès *</label>
          <input id="rl_email" type="email" required
            value={form.rl_email} onChange={(e) => updateField('rl_email', e.target.value)} />
        </div>
      </div>
    </fieldset>
  );
}

function SectionDemandeur({ form, updateField }: SectionProps) {
  return (
    <fieldset className="border border-gray-300 px-5 pt-2 pb-4">
      <legend className="px-3 font-bold text-base flex items-center gap-2 mx-auto">
        <UserCheck className="w-4 h-4 text-[var(--artci-orange)]" />
        Demandeur
      </legend>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="form-group">
          <label htmlFor="dem_nom">Nom *</label>
          <input id="dem_nom" type="text" required
            value={form.dem_nom} onChange={(e) => updateField('dem_nom', e.target.value)} />
        </div>
        <div className="form-group">
          <label htmlFor="dem_prenom">Prénom *</label>
          <input id="dem_prenom" type="text" required
            value={form.dem_prenom} onChange={(e) => updateField('dem_prenom', e.target.value)} />
        </div>
      </div>
      <div className="form-group">
        <label htmlFor="dem_fonction">Fonction</label>
        <input id="dem_fonction" type="text"
          value={form.dem_fonction} onChange={(e) => updateField('dem_fonction', e.target.value)} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="form-group">
          <label htmlFor="dem_telephone">Téléphone</label>
          <input id="dem_telephone" type="tel" pattern="[+]?[\d\s\-.\(\)]{6,30}"
            value={form.dem_telephone} onChange={(e) => updateField('dem_telephone', e.target.value)} />
        </div>
        <div className="form-group">
          <label htmlFor="dem_email">Email d'accès *</label>
          <input id="dem_email" type="email" required
            value={form.dem_email} onChange={(e) => updateField('dem_email', e.target.value)} />
        </div>
      </div>
    </fieldset>
  );
}

function SectionPersonnePhysique({ form, updateField }: SectionProps) {
  return (
    <fieldset className="border border-gray-300 px-5 pt-2 pb-4">
      <legend className="px-3 font-bold text-base flex items-center gap-2 mx-auto">
        <User className="w-4 h-4 text-[var(--artci-orange)]" />
        Vos informations
      </legend>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="form-group">
          <label htmlFor="pp_nom">Nom *</label>
          <input id="pp_nom" type="text" required
            value={form.pp_nom} onChange={(e) => updateField('pp_nom', e.target.value)} />
        </div>
        <div className="form-group">
          <label htmlFor="pp_prenom">Prénom *</label>
          <input id="pp_prenom" type="text" required
            value={form.pp_prenom} onChange={(e) => updateField('pp_prenom', e.target.value)} />
        </div>
      </div>
      <div className="form-group">
        <label htmlFor="pp_fonction">Fonction</label>
        <input id="pp_fonction" type="text"
          value={form.pp_fonction} onChange={(e) => updateField('pp_fonction', e.target.value)} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="form-group">
          <label htmlFor="pp_telephone">Téléphone</label>
          <input id="pp_telephone" type="tel" pattern="[+]?[\d\s\-.\(\)]{6,30}"
            value={form.pp_telephone} onChange={(e) => updateField('pp_telephone', e.target.value)} />
        </div>
        <div className="form-group">
          <label htmlFor="pp_email">Email d'accès *</label>
          <input id="pp_email" type="email" required
            value={form.pp_email} onChange={(e) => updateField('pp_email', e.target.value)} />
        </div>
      </div>
      <div className="form-group">
        <label htmlFor="pp_adresse">Adresse</label>
        <input id="pp_adresse" type="text"
          value={form.pp_adresse} onChange={(e) => updateField('pp_adresse', e.target.value)} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="form-group">
          <label htmlFor="pp_ville">Ville</label>
          <input id="pp_ville" type="text"
            value={form.pp_ville} onChange={(e) => updateField('pp_ville', e.target.value)} />
        </div>
        <div className="form-group">
          <label htmlFor="pp_region">Région</label>
          <input id="pp_region" type="text"
            value={form.pp_region} onChange={(e) => updateField('pp_region', e.target.value)} />
        </div>
      </div>
    </fieldset>
  );
}
