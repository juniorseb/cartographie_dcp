/**
 * Types pour les statistiques publiques (miroir public_service.py).
 */

export interface PublicStats {
  total_entites_conformes: number;
  total_demarche_achevee: number;
  total_demarche_en_cours: number;
  par_secteur: Record<string, number>;
  par_region: Record<string, number>;
  par_ville: Record<string, number>;
}
