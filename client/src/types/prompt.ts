export interface Prompt {
  id: number
  name: string
  content: string
  description: string | null
  model_provider: 'openai' | 'anthropic' | 'gemini'
  model_name: string
  is_active: number
  created_by: number
  creator_name: string
  created_at: string
  updated_at: string
}

export interface PromptListResponse {
  prompts: Prompt[]
}

export interface PromptDetailResponse {
  prompt: Prompt
}
