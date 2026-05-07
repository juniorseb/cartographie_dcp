import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, FileText, Shield, Users, MapPin, Edit, Lock, Globe, BookOpen, UserCheck, ClipboardList, Award, FileDown, Upload, ClipboardCheck, RefreshCw } from 'lucide-react';
import { useApi } from '@/hooks/useApi';
import * as adminApi from '@/api/admin.api';
import Loading from '@/components/common/Loading';
import ErrorDisplay from '@/components/common/ErrorDisplay';
import StatusBadge from '@/components/common/StatusBadge';
import { useAuth } from '@/hooks/useAuth';
import { hasMinRole } from '@/components/admin/AdminSidebar';
import { ROUTES } from '@/utils/constants';
import { formatDate } from '@/utils/format';
import type { StatutConformite } from '@/types/enums';

function InfoRow({ label, value }: { label: string; value: string | number | boolean | null | undefined }) {
  const display = typeof value === 'boolean' ? (value ? 'Oui' : 'Non') : (value ?? '-');
  return (
    <div className="flex flex-col sm:flex-row gap-1">
      <span className="text-sm font-semibold text-gray-600 sm:w-48 flex-shrink-0">{label}</span>
      <span className="text-sm">{String(display)}</span>
    </div>
  );
}

function SectionCard({ title, icon: Icon, color, children }: { title: string; icon: React.ElementType; color: string; children: React.ReactNode }) {
  return (
    <div className="card">
      <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
        <Icon className={`w-5 h-5 ${color}`} /> {title}
      </h3>
      {children}
    </div>
  );
}

export default function EntiteDetailAdminPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const canEdit = user && hasMinRole(user.role, 'editor');

  const { data: entite, isLoading, error, refetch } = useApi(
    () => adminApi.getEntiteDetail(id!),
    [id]
  );
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState('');

  async function handleUploadAudit(file: File) {
    if (!id) return;
    setUploadError('');
    setUploadSuccess('');
    setUploading(true);
    try {
      await adminApi.uploadRapportAudit(id, file);
      setUploadSuccess('Rapport d\'audit déposé. Visible côté entreprise dans Mon dossier > Mes Rapports.');
      refetch();
    } catch {
      setUploadError("Erreur lors du téléversement.");
    } finally {
      setUploading(false);
    }
  }

  async function handleToggleFormalite(field: 'autorisation_active' | 'declaration_active', value: boolean) {
    if (!id) return;
    try {
      await adminApi.updateFormalitesActivation(id, { [field]: value });
      refetch();
    } catch {
      // erreur silencieuse
    }
  }

  if (isLoading) return <Loading fullPage text="Chargement de l'entité..." />;

  if (error || !entite) {
    return (
      <div>
        <Link to={ROUTES.ADMIN_ENTITES} className="flex items-center gap-2 text-[var(--artci-green)] mb-4 hover:underline">
          <ArrowLeft className="w-4 h-4" /> Retour à la liste
        </Link>
        <ErrorDisplay message={error ?? 'Entité non trouvée.'} />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <Link to={ROUTES.ADMIN_ENTITES} className="flex items-center gap-2 text-[var(--artci-green)] hover:underline text-sm">
          <ArrowLeft className="w-4 h-4" /> Retour à la liste
        </Link>
        {canEdit && (
          <Link
            to={`/admin/entites/${entite.id}`}
            className="btn btn-outline text-sm py-2 px-4 flex items-center gap-2 no-underline"
          >
            <Edit className="w-4 h-4" /> Modifier
          </Link>
        )}
      </div>

      {/* En-tête */}
      <div className="card mb-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl mb-1">{entite.denomination}</h1>
            <p className="text-gray-500 text-sm">N° CC : {entite.numero_cc}</p>
            {entite.origine_saisie && (
              <span className="badge badge-encours text-xs mt-2">{entite.origine_saisie}</span>
            )}
          </div>
          {entite.conformite?.statut_conformite && (
            <StatusBadge statut={entite.conformite.statut_conformite as StatutConformite} />
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── Identification ── */}
        <SectionCard title="Identification" icon={FileText} color="text-[var(--artci-orange)]">
          <div className="space-y-3">
            <InfoRow label="Dénomination" value={entite.denomination} />
            <InfoRow label="N° CC" value={entite.numero_cc} />
            <InfoRow label="Forme juridique" value={entite.forme_juridique} />
            <InfoRow label="Secteur d'activité" value={entite.secteur_activite} />
            <InfoRow label="Adresse" value={entite.adresse} />
            <InfoRow label="Ville" value={entite.ville} />
            <InfoRow label="Région" value={entite.region} />
            <InfoRow label="Téléphone" value={entite.telephone} />
            <InfoRow label="Email" value={entite.email} />
          </div>
        </SectionCard>

        {/* ── Workflow ── */}
        {entite.workflow && (
          <SectionCard title="Workflow" icon={Shield} color="text-[var(--artci-green)]">
            <div className="space-y-3">
              <InfoRow label="Statut" value={entite.workflow.statut} />
              <InfoRow label="N° Autorisation" value={entite.workflow.numero_autorisation_artci} />
              <InfoRow label="Date soumission" value={entite.workflow.date_soumission ? formatDate(entite.workflow.date_soumission) : '-'} />
              <InfoRow label="Date validation" value={entite.workflow.date_validation ? formatDate(entite.workflow.date_validation) : '-'} />
              <InfoRow label="Date publication" value={entite.workflow.date_publication ? formatDate(entite.workflow.date_publication) : '-'} />
              {entite.workflow.motif_rejet && (
                <div className="alert alert-danger mt-2">
                  <strong>Motif de rejet :</strong> {entite.workflow.motif_rejet}
                </div>
              )}
            </div>
          </SectionCard>
        )}

        {/* ── Contact ── */}
        {entite.contact && (
          <SectionCard title="Contact" icon={Users} color="text-[var(--artci-orange)]">
            <div className="space-y-3">
              <InfoRow label="Responsable légal" value={entite.contact.responsable_legal_nom} />
              <InfoRow label="Fonction" value={entite.contact.responsable_legal_fonction} />
              <InfoRow label="Email" value={entite.contact.responsable_legal_email} />
              <InfoRow label="Téléphone" value={entite.contact.responsable_legal_telephone} />
              <InfoRow label="Site web" value={entite.contact.site_web} />
            </div>
          </SectionCard>
        )}

        {/* ── Responsables légaux ── */}
        {entite.responsables_legaux && entite.responsables_legaux.length > 0 && (
          <SectionCard title="Responsables légaux" icon={UserCheck} color="text-[var(--artci-orange)]">
            <div className="space-y-4">
              {entite.responsables_legaux.map((r, i) => (
                <div key={r.id ?? i} className={i > 0 ? 'border-t pt-3' : ''}>
                  <div className="space-y-2">
                    <InfoRow label="Nom" value={`${r.nom} ${r.prenom || ''}`} />
                    <InfoRow label="Fonction" value={r.fonction} />
                    <InfoRow label="Email" value={r.email} />
                    <InfoRow label="Téléphone" value={r.telephone} />
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
        )}

        {/* ── Localisation ── */}
        {entite.localisation && (
          <SectionCard title="Localisation" icon={MapPin} color="text-[var(--artci-orange)]">
            <div className="space-y-3">
              <InfoRow label="Latitude" value={entite.localisation.latitude} />
              <InfoRow label="Longitude" value={entite.localisation.longitude} />
              <InfoRow label="Adresse complète" value={entite.localisation.adresse_complete} />
              <InfoRow label="Précision GPS" value={entite.localisation.precision_gps} />
              <InfoRow label="Méthode" value={entite.localisation.methode_geolocalisation} />
            </div>
            {entite.localisation.latitude && entite.localisation.longitude && (
              <div className="mt-4">
                <iframe
                  title="Localisation"
                  width="100%"
                  height="200"
                  style={{ border: '1px solid #ddd', borderRadius: '8px' }}
                  src={`https://www.openstreetmap.org/export/embed.html?bbox=${entite.localisation.longitude - 0.01},${entite.localisation.latitude - 0.01},${entite.localisation.longitude + 0.01},${entite.localisation.latitude + 0.01}&layer=mapnik&marker=${entite.localisation.latitude},${entite.localisation.longitude}`}
                />
                <a
                  href={`https://www.google.com/maps?q=${entite.localisation.latitude},${entite.localisation.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-[var(--artci-green)] hover:underline mt-2 inline-block"
                >
                  Ouvrir dans Google Maps
                </a>
              </div>
            )}
          </SectionCard>
        )}

        {/* ── Conformité ── */}
        {entite.conformite && (
          <SectionCard title="Conformité" icon={Shield} color="text-[var(--artci-green)]">
            <div className="space-y-3">
              <InfoRow label="Score" value={entite.conformite.score_conformite != null ? `${entite.conformite.score_conformite}/100` : '-'} />
              <InfoRow label="Statut" value={entite.conformite.statut_conformite} />
              <InfoRow label="A un DPO" value={entite.conformite.a_dpo} />
              <InfoRow label="Type DPO" value={entite.conformite.type_dpo} />
              <InfoRow label="Effectif" value={entite.conformite.effectif_entreprise} />
              <InfoRow label="Volume données" value={entite.conformite.volume_donnees_traitees} />
              <InfoRow label="Délai conformité" value={entite.conformite.delai_mise_en_conformite ? formatDate(entite.conformite.delai_mise_en_conformite) : '-'} />
            </div>
          </SectionCard>
        )}

        {/* ── DPO ── */}
        {entite.dpos && entite.dpos.length > 0 && (
          <SectionCard title="DPO / Correspondant" icon={UserCheck} color="text-[var(--artci-green)]">
            <div className="space-y-4">
              {entite.dpos.map((dpo, i) => (
                <div key={dpo.id ?? i} className={i > 0 ? 'border-t pt-3' : ''}>
                  <div className="space-y-2">
                    <InfoRow label="Nom" value={`${dpo.nom} ${dpo.prenom || ''}`} />
                    <InfoRow label="Email" value={dpo.email} />
                    <InfoRow label="Téléphone" value={dpo.telephone} />
                    <InfoRow label="Type" value={dpo.type} />
                    {dpo.type === 'externe' && <InfoRow label="Organisme" value={dpo.organisme} />}
                    <InfoRow label="Date désignation" value={dpo.date_designation ? formatDate(dpo.date_designation) : '-'} />
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
        )}

        {/* ── Conformité administrative ── */}
        {entite.conformites_administratives && entite.conformites_administratives.length > 0 && (
          <SectionCard title="Cadre juridique" icon={BookOpen} color="text-[var(--artci-orange)]">
            {entite.conformites_administratives.map((ca, i) => (
              <div key={ca.id ?? i} className="space-y-3">
                <InfoRow label="Connaissance loi 2013-450" value={ca.connaissance_loi_2013} />
                <InfoRow label="Déclaration ARTCI" value={ca.declaration_artci} />
                {ca.declaration_artci && (
                  <>
                    <InfoRow label="N° Déclaration" value={ca.numero_declaration} />
                    <InfoRow label="Date déclaration" value={ca.date_declaration ? formatDate(ca.date_declaration) : '-'} />
                  </>
                )}
                <InfoRow label="Autorisation ARTCI" value={ca.autorisation_artci} />
                {ca.autorisation_artci && (
                  <>
                    <InfoRow label="N° Autorisation" value={ca.numero_autorisation} />
                    <InfoRow label="Date autorisation" value={ca.date_autorisation ? formatDate(ca.date_autorisation) : '-'} />
                  </>
                )}
              </div>
            ))}
          </SectionCard>
        )}

        {/* ── Registre des traitements ── */}
        {entite.registre_traitements && entite.registre_traitements.length > 0 && (
          <SectionCard title={`Registre des traitements (${entite.registre_traitements.length})`} icon={ClipboardList} color="text-[var(--artci-orange)]">
            <div className="space-y-4">
              {entite.registre_traitements.map((rt, i) => (
                <div key={rt.id ?? i} className={`${i > 0 ? 'border-t pt-3' : ''}`}>
                  <p className="font-semibold text-sm mb-2">{i + 1}. {rt.nom_traitement}</p>
                  <div className="space-y-2 pl-4 border-l-2 border-gray-200">
                    {rt.description && <InfoRow label="Description" value={rt.description} />}
                    <InfoRow label="Finalité" value={rt.finalite} />
                    <InfoRow label="Base légale" value={rt.base_legale} />
                    <InfoRow label="Catégories personnes" value={rt.categories_personnes} />
                    <InfoRow label="Durée conservation" value={rt.duree_conservation} />
                    <InfoRow label="Destinataires" value={rt.destinataires} />
                    <InfoRow label="Transfert hors CI" value={rt.transfert_hors_ci} />
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
        )}

        {/* ── Finalités ── */}
        {entite.finalites && entite.finalites.length > 0 && (
          <SectionCard title="Finalités de traitement" icon={FileText} color="text-[var(--artci-orange)]">
            <div className="table-container">
              <table className="w-full">
                <thead>
                  <tr><th>Finalité</th><th>Base légale</th><th>%</th></tr>
                </thead>
                <tbody>
                  {entite.finalites.map((f, i) => (
                    <tr key={f.id ?? i}>
                      <td className="text-sm">{f.finalite}</td>
                      <td className="text-sm">{f.base_legale}</td>
                      <td className="text-sm">{f.pourcentage ?? '-'}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionCard>
        )}

        {/* ── Sous-traitants ── */}
        {entite.sous_traitants && entite.sous_traitants.length > 0 && (
          <SectionCard title={`Sous-traitants (${entite.sous_traitants.length})`} icon={Users} color="text-[var(--artci-orange)]">
            <div className="space-y-4">
              {entite.sous_traitants.map((st, i) => (
                <div key={st.id ?? i} className={i > 0 ? 'border-t pt-3' : ''}>
                  <div className="space-y-2">
                    <InfoRow label="Nom" value={st.nom_sous_traitant} />
                    <InfoRow label="Pays" value={st.pays} />
                    <InfoRow label="Données partagées" value={st.type_donnees_partagees} />
                    <InfoRow label="Contrat" value={st.contrat_sous_traitance} />
                    <InfoRow label="Clauses protection" value={st.clauses_protection} />
                    <InfoRow label="Audit" value={st.audit_sous_traitant} />
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
        )}

        {/* ── Transferts internationaux ── */}
        {entite.transferts && entite.transferts.length > 0 && (
          <SectionCard title={`Transferts internationaux (${entite.transferts.length})`} icon={Globe} color="text-[var(--artci-orange)]">
            <div className="space-y-4">
              {entite.transferts.map((t, i) => (
                <div key={t.id ?? i} className={i > 0 ? 'border-t pt-3' : ''}>
                  <div className="space-y-2">
                    <InfoRow label="Pays destination" value={t.pays_destination} />
                    <InfoRow label="Organisme" value={t.organisme_destinataire} />
                    <InfoRow label="Base juridique" value={t.base_juridique} />
                    <InfoRow label="Garanties" value={t.garanties_appropriees} />
                    <InfoRow label="Autorisation ARTCI" value={t.autorisation_artci} />
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
        )}

        {/* ── Sécurité ── */}
        {entite.securite && (
          <SectionCard title="Sécurité" icon={Lock} color="text-red-600">
            <div className="space-y-3">
              <InfoRow label="Politique sécurité" value={entite.securite.politique_securite} />
              <InfoRow label="Responsable sécurité" value={entite.securite.responsable_securite} />
              <InfoRow label="Analyse risques" value={entite.securite.analyse_risques} />
              <InfoRow label="Plan continuité" value={entite.securite.plan_continuite} />
              <InfoRow label="Notification violations" value={entite.securite.notification_violations} />
              <InfoRow label="Violations (12 mois)" value={entite.securite.nombre_violations_12mois} />
              <InfoRow label="Formation personnel" value={entite.securite.formation_personnel} />
              <InfoRow label="Fréquence formation" value={entite.securite.frequence_formation} />
              <InfoRow label="Dernier audit" value={entite.securite.dernier_audit ? formatDate(entite.securite.dernier_audit) : '-'} />
            </div>
          </SectionCard>
        )}

        {/* ── Mesures de sécurité ── */}
        {entite.mesures_securite && entite.mesures_securite.length > 0 && (
          <SectionCard title={`Mesures de sécurité (${entite.mesures_securite.length})`} icon={Shield} color="text-red-600">
            <div className="space-y-3">
              {entite.mesures_securite.map((m, i) => (
                <div key={m.id ?? i} className={`flex gap-3 ${i > 0 ? 'border-t pt-2' : ''}`}>
                  <span className={`badge text-xs flex-shrink-0 ${m.type_mesure === 'technique' ? 'badge-conforme' : m.type_mesure === 'organisationnelle' ? 'badge-achevee' : 'badge-encours'}`}>
                    {m.type_mesure}
                  </span>
                  <div>
                    <p className="text-sm">{m.description}</p>
                    <p className="text-xs text-gray-400">
                      {m.mise_en_oeuvre ? 'En place' : 'Non mis en oeuvre'}
                      {m.date_mise_en_oeuvre && ` - depuis ${formatDate(m.date_mise_en_oeuvre)}`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
        )}

        {/* ── Certifications ── */}
        {entite.certifications && entite.certifications.length > 0 && (
          <SectionCard title="Certifications" icon={Award} color="text-[var(--artci-green)]">
            <div className="space-y-3">
              {entite.certifications.map((c, i) => (
                <div key={c.id ?? i} className={i > 0 ? 'border-t pt-2' : ''}>
                  <div className="space-y-2">
                    <InfoRow label="Certification" value={c.nom_certification} />
                    <InfoRow label="Organisme" value={c.organisme_certificateur} />
                    <InfoRow label="Obtention" value={c.date_obtention ? formatDate(c.date_obtention) : '-'} />
                    <InfoRow label="Expiration" value={c.date_expiration ? formatDate(c.date_expiration) : '-'} />
                    <InfoRow label="N° Certificat" value={c.numero_certificat} />
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
        )}

        {/* ── Formalités (activation Autorisation / Déclaration) ── */}
        {canEdit && hasMinRole(user!.role, 'admin') && (
          <SectionCard title="Formalités de l'entreprise" icon={RefreshCw} color="text-[var(--artci-orange)]">
            <p className="text-sm text-gray-500 mb-4">
              Activez les onglets "Autorisation" et "Déclaration" côté entreprise selon le retour
              donné à son dossier.
            </p>
            <div className="space-y-3">
              <label className="flex items-center justify-between p-3 border border-gray-200 rounded-lg cursor-pointer">
                <div>
                  <div className="text-sm font-semibold">Autorisation</div>
                  <div className="text-xs text-gray-500">
                    Transferts de données, traitement de données sensibles, changement de DPO...
                  </div>
                </div>
                <input
                  type="checkbox"
                  className="h-5 w-5"
                  checked={entite.conformite?.formalite_autorisation_active === true}
                  onChange={(e) => handleToggleFormalite('autorisation_active', e.target.checked)}
                />
              </label>
              <label className="flex items-center justify-between p-3 border border-gray-200 rounded-lg cursor-pointer">
                <div>
                  <div className="text-sm font-semibold">Déclaration</div>
                  <div className="text-xs text-gray-500">
                    Déclarations à l'ARTCI selon le retour de votre dossier.
                  </div>
                </div>
                <input
                  type="checkbox"
                  className="h-5 w-5"
                  checked={entite.conformite?.formalite_declaration_active === true}
                  onChange={(e) => handleToggleFormalite('declaration_active', e.target.checked)}
                />
              </label>
            </div>
          </SectionCard>
        )}

        {/* ── Rapport d'audit (admin upload) ── */}
        {canEdit && (
          <SectionCard title="Rapport d'audit" icon={ClipboardCheck} color="text-[var(--artci-green)]">
            <p className="text-sm text-gray-500 mb-3">
              Téléversez un rapport d'audit. Il apparaîtra automatiquement dans
              "Mon dossier &gt; Mes Rapports" de l'entreprise.
            </p>
            {uploadError && <div className="alert alert-danger mb-3 text-sm">{uploadError}</div>}
            {uploadSuccess && <div className="alert alert-success mb-3 text-sm">{uploadSuccess}</div>}
            <label className="btn btn-secondary text-sm py-2 px-4 inline-flex items-center gap-2 cursor-pointer">
              {uploading ? (
                <div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />
              ) : (
                <Upload className="w-4 h-4" />
              )}
              Téléverser un rapport
              <input
                type="file"
                accept=".pdf,.doc,.docx"
                className="hidden"
                disabled={uploading}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleUploadAudit(f);
                  e.target.value = '';
                }}
              />
            </label>
          </SectionCard>
        )}

        {/* ── Documents joints ── */}
        {entite.documents && entite.documents.length > 0 && (
          <SectionCard title={`Documents (${entite.documents.length})`} icon={FileDown} color="text-[var(--artci-orange)]">
            <div className="space-y-2">
              {entite.documents.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <div>
                    <p className="text-sm font-medium">{doc.nom_fichier}</p>
                    <p className="text-xs text-gray-400">{doc.type_document} - {formatDate(doc.uploadedAt)}</p>
                  </div>
                  {doc.taille && (
                    <span className="text-xs text-gray-400">{Math.round(doc.taille / 1024)} Ko</span>
                  )}
                </div>
              ))}
            </div>
          </SectionCard>
        )}
      </div>
    </div>
  );
}
