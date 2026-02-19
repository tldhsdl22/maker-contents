import 'dotenv/config'
import mysql from 'mysql2/promise'

const { DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME } = process.env

async function setup() {
  const conn = await mysql.createConnection({
    host: DB_HOST || 'localhost',
    port: Number(DB_PORT) || 3306,
    user: DB_USER || 'root',
    password: DB_PASSWORD || '',
    multipleStatements: true,
  })

  console.log('[setup] MySQL 연결 성공')

  await conn.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`)
  console.log(`[setup] 데이터베이스 "${DB_NAME}" 확인/생성 완료`)

  await conn.query(`USE \`${DB_NAME}\``)

  await conn.query(`
    CREATE TABLE IF NOT EXISTS users (
      id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      username    VARCHAR(20)  NOT NULL UNIQUE,
      name        VARCHAR(50)  NOT NULL,
      password    VARCHAR(255) NOT NULL,
      role        ENUM('admin', 'user') NOT NULL DEFAULT 'user',
      status      ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
      created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
      approved_at DATETIME     NULL,
      last_login_at DATETIME   NULL
    ) ENGINE=InnoDB
  `)
  console.log('[setup] users 테이블 생성 완료')

  await conn.query(`
    CREATE TABLE IF NOT EXISTS sources (
      id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      title         VARCHAR(500)  NOT NULL,
      thumbnail_url VARCHAR(2048) NULL,
      thumbnail_local_path VARCHAR(500) NULL,
      original_url  VARCHAR(2048) NOT NULL,
      url_hash      CHAR(64)      NOT NULL UNIQUE,
      content_html  MEDIUMTEXT    NOT NULL,
      category      VARCHAR(50)   NULL,
      source_site   VARCHAR(100)  NOT NULL,
      crawled_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
      expires_at    DATETIME      NOT NULL,
      INDEX idx_sources_crawled (crawled_at DESC),
      INDEX idx_sources_expires (expires_at),
      INDEX idx_sources_category (category)
    ) ENGINE=InnoDB
  `)

  await conn.query(`
    CREATE TABLE IF NOT EXISTS source_images (
      id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      source_id    INT UNSIGNED NOT NULL,
      original_url VARCHAR(2048) NOT NULL,
      local_path   VARCHAR(500)  NOT NULL,
      created_at   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (source_id) REFERENCES sources(id) ON DELETE CASCADE
    ) ENGINE=InnoDB
  `)

  await conn.query(`
    CREATE TABLE IF NOT EXISTS source_workers (
      id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      source_id  INT UNSIGNED NOT NULL,
      user_id    INT UNSIGNED NOT NULL,
      created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uk_source_user (source_id, user_id),
      FOREIGN KEY (source_id) REFERENCES sources(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB
  `)
  console.log('[setup] sources 관련 테이블 생성 완료')

  await conn.query(`
    CREATE TABLE IF NOT EXISTS prompts (
      id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      name        VARCHAR(100)  NOT NULL,
      content     TEXT          NOT NULL,
      description VARCHAR(500)  NULL,
      model_provider ENUM('openai', 'anthropic', 'gemini') NOT NULL DEFAULT 'openai',
      model_name  VARCHAR(100)  NOT NULL DEFAULT 'gpt-4o-mini',
      is_active   TINYINT(1)    NOT NULL DEFAULT 1,
      created_by  INT UNSIGNED  NOT NULL,
      created_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (created_by) REFERENCES users(id)
    ) ENGINE=InnoDB
  `)
  console.log('[setup] prompts 테이블 생성 완료')

  const [promptCols] = await conn.query<any[]>(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'prompts' AND COLUMN_NAME IN ('model_provider', 'model_name')`,
    [DB_NAME]
  )
  const promptColNames = new Set(promptCols.map(c => c.COLUMN_NAME))
  if (!promptColNames.has('model_provider')) {
    await conn.query(`ALTER TABLE prompts ADD COLUMN model_provider ENUM('openai', 'anthropic', 'gemini') NOT NULL DEFAULT 'openai' AFTER description`)
  }
  if (!promptColNames.has('model_name')) {
    await conn.query(`ALTER TABLE prompts ADD COLUMN model_name VARCHAR(100) NOT NULL DEFAULT 'gpt-4o-mini' AFTER model_provider`)
  }

  await conn.query(`
    CREATE TABLE IF NOT EXISTS image_templates (
      id                    INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      name                  VARCHAR(100)  NOT NULL,
      description           VARCHAR(500)  NULL,
      original_image_prompt TEXT          NOT NULL,
      new_image_prompt      TEXT          NULL,
      remove_watermark      TINYINT(1)    NOT NULL DEFAULT 0,
      is_active             TINYINT(1)    NOT NULL DEFAULT 1,
      created_by            INT UNSIGNED  NOT NULL,
      created_at            DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at            DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (created_by) REFERENCES users(id)
    ) ENGINE=InnoDB
  `)

  // 구버전 스키마 마이그레이션: original_processing_type → original_image_prompt
  const [itCols] = await conn.query<any[]>(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'image_templates' AND COLUMN_NAME = 'original_processing_type'`,
    [DB_NAME]
  )
  if (itCols.length > 0) {
    console.log('[setup] image_templates 스키마 마이그레이션 중...')
    await conn.query(`ALTER TABLE image_templates ADD COLUMN original_image_prompt TEXT NOT NULL AFTER description`)
    await conn.query(`UPDATE image_templates SET original_image_prompt = COALESCE(original_processing_type, '') WHERE original_image_prompt = ''`)
    await conn.query(`ALTER TABLE image_templates DROP COLUMN original_processing_type`)
    await conn.query(`ALTER TABLE image_templates DROP COLUMN original_processing_config`)
    await conn.query(`ALTER TABLE image_templates DROP COLUMN new_image_style`)
    console.log('[setup] image_templates 스키마 마이그레이션 완료')
  }

  console.log('[setup] image_templates 테이블 생성 완료')

  await conn.query(`
    CREATE TABLE IF NOT EXISTS manuscripts (
      id                INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      user_id           INT UNSIGNED  NOT NULL,
      source_id         INT UNSIGNED  NULL,
      prompt_id         INT UNSIGNED  NULL,
      image_template_id INT UNSIGNED  NULL,
      title             VARCHAR(500)  NOT NULL,
      content_html      MEDIUMTEXT    NULL,
      keyword           VARCHAR(200)  NULL,
      length_option     ENUM('short', 'medium', 'long') NOT NULL DEFAULT 'medium',
      new_image_count   TINYINT UNSIGNED NOT NULL DEFAULT 0,
      status            ENUM('generating', 'generated', 'posted', 'failed') NOT NULL DEFAULT 'generating',
      prompt_snapshot         TEXT NULL,
      image_template_snapshot JSON NULL,
      source_title_snapshot    VARCHAR(500) NULL,
      source_url_snapshot      VARCHAR(2048) NULL,
      created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_manuscripts_user_status (user_id, status),
      INDEX idx_manuscripts_created (created_at DESC),
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (source_id) REFERENCES sources(id) ON DELETE SET NULL,
      FOREIGN KEY (prompt_id) REFERENCES prompts(id) ON DELETE SET NULL,
      FOREIGN KEY (image_template_id) REFERENCES image_templates(id) ON DELETE SET NULL
    ) ENGINE=InnoDB
  `)

  await conn.query(`
    ALTER TABLE manuscripts
    MODIFY COLUMN status ENUM('generating', 'generated', 'posted', 'failed') NOT NULL DEFAULT 'generating'
  `)

  await conn.query(`
    CREATE TABLE IF NOT EXISTS manuscript_images (
      id                      INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      manuscript_id           INT UNSIGNED NOT NULL,
      image_type              ENUM('original_processed', 'generated') NOT NULL,
      original_source_image_id INT UNSIGNED NULL,
      file_path               VARCHAR(500) NOT NULL,
      file_url                VARCHAR(2048) NOT NULL,
      sort_order              SMALLINT UNSIGNED NOT NULL DEFAULT 0,
      created_at              DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (manuscript_id) REFERENCES manuscripts(id) ON DELETE CASCADE,
      FOREIGN KEY (original_source_image_id) REFERENCES source_images(id) ON DELETE SET NULL
    ) ENGINE=InnoDB
  `)
  console.log('[setup] manuscripts 관련 테이블 생성 완료')

  await conn.query(`
    CREATE TABLE IF NOT EXISTS postings (
      id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      manuscript_id INT UNSIGNED NOT NULL UNIQUE,
      url           VARCHAR(2048) NOT NULL,
      platform      ENUM('blog', 'cafe') NOT NULL,
      keyword       VARCHAR(200) NULL,
      posted_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (manuscript_id) REFERENCES manuscripts(id) ON DELETE CASCADE
    ) ENGINE=InnoDB
  `)

  await conn.query(`
    CREATE TABLE IF NOT EXISTS performance_tracking (
      id             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      posting_id     INT UNSIGNED NOT NULL UNIQUE,
      tracking_start DATETIME     NOT NULL,
      tracking_end   DATETIME     NOT NULL,
      status         ENUM('tracking', 'completed') NOT NULL DEFAULT 'tracking',
      FOREIGN KEY (posting_id) REFERENCES postings(id) ON DELETE CASCADE
    ) ENGINE=InnoDB
  `)

  await conn.query(`
    CREATE TABLE IF NOT EXISTS performance_data (
      id           BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      tracking_id  INT UNSIGNED NOT NULL,
      keyword_rank SMALLINT     NULL,
      view_count   INT UNSIGNED NULL,
      comment_count INT UNSIGNED NULL,
      is_accessible TINYINT(1)  NOT NULL DEFAULT 1,
      collected_at  DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_perf_data_tracking_time (tracking_id, collected_at),
      FOREIGN KEY (tracking_id) REFERENCES performance_tracking(id) ON DELETE CASCADE
    ) ENGINE=InnoDB
  `)
  console.log('[setup] postings/performance 테이블 생성 완료')

  await conn.query(`
    CREATE TABLE IF NOT EXISTS job_queue (
      id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      type          VARCHAR(50)  NOT NULL,
      payload       JSON         NOT NULL,
      status        ENUM('pending', 'processing', 'completed', 'failed') NOT NULL DEFAULT 'pending',
      attempts      TINYINT UNSIGNED NOT NULL DEFAULT 0,
      max_attempts  TINYINT UNSIGNED NOT NULL DEFAULT 3,
      error_message TEXT         NULL,
      created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
      started_at    DATETIME     NULL,
      completed_at  DATETIME     NULL,
      INDEX idx_jobs_status_created (status, created_at)
    ) ENGINE=InnoDB
  `)
  console.log('[setup] job_queue 테이블 생성 완료')

  console.log('[setup] 모든 테이블 생성이 완료되었습니다!')
  await conn.end()
}

setup().catch((err) => {
  console.error('[setup] 실패:', err.message)
  process.exit(1)
})
