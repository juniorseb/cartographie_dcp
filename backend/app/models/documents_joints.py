"""
Modèle DocumentJoint - Documents uploadés par les entités.
CNI, registre commerce, statuts, attestation fiscale, etc.
"""
from app.extensions import db
from app.models.base import UUIDMixin
from app.models.enums import TypeDocumentEnum


class DocumentJoint(UUIDMixin, db.Model):
    __tablename__ = 'documents_joints'

    entite_id = db.Column(
        db.String(36), db.ForeignKey('entites_base.id'), nullable=False, index=True
    )
    type_document = db.Column(
        db.Enum(TypeDocumentEnum, name='type_document_enum'), nullable=False
    )
    nom_fichier = db.Column(db.String(255), nullable=False)
    chemin_fichier = db.Column(db.String(500), nullable=False)
    taille = db.Column(db.Integer)
    mime_type = db.Column(db.String(100))
    uploadedAt = db.Column(db.DateTime(timezone=True), nullable=False, server_default=db.func.now())

    # Relationship
    entite = db.relationship('EntiteBase', back_populates='documents')

    def __repr__(self):
        return f'<DocumentJoint {self.nom_fichier} ({self.type_document.value})>'
