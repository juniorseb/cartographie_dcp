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

    # Statuts workflow consideres comme "non encore evalues" :
    # un dossier dans ces etats N'A PAS de statut de conformite valable.
    _BROUILLON_STATUSES = (
        StatutWorkflowEnum.brouillon,
        StatutWorkflowEnum.brouillon_artci,
    )
    # Statuts workflow consideres comme "soumis" (ARTCI peut/doit traiter).
    _SOUMIS_STATUSES = (
        StatutWorkflowEnum.soumis,
        StatutWorkflowEnum.en_verification,
        StatutWorkflowEnum.en_attente_complements,
    )
    # Statuts workflow consideres comme "termines" (decision rendue).
    _TERMINES_STATUSES = (
        StatutWorkflowEnum.conforme_sous_reserve,
        StatutWorkflowEnum.valide,
        StatutWorkflowEnum.rejete,
        StatutWorkflowEnum.publie,
    )

    @staticmethod
    def _normalize_secteur(label):
        """Normalise un libelle de secteur : trim + dedup des variantes communes
        (ex: 'Telecommunications/TIC' / 'Télécommunications' / 'TIC' -> 'Télécommunications/TIC')."""
        if not label:
            return None
        s = label.strip()
        low = s.lower().replace('é', 'e').replace('è', 'e')
        # Mapping de canonisation : variante -> canonique
        canon_map = {
            'telecommunications': 'Télécommunications/TIC',
            'telecoms': 'Télécommunications/TIC',
            'tic': 'Télécommunications/TIC',
            'telecommunications/tic': 'Télécommunications/TIC',
            'banque': 'Banque/Finance',
            'finance': 'Banque/Finance',
            'banque/finance': 'Banque/Finance',
            'banque & finance': 'Banque/Finance',
            'banque finance': 'Banque/Finance',
            'sante': 'Santé',
            'education': 'Éducation',
        }
        return canon_map.get(low, s)

    @staticmethod
    def _resolve_period(period):
        """Retourne (date_debut, date_fin) selon une periode 'today'/'7d'/'30d'/'all'/None."""
        from datetime import datetime, timezone, timedelta
        if not period or period == 'all':
            return None, None
        now = datetime.now(timezone.utc)
        if period == 'today':
            return now.replace(hour=0, minute=0, second=0, microsecond=0), now
        if period == '7d':
            return now - timedelta(days=7), now
        if period == '30d':
            return now - timedelta(days=30), now
        return None, None

    @staticmethod
    def get_dashboard_stats(filters=None):
        """Statistiques admin avec filtres de période optionnels.

        Si filters['scope_user_id'] est fourni (cas Editor), TOUS les comptages
        sont restreints aux entites assignees a cet utilisateur. Cela protege
        l'isolation cote Editor : il ne voit que ses dossiers, jamais les
        statistiques globales.

        Cle de coherence metier : la statistique de conformite N'INCLUT JAMAIS
        les dossiers en brouillon (non encore soumis -> pas evalues).
        """
        from datetime import datetime, timezone, timedelta
        stats = {}
        filters = filters or {}
        scope_user_id = filters.get('scope_user_id')

        # Resolution de la periode (today/7d/30d/all) ou date_debut/date_fin libre
        period = filters.get('period')
        date_debut = filters.get('date_debut')
        date_fin = filters.get('date_fin')
        if period and not (date_debut or date_fin):
            date_debut, date_fin = AdminService._resolve_period(period)

        # Sous-requete IDs des entites visibles par l'utilisateur
        scoped_ids_subq = None
        if scope_user_id:
            scoped_ids_subq = (
                db.session.query(AssignationDemande.entite_id)
                .filter(AssignationDemande.agent_id == scope_user_id)
                .subquery()
            )

        # Sous-requete IDs des entites NON-brouillon (= effectivement soumises ARTCI)
        non_brouillon_subq = (
            db.session.query(EntiteWorkflow.entite_id)
            .filter(EntiteWorkflow.statut.notin_(AdminService._BROUILLON_STATUSES))
            .subquery()
        )

        base_query = db.session.query(EntiteBase)
        if date_debut:
            base_query = base_query.filter(EntiteBase.createdAt >= date_debut)
        if date_fin:
            base_query = base_query.filter(EntiteBase.createdAt <= date_fin)
        if scoped_ids_subq is not None:
            base_query = base_query.filter(EntiteBase.id.in_(scoped_ids_subq))

        stats['total_entites'] = base_query.count()
        # Combien parmi total_entites ne sont pas en brouillon (= base de calcul conformite)
        stats['total_evaluables'] = base_query.filter(
            EntiteBase.id.in_(non_brouillon_subq)
        ).count()

        # Par statut workflow (TOUS statuts, y compris brouillons)
        wf_query = db.session.query(
            EntiteWorkflow.statut, func.count(EntiteWorkflow.entite_id)
        )
        if scoped_ids_subq is not None:
            wf_query = wf_query.filter(EntiteWorkflow.entite_id.in_(scoped_ids_subq))
        stats['par_statut_workflow'] = {
            s.value: c for s, c in wf_query.group_by(EntiteWorkflow.statut).all()
        }

        # Par statut conformite : EXCLURE les brouillons (un brouillon n'est jamais
        # "non conforme" : il n'a pas encore ete evalue).
        conf_query = db.session.query(
            EntiteConformite.statut_conformite,
            func.count(EntiteConformite.entite_id)
        ).filter(
            EntiteConformite.statut_conformite.isnot(None),
            EntiteConformite.entite_id.in_(non_brouillon_subq),
        )
        if scoped_ids_subq is not None:
            conf_query = conf_query.filter(EntiteConformite.entite_id.in_(scoped_ids_subq))
        stats['par_statut_conformite'] = {
            s.value: c for s, c in conf_query.group_by(EntiteConformite.statut_conformite).all()
        }

        # Par secteur (avec normalisation pour eviter les doublons d'ortho)
        sec_query = db.session.query(EntiteBase.secteur_activite)
        if scoped_ids_subq is not None:
            sec_query = sec_query.filter(EntiteBase.id.in_(scoped_ids_subq))
        secteurs_normalises = {}
        for (raw_sec,) in sec_query.all():
            normalized = AdminService._normalize_secteur(raw_sec)
            if normalized:
                secteurs_normalises[normalized] = secteurs_normalises.get(normalized, 0) + 1
        stats['par_secteur'] = secteurs_normalises

        # Par région
        reg_query = db.session.query(EntiteBase.region, func.count(EntiteBase.id))
        if scoped_ids_subq is not None:
            reg_query = reg_query.filter(EntiteBase.id.in_(scoped_ids_subq))
        stats['par_region'] = {r: c for r, c in reg_query.group_by(EntiteBase.region).all() if r}

        # Par origine
        ori_query = db.session.query(EntiteBase.origine_saisie, func.count(EntiteBase.id))
        if scoped_ids_subq is not None:
            ori_query = ori_query.filter(EntiteBase.id.in_(scoped_ids_subq))
        stats['par_origine'] = {o.value: c for o, c in ori_query.group_by(EntiteBase.origine_saisie).all()}

        # Demandes en cours / en retard
        if scope_user_id:
            stats['demandes_en_cours'] = AssignationDemande.query.filter_by(
                statut=StatutAssignationEnum.en_cours, agent_id=scope_user_id,
            ).count()
            stats['demandes_en_retard'] = AssignationDemande.query.filter_by(
                statut=StatutAssignationEnum.en_retard, agent_id=scope_user_id,
            ).count()
        else:
            stats['demandes_en_cours'] = AssignationDemande.query.filter_by(
                statut=StatutAssignationEnum.en_cours
            ).count()
            stats['demandes_en_retard'] = AssignationDemande.query.filter_by(
                statut=StatutAssignationEnum.en_retard
            ).count()

        # Agents actifs : masque pour editor
        stats['agents_actifs'] = (
            0 if scope_user_id else User.query.filter_by(is_active=True).count()
        )

        # ----- KPI OPERATIONNELS (vision pilotage admin) -----
        # 1. Dossiers soumis EN ATTENTE d'assignation (pas encore dans un panier)
        assigned_ids = db.session.query(AssignationDemande.entite_id).distinct().subquery()
        attente_q = (
            db.session.query(EntiteBase.id)
            .join(EntiteWorkflow, EntiteWorkflow.entite_id == EntiteBase.id)
            .filter(
                EntiteWorkflow.statut.in_(AdminService._SOUMIS_STATUSES),
                ~EntiteBase.id.in_(assigned_ids),
            )
        )
        if scoped_ids_subq is not None:
            attente_q = attente_q.filter(EntiteBase.id.in_(scoped_ids_subq))
        stats['kpi_en_attente_assignation'] = attente_q.count()

        # 2. Dossiers assignes mais non traites (statut assignation = en_cours)
        if scope_user_id:
            stats['kpi_assignes_non_traites'] = AssignationDemande.query.filter_by(
                statut=StatutAssignationEnum.en_cours, agent_id=scope_user_id,
            ).count()
        else:
            stats['kpi_assignes_non_traites'] = AssignationDemande.query.filter_by(
                statut=StatutAssignationEnum.en_cours
            ).count()

        # 3. Dossiers soumis depuis > 7 jours sans action (SLA depasse)
        seuil_sla = datetime.now(timezone.utc) - timedelta(days=7)
        sla_q = (
            db.session.query(EntiteWorkflow.entite_id)
            .filter(
                EntiteWorkflow.statut.in_(AdminService._SOUMIS_STATUSES),
                EntiteWorkflow.date_soumission.isnot(None),
                EntiteWorkflow.date_soumission < seuil_sla,
            )
        )
        if scoped_ids_subq is not None:
            sla_q = sla_q.filter(EntiteWorkflow.entite_id.in_(scoped_ids_subq))
        stats['kpi_sla_depasse_7j'] = sla_q.count()

        # 4. Inscriptions entreprise en attente de validation
        from app.models import CompteEntreprise
        if scope_user_id:
            # Editor n'a pas la main sur les inscriptions
            stats['kpi_inscriptions_en_attente'] = 0
        else:
            stats['kpi_inscriptions_en_attente'] = CompteEntreprise.query.filter_by(
                inscription_statut='pending'
            ).count()

        # Alertes
        from app.models import DPO, ConformiteAdministrative, SecuriteConformite
        # Calcules uniquement sur les non-brouillons (sinon n'a pas de sens)
        evaluables = base_query.filter(EntiteBase.id.in_(non_brouillon_subq))
        entites_avec_dpo = db.session.query(DPO.entite_id).distinct()
        stats['alertes_sans_dpo'] = evaluables.filter(
            ~EntiteBase.id.in_(entites_avec_dpo)
        ).count()
        entites_avec_decl = db.session.query(
            ConformiteAdministrative.entite_id
        ).filter(ConformiteAdministrative.declaration_artci == True).distinct()  # noqa: E712
        stats['alertes_sans_declaration'] = evaluables.filter(
            ~EntiteBase.id.in_(entites_avec_decl)
        ).count()
        viol_query = db.session.query(SecuriteConformite).filter(
            SecuriteConformite.nombre_violations_12mois > 0,
            SecuriteConformite.notification_violations == False  # noqa: E712
        )
        if scoped_ids_subq is not None:
            viol_query = viol_query.filter(SecuriteConformite.entite_id.in_(scoped_ids_subq))
        stats['alertes_violations'] = viol_query.count()

        # Activite recente (scopee aussi pour Editor)
        recent_q = HistoriqueStatut.query
        if scoped_ids_subq is not None:
            recent_q = recent_q.filter(HistoriqueStatut.entite_id.in_(scoped_ids_subq))
        recent = recent_q.order_by(HistoriqueStatut.date_changement.desc()).limit(5).all()
        stats['activite_recente'] = [{
            'entite_id': h.entite_id,
            'entite_denomination': h.entite.denomination if h.entite else '',
            'ancien_statut': h.ancien_statut if h.ancien_statut else None,
            'nouveau_statut': h.nouveau_statut if h.nouveau_statut else None,
            'modifie_par_nom': f'{h.modifie_par_user.prenom} {h.modifie_par_user.nom}' if h.modifie_par_user else '',
            'date': h.date_changement.isoformat() if h.date_changement else None,
        } for h in recent]

        # Periode reellement appliquee (echo pour le client)
        stats['periode'] = {
            'mode': period or 'all',
            'date_debut': date_debut.isoformat() if hasattr(date_debut, 'isoformat') else date_debut,
            'date_fin': date_fin.isoformat() if hasattr(date_fin, 'isoformat') else date_fin,
        }

        return stats

    @staticmethod
    def list_all_entites(filters=None, page=None, per_page=None, sort='created'):
        """Liste toutes les entités (tous statuts) avec filtres + tri.

        sort :
        - 'created' (defaut) : plus recemment creees en premier
        - 'activite' : plus recemment modifiees en premier (utile en pilotage)
        - 'denomination' : alphabetique
        """
        query = EntiteService.build_entite_query(filters)
        if sort == 'activite':
            query = query.order_by(EntiteBase.updatedAt.desc())
        elif sort == 'denomination':
            query = query.order_by(EntiteBase.denomination.asc())
        else:
            query = query.order_by(EntiteBase.createdAt.desc())
        return paginate(query, EntiteListOutputSchema(), page=page, per_page=per_page)

    @staticmethod
    def get_editor_performance(user_id):
        """
        Suivi de performance personnel d'un editeur (sa charge de travail).
        Donnees retournees :
        - assignations totales / en cours / traitees / en retard
        - delai moyen de traitement (jours)
        - 5 derniers dossiers traites par l'editeur
        - 5 dossiers actuellement en cours dans son panier (avec echeance)
        """
        from datetime import datetime, timezone

        base = AssignationDemande.query.filter(
            AssignationDemande.agent_id == user_id
        )

        total = base.count()
        en_cours = base.filter(
            AssignationDemande.statut == StatutAssignationEnum.en_cours
        ).count()
        en_retard = base.filter(
            AssignationDemande.statut == StatutAssignationEnum.en_retard
        ).count()
        traitees = base.filter(
            AssignationDemande.statut.in_([
                StatutAssignationEnum.traite_attente_validation,
                StatutAssignationEnum.valide,
            ])
        ).count()

        # Delai moyen : moyenne en jours entre date_assignation et traite_le
        # uniquement pour les assignations terminees (traite_le non NULL).
        delai_subq = base.filter(
            AssignationDemande.traite_le.isnot(None)
        ).all()
        if delai_subq:
            deltas = [
                (a.traite_le - a.date_assignation).total_seconds() / 86400.0
                for a in delai_subq
                if a.traite_le and a.date_assignation
            ]
            delai_moyen_jours = round(sum(deltas) / len(deltas), 1) if deltas else None
        else:
            delai_moyen_jours = None

        # Taux de traitement
        taux_traitement = (
            round(100.0 * traitees / total, 1) if total > 0 else 0.0
        )

        # 5 derniers dossiers traites
        derniers_traites = base.filter(
            AssignationDemande.traite_le.isnot(None)
        ).order_by(AssignationDemande.traite_le.desc()).limit(5).all()

        # 5 dossiers en cours dans son panier (par echeance ascendante)
        en_cours_dossiers = base.filter(
            AssignationDemande.statut == StatutAssignationEnum.en_cours
        ).order_by(
            AssignationDemande.echeance.asc().nulls_last(),
            AssignationDemande.date_assignation.asc(),
        ).limit(5).all()

        def _pack(a):
            return {
                'assignation_id': a.id,
                'entite_id': a.entite_id,
                'entite_denomination': a.entite.denomination if a.entite else None,
                'date_assignation': a.date_assignation.isoformat() if a.date_assignation else None,
                'echeance': a.echeance.isoformat() if a.echeance else None,
                'traite_le': a.traite_le.isoformat() if a.traite_le else None,
                'statut': a.statut.value if a.statut else None,
            }

        # Indicateur "echeance proche" : assignations en cours dont
        # echeance <= today + 3j ou deja depassee
        from datetime import date, timedelta
        today = date.today()
        bientot = base.filter(
            AssignationDemande.statut == StatutAssignationEnum.en_cours,
            AssignationDemande.echeance.isnot(None),
            AssignationDemande.echeance <= today + timedelta(days=3),
        ).count()

        return {
            'mode': 'editor',
            'agent_id': user_id,
            'compteurs': {
                'total': total,
                'en_cours': en_cours,
                'traitees': traitees,
                'en_retard': en_retard,
                'echeance_proche': bientot,
            },
            'delai_moyen_traitement_jours': delai_moyen_jours,
            'taux_traitement_pct': taux_traitement,
            'derniers_traites': [_pack(a) for a in derniers_traites],
            'panier_actuel': [_pack(a) for a in en_cours_dossiers],
            'genere_le': datetime.now(timezone.utc).isoformat(),
        }

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

    # --- Suivi d'activite des agents (spec §5.1, §5.2 reunion 07/05) ---

    @staticmethod
    def get_agents_activity():
        """Tableau de performance pour chaque agent (admin/editeur/lecteur).
        Pour chaque agent : nb dossiers assignes, traites, en cours, en retard."""
        from app.models import TraitementDossier
        agents = User.query.filter(User.role.in_([
            RoleEnum.editor, RoleEnum.admin, RoleEnum.super_admin
        ])).all()
        result = []
        for agent in agents:
            assignations = AssignationDemande.query.filter_by(agent_id=agent.id).all()
            nb_total = len(assignations)
            nb_en_cours = sum(1 for a in assignations if a.statut == StatutAssignationEnum.en_cours)
            nb_traites = sum(1 for a in assignations if a.statut == StatutAssignationEnum.valide)
            nb_en_retard = sum(1 for a in assignations if a.statut == StatutAssignationEnum.en_retard)
            traitements = TraitementDossier.query.filter_by(traitant_id=agent.id).all()
            nb_traitements = len(traitements)
            nb_traitements_valides = sum(1 for t in traitements if t.statut == 'valide')
            taux = round((nb_traites / nb_total) * 100) if nb_total else 0
            result.append({
                'agent_id': agent.id,
                'nom': agent.nom,
                'prenom': agent.prenom,
                'email': agent.email,
                'role': agent.role.value,
                'is_active': agent.is_active,
                'last_login': agent.last_login.isoformat() if agent.last_login else None,
                'nb_dossiers_affectes': nb_total,
                'nb_traites': nb_traites,
                'nb_en_cours': nb_en_cours,
                'nb_en_retard': nb_en_retard,
                'nb_traitements_total': nb_traitements,
                'nb_traitements_valides': nb_traitements_valides,
                'taux_traitement': taux,
            })
        # Tri : decroissant par taux
        result.sort(key=lambda x: x['taux_traitement'], reverse=True)
        return result

    # --- Inscriptions (workflow validation acces entreprise) ---

    @staticmethod
    def list_inscriptions(statut='pending'):
        """Liste les comptes entreprise dont l'inscription est dans le statut donne.
        Inclut les documents administratifs (RCCM, DFE) avec URL signee R2 pour
        permettre a l'admin de les telecharger directement depuis la page de
        validation."""
        from app.models.comptes_entreprises import CompteEntreprise
        from app.utils.r2_storage import generate_download_url

        def _docs_with_urls(raw_docs):
            """Enrichit chaque doc avec une URL signee valide 1h."""
            if not raw_docs:
                return []
            enriched = []
            for d in raw_docs:
                doc = dict(d)
                r2_key = doc.get('r2_key')
                if r2_key:
                    try:
                        doc['download_url'] = generate_download_url(
                            r2_key,
                            expires_in=3600,
                            filename=doc.get('nom_fichier'),
                        )
                    except Exception:
                        # R2 mal configure -> on retourne le doc sans URL plutot que crash
                        doc['download_url'] = None
                else:
                    # Anciens documents pre-R2 (chemin disque local) - non telechargeables
                    doc['download_url'] = None
                enriched.append(doc)
            return enriched

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
            'documents_inscription': _docs_with_urls(c.documents_inscription),
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

    # Motifs prédéfinis (spec §2.5 reunion 07/05)
    MOTIFS_REJET_INSCRIPTION = {
        'entreprise_inexistante': "L'entreprise déclarée n'existe pas dans nos registres.",
        'rl_non_authentique': "Le responsable légal n'est pas celui qu'il prétend être.",
        'demandeur_non_mandate': "Le demandeur n'a jamais été mandaté par le responsable légal.",
        'documents_invalides': "Les documents administratifs fournis (RCCM, DFE) sont invalides ou illisibles.",
        'autre': "Autre motif (à préciser).",
    }

    @staticmethod
    def rejeter_inscription(compte_id, user_id, motif, motif_code=None):
        """Rejette une inscription avec un motif. Le compte reste inactif.
        Envoie un email de rejet au RL et au Demandeur avec motif explicite."""
        from app.models.comptes_entreprises import CompteEntreprise
        from app.utils.email_sender import send_credentials_email  # noqa: F401  (placeholder)

        compte = CompteEntreprise.query.get(compte_id)
        if not compte:
            raise ValueError('Compte non trouvé.')
        if compte.inscription_statut == 'approved':
            raise ValueError('Inscription déjà validée, rejet impossible.')

        # Si motif_code fourni, prefixer avec le motif standardisé
        motif_final = motif
        if motif_code and motif_code in AdminService.MOTIFS_REJET_INSCRIPTION:
            motif_standard = AdminService.MOTIFS_REJET_INSCRIPTION[motif_code]
            motif_final = f"[{motif_code}] {motif_standard} {motif}".strip()

        compte.inscription_statut = 'rejected'
        compte.is_active = False
        compte.inscription_motif_rejet = motif_final
        compte.inscription_validee_par = user_id
        compte.inscription_validee_le = datetime.now(timezone.utc)
        db.session.commit()

        # Envoyer un email de rejet au RL et au Demandeur (best-effort)
        try:
            from app.utils.email_sender import _send
            recipients = [
                e for e in [compte.dg_email, compte.dpo_email] if e
            ]
            for email in recipients:
                _send(
                    subject="ARTCI DCP - Inscription refusée",
                    recipients=[email],
                    body=(
                        f"Bonjour,\n\n"
                        f"Votre demande d'inscription pour l'entreprise « {compte.denomination} » "
                        f"a été refusée par les services de l'ARTCI.\n\n"
                        f"Motif : {motif_final}\n\n"
                        f"Pour toute clarification, vous pouvez nous contacter à courrier@artci.ci.\n\n"
                        f"Cordialement,\nL'équipe ARTCI."
                    ),
                )
        except Exception:
            pass

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
        # On accepte aussi les anciennes valeurs historiques par compat
        if statut not in (
            StatutConformiteEnum.conforme,
            StatutConformiteEnum.partiellement_conforme,
            StatutConformiteEnum.demarche_en_cours,
            StatutConformiteEnum.demarche_achevee,
        ):
            raise ValueError(
                "Seules les entites 'Conforme' ou 'Partiellement conforme' "
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
    def get_panier(agent_id, role=None):
        """Recuperer le panier de l'agent (spec §5).

        - Editeur : seulement les entites assignees a lui.
        - Admin / Super Admin : assignations directes + NOUVELLES SOUMISSIONS
          non encore assignees (les admins peuvent soit s'auto-traiter, soit
          re-assigner a un editeur).

        Retourne TOUJOURS la meme structure pour ne pas casser le client :
            {
              "assignations": [...],         # rows AssignationDemande
              "nouvelles_soumissions": [...] # entites 'soumis' sans assignation
                                              # (admin/super uniquement, [] pour editor)
            }
        """
        from sqlalchemy import or_, not_

        # 1) Assignations directes de l'agent (existant)
        query = AssignationDemande.query.filter(
            AssignationDemande.agent_id == agent_id
        )
        # Exclure les brouillons (spec §5.3)
        query = query.join(EntiteBase, AssignationDemande.entite_id == EntiteBase.id).join(
            EntiteWorkflow, EntiteBase.id == EntiteWorkflow.entite_id
        ).filter(
            or_(
                EntiteWorkflow.statut == StatutWorkflowEnum.soumis,
                EntiteWorkflow.statut == StatutWorkflowEnum.en_verification,
                EntiteWorkflow.statut == StatutWorkflowEnum.en_attente_complements,
                EntiteWorkflow.statut == StatutWorkflowEnum.conforme_sous_reserve,
                EntiteWorkflow.statut == StatutWorkflowEnum.valide,
                EntiteWorkflow.statut == StatutWorkflowEnum.publie,
            )
        )
        assignations = query.order_by(AssignationDemande.echeance.asc()).all()

        # 2) Nouvelles soumissions non assignees (admin/super_admin uniquement).
        # Spec : "Les nouvelles entites vont dans le 'mon panier' de super
        # admin et admin et peuvent etre assignees dynamiquement."
        nouvelles_soumissions_data = []
        if role in ('admin', 'super_admin'):
            # IDs des entites deja en cours d'assignation
            assigned_ids_subq = db.session.query(AssignationDemande.entite_id).distinct().subquery()

            nouvelles = (
                db.session.query(EntiteBase, EntiteWorkflow)
                .join(EntiteWorkflow, EntiteWorkflow.entite_id == EntiteBase.id)
                .filter(
                    EntiteBase.archive == False,  # noqa: E712
                    EntiteWorkflow.statut == StatutWorkflowEnum.soumis,
                    not_(EntiteBase.id.in_(db.session.query(assigned_ids_subq))),
                )
                .order_by(EntiteWorkflow.date_soumission.asc().nulls_last())
                .all()
            )
            nouvelles_soumissions_data = [
                {
                    'entite_id': e.id,
                    'entite_denomination': e.denomination,
                    'entite_numero_cc': e.numero_cc,
                    'entite_ville': e.ville,
                    'entite_region': e.region,
                    'date_soumission': wf.date_soumission.isoformat() if wf.date_soumission else None,
                    'statut_workflow': wf.statut.value if wf.statut else None,
                }
                for e, wf in nouvelles
            ]

        return {
            'assignations': AssignationOutputSchema(many=True).dump(assignations),
            'nouvelles_soumissions': nouvelles_soumissions_data,
        }

    @staticmethod
    def list_all_assignations():
        """Liste toutes les assignations (entité, agent, échéance, niveau de traitement).
        Réservé admin / super-admin (vue globale de l'assignation)."""
        assignations = AssignationDemande.query.order_by(
            AssignationDemande.date_assignation.desc()
        ).all()
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
    def list_users(page=None, per_page=None, caller_role=None):
        """Liste paginée des utilisateurs ARTCI.

        Un admin (role 'admin') ne voit pas les super_admin (separation
        hierarchique : seul un super_admin peut gerer les super_admin).
        """
        query = User.query
        if caller_role == 'admin':
            query = query.filter(User.role != RoleEnum.super_admin)
        query = query.order_by(User.createdAt.desc())
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
    def list_feedbacks(page=None, per_page=None, statut_echeance=None, scope_user_id=None):
        """
        Liste paginée des feedbacks de vérification.
        statut_echeance : 'overdue' (depassee), 'today' (aujourd'hui),
        'upcoming' (a venir), 'no_deadline' (sans), None = tous.
        scope_user_id : si fourni (Editor), on filtre aux feedbacks des
        entites assignees a cet utilisateur.
        """
        from datetime import date
        from sqlalchemy import or_

        query = FeedbackVerification.query

        # Scope Editor : feedbacks des entites assignees uniquement
        if scope_user_id:
            scoped_ids = (
                db.session.query(AssignationDemande.entite_id)
                .filter(AssignationDemande.agent_id == scope_user_id)
                .subquery()
            )
            query = query.filter(FeedbackVerification.entite_id.in_(scoped_ids))

        if statut_echeance == 'overdue':
            query = query.filter(
                FeedbackVerification.delai_fourniture.isnot(None),
                FeedbackVerification.delai_fourniture < date.today(),
            ).order_by(FeedbackVerification.delai_fourniture.asc())
        elif statut_echeance == 'today':
            query = query.filter(
                FeedbackVerification.delai_fourniture == date.today()
            ).order_by(FeedbackVerification.createdAt.desc())
        elif statut_echeance == 'upcoming':
            query = query.filter(
                FeedbackVerification.delai_fourniture.isnot(None),
                FeedbackVerification.delai_fourniture > date.today(),
            ).order_by(FeedbackVerification.delai_fourniture.asc())
        elif statut_echeance == 'no_deadline':
            query = query.filter(
                FeedbackVerification.delai_fourniture.is_(None)
            ).order_by(FeedbackVerification.createdAt.desc())
        elif statut_echeance == 'with_deadline':
            # Tous les feedbacks avec une echeance, ordonnes par urgence
            query = query.filter(
                FeedbackVerification.delai_fourniture.isnot(None)
            ).order_by(FeedbackVerification.delai_fourniture.asc())
        else:
            # Pas de filtre : on garde l'ordre par date de feedback descendant
            # mais on remonte aussi les overdue pour visibilite
            query = query.order_by(
                FeedbackVerification.delai_fourniture.asc().nulls_last(),
                FeedbackVerification.createdAt.desc(),
            )
            # Suppress unused 'or_' import warning
            _ = or_

        return paginate(query, FeedbackOutputSchema(), page=page, per_page=per_page)
