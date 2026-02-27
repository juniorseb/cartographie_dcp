import { useState, useCallback } from 'react';
import { UserCheck, CheckCircle } from 'lucide-react';
import * as adminApi from '@/api/admin.api';
import { useApi } from '@/hooks/useApi';
import Loading from '@/components/common/Loading';

export default function AssignationPage() {
  const [entiteId, setEntiteId] = useState('');
  const [agentId, setAgentId] = useState('');
  const [echeance, setEcheance] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Load entites for selection
  const fetchEntites = useCallback(
    () => adminApi.getEntites({ statut_workflow: 'soumis', per_page: 100 }),
    []
  );
  const { data: entitesData, isLoading: entitesLoading } = useApi(fetchEntites, []);

  // Load users (agents) for selection
  const { data: usersData, isLoading: usersLoading } = useApi(
    () => adminApi.getUsers(1, 100),
    []
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!entiteId || !agentId) {
      setError('Veuillez sélectionner une entité et un agent.');
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await adminApi.createAssignation({
        entite_id: entiteId,
        agent_id: agentId,
        echeance: echeance || undefined,
      });
      setSuccess('Demande assignée avec succès.');
      setEntiteId('');
      setAgentId('');
      setEcheance('');
    } catch {
      setError('Erreur lors de l\'assignation.');
    } finally {
      setSaving(false);
    }
  }

  if (entitesLoading || usersLoading) return <Loading fullPage text="Chargement..." />;

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl mb-6 flex items-center gap-3">
        <UserCheck className="w-7 h-7 text-[var(--artci-green)]" />
        Assigner une demande
      </h1>

      {error && <div className="alert alert-danger mb-4">{error}</div>}
      {success && (
        <div className="alert alert-success mb-4 flex items-center gap-2">
          <CheckCircle className="w-4 h-4" /> {success}
        </div>
      )}

      <form onSubmit={handleSubmit} className="card">
        <div className="form-group">
          <label>Entité (demandes soumises)</label>
          <select value={entiteId} onChange={(e) => setEntiteId(e.target.value)} required>
            <option value="">Sélectionnez une entité...</option>
            {entitesData?.items.map((e) => (
              <option key={e.id} value={e.id}>
                {e.denomination} — {e.numero_cc}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Agent vérificateur</label>
          <select value={agentId} onChange={(e) => setAgentId(e.target.value)} required>
            <option value="">Sélectionnez un agent...</option>
            {usersData?.items
              .filter((u) => u.is_active)
              .map((u) => (
                <option key={u.id} value={u.id}>
                  {u.prenom} {u.nom} ({u.role})
                </option>
              ))}
          </select>
        </div>

        <div className="form-group">
          <label>Échéance (optionnel)</label>
          <input
            type="date"
            value={echeance}
            onChange={(e) => setEcheance(e.target.value)}
          />
        </div>

        <button type="submit" disabled={saving} className="btn btn-primary w-full flex items-center justify-center gap-2">
          {saving ? <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> : <UserCheck className="w-4 h-4" />}
          Assigner
        </button>
      </form>
    </div>
  );
}
