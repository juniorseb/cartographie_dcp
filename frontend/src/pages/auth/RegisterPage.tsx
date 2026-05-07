import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Building2, UserCheck, Lock, Mail, ChevronRight, ChevronLeft, CheckCircle } from 'lucide-react';
import PasswordInput from '@/components/auth/PasswordInput';
import * as authApi from '@/api/auth.api';
import { ROUTES } from '@/utils/constants';
import { cn } from '@/utils/cn';

type Section = 1 | 2 | 3;

const SECTIONS = [
  { num: 1 as Section, title: 'Représentant légal', icon: UserCheck },
  { num: 2 as Section, title: 'DPO', icon: Building2 },
  { num: 3 as Section, title: 'Accès', icon: Lock },
];

export default function RegisterPage() {
  const [section, setSection] = useState<Section>(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const [form, setForm] = useState({
    // Entreprise (commun)
    denomination: '',
    numero_cc: '',
    telephone: '',
    adresse: '',
    ville: '',
    region: '',
    // Section 1 — DG
    dg_nom: '',
    dg_prenom: '',
    dg_fonction: '',
    dg_telephone: '',
    dg_email: '',
    // Section 2 — DPO
    dpo_nom: '',
    dpo_prenom: '',
    dpo_telephone: '',
    dpo_email: '',
    dpo_type: 'interne' as 'interne' | 'externe',
    dpo_organisme: '',
    // Section 3 — Accès
    acces_email_referant: '',
    acces_email_dpo: '',
    email: '',
    password: '',
    password_confirm: '',
  });

  function updateField(key: string, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function validateSection(s: Section): string {
    if (s === 1) {
      if (!form.denomination.trim()) return "La dénomination de l'entreprise est obligatoire.";
      if (!form.numero_cc.trim()) return 'Le numéro CC est obligatoire.';
      if (!form.dg_nom.trim() || !form.dg_prenom.trim()) return 'Le nom et prénom du représentant légal sont obligatoires.';
      if (!form.dg_email.trim()) return "L'email du représentant légal est obligatoire.";
    }
    if (s === 2) {
      if (!form.dpo_nom.trim() || !form.dpo_prenom.trim()) return 'Le nom et prénom du DPO sont obligatoires.';
      if (!form.dpo_email.trim()) return "L'email du DPO est obligatoire.";
      if (form.dpo_type === 'externe' && !form.dpo_organisme.trim()) {
        return "L'organisme du DPO externe est obligatoire.";
      }
    }
    if (s === 3) {
      if (!form.acces_email_referant.trim()) return "L'email d'accès du référant est obligatoire.";
      if (!form.acces_email_dpo.trim()) return "L'email d'accès du DPO est obligatoire.";
      if (!form.password) return 'Le mot de passe est obligatoire.';
      if (form.password.length < 8) return 'Le mot de passe doit contenir au moins 8 caractères.';
      if (form.password !== form.password_confirm) return 'Les mots de passe ne correspondent pas.';
    }
    return '';
  }

  function goNext() {
    const err = validateSection(section);
    if (err) {
      setError(err);
      return;
    }
    setError('');
    if (section < 3) setSection(((section + 1) as Section));
  }

  function goPrev() {
    setError('');
    if (section > 1) setSection(((section - 1) as Section));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const err = validateSection(3);
    if (err) {
      setError(err);
      return;
    }
    setError('');
    setIsLoading(true);
    try {
      // Email principal du compte = email d'acces du referant
      await authApi.register({
        email: form.acces_email_referant,
        password: form.password,
        password_confirm: form.password_confirm,
        denomination: form.denomination,
        numero_cc: form.numero_cc,
        telephone: form.telephone || undefined,
        adresse: form.adresse || undefined,
        ville: form.ville || undefined,
        region: form.region || undefined,
        dg_nom: form.dg_nom, dg_prenom: form.dg_prenom,
        dg_fonction: form.dg_fonction || undefined,
        dg_telephone: form.dg_telephone || undefined,
        dg_email: form.dg_email,
        dpo_nom: form.dpo_nom, dpo_prenom: form.dpo_prenom,
        dpo_telephone: form.dpo_telephone || undefined,
        dpo_email: form.dpo_email,
        dpo_type: form.dpo_type,
        dpo_organisme: form.dpo_type === 'externe' ? form.dpo_organisme : undefined,
        acces_email_referant: form.acces_email_referant,
        acces_email_dpo: form.acces_email_dpo,
      });
      setSubmitted(true);
    } catch {
      setError("Erreur lors de l'inscription. Vérifiez vos informations ou si l'email/CC n'est pas déjà utilisé.");
    } finally {
      setIsLoading(false);
    }
  }

  if (submitted) {
    return (
      <div className="text-center py-6">
        <CheckCircle className="w-14 h-14 text-green-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold mb-2">Votre inscription est en cours de vérification</h2>
        <p className="text-sm text-gray-600 mb-6">
          Nous avons bien reçu votre demande d'inscription. Notre équipe va contacter
          personnellement le DG (ou mener ses propres vérifications) pour confirmer que
          l'inscription émane bien de l'entreprise.
        </p>
        <p className="text-sm text-gray-600 mb-6">
          Une fois validée, le représentant légal et le DPO recevront un email leur
          permettant de se connecter à la plateforme.
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

      {/* Stepper */}
      <div className="flex items-center justify-between mb-6">
        {SECTIONS.map(({ num, title, icon: Icon }, i) => (
          <div key={num} className="flex items-center flex-1">
            <div className="flex flex-col items-center text-center">
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
              <span className="text-[10px] font-semibold text-gray-600 mt-1 hidden sm:block">{title}</span>
            </div>
            {i < SECTIONS.length - 1 && (
              <div className={cn('h-0.5 flex-1 mx-2', section > num ? 'bg-green-500' : 'bg-gray-300')} />
            )}
          </div>
        ))}
      </div>

      {error && <div className="alert alert-danger mb-4">{error}</div>}

      <form onSubmit={handleSubmit}>
        {section === 1 && (
          <SectionRepresentant form={form} updateField={updateField} />
        )}
        {section === 2 && (
          <SectionDPO form={form} updateField={updateField} />
        )}
        {section === 3 && (
          <SectionAcces form={form} updateField={updateField} />
        )}

        <div className="flex items-center justify-between gap-3 mt-6">
          {section > 1 ? (
            <button
              type="button"
              onClick={goPrev}
              className="btn btn-outline flex items-center gap-2"
            >
              <ChevronLeft className="w-4 h-4" />
              Précédent
            </button>
          ) : <div />}
          {section < 3 ? (
            <button
              type="button"
              onClick={goNext}
              className="btn btn-primary flex items-center gap-2"
            >
              Suivant
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={isLoading}
              className="btn btn-primary flex items-center gap-2"
            >
              {isLoading ? (
                <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
              ) : (
                <>Soumettre l'inscription</>
              )}
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

function SectionRepresentant({ form, updateField }: SectionProps) {
  return (
    <div>
      <h3 className="font-bold text-base mb-3 flex items-center gap-2">
        <Building2 className="w-4 h-4 text-[var(--artci-orange)]" />
        Entreprise
      </h3>
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

      <h3 className="font-bold text-base mb-3 mt-6 flex items-center gap-2">
        <UserCheck className="w-4 h-4 text-[var(--artci-orange)]" />
        Représentant légal / Référant (DG)
      </h3>
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
          <label htmlFor="dg_email">Email *</label>
          <input id="dg_email" type="email" required
            value={form.dg_email} onChange={(e) => updateField('dg_email', e.target.value)} />
        </div>
      </div>
    </div>
  );
}

function SectionDPO({ form, updateField }: SectionProps) {
  return (
    <div>
      <h3 className="font-bold text-base mb-3 flex items-center gap-2">
        <Building2 className="w-4 h-4 text-[var(--artci-orange)]" />
        Délégué à la Protection des Données (DPO)
      </h3>
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
          <label htmlFor="dpo_email">Email *</label>
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
    </div>
  );
}

function SectionAcces({ form, updateField }: SectionProps) {
  return (
    <div>
      <h3 className="font-bold text-base mb-3 flex items-center gap-2">
        <Mail className="w-4 h-4 text-[var(--artci-orange)]" />
        Emails d'accès à la plateforme
      </h3>
      <div className="alert alert-info mb-4 text-sm">
        Le représentant légal et le DPO recevront chacun leur accès une fois la
        demande d'inscription validée par l'ARTCI.
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="form-group">
          <label htmlFor="acces_email_referant">Email d'accès — Référant *</label>
          <input id="acces_email_referant" type="email" required
            value={form.acces_email_referant}
            onChange={(e) => updateField('acces_email_referant', e.target.value)} />
        </div>
        <div className="form-group">
          <label htmlFor="acces_email_dpo">Email d'accès — DPO *</label>
          <input id="acces_email_dpo" type="email" required
            value={form.acces_email_dpo}
            onChange={(e) => updateField('acces_email_dpo', e.target.value)} />
        </div>
      </div>
      <h3 className="font-bold text-base mb-3 mt-6 flex items-center gap-2">
        <Lock className="w-4 h-4 text-[var(--artci-orange)]" />
        Mot de passe initial
      </h3>
      <p className="text-xs text-gray-500 mb-3">
        Ce mot de passe vous permettra de vous connecter une fois votre inscription validée.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="form-group">
          <label htmlFor="reg_password">Mot de passe *</label>
          <PasswordInput id="reg_password" value={form.password}
            onChange={(v) => updateField('password', v)}
            placeholder="Min. 8 caractères"
            autoComplete="new-password" />
        </div>
        <div className="form-group">
          <label htmlFor="reg_password_confirm">Confirmation *</label>
          <PasswordInput id="reg_password_confirm" value={form.password_confirm}
            onChange={(v) => updateField('password_confirm', v)}
            placeholder="Confirmez"
            autoComplete="new-password" />
        </div>
      </div>
    </div>
  );
}
