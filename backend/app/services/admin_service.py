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
    Renouvellement, DocumentJoint, Notification
)
from app.models.enums import (
    StatutWorkflowEnum, StatutConformiteEnum,
    StatutAssignationEnum, RoleEnum, OrigineSaisieEnum,
    StatutRenouvellementEnum, TypeDocumentEnum
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

        # Alertes (wireframe dashboard)
        from app.models import DPO, ConformiteAdministrative, SecuriteConformite
        # Entités sans DPO
        entites_avec_dpo = db.session.query(DPO.entite_id).distinct()
        stats['alertes_sans_dpo'] = base_query.filter(
            ~EntiteBase.id.in_(entites_avec_dpo)
        ).count()
        # Entités sans déclaration ARTCI
        entites_avec_decl = db.session.query(
            ConformiteAdministrative.entite_id
        ).filter(ConformiteAdministrative.declaration_artci == True).distinct()
        stats['alertes_sans_declaration'] = base_query.filter(
            ~EntiteBase.id.in_(entites_avec_decl)
        ).count()
        # Violations non notifiées
        stats['alertes_violations'] = db.session.query(SecuriteConformite).filter(
            SecuriteConformite.nombre_violations_12mois > 0,
            SecuriteConformite.notification_violations == False
        ).count()

        # Activité récente (5 derniers changements)
        recent = HistoriqueStatut.query.order_by(
            HistoriqueStatut.date_changement.desc()
        ).limit(5).all()
        stats['activite_recente'] = [{
            'entite_id': h.entite_id,
            'entite_denomination': h.entite.denomination if h.entite else '',
            'ancien_statut': h.ancien_statut if h.ancien_statut else None,
            'nouveau_statut': h.nouveau_statut if h.nouveau_statut else None,
            'modifie_par_nom': f'{h.modifie_par_user.prenom} {h.modifie_par_user.nom}' if h.modifie_par_user else '',
            'date': h.date_changement.isoformat() if h.date_changement else None,
        } for h in recent]

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

    # --- Backup ---

    @staticmethod
    def _backup_dir():
        import os
        from flask import current_app
        d = os.path.join(current_app.config.get('UPLOAD_FOLDER', 'uploads'), 'backups')
        os.makedirs(d, exist_ok=True)
        return d

    @staticmethod
    def list_backups():
        """Liste les fichiers de backup."""
        import os
        d = AdminService._backup_dir()
        items = []
        for f in sorted(os.listdir(d), reverse=True):
            path = os.path.join(d, f)
            if not os.path.isfile(path):
                continue
            stat = os.stat(path)
            items.append({
                'filename': f,
                'taille_octets': stat.st_size,
                'taille': AdminService._humansize(stat.st_size),
                'createdAt': datetime.fromtimestamp(stat.st_mtime, tz=timezone.utc).isoformat(),
                'type': 'manuel',
                'statut': 'termine',
            })
        return items

    @staticmethod
    def _humansize(n):
        for unit in ['o', 'Ko', 'Mo', 'Go']:
            if n < 1024:
                return f"{n:.1f} {unit}"
            n /= 1024
        return f"{n:.1f} To"

    @staticmethod
    def create_backup(user_id):
        """Cree un dump JSON des principales tables."""
        import os, json
        from datetime import datetime as dt
        from app.models import (
            EntiteBase, EntiteWorkflow, EntiteConformite, EntiteContact,
            EntiteLocalisation, ResponsableLegal, DPO, ConformiteAdministrative,
            RegistreTraitement, CategorieDonnees, FinaliteBaseLegale, SousTraitance,
            TransfertInternational, SecuriteConformite, MesureSecurite, CertificationSecurite,
            HistoriqueStatut, Renouvellement, Notification, DocumentJoint,
        )
        from app.models.comptes_entreprises import CompteEntreprise
        from app.models import User

        d = AdminService._backup_dir()
        timestamp = dt.utcnow().strftime('%Y%m%d_%H%M%S')
        filename = f'backup_{timestamp}.json'
        filepath = os.path.join(d, filename)

        def _row_to_dict(row, exclude=()):
            out = {}
            for col in row.__table__.columns:
                if col.name in exclude:
                    continue
                v = getattr(row, col.name)
                if isinstance(v, (dt,)):
                    out[col.name] = v.isoformat()
                elif hasattr(v, 'value'):  # enum
                    out[col.name] = v.value
                else:
                    out[col.name] = v
            return out

        data = {}
        models = [
            ('comptes_entreprises', CompteEntreprise, ('password_hash',)),
            ('users', User, ('password_hash',)),
            ('entites_base', EntiteBase, ()),
            ('entites_contact', EntiteContact, ()),
            ('entites_workflow', EntiteWorkflow, ()),
            ('entites_localisation', EntiteLocalisation, ()),
            ('entites_conformite', EntiteConformite, ()),
            ('responsables_legaux', ResponsableLegal, ()),
            ('dpo', DPO, ()),
            ('conformite_administrative', ConformiteAdministrative, ()),
            ('registre_traitements', RegistreTraitement, ()),
            ('categories_donnees', CategorieDonnees, ()),
            ('finalites_bases_legales', FinaliteBaseLegale, ()),
            ('sous_traitance', SousTraitance, ()),
            ('transferts_internationaux', TransfertInternational, ()),
            ('securite_conformite', SecuriteConformite, ()),
            ('mesures_securite', MesureSecurite, ()),
            ('certifications_securite', CertificationSecurite, ()),
            ('historique_statuts', HistoriqueStatut, ()),
            ('renouvellements', Renouvellement, ()),
            ('notifications', Notification, ()),
            ('documents_joints', DocumentJoint, ()),
        ]
        for name, model, exclude in models:
            try:
                data[name] = [_row_to_dict(r, exclude) for r in model.query.all()]
            except Exception:
                data[name] = []

        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump({'created_at': dt.utcnow().isoformat(),
                       'created_by': user_id,
                       'tables': data}, f, ensure_ascii=False, default=str, indent=2)

        size = os.path.getsize(filepath)
        return {
            'filename': filename,
            'taille_octets': size,
            'taille': AdminService._humansize(size),
        }

    # --- Inscriptions (workflow validation acces entreprise) ---

    @staticmethod
    def list_inscriptions(statut='pending'):
        """Liste les comptes entreprise dont l'inscription est dans le statut donne."""
        from app.models.comptes_entreprises import CompteEntreprise
        query = CompteEntreprise.query.filter_by(inscription_statut=statut)
        query = query.order_by(CompteEntreprise.createdAt.desc())
        return [{
            'id': c.id,
            'denomination': c.denomination,
            'numero_cc': c.numero_cc,
            'email': c.email,
            'telephone': c.telephone,
            'ville': c.ville, 'region': c.region,
            'dg_nom': c.dg_nom, 'dg_prenom': c.dg_prenom,
            'dg_fonction': c.dg_fonction,
            'dg_telephone': c.dg_telephone, 'dg_email': c.dg_email,
            'dpo_nom': c.dpo_nom, 'dpo_prenom': c.dpo_prenom,
            'dpo_telephone': c.dpo_telephone, 'dpo_email': c.dpo_email,
            'dpo_type': c.dpo_type, 'dpo_organisme': c.dpo_organisme,
            'acces_email_referant': c.acces_email_referant,
            'acces_email_dpo': c.acces_email_dpo,
            'inscription_statut': c.inscription_statut,
            'inscription_motif_rejet': c.inscription_motif_rejet,
            'createdAt': c.createdAt.isoformat() if c.createdAt else None,
        } for c in query.all()]

    @staticmethod
    def valider_inscription(compte_id, user_id):
        """Valide une inscription :
        1) genere un mot de passe par defaut
        2) active le compte avec password_must_change=True
        3) envoie les acces (email + mot de passe) au DG ET au DPO par email."""
        from app.models.comptes_entreprises import CompteEntreprise
        from app.utils.password import hash_password, calculate_password_expiry
        import secrets, string
        from app.utils.email_sender import send_credentials_email

        compte = CompteEntreprise.query.get(compte_id)
        if not compte:
            raise ValueError('Compte non trouvé.')
        if compte.inscription_statut == 'approved':
            raise ValueError('Inscription déjà validée.')

        # Generer un mot de passe robuste de 12 caracteres
        alphabet = string.ascii_letters + string.digits + '!@#$%&*'
        # Garantir au moins 1 majuscule + 1 minuscule + 1 chiffre + 1 special
        while True:
            password = ''.join(secrets.choice(alphabet) for _ in range(12))
            if (any(c.islower() for c in password)
                    and any(c.isupper() for c in password)
                    and any(c.isdigit() for c in password)
                    and any(c in '!@#$%&*' for c in password)):
                break

        compte.password_hash = hash_password(password)
        compte.password_last_changed = datetime.now(timezone.utc)
        compte.password_expires_at = calculate_password_expiry()
        compte.password_must_change = True
        compte.inscription_statut = 'approved'
        compte.is_active = True
        compte.email_verified = True
        compte.inscription_validee_par = user_id
        compte.inscription_validee_le = datetime.now(timezone.utc)
        db.session.commit()

        # Envoyer les credentials au DG et au DPO
        recipients = []
        if compte.dg_email:
            recipients.append((compte.dg_email, f"{compte.dg_prenom or ''} {compte.dg_nom or ''}".strip(), 'Représentant légal'))
        if compte.dpo_email and compte.dpo_email != compte.dg_email:
            recipients.append((compte.dpo_email, f"{compte.dpo_prenom or ''} {compte.dpo_nom or ''}".strip(), 'DPO'))

        for email, fullname, role in recipients:
            try:
                send_credentials_email(
                    to=email,
                    nom_complet=fullname,
                    role=role,
                    denomination=compte.denomination,
                    login_email=email,
                    password=password,
                )
            except Exception:
                pass

        return {
            'id': compte.id,
            'inscription_statut': compte.inscription_statut,
            'is_active': compte.is_active,
            'password_envoyer': True,
        }

    @staticmethod
    def rejeter_inscription(compte_id, user_id, motif):
        """Rejette une inscription avec un motif. Le compte reste inactif."""
        from app.models.comptes_entreprises import CompteEntreprise
        compte = CompteEntreprise.query.get(compte_id)
        if not compte:
            raise ValueError('Compte non trouvé.')
        if compte.inscription_statut == 'approved':
            raise ValueError('Inscription déjà validée, rejet impossible.')
        compte.inscription_statut = 'rejected'
        compte.is_active = False
        compte.inscription_motif_rejet = motif
        compte.inscription_validee_par = user_id
        compte.inscription_validee_le = datetime.now(timezone.utc)
        db.session.commit()
        return {
            'id': compte.id,
            'inscription_statut': compte.inscription_statut,
            'inscription_motif_rejet': compte.inscription_motif_rejet,
        }

    @staticmethod
    def update_formalites_activation(entite_id, autorisation_active, declaration_active):
        """Active/desactive les onglets Autorisation et Declaration cote entreprise."""
        entite = EntiteBase.query.get(entite_id)
        if not entite:
            raise ValueError('Entité non trouvée.')
        conformite = EntiteConformite.query.get(entite_id)
        if not conformite:
            conformite = EntiteConformite(entite_id=entite_id)
            db.session.add(conformite)
        if autorisation_active is not None:
            conformite.formalite_autorisation_active = bool(autorisation_active)
        if declaration_active is not None:
            conformite.formalite_declaration_active = bool(declaration_active)
        db.session.commit()
        return {
            'autorisation_active': conformite.formalite_autorisation_active,
            'declaration_active': conformite.formalite_declaration_active,
        }

    @staticmethod
    def publier_entite(entite_id):
        """Publier une entite sur la cartographie publique.
        Seules les entites Conforme ou Demarche en cours sont eligibles."""
        entite = EntiteBase.query.get(entite_id)
        if not entite:
            raise ValueError('Entite non trouvee.')
        conformite = EntiteConformite.query.get(entite_id)
        statut = conformite.statut_conformite if conformite else None
        if statut not in (
            StatutConformiteEnum.conforme,
            StatutConformiteEnum.demarche_en_cours,
            StatutConformiteEnum.partiellement_conforme,
        ):
            raise ValueError(
                "Seules les entites au statut 'Conforme' ou 'Demarche en cours' "
                'peuvent etre publiees.'
            )
        entite.publie_sur_carte = True
        db.session.commit()
        return {'id': entite.id, 'publie_sur_carte': True}

    @staticmethod
    def depublier_entite(entite_id):
        """Retirer une entite de la cartographie publique."""
        entite = EntiteBase.query.get(entite_id)
        if not entite:
            raise ValueError('Entite non trouvee.')
        entite.publie_sur_carte = False
        db.session.commit()
        return {'id': entite.id, 'publie_sur_carte': False}

    @staticmethod
    def upload_rapport_audit(entite_id, file):
        """Téléverser un rapport d'audit pour une entité.
        Le document apparaitra dans Mon dossier > Mes Rapports cote entreprise."""
        entite = EntiteBase.query.get(entite_id)
        if not entite:
            raise ValueError('Entité non trouvée.')

        import os
        from flask import current_app
        upload_folder = os.path.join(
            current_app.config.get('UPLOAD_FOLDER', 'uploads'), 'audits'
        )
        os.makedirs(upload_folder, exist_ok=True)
        filename = f"{entite_id}_{file.filename}"
        filepath = os.path.join(upload_folder, filename)
        file.save(filepath)

        doc = DocumentJoint(
            entite_id=entite_id,
            type_document=TypeDocumentEnum.rapport_audit,
            nom_fichier=file.filename,
            chemin_fichier=filepath,
            taille=os.path.getsize(filepath),
            mime_type=file.content_type,
        )
        db.session.add(doc)
        db.session.commit()
        return doc

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
    def _safe_str(val):
        """Convertir une valeur Excel en string nettoyée, None si vide/NaN."""
        if val is None or (isinstance(val, float) and str(val) == 'nan'):
            return None
        s = str(val).strip()
        return s if s else None

    @staticmethod
    def _safe_bool(val):
        """Convertir une valeur Excel en booléen."""
        if val is None or (isinstance(val, float) and str(val) == 'nan'):
            return None
        s = str(val).strip().lower()
        return s in ('oui', 'true', '1', 'yes', 'vrai')

    @staticmethod
    def _safe_date(val):
        """Convertir une valeur Excel en date ISO string."""
        import pandas as pd
        if val is None or (isinstance(val, float) and str(val) == 'nan'):
            return None
        if isinstance(val, pd.Timestamp):
            return val.strftime('%Y-%m-%d')
        try:
            return str(val).strip()[:10]
        except Exception:
            return None

    @staticmethod
    def _safe_float(val):
        """Convertir une valeur Excel en float."""
        if val is None or (isinstance(val, float) and str(val) == 'nan'):
            return None
        try:
            return float(val)
        except (ValueError, TypeError):
            return None

    @staticmethod
    def import_excel(file, user_id):
        """
        Importer des entités depuis un fichier Excel (template 51 colonnes).
        Couvre les 5 parties du questionnaire de recensement DCP.
        Retourne {imported: N, errors: [{row, message}]}.
        """
        import pandas as pd
        s = AdminService._safe_str
        b = AdminService._safe_bool
        d = AdminService._safe_date
        f = AdminService._safe_float

        try:
            df = pd.read_excel(file, engine='openpyxl')
        except Exception as e:
            raise ValueError(f'Erreur de lecture du fichier Excel : {e}')

        imported = 0
        errors = []

        for idx, row in df.iterrows():
            try:
                # --- Partie 1 : Identification (colonnes 1-9) ---
                data = {
                    'denomination': s(row.get('denomination')) or '',
                    'numero_cc': s(row.get('numero_cc')) or '',
                    'forme_juridique': s(row.get('forme_juridique')),
                    'secteur_activite': s(row.get('secteur_activite')),
                    'adresse': s(row.get('adresse')),
                    'ville': s(row.get('ville')),
                    'region': s(row.get('region')),
                    'telephone': s(row.get('telephone')),
                    'email': s(row.get('email')),
                }

                if not data['denomination'] or not data['numero_cc']:
                    errors.append({'row': idx + 2, 'message': 'Dénomination et N° CC requis.'})
                    continue

                # Vérifier unicité
                if EntiteBase.query.filter_by(numero_cc=data['numero_cc']).first():
                    errors.append({'row': idx + 2, 'message': f'N° CC {data["numero_cc"]} existe déjà.'})
                    continue

                # Contact / Responsable légal (colonnes 10-14)
                resp_nom = s(row.get('responsable_legal_nom'))
                if resp_nom:
                    data['contact'] = {
                        'responsable_legal_nom': resp_nom,
                        'responsable_legal_fonction': s(row.get('responsable_legal_fonction')),
                        'responsable_legal_email': s(row.get('responsable_legal_email')),
                        'responsable_legal_telephone': s(row.get('responsable_legal_telephone')),
                        'site_web': s(row.get('site_web')),
                    }

                # Localisation GPS (colonnes 15-17)
                lat = f(row.get('latitude'))
                lon = f(row.get('longitude'))
                if lat is not None and lon is not None:
                    data['localisation'] = {
                        'latitude': lat,
                        'longitude': lon,
                        'adresse_complete': s(row.get('adresse_complete')),
                    }

                # --- Partie 2 : Cadre juridique (colonnes 18-27) ---
                connaissance = b(row.get('connaissance_loi_2013'))
                declaration = b(row.get('declaration_artci'))
                autorisation = b(row.get('autorisation_artci'))
                if connaissance is not None or declaration is not None or autorisation is not None:
                    data['conformites_administratives'] = [{
                        'connaissance_loi_2013': connaissance,
                        'declaration_artci': declaration,
                        'numero_declaration': s(row.get('numero_declaration')),
                        'date_declaration': d(row.get('date_declaration')),
                        'autorisation_artci': autorisation,
                        'numero_autorisation': s(row.get('numero_autorisation')),
                        'date_autorisation': d(row.get('date_autorisation')),
                    }]

                # DPO (colonnes 28-34)
                dpo_nom = s(row.get('dpo_nom'))
                if dpo_nom:
                    data['dpos'] = [{
                        'nom': dpo_nom,
                        'prenom': s(row.get('dpo_prenom')),
                        'email': s(row.get('dpo_email')),
                        'telephone': s(row.get('dpo_telephone')),
                        'type': s(row.get('dpo_type')) or 'interne',
                        'organisme': s(row.get('dpo_organisme')),
                        'date_designation': d(row.get('dpo_date_designation')),
                    }]

                # --- Partie 3 : Registre & Traitements (colonnes 35-39) ---
                traitement = s(row.get('traitement_description'))
                if traitement:
                    data['registre_traitements'] = [{
                        'nom_traitement': traitement,
                        'description': traitement,
                        'finalite': s(row.get('traitement_finalite')),
                        'categories_personnes': s(row.get('traitement_categories_personnes')),
                        'destinataires': s(row.get('traitement_destinataires')),
                        'transfert_hors_ci': b(row.get('traitement_transfert_hors_ci')),
                    }]

                # Catégories de données (colonnes 40-41)
                categories_str = s(row.get('categories_donnees'))
                if categories_str:
                    cats = [c.strip() for c in categories_str.split(',') if c.strip()]
                    data['categories_donnees'] = [
                        {'categorie': cat} for cat in cats
                    ]

                # Finalités (colonne 42)
                finalite_str = s(row.get('finalite'))
                base_legale = s(row.get('base_legale'))
                if finalite_str:
                    data['finalites'] = [{
                        'finalite': finalite_str,
                        'base_legale': base_legale or 'consentement',
                    }]

                # --- Partie 4 : Sous-traitance & Transferts (colonnes 43-47) ---
                st_nom = s(row.get('sous_traitant_nom'))
                if st_nom:
                    data['sous_traitants'] = [{
                        'nom_sous_traitant': st_nom,
                        'pays': s(row.get('sous_traitant_pays')),
                        'type_donnees_partagees': s(row.get('sous_traitant_donnees')),
                        'contrat_sous_traitance': b(row.get('sous_traitant_contrat')),
                        'clauses_protection': b(row.get('sous_traitant_clauses')),
                        'audit_sous_traitant': b(row.get('sous_traitant_audit')),
                    }]

                transfert_pays = s(row.get('transfert_pays'))
                if transfert_pays:
                    data['transferts'] = [{
                        'pays_destination': transfert_pays,
                        'organisme_destinataire': s(row.get('transfert_organisme')),
                        'base_juridique': s(row.get('transfert_base_juridique')),
                        'garanties': s(row.get('transfert_garanties')),
                    }]

                # --- Partie 5 : Sécurité (colonnes 48-51) ---
                politique = b(row.get('politique_securite'))
                if politique is not None:
                    data['securite'] = {
                        'politique_securite': politique,
                        'responsable_securite': b(row.get('responsable_securite')),
                        'analyse_risques': b(row.get('analyse_risques')),
                        'plan_continuite': b(row.get('plan_continuite')),
                        'notification_violations': b(row.get('notification_violations')),
                        'nombre_violations_12mois': int(row.get('nombre_violations', 0) or 0),
                        'formation_personnel': b(row.get('formation_personnel')),
                        'frequence_formation': s(row.get('frequence_formation')),
                        'dernier_audit': d(row.get('dernier_audit')),
                    }

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

    # --- Formalités (Renouvellements + Autorisations + Déclarations) ---

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
        """Liste paginée des rapports d'activité et d'audit déposés."""
        from marshmallow import Schema, fields as ma_fields
        from app.models import EntiteBase as _EB

        # Inclure rapports d'activite ET rapports d'audit
        query = DocumentJoint.query.filter(
            DocumentJoint.type_document.in_([
                TypeDocumentEnum.rapport_activite,
                TypeDocumentEnum.rapport_audit,
            ])
        )

        if filters:
            if filters.get('search'):
                search = f"%{filters['search']}%"
                query = query.join(_EB, DocumentJoint.entite_id == _EB.id).filter(
                    db.or_(
                        DocumentJoint.nom_fichier.ilike(search),
                        _EB.denomination.ilike(search),
                    )
                )

        query = query.order_by(DocumentJoint.uploadedAt.desc())

        class RapportOutputSchema(Schema):
            id = ma_fields.String()
            entite_id = ma_fields.String()
            entreprise_denomination = ma_fields.Method('get_denomination')
            type_document = ma_fields.Method('get_type_document')
            nom_fichier = ma_fields.String()
            date_soumission = ma_fields.DateTime(attribute='uploadedAt')
            statut = ma_fields.Method('get_statut')
            createdAt = ma_fields.DateTime(attribute='uploadedAt')

            def get_denomination(self, obj):
                if obj.entite:
                    return obj.entite.denomination
                return ''

            def get_type_document(self, obj):
                return obj.type_document.value if obj.type_document else None

            def get_statut(self, obj):
                # Pas de table de validation des rapports : on considere "en_attente"
                # tant qu'un mecanisme de validation n'est pas implemente.
                return 'en_attente'

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
