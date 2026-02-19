export interface ImageTemplate {
  id: number
  name: string
  description: string | null
  original_image_prompt: string
  new_image_prompt: string | null
  remove_watermark: number
  is_active: number
  created_by: number
  creator_name: string
  created_at: string
  updated_at: string
}

export interface ImageTemplateListResponse {
  templates: ImageTemplate[]
}

export interface ImageTemplateDetailResponse {
  template: ImageTemplate
}
