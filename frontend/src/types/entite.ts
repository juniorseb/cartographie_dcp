/**
 * Types pour les entités (miroir schemas/entite.py).
 */
import type { StatutConformite, StatutWorkflow, OrigineSaisie, BaseLegale } from './enums';

/** Vue liste compacte (EntiteListOutputSchema) */
export interface EntiteListItem {
  id: string;
  denomination: string;
  numero_cc: string;
  forme_juridique: string | null;
  secteur_activite: string | null;
  ville: string | null;
  region: string | null;
  origine_saisie: OrigineSaisie;
  publie_sur_carte: boolean;
  statut_conformite: StatutConformite | null;
  statut_workflow: StatutWorkflow | null;
  score_conformite: number | null;
  latitude: number | null;
  longitude: number | null;
  a_dpo: boolean | null;
  finalite_principale: string | null;
  finalites_top: { nom: string; pourcentage: number }[];
  numero_autorisation: string | null;
  createdAt: string;
}

/** Vue détail publique (EntitePublicDetailSchema) */
export interface EntitePublicDetail {
  id: string;
  denomination: string;
  numero_cc: string;
  forme_juridique: string | null;
  secteur_activite: string | null;
  adresse: string | null;
  ville: string | null;
  region: string | null;
  telephone: string | null;
  email: string | null;
  statut_conformite: StatutConformite | null;
  score_conformite: number | null;
  a_dpo: boolean | null;
  latitude: number | null;
  longitude: number | null;
  contact: EntiteContact | null;
  finalites: FinaliteBaseLegale[];
}

export interface EntiteContact {
  responsable_legal_nom: string | null;
  responsable_legal_fonction: string | null;
  responsable_legal_email: string | null;
  responsable_legal_telephone: string | null;
  site_web: string | null;
}

export interface FinaliteBaseLegale {
  id: string;
  finalite: string;
  base_legale: BaseLegale;
  pourcentage: number | null;
  description: string | null;
}

/** Filtres pour la recherche d'entités */
export interface EntiteFilter {
  search?: string;
  secteur_activite?: string;
  ville?: string;
  region?: string;
  forme_juridique?: string;
  statut_conformite?: string;
}
