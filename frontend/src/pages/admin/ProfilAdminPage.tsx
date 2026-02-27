import { useState } from 'react';
import { User, Save, Key } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import * as adminApi from '@/api/admin.api';
import { ROUTES } from '@/utils/constants';
import { formatDate } from '@/utils/format';

const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super Administrateur',
  admin: 'Administrateur',
  editor: 'Éditeur',
  reader: 'Lecteur',
};

export default function ProfilAdminPage() {
  const { user } = useAuth();

  const [nom, setNom] = useState(user?.nom ?? '');
  const [prenom, setPrenom] = useState(user?.prenom ?? '');
  const [telephone, setTelephone] = useState(user?.telephone ?? '');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  if (!user) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSuccess('');
    setError('');
    setSaving(true);

    try {
      await adminApi.updateUser(user!.id, { nom, prenom, telephone: telephone || undefined });
      setSuccess('Profil mis à jour avec succès.');
    } catch {
      setError('Erreur lors de la mise à jour du profil.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl mb-6 flex items-center gap-3">
        <User className="w-6 h-6 text-[var(--artci-green)]" />
        Mon Profil
      </h1>

      {/* Infos non modifiables */}
      <div className="card mb-6">
        <h2 className="text-lg font-bold mb-4">Informations du compte</h2>
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-1">
            <span className="text-sm font-semibold text-gray-600 sm:w-40">Email</span>
            <span className="text-sm">{user.email}</span>
          </div>
          <div className="flex flex-col sm:flex-row gap-1">
            <span className="text-sm font-semibold text-gray-600 sm:w-40">Rôle</span>
            <span className="text-sm font-semibold text-[var(--artci-green)]">
              {ROLE_LABELS[user.role] ?? user.role}
            </span>
          </div>
          <div className="flex flex-col sm:flex-row gap-1">
            <span className="text-sm font-semibold text-gray-600 sm:w-40">Dernière connexion</span>
            <span className="text-sm">{user.last_login ? formatDate(user.last_login) : 'N/A'}</span>
          </div>
          <div className="flex flex-col sm:flex-row gap-1">
            <span className="text-sm font-semibold text-gray-600 sm:w-40">Créé le</span>
            <span className="text-sm">{formatDate(user.createdAt)}</span>
          </div>
        </div>
      </div>

      {/* Formulaire modifiable */}
      <form onSubmit={handleSubmit} className="card mb-6">
        <h2 className="text-lg font-bold mb-4">Modifier mes informations</h2>

        {success && <div className="alert alert-success mb-4">{success}</div>}
        {error && <div className="alert alert-danger mb-4">{error}</div>}

        <div className="space-y-4">
          <div className="form-group">
            <label className="text-sm font-semibold">Nom</label>
            <input type="text" value={nom} onChange={(e) => setNom(e.target.value)} required />
          </div>
          <div className="form-group">
            <label className="text-sm font-semibold">Prénom</label>
            <input type="text" value={prenom} onChange={(e) => setPrenom(e.target.value)} required />
          </div>
          <div className="form-group">
            <label className="text-sm font-semibold">Téléphone</label>
            <input type="tel" value={telephone} onChange={(e) => setTelephone(e.target.value)} placeholder="+225 XX XX XX XX" />
          </div>
        </div>

        <button type="submit" className="btn btn-secondary mt-4" disabled={saving}>
          {saving ? <div className="spinner" /> : <Save className="w-4 h-4" />}
          Enregistrer
        </button>
      </form>

      {/* Sécurité */}
      <div className="card">
        <h2 className="text-lg font-bold mb-4">Sécurité</h2>
        <Link to={ROUTES.ENTREPRISE_CHANGE_PASSWORD} className="btn btn-outline no-underline">
          <Key className="w-4 h-4" />
          Changer le mot de passe
        </Link>
      </div>
    </div>
  );
}
