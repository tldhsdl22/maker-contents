-- Add prompt model columns for LLM selection
ALTER TABLE prompts
  ADD COLUMN model_provider ENUM('openai', 'anthropic', 'gemini') NOT NULL DEFAULT 'openai' AFTER description,
  ADD COLUMN model_name VARCHAR(100) NOT NULL DEFAULT 'gpt-4o-mini' AFTER model_provider;
