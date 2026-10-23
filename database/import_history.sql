-- ============================================================================
-- TABLE: IMPORT_HISTORY
-- ============================================================================
-- Tracks batch college data imports for audit and administration
-- Demonstrates: AUDIT LOGGING, METRICS TRACKING, JSON METADATA
-- ============================================================================

USE course_registration_system;

CREATE TABLE IF NOT EXISTS IMPORT_HISTORY (
    import_id INT AUTO_INCREMENT,
    filename VARCHAR(255) NOT NULL,
    import_type VARCHAR(50) NOT NULL,
    imported_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    total_rows INT NOT NULL DEFAULT 0,
    successful_rows INT NOT NULL DEFAULT 0,
    skipped_rows INT NOT NULL DEFAULT 0,
    failed_rows INT NOT NULL DEFAULT 0,
    status VARCHAR(50) NOT NULL,
    details JSON,

    -- Primary Key
    PRIMARY KEY (import_id),

    -- Indexes for searching and reporting
    INDEX idx_import_history_date (imported_at),
    INDEX idx_import_history_type (import_type)

) ENGINE=InnoDB COMMENT='Audit log for batch data imports';
