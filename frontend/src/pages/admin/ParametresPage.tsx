import { useState } from 'react';
import { Settings, Save, Sliders, Clock, Mail, Upload } from 'lucide-react';

interface ParametresState {
  // Seuils de conformité
  score_conforme: number;
  score_demarche_achevee: number;
  score_demarche_en_cours: number;
  // Délais
  echeance_traitement_jours: number;
  alerte_renouvellement_mois: number;
  expiration_otp_minutes: number;
  // Emails
  email_expediteur: string;
  notifications_actives: boolean;
  // Upload
  taille_max_mb: number;
  formats_autorises: string;
}

const DEFAULT_PARAMS: ParametresState = {
  score_conforme: 80,
  score_demarche_achevee: 60,
  score_demarche_en_cours: 30,
  echeance_traitement_jours: 30,
  alerte_renouvellement_mois: 3,
  expiration_otp_minutes: 10,
  email_expediteur: 'noreply@artci.ci',
  notifications_actives: true,
  taille_max_mb: 10,
  formats_autorises: 'pdf,xlsx,xls,jpg,jpeg,png',
};

export default function ParametresPage() {
  const [params, setParams] = useState<ParametresState>(DEFAULT_PARAMS);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  function updateParam<K extends keyof ParametresState>(key: K, value: ParametresState[K]) {
    setParams((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      // API sera ajoutée ultérieurement
      await new Promise((resolve) => setTimeout(resolve, 800));
      setSuccess('Paramètres sauvegardés avec succès.');
    } catch {
      setError('Erreur lors de la sauvegarde des paramètres.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl mb-6 flex items-center gap-3">
        <Settings className="w-7 h-7 text-[var(--artci-green)]" />
        Paramètres du système
      </h1>

      {error && <div className="alert alert-danger mb-4">{error}</div>}
      {success && <div className="alert alert-success mb-4">{success}</div>}

      {/* Section 1 : Seuils de conformité */}
      <div className="card mb-6">
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
          <Sliders className="w-5 h-5 text-[var(--artci-orange)]" />
          Seuils de conformité
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="form-group">
            <label htmlFor="score_conforme">Score conforme (%)</label>
            <div className="flex items-center gap-3">
              <input
                id="score_conforme"
                type="range"
                min={0}
                max={100}
                value={params.score_conforme}
                onChange={(e) => updateParam('score_conforme', Number(e.target.value))}
                className="flex-1"
              />
              <span className="text-sm font-mono w-10 text-right">{params.score_conforme}</span>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="score_demarche_achevee">Score démarche achevée (%)</label>
            <div className="flex items-center gap-3">
              <input
                id="score_demarche_achevee"
                type="range"
                min={0}
                max={100}
                value={params.score_demarche_achevee}
                onChange={(e) => updateParam('score_demarche_achevee', Number(e.target.value))}
                className="flex-1"
              />
              <span className="text-sm font-mono w-10 text-right">{params.score_demarche_achevee}</span>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="score_demarche_en_cours">Score démarche en cours (%)</label>
            <div className="flex items-center gap-3">
              <input
                id="score_demarche_en_cours"
                type="range"
                min={0}
                max={100}
                value={params.score_demarche_en_cours}
                onChange={(e) => updateParam('score_demarche_en_cours', Number(e.target.value))}
                className="flex-1"
              />
              <span className="text-sm font-mono w-10 text-right">{params.score_demarche_en_cours}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Section 2 : Délais */}
      <div className="card mb-6">
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5 text-[var(--artci-orange)]" />
          Délais
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="form-group">
            <label htmlFor="echeance_traitement_jours">Échéance traitement (jours)</label>
            <input
              id="echeance_traitement_jours"
              type="number"
              min={1}
              value={params.echeance_traitement_jours}
              onChange={(e) => updateParam('echeance_traitement_jours', Number(e.target.value))}
            />
          </div>

          <div className="form-group">
            <label htmlFor="alerte_renouvellement_mois">Alerte renouvellement (mois)</label>
            <input
              id="alerte_renouvellement_mois"
              type="number"
              min={1}
              value={params.alerte_renouvellement_mois}
              onChange={(e) => updateParam('alerte_renouvellement_mois', Number(e.target.value))}
            />
          </div>

          <div className="form-group">
            <label htmlFor="expiration_otp_minutes">Expiration OTP (minutes)</label>
            <input
              id="expiration_otp_minutes"
              type="number"
              min={1}
              value={params.expiration_otp_minutes}
              onChange={(e) => updateParam('expiration_otp_minutes', Number(e.target.value))}
            />
          </div>
        </div>
      </div>

      {/* Section 3 : Emails */}
      <div className="card mb-6">
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
          <Mail className="w-5 h-5 text-[var(--artci-orange)]" />
          Emails
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="form-group">
            <label htmlFor="email_expediteur">Email expéditeur</label>
            <input
              id="email_expediteur"
              type="email"
              value={params.email_expediteur}
              onChange={(e) => updateParam('email_expediteur', e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="block mb-2">Notifications actives</label>
            <label className="flex items-center gap-3 cursor-pointer text-sm">
              <input
                type="checkbox"
                checked={params.notifications_actives}
                onChange={(e) => updateParam('notifications_actives', e.target.checked)}
              />
              {params.notifications_actives ? 'Activées' : 'Désactivées'}
            </label>
          </div>
        </div>
      </div>

      {/* Section 4 : Upload */}
      <div className="card mb-6">
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
          <Upload className="w-5 h-5 text-[var(--artci-orange)]" />
          Upload
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="form-group">
            <label htmlFor="taille_max_mb">Taille maximale (Mo)</label>
            <input
              id="taille_max_mb"
              type="number"
              min={1}
              value={params.taille_max_mb}
              onChange={(e) => updateParam('taille_max_mb', Number(e.target.value))}
            />
          </div>

          <div className="form-group">
            <label htmlFor="formats_autorises">Formats autorisés</label>
            <input
              id="formats_autorises"
              type="text"
              value={params.formats_autorises}
              onChange={(e) => updateParam('formats_autorises', e.target.value)}
              placeholder="pdf,xlsx,jpg,png"
            />
            <p className="text-xs text-gray-400 mt-1">
              Séparez les extensions par des virgules, sans point.
            </p>
          </div>
        </div>
      </div>

      {/* Save button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn btn-primary flex items-center gap-2"
        >
          {saving ? (
            <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
          ) : (
            <Save className="w-4 h-4" />
          )}
          Sauvegarder les paramètres
        </button>
      </div>
    </div>
  );
}
