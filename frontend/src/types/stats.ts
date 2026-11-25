/**
 * Types pour les statistiques publiques (miroir public_service.py).
 */

export interface PublicStats {
  /** Compte des entites au statut 'Conforme' (score = 100). */
  total_entites_conformes: number;
  /** Compte des entites au statut 'Partiellement conforme' (score 70-99).
   *  Agrege aussi les anciens libelles historiques 'Demarche achevee'/'Demarche en cours'. */
  total_partiellement_conformes: number;
  /** Entites 'Non conforme' publiees (score < 70). */
  total_non_conformes?: number;
  /** Compat ascendante : anciens compteurs (toujours retournes par l'API, valent 0). */
  total_demarche_achevee?: number;
  total_demarche_en_cours?: number;
  par_secteur: Record<string, number>;
  par_region: Record<string, number>;
  par_ville: Record<string, number>;
}
