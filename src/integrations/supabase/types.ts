export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      bot_config: {
        Row: {
          bot_token: string | null
          bot_username: string | null
          chat_id: string | null
          created_at: string
          id: string
          is_active: boolean
          updated_at: string
        }
        Insert: {
          bot_token?: string | null
          bot_username?: string | null
          chat_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          updated_at?: string
        }
        Update: {
          bot_token?: string | null
          bot_username?: string | null
          chat_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      crypto_wallets: {
        Row: {
          created_at: string
          crypto_name: string
          id: string
          is_active: boolean
          network: string
          updated_at: string
          wallet_address: string
        }
        Insert: {
          created_at?: string
          crypto_name: string
          id?: string
          is_active?: boolean
          network: string
          updated_at?: string
          wallet_address: string
        }
        Update: {
          created_at?: string
          crypto_name?: string
          id?: string
          is_active?: boolean
          network?: string
          updated_at?: string
          wallet_address?: string
        }
        Relationships: []
      }
      disputes: {
        Row: {
          created_at: string
          escrow_id: string
          id: string
          raised_by: string
          reason: string
          resolution: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: Database["public"]["Enums"]["dispute_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          escrow_id: string
          id?: string
          raised_by: string
          reason: string
          resolution?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: Database["public"]["Enums"]["dispute_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          escrow_id?: string
          id?: string
          raised_by?: string
          reason?: string
          resolution?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: Database["public"]["Enums"]["dispute_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "disputes_escrow_id_fkey"
            columns: ["escrow_id"]
            isOneToOne: false
            referencedRelation: "escrows"
            referencedColumns: ["id"]
          },
        ]
      }
      escrow_messages: {
        Row: {
          created_at: string
          escrow_id: string
          id: string
          message: string
          sender_id: string
        }
        Insert: {
          created_at?: string
          escrow_id: string
          id?: string
          message: string
          sender_id: string
        }
        Update: {
          created_at?: string
          escrow_id?: string
          id?: string
          message?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "escrow_messages_escrow_id_fkey"
            columns: ["escrow_id"]
            isOneToOne: false
            referencedRelation: "escrows"
            referencedColumns: ["id"]
          },
        ]
      }
      escrows: {
        Row: {
          accepted_at: string | null
          amount: number
          buyer_id: string | null
          created_at: string
          created_by: string
          crypto_type: string
          description: string | null
          fee_amount: number | null
          id: string
          moderator_id: string | null
          payment_deadline: string | null
          seller_id: string | null
          seller_network: string | null
          seller_wallet_address: string | null
          status: Database["public"]["Enums"]["escrow_status"]
          title: string
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          amount?: number
          buyer_id?: string | null
          created_at?: string
          created_by: string
          crypto_type?: string
          description?: string | null
          fee_amount?: number | null
          id?: string
          moderator_id?: string | null
          payment_deadline?: string | null
          seller_id?: string | null
          seller_network?: string | null
          seller_wallet_address?: string | null
          status?: Database["public"]["Enums"]["escrow_status"]
          title: string
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          amount?: number
          buyer_id?: string | null
          created_at?: string
          created_by?: string
          crypto_type?: string
          description?: string | null
          fee_amount?: number | null
          id?: string
          moderator_id?: string | null
          payment_deadline?: string | null
          seller_id?: string | null
          seller_network?: string | null
          seller_wallet_address?: string | null
          status?: Database["public"]["Enums"]["escrow_status"]
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      feedback: {
        Row: {
          comment: string | null
          created_at: string
          escrow_id: string
          from_user: string
          id: string
          rating: string
          to_user: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          escrow_id: string
          from_user: string
          id?: string
          rating: string
          to_user: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          escrow_id?: string
          from_user?: string
          id?: string
          rating?: string
          to_user?: string
        }
        Relationships: [
          {
            foreignKeyName: "feedback_escrow_id_fkey"
            columns: ["escrow_id"]
            isOneToOne: false
            referencedRelation: "escrows"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          confirmed_at: string | null
          confirmed_by: string | null
          created_at: string
          crypto_type: string
          escrow_id: string
          id: string
          status: Database["public"]["Enums"]["payment_status"]
          tx_hash: string | null
          updated_at: string
          wallet_address: string
        }
        Insert: {
          amount: number
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          crypto_type: string
          escrow_id: string
          id?: string
          status?: Database["public"]["Enums"]["payment_status"]
          tx_hash?: string | null
          updated_at?: string
          wallet_address: string
        }
        Update: {
          amount?: number
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          crypto_type?: string
          escrow_id?: string
          id?: string
          status?: Database["public"]["Enums"]["payment_status"]
          tx_hash?: string | null
          updated_at?: string
          wallet_address?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_escrow_id_fkey"
            columns: ["escrow_id"]
            isOneToOne: false
            referencedRelation: "escrows"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_settings: {
        Row: {
          created_at: string
          fee_percentage: number
          id: number
          safety_message: string | null
          signup_link: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          fee_percentage?: number
          id: number
          safety_message?: string | null
          signup_link?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          fee_percentage?: number
          id?: number
          safety_message?: string | null
          signup_link?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          is_verified: boolean | null
          language: string | null
          negative_ratings: number | null
          positive_ratings: number | null
          telegram_chat_id: string | null
          telegram_username: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          is_verified?: boolean | null
          language?: string | null
          negative_ratings?: number | null
          positive_ratings?: number | null
          telegram_chat_id?: string | null
          telegram_username?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          is_verified?: boolean | null
          language?: string | null
          negative_ratings?: number | null
          positive_ratings?: number | null
          telegram_chat_id?: string | null
          telegram_username?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
      is_admin_or_moderator: { Args: never; Returns: boolean }
      is_escrow_party: { Args: { _escrow_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      dispute_status: "open" | "under_review" | "resolved" | "closed"
      escrow_status:
        | "pending"
        | "active"
        | "paid"
        | "confirmed"
        | "completed"
        | "disputed"
        | "cancelled"
      payment_status: "pending" | "submitted" | "confirmed" | "rejected"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "moderator", "user"],
      dispute_status: ["open", "under_review", "resolved", "closed"],
      escrow_status: [
        "pending",
        "active",
        "paid",
        "confirmed",
        "completed",
        "disputed",
        "cancelled",
      ],
      payment_status: ["pending", "submitted", "confirmed", "rejected"],
    },
  },
} as const
