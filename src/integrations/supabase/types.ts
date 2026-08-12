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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      addresses: {
        Row: {
          created_at: string
          formatted_address: string
          id: string
          is_default: boolean
          label: string | null
          lat: number | null
          lng: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          formatted_address: string
          id?: string
          is_default?: boolean
          label?: string | null
          lat?: number | null
          lng?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          formatted_address?: string
          id?: string
          is_default?: boolean
          label?: string | null
          lat?: number | null
          lng?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      cylinder_sizes: {
        Row: {
          base_price: number
          label: string
          size: Database["public"]["Enums"]["cylinder_size"]
        }
        Insert: {
          base_price: number
          label: string
          size: Database["public"]["Enums"]["cylinder_size"]
        }
        Update: {
          base_price?: number
          label?: string
          size?: Database["public"]["Enums"]["cylinder_size"]
        }
        Relationships: []
      }
      driver_locations: {
        Row: {
          driver_id: string
          lat: number
          lng: number
          updated_at: string
        }
        Insert: {
          driver_id: string
          lat: number
          lng: number
          updated_at?: string
        }
        Update: {
          driver_id?: string
          lat?: number
          lng?: number
          updated_at?: string
        }
        Relationships: []
      }
      loyalty_credits: {
        Row: {
          credits: number
          customer_id: string
          free_cylinders_redeemed: number
          lifetime_earned: number
          updated_at: string
        }
        Insert: {
          credits?: number
          customer_id: string
          free_cylinders_redeemed?: number
          lifetime_earned?: number
          updated_at?: string
        }
        Update: {
          credits?: number
          customer_id?: string
          free_cylinders_redeemed?: number
          lifetime_earned?: number
          updated_at?: string
        }
        Relationships: []
      }
      loyalty_events: {
        Row: {
          amount: number
          created_at: string
          customer_id: string
          id: string
          order_id: string | null
          type: Database["public"]["Enums"]["loyalty_event_type"]
        }
        Insert: {
          amount?: number
          created_at?: string
          customer_id: string
          id?: string
          order_id?: string | null
          type: Database["public"]["Enums"]["loyalty_event_type"]
        }
        Update: {
          amount?: number
          created_at?: string
          customer_id?: string
          id?: string
          order_id?: string | null
          type?: Database["public"]["Enums"]["loyalty_event_type"]
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          read: boolean
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          read?: boolean
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          read?: boolean
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      order_events: {
        Row: {
          actor_id: string | null
          created_at: string
          id: string
          lat: number | null
          lng: number | null
          note: string | null
          order_id: string
          status: Database["public"]["Enums"]["order_status"]
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          id?: string
          lat?: number | null
          lng?: number | null
          note?: string | null
          order_id: string
          status: Database["public"]["Enums"]["order_status"]
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          id?: string
          lat?: number | null
          lng?: number | null
          note?: string | null
          order_id?: string
          status?: Database["public"]["Enums"]["order_status"]
        }
        Relationships: [
          {
            foreignKeyName: "order_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          address_id: string | null
          address_snapshot: string
          created_at: string
          customer_id: string
          cylinder_size: Database["public"]["Enums"]["cylinder_size"]
          driver_id: string | null
          eta: string | null
          id: string
          lat: number | null
          lng: number | null
          loyalty_applied: boolean
          notes: string | null
          payment_status: Database["public"]["Enums"]["payment_status"]
          qty: number
          status: Database["public"]["Enums"]["order_status"]
          subscription_id: string | null
          subtotal: number
          total: number
          updated_at: string
          urgent: boolean
        }
        Insert: {
          address_id?: string | null
          address_snapshot: string
          created_at?: string
          customer_id: string
          cylinder_size: Database["public"]["Enums"]["cylinder_size"]
          driver_id?: string | null
          eta?: string | null
          id?: string
          lat?: number | null
          lng?: number | null
          loyalty_applied?: boolean
          notes?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          qty?: number
          status?: Database["public"]["Enums"]["order_status"]
          subscription_id?: string | null
          subtotal?: number
          total?: number
          updated_at?: string
          urgent?: boolean
        }
        Update: {
          address_id?: string | null
          address_snapshot?: string
          created_at?: string
          customer_id?: string
          cylinder_size?: Database["public"]["Enums"]["cylinder_size"]
          driver_id?: string | null
          eta?: string | null
          id?: string
          lat?: number | null
          lng?: number | null
          loyalty_applied?: boolean
          notes?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          qty?: number
          status?: Database["public"]["Enums"]["order_status"]
          subscription_id?: string | null
          subtotal?: number
          total?: number
          updated_at?: string
          urgent?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "orders_address_id_fkey"
            columns: ["address_id"]
            isOneToOne: false
            referencedRelation: "addresses"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      proof_of_delivery: {
        Row: {
          delivered_at: string
          driver_id: string | null
          id: string
          order_id: string
          photo_url: string | null
          signature_url: string | null
        }
        Insert: {
          delivered_at?: string
          driver_id?: string | null
          id?: string
          order_id: string
          photo_url?: string | null
          signature_url?: string | null
        }
        Update: {
          delivered_at?: string
          driver_id?: string | null
          id?: string
          order_id?: string
          photo_url?: string | null
          signature_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "proof_of_delivery_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_refills: {
        Row: {
          created_at: string
          id: string
          order_id: string | null
          scheduled_date: string
          status: Database["public"]["Enums"]["refill_status"]
          subscription_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          order_id?: string | null
          scheduled_date: string
          status?: Database["public"]["Enums"]["refill_status"]
          subscription_id: string
        }
        Update: {
          created_at?: string
          id?: string
          order_id?: string | null
          scheduled_date?: string
          status?: Database["public"]["Enums"]["refill_status"]
          subscription_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_refills_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_refills_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          address_id: string | null
          billing_cycle: Database["public"]["Enums"]["billing_cycle"]
          created_at: string
          customer_id: string
          cylinder_size: Database["public"]["Enums"]["cylinder_size"]
          id: string
          monthly_price: number
          next_refill_date: string
          plan: Database["public"]["Enums"]["subscription_plan"]
          status: Database["public"]["Enums"]["subscription_status"]
          updated_at: string
          usage_frequency_days: number
        }
        Insert: {
          address_id?: string | null
          billing_cycle?: Database["public"]["Enums"]["billing_cycle"]
          created_at?: string
          customer_id: string
          cylinder_size: Database["public"]["Enums"]["cylinder_size"]
          id?: string
          monthly_price?: number
          next_refill_date?: string
          plan: Database["public"]["Enums"]["subscription_plan"]
          status?: Database["public"]["Enums"]["subscription_status"]
          updated_at?: string
          usage_frequency_days?: number
        }
        Update: {
          address_id?: string | null
          billing_cycle?: Database["public"]["Enums"]["billing_cycle"]
          created_at?: string
          customer_id?: string
          cylinder_size?: Database["public"]["Enums"]["cylinder_size"]
          id?: string
          monthly_price?: number
          next_refill_date?: string
          plan?: Database["public"]["Enums"]["subscription_plan"]
          status?: Database["public"]["Enums"]["subscription_status"]
          updated_at?: string
          usage_frequency_days?: number
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_address_id_fkey"
            columns: ["address_id"]
            isOneToOne: false
            referencedRelation: "addresses"
            referencedColumns: ["id"]
          },
        ]
      }
      support_messages: {
        Row: {
          created_at: string
          from_role: Database["public"]["Enums"]["app_role"]
          id: string
          message: string
          user_id: string
        }
        Insert: {
          created_at?: string
          from_role: Database["public"]["Enums"]["app_role"]
          id?: string
          message: string
          user_id: string
        }
        Update: {
          created_at?: string
          from_role?: Database["public"]["Enums"]["app_role"]
          id?: string
          message?: string
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
          role: Database["public"]["Enums"]["app_role"]
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
    }
    Enums: {
      app_role: "customer" | "driver" | "admin"
      billing_cycle: "monthly" | "quarterly" | "annual"
      cylinder_size: "kg9" | "kg19" | "kg48"
      loyalty_event_type: "earn" | "redeem"
      order_status:
        | "pending"
        | "assigned"
        | "en_route"
        | "arriving"
        | "delivered"
        | "cancelled"
      payment_status: "unpaid" | "mock_paid" | "refunded"
      refill_status: "scheduled" | "in_progress" | "completed" | "skipped"
      subscription_plan: "plan_2" | "plan_3"
      subscription_status: "active" | "paused" | "cancelled"
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
      app_role: ["customer", "driver", "admin"],
      billing_cycle: ["monthly", "quarterly", "annual"],
      cylinder_size: ["kg9", "kg19", "kg48"],
      loyalty_event_type: ["earn", "redeem"],
      order_status: [
        "pending",
        "assigned",
        "en_route",
        "arriving",
        "delivered",
        "cancelled",
      ],
      payment_status: ["unpaid", "mock_paid", "refunded"],
      refill_status: ["scheduled", "in_progress", "completed", "skipped"],
      subscription_plan: ["plan_2", "plan_3"],
      subscription_status: ["active", "paused", "cancelled"],
    },
  },
} as const
