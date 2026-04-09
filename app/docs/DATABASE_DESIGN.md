# Long Health Phase 1 MVP — Database Design Document

**Project:** Long Health (AI-powered blood report analysis platform for India)  
**Phase:** 1 - MVP  
**Database:** PostgreSQL on AWS RDS (Mumbai ap-south-1)  
**Last Updated:** 2026-04-08  
**Owner:** Long Health Product Team

---

## Table of Contents

1. [Design Principles](#design-principles)
2. [ER Diagram](#er-diagram)
3. [Complete Table Definitions](#complete-table-definitions)
4. [Index Strategy](#index-strategy)
5. [Biomarker Reference Data](#biomarker-reference-data)
6. [Query Patterns](#query-patterns)
7. [Data Growth Estimation](#data-growth-estimation)
8. [Migration Strategy](#migration-strategy)
9. [Backup & Recovery](#backup--recovery)
10. [Transaction Guidelines](#transaction-guidelines)

---

## Design Principles

### General Principles

- **Normalization:** Third Normal Form (3NF) with documented denormalizations
- **Identifiers:** UUIDs for all public-facing IDs; sequential integers for internal IDs
- **Timestamps:** TIMESTAMPTZ for all temporal data (UTC, AWS RDS native)
- **Dynamic Data:** JSONB only for truly unstructured data (AI analysis raw outputs)
- **Foreign Keys:** Explicit ON DELETE behavior specified for all relationships
- **Soft Deletes:** Applied to users and reports for audit/recovery purposes
- **Enums:** PostgreSQL ENUM types for restricted status/category fields
- **Indexing:** Covering indexes and partial indexes for high-frequency queries

### Data Integrity

- NOT NULL constraints on critical fields
- CHECK constraints for valid value ranges (e.g., age, BMI)
- UNIQUE constraints on natural keys (email, phone) with partial indexes for soft-deleted rows
- Referential integrity via explicit foreign keys with cascade/restrict behavior

---

## ER Diagram

```mermaid
erDiagram
    USERS ||--o{ OTP_REQUESTS : initiates
    USERS ||--o{ SESSIONS : creates
    USERS ||--o{ REPORTS : uploads
    USERS ||--o{ FAMILY_MEMBERS : manages
    FAMILY_MEMBERS ||--o{ REPORTS : uploads
    REPORTS ||--o{ BIOMARKERS : contains
    REPORTS ||--o{ ORGAN_SYSTEM_SCORES : generates
    REPORTS ||--o{ HEALTH_CONCERNS : produces
    REPORTS ||--o{ RECOMMENDATIONS : produces
    BIOMARKERS ||--o{ BIOMARKER_REFERENCE_RANGES : references
    BIOMARKER_REFERENCE_RANGES ||--o{ ORGAN_SYSTEMS : belongs_to

    USERS {
        uuid id PK
        string phone UK
        string name
        date dob
        string gender
        decimal height_cm
        decimal weight_kg
        string language_preference
        string email UK "nullable"
        timestamp created_at
        timestamp updated_at
        timestamp deleted_at "nullable, soft delete"
    }

    OTP_REQUESTS {
        bigint id PK
        uuid user_id FK
        string phone
        string otp_hash
        int attempt_count
        timestamp expires_at
        timestamp created_at
    }

    SESSIONS {
        uuid id PK
        uuid user_id FK
        string refresh_token_hash
        string ip_address
        string user_agent
        timestamp expires_at
        timestamp created_at
        timestamp revoked_at "nullable"
    }

    REPORTS {
        uuid id PK
        uuid user_id FK "or family_member_id"
        uuid family_member_id FK "nullable"
        string lab_name
        date test_date
        string pdf_file_path
        string pdf_file_size
        string ocr_extraction_status
        jsonb ocr_raw_output "AI/OCR extraction"
        string ai_analysis_status
        jsonb ai_analysis_output "raw AI output"
        decimal overall_health_score
        timestamp processing_started_at
        timestamp processing_completed_at
        timestamp created_at
        timestamp updated_at
        timestamp deleted_at "nullable, soft delete"
    }

    BIOMARKERS {
        uuid id PK
        uuid report_id FK
        string marker_code "e.g., HB, TC, LDH"
        string marker_name
        string organ_system
        decimal value
        string unit
        string status "NORMAL, ABNORMAL, SUBOPTIMAL, WARNING, CRITICAL"
        decimal lab_range_min
        decimal lab_range_max
        decimal functional_range_min
        decimal functional_range_max
        string interpretation
        timestamp created_at
    }

    BIOMARKER_REFERENCE_RANGES {
        bigint id PK
        string marker_code UK
        string marker_name
        string organ_system
        int age_min
        int age_max
        string gender
        decimal lab_range_min
        decimal lab_range_max
        decimal functional_range_min
        decimal functional_range_max
        string unit
        string category
        timestamp created_at
        timestamp updated_at
    }

    ORGAN_SYSTEMS {
        int id PK
        string name UK "ENUM: liver, kidney, thyroid, metabolic, blood, heart, nutrients"
        string display_name
        timestamp created_at
    }

    ORGAN_SYSTEM_SCORES {
        uuid id PK
        uuid report_id FK
        string organ_system
        int score "0-100"
        string status "EXCELLENT, GOOD, FAIR, POOR, CRITICAL"
        int biomarkers_analyzed
        int abnormal_count
        timestamp calculated_at
    }

    HEALTH_CONCERNS {
        uuid id PK
        uuid report_id FK
        int priority "1-highest, 5-lowest"
        string category "biomarker_abnormality, organ_system_risk, lifestyle_risk"
        string title
        string description
        string recommended_action
        timestamp created_at
    }

    RECOMMENDATIONS {
        uuid id PK
        uuid report_id FK
        string category "diet, lifestyle, supplements, medical"
        string title
        string description
        string urgency "immediate, high, medium, low"
        jsonb details "flexible structure for different rec types"
        timestamp created_at
    }

    FAMILY_MEMBERS {
        uuid id PK
        uuid user_id FK
        string name
        date dob
        string gender
        string relationship
        string phone "nullable"
        timestamp created_at
        timestamp updated_at
        timestamp deleted_at "nullable, soft delete"
    }
```

---

## Complete Table Definitions

### Enum Types

```sql
-- Status enums for biomarker analysis
CREATE TYPE biomarker_status AS ENUM ('NORMAL', 'ABNORMAL', 'SUBOPTIMAL', 'WARNING', 'CRITICAL');
CREATE TYPE organ_system_status AS ENUM ('EXCELLENT', 'GOOD', 'FAIR', 'POOR', 'CRITICAL');
CREATE TYPE report_processing_status AS ENUM ('PENDING', 'OCR_IN_PROGRESS', 'OCR_COMPLETE', 'AI_ANALYSIS_IN_PROGRESS', 'ANALYSIS_COMPLETE', 'FAILED', 'RETRY_PENDING');
CREATE TYPE gender_type AS ENUM ('M', 'F', 'O', 'PREFER_NOT_TO_SAY');
CREATE TYPE organ_system_enum AS ENUM ('liver', 'kidney', 'thyroid', 'metabolic', 'blood', 'heart', 'nutrients');
CREATE TYPE recommendation_urgency AS ENUM ('immediate', 'high', 'medium', 'low');
CREATE TYPE recommendation_category AS ENUM ('diet', 'lifestyle', 'supplements', 'medical');
CREATE TYPE health_concern_category AS ENUM ('biomarker_abnormality', 'organ_system_risk', 'lifestyle_risk', 'preventive_care');

-- Languages supported
CREATE TYPE language_preference AS ENUM ('en', 'hi', 'ta', 'te', 'ka', 'ml', 'bn');
```

### Core Tables

```sql
-- ============================================================================
-- USERS
-- ============================================================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone VARCHAR(20) NOT NULL UNIQUE,
    email VARCHAR(255) UNIQUE,
    name VARCHAR(255) NOT NULL,
    dob DATE NOT NULL,
    gender gender_type NOT NULL,
    height_cm DECIMAL(5, 2),
    weight_kg DECIMAL(6, 2),
    language_preference language_preference DEFAULT 'en',
    
    -- Audit
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMPTZ,
    
    -- Constraints
    CHECK (height_cm IS NULL OR height_cm > 0),
    CHECK (weight_kg IS NULL OR weight_kg > 0),
    CHECK (dob < CURRENT_DATE),
    CONSTRAINT unique_phone_active UNIQUE (phone) WHERE deleted_at IS NULL,
    CONSTRAINT unique_email_active UNIQUE (email) WHERE email IS NOT NULL AND deleted_at IS NULL
);

CREATE INDEX idx_users_phone ON users(phone) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_email ON users(email) WHERE email IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX idx_users_created_at ON users(created_at DESC);

-- ============================================================================
-- OTP_REQUESTS (Rate-limited OTP management for phone auth)
-- ============================================================================
CREATE TABLE otp_requests (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    phone VARCHAR(20) NOT NULL,
    otp_hash VARCHAR(255) NOT NULL,
    attempt_count INT DEFAULT 0,
    max_attempts INT DEFAULT 5,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CHECK (attempt_count >= 0),
    CHECK (expires_at > created_at)
);

CREATE INDEX idx_otp_requests_phone_active ON otp_requests(phone) 
    WHERE expires_at > CURRENT_TIMESTAMP;
CREATE INDEX idx_otp_requests_user_id ON otp_requests(user_id);
CREATE INDEX idx_otp_requests_expires_at ON otp_requests(expires_at);

-- ============================================================================
-- SESSIONS (JWT refresh token management)
-- ============================================================================
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    refresh_token_hash VARCHAR(255) NOT NULL UNIQUE,
    ip_address INET,
    user_agent TEXT,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    revoked_at TIMESTAMPTZ,
    
    -- Constraints
    CHECK (expires_at > created_at)
);

CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_refresh_token_hash ON sessions(refresh_token_hash);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at DESC);
CREATE INDEX idx_sessions_active ON sessions(user_id) WHERE revoked_at IS NULL;

-- ============================================================================
-- REPORTS (Blood test PDFs and processing state)
-- ============================================================================
CREATE TABLE reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    family_member_id UUID REFERENCES family_members(id) ON DELETE SET NULL,
    
    -- Lab metadata
    lab_name VARCHAR(255),
    test_date DATE NOT NULL,
    pdf_file_path VARCHAR(1024) NOT NULL,
    pdf_file_size BIGINT,
    
    -- OCR processing
    ocr_extraction_status report_processing_status DEFAULT 'PENDING',
    ocr_raw_output JSONB,
    
    -- AI analysis
    ai_analysis_status report_processing_status,
    ai_analysis_output JSONB,
    
    -- Overall health metrics
    overall_health_score DECIMAL(5, 2),
    
    -- Processing timestamps
    processing_started_at TIMESTAMPTZ,
    processing_completed_at TIMESTAMPTZ,
    
    -- Audit
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMPTZ,
    
    -- Constraints
    CHECK (overall_health_score IS NULL OR (overall_health_score >= 0 AND overall_health_score <= 100)),
    CHECK (processing_completed_at IS NULL OR processing_completed_at >= processing_started_at)
);

CREATE INDEX idx_reports_user_id ON reports(user_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_reports_family_member_id ON reports(family_member_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_reports_test_date ON reports(test_date DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_reports_created_at ON reports(created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_reports_processing_status ON reports(ocr_extraction_status, ai_analysis_status) 
    WHERE deleted_at IS NULL AND ai_analysis_status IN ('PENDING', 'AI_ANALYSIS_IN_PROGRESS');
CREATE INDEX idx_reports_by_user_and_date ON reports(user_id, test_date DESC) WHERE deleted_at IS NULL;

-- ============================================================================
-- ORGAN_SYSTEMS (Lookup table)
-- ============================================================================
CREATE TABLE organ_systems (
    id SMALLINT PRIMARY KEY,
    name organ_system_enum NOT NULL UNIQUE,
    display_name VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO organ_systems (id, name, display_name) VALUES
    (1, 'liver', 'Liver Function'),
    (2, 'kidney', 'Kidney Function'),
    (3, 'thyroid', 'Thyroid Health'),
    (4, 'metabolic', 'Metabolic Health'),
    (5, 'blood', 'Blood Health'),
    (6, 'heart', 'Cardiovascular Health'),
    (7, 'nutrients', 'Nutrient Status');

-- ============================================================================
-- BIOMARKER_REFERENCE_RANGES (Master reference data)
-- ============================================================================
CREATE TABLE biomarker_reference_ranges (
    id BIGSERIAL PRIMARY KEY,
    marker_code VARCHAR(50) NOT NULL,
    marker_name VARCHAR(255) NOT NULL,
    organ_system organ_system_enum NOT NULL,
    age_min INT NOT NULL DEFAULT 0,
    age_max INT NOT NULL DEFAULT 120,
    gender gender_type NOT NULL DEFAULT 'O',
    lab_range_min DECIMAL(12, 4),
    lab_range_max DECIMAL(12, 4),
    functional_range_min DECIMAL(12, 4),
    functional_range_max DECIMAL(12, 4),
    unit VARCHAR(50) NOT NULL,
    category VARCHAR(100) NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    UNIQUE (marker_code, age_min, age_max, gender),
    CHECK (age_max > age_min),
    CHECK (lab_range_min IS NULL OR lab_range_max IS NULL OR lab_range_min <= lab_range_max),
    CHECK (functional_range_min IS NULL OR functional_range_max IS NULL OR functional_range_min <= functional_range_max)
);

CREATE INDEX idx_biomarker_ranges_marker_code ON biomarker_reference_ranges(marker_code);
CREATE INDEX idx_biomarker_ranges_organ_system ON biomarker_reference_ranges(organ_system);
CREATE INDEX idx_biomarker_ranges_category ON biomarker_reference_ranges(category);

-- ============================================================================
-- BIOMARKERS (Extracted values per report)
-- ============================================================================
CREATE TABLE biomarkers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id UUID NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
    marker_code VARCHAR(50) NOT NULL,
    marker_name VARCHAR(255) NOT NULL,
    organ_system organ_system_enum NOT NULL,
    value DECIMAL(12, 4),
    unit VARCHAR(50),
    status biomarker_status,
    lab_range_min DECIMAL(12, 4),
    lab_range_max DECIMAL(12, 4),
    functional_range_min DECIMAL(12, 4),
    functional_range_max DECIMAL(12, 4),
    interpretation TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    UNIQUE (report_id, marker_code),
    CHECK (value IS NULL OR (lab_range_min IS NULL OR value >= lab_range_min * 0.5) 
        AND (lab_range_max IS NULL OR value <= lab_range_max * 2))
);

CREATE INDEX idx_biomarkers_report_id ON biomarkers(report_id);
CREATE INDEX idx_biomarkers_marker_code ON biomarkers(marker_code);
CREATE INDEX idx_biomarkers_organ_system ON biomarkers(organ_system);
CREATE INDEX idx_biomarkers_status ON biomarkers(status) WHERE status != 'NORMAL';
CREATE INDEX idx_biomarkers_report_organ ON biomarkers(report_id, organ_system);

-- ============================================================================
-- ORGAN_SYSTEM_SCORES (Computed health scores per system)
-- ============================================================================
CREATE TABLE organ_system_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id UUID NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
    organ_system organ_system_enum NOT NULL,
    score INT NOT NULL,
    status organ_system_status NOT NULL,
    biomarkers_analyzed INT NOT NULL,
    abnormal_count INT NOT NULL DEFAULT 0,
    calculated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    UNIQUE (report_id, organ_system),
    CHECK (score >= 0 AND score <= 100),
    CHECK (biomarkers_analyzed >= 0),
    CHECK (abnormal_count >= 0 AND abnormal_count <= biomarkers_analyzed)
);

CREATE INDEX idx_organ_scores_report_id ON organ_system_scores(report_id);
CREATE INDEX idx_organ_scores_organ_system ON organ_system_scores(organ_system);
CREATE INDEX idx_organ_scores_report_system ON organ_system_scores(report_id, organ_system);

-- ============================================================================
-- HEALTH_CONCERNS (AI-generated prioritized concerns)
-- ============================================================================
CREATE TABLE health_concerns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id UUID NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
    priority INT NOT NULL,
    category health_concern_category NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    recommended_action TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CHECK (priority >= 1 AND priority <= 5)
);

CREATE INDEX idx_health_concerns_report_id ON health_concerns(report_id);
CREATE INDEX idx_health_concerns_priority ON health_concerns(report_id, priority ASC);
CREATE INDEX idx_health_concerns_category ON health_concerns(category);

-- ============================================================================
-- RECOMMENDATIONS (AI-generated diet/lifestyle/supplements/medical)
-- ============================================================================
CREATE TABLE recommendations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id UUID NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
    category recommendation_category NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    urgency recommendation_urgency NOT NULL,
    details JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CHECK (details IS NULL OR details::text != 'null'::text)
);

CREATE INDEX idx_recommendations_report_id ON recommendations(report_id);
CREATE INDEX idx_recommendations_category ON recommendations(category);
CREATE INDEX idx_recommendations_urgency ON recommendations(urgency);

-- ============================================================================
-- FAMILY_MEMBERS (Optional linked profiles for household health tracking)
-- ============================================================================
CREATE TABLE family_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    dob DATE NOT NULL,
    gender gender_type NOT NULL,
    relationship VARCHAR(50) NOT NULL,
    phone VARCHAR(20),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMPTZ,
    
    -- Constraints
    CHECK (dob < CURRENT_DATE),
    CHECK (relationship IN ('spouse', 'parent', 'child', 'sibling', 'other'))
);

CREATE INDEX idx_family_members_user_id ON family_members(user_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_family_members_created_at ON family_members(created_at DESC);
```

### Foreign Key Constraint (deferred due to circular dependency)

```sql
-- Add FK from reports to family_members after family_members table exists
ALTER TABLE reports 
    ADD CONSTRAINT fk_reports_family_member_id 
    FOREIGN KEY (family_member_id) 
    REFERENCES family_members(id) 
    ON DELETE SET NULL;
```

---

## Index Strategy

### Index Philosophy

- **Clustered Access:** Primary keys are natural cluster keys (UUID/BIGSERIAL)
- **Partial Indexes:** Applied to soft-delete tables to exclude deleted rows
- **Covering Indexes:** Used for high-volume dashboard queries
- **Composite Indexes:** For multi-column WHERE/ORDER BY combinations

### Detailed Index Specifications

#### Users Table

| Index Name | Type | Columns | Purpose | Partial Condition |
|---|---|---|---|---|
| `idx_users_phone` | B-tree | `phone` | OTP login, user lookup | `deleted_at IS NULL` |
| `idx_users_email` | B-tree | `email` | Email-based lookup (future) | `email IS NOT NULL AND deleted_at IS NULL` |
| `idx_users_created_at` | B-tree | `created_at DESC` | User growth analytics | — |

#### Reports Table

| Index Name | Type | Columns | Purpose | Partial Condition |
|---|---|---|---|---|
| `idx_reports_user_id` | B-tree | `user_id` | Fetch user's reports | `deleted_at IS NULL` |
| `idx_reports_test_date` | B-tree | `test_date DESC` | Sort by test recency | `deleted_at IS NULL` |
| `idx_reports_created_at` | B-tree | `created_at DESC` | Dashboard latest report | `deleted_at IS NULL` |
| `idx_reports_processing_status` | B-tree | `ocr_extraction_status, ai_analysis_status` | Processing queue | `deleted_at IS NULL AND ai_analysis_status IN (...)` |
| `idx_reports_by_user_and_date` | B-tree | `user_id, test_date DESC` | User trend queries | `deleted_at IS NULL` |

#### Biomarkers Table

| Index Name | Type | Columns | Purpose | Partial Condition |
|---|---|---|---|---|
| `idx_biomarkers_report_id` | B-tree | `report_id` | Get markers per report | — |
| `idx_biomarkers_marker_code` | B-tree | `marker_code` | Reference data lookup | — |
| `idx_biomarkers_organ_system` | B-tree | `organ_system` | Filter by system | — |
| `idx_biomarkers_status` | B-tree | `status` | Find abnormalities | `status != 'NORMAL'` |
| `idx_biomarkers_report_organ` | B-tree | `report_id, organ_system` | Organ system scores calc | — |

#### Dashboard / High-Frequency Queries

```sql
-- Covering index for dashboard query (latest report + organ scores)
CREATE INDEX idx_reports_dashboard 
ON reports(user_id, created_at DESC) 
INCLUDE (id, overall_health_score)
WHERE deleted_at IS NULL;

-- Covering index for trend analysis
CREATE INDEX idx_biomarkers_trend 
ON biomarkers(report_id, organ_system, created_at) 
INCLUDE (value, status, marker_code);
```

---

## Biomarker Reference Data

### Biomarker Categories and Ranges

Reference data structure for ~60+ common Indian biomarkers across 7 organ systems. This seed data includes both lab reference ranges (reported by labs like Thyrocare, SRL) and functional/optimal ranges (based on preventive medicine literature).

#### Sample Seed Data (SQL)

```sql
-- Liver Function Markers
INSERT INTO biomarker_reference_ranges 
(marker_code, marker_name, organ_system, age_min, age_max, gender, 
 lab_range_min, lab_range_max, functional_range_min, functional_range_max, 
 unit, category, notes)
VALUES
('SGOT', 'Serum Glutamic-Oxaloacetic Transaminase (AST)', 'liver', 0, 120, 'O',
 10, 40, 10, 30, 'U/L', 'liver_enzyme', 'Indicator of liver cell damage'),
('SGPT', 'Serum Glutamic-Pyruvic Transaminase (ALT)', 'liver', 0, 120, 'O',
 10, 40, 10, 30, 'U/L', 'liver_enzyme', 'More specific for liver damage'),
('ALP', 'Alkaline Phosphatase', 'liver', 0, 120, 'O',
 30, 120, 30, 90, 'U/L', 'liver_enzyme', 'Indicates bile duct function'),
('BILI_T', 'Total Bilirubin', 'liver', 0, 120, 'O',
 0.1, 1.2, 0.1, 0.8, 'mg/dL', 'liver_function', 'Measures bile processing'),
('BILI_D', 'Direct Bilirubin', 'liver', 0, 120, 'O',
 0.0, 0.3, 0.0, 0.2, 'mg/dL', 'liver_function', 'Conjugated bilirubin'),
('ALB', 'Albumin', 'liver', 0, 120, 'O',
 3.5, 5.5, 3.8, 5.0, 'g/dL', 'liver_protein', 'Liver synthesis capacity'),
('GGT', 'Gamma Glutamyl Transferase', 'liver', 0, 120, 'O',
 0, 65, 0, 40, 'U/L', 'liver_enzyme', 'Bile duct enzyme'),
('TP', 'Total Protein', 'liver', 0, 120, 'O',
 6.0, 8.3, 6.5, 8.0, 'g/dL', 'liver_protein', 'Albumin + globulins'),

-- Kidney Function Markers
('CREAT', 'Creatinine', 'kidney', 0, 120, 'M',
 0.7, 1.3, 0.7, 1.0, 'mg/dL', 'kidney_function', 'Muscle breakdown product'),
('CREAT', 'Creatinine', 'kidney', 0, 120, 'F',
 0.6, 1.2, 0.6, 0.9, 'mg/dL', 'kidney_function', 'Muscle breakdown product'),
('BUN', 'Blood Urea Nitrogen', 'kidney', 0, 120, 'O',
 7, 20, 7, 18, 'mg/dL', 'kidney_function', 'Protein metabolism'),
('URIC', 'Uric Acid', 'kidney', 0, 120, 'M',
 3.5, 7.2, 3.5, 6.0, 'mg/dL', 'kidney_function', 'Purine metabolism'),
('URIC', 'Uric Acid', 'kidney', 0, 120, 'F',
 2.6, 6.0, 2.6, 5.0, 'mg/dL', 'kidney_function', 'Purine metabolism'),
('NA', 'Sodium', 'kidney', 0, 120, 'O',
 136, 145, 138, 142, 'mEq/L', 'kidney_electrolyte', 'Fluid balance'),
('K', 'Potassium', 'kidney', 0, 120, 'O',
 3.5, 5.0, 3.8, 4.5, 'mEq/L', 'kidney_electrolyte', 'Heart & muscle function'),
('CL', 'Chloride', 'kidney', 0, 120, 'O',
 98, 107, 100, 105, 'mEq/L', 'kidney_electrolyte', 'Acid-base balance'),

-- Thyroid Markers
('TSH', 'Thyroid Stimulating Hormone', 'thyroid', 0, 120, 'O',
 0.4, 4.0, 0.5, 2.5, 'mIU/L', 'thyroid_function', 'Pituitary control hormone'),
('T3', 'Triiodothyronine', 'thyroid', 0, 120, 'O',
 80, 200, 100, 180, 'ng/dL', 'thyroid_hormone', 'Active thyroid hormone'),
('T4', 'Thyroxine', 'thyroid', 0, 120, 'O',
 4.5, 12.0, 5.5, 10.0, 'μg/dL', 'thyroid_hormone', 'Primary thyroid hormone'),
('FT3', 'Free T3', 'thyroid', 0, 120, 'O',
 2.3, 4.2, 3.0, 4.0, 'pg/mL', 'thyroid_hormone', 'Free active hormone'),
('FT4', 'Free T4', 'thyroid', 0, 120, 'O',
 0.93, 1.7, 1.0, 1.5, 'ng/dL', 'thyroid_hormone', 'Free primary hormone'),

-- Metabolic Markers
('GLU', 'Glucose (Fasting)', 'metabolic', 0, 120, 'O',
 70, 100, 70, 90, 'mg/dL', 'glucose_metabolism', 'Fasting blood glucose'),
('GLU_PP', 'Glucose (Post-Prandial)', 'metabolic', 0, 120, 'O',
 < 140, NULL, < 120, NULL, 'mg/dL', 'glucose_metabolism', '2 hours after meal'),
('HBA1C', 'Hemoglobin A1C', 'metabolic', 0, 120, 'O',
 < 5.7, NULL, < 5.7, NULL, '%', 'glucose_metabolism', '3-month glucose average'),
('CHOL', 'Total Cholesterol', 'metabolic', 0, 120, 'O',
 NULL, 200, NULL, 180, 'mg/dL', 'lipid_metabolism', 'Total blood cholesterol'),
('LDL', 'LDL Cholesterol', 'metabolic', 0, 120, 'O',
 NULL, 130, NULL, 100, 'mg/dL', 'lipid_metabolism', 'Bad cholesterol'),
('HDL', 'HDL Cholesterol', 'metabolic', 0, 120, 'M',
 40, NULL, 50, NULL, 'mg/dL', 'lipid_metabolism', 'Good cholesterol'),
('HDL', 'HDL Cholesterol', 'metabolic', 0, 120, 'F',
 50, NULL, 60, NULL, 'mg/dL', 'lipid_metabolism', 'Good cholesterol'),
('TG', 'Triglycerides', 'metabolic', 0, 120, 'O',
 NULL, 150, NULL, 100, 'mg/dL', 'lipid_metabolism', 'Blood fat'),

-- Blood Markers
('HB', 'Hemoglobin', 'blood', 0, 120, 'M',
 13.5, 17.5, 14.0, 16.0, 'g/dL', 'blood_count', 'Oxygen carrying capacity'),
('HB', 'Hemoglobin', 'blood', 0, 120, 'F',
 12.0, 15.5, 12.5, 14.5, 'g/dL', 'blood_count', 'Oxygen carrying capacity'),
('TC', 'Total White Blood Cell Count', 'blood', 0, 120, 'O',
 4.5, 11.0, 4.5, 9.0, '10^3/μL', 'blood_count', 'Immune cell count'),
('PC', 'Platelet Count', 'blood', 0, 120, 'O',
 150, 400, 180, 350, '10^3/μL', 'blood_count', 'Clotting ability'),
('RBC', 'Red Blood Cell Count', 'blood', 0, 120, 'M',
 4.7, 6.1, 4.8, 5.8, '10^6/μL', 'blood_count', 'Oxygen carriers'),
('RBC', 'Red Blood Cell Count', 'blood', 0, 120, 'F',
 4.2, 5.4, 4.3, 5.2, '10^6/μL', 'blood_count', 'Oxygen carriers'),
('MCV', 'Mean Corpuscular Volume', 'blood', 0, 120, 'O',
 80, 100, 82, 95, 'fL', 'blood_cell_indices', 'RBC size'),

-- Cardiovascular Markers
('TMP', 'Troponin I', 'heart', 0, 120, 'O',
 < 0.04, NULL, < 0.04, NULL, 'ng/mL', 'heart_damage', 'Heart damage marker'),
('CK_MB', 'CK-MB (Creatine Kinase-MB)', 'heart', 0, 120, 'O',
 < 5, NULL, < 3, NULL, 'ng/mL', 'heart_damage', 'Heart muscle enzyme'),
('HS_CRP', 'High-Sensitivity C-Reactive Protein', 'heart', 0, 120, 'O',
 < 3.0, NULL, < 1.0, NULL, 'mg/L', 'inflammation', 'Cardiovascular inflammation'),

-- Nutrient Markers
('VIT_D', 'Vitamin D (25-OH)', 'nutrients', 0, 120, 'O',
 20, NULL, 30, 100, 'ng/mL', 'vitamin_status', 'Bone & immune health'),
('VIT_B12', 'Vitamin B12', 'nutrients', 0, 120, 'O',
 200, NULL, 400, NULL, 'pg/mL', 'vitamin_status', 'Neurological health'),
('FOLATE', 'Folate (Serum)', 'nutrients', 0, 120, 'O',
 5.4, NULL, 10, NULL, 'ng/mL', 'vitamin_status', 'DNA synthesis'),
('FE', 'Iron (Serum)', 'nutrients', 0, 120, 'M',
 60, 170, 70, 150, 'μg/dL', 'mineral_status', 'Oxygen transport'),
('FE', 'Iron (Serum)', 'nutrients', 0, 120, 'F',
 50, 170, 60, 140, 'μg/dL', 'mineral_status', 'Oxygen transport'),
('FERR', 'Ferritin', 'nutrients', 0, 120, 'M',
 24, 336, 50, 200, 'ng/mL', 'mineral_status', 'Iron stores'),
('FERR', 'Ferritin', 'nutrients', 0, 120, 'F',
 11, 307, 30, 150, 'ng/mL', 'mineral_status', 'Iron stores'),
('CA', 'Calcium', 'nutrients', 0, 120, 'O',
 8.5, 10.5, 9.0, 10.0, 'mg/dL', 'mineral_status', 'Bone health'),
('MG', 'Magnesium', 'nutrients', 0, 120, 'O',
 1.7, 2.2, 1.9, 2.1, 'mg/dL', 'mineral_status', 'Enzyme & nerve function'),
('PHOS', 'Phosphorus', 'nutrients', 0, 120, 'O',
 2.5, 4.5, 2.8, 4.0, 'mg/dL', 'mineral_status', 'Bone & energy metabolism');
```

#### Data Structure Notes

- **Marker Code:** Standardized code (HB, TC, SGPT, etc.) used across Indian labs
- **Age/Gender Adjustments:** Some markers vary by age and gender (e.g., hemoglobin, iron)
- **Dual Ranges:**
  - **Lab Range:** What the lab considers "normal" (conservative)
  - **Functional Range:** What functional medicine considers "optimal" (stricter)
- **Status Calculation:** Biomarker status determined by comparing value to functional range first, then lab range
- **Category:** Fine-grained grouping (liver_enzyme, kidney_electrolyte, etc.) for UI filtering

---

## Query Patterns

### High-Frequency Queries with Examples

#### Query 1: Dashboard — Latest Report + Organ Scores
**Purpose:** Homepage dashboard showing user's latest test results

```sql
SELECT 
    r.id,
    r.test_date,
    r.overall_health_score,
    r.lab_name,
    json_object_agg(
        oss.organ_system::text,
        json_build_object(
            'score', oss.score,
            'status', oss.status,
            'abnormal_count', oss.abnormal_count
        )
    ) as organ_scores
FROM reports r
LEFT JOIN organ_system_scores oss ON r.id = oss.report_id
WHERE r.user_id = $1 AND r.deleted_at IS NULL
ORDER BY r.created_at DESC
LIMIT 1;

-- Index used: idx_reports_dashboard (covering index)
-- Execution: ~1-2ms
```

#### Query 2: Biomarker Trends Across Reports
**Purpose:** Show user how a specific biomarker (e.g., HbA1C) has changed over time

```sql
SELECT 
    r.test_date,
    b.marker_code,
    b.marker_name,
    b.value,
    b.unit,
    b.status,
    b.functional_range_min,
    b.functional_range_max
FROM biomarkers b
JOIN reports r ON b.report_id = r.id
WHERE r.user_id = $1 
    AND r.deleted_at IS NULL
    AND b.marker_code = $2
ORDER BY r.test_date ASC;

-- Index used: idx_biomarkers_report_id + idx_reports_user_id
-- Execution: ~5-10ms
```

#### Query 3: Get All Biomarkers for a Report Grouped by Organ System
**Purpose:** Detailed report view with all markers organized by system

```sql
SELECT 
    b.organ_system,
    json_agg(
        json_build_object(
            'id', b.id,
            'marker_name', b.marker_name,
            'value', b.value,
            'unit', b.unit,
            'status', b.status,
            'interpretation', b.interpretation,
            'lab_range', json_build_object('min', b.lab_range_min, 'max', b.lab_range_max),
            'functional_range', json_build_object('min', b.functional_range_min, 'max', b.functional_range_max)
        ) ORDER BY b.marker_name
    ) as markers
FROM biomarkers b
WHERE b.report_id = $1
GROUP BY b.organ_system
ORDER BY b.organ_system;

-- Index used: idx_biomarkers_report_organ
-- Execution: ~2-3ms
```

#### Query 4: Get Prioritized Health Concerns
**Purpose:** Show top 3 health concerns flagged by AI analysis

```sql
SELECT 
    id,
    priority,
    category,
    title,
    description,
    recommended_action
FROM health_concerns
WHERE report_id = $1
ORDER BY priority ASC
LIMIT 3;

-- Index used: idx_health_concerns_priority
-- Execution: <1ms
```

#### Query 5: Get Abnormal Biomarkers Only
**Purpose:** Show user only the markers that are outside functional ranges

```sql
SELECT 
    b.id,
    b.marker_code,
    b.marker_name,
    b.organ_system,
    b.value,
    b.unit,
    b.status,
    b.functional_range_min,
    b.functional_range_max
FROM biomarkers b
WHERE b.report_id = $1 AND b.status != 'NORMAL'
ORDER BY b.organ_system, b.marker_name;

-- Index used: idx_biomarkers_status
-- Execution: <1ms
```

#### Query 6: Search Biomarkers by Category
**Purpose:** Filter dashboard by organ system (e.g., "Liver Function")

```sql
SELECT 
    b.id,
    b.marker_name,
    b.value,
    b.unit,
    b.status,
    os.display_name as organ_system_name
FROM biomarkers b
JOIN organ_systems os ON b.organ_system = os.name
WHERE b.report_id = $1 AND b.organ_system = $2::organ_system_enum
ORDER BY b.marker_name;

-- Index used: idx_biomarkers_report_organ
-- Execution: <1ms
```

#### Query 7: User Report History (Pagination)
**Purpose:** List all user's past reports with pagination

```sql
SELECT 
    id,
    test_date,
    lab_name,
    overall_health_score,
    created_at
FROM reports
WHERE user_id = $1 AND deleted_at IS NULL
ORDER BY test_date DESC
LIMIT $2 OFFSET $3;

-- Index used: idx_reports_by_user_and_date
-- Execution: ~2ms
```

#### Query 8: Reports Pending AI Processing
**Purpose:** Background job to find reports awaiting AI analysis

```sql
SELECT 
    id,
    user_id,
    pdf_file_path,
    ocr_raw_output
FROM reports
WHERE ai_analysis_status = 'PENDING'
    OR (ai_analysis_status = 'AI_ANALYSIS_IN_PROGRESS' 
        AND processing_started_at < NOW() - INTERVAL '30 minutes')
ORDER BY created_at ASC
LIMIT 50;

-- Index used: idx_reports_processing_status
-- Execution: ~3-5ms
```

#### Query 9: Organ System Health Summary
**Purpose:** Show scores across all organ systems for a report

```sql
SELECT 
    organ_system,
    score,
    status,
    biomarkers_analyzed,
    abnormal_count
FROM organ_system_scores
WHERE report_id = $1
ORDER BY organ_system;

-- Index used: idx_organ_scores_report_id
-- Execution: <1ms
```

#### Query 10: Get Recommendations by Urgency
**Purpose:** Show high-priority recommendations first

```sql
SELECT 
    id,
    category,
    title,
    description,
    urgency,
    details
FROM recommendations
WHERE report_id = $1
ORDER BY CASE urgency 
    WHEN 'immediate' THEN 1
    WHEN 'high' THEN 2
    WHEN 'medium' THEN 3
    WHEN 'low' THEN 4
END;

-- Index used: idx_recommendations_report_id, idx_recommendations_urgency
-- Execution: ~1ms
```

#### Query 11: Biomarker Comparison Across Reports
**Purpose:** Compare same marker across different dates for trend analysis

```sql
SELECT 
    r.test_date,
    r.id as report_id,
    b.marker_code,
    b.value,
    b.status,
    LAG(b.value) OVER (ORDER BY r.test_date) as prev_value,
    (b.value - LAG(b.value) OVER (ORDER BY r.test_date)) as change
FROM biomarkers b
JOIN reports r ON b.report_id = r.id
WHERE r.user_id = $1 
    AND b.marker_code = $2
    AND r.deleted_at IS NULL
ORDER BY r.test_date DESC
LIMIT 6;

-- Index used: idx_biomarkers_report_id
-- Execution: ~8-12ms
```

#### Query 12: Health Concerns Statistics
**Purpose:** Analyze concern distribution for a report

```sql
SELECT 
    category,
    COUNT(*) as concern_count,
    ROUND(AVG(priority)) as avg_priority
FROM health_concerns
WHERE report_id = $1
GROUP BY category
ORDER BY concern_count DESC;

-- Index used: idx_health_concerns_category
-- Execution: <1ms
```

#### Query 13: Find Users with Critical Organ System Scores
**Purpose:** Admin/healthcare worker finds users needing follow-up

```sql
SELECT 
    u.id,
    u.name,
    u.phone,
    r.id as latest_report_id,
    r.test_date,
    oss.organ_system,
    oss.score,
    oss.status
FROM users u
JOIN reports r ON u.id = r.user_id AND r.deleted_at IS NULL
JOIN organ_system_scores oss ON r.id = oss.report_id
WHERE oss.status IN ('CRITICAL', 'POOR')
    AND r.test_date > CURRENT_DATE - INTERVAL '30 days'
ORDER BY u.created_at DESC
LIMIT 100;

-- Index used: idx_reports_user_id
-- Execution: ~15-20ms
```

#### Query 14: Monthly Report Processing Statistics
**Purpose:** Monitor pipeline health and OCR/AI success rates

```sql
SELECT 
    DATE_TRUNC('month', r.created_at)::DATE as month,
    COUNT(*) as total_reports,
    SUM(CASE WHEN r.ocr_extraction_status = 'OCR_COMPLETE' THEN 1 ELSE 0 END) as ocr_complete,
    SUM(CASE WHEN r.ai_analysis_status = 'ANALYSIS_COMPLETE' THEN 1 ELSE 0 END) as ai_complete,
    SUM(CASE WHEN r.ocr_extraction_status = 'FAILED' OR r.ai_analysis_status = 'FAILED' THEN 1 ELSE 0 END) as failed
FROM reports r
WHERE r.created_at > CURRENT_DATE - INTERVAL '6 months'
    AND r.deleted_at IS NULL
GROUP BY DATE_TRUNC('month', r.created_at)
ORDER BY month DESC;

-- Index used: idx_reports_created_at
-- Execution: ~20-30ms
```

#### Query 15: Family Member Reports
**Purpose:** Show all family members' reports for a household view

```sql
SELECT 
    fm.id as family_member_id,
    fm.name,
    fm.relationship,
    r.id as report_id,
    r.test_date,
    r.overall_health_score,
    COUNT(b.id) as biomarker_count
FROM family_members fm
LEFT JOIN reports r ON fm.id = r.family_member_id AND r.deleted_at IS NULL
LEFT JOIN biomarkers b ON r.id = b.report_id
WHERE fm.user_id = $1 AND fm.deleted_at IS NULL
GROUP BY fm.id, r.id
ORDER BY fm.name, r.test_date DESC;

-- Index used: idx_family_members_user_id, idx_reports_family_member_id
-- Execution: ~5-8ms
```

---

## Data Growth Estimation

### Assumptions

- **Phase 1 Growth:** 1K → 10K → 100K users over 6-12 months
- **User Behavior:**
  - Average 1 report per month per user
  - Average 65 biomarkers per report
  - Average 7 organ system scores per report
  - Average 5 health concerns per report
  - Average 8 recommendations per report

### Storage Growth Table

| Table | 1K Users | 10K Users | 100K Users | Notes |
|---|---|---|---|---|
| **users** | 1K rows | 10K rows | 100K rows | ~1.2 MB @ 100K |
| **otp_requests** | 2K rows | 20K rows | 200K rows | Pruned monthly (~2 MB @ 100K) |
| **sessions** | 3K rows | 30K rows | 300K rows | Pruned when expired (~3 MB @ 100K) |
| **reports** | 1K rows | 12K rows | 120K rows | ~35 MB @ 100K (includes OCR/AI JSON) |
| **biomarkers** | 65K rows | 780K rows | 7.8M rows | ~450 MB @ 100K |
| **biomarker_reference_ranges** | 400 rows | 400 rows | 400 rows | ~100 KB (static) |
| **organ_system_scores** | 7K rows | 84K rows | 840K rows | ~25 MB @ 100K |
| **health_concerns** | 5K rows | 60K rows | 600K rows | ~60 MB @ 100K |
| **recommendations** | 8K rows | 96K rows | 960K rows | ~80 MB @ 100K |
| **family_members** | 200 rows | 2K rows | 20K rows | ~2 MB @ 100K |
| **TOTAL DATA** | ~150 MB | ~1.5 GB | ~15-17 GB | Excludes indexes |
| **INDEXES** | ~50 MB | ~500 MB | ~5-6 GB | Rule of thumb: 25-40% of data size |
| **TOTAL (Data + Indexes)** | ~200 MB | ~2 GB | ~20-23 GB | Single AZ RDS instance sufficient |

### Query Performance Targets

| Query Type | 1K Users | 10K Users | 100K Users |
|---|---|---|---|
| Dashboard (latest report + scores) | <1ms | ~1ms | ~2ms |
| Biomarker trends (6 reports) | ~2ms | ~5ms | ~8ms |
| Report details (all markers) | <1ms | ~1ms | ~2ms |
| User report history (paginated) | <1ms | ~1ms | ~3ms |
| Find critical cases (admin query) | ~5ms | ~15ms | ~50ms |

**Conclusion:** Single t3.medium RDS instance (4 vCPU, 8 GB RAM) supports 100K users comfortably. Upgrade to t3.large (8 GB) for safety margin and read replicas if analytics queries become heavy.

---

## Migration Strategy

### Tool: node-pg-migrate

We use **node-pg-migrate** for version control and rollback capability.

```bash
npm install node-pg-migrate pg
```

### Directory Structure

```
app/
├── migrations/
│   ├── 001_init_enums.js
│   ├── 002_create_users.js
│   ├── 003_create_auth_tables.js
│   ├── 004_create_reports.js
│   ├── 005_create_biomarkers.js
│   ├── 006_create_organ_scores.js
│   ├── 007_create_concerns_recommendations.js
│   ├── 008_create_family_members.js
│   ├── 009_create_indexes.js
│   └── 010_seed_biomarker_ranges.js
├── db/
│   └── migration.js (wrapper)
└── package.json
```

### Sample Migration File Structure

```javascript
// migrations/001_init_enums.js
module.exports = {
    async up(pgm) {
        // Create ENUM types
        pgm.createType('biomarker_status', ['NORMAL', 'ABNORMAL', 'SUBOPTIMAL', 'WARNING', 'CRITICAL']);
        pgm.createType('gender_type', ['M', 'F', 'O', 'PREFER_NOT_TO_SAY']);
        pgm.createType('organ_system_enum', ['liver', 'kidney', 'thyroid', 'metabolic', 'blood', 'heart', 'nutrients']);
        pgm.createType('report_processing_status', ['PENDING', 'OCR_IN_PROGRESS', 'OCR_COMPLETE', 'AI_ANALYSIS_IN_PROGRESS', 'ANALYSIS_COMPLETE', 'FAILED', 'RETRY_PENDING']);
        pgm.createType('language_preference', ['en', 'hi', 'ta', 'te', 'ka', 'ml', 'bn']);
        pgm.createType('recommendation_urgency', ['immediate', 'high', 'medium', 'low']);
        pgm.createType('recommendation_category', ['diet', 'lifestyle', 'supplements', 'medical']);
        pgm.createType('health_concern_category', ['biomarker_abnormality', 'organ_system_risk', 'lifestyle_risk', 'preventive_care']);
        pgm.createType('organ_system_status', ['EXCELLENT', 'GOOD', 'FAIR', 'POOR', 'CRITICAL']);
    },

    async down(pgm) {
        // Drop in reverse order of creation
        pgm.dropType('organ_system_status');
        pgm.dropType('health_concern_category');
        pgm.dropType('recommendation_category');
        pgm.dropType('recommendation_urgency');
        pgm.dropType('language_preference');
        pgm.dropType('report_processing_status');
        pgm.dropType('organ_system_enum');
        pgm.dropType('gender_type');
        pgm.dropType('biomarker_status');
    }
};
```

### Migration Execution Commands

```bash
# Create new migration
npx node-pg-migrate create init_enums

# Run all pending migrations
npx node-pg-migrate up

# Rollback last migration
npx node-pg-migrate down

# Rollback all
npx node-pg-migrate down -t 0

# Check migration status
npx node-pg-migrate status
```

### Environment Configuration

```bash
# .env
DATABASE_URL=postgresql://longhealth:password@longhealth-db.c3gxxx.ap-south-1.rds.amazonaws.com:5432/longhealth_dev
MIGRATING=true
```

### Rollout Process

1. **Development:** All migrations applied locally with test data
2. **Staging:** Full production schema with sanitized data
3. **Production:**
   - Backup RDS instance before migration
   - Run migrations during low-traffic window (2-4 AM IST)
   - Monitor slow_log for any locks
   - Have rollback plan ready

### Zero-Downtime Considerations

For large tables in future phases:
- Add columns with default values before use
- Create indexes CONCURRENTLY
- Drop old columns after dual-write period
- Use `LOCK TIMEOUT` to prevent long-running locks

---

## Backup & Recovery

### AWS RDS Automated Backups

**Configuration:**

```
- Backup Retention Period: 30 days
- Backup Window: 03:00 - 04:00 IST (daily)
- Multi-AZ: Enabled for HA
- Copy Backups to Secondary Region: Optional (us-east-1 for disaster recovery)
```

### Point-in-Time Recovery (PITR)

Recover to any point within the last 30 days:

```bash
# Via AWS CLI
aws rds restore-db-instance-to-point-in-time \
  --source-db-instance-identifier longhealth-db-prod \
  --db-instance-identifier longhealth-db-restored \
  --restore-time 2026-04-08T10:30:00Z \
  --region ap-south-1
```

### Manual Snapshots

Create snapshots before major migrations:

```bash
aws rds create-db-snapshot \
  --db-instance-identifier longhealth-db-prod \
  --db-snapshot-identifier longhealth-before-migration-20260408 \
  --region ap-south-1
```

### Backup Verification

```sql
-- Query to verify data integrity post-restore
SELECT 
    (SELECT COUNT(*) FROM users WHERE deleted_at IS NULL) as active_users,
    (SELECT COUNT(*) FROM reports WHERE deleted_at IS NULL) as active_reports,
    (SELECT COUNT(*) FROM biomarkers) as total_biomarkers,
    (SELECT COUNT(*) FROM organ_system_scores) as total_scores,
    (SELECT MAX(created_at) FROM reports) as latest_report;
```

### Recovery RTO/RPO

- **RTO (Recovery Time Objective):** ~10-15 minutes (automated backup restore)
- **RPO (Recovery Point Objective):** 5 minutes (transaction logs enabled)

### Backup Storage & Cost

- 30-day retention × 20 GB average = ~600 GB total cost: ~$60/month
- Manual snapshots (5 per month × 20 GB) = $5/month additional

---

## Transaction Guidelines

### ACID Transactions for Critical Operations

#### 1. Report Upload & Processing Initiation

```javascript
// Wrap in explicit transaction
const client = await pool.connect();
try {
    await client.query('BEGIN');
    
    // Insert report
    const reportRes = await client.query(
        `INSERT INTO reports 
         (id, user_id, lab_name, test_date, pdf_file_path, ocr_extraction_status)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id`,
        [reportId, userId, labName, testDate, pdfPath, 'PENDING']
    );
    
    // Create S3 file association (not transactional, but logged)
    const s3Key = `reports/${userId}/${reportId}.pdf`;
    // ... upload to S3
    
    await client.query('COMMIT');
    return reportRes.rows[0];
} catch (err) {
    await client.query('ROLLBACK');
    throw err;
} finally {
    client.release();
}
```

#### 2. Biomarker Analysis & Score Calculation

```javascript
// High-frequency: Wrap entire analysis in transaction
const client = await pool.connect();
try {
    await client.query('BEGIN');
    
    // 1. Extract and insert biomarkers
    for (const marker of extractedMarkers) {
        await client.query(
            `INSERT INTO biomarkers 
             (id, report_id, marker_code, marker_name, organ_system, value, unit, status, 
              lab_range_min, lab_range_max, functional_range_min, functional_range_max)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
            [markerId, reportId, code, name, system, value, unit, status, ...ranges]
        );
    }
    
    // 2. Calculate organ system scores
    const scoreRes = await client.query(
        `INSERT INTO organ_system_scores (id, report_id, organ_system, score, status, biomarkers_analyzed, abnormal_count)
         SELECT 
             gen_random_uuid(), $1, 'liver', 85, 'GOOD', 7, 1
         FROM (SELECT 1)`,
        [reportId]
    );
    
    // 3. Generate health concerns
    for (const concern of aiConcerns) {
        await client.query(
            `INSERT INTO health_concerns (id, report_id, priority, category, title, description)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [concernId, reportId, priority, category, title, description]
        );
    }
    
    // 4. Update report status
    await client.query(
        `UPDATE reports SET ai_analysis_status = 'ANALYSIS_COMPLETE', 
         processing_completed_at = NOW(), overall_health_score = $2
         WHERE id = $1`,
        [reportId, overallScore]
    );
    
    await client.query('COMMIT');
} catch (err) {
    await client.query('ROLLBACK');
    // Retry logic or alert
    throw err;
} finally {
    client.release();
}
```

#### 3. User Registration with OTP Verification

```javascript
// Registration flow (transactional)
const client = await pool.connect();
try {
    await client.query('BEGIN');
    
    // 1. Verify OTP hash matches
    const otpRes = await client.query(
        `SELECT * FROM otp_requests 
         WHERE phone = $1 AND expires_at > NOW() 
         ORDER BY created_at DESC LIMIT 1`,
        [phone]
    );
    if (!otpRes.rows.length || !bcrypt.compare(otp, otpRes.rows[0].otp_hash)) {
        throw new Error('Invalid OTP');
    }
    
    // 2. Create user if not exists
    const userRes = await client.query(
        `INSERT INTO users (id, phone, name, dob, gender, language_preference)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (phone) DO UPDATE SET updated_at = NOW()
         RETURNING id`,
        [userId, phone, name, dob, gender, language]
    );
    
    // 3. Create session
    const sessionRes = await client.query(
        `INSERT INTO sessions (id, user_id, refresh_token_hash, ip_address, expires_at)
         VALUES ($1, $2, $3, $4, NOW() + INTERVAL '7 days')
         RETURNING id`,
        [sessionId, userRes.rows[0].id, tokenHash, ipAddress]
    );
    
    // 4. Invalidate OTP
    await client.query(
        `UPDATE otp_requests SET attempt_count = attempt_count + 1 
         WHERE phone = $1 AND attempt_count < max_attempts`,
        [phone]
    );
    
    await client.query('COMMIT');
    return { userId: userRes.rows[0].id, sessionId: sessionRes.rows[0].id };
} catch (err) {
    await client.query('ROLLBACK');
    throw err;
} finally {
    client.release();
}
```

### Transaction Isolation Levels

```sql
-- Default: READ COMMITTED (suitable for most operations)
BEGIN ISOLATION LEVEL READ COMMITTED;
-- Safe for dashboard reads, avoids phantom reads

-- For report processing: SERIALIZABLE (strong consistency)
BEGIN ISOLATION LEVEL SERIALIZABLE;
-- Ensures no concurrent modifications during multi-step analysis

-- For analytics queries: READ UNCOMMITTED (fastest, acceptable stale data)
BEGIN ISOLATION LEVEL READ UNCOMMITTED;
-- Read complex aggregations without locking
```

### Deadlock Prevention

1. **Insert Order:** Always insert in same order (users → reports → biomarkers)
2. **Lock Escalation:** Avoid upgrading from SELECT to UPDATE within transaction
3. **Timeout:** Set `statement_timeout = 30s` to prevent hanging locks

```sql
SET statement_timeout TO 30000; -- 30 seconds
```

### No-Transaction Operations

These queries don't need explicit transactions (read-only):

```javascript
// Safe: Dashboard read
const dashboard = await pool.query(
    `SELECT ... FROM reports WHERE user_id = $1 LIMIT 1`,
    [userId]
);

// Safe: Report history (paginated read)
const history = await pool.query(
    `SELECT ... FROM reports WHERE user_id = $1 ORDER BY test_date DESC LIMIT 10`,
    [userId]
);
```

---

## Appendix: Monitoring & Maintenance

### Key PostgreSQL Metrics to Monitor

```sql
-- Table sizes
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Index effectiveness
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan as index_scans,
    idx_tup_read as tuples_read,
    idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;

-- Slow queries (requires pg_stat_statements)
SELECT 
    query,
    calls,
    total_time,
    mean_time,
    max_time
FROM pg_stat_statements
WHERE query LIKE '%SELECT%'
ORDER BY mean_time DESC
LIMIT 10;
```

### Maintenance Tasks (Weekly)

```bash
# ANALYZE: Update table statistics
ANALYZE;

# VACUUM: Reclaim space from deleted rows
VACUUM ANALYZE;

# Check for unused indexes
SELECT schemaname, tablename, indexname, idx_scan
FROM pg_stat_user_indexes
WHERE idx_scan = 0;
```

### CloudWatch Alarms

Set up RDS CloudWatch alarms:
- Database connections > 80
- CPU utilization > 80%
- Disk space < 10%
- Replication lag > 1 second (read replicas)
- Failed login attempts > 5/minute

---

## References

- [PostgreSQL 14 Documentation](https://www.postgresql.org/docs/)
- [AWS RDS for PostgreSQL Best Practices](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/CHAP_PostgreSQL.html)
- [node-pg-migrate Documentation](https://salsita.github.io/node-pg-migrate/)
- [Database Normalization Fundamentals](https://en.wikipedia.org/wiki/Database_normalization)

---

**Document Version:** 1.0  
**Last Updated:** 2026-04-08  
**Next Review:** After Phase 1 MVP launch + 1 month
