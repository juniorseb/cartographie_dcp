import { useState } from 'react';
import { Link } from 'react-router-dom';
import { User, Save, KeyRound } from 'lucide-react';
import { useApi } from '@/hooks/useApi';
import * as entrepriseApi from '@/api/entreprise.api';
import Loading from '@/components/common/Loading';
import ErrorDisplay from '@/components/common/ErrorDisplay';
import { ROUTES } from '@/utils/constants';
import { formatDate } from '@/utils/format';

export default function ProfilPage() {
  const { data: profil, isLoading, error, refetch } = useApi(
    () => entrepriseApi.getProfil(),
    []
  );

  const [form, setForm] = useState({
    telephone: '',
    adresse: '',
    ville: '',
    region: '',
  });
  const [formInitialized, setFormInitialized] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Init form when profil loads
  if (profil && !formInitialized) {
    setForm({
      telephone: profil.telephone ?? '',
      adresse: profil.adresse ?? '',
      ville: profil.ville ?? '',
      region: profil.region ?? '',
    });
    setFormInitialized(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaveError('');
    setSaveSuccess(false);

    try {
      await entrepriseApi.updateProfil({
        telephone: form.telephone || undefined,
        adresse: form.adresse || undefined,
        ville: form.ville || undefined,
        region: form.region || undefined,
      });
      setSaveSuccess(true);
      refetch();
    } catch {
      setSaveError('Erreur lors de la mise à jour du profil.');
    } finally {
      setSaving(false);
    }
  }

  if (isLoading) return <Loading fullPage text="Chargement du profil..." />;
  if (error) return <ErrorDisplay message={error} onRetry={refetch} />;
  if (!profil) return null;

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl mb-6">Mon Profil</h1>

      {/* Infos non modifiables */}
      <div className="card mb-6">
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
          <User className="w-5 h-5 text-[var(--artci-orange)]" />
          Informations du compte
        </h3>
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="font-semibold text-gray-600">Dénomination</span>
            <span>{profil.denomination}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="font-semibold text-gray-600">N° CC</span>
            <span>{profil.numero_cc}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="font-semibold text-gray-600">Email</span>
            <span>{profil.email}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="font-semibold text-gray-600">Email vérifié</span>
            <span className={profil.email_verified ? 'text-green-600 font-semibold' : 'text-red-500'}>
              {profil.email_verified ? 'Oui' : 'Non'}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="font-semibold text-gray-600">Inscription</span>
            <span>{formatDate(profil.createdAt)}</span>
          </div>
          {profil.password_expires_at && (
            <div className="flex justify-between text-sm">
              <span className="font-semibold text-gray-600">Expiration mot de passe</span>
              <span>{formatDate(profil.password_expires_at)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Infos modifiables */}
      <div className="card mb-6">
        <h3 className="text-lg font-bold mb-4">Modifier mes coordonnées</h3>

        {saveError && <div className="alert alert-danger mb-4">{saveError}</div>}
        {saveSuccess && <div className="alert alert-success mb-4">Profil mis à jour avec succès.</div>}

        <form onSubmit={handleSave}>
          <div className="form-group">
            <label htmlFor="prof_tel">Téléphone</label>
            <input
              id="prof_tel"
              type="tel"
              value={form.telephone}
              onChange={(e) => setForm({ ...form, telephone: e.target.value })}
              placeholder="+225 XX XX XX XX"
            />
          </div>
          <div className="form-group">
            <label htmlFor="prof_adresse">Adresse</label>
            <input
              id="prof_adresse"
              type="text"
              value={form.adresse}
              onChange={(e) => setForm({ ...form, adresse: e.target.value })}
              placeholder="Adresse"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="form-group">
              <label htmlFor="prof_ville">Ville</label>
              <input
                id="prof_ville"
                type="text"
                value={form.ville}
                onChange={(e) => setForm({ ...form, ville: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label htmlFor="prof_region">Région</label>
              <input
                id="prof_region"
                type="text"
                value={form.region}
                onChange={(e) => setForm({ ...form, region: e.target.value })}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="btn btn-primary flex items-center gap-2"
          >
            {saving ? (
              <div className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }} />
            ) : (
              <>
                <Save className="w-4 h-4" />
                Enregistrer
              </>
            )}
          </button>
        </form>
      </div>

      {/* Changer mot de passe */}
      <div className="card">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-[var(--artci-orange)]" />
            <span className="font-bold">Mot de passe</span>
          </div>
          <Link
            to={ROUTES.ENTREPRISE_CHANGE_PASSWORD}
            className="btn btn-outline text-sm py-2 px-4"
          >
            Changer le mot de passe
          </Link>
        </div>
      </div>
    </div>
  );
}
