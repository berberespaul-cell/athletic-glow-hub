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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      benchmarks: {
        Row: {
          created_at: string | null
          gender: string
          id: string
          level: string
          mean_value: number
          source: string | null
          sport: Database["public"]["Enums"]["sport_type"]
          std_dev: number
          test_id: string | null
        }
        Insert: {
          created_at?: string | null
          gender?: string
          id?: string
          level: string
          mean_value: number
          source?: string | null
          sport: Database["public"]["Enums"]["sport_type"]
          std_dev: number
          test_id?: string | null
        }
        Update: {
          created_at?: string | null
          gender?: string
          id?: string
          level?: string
          mean_value?: number
          source?: string | null
          sport?: Database["public"]["Enums"]["sport_type"]
          std_dev?: number
          test_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "benchmarks_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "test_library"
            referencedColumns: ["id"]
          },
        ]
      }
      coach_athletes: {
        Row: {
          athlete_id: string
          coach_id: string
          created_at: string | null
          id: string
        }
        Insert: {
          athlete_id: string
          coach_id: string
          created_at?: string | null
          id?: string
        }
        Update: {
          athlete_id?: string
          coach_id?: string
          created_at?: string | null
          id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          birth_date: string | null
          created_at: string | null
          height_cm: number | null
          id: string
          name: string
          position: string | null
          sport: Database["public"]["Enums"]["sport_type"]
          updated_at: string | null
          user_id: string
          weight_kg: number | null
        }
        Insert: {
          birth_date?: string | null
          created_at?: string | null
          height_cm?: number | null
          id?: string
          name: string
          position?: string | null
          sport?: Database["public"]["Enums"]["sport_type"]
          updated_at?: string | null
          user_id: string
          weight_kg?: number | null
        }
        Update: {
          birth_date?: string | null
          created_at?: string | null
          height_cm?: number | null
          id?: string
          name?: string
          position?: string | null
          sport?: Database["public"]["Enums"]["sport_type"]
          updated_at?: string | null
          user_id?: string
          weight_kg?: number | null
        }
        Relationships: []
      }
      results: {
        Row: {
          created_at: string | null
          id: string
          notes: string | null
          profile_id: string
          reps: number | null
          session_date: string
          test_id: string
          value: number
          wellness_fatigue: number | null
          wellness_score: number | null
          wellness_sleep: number | null
          wellness_soreness: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          notes?: string | null
          profile_id: string
          reps?: number | null
          session_date: string
          test_id: string
          value: number
          wellness_fatigue?: number | null
          wellness_score?: number | null
          wellness_sleep?: number | null
          wellness_soreness?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          notes?: string | null
          profile_id?: string
          reps?: number | null
          session_date?: string
          test_id?: string
          value?: number
          wellness_fatigue?: number | null
          wellness_score?: number | null
          wellness_sleep?: number | null
          wellness_soreness?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "results_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "results_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "test_library"
            referencedColumns: ["id"]
          },
        ]
      }
      test_library: {
        Row: {
          created_at: string | null
          description: string | null
          family: Database["public"]["Enums"]["test_family"]
          id: string
          is_custom: boolean | null
          name: string
          protocol_url: string | null
          sports: Database["public"]["Enums"]["sport_type"][]
          unit: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          family: Database["public"]["Enums"]["test_family"]
          id?: string
          is_custom?: boolean | null
          name: string
          protocol_url?: string | null
          sports: Database["public"]["Enums"]["sport_type"][]
          unit: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          family?: Database["public"]["Enums"]["test_family"]
          id?: string
          is_custom?: boolean | null
          name?: string
          protocol_url?: string | null
          sports?: Database["public"]["Enums"]["sport_type"][]
          unit?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
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
      get_profile_user_id: { Args: { _profile_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_coach_of_athlete: {
        Args: { _athlete_id: string; _coach_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "athlete" | "coach"
      sport_type: "rugby" | "basketball" | "volleyball" | "hybrid"
      test_family:
        | "anthropometric"
        | "jumps"
        | "vma"
        | "sprints"
        | "run"
        | "strength"
        | "streetlifting"
        | "weightlifting"
        | "change_of_direction"
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
      app_role: ["athlete", "coach"],
      sport_type: ["rugby", "basketball", "volleyball", "hybrid"],
      test_family: [
        "anthropometric",
        "jumps",
        "vma",
        "sprints",
        "run",
        "strength",
        "streetlifting",
        "weightlifting",
        "change_of_direction",
      ],
    },
  },
} as const
