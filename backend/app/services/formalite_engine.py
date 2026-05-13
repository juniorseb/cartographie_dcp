"""
Moteur de regles metier pour determiner automatiquement le type de formalite
applicable (Autorisation prealable vs Declaration prealable) selon les
categories de donnees declarees.

Reference : §3.7 du compte-rendu de reunion 07/05/2026
Loi N°2013-450, articles 7 et 26.
"""
from typing import Tuple, List, Dict, Any


# Categories de donnees relevant de l'AUTORISATION PREALABLE
CATEGORIES_AUTORISATION = {
    'genetiques': "Donnees genetiques",
    'sante': "Donnees medicales / de sante (recherche scientifique incluse)",
    'judiciaires': "Infractions, condamnations et mesures de surete",
    'numeros_officiels': "Numero national d'identification ou identifiant de meme nature",
    'biometriques': "Donnees biometriques",
}

# Items numero_officiel qui declenchent l'autorisation (incluant numero de telephone)
ITEMS_NUMEROS_AUTORISATION = {
    'cni', 'niu', 'cmu', 'passeport', 'titre_sejour',
    'permis_conduire', 'n_securite_sociale', 'matricule_employe',
}

# Finalites declenchant l'autorisation prealable (interet public)
FINALITES_AUTORISATION = {
    'recherche_statistiques',  # historiques, statistiques ou scientifiques
}


def determiner_formalite(reponses: Dict[str, Any]) -> Tuple[str, List[str]]:
    """
    Determine le type de formalite (autorisation_prealable / declaration_prealable / aucune).
    Retourne un tuple (type, motifs).

    Reference : §3.7 du compte-rendu de reunion.

    Cas relevant de l'AUTORISATION PREALABLE :
    1. Donnees genetiques, medicales et recherche scientifique
    2. Infractions, condamnations et mesures de surete (donnees judiciaires)
    3. Numero national d'identification (y compris telephone)
    4. Donnees biometriques
    5. Interet public (traitement a des fins historiques, statistiques, scientifiques)
    6. Transfert vers un pays tiers (hors CEDEAO)

    Tous les autres traitements relevent de la DECLARATION PREALABLE.
    """
    motifs: List[str] = []

    registre = reponses.get('registre', {}) or {}
    cats_donnees = registre.get('categories_donnees', {}) or {}
    finalites = registre.get('finalites') or []

    sous_traitance = reponses.get('sous_traitance_transferts', {}) or {}
    transfert_hors_cedeao = sous_traitance.get('transfert_hors_cedeao')
    pays_transferts = sous_traitance.get('pays_transferts') or []

    # 1-4. Verifier les categories sensibles declenchant autorisation
    for cat_key, cat_label in CATEGORIES_AUTORISATION.items():
        cat_data = cats_donnees.get(cat_key)
        if cat_data and cat_data.get('items_coches'):
            # Pour numeros_officiels, on verifie au moins un item de la liste
            if cat_key == 'numeros_officiels':
                items = set(cat_data.get('items_coches', []))
                if items & ITEMS_NUMEROS_AUTORISATION:
                    motifs.append(f"{cat_label} (article 7 et 8 de la Loi N°2013-450)")
            else:
                motifs.append(f"{cat_label} (article 7 et 8 de la Loi N°2013-450)")

    # Numero de telephone (souvent dans 'identification' / 'connexion_navigation') ?
    # Selon le compte rendu §3.7, "y compris les numeros de telephone"
    # Si dans identification, l'item 'numero_telephone' est coche, ca declenche aussi
    cat_identification = cats_donnees.get('identification') or {}
    items_id = set(cat_identification.get('items_coches', []))
    if 'numero_telephone' in items_id:
        motifs.append("Numero de telephone (assimilé à identifiant de meme nature)")

    # 5. Finalites Interet public (recherche / statistiques / scientifiques)
    for fin in finalites:
        if fin in FINALITES_AUTORISATION:
            motifs.append("Traitement a des fins de recherche / statistiques (interet public)")
            break

    # 6. Transfert hors CEDEAO
    if transfert_hors_cedeao == 'oui' and pays_transferts:
        pays_str = ', '.join(pays_transferts[:3])
        if len(pays_transferts) > 3:
            pays_str += f" (+{len(pays_transferts) - 3})"
        motifs.append(f"Transfert vers pays tiers : {pays_str} (article 26 Loi N°2013-450)")

    # Determination finale
    if motifs:
        return 'autorisation_prealable', motifs
    # Si l'entreprise traite au moins une categorie de donnees, c'est une declaration prealable
    has_traitement = any(
        (c or {}).get('items_coches') for c in cats_donnees.values()
    ) or registre.get('activites_traitement')
    if has_traitement:
        return 'declaration_prealable', ["Regime de droit commun applicable a tout traitement de donnees personnelles"]
    return 'aucune', ["Aucun traitement declare pour le moment"]
