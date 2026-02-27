"""
Base mixins pour ARTCI DCP Platform.
UUIDMixin et TimestampMixin réutilisés par tous les modèles.
"""
import uuid
from app.extensions import db


class UUIDMixin:
    """Fournit une clé primaire UUID."""
    id = db.Column(
        db.String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4())
    )


class TimestampMixin:
    """Fournit createdAt et updatedAt avec valeurs serveur par défaut."""
    createdAt = db.Column(
        db.DateTime(timezone=True),
        nullable=False,
        server_default=db.func.now()
    )
    updatedAt = db.Column(
        db.DateTime(timezone=True),
        nullable=False,
        server_default=db.func.now(),
        onupdate=db.func.now()
    )
