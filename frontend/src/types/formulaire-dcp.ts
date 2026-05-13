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
// Spec 3.4 : "Avez-vous un DPO habilite par l'ARTCI ?" → Oui/Non
export type DpoHabilite = 'oui' | 'non';
export type DpoTypeOpt = 'interne' | 'externe';
// Spec 3.4 : DPO externe = personne physique OU personne morale
export type DpoExterneType = 'physique' | 'morale';
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

// DPO interne ou externe physique : personne physique
export interface DPOPhysique {
  nom_prenom?: string;
  email?: string;
  telephone?: string;
  date_designation?: string;
  fonction?: string;
}

// DPO externe morale : structure
export interface DPOMorale {
  nom_structure?: string;
  email_contact?: string;
  telephone_contact?: string;
  contact_referent?: string;
  date_contrat?: string;
}

export interface Partie2CadreJuridique {
  connaissance_loi_2013?: ConnaissanceLoi;
  connaissance_obligations?: ConnaissanceLoi;
  connaissance_artci?: ConnaissanceArtci;
  // Q5 reformulee : "Avez-vous un DPO habilite par l'ARTCI ?"
  dpo_habilite?: DpoHabilite;
  dpo_type?: DpoTypeOpt;             // si dpo_habilite === 'oui'
  dpo_externe_type?: DpoExterneType; // si dpo_type === 'externe'
  dpo_physique?: DPOPhysique;        // interne OU externe physique
  dpo_morale?: DPOMorale;            // externe morale
  // Upload obligatoire du courrier d'habilitation (cote frontend, on stocke un nom de fichier ou un id)
  dpo_courrier_habilitation_uploaded?: boolean;
  cpd_profil_requis?: CpdProfilRequis;
  distinction_decl_aut?: DistinctionDeclAut;
  // Formalites_effectuees est maintenant CALCULE automatiquement (cf §3.7)
  // Conserve pour migration / affichage admin
  formalites_effectuees?: FormalitesEffectuees;
  formalite_calculee?: 'autorisation_prealable' | 'declaration_prealable' | 'aucune';
  formalite_motifs?: string[]; // raisons du calcul
  stades_demarche?: StadeDemarche[];
  accompagnement_externe?: 'oui' | 'non';
  accompagnement_qui?: string;
  raisons_non_formalites?: RaisonNonFormalites[];
  raison_exempte_precision?: string;
  raison_autre_precision?: string;
}

// ----- Partie 3 : Registre & cartographie traitements -----

// Activites de traitement DCP issues de la definition legale (§1.1)
// Spec 3.6.1 : 1ere question Partie 3 = puces a cocher des activites
export const ACTIVITES_TRAITEMENT_DCP = [
  'collecte',
  'exploitation',
  'enregistrement',
  'organisation',
  'conservation',
  'adaptation',
  'modification',
  'extraction',
  'sauvegarde',
  'copie',
  'consultation',
  'utilisation',
  'communication_transmission',
  'diffusion',
  'mise_a_disposition',
  'rapprochement_interconnexion',
  'verrouillage',
  'cryptage',
  'effacement',
  'destruction',
] as const;
export type ActiviteTraitementDCP = typeof ACTIVITES_TRAITEMENT_DCP[number];


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
  // 1ere question Partie 3 : activites de traitement (multi-select)
  activites_traitement?: ActiviteTraitementDCP[];
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
  // Sous-traitance (spec 3.8) : juste un nombre + pays multi-select
  recours_sous_traitants?: RecoursSousTraitants;
  nombre_sous_traitants?: string;                  // entier sous forme texte
  pays_sous_traitants?: string[];                  // codes ISO ou noms (multi-select)
  contrats_sous_traitance_existence?: 'oui' | 'non';
  clauses_obligatoires?: ClauseObligatoire[];      // multi-select
  // Transferts hors CEDEAO (spec 3.8) : multi-select pays + garanties
  transfert_hors_cedeao?: TransfertHorsCedeao;
  pays_transferts?: string[];                      // multi-select pays destination
  objet_transfert?: string;
  // Question reformulee : "Avez-vous obtenu une autorisation prealable de l'ARTCI pour ce transfert ?"
  autorisation_artci_transfert?: AutorisationArtciTransfert;
  numero_autorisation_transfert?: string;
  bases_juridiques_transfert?: BaseJuridiqueTransfert[];
  garanties_transfert?: GarantieTransfert[];
  garanties_appropriees_precision?: string;
  garantie_autre?: string;
  suppression_anonymisation?: SuppressionAnonymisation;
  protection_supports?: ProtectionSupports;
  // Anciens champs gardes pour compatibilite
  contrats_sous_traitance?: ContratsSousTraitance;
  contrats_nombre_tous?: string;
  contrats_nombre_certains?: string;
  pays_destination?: string;
  transfert_concerne?: TransfertConcerne;
}

// ----- Partie 5 : Securite & formation -----

// Spec 3.9 : Charte = juste 2 options (suppression "non formalisee" et "en cours")
export type PolitiqueSecurite = 'oui_formalisee' | 'non';

// Spec 3.9 : mesures techniques multi-select
export const MESURES_TECHNIQUES = [
  'mots_de_passe_forts',
  'chiffrement_donnees',
  'chiffrement_communications',
  'pare_feu',
  'antivirus_antimalware',
  'sauvegardes_regulieres',
  'mises_a_jour_systeme',
  'detection_intrusion',
  'segmentation_reseau',
  'authentification_multi_facteurs',
  'journalisation_logs',
  'autre',
] as const;
export type MesureTechnique = typeof MESURES_TECHNIQUES[number];

// Spec 3.9 : mesures organisationnelles multi-select
export const MESURES_ORGANISATIONNELLES = [
  'restriction_acces',
  'habilitations',
  'sensibilisation_personnel',
  'charte_informatique',
  'gestion_droits_utilisateurs',
  'procedure_arrivee_depart',
  'audit_interne_periodique',
  'plan_continuite_activite',
  'separation_environnements',
  'gestion_prestataires',
  'autre',
] as const;
export type MesureOrganisationnelle = typeof MESURES_ORGANISATIONNELLES[number];
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
  // Charte de protection des donnees (anciennement "Politique de securite")
  politique_securite?: PolitiqueSecurite;
  // Si oui_formalisee : upload obligatoire du document charte
  charte_uploaded?: boolean;
  // Mesures multi-select (spec 3.9)
  mesures_techniques_list?: MesureTechnique[];
  mesures_techniques_autre?: string;
  mesures_organisationnelles_list?: MesureOrganisationnelle[];
  mesures_organisationnelles_autre?: string;
  // Violations
  violation_12mois?: ViolationDouzeMois;
  nombre_violations?: string;
  notification_artci?: NotificationArtci72h;
  info_personnes_violation?: InfoPersonnesViolation;
  registre_violations?: 'oui' | 'non';
  procedures_violation?: ProcedureViolation;
  // Formation
  personnel_sensibilise?: PersonnelSensibilise;
  frequence_formations?: FrequenceFormations;
  // Anciens champs gardes pour compatibilite
  mesures_techniques?: 'oui' | 'non';
  mesures_organisationnelles?: 'oui' | 'non';
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
