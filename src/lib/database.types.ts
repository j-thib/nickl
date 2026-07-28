export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      groups: {
        Row: {
          id: string
          name: string
          invite_code: string
          created_by: string
          created_at: string
          split_mode: 'equal' | 'percentage'
        }
        Insert: {
          id?: string
          name: string
          invite_code: string
          created_by: string
          created_at?: string
          split_mode?: 'equal' | 'percentage'
        }
        Update: {
          id?: string
          name?: string
          invite_code?: string
          created_by?: string
          created_at?: string
          split_mode?: 'equal' | 'percentage'
        }
        Relationships: [
          {
            foreignKeyName: 'groups_created_by_fkey'
            columns: ['created_by']
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }
      group_members: {
        Row: {
          id: string
          group_id: string
          user_id: string
          display_name: string
          joined_at: string
          split_percentage: number | null
        }
        Insert: {
          id?: string
          group_id: string
          user_id: string
          display_name: string
          joined_at?: string
          split_percentage?: number | null
        }
        Update: {
          id?: string
          group_id?: string
          user_id?: string
          display_name?: string
          joined_at?: string
          split_percentage?: number | null
        }
        Relationships: [
          {
            foreignKeyName: 'group_members_group_id_fkey'
            columns: ['group_id']
            isOneToOne: false
            referencedRelation: 'groups'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'group_members_user_id_fkey'
            columns: ['user_id']
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }
      expense_categories: {
        Row: {
          id: string
          group_id: string
          name: string
          color: string
          icon: string
          split_mode: 'group' | 'custom'
          split_weights: Record<string, number> | null
          sort_order: number
          created_at: string
        }
        Insert: {
          id?: string
          group_id: string
          name: string
          color?: string
          icon?: string
          split_mode?: 'group' | 'custom'
          split_weights?: Record<string, number> | null
          sort_order?: number
          created_at?: string
        }
        Update: {
          id?: string
          group_id?: string
          name?: string
          color?: string
          icon?: string
          split_mode?: 'group' | 'custom'
          split_weights?: Record<string, number> | null
          sort_order?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'expense_categories_group_id_fkey'
            columns: ['group_id']
            isOneToOne: false
            referencedRelation: 'groups'
            referencedColumns: ['id']
          },
        ]
      }
      expenses: {
        Row: {
          id: string
          group_id: string
          description: string
          amount: number
          paid_by: string
          created_by: string
          created_at: string
          category_id: string | null
          spent_at: string
        }
        Insert: {
          id?: string
          group_id: string
          description: string
          amount: number
          paid_by: string
          created_by: string
          created_at?: string
          category_id?: string | null
          spent_at?: string
        }
        Update: {
          id?: string
          group_id?: string
          description?: string
          amount?: number
          paid_by?: string
          created_by?: string
          created_at?: string
          category_id?: string | null
          spent_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'expenses_group_id_fkey'
            columns: ['group_id']
            isOneToOne: false
            referencedRelation: 'groups'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'expenses_category_id_fkey'
            columns: ['category_id']
            isOneToOne: false
            referencedRelation: 'expense_categories'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'expenses_paid_by_fkey'
            columns: ['paid_by']
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'expenses_created_by_fkey'
            columns: ['created_by']
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }
      payments: {
        Row: {
          id: string
          group_id: string
          paid_by: string
          paid_to: string
          amount: number
          note: string | null
          created_by: string
          created_at: string
        }
        Insert: {
          id?: string
          group_id: string
          paid_by: string
          paid_to: string
          amount: number
          note?: string | null
          created_by: string
          created_at?: string
        }
        Update: {
          id?: string
          group_id?: string
          paid_by?: string
          paid_to?: string
          amount?: number
          note?: string | null
          created_by?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'payments_group_id_fkey'
            columns: ['group_id']
            isOneToOne: false
            referencedRelation: 'groups'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'payments_paid_by_fkey'
            columns: ['paid_by']
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'payments_paid_to_fkey'
            columns: ['paid_to']
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'payments_created_by_fkey'
            columns: ['created_by']
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }
      expense_splits: {
        Row: {
          id: string
          expense_id: string
          user_id: string
          share_amount: number
        }
        Insert: {
          id?: string
          expense_id: string
          user_id: string
          share_amount: number
        }
        Update: {
          id?: string
          expense_id?: string
          user_id?: string
          share_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: 'expense_splits_expense_id_fkey'
            columns: ['expense_id']
            isOneToOne: false
            referencedRelation: 'expenses'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'expense_splits_user_id_fkey'
            columns: ['user_id']
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: { [_ in never]: never }
    Functions: {
      is_group_member: {
        Args: { gid: string }
        Returns: boolean
      }
      join_group_by_invite: {
        Args: { invite: string; member_display_name?: string | null }
        Returns: {
          id: string
          name: string
          invite_code: string
          created_by: string
          created_at: string
        }
      }
      leave_group: {
        Args: { target_group_id: string }
        Returns: void
      }
      set_group_split_mode: {
        Args: {
          target_group_id: string
          new_mode: 'equal' | 'percentage'
          member_a_user_id?: string | null
          pct_a?: number | null
          member_b_user_id?: string | null
          pct_b?: number | null
        }
        Returns: {
          id: string
          name: string
          invite_code: string
          created_by: string
          created_at: string
          split_mode: 'equal' | 'percentage'
        }
      }
    }
    Enums: { [_ in never]: never }
    CompositeTypes: { [_ in never]: never }
  }
}

export type Group = Database['public']['Tables']['groups']['Row']
export type GroupMember = Database['public']['Tables']['group_members']['Row']
export type Expense = Database['public']['Tables']['expenses']['Row']
export type ExpenseCategory =
  Database['public']['Tables']['expense_categories']['Row']
export type ExpenseSplit = Database['public']['Tables']['expense_splits']['Row']
export type Payment = Database['public']['Tables']['payments']['Row']
