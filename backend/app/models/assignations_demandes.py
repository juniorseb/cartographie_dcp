"""
Modèle AssignationDemande - Assignation de demandes aux agents ARTCI.
Nouveau v2.2 : panier de demandes avec échéances et validation N+1.
"""
from app.extensions import db
from app.models.base import UUIDMixin
from app.models.enums import StatutAssignationEnum


class AssignationDemande(UUIDMixin, db.Model):
    __tablename__ = 'assignations_demandes'
    __table_args__ = (
        db.Index('ix_assign_agent_statut', 'agent_id', 'statut'),
    )

    entite_id = db.Column(
        db.String(36), db.ForeignKey('entites_base.id'), nullable=False
    )
    agent_id = db.Column(
        db.String(36), db.ForeignKey('users.id'), nullable=False, index=True
    )
    date_assignation = db.Column(
        db.DateTime(timezone=True), nullable=False, server_default=db.func.now()
    )
    echeance = db.Column(db.Date, index=True)
    statut = db.Column(
        db.Enum(StatutAssignationEnum, name='statut_assignation_enum'),
        nullable=False, default=StatutAssignationEnum.en_cours, index=True
    )
    traite_le = db.Column(db.DateTime(timezone=True))
    valide_par = db.Column(db.String(36), db.ForeignKey('users.id'))
    valide_le = db.Column(db.DateTime(timezone=True))

    # Relationships
    entite = db.relationship('EntiteBase', back_populates='assignations')
    agent = db.relationship(
        'User', foreign_keys=[agent_id], back_populates='assignations_agent'
    )
    validateur = db.relationship(
        'User', foreign_keys=[valide_par], back_populates='assignations_validees'
    )

    def __repr__(self):
        return f'<AssignationDemande {self.id} statut={self.statut.value}>'
