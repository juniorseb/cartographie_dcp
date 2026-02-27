"""
Modèle User - Personnel ARTCI avec RBAC.
"""
from app.extensions import db
from app.models.base import UUIDMixin, TimestampMixin
from app.models.enums import RoleEnum


class User(UUIDMixin, TimestampMixin, db.Model):
    __tablename__ = 'users'

    nom = db.Column(db.String(100), nullable=False)
    prenom = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(255), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.Enum(RoleEnum, name='role_enum'), nullable=False)
    telephone = db.Column(db.String(20))
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    last_login = db.Column(db.DateTime(timezone=True))

    # Relationships inverses
    workflows_created = db.relationship(
        'EntiteWorkflow', foreign_keys='EntiteWorkflow.createdBy',
        back_populates='created_by_user', lazy='dynamic'
    )
    workflows_assigned = db.relationship(
        'EntiteWorkflow', foreign_keys='EntiteWorkflow.assignedTo',
        back_populates='assigned_to_user', lazy='dynamic'
    )
    assignations_agent = db.relationship(
        'AssignationDemande', foreign_keys='AssignationDemande.agent_id',
        back_populates='agent', lazy='dynamic'
    )
    assignations_validees = db.relationship(
        'AssignationDemande', foreign_keys='AssignationDemande.valide_par',
        back_populates='validateur', lazy='dynamic'
    )
    feedbacks_agent = db.relationship(
        'FeedbackVerification', back_populates='agent', lazy='dynamic'
    )
    rapprochements_traites = db.relationship(
        'DemandeRapprochement', back_populates='traiteur', lazy='dynamic'
    )
    historiques_modifies = db.relationship(
        'HistoriqueStatut', back_populates='modifie_par_user', lazy='dynamic'
    )
    renouvellements_traites = db.relationship(
        'Renouvellement', back_populates='traiteur', lazy='dynamic'
    )

    def __repr__(self):
        return f'<User {self.prenom} {self.nom} ({self.role.value})>'
