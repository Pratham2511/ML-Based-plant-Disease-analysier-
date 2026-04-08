CREATE TABLE IF NOT EXISTS medicines (
    id UUID PRIMARY KEY,
    brand_name TEXT NOT NULL,
    company TEXT NOT NULL,
    active_ingredient TEXT NOT NULL,
    concentration TEXT NOT NULL,
    crop_type TEXT NOT NULL,
    disease_category TEXT NOT NULL,
    purchase_url TEXT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_medicine_normalized UNIQUE (brand_name, company, active_ingredient, concentration, crop_type, disease_category)
);

ALTER TABLE medicines
ADD COLUMN IF NOT EXISTS purchase_url TEXT NULL;

CREATE TABLE IF NOT EXISTS medicine_batches (
    id UUID PRIMARY KEY,
    medicine_id UUID REFERENCES medicines(id) ON DELETE CASCADE,
    batch_code TEXT UNIQUE NOT NULL,
    batch_size INT NOT NULL DEFAULT 100,
    manufacture_date DATE NOT NULL,
    is_valid BOOLEAN NOT NULL DEFAULT TRUE,
    is_used BOOLEAN NOT NULL DEFAULT FALSE,
    used_at TIMESTAMPTZ NULL,
    used_by_district VARCHAR(100) NULL,
    scan_count INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_batch_code ON medicine_batches(batch_code);
CREATE INDEX IF NOT EXISTS idx_batches_medicine_id ON medicine_batches(medicine_id);

ALTER TABLE medicine_batches
ADD COLUMN IF NOT EXISTS is_used BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE medicine_batches
ADD COLUMN IF NOT EXISTS used_at TIMESTAMPTZ NULL;

ALTER TABLE medicine_batches
ADD COLUMN IF NOT EXISTS used_by_district VARCHAR(100) NULL;

ALTER TABLE medicine_batches
ADD COLUMN IF NOT EXISTS scan_count INT NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS bottle_codes (
    id UUID PRIMARY KEY,
    medicine_id UUID NOT NULL REFERENCES medicines(id) ON DELETE CASCADE,
    batch_id UUID NOT NULL REFERENCES medicine_batches(id) ON DELETE CASCADE,
    bottle_number INT NOT NULL,
    unique_code VARCHAR(50) UNIQUE NOT NULL,
    is_used BOOLEAN NOT NULL DEFAULT FALSE,
    used_at TIMESTAMPTZ NULL,
    used_by_user_id UUID NULL REFERENCES users(id),
    used_by_district VARCHAR(100) NULL,
    scan_count INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_bottle_codes_unique_code ON bottle_codes(unique_code);
CREATE INDEX IF NOT EXISTS idx_bottle_codes_batch_id ON bottle_codes(batch_id);
CREATE INDEX IF NOT EXISTS idx_bottle_codes_medicine_id ON bottle_codes(medicine_id);

CREATE TABLE IF NOT EXISTS scan_history (
    id UUID PRIMARY KEY,
    user_id TEXT NOT NULL,
    farm_id UUID NULL,
    disease_name TEXT NOT NULL,
    confidence DOUBLE PRECISION NOT NULL,
    image_url TEXT NOT NULL,
    analysis_json TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_scan_user ON scan_history(user_id);
CREATE INDEX IF NOT EXISTS idx_scan_created_at ON scan_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_scan_farm_id ON scan_history(farm_id);

CREATE TABLE IF NOT EXISTS farms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    name VARCHAR(100) NOT NULL,
    crop VARCHAR(100) NOT NULL,
    area_acres DECIMAL(8,2),
    district VARCHAR(100),
    soil_type VARCHAR(100),
    irrigation_type VARCHAR(100),
    is_active BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_farms_user_id ON farms(user_id);

CREATE TABLE IF NOT EXISTS soil_reports (
    id UUID PRIMARY KEY,
    state TEXT NOT NULL,
    district TEXT NOT NULL,
    soil_type TEXT NOT NULL,
    ph_level TEXT NOT NULL,
    nitrogen_level TEXT NOT NULL,
    phosphorus_level TEXT NOT NULL,
    potassium_level TEXT NOT NULL,
    organic_matter TEXT NOT NULL,
    moisture_retention TEXT NOT NULL,
    drainage_capacity TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_soil_reports_state_district UNIQUE (state, district)
);
CREATE INDEX IF NOT EXISTS idx_soil_reports_state ON soil_reports(state);
CREATE INDEX IF NOT EXISTS idx_soil_reports_district ON soil_reports(district);
