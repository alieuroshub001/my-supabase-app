// types/database.ts
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string
          avatar_url: string | null
          phone: string | null
          department: string | null
          role: 'admin' | 'hr' | 'team' | 'client'
          job_title: string | null
          hire_date: string | null
          is_active: boolean
          timezone: string
          bio: string | null
          skills: string[] | null
          emergency_contact: Json | null
          address: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name: string
          avatar_url?: string | null
          phone?: string | null
          department?: string | null
          role?: 'admin' | 'hr' | 'team' | 'client'
          job_title?: string | null
          hire_date?: string | null
          is_active?: boolean
          timezone?: string
          bio?: string | null
          skills?: string[] | null
          emergency_contact?: Json | null
          address?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string
          avatar_url?: string | null
          phone?: string | null
          department?: string | null
          role?: 'admin' | 'hr' | 'team' | 'client'
          job_title?: string | null
          hire_date?: string | null
          is_active?: boolean
          timezone?: string
          bio?: string | null
          skills?: string[] | null
          emergency_contact?: Json | null
          address?: Json | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      leave_balances: {
        Row: {
          id: string
          user_id: string
          leave_type: 'casual' | 'sick' | 'annual' | 'maternity' | 'paternity'
          total_days: number
          used_days: number
          remaining_days: number
          year: number
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          leave_type: 'casual' | 'sick' | 'annual' | 'maternity' | 'paternity'
          total_days?: number
          used_days?: number
          remaining_days?: number
          year?: number
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          leave_type?: 'casual' | 'sick' | 'annual' | 'maternity' | 'paternity'
          total_days?: number
          used_days?: number
          remaining_days?: number
          year?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leave_balances_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      projects: {
        Row: {
          id: string
          title: string
          description: string | null
          owner_id: string | null
          status: 'active' | 'on_hold' | 'completed' | 'archived'
          priority: 'low' | 'medium' | 'high' | 'urgent'
          start_date: string | null
          end_date: string | null
          estimated_hours: number | null
          actual_hours: number
          budget: number | null
          is_public: boolean
          tags: string[] | null
          color: string
          progress: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          owner_id?: string | null
          status?: 'active' | 'on_hold' | 'completed' | 'archived'
          priority?: 'low' | 'medium' | 'high' | 'urgent'
          start_date?: string | null
          end_date?: string | null
          estimated_hours?: number | null
          actual_hours?: number
          budget?: number | null
          is_public?: boolean
          tags?: string[] | null
          color?: string
          progress?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          owner_id?: string | null
          status?: 'active' | 'on_hold' | 'completed' | 'archived'
          priority?: 'low' | 'medium' | 'high' | 'urgent'
          start_date?: string | null
          end_date?: string | null
          estimated_hours?: number | null
          actual_hours?: number
          budget?: number | null
          is_public?: boolean
          tags?: string[] | null
          color?: string
          progress?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      tasks: {
        Row: {
          id: string
          project_id: string | null
          title: string
          description: string | null
          status: 'todo' | 'in_progress' | 'in_review' | 'done'
          priority: 'low' | 'medium' | 'high' | 'urgent'
          assignee_id: string | null
          reporter_id: string | null
          due_date: string | null
          estimated_hours: number | null
          actual_hours: number
          story_points: number | null
          position: number | null
          parent_task_id: string | null
          tags: string[] | null
          checklist: Json | null
          custom_fields: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          project_id?: string | null
          title: string
          description?: string | null
          status?: 'todo' | 'in_progress' | 'in_review' | 'done'
          priority?: 'low' | 'medium' | 'high' | 'urgent'
          assignee_id?: string | null
          reporter_id?: string | null
          due_date?: string | null
          estimated_hours?: number | null
          actual_hours?: number
          story_points?: number | null
          position?: number | null
          parent_task_id?: string | null
          tags?: string[] | null
          checklist?: Json | null
          custom_fields?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          project_id?: string | null
          title?: string
          description?: string | null
          status?: 'todo' | 'in_progress' | 'in_review' | 'done'
          priority?: 'low' | 'medium' | 'high' | 'urgent'
          assignee_id?: string | null
          reporter_id?: string | null
          due_date?: string | null
          estimated_hours?: number | null
          actual_hours?: number
          story_points?: number | null
          position?: number | null
          parent_task_id?: string | null
          tags?: string[] | null
          checklist?: Json | null
          custom_fields?: Json | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_assignee_id_fkey"
            columns: ["assignee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      user_role: 'admin' | 'hr' | 'team' | 'client'
      task_priority: 'low' | 'medium' | 'high' | 'urgent'
      task_status: 'todo' | 'in_progress' | 'in_review' | 'done'
      project_status: 'active' | 'on_hold' | 'completed' | 'archived'
      leave_status: 'pending' | 'approved' | 'rejected'
      leave_type: 'casual' | 'sick' | 'annual' | 'maternity' | 'paternity'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

export type UserRole = Database['public']['Enums']['user_role']
export type TaskPriority = Database['public']['Enums']['task_priority']
export type TaskStatus = Database['public']['Enums']['task_status']
export type ProjectStatus = Database['public']['Enums']['project_status']
export type LeaveStatus = Database['public']['Enums']['leave_status']
export type LeaveType = Database['public']['Enums']['leave_type']