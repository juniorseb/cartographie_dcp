"""
Endpoints pour la distribution d'URLs pre-signees Cloudflare R2.

Le flux d'upload :
1. Frontend appelle POST /api/uploads/presigned-url avec
   { folder, filename, content_type } -> recoit { url, key }
2. Frontend fait un PUT direct vers `url` avec le fichier en body
3. Frontend renvoie `key` au backend dans la requete metier qui suit
   (creation d'entite, inscription, etc.)
4. Backend stocke `key` en DB

Le backend ne recoit JAMAIS les bytes -> pas de cold-start timeout / pas
de saturation Gunicorn quel que soit le poids du fichier.
"""
from flask import Blueprint, request
from marshmallow import Schema, fields, validate, ValidationError

from app.utils.r2_storage import generate_upload_url
from app.utils.responses import success_response, error_response, validation_error_response


uploads_bp = Blueprint('uploads', __name__)


# Dossiers logiques autorises (premiere partie de la cle R2).
# Tout autre prefixe est refuse pour eviter qu'un client malicieux ne pollue
# le bucket avec des chemins arbitraires.
_FOLDERS_AUTORISES = {
    'inscriptions',     # documents deposes a l'inscription (RCCM, DFE)
    'autorisations',    # autorisations ARTCI delivrees
    'documents',        # documents joints aux entites (audits, etc.)
    'avatars',          # photos de profil
}

# Taille max envisagee cote backend (R2 lui-meme accepte jusqu'a 5 To par
# object, mais on borne pour eviter les abus via une cle valide).
_MAX_SIZE_BYTES = 20 * 1024 * 1024  # 20 Mo

# Content-types autorises (PDF uniquement pour les documents administratifs ;
# images pour les avatars).
_MIME_AUTORISES = {
    'application/pdf',
    'image/jpeg', 'image/png', 'image/webp',
}


class PresignRequestSchema(Schema):
    folder = fields.String(required=True, validate=validate.OneOf(list(_FOLDERS_AUTORISES)))
    filename = fields.String(required=True, validate=validate.Length(min=1, max=255))
    content_type = fields.String(required=True, validate=validate.OneOf(list(_MIME_AUTORISES)))
    size = fields.Integer(validate=validate.Range(min=1, max=_MAX_SIZE_BYTES), load_default=None)


@uploads_bp.route('/uploads/presigned-url', methods=['POST'])
def presigned_url():
    """Distribue une URL PUT pre-signee R2.

    Endpoint ouvert (pas de JWT) : il est utilise par le formulaire
    d'inscription, donc disponible avant authentification. La securite vient
    du fait que l'URL retournee :
    - expire en 10 minutes
    - cible une cle UUID aleatoire (pas devinable par un tiers)
    - exige le content-type indique au moment de l'appel (le client devra
      le repasser dans son PUT)
    Donc meme si quelqu'un appelle cet endpoint en masse, il n'obtient
    qu'une URL temporaire vers un objet a lui — il ne peut pas ecraser ni
    lire d'autres documents.
    """
    schema = PresignRequestSchema()
    try:
        data = schema.load(request.get_json() or {})
    except ValidationError as err:
        return validation_error_response(err.messages)

    try:
        presigned = generate_upload_url(
            folder=data['folder'],
            filename=data['filename'],
            content_type=data['content_type'],
        )
    except RuntimeError as e:
        return error_response(str(e), 500)

    return success_response(presigned)
