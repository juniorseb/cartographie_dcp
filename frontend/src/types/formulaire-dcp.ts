/**
 * Types pour le QUESTIONNAIRE DE RECENSEMENT ET D'EVALUATION DE LA CONFORMITE
 * Loi N°2013-450 du 19 juin 2013.
 *
 * Toutes les options correspondent EXACTEMENT au document officiel.
 */

// ----- Partie 1 : Identification -----

export type StatutJuridique = 'pm_droit_prive' | 'pm_droit_public' | 'personne_physique';

export type SecteurActivite =
  | 'tic'
  | 'banque_finance_assurance'
  | 'sante'
  | 'education'
  | 'commerce_services'
  | 'autre';

export type VolumeDonnees =
  | 'moins_1000'
  | '1000_10000'
  | '10000_100000'
  | 'plus_100000';

export interface PersonneMorale {
  denomination_officielle?: string;
  raison_sociale?: string;
  numero_cc?: string;
  adresse_siege?: string;
  ville?: string;
  commune?: string;
  region?: string;
}

export interface PersonnePhysique {
  nom_prenom?: string;
  fonction?: string;
  adresse?: string;
  ville?: string;
  commune?: string;
  region?: string;
}

export interface ResponsableLegal {
  nom_prenom?: string;
  fonction?: string;
  email?: string;
  telephone?: string;
}

export interface Partie1Identification {
  statut_juridique?: StatutJuridique;
  personne_morale?: PersonneMorale;
  personne_physique?: PersonnePhysique;
  secteur_activite?: SecteurActivite;
  secteur_autre?: string;
  volume_donnees?: VolumeDonnees;
  responsable_legal?: ResponsableLegal;
}

// ----- Partie 2 : Cadre juridique & conformite admin -----

export type ConnaissanceLoi = 'oui' | 'non';
export type ConnaissanceArtci = 'oui' | 'non' | 'partiellement';
export type DpoDesignation = 'oui_designe' | 'non_pas_encore' | 'en_cours';
export type DpoTypeOpt = 'interne' | 'externe';
export type CpdProfilRequis = 'oui' | 'non' | 'ne_sais_pas';
export type DistinctionDeclAut = 'oui' | 'non' | 'incertain';
export type FormalitesEffectuees = 'oui_tous' | 'non_aucune' | 'en_cours';

export const STADES_DEMARCHE = [
  'audit_initial',
  'elaboration_registre',
  'mesures_techniques_org',
  'depot_declarations',
  'formation_personnel',
  'finalisation_suivi',
] as const;
export type StadeDemarche = typeof STADES_DEMARCHE[number];

export const RAISONS_NON_FORMALITES = [
  'ignorance_obligation',
  'complexite_procedure',
  'cout_eleve',
  'manque_temps_ressources',
  'pense_exempte',
  'autre',
] as const;
export type RaisonNonFormalites = typeof RAISONS_NON_FORMALITES[number];

export interface DPO {
  nom_prenom?: string;
  email?: string;
  telephone?: string;
  date_designation?: string;
  type?: DpoTypeOpt;
}

export interface Partie2CadreJuridique {
  connaissance_loi_2013?: ConnaissanceLoi;
  connaissance_obligations?: ConnaissanceLoi;
  connaissance_artci?: ConnaissanceArtci;
  dpo_designation?: DpoDesignation;
  dpo?: DPO;
  cpd_profil_requis?: CpdProfilRequis;
  distinction_decl_aut?: DistinctionDeclAut;
  formalites_effectuees?: FormalitesEffectuees;
  stades_demarche?: StadeDemarche[];
  accompagnement_externe?: 'oui' | 'non';
  accompagnement_qui?: string;
  raisons_non_formalites?: RaisonNonFormalites[];
  raison_exempte_precision?: string;
  raison_autre_precision?: string;
}

// ----- Partie 3 : Registre & cartographie traitements -----

export type RegistreTenu = 'oui_complet' | 'oui_incomplet' | 'en_cours' | 'non';
export type FormeRegistre = 'papier' | 'tableur' | 'logiciel' | 'base_donnees' | 'autre';
export const CATEGORIES_PERSONNES = [
  'salaries_agents',
  'candidats_stagiaires',
  'clients_abonnes',
  'prospects',
  'usagers_citoyens',
  'patients',
  'etudiants_eleves',
  'fournisseurs_partenaires',
  'visiteurs',
  'adherents_membres',
  'autre',
] as const;
export type CategoriePersonnes = typeof CATEGORIES_PERSONNES[number];

// Tableau categories de donnees
export interface CategorieDonneesDetail {
  items_coches: string[];      // ex: ['nom_prenom','adresse_postale',...]
  item_autre?: string;
  origine: string[];            // ex: ['directement','indirectement']
  origine_indirect_precision?: string;
  duree_jours?: string;
  duree_mois?: string;
  duree_annees?: string;
  duree_autre?: string;
  destinataires?: string;
}

export interface CategoriesDonnees {
  identification?: CategorieDonneesDetail;
  numeros_officiels?: CategorieDonneesDetail;
  vie_personnelle?: CategorieDonneesDetail;
  vie_professionnelle?: CategorieDonneesDetail;
  economique_financiere?: CategorieDonneesDetail;
  connexion_navigation?: CategorieDonneesDetail;
  localisation?: CategorieDonneesDetail;
  sante?: CategorieDonneesDetail;
  biometriques?: CategorieDonneesDetail;
  genetiques?: CategorieDonneesDetail;
  autres_sensibles?: CategorieDonneesDetail;
  judiciaires?: CategorieDonneesDetail;
  sociales?: CategorieDonneesDetail;
}

export const FINALITES = [
  'gestion_administrative',
  'gestion_rh',
  'gestion_clientele',
  'marketing_prospection',
  'suivi_medical_social',
  'recherche_statistiques',
  'securite_controle_acces',
  'autre',
] as const;
export type Finalite = typeof FINALITES[number];

export type FinaliteExplicite = 'oui' | 'non' | 'a_preciser';

export const BASES_LEGALES = [
  'consentement',
  'obligation_legale',
  'execution_contrat',
  'interet_legitime',
  'mission_interet_public',
  'sauvegarde_vie',
] as const;
export type BaseLegale = typeof BASES_LEGALES[number];

export type ModeTraitement = 'automatise' | 'manuel' | 'mixte';
export type InfoPersonnesCollecte = 'oui_systematiquement' | 'parfois' | 'non';

export const INFOS_COMMUNIQUEES = [
  'identite_responsable',
  'finalites_traitement',
  'base_legale',
  'caractere_obligatoire',
  'consequences_defaut',
  'destinataires',
  'droits_personnes',
  'duree_conservation',
  'coordonnees_dpo',
  'transferts_internationaux',
  'mesures_securite',
] as const;
export type InfoCommuniquee = typeof INFOS_COMMUNIQUEES[number];

export const COMMENT_INFORMER = [
  'mentions_formulaire_papier',
  'politique_confidentialite_site',
  'affichage_locaux',
  'courrier_email_personnalise',
  'mentions_legales',
  'autre',
] as const;
export type CommentInformer = typeof COMMENT_INFORMER[number];

export interface Partie3RegistreTraitements {
  registre_tenu?: RegistreTenu;
  forme_registre?: FormeRegistre;
  forme_registre_autre?: string;
  categories_personnes?: CategoriePersonnes[];
  categorie_personne_autre?: string;
  categories_donnees?: CategoriesDonnees;
  finalites?: Finalite[];
  finalite_autre_precision?: string;
  finalite_explicite?: FinaliteExplicite;
  bases_legales?: BaseLegale[];
  base_obligation_precision?: string;
  base_interet_precision?: string;
  mode_traitement?: ModeTraitement;
  info_personnes_collecte?: InfoPersonnesCollecte;
  infos_communiquees?: InfoCommuniquee[];
  comment_informer?: CommentInformer[];
  comment_informer_autre?: string;
  reutilisation_donnees?: 'oui' | 'non';
}

// ----- Partie 4 : Sous-traitance & Transferts -----

export type RecoursSousTraitants = 'oui' | 'non';
export type ContratsSousTraitance = 'oui_tous' | 'oui_certains' | 'non';

export const CLAUSES_OBLIGATOIRES = [
  'instruction_responsable',
  'confidentialite',
  'mesures_securite',
  'possibilite_audit',
  'sort_donnees_fin',
  'interdiction_sous_traiter',
  'toutes_clauses',
] as const;
export type ClauseObligatoire = typeof CLAUSES_OBLIGATOIRES[number];

export type TransfertHorsCedeao = 'oui' | 'non';
export type TransfertConcerne = 'tout_fichier' | 'partie_fichier';
export type AutorisationArtciTransfert = 'oui' | 'non' | 'demande_en_cours';

export const BASES_JURIDIQUES_TRANSFERT = [
  'consentement_expres',
  'execution_contrat',
  'motif_interet_public',
  'constatation_defense_droits',
  'sauvegarde_vie',
  'garanties_appropriees',
] as const;
export type BaseJuridiqueTransfert = typeof BASES_JURIDIQUES_TRANSFERT[number];

export const GARANTIES_TRANSFERT = [
  'clauses_contractuelles_types',
  'bcr',
  'certification_destinataire',
  'accord_reciprocite',
  'evaluation_protection',
  'chiffrement',
  'autre',
  'aucune',
] as const;
export type GarantieTransfert = typeof GARANTIES_TRANSFERT[number];

export type SuppressionAnonymisation =
  | 'oui_suppression'
  | 'oui_anonymisation'
  | 'oui_archivage_securise'
  | 'non_indefiniment'
  | 'variable';

export type ProtectionSupports = 'oui_documentee' | 'non' | 'non_applicable';

export interface Partie4SousTraitanceTransferts {
  recours_sous_traitants?: RecoursSousTraitants;
  contrats_sous_traitance?: ContratsSousTraitance;
  contrats_nombre_tous?: string;
  contrats_nombre_certains?: string;
  clauses_obligatoires?: ClauseObligatoire[];
  transfert_hors_cedeao?: TransfertHorsCedeao;
  pays_destination?: string;
  transfert_concerne?: TransfertConcerne;
  objet_transfert?: string;
  autorisation_artci_transfert?: AutorisationArtciTransfert;
  numero_autorisation_transfert?: string;
  bases_juridiques_transfert?: BaseJuridiqueTransfert[];
  garanties_transfert?: GarantieTransfert[];
  garanties_appropriees_precision?: string;
  garantie_autre?: string;
  suppression_anonymisation?: SuppressionAnonymisation;
  protection_supports?: ProtectionSupports;
}

// ----- Partie 5 : Securite & confidentialite -----

export type PolitiqueSecurite = 'oui_formalisee' | 'oui_non_formalisee' | 'en_cours' | 'non';
export type ViolationDouzeMois = 'oui' | 'non' | 'ne_sais_pas';
export type NotificationArtci72h = 'oui_72h' | 'oui_tardivement' | 'non';
export type InfoPersonnesViolation = 'oui' | 'non' | 'certains_cas';
export type ProcedureViolation =
  | 'oui_documentee_testee'
  | 'oui_documentee_non_testee'
  | 'informelle'
  | 'non';
export type PersonnelSensibilise =
  | 'oui_formation_initiale'
  | 'oui_sensibilisation_periodique'
  | 'formation_ponctuelle'
  | 'non';
export type FrequenceFormations = 'reguliere' | 'ponctuelle' | 'aucune';

export interface Partie5Securite {
  politique_securite?: PolitiqueSecurite;
  mesures_techniques?: 'oui' | 'non';
  mesures_organisationnelles?: 'oui' | 'non';
  violation_12mois?: ViolationDouzeMois;
  nombre_violations?: string;
  notification_artci?: NotificationArtci72h;
  info_personnes_violation?: InfoPersonnesViolation;
  registre_violations?: 'oui' | 'non';
  procedures_violation?: ProcedureViolation;
  personnel_sensibilise?: PersonnelSensibilise;
  frequence_formations?: FrequenceFormations;
}

// ----- Formulaire complet -----

export interface FormulaireDCP {
  identification: Partie1Identification;
  cadre_juridique: Partie2CadreJuridique;
  registre: Partie3RegistreTraitements;
  sous_traitance_transferts: Partie4SousTraitanceTransferts;
  securite: Partie5Securite;
}

export function emptyFormulaireDCP(): FormulaireDCP {
  return {
    identification: {},
    cadre_juridique: {},
    registre: { categories_donnees: {} },
    sous_traitance_transferts: {},
    securite: {},
  };
}
