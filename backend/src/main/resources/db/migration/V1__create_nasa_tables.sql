-- Flyway migration V1: Create NASA multi-source data tables
--
-- Applied when the "postgres" profile is active.
-- The default file-backed profile does not use these tables.

CREATE TABLE IF NOT EXISTS environmental_records (
    id BIGSERIAL PRIMARY KEY,
    dataset_name VARCHAR(255) NOT NULL,
    year INTEGER NOT NULL,
    month INTEGER,
    region VARCHAR(255),
    value DOUBLE PRECISION,
    unit VARCHAR(50) NOT NULL,
    source_url VARCHAR(2048) NOT NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    original_variable VARCHAR(255),
    product_identifier VARCHAR(255),
    observation_timestamp TIMESTAMP WITHOUT TIME ZONE,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    quality_flag VARCHAR(100),
    import_batch_id VARCHAR(255)
);

CREATE INDEX IF NOT EXISTS idx_env_dataset_year ON environmental_records (dataset_name, year);
CREATE INDEX IF NOT EXISTS idx_env_dataset_year_month ON environmental_records (dataset_name, year, month);
CREATE INDEX IF NOT EXISTS idx_env_observation_ts ON environmental_records (observation_timestamp);
CREATE INDEX IF NOT EXISTS idx_env_lat_lon ON environmental_records (latitude, longitude);

CREATE TABLE IF NOT EXISTS nasa_dataset_metadata (
    id BIGSERIAL PRIMARY KEY,
    dataset_id VARCHAR(255) NOT NULL UNIQUE,
    dataset_name VARCHAR(255) NOT NULL,
    nasa_source VARCHAR(255) NOT NULL,
    official_documentation VARCHAR(2048),
    api_endpoint VARCHAR(2048),
    download_endpoint VARCHAR(2048),
    authentication VARCHAR(100),
    data_format VARCHAR(100),
    variables TEXT,
    units VARCHAR(100),
    temporal_coverage TEXT,
    spatial_coverage TEXT,
    integration_type VARCHAR(100),
    status VARCHAR(50) NOT NULL,
    notes TEXT
);

CREATE TABLE IF NOT EXISTS nasa_import_batches (
    id BIGSERIAL PRIMARY KEY,
    dataset_id VARCHAR(255) NOT NULL,
    import_batch_id VARCHAR(255) NOT NULL,
    started_at TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    completed_at TIMESTAMP WITHOUT TIME ZONE,
    import_status VARCHAR(50) NOT NULL,
    records_imported INTEGER,
    records_skipped INTEGER,
    source_url VARCHAR(2048),
    error_message TEXT
);

CREATE INDEX IF NOT EXISTS idx_import_batch_dataset ON nasa_import_batches (dataset_id);
CREATE INDEX IF NOT EXISTS idx_import_batch_status ON nasa_import_batches (import_status);
CREATE INDEX IF NOT EXISTS idx_import_batch_started ON nasa_import_batches (started_at);

CREATE TABLE IF NOT EXISTS nasa_raw_file_metadata (
    id BIGSERIAL PRIMARY KEY,
    dataset_id VARCHAR(255) NOT NULL,
    source_url VARCHAR(2048) NOT NULL,
    checksum VARCHAR(128),
    file_size_bytes BIGINT,
    download_timestamp TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    processing_status VARCHAR(50) NOT NULL,
    local_file_path VARCHAR(1024),
    notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_raw_file_dataset ON nasa_raw_file_metadata (dataset_id);
CREATE INDEX IF NOT EXISTS idx_raw_file_status ON nasa_raw_file_metadata (processing_status);
CREATE INDEX IF NOT EXISTS idx_raw_file_checksum ON nasa_raw_file_metadata (checksum);
