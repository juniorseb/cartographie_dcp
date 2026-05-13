/**
 * Configuration des catégories de données du QUESTIONNAIRE DCP officiel.
 * Items et options correspondent EXACTEMENT au document Word.
 */

export interface CategorieConfig {
  key: string;            // ex: 'identification'
  titre: string;          // ex: "DONNÉES D'IDENTIFICATION"
  type: 'standard' | 'sensible';
  items: { value: string; label: string }[];
  origine: { value: string; label: string }[];
}

export const CATEGORIES_DONNEES_CONFIG: CategorieConfig[] = [
  // ----- DONNEES PERSONNELLES STANDARD -----
  {
    key: 'identification',
    titre: "DONNÉES D'IDENTIFICATION",
    type: 'standard',
    items: [
      { value: 'nom_prenom', label: 'Nom, prénom(s)' },
      { value: 'adresse_postale', label: 'Adresse postale' },
      { value: 'date_lieu_naissance', label: 'Date et lieu de naissance' },
      { value: 'sexe', label: 'Sexe' },
      { value: 'photographie', label: 'Photographie' },
      { value: 'video', label: 'Vidéo' },
      { value: 'numero_telephone', label: 'Numéro de téléphone' },
      { value: 'adresse_email', label: 'Adresse email' },
      { value: 'signature_manuscrite', label: 'Signature manuscrite' },
    ],
    origine: [
      { value: 'directement', label: 'Directement auprès de la personne concernée' },
      { value: 'indirectement', label: 'Indirectement (préciser)' },
    ],
  },
  {
    key: 'numeros_officiels',
    titre: "NUMÉROS D'IDENTIFICATION OFFICIELS",
    type: 'standard',
    items: [
      { value: 'cni', label: 'CNI' },
      { value: 'niu', label: "Numéro d'Identifiant fiscal Unique (NIU)" },
      { value: 'cmu', label: 'CMU' },
      { value: 'passeport', label: 'Passeport' },
      { value: 'titre_sejour', label: 'Titre de séjour' },
      { value: 'permis_conduire', label: 'Permis de conduire' },
      { value: 'n_securite_sociale', label: 'N° Sécurité sociale' },
      { value: 'matricule_employe', label: 'Matricule employé' },
    ],
    origine: [
      { value: 'directement', label: 'Directement auprès de la personne concernée' },
      { value: 'indirectement', label: 'Indirectement (préciser)' },
    ],
  },
  {
    key: 'vie_personnelle',
    titre: 'VIE PERSONNELLE',
    type: 'standard',
    items: [
      { value: 'situation_familiale', label: 'Situation familiale' },
      { value: 'nombre_enfants', label: "Nombre d'enfants" },
      { value: 'habitudes_vie', label: 'Habitudes de vie' },
      { value: 'loisirs', label: "Loisirs / centres d'intérêt" },
    ],
    origine: [
      { value: 'directement', label: 'Directement auprès de la personne concernée' },
      { value: 'indirectement', label: 'Indirectement (préciser)' },
    ],
  },
  {
    key: 'vie_professionnelle',
    titre: 'VIE PROFESSIONNELLE',
    type: 'standard',
    items: [
      { value: 'cv_parcours', label: 'CV / parcours professionnel' },
      { value: 'diplomes_formations', label: 'Diplômes et formations' },
      { value: 'fonction_poste', label: 'Fonction / poste occupé' },
      { value: 'evaluations_professionnelles', label: 'Évaluations professionnelles' },
      { value: 'distinctions', label: 'Distinctions' },
    ],
    origine: [
      { value: 'directement', label: 'Directement auprès de la personne concernée' },
      { value: 'indirectement', label: 'Indirectement (préciser)' },
    ],
  },
  {
    key: 'economique_financiere',
    titre: 'DONNÉES ÉCONOMIQUES ET FINANCIÈRES',
    type: 'standard',
    items: [
      { value: 'revenus_salaires', label: 'Revenus / salaires' },
      { value: 'situation_financiere', label: 'Situation financière' },
      { value: 'coordonnees_bancaires', label: 'Coordonnées bancaires (IBAN/RIB)' },
      { value: 'moyens_paiement', label: 'Moyens de paiement' },
      { value: 'historique_transactions', label: 'Historique des transactions' },
    ],
    origine: [
      { value: 'directement', label: 'Directement auprès de la personne concernée' },
      { value: 'indirectement', label: 'Indirectement (préciser)' },
    ],
  },
  {
    key: 'connexion_navigation',
    titre: 'DONNÉES DE CONNEXION ET DE NAVIGATION',
    type: 'standard',
    items: [
      { value: 'adresse_ip', label: 'Adresse IP' },
      { value: 'logs_connexion', label: 'Logs de connexion' },
      { value: 'identifiants', label: 'Identifiants (login/mot de passe)' },
      { value: 'cookies', label: 'Cookies' },
      { value: 'horodatage', label: 'Horodatage' },
    ],
    origine: [
      { value: 'collecte_automatique', label: 'Collecte automatique' },
      { value: 'indirectement', label: 'Indirectement (prestataire, outil, etc.)' },
    ],
  },
  {
    key: 'localisation',
    titre: 'DONNÉES DE LOCALISATION',
    type: 'standard',
    items: [
      { value: 'gps', label: 'Données GPS' },
      { value: 'gsm_gprs', label: 'Localisation GSM/GPRS' },
      { value: 'mac', label: 'Adresse MAC' },
      { value: 'historique_deplacements', label: 'Historique des déplacements' },
    ],
    origine: [
      { value: 'collecte_automatique', label: 'Collecte automatique' },
      { value: 'terminal_mobile', label: 'Via terminal mobile' },
      { value: 'autre', label: 'Autre (préciser)' },
    ],
  },
  // ----- DONNEES PERSONNELLES SENSIBLES -----
  {
    key: 'sante',
    titre: 'DONNÉES DE SANTÉ',
    type: 'sensible',
    items: [
      { value: 'pathologies', label: 'Pathologies / affections' },
      { value: 'antecedents_medicaux', label: 'Antécédents médicaux' },
      { value: 'donnees_soins', label: 'Données relatives aux soins' },
      { value: 'situations_risques', label: 'Situations ou comportements à risques' },
      { value: 'handicap', label: 'Handicap' },
    ],
    origine: [
      { value: 'directement', label: 'Directement auprès de la personne concernée' },
      { value: 'professionnel_sante', label: 'Via un professionnel de santé' },
      { value: 'indirectement', label: 'Indirectement (préciser)' },
    ],
  },
  {
    key: 'biometriques',
    titre: "DONNÉES BIOMÉTRIQUES (nécessaires au contrôle d'identité)",
    type: 'sensible',
    items: [
      { value: 'empreintes_digitales', label: 'Empreintes digitales' },
      { value: 'reconnaissance_faciale', label: 'Reconnaissance faciale' },
      { value: 'reconnaissance_iris', label: "Reconnaissance de l'iris" },
      { value: 'contour_main', label: 'Contour de la main' },
      { value: 'reseau_veineux', label: 'Réseau veineux' },
      { value: 'reconnaissance_vocale', label: 'Reconnaissance vocale' },
    ],
    origine: [
      { value: 'directement', label: 'Collecte directe auprès de la personne concernée' },
      { value: 'dispositif_biometrique', label: 'Via dispositif biométrique' },
      { value: 'indirectement', label: 'Indirectement (préciser)' },
    ],
  },
  {
    key: 'genetiques',
    titre: 'DONNÉES GÉNÉTIQUES',
    type: 'sensible',
    items: [
      { value: 'adn', label: 'ADN' },
      { value: 'profil_genetique', label: 'Profil génétique' },
    ],
    origine: [
      { value: 'directement', label: 'Directement auprès de la personne concernée' },
      { value: 'laboratoire', label: 'Via un laboratoire habilité' },
      { value: 'indirectement', label: 'Indirectement (préciser)' },
    ],
  },
  {
    key: 'autres_sensibles',
    titre: 'AUTRES DONNÉES SENSIBLES',
    type: 'sensible',
    items: [
      { value: 'origines_raciales', label: 'Origines raciales ou ethniques' },
      { value: 'opinions_politiques', label: 'Opinions politiques' },
      { value: 'opinions_philosophiques', label: 'Opinions philosophiques' },
      { value: 'convictions_religieuses', label: 'Convictions religieuses' },
      { value: 'appartenance_syndicale', label: 'Appartenance syndicale' },
      { value: 'vie_sexuelle', label: 'Vie sexuelle ou orientation sexuelle' },
    ],
    origine: [
      { value: 'declaration', label: 'Déclaration de la personne concernée' },
      { value: 'indirectement', label: 'Indirectement (préciser)' },
    ],
  },
  {
    key: 'judiciaires',
    titre: 'DONNÉES JUDICIAIRES',
    type: 'sensible',
    items: [
      { value: 'infractions', label: 'Infractions' },
      { value: 'condamnations', label: 'Condamnations' },
      { value: 'mesures_surete', label: 'Mesures de sûreté' },
    ],
    origine: [
      { value: 'autorites_judiciaires', label: 'Autorités judiciaires' },
      { value: 'directement', label: 'Directement auprès de la personne concernée' },
      { value: 'indirectement', label: 'Indirectement (préciser)' },
    ],
  },
  {
    key: 'sociales',
    titre: 'DONNÉES SOCIALES',
    type: 'sensible',
    items: [
      { value: 'difficultes_sociales', label: 'Appréciations sur les difficultés sociales des personnes (préciser)' },
    ],
    origine: [
      { value: 'directement', label: 'Directement auprès de la personne concernée' },
      { value: 'services_sociaux', label: 'Services sociaux / organismes compétents' },
      { value: 'indirectement', label: 'Indirectement (préciser)' },
    ],
  },
];
