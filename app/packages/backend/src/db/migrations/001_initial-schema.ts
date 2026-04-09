/* eslint-disable @typescript-eslint/no-explicit-any */
import { MigrationBuilder } from 'node-pg-migrate';

export const up = (pgm: MigrationBuilder) => {
  // Create ENUM types
  pgm.createType('gender_type', ['male', 'female', 'other']);
  pgm.createType('report_status', ['uploading', 'processing', 'analyzed', 'error']);
  pgm.createType('biomarker_status', ['optimal', 'borderline', 'low', 'high', 'critical']);
  pgm.createType('organ_system', ['liver', 'kidney', 'thyroid', 'metabolic', 'blood', 'heart', 'nutrients']);
  pgm.createType('concern_severity', ['low', 'medium', 'high', 'critical']);
  pgm.createType('recommendation_type', ['diet', 'supplement', 'lifestyle', 'retest']);

  // Create updated_at trigger function
  pgm.createFunction(
    'update_updated_at_column',
    [],
    { returns: 'trigger', language: 'plpgsql' },
    `
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
    `
  );

  // Users table
  pgm.createTable('users', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    phone: {
      type: 'varchar(15)',
      unique: true,
      notNull: true,
    },
    name: {
      type: 'varchar(100)',
    },
    date_of_birth: {
      type: 'date',
    },
    gender: {
      type: 'gender_type',
    },
    height_cm: {
      type: 'decimal(5,1)',
    },
    weight_kg: {
      type: 'decimal(5,1)',
    },
    language: {
      type: 'varchar(5)',
      default: "'en'",
    },
    deleted_at: {
      type: 'timestamptz',
    },
    created_at: {
      type: 'timestamptz',
      default: pgm.func('NOW()'),
      notNull: true,
    },
    updated_at: {
      type: 'timestamptz',
      default: pgm.func('NOW()'),
      notNull: true,
    },
  });

  pgm.createTrigger('users', 'update_users_updated_at', {
    when: 'BEFORE',
    operation: ['UPDATE'],
    function: 'update_updated_at_column',
  });

  // OTP Requests table
  pgm.createTable('otp_requests', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    phone: {
      type: 'varchar(15)',
      notNull: true,
    },
    otp_hash: {
      type: 'varchar(255)',
      notNull: true,
    },
    expires_at: {
      type: 'timestamptz',
      notNull: true,
    },
    attempts: {
      type: 'integer',
      default: 0,
    },
    verified: {
      type: 'boolean',
      default: false,
    },
    created_at: {
      type: 'timestamptz',
      default: pgm.func('NOW()'),
      notNull: true,
    },
    updated_at: {
      type: 'timestamptz',
      default: pgm.func('NOW()'),
      notNull: true,
    },
  });

  pgm.createIndex('otp_requests', ['phone', 'expires_at']);
  pgm.createTrigger('otp_requests', 'update_otp_requests_updated_at', {
    when: 'BEFORE',
    operation: ['UPDATE'],
    function: 'update_updated_at_column',
  });

  // Sessions table
  pgm.createTable('sessions', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    user_id: {
      type: 'uuid',
      notNull: true,
      references: 'users',
      onDelete: 'CASCADE',
    },
    refresh_token: {
      type: 'varchar(500)',
      unique: true,
      notNull: true,
    },
    expires_at: {
      type: 'timestamptz',
      notNull: true,
    },
    user_agent: {
      type: 'text',
    },
    ip_address: {
      type: 'varchar(45)',
    },
    created_at: {
      type: 'timestamptz',
      default: pgm.func('NOW()'),
      notNull: true,
    },
    updated_at: {
      type: 'timestamptz',
      default: pgm.func('NOW()'),
      notNull: true,
    },
  });

  pgm.createIndex('sessions', ['user_id']);
  pgm.createIndex('sessions', ['refresh_token']);
  pgm.createTrigger('sessions', 'update_sessions_updated_at', {
    when: 'BEFORE',
    operation: ['UPDATE'],
    function: 'update_updated_at_column',
  });

  // Reports table
  pgm.createTable('reports', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    user_id: {
      type: 'uuid',
      notNull: true,
      references: 'users',
      onDelete: 'CASCADE',
    },
    lab_name: {
      type: 'varchar(100)',
    },
    report_date: {
      type: 'date',
    },
    pdf_s3_key: {
      type: 'varchar(500)',
    },
    ocr_raw_text: {
      type: 'text',
    },
    status: {
      type: 'report_status',
      default: pgm.func("'uploading'::report_status"),
    },
    error_message: {
      type: 'text',
    },
    analysis_summary: {
      type: 'jsonb',
    },
    created_at: {
      type: 'timestamptz',
      default: pgm.func('NOW()'),
      notNull: true,
    },
    updated_at: {
      type: 'timestamptz',
      default: pgm.func('NOW()'),
      notNull: true,
    },
  });

  pgm.createIndex('reports', ['user_id', 'report_date'], { name: 'idx_reports_user_date' });
  pgm.createIndex('reports', ['status']);
  pgm.createTrigger('reports', 'update_reports_updated_at', {
    when: 'BEFORE',
    operation: ['UPDATE'],
    function: 'update_updated_at_column',
  });

  // Biomarkers table
  pgm.createTable('biomarkers', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    report_id: {
      type: 'uuid',
      notNull: true,
      references: 'reports',
      onDelete: 'CASCADE',
    },
    name: {
      type: 'varchar(100)',
      notNull: true,
    },
    display_name: {
      type: 'varchar(150)',
    },
    value: {
      type: 'decimal(10,3)',
      notNull: true,
    },
    unit: {
      type: 'varchar(30)',
    },
    lab_range_low: {
      type: 'decimal(10,3)',
    },
    lab_range_high: {
      type: 'decimal(10,3)',
    },
    optimal_range_low: {
      type: 'decimal(10,3)',
    },
    optimal_range_high: {
      type: 'decimal(10,3)',
    },
    status: {
      type: 'biomarker_status',
    },
    category: {
      type: 'organ_system',
    },
    ai_explanation: {
      type: 'text',
    },
    manually_corrected: {
      type: 'boolean',
      default: false,
    },
    created_at: {
      type: 'timestamptz',
      default: pgm.func('NOW()'),
      notNull: true,
    },
    updated_at: {
      type: 'timestamptz',
      default: pgm.func('NOW()'),
      notNull: true,
    },
  });

  pgm.createIndex('biomarkers', ['report_id']);
  pgm.createIndex('biomarkers', ['name', 'report_id']);
  pgm.createIndex('biomarkers', ['category']);
  pgm.createTrigger('biomarkers', 'update_biomarkers_updated_at', {
    when: 'BEFORE',
    operation: ['UPDATE'],
    function: 'update_updated_at_column',
  });

  // Biomarker Reference Ranges table
  pgm.createTable('biomarker_reference_ranges', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    name: {
      type: 'varchar(100)',
      notNull: true,
    },
    display_name: {
      type: 'varchar(150)',
    },
    unit: {
      type: 'varchar(30)',
    },
    category: {
      type: 'organ_system',
      notNull: true,
    },
    lab_range_low: {
      type: 'decimal(10,3)',
    },
    lab_range_high: {
      type: 'decimal(10,3)',
    },
    optimal_range_low: {
      type: 'decimal(10,3)',
    },
    optimal_range_high: {
      type: 'decimal(10,3)',
    },
    gender_specific: {
      type: 'boolean',
      default: false,
    },
    male_optimal_low: {
      type: 'decimal(10,3)',
    },
    male_optimal_high: {
      type: 'decimal(10,3)',
    },
    female_optimal_low: {
      type: 'decimal(10,3)',
    },
    female_optimal_high: {
      type: 'decimal(10,3)',
    },
    age_min: {
      type: 'integer',
    },
    age_max: {
      type: 'integer',
    },
    description: {
      type: 'text',
    },
    created_at: {
      type: 'timestamptz',
      default: pgm.func('NOW()'),
      notNull: true,
    },
    updated_at: {
      type: 'timestamptz',
      default: pgm.func('NOW()'),
      notNull: true,
    },
  });

  pgm.createConstraint('biomarker_reference_ranges', 'unique_biomarker_ranges', {
    unique: ['name', 'gender_specific', 'age_min', 'age_max'],
  });
  pgm.createTrigger('biomarker_reference_ranges', 'update_biomarker_reference_ranges_updated_at', {
    when: 'BEFORE',
    operation: ['UPDATE'],
    function: 'update_updated_at_column',
  });

  // Organ System Scores table
  pgm.createTable('organ_system_scores', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    report_id: {
      type: 'uuid',
      notNull: true,
      references: 'reports',
      onDelete: 'CASCADE',
    },
    system: {
      type: 'organ_system',
      notNull: true,
    },
    score: {
      type: 'integer',
      notNull: true,
      check: 'score >= 0 AND score <= 100',
    },
    summary: {
      type: 'text',
    },
    biomarker_count: {
      type: 'integer',
    },
    out_of_range_count: {
      type: 'integer',
    },
    created_at: {
      type: 'timestamptz',
      default: pgm.func('NOW()'),
      notNull: true,
    },
    updated_at: {
      type: 'timestamptz',
      default: pgm.func('NOW()'),
      notNull: true,
    },
  });

  pgm.createConstraint('organ_system_scores', 'unique_organ_system_scores', {
    unique: ['report_id', 'system'],
  });
  pgm.createTrigger('organ_system_scores', 'update_organ_system_scores_updated_at', {
    when: 'BEFORE',
    operation: ['UPDATE'],
    function: 'update_updated_at_column',
  });

  // Health Concerns table
  pgm.createTable('health_concerns', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    report_id: {
      type: 'uuid',
      notNull: true,
      references: 'reports',
      onDelete: 'CASCADE',
    },
    title: {
      type: 'varchar(200)',
      notNull: true,
    },
    severity: {
      type: 'concern_severity',
      notNull: true,
    },
    affected_biomarkers: {
      type: 'text[]',
      notNull: true,
    },
    explanation: {
      type: 'text',
      notNull: true,
    },
    recommended_action: {
      type: 'text',
    },
    priority: {
      type: 'integer',
      default: 0,
    },
    created_at: {
      type: 'timestamptz',
      default: pgm.func('NOW()'),
      notNull: true,
    },
    updated_at: {
      type: 'timestamptz',
      default: pgm.func('NOW()'),
      notNull: true,
    },
  });

  pgm.createIndex('health_concerns', ['report_id']);
  pgm.createTrigger('health_concerns', 'update_health_concerns_updated_at', {
    when: 'BEFORE',
    operation: ['UPDATE'],
    function: 'update_updated_at_column',
  });

  // Recommendations table
  pgm.createTable('recommendations', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    report_id: {
      type: 'uuid',
      notNull: true,
      references: 'reports',
      onDelete: 'CASCADE',
    },
    type: {
      type: 'recommendation_type',
      notNull: true,
    },
    title: {
      type: 'varchar(200)',
      notNull: true,
    },
    description: {
      type: 'text',
      notNull: true,
    },
    priority: {
      type: 'integer',
      default: 0,
    },
    metadata: {
      type: 'jsonb',
    },
    created_at: {
      type: 'timestamptz',
      default: pgm.func('NOW()'),
      notNull: true,
    },
    updated_at: {
      type: 'timestamptz',
      default: pgm.func('NOW()'),
      notNull: true,
    },
  });

  pgm.createIndex('recommendations', ['report_id']);
  pgm.createTrigger('recommendations', 'update_recommendations_updated_at', {
    when: 'BEFORE',
    operation: ['UPDATE'],
    function: 'update_updated_at_column',
  });
};

export const down = (pgm: MigrationBuilder) => {
  // Drop tables in reverse order
  pgm.dropTable('recommendations', { ifExists: true });
  pgm.dropTable('health_concerns', { ifExists: true });
  pgm.dropTable('organ_system_scores', { ifExists: true });
  pgm.dropTable('biomarker_reference_ranges', { ifExists: true });
  pgm.dropTable('biomarkers', { ifExists: true });
  pgm.dropTable('reports', { ifExists: true });
  pgm.dropTable('sessions', { ifExists: true });
  pgm.dropTable('otp_requests', { ifExists: true });
  pgm.dropTable('users', { ifExists: true });

  // Drop function
  pgm.dropFunction('update_updated_at_column', [], { ifExists: true });

  // Drop ENUM types
  pgm.dropType('recommendation_type', { ifExists: true });
  pgm.dropType('concern_severity', { ifExists: true });
  pgm.dropType('organ_system', { ifExists: true });
  pgm.dropType('biomarker_status', { ifExists: true });
  pgm.dropType('report_status', { ifExists: true });
  pgm.dropType('gender_type', { ifExists: true });
};
