// ============================================================================
// DATABASE SCHEMA TYPES
// ============================================================================

export interface Database {
  public: {
    Tables: {
      trainers: {
        Row: Trainer
        Insert: CreateTrainerInput
        Update: UpdateTrainerInput
      }
      clients: {
        Row: Client
        Insert: CreateClientInput
        Update: UpdateClientInput
      }
      packages: {
        Row: Package
        Insert: CreatePackageInput
        Update: UpdatePackageInput
      }
      purchases: {
        Row: Purchase
        Insert: CreatePurchaseInput
        Update: UpdatePurchaseInput
      }
      sessions: {
        Row: Session
        Insert: CreateSessionInput
        Update: UpdateSessionInput
      }
    }
    Views: {
      client_summary: {
        Row: ClientSummary
      }
    }
  }
}

// ============================================================================
// CORE TABLE INTERFACES
// ============================================================================

export interface Trainer {
  id: string // UUID
  email: string
  name: string
  created_at: string // ISO 8601 timestamp
}

export interface Client {
  id: string // UUID
  trainer_id: string // UUID (foreign key to trainers.id)
  name: string
  phone?: string
  email?: string
  qr_code?: string
  created_at: string // ISO 8601 timestamp
}

export interface Package {
  id: string // UUID
  trainer_id: string // UUID (foreign key to trainers.id)
  name: string
  session_count: number
  price: number // Decimal stored as number
  created_at: string // ISO 8601 timestamp
}

export interface Purchase {
  id: string // UUID
  client_id: string // UUID (foreign key to clients.id)
  package_id: string // UUID (foreign key to packages.id)
  remaining_sessions: number
  purchase_date: string // ISO 8601 timestamp
}

export interface Session {
  id: string // UUID
  client_id: string // UUID (foreign key to clients.id)
  trainer_id: string // UUID (foreign key to trainers.id)
  check_in_time: string // ISO 8601 timestamp
}

// ============================================================================
// VIEW INTERFACES
// ============================================================================

export interface ClientSummary {
  client_id: string // UUID
  client_name: string
  client_email?: string
  client_phone?: string
  trainer_name: string
  total_remaining_sessions: number
  total_sessions_attended: number
}

// ============================================================================
// CREATE INPUT TYPES (for forms and API)
// ============================================================================

export interface CreateTrainerInput {
  email: string
  name: string
}

export interface CreateClientInput {
  trainer_id: string // UUID
  name: string
  phone?: string
  email?: string
  qr_code?: string
}

export interface CreatePackageInput {
  trainer_id: string // UUID
  name: string
  session_count: number
  price: number
}

export interface CreatePurchaseInput {
  client_id: string // UUID
  package_id: string // UUID
  remaining_sessions: number
}

export interface CreateSessionInput {
  client_id: string // UUID
  trainer_id: string // UUID
}

// ============================================================================
// UPDATE INPUT TYPES (for forms and API)
// ============================================================================

export interface UpdateTrainerInput {
  email?: string
  name?: string
}

export interface UpdateClientInput {
  trainer_id?: string // UUID
  name?: string
  phone?: string
  email?: string
  qr_code?: string
}

export interface UpdatePackageInput {
  trainer_id?: string // UUID
  name?: string
  session_count?: number
  price?: number
}

export interface UpdatePurchaseInput {
  client_id?: string // UUID
  package_id?: string // UUID
  remaining_sessions?: number
}

export interface UpdateSessionInput {
  client_id?: string // UUID
  trainer_id?: string // UUID
  check_in_time?: string
}

// ============================================================================
// FORM TYPES (for React Hook Form and validation)
// ============================================================================

export interface LoginFormData {
  email: string
  password: string
}

export interface RegisterFormData {
  name: string
  email: string
  password: string
  confirmPassword: string
}

export interface ClientFormData {
  name: string
  email?: string
  phone?: string
}

export interface PackageFormData {
  name: string
  session_count: number
  price: number
}

export interface PurchaseFormData {
  client_id: string
  package_id: string
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

// ============================================================================
// DASHBOARD STATS TYPES
// ============================================================================

export interface DashboardStats {
  totalClients: number
  activePackages: number
  todaySessions: number
  monthlyRevenue: number
  recentActivity: ActivityItem[]
}

export interface ActivityItem {
  id: string
  type: 'check_in' | 'purchase' | 'client_added' | 'package_created'
  description: string
  timestamp: string
  client_name?: string
  trainer_name?: string
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

export type UUID = string
export type Timestamp = string // ISO 8601 format
export type Email = string
export type Phone = string

// Type guards
export function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(uuid)
}

export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export function isValidPhone(phone: string): boolean {
  const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/
  return phoneRegex.test(phone.replace(/\s/g, ''))
}

// Form Types
export interface LoginFormData {
  email: string
  password: string
}

export interface RegisterFormData {
  name: string
  email: string
  password: string
}

export interface ClientFormData {
  name: string
  email?: string
  phone?: string
}

export interface PackageFormData {
  name: string
  session_count: number
  price: number
}

// API Response Types
export interface ApiResponse<T> {
  data?: T
  error?: string
  success: boolean
}

// Dashboard Stats Types
export interface DashboardStats {
  totalClients: number
  activePackages: number
  todaySessions: number
  monthlyRevenue: number
}

// Client Summary Type (from the view)
export interface ClientSummary {
  client_id: string
  client_name: string
  client_email?: string
  client_phone?: string
  trainer_name: string
  total_remaining_sessions: number
  total_sessions_attended: number
} 