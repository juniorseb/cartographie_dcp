"""
Modele FormulaireDCP - Stocke les reponses au QUESTIONNAIRE DE RECENSEMENT
ET D'EVALUATION DE LA CONFORMITE (Loi N°2013-450).

Le contenu est stocke en JSONB pour suivre exactement le formulaire officiel
(structure de questions, options multiples, etc.) sans figer le schema relationnel.
"""
from sqlalchemy.dialects.postgresql import JSONB
from app.extensions import db


class FormulaireDCP(db.Model):
    """Reponses au questionnaire officiel DCP. Une ligne par entite."""
    __tablename__ = 'formulaires_dcp'

    entite_id = db.Column(
        db.String(36), db.ForeignKey('entites_base.id'), primary_key=True,
    )
    # Toutes les reponses du questionnaire officiel
    # Structure : voir frontend src/types/formulaire-dcp.ts
    reponses = db.Column(JSONB, nullable=False, default=dict)
    createdAt = db.Column(db.DateTime(timezone=True), server_default=db.func.now(), nullable=False)
    updatedAt = db.Column(
        db.DateTime(timezone=True),
        server_default=db.func.now(), onupdate=db.func.now(), nullable=False,
    )

    entite = db.relationship('EntiteBase', backref=db.backref('formulaire_dcp', uselist=False))

    def __repr__(self):
        return f'<FormulaireDCP entite={self.entite_id}>'
