-- Add failed status to manuscripts
ALTER TABLE manuscripts
  MODIFY COLUMN status ENUM('generating', 'generated', 'posted', 'failed') NOT NULL DEFAULT 'generating';
