-- ContentFoundry DB Schema
-- MySQL 8.0+

CREATE DATABASE IF NOT EXISTS content_foundry
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE content_foundry;

-- ============================================================
-- F-001: 사용자
-- ============================================================
CREATE TABLE users (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  username    VARCHAR(20)  NOT NULL UNIQUE,
  name        VARCHAR(50)  NOT NULL,
  password    VARCHAR(255) NOT NULL,
  role        ENUM('admin', 'user') NOT NULL DEFAULT 'user',
  status      ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  approved_at DATETIME     NULL,
  last_login_at DATETIME   NULL
) ENGINE=InnoDB;

-- ============================================================
-- F-002: 소스 기사
-- ============================================================
CREATE TABLE sources (
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
) ENGINE=InnoDB;

CREATE TABLE source_images (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  source_id    INT UNSIGNED NOT NULL,
  original_url VARCHAR(2048) NOT NULL,
  local_path   VARCHAR(500)  NOT NULL,
  created_at   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (source_id) REFERENCES sources(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 소스 기사에 현재 작업 중인 사용자
CREATE TABLE source_workers (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  source_id  INT UNSIGNED NOT NULL,
  user_id    INT UNSIGNED NOT NULL,
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,

  UNIQUE KEY uk_source_user (source_id, user_id),
  FOREIGN KEY (source_id) REFERENCES sources(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================
-- F-003: 프롬프트 템플릿
-- ============================================================
CREATE TABLE prompts (
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
) ENGINE=InnoDB;

-- ============================================================
-- F-004: 이미지 처리 템플릿
-- ============================================================
CREATE TABLE image_templates (
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
) ENGINE=InnoDB;

-- ============================================================
-- F-005/F-006: 원고
-- ============================================================
CREATE TABLE manuscripts (
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

  -- 생성 시점의 프롬프트/템플릿 스냅샷 (원본이 변경/삭제되어도 기록 유지)
  prompt_snapshot         TEXT NULL,
  image_template_snapshot JSON NULL,

  -- 원본 소스 기사 데이터 스냅샷 (소스 만료 후에도 유지)
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
) ENGINE=InnoDB;

CREATE TABLE manuscript_images (
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
) ENGINE=InnoDB;

-- ============================================================
-- F-007: 포스팅
-- ============================================================
CREATE TABLE postings (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  manuscript_id INT UNSIGNED NOT NULL UNIQUE,
  url           VARCHAR(2048) NOT NULL,
  platform      ENUM('blog', 'cafe') NOT NULL,
  keyword       VARCHAR(200) NULL,
  posted_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (manuscript_id) REFERENCES manuscripts(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================
-- F-008: 성과 추적
-- ============================================================
CREATE TABLE performance_tracking (
  id             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  posting_id     INT UNSIGNED NOT NULL UNIQUE,
  tracking_start DATETIME     NOT NULL,
  tracking_end   DATETIME     NOT NULL,
  status         ENUM('tracking', 'completed') NOT NULL DEFAULT 'tracking',

  FOREIGN KEY (posting_id) REFERENCES postings(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE performance_data (
  id           BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  tracking_id  INT UNSIGNED NOT NULL,
  keyword_rank SMALLINT     NULL,
  view_count   INT UNSIGNED NULL,
  comment_count INT UNSIGNED NULL,
  is_accessible TINYINT(1)  NOT NULL DEFAULT 1,
  collected_at  DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_perf_data_tracking_time (tracking_id, collected_at),

  FOREIGN KEY (tracking_id) REFERENCES performance_tracking(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================
-- 작업 큐 (DB 기반)
-- ============================================================
CREATE TABLE job_queue (
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
) ENGINE=InnoDB;
