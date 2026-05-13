import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Building2, UserCheck, Lock, ChevronRight, ChevronLeft, CheckCircle, Info } from 'lucide-react';
import * as authApi from '@/api/auth.api';
import { ROUTES } from '@/utils/constants';
import { cn } from '@/utils/cn';

type Section = 1 | 2 | 3;

const SECTIONS = [
  { num: 1 as Section, title: 'Entreprise', icon: Building2 },
  { num: 2 as Section, title: 'Représentant légal', icon: UserCheck },
  { num: 3 as Section, title: 'DPO', icon: Lock },
];

export default function RegisterPage() {
  const [section, setSection] = useState<Section>(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const [form, setForm] = useState({
    // Section 1 — Entreprise
    denomination: '',
    numero_cc: '',
    telephone: '',
    adresse: '',
    ville: '',
    region: '',
    // Section 2 — DG
    dg_nom: '',
    dg_prenom: '',
    dg_fonction: '',
    dg_telephone: '',
    dg_email: '',
    // Section 3 — DPO
    dpo_nom: '',
    dpo_prenom: '',
    dpo_telephone: '',
    dpo_email: '',
    dpo_type: 'interne' as 'interne' | 'externe',
    dpo_organisme: '',
  });

  function updateField(key: string, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function validateSection(s: Section): string {
    if (s === 1) {
      if (!form.denomination.trim()) return "La dénomination de l'entreprise est obligatoire.";
      if (!form.numero_cc.trim()) return 'Le numéro CC est obligatoire.';
    }
    if (s === 2) {
      if (!form.dg_nom.trim() || !form.dg_prenom.trim()) return 'Nom et prénom du représentant légal obligatoires.';
      if (!form.dg_email.trim()) return "L'email du représentant légal est obligatoire (servira d'identifiant de connexion).";
    }
    if (s === 3) {
      if (!form.dpo_nom.trim() || !form.dpo_prenom.trim()) return 'Nom et prénom du DPO obligatoires.';
      if (!form.dpo_email.trim()) return "L'email du DPO est obligatoire (servira d'identifiant de connexion).";
      if (form.dpo_type === 'externe' && !form.dpo_organisme.trim()) {
        return "L'organisme du DPO externe est obligatoire.";
      }
      if (form.dg_email && form.dpo_email === form.dg_email) {
        return "L'email du DPO doit être différent de celui du représentant légal.";
      }
    }
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    for (const s of [1, 2, 3] as Section[]) {
      const err = validateSection(s);
      if (err) { setSection(s); setError(err); return; }
    }
    setError('');
    setIsLoading(true);
    try {
      await authApi.register({
        denomination: form.denomination,
        numero_cc: form.numero_cc,
        telephone: form.telephone || undefined,
        adresse: form.adresse || undefined,
        ville: form.ville || undefined,
        region: form.region || undefined,
        dg_nom: form.dg_nom,
        dg_prenom: form.dg_prenom,
        dg_fonction: form.dg_fonction || undefined,
        dg_telephone: form.dg_telephone || undefined,
        dg_email: form.dg_email,
        dpo_nom: form.dpo_nom,
        dpo_prenom: form.dpo_prenom,
        dpo_telephone: form.dpo_telephone || undefined,
        dpo_email: form.dpo_email,
        dpo_type: form.dpo_type,
        dpo_organisme: form.dpo_type === 'externe' ? form.dpo_organisme : undefined,
      });
      setSubmitted(true);
    } catch {
      setError("Erreur lors de l'inscription. Vérifiez que l'email DG ou le numéro CC ne sont pas déjà utilisés.");
    } finally {
      setIsLoading(false);
    }
  }

  if (submitted) {
    return (
      <div className="text-center py-6">
        <CheckCircle className="w-14 h-14 text-green-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold mb-2">Votre inscription est en cours de vérification</h2>
        <p className="text-sm text-gray-600 mb-4">
          Nous avons bien reçu votre demande. Notre équipe va contacter
          personnellement le DG pour vérifier que l'inscription émane bien de l'entreprise.
        </p>
        <p className="text-sm text-gray-600 mb-6">
          Une fois validée, le représentant légal et le DPO recevront chacun
          par email leurs identifiants de connexion (email + mot de passe initial).
          Le mot de passe devra être changé à la première connexion.
        </p>
        <Link to={ROUTES.LOGIN} className="btn btn-outline inline-block no-underline">
          Retour à la connexion
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-xl font-bold text-center mb-1" style={{ color: 'var(--artci-black)' }}>
        Inscription
      </h2>
      <p className="text-sm text-gray-500 text-center mb-6">
        Créez votre compte entreprise (3 étapes)
      </p>

      <div className="flex items-start justify-center mb-6">
        {SECTIONS.map(({ num, title, icon: Icon }, i) => (
          <div key={num} className="flex items-start">
            <div className="flex flex-col items-center text-center w-24">
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
              <div className={cn('h-0.5 w-8 sm:w-16 mt-[18px]', section > num ? 'bg-green-500' : 'bg-gray-300')} />
            )}
          </div>
        ))}
      </div>

      {error && <div className="alert alert-danger mb-4">{error}</div>}

      <form onSubmit={handleSubmit}>
        {section === 1 && <SectionEntreprise form={form} updateField={updateField} />}
        {section === 2 && <SectionRepresentant form={form} updateField={updateField} />}
        {section === 3 && <SectionDPO form={form} updateField={updateField} />}

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

function SectionEntreprise({ form, updateField }: SectionProps) {
  return (
    <fieldset className="border border-gray-300 px-5 pt-2 pb-4">
      <legend className="px-3 font-bold text-base flex items-center gap-2 mx-auto">
        <Building2 className="w-4 h-4 text-[var(--artci-orange)]" />
        Informations sur l'entreprise
      </legend>
      <div className="form-group">
        <label htmlFor="denomination">Dénomination *</label>
        <input id="denomination" type="text" required
          value={form.denomination} onChange={(e) => updateField('denomination', e.target.value)} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="form-group">
          <label htmlFor="numero_cc">N° Compte Contribuable *</label>
          <input id="numero_cc" type="text" required
            value={form.numero_cc} onChange={(e) => updateField('numero_cc', e.target.value)} />
        </div>
        <div className="form-group">
          <label htmlFor="telephone">Téléphone entreprise</label>
          <input id="telephone" type="tel"
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
    </fieldset>
  );
}

function SectionRepresentant({ form, updateField }: SectionProps) {
  return (
    <fieldset className="border border-gray-300 px-5 pt-2 pb-4">
      <legend className="px-3 font-bold text-base flex items-center gap-2 mx-auto">
        <UserCheck className="w-4 h-4 text-[var(--artci-orange)]" />
        Représentant légal / Référant (DG)
      </legend>
      <div className="alert alert-info mb-4 flex items-start gap-2 text-sm">
        <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
        <div>L'email saisi ici servira d'identifiant de connexion au DG.</div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="form-group">
          <label htmlFor="dg_nom">Nom *</label>
          <input id="dg_nom" type="text" required
            value={form.dg_nom} onChange={(e) => updateField('dg_nom', e.target.value)} />
        </div>
        <div className="form-group">
          <label htmlFor="dg_prenom">Prénom *</label>
          <input id="dg_prenom" type="text" required
            value={form.dg_prenom} onChange={(e) => updateField('dg_prenom', e.target.value)} />
        </div>
      </div>
      <div className="form-group">
        <label htmlFor="dg_fonction">Fonction</label>
        <input id="dg_fonction" type="text" placeholder="Ex : Directeur Général"
          value={form.dg_fonction} onChange={(e) => updateField('dg_fonction', e.target.value)} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="form-group">
          <label htmlFor="dg_telephone">Téléphone</label>
          <input id="dg_telephone" type="tel"
            value={form.dg_telephone} onChange={(e) => updateField('dg_telephone', e.target.value)} />
        </div>
        <div className="form-group">
          <label htmlFor="dg_email">Email d'accès *</label>
          <input id="dg_email" type="email" required
            value={form.dg_email} onChange={(e) => updateField('dg_email', e.target.value)} />
        </div>
      </div>
    </fieldset>
  );
}

function SectionDPO({ form, updateField }: SectionProps) {
  return (
    <fieldset className="border border-gray-300 px-5 pt-2 pb-4">
      <legend className="px-3 font-bold text-base flex items-center gap-2 mx-auto">
        <Lock className="w-4 h-4 text-[var(--artci-orange)]" />
        Délégué à la Protection des Données (DPO)
      </legend>
      <div className="alert alert-info mb-4 flex items-start gap-2 text-sm">
        <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
        <div>L'email saisi ici servira d'identifiant de connexion au DPO.</div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="form-group">
          <label htmlFor="dpo_nom">Nom *</label>
          <input id="dpo_nom" type="text" required
            value={form.dpo_nom} onChange={(e) => updateField('dpo_nom', e.target.value)} />
        </div>
        <div className="form-group">
          <label htmlFor="dpo_prenom">Prénom *</label>
          <input id="dpo_prenom" type="text" required
            value={form.dpo_prenom} onChange={(e) => updateField('dpo_prenom', e.target.value)} />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="form-group">
          <label htmlFor="dpo_telephone">Téléphone</label>
          <input id="dpo_telephone" type="tel"
            value={form.dpo_telephone} onChange={(e) => updateField('dpo_telephone', e.target.value)} />
        </div>
        <div className="form-group">
          <label htmlFor="dpo_email">Email d'accès *</label>
          <input id="dpo_email" type="email" required
            value={form.dpo_email} onChange={(e) => updateField('dpo_email', e.target.value)} />
        </div>
      </div>
      <div className="form-group">
        <label htmlFor="dpo_type">Type</label>
        <select id="dpo_type"
          value={form.dpo_type}
          onChange={(e) => updateField('dpo_type', e.target.value)}
        >
          <option value="interne">Interne (salarié)</option>
          <option value="externe">Externe (prestataire)</option>
        </select>
      </div>
      {form.dpo_type === 'externe' && (
        <div className="form-group">
          <label htmlFor="dpo_organisme">Organisme du DPO externe *</label>
          <input id="dpo_organisme" type="text" required
            value={form.dpo_organisme} onChange={(e) => updateField('dpo_organisme', e.target.value)} />
        </div>
      )}
    </fieldset>
  );
}
