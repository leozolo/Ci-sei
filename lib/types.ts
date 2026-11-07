export type RsvpStatus = 'going' | 'maybe' | 'not_going'
export type Role = 'admin' | 'member'
export type MemberStatus = 'active' | 'removed'

export type NotifyPrefKey = 'new_event' | 'comments' | 'event_updates' | 'friend_going'

export interface Profile {
  id: string
  display_name: string
  avatar_url: string | null
  role: Role
  status: MemberStatus
  notify_prefs: Partial<Record<NotifyPrefKey, boolean>> | null
  /** lingua dell'app: 'it' | 'en' | 'ru' */
  locale?: string | null
  invited_by: string | null
  created_at: string
  updated_at?: string
}

export type Member = Pick<Profile, 'id' | 'display_name' | 'avatar_url' | 'role' | 'status' | 'created_at'>

export interface EventRow {
  id: string
  created_by: string
  title: string
  description: string | null
  category: string
  starts_at: string
  ends_at: string | null
  effective_end: string
  city: string
  location_name: string | null
  address: string | null
  external_url: string | null
  image_path: string | null
  is_cancelled: boolean
  created_at: string
  updated_at: string
}

export interface RsvpLite {
  user_id: string
  status: RsvpStatus
  guests: number
}

export interface EventRaw extends EventRow {
  rsvps: RsvpLite[]
  event_likes: { user_id: string }[]
  saved_events: { user_id: string }[]
  comments: { count: number }[]
}

export interface EventView extends EventRaw {
  going: string[]
  maybe: string[]
  notGoing: string[]
  /** ospiti portati da chi partecipa */
  guests: number
  /** persone totali attese: partecipanti + ospiti */
  people: number
  myStatus: RsvpStatus | null
  myGuests: number
  likeCount: number
  liked: boolean
  saved: boolean
  commentCount: number
  score: number
}

export interface EventInput {
  title: string
  description: string | null
  category: string
  starts_at: string
  ends_at: string | null
  city: string
  location_name: string | null
  address: string | null
  external_url: string | null
}

export interface CommentRow {
  id: string
  event_id: string
  user_id: string
  parent_id: string | null
  body: string
  created_at: string
  edited_at: string | null
}

export type NotificationType =
  | 'new_event'
  | 'event_updated'
  | 'event_cancelled'
  | 'new_comment'
  | 'comment_reply'
  | 'friend_going'

export interface NotificationData {
  title?: string
  snippet?: string
  changes?: string[]
}

export interface NotificationRow {
  id: number
  user_id: string
  actor_id: string | null
  type: NotificationType
  event_id: string | null
  comment_id: string | null
  data: NotificationData
  read_at: string | null
  created_at: string
  event?: Pick<EventRow, 'id' | 'title' | 'image_path' | 'starts_at' | 'category'> | null
}

export interface InviteRow {
  id: string
  code: string
  created_by: string | null
  max_uses: number
  uses: number
  expires_at: string | null
  revoked_at: string | null
  created_at: string
}

export interface AdminMember extends Member {
  invited_by: string | null
  email: string | null
  last_sign_in_at: string | null
}

export interface LinkPreview {
  url: string
  title?: string
  description?: string
  image?: string
  siteName?: string
  startDate?: string
  endDate?: string
  locationName?: string
  address?: string
  city?: string
}

// Notifiche a tutti (solo amministratori)
export type BroadcastStatus = 'scheduled' | 'sending' | 'sent' | 'failed' | 'cancelled'
export type BroadcastCategory = 'weekend' | 'social' | 'events'

export interface BroadcastRow {
  id: string
  body: string
  status: BroadcastStatus
  scheduled_at: string
  sent_at: string | null
  /** persone e telefoni raggiunti, telefoni a cui è stata spedita */
  people: number | null
  delivered: number | null
  attempted: number | null
  /** 'expired' = in ritardo di ore, non è partita */
  error: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface BroadcastTemplate {
  id: string
  category: BroadcastCategory
  body: string
  position: number
  created_at: string
}

export interface BroadcastResult {
  id: string
  people: number
  delivered: number
  attempted: number
}
