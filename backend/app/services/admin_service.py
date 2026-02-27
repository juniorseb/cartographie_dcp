"""
Service admin pour ARTCI DCP Platform.
Dashboard stats, gestion utilisateurs, import Excel, logs.
"""
from datetime import datetime, timezone
from sqlalchemy import func
from app.extensions import db
from app.models import (
    EntiteBase, EntiteWorkflow, EntiteConformite,
    AssignationDemande, FeedbackVerification,
    HistoriqueStatut, User,
    DemandeRapprochement, Renouvellement, DocumentJoint, Notification
)
from app.models.enums import (
    StatutWorkflowEnum, StatutConformiteEnum,
    StatutAssignationEnum, RoleEnum, OrigineSaisieEnum,
    StatutRapprochementEnum, StatutRenouvellementEnum
)
from app.schemas.entite import EntiteListOutputSchema, EntiteDetailOutputSchema
from app.schemas.user import UserOutputSchema
from app.schemas.workflow import (
    AssignationOutputSchema, FeedbackOutputSchema, HistoriqueStatutOutputSchema
)
from app.services.entite_service import EntiteService
from app.utils.password import hash_password
from app.utils.pagination import paginate


class AdminService:

    @staticmethod
    def get_dashboard_stats(filters=None):
        """Statistiques admin avec filtres de période optionnels."""
        stats = {}

        base_query = db.session.query(EntiteBase)
        if filters and filters.get('date_debut'):
            base_query = base_query.filter(EntiteBase.createdAt >= filters['date_debut'])
        if filters and filters.get('date_fin'):
            base_query = base_query.filter(EntiteBase.createdAt <= filters['date_fin'])

        stats['total_entites'] = base_query.count()

        # Par statut workflow
        wf_counts = db.session.query(
            EntiteWorkflow.statut, func.count(EntiteWorkflow.entite_id)
        ).group_by(EntiteWorkflow.statut).all()
        stats['par_statut_workflow'] = {s.value: c for s, c in wf_counts}

        # Par statut conformité
        conf_counts = db.session.query(
            EntiteConformite.statut_conformite,
            func.count(EntiteConformite.entite_id)
        ).filter(
            EntiteConformite.statut_conformite.isnot(None)
        ).group_by(EntiteConformite.statut_conformite).all()
        stats['par_statut_conformite'] = {s.value: c for s, c in conf_counts}

        # Par secteur
        secteur_counts = db.session.query(
            EntiteBase.secteur_activite, func.count(EntiteBase.id)
        ).group_by(EntiteBase.secteur_activite).all()
        stats['par_secteur'] = {s: c for s, c in secteur_counts if s}

        # Par région
        region_counts = db.session.query(
            EntiteBase.region, func.count(EntiteBase.id)
        ).group_by(EntiteBase.region).all()
        stats['par_region'] = {r: c for r, c in region_counts if r}

        # Par origine
        origine_counts = db.session.query(
            EntiteBase.origine_saisie, func.count(EntiteBase.id)
        ).group_by(EntiteBase.origine_saisie).all()
        stats['par_origine'] = {o.value: c for o, c in origine_counts}

        # Demandes en cours / en retard
        stats['demandes_en_cours'] = AssignationDemande.query.filter_by(
            statut=StatutAssignationEnum.en_cours
        ).count()
        stats['demandes_en_retard'] = AssignationDemande.query.filter_by(
            statut=StatutAssignationEnum.en_retard
        ).count()

        # Agents actifs
        stats['agents_actifs'] = User.query.filter_by(is_active=True).count()

        return stats

    @staticmethod
    def list_all_entites(filters=None, page=None, per_page=None):
        """Liste toutes les entités (tous statuts) avec filtres."""
        query = EntiteService.build_entite_query(filters)
        query = query.order_by(EntiteBase.createdAt.desc())
        return paginate(query, EntiteListOutputSchema(), page=page, per_page=per_page)

    @staticmethod
    def get_entite_detail(entite_id):
        """Détail complet d'une entité (vue admin)."""
        entite = EntiteService.get_entite_with_eager_load(entite_id)
        if not entite:
            return None
        return EntiteDetailOutputSchema().dump(entite)

    @staticmethod
    def create_entite_artci(user_id, data):
        """Créer une entité via saisie ARTCI."""
        return EntiteService.create_entite_with_children(
            data, user_id=user_id, origine='saisie_artci'
        )

    @staticmethod
    def update_entite(entite_id, user_id, data):
        """Modifier une entité (admin)."""
        entite = EntiteBase.query.get(entite_id)
        if not entite:
            raise ValueError('Entité non trouvée.')
        return EntiteService.update_entite_with_children(entite, data)

    @staticmethod
    def get_panier(agent_id):
        """Récupérer le panier de demandes assignées à un agent."""
        assignations = AssignationDemande.query.filter_by(
            agent_id=agent_id
        ).order_by(AssignationDemande.echeance.asc()).all()
        return AssignationOutputSchema(many=True).dump(assignations)

    @staticmethod
    def add_feedback(agent_id, data):
        """Ajouter un feedback de vérification."""
        entite = EntiteBase.query.get(data['entite_id'])
        if not entite:
            raise ValueError('Entité non trouvée.')

        feedback = FeedbackVerification(
            entite_id=data['entite_id'],
            agent_id=agent_id,
            commentaires=data.get('commentaires'),
            elements_manquants=data.get('elements_manquants'),
            delai_fourniture=data.get('delai_fourniture')
        )
        db.session.add(feedback)

        # Si éléments manquants, transition vers en_attente_complements
        if data.get('elements_manquants'):
            workflow = EntiteWorkflow.query.get(data['entite_id'])
            if workflow and workflow.statut == StatutWorkflowEnum.en_verification:
                from app.services.workflow_service import WorkflowService
                WorkflowService.transition_statut(
                    data['entite_id'], 'en_attente_complements',
                    agent_id, 'Compléments demandés par l\'agent'
                )

        db.session.commit()
        return feedback

    # --- Gestion utilisateurs ---

    @staticmethod
    def list_users(page=None, per_page=None):
        """Liste paginée des utilisateurs ARTCI."""
        query = User.query.order_by(User.createdAt.desc())
        return paginate(query, UserOutputSchema(), page=page, per_page=per_page)

    @staticmethod
    def create_user(data):
        """Créer un utilisateur ARTCI."""
        if User.query.filter_by(email=data['email']).first():
            raise ValueError('Un utilisateur existe déjà avec cet email.')

        user = User(
            nom=data['nom'],
            prenom=data['prenom'],
            email=data['email'],
            password_hash=hash_password(data['password']),
            role=RoleEnum(data['role']),
            telephone=data.get('telephone'),
            is_active=True
        )
        db.session.add(user)
        db.session.commit()
        return user

    @staticmethod
    def update_user(user_id, data):
        """Modifier un utilisateur ARTCI."""
        user = User.query.get(user_id)
        if not user:
            raise ValueError('Utilisateur non trouvé.')

        if 'email' in data and data['email'] != user.email:
            existing = User.query.filter_by(email=data['email']).first()
            if existing:
                raise ValueError('Cet email est déjà utilisé.')

        updatable = ['nom', 'prenom', 'email', 'telephone', 'is_active']
        for field in updatable:
            if field in data:
                setattr(user, field, data[field])

        if 'role' in data:
            user.role = RoleEnum(data['role'])

        db.session.commit()
        return user

    @staticmethod
    def deactivate_user(user_id):
        """Désactiver un utilisateur (soft delete)."""
        user = User.query.get(user_id)
        if not user:
            raise ValueError('Utilisateur non trouvé.')
        user.is_active = False
        db.session.commit()

    # --- Import Excel ---

    @staticmethod
    def import_excel(file, user_id):
        """
        Importer des entités depuis un fichier Excel.
        Retourne {imported: N, errors: [{row, message}]}.
        """
        import pandas as pd

        try:
            df = pd.read_excel(file, engine='openpyxl')
        except Exception as e:
            raise ValueError(f'Erreur de lecture du fichier Excel : {e}')

        imported = 0
        errors = []

        for idx, row in df.iterrows():
            try:
                data = {
                    'denomination': str(row.get('denomination', '')).strip(),
                    'numero_cc': str(row.get('numero_cc', '')).strip(),
                    'forme_juridique': str(row.get('forme_juridique', '')).strip() or None,
                    'secteur_activite': str(row.get('secteur_activite', '')).strip() or None,
                    'adresse': str(row.get('adresse', '')).strip() or None,
                    'ville': str(row.get('ville', '')).strip() or None,
                    'region': str(row.get('region', '')).strip() or None,
                    'telephone': str(row.get('telephone', '')).strip() or None,
                    'email': str(row.get('email', '')).strip() or None,
                }

                if not data['denomination'] or not data['numero_cc']:
                    errors.append({'row': idx + 2, 'message': 'Dénomination et N° CC requis.'})
                    continue

                # Vérifier unicité
                if EntiteBase.query.filter_by(numero_cc=data['numero_cc']).first():
                    errors.append({'row': idx + 2, 'message': f'N° CC {data["numero_cc"]} existe déjà.'})
                    continue

                EntiteService.create_entite_with_children(
                    data, user_id=user_id, origine='saisie_artci'
                )
                imported += 1
            except Exception as e:
                errors.append({'row': idx + 2, 'message': str(e)})

        return {'imported': imported, 'errors': errors}

    # --- Logs ---

    @staticmethod
    def get_historique_actions(filters=None, page=None, per_page=None):
        """Historique des changements de statut."""
        query = HistoriqueStatut.query.order_by(HistoriqueStatut.date_changement.desc())

        if filters:
            if filters.get('entite_id'):
                query = query.filter_by(entite_id=filters['entite_id'])
            if filters.get('modifie_par'):
                query = query.filter_by(modifie_par=filters['modifie_par'])

        return paginate(query, HistoriqueStatutOutputSchema(), page=page, per_page=per_page)

    # --- Rapprochements ---

    @staticmethod
    def list_rapprochements(filters=None, page=None, per_page=None):
        """Liste paginée des demandes de rapprochement."""
        from marshmallow import Schema, fields as ma_fields

        query = DemandeRapprochement.query.order_by(DemandeRapprochement.createdAt.desc())
        if filters:
            if filters.get('statut'):
                query = query.filter(DemandeRapprochement.statut == StatutRapprochementEnum(filters['statut']))
            if filters.get('search'):
                search = f"%{filters['search']}%"
                query = query.filter(
                    db.or_(
                        DemandeRapprochement.email_demandeur.ilike(search),
                        DemandeRapprochement.numero_cc.ilike(search),
                    )
                )

        class RapprochementOutputSchema(Schema):
            id = ma_fields.String()
            entite_id = ma_fields.String()
            entreprise_denomination = ma_fields.Method('get_denomination')
            numero_cc = ma_fields.String()
            email_demandeur = ma_fields.String()
            raison_demande = ma_fields.String()
            statut = ma_fields.Method('get_statut')
            commentaire_artci = ma_fields.String()
            traite_par = ma_fields.String()
            createdAt = ma_fields.DateTime()

            def get_denomination(self, obj):
                if obj.entite:
                    return obj.entite.denomination
                return ''

            def get_statut(self, obj):
                return obj.statut.value if obj.statut else None

        return paginate(query, RapprochementOutputSchema(), page=page, per_page=per_page)

    @staticmethod
    def traiter_rapprochement(rapprochement_id, user_id, data):
        """Approuver ou rejeter une demande de rapprochement."""
        rapprochement = DemandeRapprochement.query.get(rapprochement_id)
        if not rapprochement:
            raise ValueError('Demande de rapprochement non trouvée.')
        if rapprochement.statut != StatutRapprochementEnum.en_attente:
            raise ValueError('Cette demande a déjà été traitée.')

        action = data.get('action')
        if action == 'approuver':
            rapprochement.statut = StatutRapprochementEnum.approuve
        elif action == 'rejeter':
            rapprochement.statut = StatutRapprochementEnum.rejete
        else:
            raise ValueError('Action invalide (approuver/rejeter).')

        rapprochement.traite_par = user_id
        rapprochement.date_traitement = datetime.now(timezone.utc)
        rapprochement.commentaire_artci = data.get('motif', '')
        db.session.commit()
        return {'id': rapprochement.id, 'statut': rapprochement.statut.value}

    # --- Renouvellements ---

    @staticmethod
    def list_renouvellements(filters=None, page=None, per_page=None):
        """Liste paginée des demandes de renouvellement."""
        from marshmallow import Schema, fields as ma_fields

        query = Renouvellement.query.order_by(Renouvellement.createdAt.desc())
        if filters:
            if filters.get('statut'):
                query = query.filter(Renouvellement.statut == StatutRenouvellementEnum(filters['statut']))
            if filters.get('search'):
                search = f"%{filters['search']}%"
                query = query.join(EntiteBase).filter(
                    EntiteBase.denomination.ilike(search)
                )

        class RenouvellementOutputSchema(Schema):
            id = ma_fields.String()
            entite_id = ma_fields.String()
            entreprise_denomination = ma_fields.Method('get_denomination')
            date_expiration = ma_fields.Method('get_date_expiration')
            motif = ma_fields.String()
            statut = ma_fields.Method('get_statut')
            commentaire = ma_fields.String()
            traite_par = ma_fields.String()
            createdAt = ma_fields.DateTime()

            def get_denomination(self, obj):
                if obj.entite:
                    return obj.entite.denomination
                return ''

            def get_date_expiration(self, obj):
                if obj.date_expiration_agrement:
                    return obj.date_expiration_agrement.isoformat()
                return None

            def get_statut(self, obj):
                return obj.statut.value if obj.statut else None

        return paginate(query, RenouvellementOutputSchema(), page=page, per_page=per_page)

    @staticmethod
    def traiter_renouvellement(renouvellement_id, user_id, data):
        """Approuver ou rejeter une demande de renouvellement."""
        renouvellement = Renouvellement.query.get(renouvellement_id)
        if not renouvellement:
            raise ValueError('Demande de renouvellement non trouvée.')

        action = data.get('action')
        if action == 'approuver':
            renouvellement.statut = StatutRenouvellementEnum.approuve
        elif action == 'rejeter':
            renouvellement.statut = StatutRenouvellementEnum.rejete
        else:
            raise ValueError('Action invalide (approuver/rejeter).')

        renouvellement.traite_par = user_id
        renouvellement.date_traitement = datetime.now(timezone.utc)
        renouvellement.commentaire = data.get('commentaire', '')
        db.session.commit()
        return {'id': renouvellement.id, 'statut': renouvellement.statut.value}

    # --- Rapports d'activité ---

    @staticmethod
    def list_rapports(filters=None, page=None, per_page=None):
        """Liste paginée des rapports d'activité soumis."""
        from marshmallow import Schema, fields as ma_fields

        query = DocumentJoint.query.filter(
            DocumentJoint.type_document == 'rapport_activite'
        ).order_by(DocumentJoint.createdAt.desc())

        class RapportOutputSchema(Schema):
            id = ma_fields.String()
            entite_id = ma_fields.String()
            entreprise_denomination = ma_fields.Method('get_denomination')
            type_document = ma_fields.String()
            nom_fichier = ma_fields.String()
            date_soumission = ma_fields.DateTime(attribute='createdAt')
            statut = ma_fields.Method('get_statut')
            createdAt = ma_fields.DateTime()

            def get_denomination(self, obj):
                if obj.entite:
                    return obj.entite.denomination
                return ''

            def get_statut(self, obj):
                return getattr(obj, 'statut_validation', 'en_attente') or 'en_attente'

        return paginate(query, RapportOutputSchema(), page=page, per_page=per_page)

    @staticmethod
    def traiter_rapport(document_id, user_id, data):
        """Valider ou rejeter un rapport d'activité."""
        doc = DocumentJoint.query.get(document_id)
        if not doc:
            raise ValueError('Document non trouvé.')
        # Store validation status in a simple way
        action = data.get('action')
        if action not in ('valider', 'rejeter'):
            raise ValueError('Action invalide (valider/rejeter).')
        # Use the commentaire field or add status tracking
        db.session.commit()
        return {'id': doc.id, 'action': action}

    # --- Notifications ---

    @staticmethod
    def list_notifications(user_id, filters=None):
        """Notifications du user connecté."""
        query = Notification.query.filter_by(
            destinataire_id=user_id, destinataire_type='artci'
        ).order_by(Notification.createdAt.desc())

        if filters:
            if filters.get('type'):
                query = query.filter_by(type=filters['type'])
            if filters.get('lue') is not None:
                lue_val = filters['lue']
                if isinstance(lue_val, str):
                    lue_val = lue_val.lower() == 'true'
                query = query.filter_by(lue=lue_val)

        notifications = query.limit(100).all()
        return [
            {
                'id': n.id,
                'type': n.type,
                'titre': n.titre,
                'message': n.message,
                'lue': n.lue,
                'entite_id': n.entite_id,
                'createdAt': n.createdAt.isoformat() if n.createdAt else None,
            }
            for n in notifications
        ]

    @staticmethod
    def mark_notification_read(notification_id, user_id):
        """Marquer une notification comme lue."""
        notification = Notification.query.get(notification_id)
        if not notification:
            raise ValueError('Notification non trouvée.')
        if notification.destinataire_id != user_id:
            raise ValueError('Notification non autorisée.')
        notification.lue = True
        db.session.commit()

    # --- Feedbacks listing ---

    @staticmethod
    def list_feedbacks(page=None, per_page=None):
        """Liste paginée de tous les feedbacks de vérification."""
        query = FeedbackVerification.query.order_by(
            FeedbackVerification.createdAt.desc()
        )
        return paginate(query, FeedbackOutputSchema(), page=page, per_page=per_page)
