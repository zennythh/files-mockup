-- Development database reset
-- Deletes seeded data and resets auto-increment sequences.
-- Does NOT modify table structure.

TRUNCATE TABLE
    "Role",
    "Permission",
    "RolePermission",
    "User",
    "Scanner",
    "DocumentType",
    "Category",
    "Tag",
    "ScanSession",
    "Document",
    "DocumentPage",
    "OCRResult",
    "DocumentAccess",
    "DocumentCategory",
    "DocumentTag",
    "QRCode"
RESTART IDENTITY
CASCADE;
