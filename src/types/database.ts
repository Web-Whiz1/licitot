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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      auction_images: {
        Row: {
          auction_id: string
          blur_data_url: string | null
          created_at: string
          file_id: string
          height: number | null
          id: string
          path: string
          position: number
          width: number | null
        }
        Insert: {
          auction_id: string
          blur_data_url?: string | null
          created_at?: string
          file_id: string
          height?: number | null
          id?: string
          path: string
          position: number
          width?: number | null
        }
        Update: {
          auction_id?: string
          blur_data_url?: string | null
          created_at?: string
          file_id?: string
          height?: number | null
          id?: string
          path?: string
          position?: number
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "auction_images_auction_id_fkey"
            columns: ["auction_id"]
            isOneToOne: false
            referencedRelation: "auctions"
            referencedColumns: ["id"]
          },
        ]
      }
      auctions: {
        Row: {
          bid_count: number
          buy_now_price: number | null
          category_id: number
          city: string
          condition: Database["public"]["Enums"]["item_condition"]
          county_code: string
          courier_cost: number | null
          created_at: string
          current_price: number
          description: string
          duration_days: number
          ends_at: string | null
          final_price: number | null
          has_reserve: boolean | null
          hidden_reason: string | null
          high_bidder_id: string | null
          id: string
          is_hidden: boolean
          min_increment: number
          original_ends_at: string | null
          published_at: string | null
          reserve_met: boolean | null
          reserve_price: number | null
          search_tsv: unknown
          seller_id: string
          ship_courier: boolean
          ship_pickup: boolean
          slug: string
          starting_price: number
          starts_at: string | null
          status: Database["public"]["Enums"]["auction_status"]
          title: string
          updated_at: string
          winner_id: string | null
        }
        Insert: {
          bid_count?: number
          buy_now_price?: number | null
          category_id: number
          city: string
          condition: Database["public"]["Enums"]["item_condition"]
          county_code: string
          courier_cost?: number | null
          created_at?: string
          current_price?: number
          description: string
          duration_days: number
          ends_at?: string | null
          final_price?: number | null
          has_reserve?: boolean | null
          hidden_reason?: string | null
          high_bidder_id?: string | null
          id?: string
          is_hidden?: boolean
          min_increment: number
          original_ends_at?: string | null
          published_at?: string | null
          reserve_met?: boolean | null
          reserve_price?: number | null
          search_tsv?: unknown
          seller_id?: string
          ship_courier?: boolean
          ship_pickup?: boolean
          slug?: string
          starting_price: number
          starts_at?: string | null
          status?: Database["public"]["Enums"]["auction_status"]
          title: string
          updated_at?: string
          winner_id?: string | null
        }
        Update: {
          bid_count?: number
          buy_now_price?: number | null
          category_id?: number
          city?: string
          condition?: Database["public"]["Enums"]["item_condition"]
          county_code?: string
          courier_cost?: number | null
          created_at?: string
          current_price?: number
          description?: string
          duration_days?: number
          ends_at?: string | null
          final_price?: number | null
          has_reserve?: boolean | null
          hidden_reason?: string | null
          high_bidder_id?: string | null
          id?: string
          is_hidden?: boolean
          min_increment?: number
          original_ends_at?: string | null
          published_at?: string | null
          reserve_met?: boolean | null
          reserve_price?: number | null
          search_tsv?: unknown
          seller_id?: string
          ship_courier?: boolean
          ship_pickup?: boolean
          slug?: string
          starting_price?: number
          starts_at?: string | null
          status?: Database["public"]["Enums"]["auction_status"]
          title?: string
          updated_at?: string
          winner_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "auctions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auctions_county_code_fkey"
            columns: ["county_code"]
            isOneToOne: false
            referencedRelation: "counties"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "auctions_high_bidder_id_fkey"
            columns: ["high_bidder_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auctions_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auctions_winner_id_fkey"
            columns: ["winner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      auto_bids: {
        Row: {
          auction_id: string
          bidder_id: string
          created_at: string
          max_amount: number
          updated_at: string
        }
        Insert: {
          auction_id: string
          bidder_id: string
          created_at?: string
          max_amount: number
          updated_at?: string
        }
        Update: {
          auction_id?: string
          bidder_id?: string
          created_at?: string
          max_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "auto_bids_auction_id_fkey"
            columns: ["auction_id"]
            isOneToOne: false
            referencedRelation: "auctions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auto_bids_bidder_id_fkey"
            columns: ["bidder_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      bids: {
        Row: {
          amount: number
          auction_id: string
          bidder_id: string
          created_at: string
          id: number
          is_auto: boolean
        }
        Insert: {
          amount: number
          auction_id: string
          bidder_id: string
          created_at?: string
          id?: never
          is_auto?: boolean
        }
        Update: {
          amount?: number
          auction_id?: string
          bidder_id?: string
          created_at?: string
          id?: never
          is_auto?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "bids_auction_id_fkey"
            columns: ["auction_id"]
            isOneToOne: false
            referencedRelation: "auctions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bids_bidder_id_fkey"
            columns: ["bidder_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string
          icon: string | null
          id: number
          name: string
          parent_id: number | null
          slug: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          icon?: string | null
          id?: never
          name: string
          parent_id?: number | null
          slug: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          icon?: string | null
          id?: never
          name?: string
          parent_id?: number | null
          slug?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      counties: {
        Row: {
          code: string
          name: string
        }
        Insert: {
          code: string
          name: string
        }
        Update: {
          code?: string
          name?: string
        }
        Relationships: []
      }
      orders: {
        Row: {
          auction_id: string
          buyer_id: string
          cancelled_at: string | null
          completed_at: string | null
          created_at: string
          delivery_method: Database["public"]["Enums"]["delivery_method"] | null
          id: string
          item_price: number
          paid_at: string | null
          payment_due_at: string
          platform_fee: number
          seller_id: string
          shipped_at: string | null
          shipping_cost: number
          status: Database["public"]["Enums"]["order_status"]
          stripe_checkout_session_id: string | null
          stripe_payment_intent_id: string | null
          total: number | null
          updated_at: string
        }
        Insert: {
          auction_id: string
          buyer_id: string
          cancelled_at?: string | null
          completed_at?: string | null
          created_at?: string
          delivery_method?:
            | Database["public"]["Enums"]["delivery_method"]
            | null
          id?: string
          item_price: number
          paid_at?: string | null
          payment_due_at: string
          platform_fee: number
          seller_id: string
          shipped_at?: string | null
          shipping_cost?: number
          status?: Database["public"]["Enums"]["order_status"]
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          total?: number | null
          updated_at?: string
        }
        Update: {
          auction_id?: string
          buyer_id?: string
          cancelled_at?: string | null
          completed_at?: string | null
          created_at?: string
          delivery_method?:
            | Database["public"]["Enums"]["delivery_method"]
            | null
          id?: string
          item_price?: number
          paid_at?: string | null
          payment_due_at?: string
          platform_fee?: number
          seller_id?: string
          shipped_at?: string | null
          shipping_cost?: number
          status?: Database["public"]["Enums"]["order_status"]
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          total?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_auction_id_fkey"
            columns: ["auction_id"]
            isOneToOne: true
            referencedRelation: "auctions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_path: string | null
          banned_at: string | null
          bio: string | null
          city: string | null
          county_code: string | null
          created_at: string
          display_name: string
          id: string
          is_banned: boolean
          rating_avg: number | null
          rating_count: number
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
          username: string
        }
        Insert: {
          avatar_path?: string | null
          banned_at?: string | null
          bio?: string | null
          city?: string | null
          county_code?: string | null
          created_at?: string
          display_name: string
          id: string
          is_banned?: boolean
          rating_avg?: number | null
          rating_count?: number
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
          username: string
        }
        Update: {
          avatar_path?: string | null
          banned_at?: string | null
          bio?: string | null
          city?: string | null
          county_code?: string | null
          created_at?: string
          display_name?: string
          id?: string
          is_banned?: boolean
          rating_avg?: number | null
          rating_count?: number
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_county_code_fkey"
            columns: ["county_code"]
            isOneToOne: false
            referencedRelation: "counties"
            referencedColumns: ["code"]
          },
        ]
      }
      profiles_private: {
        Row: {
          created_at: string
          id: string
          phone: string | null
          phone_verified_at: string | null
          stripe_account_id: string | null
          stripe_charges_enabled: boolean
          stripe_details_submitted: boolean
          stripe_payouts_enabled: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          id: string
          phone?: string | null
          phone_verified_at?: string | null
          stripe_account_id?: string | null
          stripe_charges_enabled?: boolean
          stripe_details_submitted?: boolean
          stripe_payouts_enabled?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          phone?: string | null
          phone_verified_at?: string | null
          stripe_account_id?: string | null
          stripe_charges_enabled?: boolean
          stripe_details_submitted?: boolean
          stripe_payouts_enabled?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_private_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      watchlist: {
        Row: {
          auction_id: string
          created_at: string
          user_id: string
        }
        Insert: {
          auction_id: string
          created_at?: string
          user_id?: string
        }
        Update: {
          auction_id?: string
          created_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "watchlist_auction_id_fkey"
            columns: ["auction_id"]
            isOneToOne: false
            referencedRelation: "auctions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "watchlist_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      buy_now: { Args: { p_auction_id: string }; Returns: Json }
      cancel_auction: { Args: { p_auction_id: string }; Returns: undefined }
      cancel_unpaid_order: { Args: { p_order_id: string }; Returns: undefined }
      choose_delivery: {
        Args: {
          p_method: Database["public"]["Enums"]["delivery_method"]
          p_order_id: string
        }
        Returns: {
          auction_id: string
          buyer_id: string
          cancelled_at: string | null
          completed_at: string | null
          created_at: string
          delivery_method: Database["public"]["Enums"]["delivery_method"] | null
          id: string
          item_price: number
          paid_at: string | null
          payment_due_at: string
          platform_fee: number
          seller_id: string
          shipped_at: string | null
          shipping_cost: number
          status: Database["public"]["Enums"]["order_status"]
          stripe_checkout_session_id: string | null
          stripe_payment_intent_id: string | null
          total: number | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "orders"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      confirm_order_received: {
        Args: { p_order_id: string }
        Returns: undefined
      }
      get_auction_bids: {
        Args: { p_auction_id: string; p_limit?: number }
        Returns: {
          amount: number
          bidder: string
          created_at: string
          id: number
          is_auto: boolean
          is_mine: boolean
        }[]
      }
      get_auction_reserve: { Args: { p_auction_id: string }; Returns: number }
      get_order_contact: {
        Args: { p_order_id: string }
        Returns: {
          display_name: string
          email: string
          phone: string
          username: string
        }[]
      }
      is_admin: { Args: never; Returns: boolean }
      mark_order_shipped: { Args: { p_order_id: string }; Returns: undefined }
      order_attach_checkout: {
        Args: { p_order_id: string; p_session_id: string }
        Returns: undefined
      }
      order_mark_paid: {
        Args: {
          p_amount: number
          p_order_id: string
          p_payment_intent_id: string
          p_session_id: string
        }
        Returns: boolean
      }
      place_bid: {
        Args: { p_auction_id: string; p_max_amount: number }
        Returns: Json
      }
      publish_auction: {
        Args: { p_auction_id: string }
        Returns: {
          bid_count: number
          buy_now_price: number | null
          category_id: number
          city: string
          condition: Database["public"]["Enums"]["item_condition"]
          county_code: string
          courier_cost: number | null
          created_at: string
          current_price: number
          description: string
          duration_days: number
          ends_at: string | null
          final_price: number | null
          has_reserve: boolean | null
          hidden_reason: string | null
          high_bidder_id: string | null
          id: string
          is_hidden: boolean
          min_increment: number
          original_ends_at: string | null
          published_at: string | null
          reserve_met: boolean | null
          reserve_price: number | null
          search_tsv: unknown
          seller_id: string
          ship_courier: boolean
          ship_pickup: boolean
          slug: string
          starting_price: number
          starts_at: string | null
          status: Database["public"]["Enums"]["auction_status"]
          title: string
          updated_at: string
          winner_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "auctions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      rate_limit_hit: {
        Args: { p_key: string; p_limit: number; p_window_seconds: number }
        Returns: boolean
      }
      replace_auction_images: {
        Args: { p_auction_id: string; p_images: Json }
        Returns: undefined
      }
      set_stripe_account: {
        Args: { p_account_id: string; p_user_id: string }
        Returns: string
      }
      stripe_event_once: {
        Args: { p_event_id: string; p_type: string }
        Returns: boolean
      }
      stripe_event_release: { Args: { p_event_id: string }; Returns: undefined }
      sync_stripe_account: {
        Args: {
          p_account_id: string
          p_charges_enabled: boolean
          p_details_submitted: boolean
          p_payouts_enabled: boolean
        }
        Returns: undefined
      }
    }
    Enums: {
      auction_status:
        | "draft"
        | "active"
        | "ended_sold"
        | "ended_unsold"
        | "cancelled"
      delivery_method: "pickup" | "courier"
      item_condition: "nou" | "ca_nou" | "folosit" | "pentru_piese"
      order_status:
        | "pending_payment"
        | "paid"
        | "shipped"
        | "completed"
        | "cancelled"
      user_role: "user" | "admin"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      auction_status: [
        "draft",
        "active",
        "ended_sold",
        "ended_unsold",
        "cancelled",
      ],
      delivery_method: ["pickup", "courier"],
      item_condition: ["nou", "ca_nou", "folosit", "pentru_piese"],
      order_status: [
        "pending_payment",
        "paid",
        "shipped",
        "completed",
        "cancelled",
      ],
      user_role: ["user", "admin"],
    },
  },
} as const
