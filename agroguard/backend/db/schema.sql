-- Core tables
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY,
    full_name TEXT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_latitude_range CHECK (latitude IS NULL OR (latitude >= -90 AND latitude <= 90)),
    CONSTRAINT chk_longitude_range CHECK (longitude IS NULL OR (longitude >= -180 AND longitude <= 180))
);
ALTER TABLE users ADD COLUMN IF NOT EXISTS full_name TEXT;
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_email_lower ON users((LOWER(email)));

CREATE TABLE IF NOT EXISTS otp_verification (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    otp_hash TEXT NOT NULL,
    purpose TEXT NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_otp_user ON otp_verification(user_id);
CREATE INDEX IF NOT EXISTS idx_otp_user_purpose ON otp_verification(user_id, purpose);
CREATE INDEX IF NOT EXISTS idx_otp_expires_at ON otp_verification(expires_at);

CREATE TABLE IF NOT EXISTS diseases (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL,
    crop_type TEXT NOT NULL,
    description TEXT NOT NULL,
    cause TEXT NOT NULL,
    treatment TEXT NOT NULL,
    recommended_medicines JSONB NOT NULL DEFAULT '[]',
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS medicines (
    id UUID PRIMARY KEY,
    brand_name TEXT NOT NULL,
    company TEXT NOT NULL,
    active_ingredient TEXT NOT NULL,
    concentration TEXT NOT NULL,
    crop_type TEXT NOT NULL,
    disease_category TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_medicine_normalized UNIQUE (brand_name, company, active_ingredient, concentration, crop_type, disease_category)
);

CREATE TABLE IF NOT EXISTS medicine_batches (
    id UUID PRIMARY KEY,
    medicine_id UUID REFERENCES medicines(id) ON DELETE CASCADE,
    batch_code TEXT UNIQUE NOT NULL,
    batch_size INT NOT NULL DEFAULT 100,
    manufacture_date DATE NOT NULL,
    is_valid BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_batch_code ON medicine_batches(batch_code);
CREATE INDEX IF NOT EXISTS idx_batches_medicine_id ON medicine_batches(medicine_id);

CREATE TABLE IF NOT EXISTS scan_history (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    disease_name TEXT NOT NULL,
    confidence DOUBLE PRECISION NOT NULL,
    image_url TEXT NOT NULL,
    analysis_json TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_scan_user ON scan_history(user_id);
CREATE INDEX IF NOT EXISTS idx_scan_created_at ON scan_history(created_at DESC);

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

CREATE TABLE IF NOT EXISTS crop_recommendations (
    id UUID PRIMARY KEY,
    crop_name TEXT NOT NULL UNIQUE,
    soil_type TEXT NOT NULL,
    temperature_range TEXT NOT NULL,
    rainfall_requirement TEXT NOT NULL,
    water_requirement TEXT NOT NULL,
    growing_season TEXT NOT NULL,
    growth_duration TEXT NOT NULL,
    seed_rate TEXT NOT NULL,
    fertilizer_recommendation TEXT NOT NULL,
    disease_risk TEXT NOT NULL,
    market_demand TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_crop_recommendations_name ON crop_recommendations(crop_name);
