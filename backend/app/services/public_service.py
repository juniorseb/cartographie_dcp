"""
Service pour les requêtes publiques ARTCI DCP.
Entités conformes uniquement, statistiques, export.
"""
from sqlalchemy import func
from app.extensions import db
from app.models import EntiteBase, EntiteConformite, EntiteWorkflow
from app.models.enums import StatutConformiteEnum
from app.schemas.entite import EntiteListOutputSchema, EntitePublicDetailSchema
from app.services.entite_service import EntiteService
from app.utils.pagination import paginate
from app.utils.export import prepare_export_data, export_to_excel, export_to_csv, export_to_pdf


class PublicService:

    @staticmethod
    def get_entites_conformes(filters=None, page=None, per_page=None):
        """
        Liste paginée des entités CONFORMES uniquement.
        Filtre automatique : statut_conformite = 'Conforme' AND publie_sur_carte = True
        """
        # Parse statut_conformite filter
        statut_filter = None
        if filters and filters.get('statut_conformite'):
            statut_str = filters.pop('statut_conformite')  # Remove from filters so build_entite_query doesn't see it
            statut_values = [s.strip() for s in statut_str.split(',')]
            statut_filter = []
            for sv in statut_values:
                try:
                    statut_filter.append(StatutConformiteEnum(sv))
                except ValueError:
                    pass

        query = EntiteService.build_entite_query(filters)

        # Join conformite
        query = query.join(
            EntiteConformite, EntiteBase.id == EntiteConformite.entite_id
        ).filter(
            EntiteBase.publie_sur_carte == True  # noqa: E712
        )

        # Apply statut filter
        if statut_filter:
            query = query.filter(EntiteConformite.statut_conformite.in_(statut_filter))
        else:
            # Default: only Conforme
            query = query.filter(EntiteConformite.statut_conformite == StatutConformiteEnum.conforme)

        query = query.order_by(EntiteBase.denomination.asc())

        return paginate(query, EntiteListOutputSchema(), page=page, per_page=per_page)

    @staticmethod
    def get_entite_public_detail(entite_id):
        """
        Détail public d'une entité.
        Doit être Conforme pour être visible.
        """
        entite = EntiteService.get_entite_with_eager_load(entite_id)
        if not entite:
            return None

        # Vérifier que l'entité est conforme
        if (not entite.conformite or
                entite.conformite.statut_conformite != StatutConformiteEnum.conforme):
            return None

        return EntitePublicDetailSchema().dump(entite)

    @staticmethod
    def get_public_stats():
        """
        Statistiques agrégées publiques.
        """
        stats = {}

        # Comptage par statut conformité
        conformite_counts = db.session.query(
            EntiteConformite.statut_conformite,
            func.count(EntiteConformite.entite_id)
        ).group_by(EntiteConformite.statut_conformite).all()

        stats['total_entites_conformes'] = 0
        stats['total_demarche_achevee'] = 0
        stats['total_demarche_en_cours'] = 0

        for statut, count in conformite_counts:
            if statut == StatutConformiteEnum.conforme:
                stats['total_entites_conformes'] = count
            elif statut == StatutConformiteEnum.demarche_achevee:
                stats['total_demarche_achevee'] = count
            elif statut == StatutConformiteEnum.demarche_en_cours:
                stats['total_demarche_en_cours'] = count

        # Par secteur (conformes seulement)
        secteur_counts = db.session.query(
            EntiteBase.secteur_activite,
            func.count(EntiteBase.id)
        ).join(EntiteConformite).filter(
            EntiteConformite.statut_conformite == StatutConformiteEnum.conforme
        ).group_by(EntiteBase.secteur_activite).all()
        stats['par_secteur'] = {s: c for s, c in secteur_counts if s}

        # Par région (conformes seulement)
        region_counts = db.session.query(
            EntiteBase.region,
            func.count(EntiteBase.id)
        ).join(EntiteConformite).filter(
            EntiteConformite.statut_conformite == StatutConformiteEnum.conforme
        ).group_by(EntiteBase.region).all()
        stats['par_region'] = {r: c for r, c in region_counts if r}

        # Par ville (conformes seulement)
        ville_counts = db.session.query(
            EntiteBase.ville,
            func.count(EntiteBase.id)
        ).join(EntiteConformite).filter(
            EntiteConformite.statut_conformite == StatutConformiteEnum.conforme
        ).group_by(EntiteBase.ville).all()
        stats['par_ville'] = {v: c for v, c in ville_counts if v}

        return stats

    @staticmethod
    def export_entites(format_type, filters=None):
        """
        Exporter les entités conformes en Excel, CSV ou PDF.
        """
        query = EntiteService.build_entite_query(filters)
        query = query.join(
            EntiteConformite, EntiteBase.id == EntiteConformite.entite_id
        ).filter(
            EntiteConformite.statut_conformite == StatutConformiteEnum.conforme,
            EntiteBase.publie_sur_carte == True  # noqa: E712
        ).order_by(EntiteBase.denomination.asc())

        entites = query.all()
        data = prepare_export_data(entites)

        if format_type == 'excel':
            return export_to_excel(data)
        elif format_type == 'csv':
            return export_to_csv(data)
        elif format_type == 'pdf':
            return export_to_pdf(data)
        else:
            raise ValueError(f'Format non supporté : {format_type}')
