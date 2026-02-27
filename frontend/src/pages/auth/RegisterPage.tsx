import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UserPlus } from 'lucide-react';
import PasswordInput from '@/components/auth/PasswordInput';
import * as authApi from '@/api/auth.api';
import { ROUTES } from '@/utils/constants';

export default function RegisterPage() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    email: '',
    password: '',
    password_confirm: '',
    denomination: '',
    numero_cc: '',
    telephone: '',
    adresse: '',
    ville: '',
    region: '',
  });

  function updateField(key: string, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (form.password !== form.password_confirm) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }
    if (form.password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères.');
      return;
    }

    setIsLoading(true);
    try {
      await authApi.register(form);
      navigate(ROUTES.VERIFY_OTP, { state: { email: form.email, type: 'inscription' } });
    } catch {
      setError('Erreur lors de l\'inscription. Vérifiez vos informations.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div>
      <h2 className="text-xl font-bold text-center mb-1" style={{ color: 'var(--artci-black)' }}>
        Inscription
      </h2>
      <p className="text-sm text-gray-500 text-center mb-6">
        Créez votre compte entreprise
      </p>

      {error && <div className="alert alert-danger mb-4">{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="denomination">Dénomination *</label>
          <input
            id="denomination"
            type="text"
            value={form.denomination}
            onChange={(e) => updateField('denomination', e.target.value)}
            placeholder="Nom de l'entreprise"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="numero_cc">N° Compte Contribuable *</label>
          <input
            id="numero_cc"
            type="text"
            value={form.numero_cc}
            onChange={(e) => updateField('numero_cc', e.target.value)}
            placeholder="Numéro CC"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="reg_email">Adresse email *</label>
          <input
            id="reg_email"
            type="email"
            value={form.email}
            onChange={(e) => updateField('email', e.target.value)}
            placeholder="votre@email.com"
            required
            autoComplete="email"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="form-group">
            <label htmlFor="reg_password">Mot de passe *</label>
            <PasswordInput
              id="reg_password"
              value={form.password}
              onChange={(v) => updateField('password', v)}
              placeholder="Min. 8 caractères"
              autoComplete="new-password"
            />
          </div>
          <div className="form-group">
            <label htmlFor="reg_password_confirm">Confirmation *</label>
            <PasswordInput
              id="reg_password_confirm"
              value={form.password_confirm}
              onChange={(v) => updateField('password_confirm', v)}
              placeholder="Confirmez"
              autoComplete="new-password"
            />
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="reg_telephone">Téléphone</label>
          <input
            id="reg_telephone"
            type="tel"
            value={form.telephone}
            onChange={(e) => updateField('telephone', e.target.value)}
            placeholder="+225 XX XX XX XX"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="form-group">
            <label htmlFor="reg_ville">Ville</label>
            <input
              id="reg_ville"
              type="text"
              value={form.ville}
              onChange={(e) => updateField('ville', e.target.value)}
              placeholder="Ville"
            />
          </div>
          <div className="form-group">
            <label htmlFor="reg_region">Région</label>
            <input
              id="reg_region"
              type="text"
              value={form.region}
              onChange={(e) => updateField('region', e.target.value)}
              placeholder="Région"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="btn btn-primary w-full flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <div className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }} />
          ) : (
            <>
              <UserPlus className="w-4 h-4" />
              S'inscrire
            </>
          )}
        </button>
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
