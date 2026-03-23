"""
Service de calcul automatique du score de conformité.
Basé sur le barème officiel du document de cadrage ARTCI (Table 6).

Barème (100 points) :
- Connaissance de la loi 2013-450 : 5 pts
- Désignation d'un DPO/CPD : 20 pts
- Formalités ARTCI effectuées : 30 pts
- Registre de traitement à jour : 15 pts
- Information des personnes concernées : 10 pts
- Contrats sous-traitants conformes : 10 pts
- Politique de sécurité formalisée : 10 pts

Classification :
- 80-100 : Conforme
- 50-79  : Partiellement Conforme
- 0-49   : Non-Conforme
"""
from app.extensions import db
from app.models.entites_conformite import EntiteConformite
from app.models.enums import StatutConformiteEnum


class ScoringService:

    @staticmethod
    def calculer_score(entite):
        """
        Calculer le score de conformité d'une entité à partir de ses données.
        Retourne (score, statut_conformite).
        """
        score = 0

        # --- Critère 1 : Connaissance de la loi 2013-450 (5 pts) ---
        # Vérifie si au moins une conformité administrative a connaissance_loi_2013 = True
        conformites = entite.conformites_administratives.all()
        if any(c.connaissance_loi_2013 for c in conformites):
            score += 5

        # --- Critère 2 : Désignation d'un DPO/CPD (20 pts) ---
        # Vérifie si au moins un DPO est désigné avec nom renseigné
        dpos = entite.dpos.all()
        if len(dpos) > 0 and any(d.nom for d in dpos):
            score += 20

        # --- Critère 3 : Formalités ARTCI effectuées (30 pts) ---
        # Déclaration (15 pts) + Autorisation (15 pts)
        if conformites:
            has_declaration = any(c.declaration_artci for c in conformites)
            has_autorisation = any(c.autorisation_artci for c in conformites)
            if has_declaration:
                score += 15
            if has_autorisation:
                score += 15

        # --- Critère 4 : Registre de traitement à jour (15 pts) ---
        # Vérifie si au moins un registre de traitement est renseigné
        registres = entite.registre_traitements.all()
        if len(registres) > 0:
            score += 15

        # --- Critère 5 : Information des personnes concernées (10 pts) ---
        # Vérifie si des catégories de données et finalités sont renseignées
        categories = entite.categories_donnees.all()
        finalites = entite.finalites.all()
        if len(categories) > 0 and len(finalites) > 0:
            score += 10

        # --- Critère 6 : Contrats sous-traitants conformes (10 pts) ---
        # Si pas de sous-traitants, on accorde les points (non applicable)
        # Si sous-traitants, vérifie que tous ont un contrat + clauses
        sous_traitants = entite.sous_traitants.all()
        if len(sous_traitants) == 0:
            score += 10
        elif all(s.contrat_sous_traitance and s.clauses_protection for s in sous_traitants):
            score += 10

        # --- Critère 7 : Politique de sécurité formalisée (10 pts) ---
        securite = entite.securite
        if securite and securite.politique_securite:
            score += 10

        # Classification
        statut = ScoringService.classifier(score)

        return score, statut

    @staticmethod
    def classifier(score):
        """Déterminer le statut de conformité selon le barème du cadrage."""
        if score >= 80:
            return StatutConformiteEnum.conforme
        elif score >= 50:
            return StatutConformiteEnum.partiellement_conforme
        else:
            return StatutConformiteEnum.non_conforme

    @staticmethod
    def mettre_a_jour_score(entite):
        """
        Calculer et persister le score de conformité d'une entité.
        Crée le record EntiteConformite si absent.
        """
        score, statut = ScoringService.calculer_score(entite)

        conformite = entite.conformite
        if not conformite:
            conformite = EntiteConformite(entite_id=entite.id)
            db.session.add(conformite)

        conformite.score_conformite = score
        conformite.statut_conformite = statut

        # Mettre à jour a_dpo
        dpos = entite.dpos.all()
        conformite.a_dpo = len(dpos) > 0

        return score, statut
