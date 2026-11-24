import { useState, useCallback, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { UserCheck, CheckCircle, Activity, Plus, X } from 'lucide-react';
import * as adminApi from '@/api/admin.api';
import { useApi } from '@/hooks/useApi';
import Loading from '@/components/common/Loading';
import EmptyState from '@/components/common/EmptyState';
import { ROUTES } from '@/utils/constants';
import { formatDate } from '@/utils/format';
import type { StatutAssignation } from '@/types/enums';

// "Niveau de traitement" = statut de l'assignation
const NIVEAU_TRAITEMENT: Record<StatutAssignation, { label: string; className: string }> = {
  en_cours: { label: 'En cours de traitement', className: 'badge-encours' },
  traite_attente_validation: { label: 'Traité — en attente validation', className: 'badge-achevee' },
  valide: { label: 'Validé', className: 'badge-conforme' },
  en_retard: { label: 'En retard', className: 'badge-rejete' },
};

export default function AssignationPage() {
  // Pre-selection via ?entite=... quand on arrive depuis Mon Panier
  const [searchParams] = useSearchParams();
  const entiteFromUrl = searchParams.get('entite');
  const [showForm, setShowForm] = useState(Boolean(entiteFromUrl));
  const [entiteId, setEntiteId] = useState(entiteFromUrl ?? '');
  const [agentId, setAgentId] = useState('');
  const [echeance, setEcheance] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Scroll vers le formulaire quand pre-rempli depuis le panier
  useEffect(() => {
    if (entiteFromUrl) {
      setTimeout(() => {
        document.getElementById('assignation-form')?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, [entiteFromUrl]);

  // Liste de toutes les assignations
  const { data: assignations, isLoading, refetch } = useApi(() => adminApi.getAllAssignations(), []);

  // Entités assignables (demandes soumises)
  const fetchEntites = useCallback(
    () => adminApi.getEntites({ statut_workflow: 'soumis', per_page: 100 }),
    []
  );
  const { data: entitesData } = useApi(fetchEntites, []);

  // Agents
  const { data: usersData } = useApi(() => adminApi.getUsers(1, 100), []);

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
      setShowForm(false);
      refetch();
    } catch {
      setError("Erreur lors de l'assignation.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <h1 className="text-2xl flex items-center gap-3">
          <UserCheck className="w-7 h-7 text-[var(--brand-secondary)]" />
          Assignation
        </h1>
        <div className="flex items-center gap-2">
          <Link
            to={ROUTES.ADMIN_SUIVI_AGENTS}
            className="btn btn-outline text-sm flex items-center gap-2 no-underline"
          >
            <Activity className="w-4 h-4" /> Suivi des agents
          </Link>
          <button
            onClick={() => { setShowForm((v) => !v); setError(''); setSuccess(''); }}
            className="btn btn-primary text-sm flex items-center gap-2"
          >
            {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {showForm ? 'Fermer' : 'Nouvelle assignation'}
          </button>
        </div>
      </div>

      {error && <div className="alert alert-danger mb-4">{error}</div>}
      {success && (
        <div className="alert alert-success mb-4 flex items-center gap-2">
          <CheckCircle className="w-4 h-4" /> {success}
        </div>
      )}

      {/* Formulaire de nouvelle assignation (repliable) */}
      {showForm && (
        <form id="assignation-form" onSubmit={handleSubmit} className="card mb-6">
          <h2 className="text-lg font-bold mb-4">Nouvelle assignation</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="form-group mb-0">
              <label>Entité (demandes soumises)</label>
              <select value={entiteId} onChange={(e) => setEntiteId(e.target.value)} required>
                <option value="">Sélectionnez une entité...</option>
                {entitesData?.items.map((e) => (
                  <option key={e.id} value={e.id}>{e.denomination} — {e.numero_cc}</option>
                ))}
              </select>
            </div>
            <div className="form-group mb-0">
              <label>Agent vérificateur</label>
              <select value={agentId} onChange={(e) => setAgentId(e.target.value)} required>
                <option value="">Sélectionnez un agent...</option>
                {usersData?.items.filter((u) => u.is_active).map((u) => (
                  <option key={u.id} value={u.id}>{u.prenom} {u.nom} ({u.role})</option>
                ))}
              </select>
            </div>
            <div className="form-group mb-0">
              <label>Échéance (optionnel)</label>
              <input type="date" value={echeance} onChange={(e) => setEcheance(e.target.value)} />
            </div>
          </div>
          <div className="flex justify-end mt-4">
            <button type="submit" disabled={saving} className="btn btn-primary flex items-center gap-2">
              {saving ? <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> : <UserCheck className="w-4 h-4" />}
              Assigner
            </button>
          </div>
        </form>
      )}

      {/* Liste des assignations */}
      {isLoading ? (
        <Loading text="Chargement des assignations..." />
      ) : !assignations || assignations.length === 0 ? (
        <EmptyState title="Aucune assignation" description="Aucune entité n'a encore été assignée." />
      ) : (
        <div className="table-container overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th>Entité</th>
                <th>Agent</th>
                <th>Échéance</th>
                <th>Niveau de traitement</th>
                <th>Assignée le</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {assignations.map((a) => {
                const niveau = NIVEAU_TRAITEMENT[a.statut];
                const agentNom = a.agent ? `${a.agent.prenom} ${a.agent.nom}` : (a.agent_nom ?? '-');
                return (
                  <tr key={a.id}>
                    <td className="font-semibold text-sm">{a.entite_denomination ?? a.entite_id}</td>
                    <td className="text-sm">{agentNom}</td>
                    <td className="text-sm">{a.echeance ? formatDate(a.echeance) : '-'}</td>
                    <td className="text-xs">
                      <span className={`badge ${niveau?.className ?? 'badge-encours'}`}>
                        {niveau?.label ?? a.statut}
                      </span>
                    </td>
                    <td className="text-sm">{a.date_assignation ? formatDate(a.date_assignation) : '-'}</td>
                    <td>
                      <Link
                        to={`/admin/entites/${a.entite_id}`}
                        className="text-[var(--brand-secondary)] hover:underline text-sm"
                      >
                        Voir l'entité
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
