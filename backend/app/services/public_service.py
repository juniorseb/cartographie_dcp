"""
Service pour les requêtes publiques ARTCI DCP.
Entités conformes uniquement, statistiques, export.
"""
from sqlalchemy import func, select
from app.extensions import db
from app.models import EntiteBase, EntiteConformite, EntiteWorkflow, EntiteLocalisation
from app.models.enums import StatutConformiteEnum
from app.schemas.entite import EntiteListOutputSchema, EntitePublicDetailSchema
from app.services.entite_service import EntiteService
from app.utils.pagination import paginate
from app.utils.export import prepare_export_data, export_to_excel, export_to_csv, export_to_pdf


class PublicService:

    # Statuts publiables : tous les statuts evalues. Regle metier (decision
    # ARTCI) : les organismes non conformes peuvent aussi etre publies ; la
    # visibilite publique depend UNIQUEMENT de `publie_sur_carte` (decision
    # admin). Le public filtre ensuite par statut (cases a cocher).
    _STATUTS_PUBLIABLES = [
        StatutConformiteEnum.conforme,
        StatutConformiteEnum.demarche_en_cours,
        StatutConformiteEnum.partiellement_conforme,
        StatutConformiteEnum.demarche_achevee,
        StatutConformiteEnum.non_conforme,
    ]

    @staticmethod
    def _build_publiable_query(filters=None, statut_filter=None, avec_gps=True, registre_complet=False):
        """Construit la requete des entites visibles sur la carte publique.

        Critères STRICTS — doivent matcher exactement la liste des marqueurs
        affiches cote frontend :
        1. `publie_sur_carte = True`
        2. statut de conformite dans _STATUTS_PUBLIABLES (ou intersection avec
           le filtre utilisateur)
        3. coordonnees GPS presentes (lat ET lng non nulles) — sans coordonnees,
           pas de marqueur, donc l'entite ne doit pas etre comptee non plus.
        """
        query = EntiteService.build_entite_query(filters)

        query = query.filter(EntiteBase.archive == False)  # noqa: E712
        # Registre complet (vue « Responsables de traitement ») : toute la base
        # evaluee, sans attendre la publication par l'ARTCI.
        if not registre_complet:
            query = query.filter(EntiteBase.publie_sur_carte == True)  # noqa: E712
        # La carte exige des coordonnees ; la liste publique non (un organisme
        # publie sans GPS reste consultable dans le registre).
        if avec_gps:
            query = query.filter(
                select(1).select_from(EntiteLocalisation).where(
                    EntiteLocalisation.entite_id == EntiteBase.id,
                    EntiteLocalisation.latitude.isnot(None),
                    EntiteLocalisation.longitude.isnot(None),
                ).exists(),
            )

        # Statut conformite — intersection avec les publiables
        if statut_filter:
            statuts_to_apply = [s for s in statut_filter if s in PublicService._STATUTS_PUBLIABLES]
            if not statuts_to_apply:
                statuts_to_apply = PublicService._STATUTS_PUBLIABLES
        else:
            statuts_to_apply = PublicService._STATUTS_PUBLIABLES

        query = query.filter(
            select(1).select_from(EntiteConformite).where(
                EntiteConformite.entite_id == EntiteBase.id,
                EntiteConformite.statut_conformite.in_(statuts_to_apply),
            ).exists()
        )

        return query

    @staticmethod
    def get_entites_conformes(filters=None, page=None, per_page=None, avec_gps=True, registre_complet=False):
        """Liste paginée des entités publiées (carte : avec_gps=True ; registre : False)."""
        statut_filter = None
        if filters and filters.get('statut_conformite'):
            statut_str = filters.pop('statut_conformite')
            statut_filter = []
            for sv in [s.strip() for s in statut_str.split(',')]:
                try:
                    statut_filter.append(StatutConformiteEnum(sv))
                except ValueError:
                    pass

        query = PublicService._build_publiable_query(
            filters, statut_filter, avec_gps=avec_gps, registre_complet=registre_complet,
        )
        query = query.order_by(EntiteBase.denomination.asc())
        return paginate(query, EntiteListOutputSchema(), page=page, per_page=per_page)

    @staticmethod
    def get_entite_public_detail(entite_id):
        """
        Détail public d'une entité.
        Visible des qu'elle est evaluee (statut de conformite) et non archivee :
        le registre des responsables de traitement expose toute la base.
        """
        entite = EntiteService.get_entite_with_eager_load(entite_id)
        if not entite:
            return None

        if entite.archive or not entite.conformite or not entite.conformite.statut_conformite:
            return None

        return EntitePublicDetailSchema().dump(entite)

    @staticmethod
    def get_public_stats(registre_complet=False):
        """Statistiques publiques.

        Les compteurs doivent rester COHERENTS avec le nombre de marqueurs
        affiches sur la carte. On ne compte donc que les entites :
        - publiables (statut conformite dans _STATUTS_PUBLIABLES)
        - publiees sur la carte (publie_sur_carte = True)
        - geolocalisees (lat/lng non nulles)
        - non archivees
        """
        stats = {
            'total_entites_conformes': 0,
            'total_partiellement_conformes': 0,
            'total_non_conformes': 0,
            # Compat ascendante : anciens libelles maintenus a 0.
            'total_demarche_achevee': 0,
            'total_demarche_en_cours': 0,
        }

        # Sous-requete IDs des entites visibles sur la carte ET publiables.
        # On filtre sur les 3 criteres ensemble pour que TOUS les breakdowns
        # (par statut, par secteur, par region, par ville) comptent exactement
        # les memes entites — sinon les sommes ne matchent pas (un dossier
        # publie_sur_carte=True mais non_conforme serait compte dans 'par
        # secteur' alors qu'il est exclu de 'total_conformes').
        criteres = [
            EntiteBase.archive == False,  # noqa: E712
            EntiteConformite.statut_conformite.in_(PublicService._STATUTS_PUBLIABLES),
        ]
        # registre_complet : toute la base evaluee (vue « Responsables de
        # traitement »), sans exigence de publication ni de GPS.
        if not registre_complet:
            criteres += [
                EntiteBase.publie_sur_carte == True,  # noqa: E712
                select(1).select_from(EntiteLocalisation).where(
                    EntiteLocalisation.entite_id == EntiteBase.id,
                    EntiteLocalisation.latitude.isnot(None),
                    EntiteLocalisation.longitude.isnot(None),
                ).exists(),
            ]
        publiables_ids_subq = db.session.query(EntiteBase.id).join(
            EntiteConformite, EntiteConformite.entite_id == EntiteBase.id,
        ).filter(*criteres).subquery()

        # Comptage par statut conformite (sur le meme univers)
        conformite_counts = db.session.query(
            EntiteConformite.statut_conformite,
            func.count(EntiteConformite.entite_id),
        ).filter(
            EntiteConformite.entite_id.in_(db.session.query(publiables_ids_subq)),
        ).group_by(EntiteConformite.statut_conformite).all()

        for statut, count in conformite_counts:
            if statut == StatutConformiteEnum.conforme:
                stats['total_entites_conformes'] = count
            elif statut in (
                StatutConformiteEnum.partiellement_conforme,
                StatutConformiteEnum.demarche_achevee,
                StatutConformiteEnum.demarche_en_cours,
            ):
                stats['total_partiellement_conformes'] += count
            elif statut == StatutConformiteEnum.non_conforme:
                stats['total_non_conformes'] = count

        # Repartitions geographiques — meme univers que ci-dessus.
        secteur_counts = db.session.query(
            EntiteBase.secteur_activite, func.count(EntiteBase.id),
        ).filter(
            EntiteBase.id.in_(db.session.query(publiables_ids_subq)),
        ).group_by(EntiteBase.secteur_activite).all()
        stats['par_secteur'] = {s: c for s, c in secteur_counts if s}

        region_counts = db.session.query(
            EntiteBase.region, func.count(EntiteBase.id),
        ).filter(
            EntiteBase.id.in_(db.session.query(publiables_ids_subq)),
        ).group_by(EntiteBase.region).all()
        stats['par_region'] = {r: c for r, c in region_counts if r}

        ville_counts = db.session.query(
            EntiteBase.ville, func.count(EntiteBase.id),
        ).filter(
            EntiteBase.id.in_(db.session.query(publiables_ids_subq)),
        ).group_by(EntiteBase.ville).all()
        stats['par_ville'] = {v: c for v, c in ville_counts if v}

        return stats

    @staticmethod
    def export_entites(format_type, filters=None, registre_complet=False):
        """Exporter les entités du registre (publiees, ou toute la base si registre_complet)."""
        statut_filter = None
        if filters and filters.get('statut_conformite'):
            statut_filter = []
            for sv in [x.strip() for x in filters.pop('statut_conformite').split(',')]:
                try:
                    statut_filter.append(StatutConformiteEnum(sv))
                except ValueError:
                    pass
        query = PublicService._build_publiable_query(
            filters, statut_filter, avec_gps=False, registre_complet=registre_complet,
        )
        query = query.order_by(EntiteBase.denomination.asc())
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
