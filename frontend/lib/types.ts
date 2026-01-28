export interface Contact {
  id: string
  name: string
  company: string
  title?: string
  telegram_handle?: string
  x_username?: string
  x_bio?: string
  email?: string
  notes?: string
  source?: string
  telegram_validated?: number
  telegram_validation_date?: string
  created_at: string
}

export interface Draft {
  id: string
  contact_id: string
  channel: string
  message_text: string
  status: 'queued' | 'approved' | 'sent' | 'dismissed' | 'followup'
  prepared_at?: string
  created_at: string
  updated_at: string
}

export interface Target {
  id: string
  team_name: string
  raised_usd: number
  monthly_revenue_usd: number
  is_web3: number
  x_handle?: string
  website?: string
  notes?: string
  status: 'active' | 'pending' | 'approved' | 'dismissed'
  messages_sent?: number
  created_at: string
  updated_at: string
}

export interface DraftWithContact extends Draft {
  name: string
  company: string
  title?: string
  telegram_handle?: string
}

export interface Stats {
  messagesSent: number
  followUpCount: number
}

export interface SuccessfulMessage {
  id: string
  contact_id?: string
  contact_name: string
  company: string
  telegram_handle?: string
  message_text: string
  message_type: 'initial' | 'followup'
  their_response?: string
  created_at: string
  submitted_by?: string // Username of who submitted this win (for shared messages)
}
