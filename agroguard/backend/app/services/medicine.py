import secrets
from datetime import date

from sqlalchemy.orm import Session

from app.models.medicine import Medicine, MedicineBatch


def generate_batch_code() -> str:
    # URL-safe 16-char code with enough entropy for batch-level authenticity checks.
    return secrets.token_urlsafe(12)[:16]


def create_batch(db: Session, medicine: Medicine, batch_size: int = 100, manufacture_date: date = date.today()) -> MedicineBatch:
    batch = MedicineBatch(
        medicine_id=medicine.id,
        batch_code=generate_batch_code(),
        batch_size=batch_size,
        manufacture_date=manufacture_date,
        is_valid=True,
    )
    db.add(batch)
    db.commit()
    db.refresh(batch)
    return batch


def verify_batch(db: Session, batch_code: str) -> MedicineBatch | None:
    clean = batch_code.strip()
    return (
        db.query(MedicineBatch)
        .filter(MedicineBatch.batch_code == clean, MedicineBatch.is_valid.is_(True))
        .first()
    )
