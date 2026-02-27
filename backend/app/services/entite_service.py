"""
Service CRUD partagé pour les entités ARTCI DCP.
Gère la création/mise à jour d'EntiteBase avec ses 17 tables enfants
dans une seule transaction.
"""
from app.extensions import db
from app.models import (
    EntiteBase, EntiteContact, EntiteWorkflow, EntiteLocalisation,
    EntiteConformite, SecuriteConformite, ResponsableLegal, DPO,
    ConformiteAdministrative, RegistreTraitement, CategorieDonnees,
    FinaliteBaseLegale, SousTraitance, TransfertInternational,
    MesureSecurite, CertificationSecurite
)
from app.models.enums import (
    OrigineSaisieEnum, StatutWorkflowEnum, TypeDPOEnum,
    CategorieDonneesEnum, BaseLegaleEnum, TypeMesureEnum
)
from sqlalchemy.orm import joinedload


class EntiteService:

    @staticmethod
    def create_entite_with_children(data, compte_id=None, user_id=None,
                                     origine='auto_recensement'):
        """
        Créer une entité complète avec toutes ses tables enfants.
        Transaction atomique.
        """
        entite = EntiteBase(
            compte_entreprise_id=compte_id,
            numero_cc=data['numero_cc'],
            denomination=data['denomination'],
            forme_juridique=data.get('forme_juridique'),
            secteur_activite=data.get('secteur_activite'),
            adresse=data.get('adresse'),
            ville=data.get('ville'),
            region=data.get('region'),
            telephone=data.get('telephone'),
            email=data.get('email'),
            origine_saisie=OrigineSaisieEnum(origine),
            publie_sur_carte=False
        )
        db.session.add(entite)
        db.session.flush()  # Pour obtenir entite.id

        # Workflow initial
        statut_initial = (
            StatutWorkflowEnum.brouillon_artci if origine == 'saisie_artci'
            else StatutWorkflowEnum.brouillon
        )
        workflow = EntiteWorkflow(
            entite_id=entite.id,
            statut=statut_initial,
            createdBy=user_id
        )
        db.session.add(workflow)

        # Conformité initiale (vide)
        conformite = EntiteConformite(entite_id=entite.id)
        db.session.add(conformite)

        # Contact (ONE-TO-ONE)
        if data.get('contact'):
            contact = EntiteContact(entite_id=entite.id, **data['contact'])
            db.session.add(contact)

        # Localisation (ONE-TO-ONE)
        if data.get('localisation'):
            loc_data = data['localisation'].copy()
            localisation = EntiteLocalisation(entite_id=entite.id, **loc_data)
            db.session.add(localisation)

        # Sécurité conformité (ONE-TO-ONE)
        if data.get('securite'):
            securite = SecuriteConformite(entite_id=entite.id, **data['securite'])
            db.session.add(securite)

        # ONE-TO-MANY children
        EntiteService._create_children(entite.id, data)

        db.session.commit()
        return entite

    @staticmethod
    def update_entite_with_children(entite, data):
        """
        Mettre à jour une entité et ses enfants.
        ONE-TO-ONE : upsert
        ONE-TO-MANY : replace (supprimer anciens + insérer nouveaux)
        """
        # Champs directs EntiteBase
        direct_fields = [
            'denomination', 'forme_juridique', 'secteur_activite',
            'adresse', 'ville', 'region', 'telephone', 'email'
        ]
        for field in direct_fields:
            if field in data:
                setattr(entite, field, data[field])

        # Contact (upsert)
        if 'contact' in data:
            if entite.contact:
                for k, v in data['contact'].items():
                    setattr(entite.contact, k, v)
            else:
                contact = EntiteContact(entite_id=entite.id, **data['contact'])
                db.session.add(contact)

        # Localisation (upsert)
        if 'localisation' in data:
            if entite.localisation:
                for k, v in data['localisation'].items():
                    setattr(entite.localisation, k, v)
            else:
                loc = EntiteLocalisation(entite_id=entite.id, **data['localisation'])
                db.session.add(loc)

        # Sécurité (upsert)
        if 'securite' in data:
            if entite.securite:
                for k, v in data['securite'].items():
                    setattr(entite.securite, k, v)
            else:
                sec = SecuriteConformite(entite_id=entite.id, **data['securite'])
                db.session.add(sec)

        # ONE-TO-MANY : replace strategy
        EntiteService._replace_children(entite, data)

        db.session.commit()
        return entite

    @staticmethod
    def _create_children(entite_id, data):
        """Créer les enregistrements ONE-TO-MANY enfants."""
        child_mappings = {
            'responsables_legaux': ResponsableLegal,
            'dpos': (DPO, {'type': TypeDPOEnum}),
            'conformites_administratives': ConformiteAdministrative,
            'registre_traitements': RegistreTraitement,
            'categories_donnees': (CategorieDonnees, {'categorie': CategorieDonneesEnum}),
            'finalites': (FinaliteBaseLegale, {'base_legale': BaseLegaleEnum}),
            'sous_traitants': SousTraitance,
            'transferts': TransfertInternational,
            'mesures_securite': (MesureSecurite, {'type_mesure': TypeMesureEnum}),
            'certifications': CertificationSecurite,
        }

        for key, mapping in child_mappings.items():
            items = data.get(key, [])
            if not items:
                continue

            if isinstance(mapping, tuple):
                model_class, enum_fields = mapping
            else:
                model_class = mapping
                enum_fields = {}

            for item_data in items:
                item_dict = item_data.copy()
                item_dict.pop('id', None)
                # Convertir les champs enum
                for field_name, enum_class in enum_fields.items():
                    if field_name in item_dict and item_dict[field_name]:
                        item_dict[field_name] = enum_class(item_dict[field_name])
                child = model_class(entite_id=entite_id, **item_dict)
                db.session.add(child)

    @staticmethod
    def _replace_children(entite, data):
        """Supprimer et recréer les enfants ONE-TO-MANY."""
        replace_mappings = {
            'responsables_legaux': (ResponsableLegal, entite.responsables_legaux),
            'dpos': (DPO, entite.dpos),
            'conformites_administratives': (ConformiteAdministrative, entite.conformites_administratives),
            'registre_traitements': (RegistreTraitement, entite.registre_traitements),
            'categories_donnees': (CategorieDonnees, entite.categories_donnees),
            'finalites': (FinaliteBaseLegale, entite.finalites),
            'sous_traitants': (SousTraitance, entite.sous_traitants),
            'transferts': (TransfertInternational, entite.transferts),
            'mesures_securite': (MesureSecurite, entite.mesures_securite),
            'certifications': (CertificationSecurite, entite.certifications),
        }

        for key, (model_class, relation) in replace_mappings.items():
            if key not in data:
                continue
            # Supprimer les anciens
            for old in relation.all():
                db.session.delete(old)
            db.session.flush()

        # Recréer les nouveaux
        EntiteService._create_children(entite.id, data)

    @staticmethod
    def get_entite_with_eager_load(entite_id):
        """
        Charger une entité avec ses relations ONE-TO-ONE (évite N+1).
        Les relations ONE-TO-MANY (lazy='dynamic') sont chargées à la demande.
        """
        return EntiteBase.query.options(
            joinedload(EntiteBase.contact),
            joinedload(EntiteBase.workflow).joinedload(EntiteWorkflow.created_by_user),
            joinedload(EntiteBase.workflow).joinedload(EntiteWorkflow.assigned_to_user),
            joinedload(EntiteBase.localisation),
            joinedload(EntiteBase.conformite),
            joinedload(EntiteBase.securite),
        ).get(entite_id)

    @staticmethod
    def build_entite_query(filters=None):
        """
        Construire une requête de base avec filtres optionnels.
        Retourne un objet query SQLAlchemy.
        """
        query = EntiteBase.query.options(
            joinedload(EntiteBase.conformite),
            joinedload(EntiteBase.workflow),
            joinedload(EntiteBase.localisation),
        )

        if not filters:
            return query

        if filters.get('search'):
            search = f"%{filters['search']}%"
            query = query.filter(
                db.or_(
                    EntiteBase.denomination.ilike(search),
                    EntiteBase.numero_cc.ilike(search)
                )
            )
        if filters.get('secteur_activite'):
            query = query.filter(EntiteBase.secteur_activite == filters['secteur_activite'])
        if filters.get('ville'):
            query = query.filter(EntiteBase.ville == filters['ville'])
        if filters.get('region'):
            query = query.filter(EntiteBase.region == filters['region'])
        if filters.get('forme_juridique'):
            query = query.filter(EntiteBase.forme_juridique == filters['forme_juridique'])
        if filters.get('origine_saisie'):
            query = query.filter(
                EntiteBase.origine_saisie == OrigineSaisieEnum(filters['origine_saisie'])
            )
        if filters.get('publie_sur_carte') is not None:
            query = query.filter(EntiteBase.publie_sur_carte == filters['publie_sur_carte'])

        # Filtres sur tables jointes
        if filters.get('statut_conformite'):
            from app.models.enums import StatutConformiteEnum
            query = query.join(EntiteConformite).filter(
                EntiteConformite.statut_conformite == StatutConformiteEnum(filters['statut_conformite'])
            )
        if filters.get('statut_workflow'):
            query = query.join(EntiteWorkflow).filter(
                EntiteWorkflow.statut == StatutWorkflowEnum(filters['statut_workflow'])
            )

        return query
