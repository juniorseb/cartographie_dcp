import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Save } from 'lucide-react';
import * as adminApi from '@/api/admin.api';
import type { DemandeInput } from '@/types/entreprise';

export default function EntiteCreatePage() {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState<DemandeInput>({
    denomination: '',
    numero_cc: '',
    forme_juridique: '',
    secteur_activite: '',
    adresse: '',
    ville: '',
    region: '',
    telephone: '',
    email: '',
  });

  function updateField(key: keyof DemandeInput, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.denomination || !form.numero_cc) {
      setError('Dénomination et N° CC sont obligatoires.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const result = await adminApi.createEntite(form);
      navigate(`/admin/entites/${result.id}`);
    } catch {
      setError('Erreur lors de la création de l\'entité.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl mb-6">Nouvelle Entité (Saisie ARTCI)</h1>

      {error && <div className="alert alert-danger mb-4">{error}</div>}

      <form onSubmit={handleSubmit} className="card">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="form-group">
            <label>Dénomination *</label>
            <input type="text" value={form.denomination} onChange={(e) => updateField('denomination', e.target.value)} required />
          </div>
          <div className="form-group">
            <label>N° Compte Contribuable *</label>
            <input type="text" value={form.numero_cc} onChange={(e) => updateField('numero_cc', e.target.value)} required />
          </div>
          <div className="form-group">
            <label>Forme juridique</label>
            <input type="text" value={form.forme_juridique ?? ''} onChange={(e) => updateField('forme_juridique', e.target.value)} />
          </div>
          <div className="form-group">
            <label>Secteur d'activité</label>
            <select value={form.secteur_activite ?? ''} onChange={(e) => updateField('secteur_activite', e.target.value)}>
              <option value="">Sélectionnez...</option>
              <option value="Télécommunications">Télécommunications</option>
              <option value="Banque / Finance">Banque / Finance</option>
              <option value="Assurance">Assurance</option>
              <option value="Santé">Santé</option>
              <option value="Éducation">Éducation</option>
              <option value="Commerce">Commerce</option>
              <option value="Industrie">Industrie</option>
              <option value="Services">Services</option>
              <option value="Transport">Transport</option>
              <option value="Autre">Autre</option>
            </select>
          </div>
          <div className="form-group sm:col-span-2">
            <label>Adresse</label>
            <input type="text" value={form.adresse ?? ''} onChange={(e) => updateField('adresse', e.target.value)} />
          </div>
          <div className="form-group">
            <label>Ville</label>
            <input type="text" value={form.ville ?? ''} onChange={(e) => updateField('ville', e.target.value)} />
          </div>
          <div className="form-group">
            <label>Région</label>
            <input type="text" value={form.region ?? ''} onChange={(e) => updateField('region', e.target.value)} />
          </div>
          <div className="form-group">
            <label>Téléphone</label>
            <input type="tel" value={form.telephone ?? ''} onChange={(e) => updateField('telephone', e.target.value)} />
          </div>
          <div className="form-group">
            <label>Email</label>
            <input type="email" value={form.email ?? ''} onChange={(e) => updateField('email', e.target.value)} />
          </div>
        </div>

        <button type="submit" disabled={saving} className="btn btn-primary flex items-center gap-2 mt-4">
          {saving ? <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> : <Save className="w-4 h-4" />}
          Créer l'entité
        </button>
      </form>
    </div>
  );
}
