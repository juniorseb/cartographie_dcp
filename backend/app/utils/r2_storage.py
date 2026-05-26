"""
Helper pour le stockage des documents sur Cloudflare R2 (S3-compatible).

R2 est utilise pour deux types d'uploads :
1. Documents d'inscription (RCCM, DFE) deposes lors de la creation de compte
2. Documents joints aux entites (autorisations, audits, etc.)

Le backend ne recoit JAMAIS les bytes des fichiers : il distribue des URLs
PUT pre-signees au frontend, qui upload directement vers R2. Cela elimine
les timeouts cote serveur (cold start Render, ou Gunicorn timeout).
"""
import os
import uuid
from typing import Optional

import boto3
from botocore.client import Config
from flask import current_app


def _get_client():
    """Cree un client S3 configure pour Cloudflare R2.
    On lit la config depuis les vars d'env Flask a chaque appel pour eviter
    de capturer des valeurs erronees au boot (tests / change d'env)."""
    account_id = current_app.config.get('R2_ACCOUNT_ID')
    access_key = current_app.config.get('R2_ACCESS_KEY_ID')
    secret_key = current_app.config.get('R2_SECRET_ACCESS_KEY')
    if not (account_id and access_key and secret_key):
        raise RuntimeError(
            "R2 non configure : R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / "
            "R2_SECRET_ACCESS_KEY manquants dans la config."
        )
    return boto3.client(
        's3',
        endpoint_url=f'https://{account_id}.r2.cloudflarestorage.com',
        aws_access_key_id=access_key,
        aws_secret_access_key=secret_key,
        # Sig v4 requis par R2
        config=Config(signature_version='s3v4', s3={'addressing_style': 'path'}),
        region_name='auto',
    )


def get_bucket() -> str:
    bucket = current_app.config.get('R2_BUCKET_NAME')
    if not bucket:
        raise RuntimeError("R2_BUCKET_NAME manquant dans la config.")
    return bucket


def generate_upload_url(
    folder: str,
    filename: str,
    content_type: str,
    expires_in: int = 600,
) -> dict:
    """Genere une URL pre-signee pour un PUT direct vers R2.

    Args:
        folder: prefixe logique dans le bucket (ex: 'inscriptions/abc-123').
        filename: nom de fichier source (utilise pour l'extension).
        content_type: MIME type attendu (le client devra l'envoyer en header).
        expires_in: duree de validite de l'URL en secondes (default 10 min).

    Returns:
        { 'url': str, 'key': str, 'expires_in': int }
        - url    : URL PUT signee, valide pendant `expires_in`
        - key    : cle finale dans le bucket — a stocker en DB
    """
    # Extension safe (lowercased, sans dot duplique)
    ext = os.path.splitext(filename or '')[1].lower().lstrip('.') or 'bin'
    key = f"{folder.rstrip('/')}/{uuid.uuid4().hex}.{ext}"

    client = _get_client()
    url = client.generate_presigned_url(
        ClientMethod='put_object',
        Params={
            'Bucket': get_bucket(),
            'Key': key,
            'ContentType': content_type,
        },
        ExpiresIn=expires_in,
        HttpMethod='PUT',
    )
    return {'url': url, 'key': key, 'expires_in': expires_in}


def generate_download_url(key: str, expires_in: int = 300, filename: Optional[str] = None) -> str:
    """Genere une URL pre-signee GET pour telecharger un objet R2.
    `filename` (optionnel) force le nom de fichier au telechargement."""
    client = _get_client()
    params = {'Bucket': get_bucket(), 'Key': key}
    if filename:
        params['ResponseContentDisposition'] = f'attachment; filename="{filename}"'
    return client.generate_presigned_url(
        ClientMethod='get_object',
        Params=params,
        ExpiresIn=expires_in,
        HttpMethod='GET',
    )


def object_exists(key: str) -> bool:
    """Verifie qu'un objet existe bien dans le bucket (post-upload)."""
    client = _get_client()
    try:
        client.head_object(Bucket=get_bucket(), Key=key)
        return True
    except client.exceptions.ClientError:
        return False


def delete_object(key: str) -> None:
    """Supprime un objet R2 (best-effort, ne raise pas si absent)."""
    client = _get_client()
    try:
        client.delete_object(Bucket=get_bucket(), Key=key)
    except client.exceptions.ClientError:
        pass
