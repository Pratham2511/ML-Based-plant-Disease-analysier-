from fastapi import HTTPException, UploadFile, status
from pathlib import Path
import re

ALLOWED_MIME = {"image/jpeg", "image/png"}
MAX_BYTES = 5 * 1024 * 1024
BATCH_CODE_REGEX = re.compile(r"^[A-Za-z0-9_-]{6,64}$")


def sanitize_filename(filename: str) -> str:
    safe = Path(filename).name.strip().replace(" ", "_")
    return safe or "upload.jpg"


def validate_batch_code(batch_code: str) -> str:
    clean = (batch_code or "").strip()
    if not BATCH_CODE_REGEX.match(clean):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid batch code format")
    return clean


def enforce_image_constraints(file: UploadFile) -> None:
    if file.content_type not in ALLOWED_MIME:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unsupported image type")

    size = getattr(file, "size", None)
    if size is None:
        # Optional fallback for runtimes where UploadFile.size is unavailable.
        position = file.file.tell()
        file.file.seek(0, 2)
        size = file.file.tell()
        file.file.seek(position)

    if size and size > MAX_BYTES:
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="Image too large")
