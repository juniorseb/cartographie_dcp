"""
Modèle EntiteWorkflow - Suivi du workflow de traitement d'une entité.
Relation ONE-TO-ONE avec EntiteBase (PK = entite_id).
Deux FK vers User (createdBy, assignedTo).
"""
from app.extensions import db
from app.models.base import TimestampMixin
from app.models.enums import StatutWorkflowEnum


class EntiteWorkflow(TimestampMixin, db.Model):
    __tablename__ = 'entites_workflow'

    entite_id = db.Column(
        db.String(36), db.ForeignKey('entites_base.id'), primary_key=True
    )
    statut = db.Column(
        db.Enum(StatutWorkflowEnum, name='statut_workflow_enum'),
        nullable=False, default=StatutWorkflowEnum.brouillon, index=True
    )
    numero_autorisation_artci = db.Column(db.String(100))
    date_soumission = db.Column(db.DateTime(timezone=True))
    date_validation = db.Column(db.DateTime(timezone=True))
    date_publication = db.Column(db.DateTime(timezone=True))
    date_rejet = db.Column(db.DateTime(timezone=True))
    motif_rejet = db.Column(db.Text)
    createdBy = db.Column(db.String(36), db.ForeignKey('users.id'), index=True)
    assignedTo = db.Column(db.String(36), db.ForeignKey('users.id'), index=True)

    # Relationships
    entite = db.relationship('EntiteBase', back_populates='workflow')
    created_by_user = db.relationship(
        'User', foreign_keys=[createdBy], back_populates='workflows_created'
    )
    assigned_to_user = db.relationship(
        'User', foreign_keys=[assignedTo], back_populates='workflows_assigned'
    )

    def __repr__(self):
        return f'<EntiteWorkflow {self.entite_id} statut={self.statut.value}>'
