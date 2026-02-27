import { useState, useCallback } from 'react';
import { MessageSquare, CheckCircle, Plus, Trash2 } from 'lucide-react';
import * as adminApi from '@/api/admin.api';
import { useApi } from '@/hooks/useApi';
import Loading from '@/components/common/Loading';

export default function FeedbackAdminPage() {
  const [entiteId, setEntiteId] = useState('');
  const [commentaires, setCommentaires] = useState('');
  const [elements, setElements] = useState<string[]>([]);
  const [delai, setDelai] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Load entites en vérification
  const fetchEntites = useCallback(
    () => adminApi.getEntites({ statut_workflow: 'en_verification', per_page: 100 }),
    []
  );
  const { data: entitesData, isLoading } = useApi(fetchEntites, []);

  function addElement() {
    setElements([...elements, '']);
  }

  function removeElement(index: number) {
    setElements(elements.filter((_, i) => i !== index));
  }

  function updateElement(index: number, value: string) {
    const newElements = [...elements];
    newElements[index] = value;
    setElements(newElements);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!entiteId || !commentaires) {
      setError('Veuillez sélectionner une entité et entrer un commentaire.');
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await adminApi.createFeedback({
        entite_id: entiteId,
        commentaires,
        elements_manquants: elements.filter(Boolean),
        delai_fourniture: delai || undefined,
      });
      setSuccess('Feedback envoyé avec succès.');
      setEntiteId('');
      setCommentaires('');
      setElements([]);
      setDelai('');
    } catch {
      setError('Erreur lors de l\'envoi du feedback.');
    } finally {
      setSaving(false);
    }
  }

  if (isLoading) return <Loading fullPage text="Chargement..." />;

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl mb-6 flex items-center gap-3">
        <MessageSquare className="w-7 h-7 text-[var(--artci-green)]" />
        Feedback de vérification
      </h1>

      {error && <div className="alert alert-danger mb-4">{error}</div>}
      {success && (
        <div className="alert alert-success mb-4 flex items-center gap-2">
          <CheckCircle className="w-4 h-4" /> {success}
        </div>
      )}

      <form onSubmit={handleSubmit} className="card">
        <div className="form-group">
          <label>Entité (en vérification)</label>
          <select value={entiteId} onChange={(e) => setEntiteId(e.target.value)} required>
            <option value="">Sélectionnez une entité...</option>
            {entitesData?.items.map((ent) => (
              <option key={ent.id} value={ent.id}>
                {ent.denomination} — {ent.numero_cc}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Commentaires *</label>
          <textarea
            value={commentaires}
            onChange={(e) => setCommentaires(e.target.value)}
            rows={4}
            placeholder="Décrivez vos observations..."
            required
          />
        </div>

        <div className="form-group">
          <label>Éléments manquants</label>
          {elements.map((el, i) => (
            <div key={i} className="flex gap-2 mb-2">
              <input
                type="text"
                value={el}
                onChange={(e) => updateElement(i, e.target.value)}
                placeholder={`Élément ${i + 1}`}
                className="flex-1"
              />
              <button type="button" className="text-red-400 hover:text-red-600" onClick={() => removeElement(i)}>
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          <button type="button" className="btn btn-outline text-sm py-2 flex items-center gap-1" onClick={addElement}>
            <Plus className="w-4 h-4" /> Ajouter un élément
          </button>
        </div>

        <div className="form-group">
          <label>Délai de fourniture</label>
          <input
            type="text"
            value={delai}
            onChange={(e) => setDelai(e.target.value)}
            placeholder="Ex: 15 jours"
          />
        </div>

        <button type="submit" disabled={saving} className="btn btn-primary w-full flex items-center justify-center gap-2">
          {saving ? <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> : <MessageSquare className="w-4 h-4" />}
          Envoyer le feedback
        </button>
      </form>
    </div>
  );
}
