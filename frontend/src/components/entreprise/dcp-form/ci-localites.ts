/**
 * Localités de Côte d'Ivoire : régions (Districts/Régions) + communes.
 * Utilisées pour les listes déroulantes du formulaire d'enregistrement.
 *
 * Les communes sont indexées par région pour permettre un filtrage dépendant.
 */

// Régions / Districts de Côte d'Ivoire
export const REGIONS_CI: string[] = [
  'Abidjan',
  'Yamoussoukro',
  'Bas-Sassandra',
  'Comoé',
  'Denguélé',
  'Gôh-Djiboua',
  'Lacs',
  'Lagunes',
  'Montagnes',
  'Sassandra-Marahoué',
  'Savanes',
  'Vallée du Bandama',
  'Woroba',
  'Zanzan',
];

// Communes principales par région (liste non exhaustive, extensible).
export const COMMUNES_PAR_REGION: Record<string, string[]> = {
  Abidjan: [
    'Abobo', 'Adjamé', 'Anyama', 'Attécoubé', 'Bingerville', 'Cocody',
    'Koumassi', 'Marcory', 'Plateau', 'Port-Bouët', 'Treichville', 'Yopougon',
    'Songon', 'Brofodoumé',
  ],
  Yamoussoukro: ['Yamoussoukro', 'Attiégouakro', 'Didiévi', 'Tiébissou'],
  'Bas-Sassandra': ['San-Pédro', 'Sassandra', 'Soubré', 'Tabou', 'Buyo', 'Méagui', 'Grand-Béréby'],
  Comoé: ['Abengourou', 'Aboisso', 'Adiaké', 'Agnibilékrou', 'Grand-Bassam', 'Bonoua', 'Ayamé'],
  Denguélé: ['Odienné', 'Madinani', 'Minignan', 'Samatiguila', 'Kaniasso'],
  'Gôh-Djiboua': ['Gagnoa', 'Divo', 'Lakota', 'Oumé', 'Guibéroua'],
  Lacs: ['Dimbokro', 'Bocanda', 'Bongouanou', 'Daoukro', 'M\'Bahiakro', 'Prikro', 'Arrah'],
  Lagunes: ['Dabou', 'Grand-Lahou', 'Jacqueville', 'Sikensi', 'Tiassalé', 'Agboville', 'Adzopé', 'Akoupé', 'Alépé'],
  Montagnes: ['Man', 'Danané', 'Biankouma', 'Bangolo', 'Duékoué', 'Guiglo', 'Toulepleu', 'Zouan-Hounien'],
  'Sassandra-Marahoué': ['Daloa', 'Issia', 'Vavoua', 'Bouaflé', 'Sinfra', 'Zuénoula'],
  Savanes: ['Korhogo', 'Boundiali', 'Ferkessédougou', 'Tengréla', 'Dikodougou', 'Sinématiali', 'Kouto'],
  'Vallée du Bandama': ['Bouaké', 'Béoumi', 'Botro', 'Sakassou', 'Katiola', 'Dabakala', 'Niakaramandougou'],
  Woroba: ['Séguéla', 'Mankono', 'Touba', 'Kani', 'Koro'],
  Zanzan: ['Bondoukou', 'Bouna', 'Tanda', 'Nassian', 'Doropo', 'Téhini'],
};

/** Retourne les communes d'une région, ou une liste vide. */
export function communesForRegion(region?: string): string[] {
  if (!region) return [];
  return COMMUNES_PAR_REGION[region] ?? [];
}

// Secteurs d'activité (multi-sélection) — liste détaillée
export const SECTEURS_ACTIVITE: string[] = [
  'Télécommunications / TIC',
  'Banque / Microfinance',
  'Finance / Marché des capitaux',
  'Assurance',
  'Santé / Médical',
  'Éducation / Formation',
  'Commerce / Distribution',
  'Industrie / Manufacture',
  'Transport / Logistique',
  'Agriculture / Agro-industrie',
  'BTP / Construction',
  'Énergie / Mines / Pétrole',
  'Tourisme / Hôtellerie / Restauration',
  'Médias / Communication / Publicité',
  'Services juridiques / Conseil',
  'Administration publique',
  'Collectivité territoriale',
  'Association / ONG',
  'Immobilier',
  'Sécurité / Gardiennage',
  'Ressources humaines / Recrutement',
  'Informatique / Édition de logiciels',
  'E-commerce / Plateforme en ligne',
  'Autre',
];
