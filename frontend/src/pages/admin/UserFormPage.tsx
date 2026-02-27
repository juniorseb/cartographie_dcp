import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Save, UserPlus } from 'lucide-react';
import * as adminApi from '@/api/admin.api';
import { useApi } from '@/hooks/useApi';
import Loading from '@/components/common/Loading';
import PasswordInput from '@/components/auth/PasswordInput';
import { ROUTES } from '@/utils/constants';
import type { Role } from '@/types/enums';

const ROLES: { value: Role; label: string }[] = [
  { value: 'reader', label: 'Lecteur' },
  { value: 'editor', label: 'Éditeur' },
  { value: 'admin', label: 'Admin' },
  { value: 'super_admin', label: 'Super Admin' },
];

export default function UserFormPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);

  const [nom, setNom] = useState('');
  const [prenom, setPrenom] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>('reader');
  const [telephone, setTelephone] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Load existing user for edit
  const fetchUsers = useCallback(
    () => (id ? adminApi.getUsers(1, 200) : Promise.resolve(null)),
    [id]
  );
  const { data: usersData, isLoading } = useApi(fetchUsers, [id]);

  useEffect(() => {
    if (isEdit && usersData) {
      const existing = usersData.items.find((u) => u.id === id);
      if (existing) {
        setNom(existing.nom);
        setPrenom(existing.prenom);
        setEmail(existing.email);
        setRole(existing.role);
        setTelephone(existing.telephone ?? '');
      }
    }
  }, [isEdit, usersData, id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nom || !prenom || !email) {
      setError('Nom, prénom et email sont obligatoires.');
      return;
    }
    if (!isEdit && !password) {
      setError('Le mot de passe est obligatoire pour un nouvel utilisateur.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      if (isEdit && id) {
        await adminApi.updateUser(id, {
          nom,
          prenom,
          email,
          role,
          telephone: telephone || undefined,
        });
      } else {
        await adminApi.createUser({
          nom,
          prenom,
          email,
          password,
          role,
          telephone: telephone || undefined,
        });
      }
      navigate(ROUTES.ADMIN_USERS);
    } catch {
      setError(isEdit ? "Erreur lors de la modification." : "Erreur lors de la création.");
    } finally {
      setSaving(false);
    }
  }

  if (isLoading) return <Loading fullPage text="Chargement..." />;

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl mb-6 flex items-center gap-3">
        <UserPlus className="w-7 h-7 text-[var(--artci-green)]" />
        {isEdit ? 'Modifier l\'utilisateur' : 'Nouvel utilisateur'}
      </h1>

      {error && <div className="alert alert-danger mb-4">{error}</div>}

      <form onSubmit={handleSubmit} className="card">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="form-group">
            <label>Prénom *</label>
            <input
              type="text"
              value={prenom}
              onChange={(e) => setPrenom(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label>Nom *</label>
            <input
              type="text"
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              required
            />
          </div>
          <div className="form-group sm:col-span-2">
            <label>Email *</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          {!isEdit && (
            <div className="form-group sm:col-span-2">
              <label>Mot de passe *</label>
              <PasswordInput
                value={password}
                onChange={setPassword}
                placeholder="Minimum 8 caractères"
              />
            </div>
          )}
          <div className="form-group">
            <label>Rôle *</label>
            <select value={role} onChange={(e) => setRole(e.target.value as Role)} required>
              {ROLES.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Téléphone</label>
            <input
              type="tel"
              value={telephone}
              onChange={(e) => setTelephone(e.target.value)}
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="btn btn-primary w-full flex items-center justify-center gap-2 mt-4"
        >
          {saving ? (
            <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {isEdit ? 'Enregistrer' : 'Créer l\'utilisateur'}
        </button>
      </form>
    </div>
  );
}
