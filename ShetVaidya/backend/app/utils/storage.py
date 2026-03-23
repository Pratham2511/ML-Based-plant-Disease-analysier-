import uuid
from typing import Optional

import boto3
from botocore.client import Config

from app.core.config import settings
from app.utils.validators import sanitize_filename


def _client() -> Optional[boto3.client]:
    if not settings.r2_account_id or not settings.r2_access_key or not settings.r2_secret_key:
        return None
    return boto3.client(
        "s3",
        endpoint_url=f"https://{settings.r2_account_id}.r2.cloudflarestorage.com",
        aws_access_key_id=settings.r2_access_key,
        aws_secret_access_key=settings.r2_secret_key,
        config=Config(signature_version="s3v4"),
        region_name="auto",
    )


def upload_to_r2(filename: str, data: bytes, content_type: str = "image/jpeg") -> str:
    client = _client()
    key = f"uploads/{uuid.uuid4()}-{sanitize_filename(filename)}"
    if client and settings.r2_bucket:
        client.put_object(Bucket=settings.r2_bucket, Key=key, Body=data, ContentType=content_type)
        base = settings.r2_public_base or ""
        return f"{base}/{key}" if base else key
    # Fallback for local testing
    return f"mock://{key}"
