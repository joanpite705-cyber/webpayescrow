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
      account_listings: {
        Row: {
          auto_replace: boolean
          category: string
          chain_key: string | null
          created_at: string
          credential_template: string[]
          crypto_type: string
          delivery_type: string
          description: string | null
          features: Json
          id: string
          images: string[]
          is_active: boolean
          platform: string
          price: number
          seller_id: string
          sold_count: number
          stock_count: number
          title: string
          updated_at: string
          warranty_hours: number
        }
        Insert: {
          auto_replace?: boolean
          category: string
          chain_key?: string | null
          created_at?: string
          credential_template?: string[]
          crypto_type?: string
          delivery_type?: string
          description?: string | null
          features?: Json
          id?: string
          images?: string[]
          is_active?: boolean
          platform: string
          price: number
          seller_id: string
          sold_count?: number
          stock_count?: number
          title: string
          updated_at?: string
          warranty_hours?: number
        }
        Update: {
          auto_replace?: boolean
          category?: string
          chain_key?: string | null
          created_at?: string
          credential_template?: string[]
          crypto_type?: string
          delivery_type?: string
          description?: string | null
          features?: Json
          id?: string
          images?: string[]
          is_active?: boolean
          platform?: string
          price?: number
          seller_id?: string
          sold_count?: number
          stock_count?: number
          title?: string
          updated_at?: string
          warranty_hours?: number
        }
        Relationships: []
      }
      app_config: {
        Row: {
          alchemy_api_key: string | null
          id: number
          updated_at: string
          walletconnect_project_id: string | null
        }
        Insert: {
          alchemy_api_key?: string | null
          id?: number
          updated_at?: string
          walletconnect_project_id?: string | null
        }
        Update: {
          alchemy_api_key?: string | null
          id?: number
          updated_at?: string
          walletconnect_project_id?: string | null
        }
        Relationships: []
      }
      balance_ledger: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          crypto_type: string
          id: string
          note: string | null
          reference_id: string | null
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          created_by?: string | null
          crypto_type: string
          id?: string
          note?: string | null
          reference_id?: string | null
          type: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          crypto_type?: string
          id?: string
          note?: string | null
          reference_id?: string | null
          type?: string
          user_id?: string
        }
        Relationships: []
      }
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
      chain_configs: {
        Row: {
          chain_id: number | null
          chain_key: string
          cold_wallet_address: string | null
          created_at: string
          display_name: string
          explorer_url: string | null
          family: string
          gas_wallet_address: string | null
          gas_wallet_private_key: string | null
          id: string
          is_active: boolean
          min_confirmations: number
          min_gas_reserve: number
          native_decimals: number
          native_symbol: string
          rpc_url: string | null
          sort_order: number
          treasury_address: string | null
          treasury_private_key: string | null
          updated_at: string
        }
        Insert: {
          chain_id?: number | null
          chain_key: string
          cold_wallet_address?: string | null
          created_at?: string
          display_name: string
          explorer_url?: string | null
          family: string
          gas_wallet_address?: string | null
          gas_wallet_private_key?: string | null
          id?: string
          is_active?: boolean
          min_confirmations?: number
          min_gas_reserve?: number
          native_decimals?: number
          native_symbol: string
          rpc_url?: string | null
          sort_order?: number
          treasury_address?: string | null
          treasury_private_key?: string | null
          updated_at?: string
        }
        Update: {
          chain_id?: number | null
          chain_key?: string
          cold_wallet_address?: string | null
          created_at?: string
          display_name?: string
          explorer_url?: string | null
          family?: string
          gas_wallet_address?: string | null
          gas_wallet_private_key?: string | null
          id?: string
          is_active?: boolean
          min_confirmations?: number
          min_gas_reserve?: number
          native_decimals?: number
          native_symbol?: string
          rpc_url?: string | null
          sort_order?: number
          treasury_address?: string | null
          treasury_private_key?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      chain_tokens: {
        Row: {
          chain_key: string
          contract_address: string
          created_at: string
          decimals: number
          id: string
          is_active: boolean
          symbol: string
        }
        Insert: {
          chain_key: string
          contract_address: string
          created_at?: string
          decimals?: number
          id?: string
          is_active?: boolean
          symbol: string
        }
        Update: {
          chain_key?: string
          contract_address?: string
          created_at?: string
          decimals?: number
          id?: string
          is_active?: boolean
          symbol?: string
        }
        Relationships: [
          {
            foreignKeyName: "chain_tokens_chain_key_fkey"
            columns: ["chain_key"]
            isOneToOne: false
            referencedRelation: "chain_configs"
            referencedColumns: ["chain_key"]
          },
        ]
      }
      connected_wallets: {
        Row: {
          address: string
          chain_id: number | null
          created_at: string
          id: string
          is_primary: boolean
          label: string | null
          network: string | null
          user_id: string
        }
        Insert: {
          address: string
          chain_id?: number | null
          created_at?: string
          id?: string
          is_primary?: boolean
          label?: string | null
          network?: string | null
          user_id: string
        }
        Update: {
          address?: string
          chain_id?: number | null
          created_at?: string
          id?: string
          is_primary?: boolean
          label?: string | null
          network?: string | null
          user_id?: string
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
          message_label: string | null
          message_type: string
          sender_id: string
        }
        Insert: {
          created_at?: string
          escrow_id: string
          id?: string
          message: string
          message_label?: string | null
          message_type?: string
          sender_id: string
        }
        Update: {
          created_at?: string
          escrow_id?: string
          id?: string
          message?: string
          message_label?: string | null
          message_type?: string
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
      escrow_releases: {
        Row: {
          content: string | null
          created_at: string
          escrow_id: string
          file_url: string | null
          id: string
          release_type: string
          requires_moderator_review: boolean
          reviewed_at: string | null
          reviewed_by: string | null
          sender_id: string
          title: string | null
          updated_at: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          escrow_id: string
          file_url?: string | null
          id?: string
          release_type?: string
          requires_moderator_review?: boolean
          reviewed_at?: string | null
          reviewed_by?: string | null
          sender_id: string
          title?: string | null
          updated_at?: string
        }
        Update: {
          content?: string | null
          created_at?: string
          escrow_id?: string
          file_url?: string | null
          id?: string
          release_type?: string
          requires_moderator_review?: boolean
          reviewed_at?: string | null
          reviewed_by?: string | null
          sender_id?: string
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "escrow_releases_escrow_id_fkey"
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
          buyer_email: string | null
          buyer_id: string | null
          buyer_username: string | null
          chain_key: string | null
          created_at: string
          created_by: string
          crypto_type: string
          description: string | null
          fee_amount: number | null
          id: string
          moderator_id: string | null
          payment_deadline: string | null
          seller_email: string | null
          seller_id: string | null
          seller_network: string | null
          seller_username: string | null
          seller_wallet_address: string | null
          status: Database["public"]["Enums"]["escrow_status"]
          title: string
          token_contract: string | null
          token_symbol: string | null
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          amount?: number
          buyer_email?: string | null
          buyer_id?: string | null
          buyer_username?: string | null
          chain_key?: string | null
          created_at?: string
          created_by: string
          crypto_type?: string
          description?: string | null
          fee_amount?: number | null
          id?: string
          moderator_id?: string | null
          payment_deadline?: string | null
          seller_email?: string | null
          seller_id?: string | null
          seller_network?: string | null
          seller_username?: string | null
          seller_wallet_address?: string | null
          status?: Database["public"]["Enums"]["escrow_status"]
          title: string
          token_contract?: string | null
          token_symbol?: string | null
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          amount?: number
          buyer_email?: string | null
          buyer_id?: string | null
          buyer_username?: string | null
          chain_key?: string | null
          created_at?: string
          created_by?: string
          crypto_type?: string
          description?: string | null
          fee_amount?: number | null
          id?: string
          moderator_id?: string | null
          payment_deadline?: string | null
          seller_email?: string | null
          seller_id?: string | null
          seller_network?: string | null
          seller_username?: string | null
          seller_wallet_address?: string | null
          status?: Database["public"]["Enums"]["escrow_status"]
          title?: string
          token_contract?: string | null
          token_symbol?: string | null
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
      keepalive_pings: {
        Row: {
          created_at: string
          id: string
          source: string
          stats: Json
        }
        Insert: {
          created_at?: string
          id?: string
          source?: string
          stats?: Json
        }
        Update: {
          created_at?: string
          id?: string
          source?: string
          stats?: Json
        }
        Relationships: []
      }
      listing_purchases: {
        Row: {
          buyer_id: string
          created_at: string
          crypto_type: string
          delivered_at: string | null
          escrow_id: string | null
          id: string
          listing_id: string
          price: number
          seller_id: string
          status: string
          stock_id: string | null
          updated_at: string
          warranty_expires_at: string | null
        }
        Insert: {
          buyer_id: string
          created_at?: string
          crypto_type: string
          delivered_at?: string | null
          escrow_id?: string | null
          id?: string
          listing_id: string
          price: number
          seller_id: string
          status?: string
          stock_id?: string | null
          updated_at?: string
          warranty_expires_at?: string | null
        }
        Update: {
          buyer_id?: string
          created_at?: string
          crypto_type?: string
          delivered_at?: string | null
          escrow_id?: string | null
          id?: string
          listing_id?: string
          price?: number
          seller_id?: string
          status?: string
          stock_id?: string | null
          updated_at?: string
          warranty_expires_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "listing_purchases_escrow_id_fkey"
            columns: ["escrow_id"]
            isOneToOne: false
            referencedRelation: "escrows"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listing_purchases_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "account_listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listing_purchases_stock_id_fkey"
            columns: ["stock_id"]
            isOneToOne: false
            referencedRelation: "listing_stock"
            referencedColumns: ["id"]
          },
        ]
      }
      listing_reviews: {
        Row: {
          buyer_id: string
          comment: string | null
          created_at: string
          id: string
          listing_id: string
          purchase_id: string
          rating: number
          seller_id: string
        }
        Insert: {
          buyer_id: string
          comment?: string | null
          created_at?: string
          id?: string
          listing_id: string
          purchase_id: string
          rating: number
          seller_id: string
        }
        Update: {
          buyer_id?: string
          comment?: string | null
          created_at?: string
          id?: string
          listing_id?: string
          purchase_id?: string
          rating?: number
          seller_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "listing_reviews_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "account_listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listing_reviews_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: true
            referencedRelation: "listing_purchases"
            referencedColumns: ["id"]
          },
        ]
      }
      listing_stock: {
        Row: {
          created_at: string
          credentials: string
          delivered_at: string | null
          id: string
          listing_id: string
          purchase_id: string | null
          seller_id: string
          status: string
        }
        Insert: {
          created_at?: string
          credentials: string
          delivered_at?: string | null
          id?: string
          listing_id: string
          purchase_id?: string | null
          seller_id: string
          status?: string
        }
        Update: {
          created_at?: string
          credentials?: string
          delivered_at?: string | null
          id?: string
          listing_id?: string
          purchase_id?: string | null
          seller_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "listing_stock_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "account_listings"
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
          paid_at: string | null
          payer_id: string | null
          payer_username: string | null
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
          paid_at?: string | null
          payer_id?: string | null
          payer_username?: string | null
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
          paid_at?: string | null
          payer_id?: string | null
          payer_username?: string | null
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
          total_sales: number
          updated_at: string
          verified_seller: boolean
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
          total_sales?: number
          updated_at?: string
          verified_seller?: boolean
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
          total_sales?: number
          updated_at?: string
          verified_seller?: boolean
        }
        Relationships: []
      }
      scam_reports: {
        Row: {
          admin_notes: string | null
          amount_lost: number | null
          created_at: string
          crypto_type: string | null
          description: string
          evidence_url: string | null
          handle: string
          id: string
          platform: string
          reporter_email: string | null
          reporter_name: string | null
          status: string
          updated_at: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          admin_notes?: string | null
          amount_lost?: number | null
          created_at?: string
          crypto_type?: string | null
          description: string
          evidence_url?: string | null
          handle: string
          id?: string
          platform: string
          reporter_email?: string | null
          reporter_name?: string | null
          status?: string
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          admin_notes?: string | null
          amount_lost?: number | null
          created_at?: string
          crypto_type?: string | null
          description?: string
          evidence_url?: string | null
          handle?: string
          id?: string
          platform?: string
          reporter_email?: string | null
          reporter_name?: string | null
          status?: string
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: []
      }
      sweep_jobs: {
        Row: {
          amount: number | null
          chain_key: string
          created_at: string
          error_message: string | null
          from_address: string
          gas_funding_tx: string | null
          id: string
          initiated_by: string | null
          status: string
          sweep_tx: string | null
          to_address: string
          token_contract: string | null
          token_symbol: string
          trigger_type: string
          updated_at: string
        }
        Insert: {
          amount?: number | null
          chain_key: string
          created_at?: string
          error_message?: string | null
          from_address: string
          gas_funding_tx?: string | null
          id?: string
          initiated_by?: string | null
          status?: string
          sweep_tx?: string | null
          to_address: string
          token_contract?: string | null
          token_symbol: string
          trigger_type?: string
          updated_at?: string
        }
        Update: {
          amount?: number | null
          chain_key?: string
          created_at?: string
          error_message?: string | null
          from_address?: string
          gas_funding_tx?: string | null
          id?: string
          initiated_by?: string | null
          status?: string
          sweep_tx?: string | null
          to_address?: string
          token_contract?: string | null
          token_symbol?: string
          trigger_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      telegram_sessions: {
        Row: {
          chat_id: string
          created_at: string
          expires_at: string
          flow: string
          id: string
          linked_profile_id: string | null
          state: Json
          step: string
          telegram_username: string | null
          updated_at: string
        }
        Insert: {
          chat_id: string
          created_at?: string
          expires_at?: string
          flow: string
          id?: string
          linked_profile_id?: string | null
          state?: Json
          step: string
          telegram_username?: string | null
          updated_at?: string
        }
        Update: {
          chat_id?: string
          created_at?: string
          expires_at?: string
          flow?: string
          id?: string
          linked_profile_id?: string | null
          state?: Json
          step?: string
          telegram_username?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      user_balances: {
        Row: {
          balance: number
          created_at: string
          crypto_type: string
          id: string
          locked_balance: number
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          created_at?: string
          crypto_type: string
          id?: string
          locked_balance?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          created_at?: string
          crypto_type?: string
          id?: string
          locked_balance?: number
          updated_at?: string
          user_id?: string
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
      get_bot_username: { Args: never; Returns: string }
      get_public_chains: {
        Args: never
        Returns: {
          chain_id: number
          chain_key: string
          display_name: string
          explorer_url: string
          family: string
          min_confirmations: number
          native_symbol: string
          sort_order: number
          treasury_address: string
        }[]
      }
      get_public_tokens: {
        Args: never
        Returns: {
          chain_key: string
          contract_address: string
          decimals: number
          symbol: string
        }[]
      }
      get_seller_stats: {
        Args: { _seller_id: string }
        Returns: {
          avg_rating: number
          review_count: number
          total_sales: number
          verified: boolean
        }[]
      }
      get_walletconnect_project_id: { Args: never; Returns: string }
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
      search_scam_reports: {
        Args: { _handle: string }
        Returns: {
          amount_lost: number
          created_at: string
          crypto_type: string
          description: string
          evidence_url: string
          handle: string
          id: string
          platform: string
          verified_at: string
        }[]
      }
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
