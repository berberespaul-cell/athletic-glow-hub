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
          coach_created_by: string | null
          created_at: string | null
          height_cm: number | null
          id: string
          invite_code: string | null
          name: string
          position: string | null
          sex: string | null
          sport: Database["public"]["Enums"]["sport_type"]
          updated_at: string | null
          user_id: string | null
          weight_kg: number | null
        }
        Insert: {
          birth_date?: string | null
          coach_created_by?: string | null
          created_at?: string | null
          height_cm?: number | null
          id?: string
          invite_code?: string | null
          name: string
          position?: string | null
          sex?: string | null
          sport?: Database["public"]["Enums"]["sport_type"]
          updated_at?: string | null
          user_id?: string | null
          weight_kg?: number | null
        }
        Update: {
          birth_date?: string | null
          coach_created_by?: string | null
          created_at?: string | null
          height_cm?: number | null
          id?: string
          invite_code?: string | null
          name?: string
          position?: string | null
          sex?: string | null
          sport?: Database["public"]["Enums"]["sport_type"]
          updated_at?: string | null
          user_id?: string | null
          weight_kg?: number | null
        }
        Relationships: []
      }
      results: {
        Row: {
          created_at: string | null
          cycle_day: number | null
          id: string
          menstrual_phase: string | null
          notes: string | null
          profile_id: string
          reps: number | null
          season_id: string | null
          session_date: string
          test_id: string
          value: number
          wellness_fatigue: number | null
          wellness_period_pain: number | null
          wellness_score: number | null
          wellness_sleep: number | null
          wellness_soreness: number | null
        }
        Insert: {
          created_at?: string | null
          cycle_day?: number | null
          id?: string
          menstrual_phase?: string | null
          notes?: string | null
          profile_id: string
          reps?: number | null
          season_id?: string | null
          session_date: string
          test_id: string
          value: number
          wellness_fatigue?: number | null
          wellness_period_pain?: number | null
          wellness_score?: number | null
          wellness_sleep?: number | null
          wellness_soreness?: number | null
        }
        Update: {
          created_at?: string | null
          cycle_day?: number | null
          id?: string
          menstrual_phase?: string | null
          notes?: string | null
          profile_id?: string
          reps?: number | null
          season_id?: string | null
          session_date?: string
          test_id?: string
          value?: number
          wellness_fatigue?: number | null
          wellness_period_pain?: number | null
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
            foreignKeyName: "results_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
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
      scheduled_events: {
        Row: {
          created_at: string
          event_date: string
          event_type: string
          id: string
          notes: string | null
          profile_id: string
          test_id: string | null
          title: string
        }
        Insert: {
          created_at?: string
          event_date: string
          event_type: string
          id?: string
          notes?: string | null
          profile_id: string
          test_id?: string | null
          title: string
        }
        Update: {
          created_at?: string
          event_date?: string
          event_type?: string
          id?: string
          notes?: string | null
          profile_id?: string
          test_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_events_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_events_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "test_library"
            referencedColumns: ["id"]
          },
        ]
      }
      seasons: {
        Row: {
          coach_id: string
          created_at: string | null
          end_date: string | null
          id: string
          is_active: boolean
          name: string
          start_date: string
        }
        Insert: {
          coach_id: string
          created_at?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean
          name: string
          start_date?: string
        }
        Update: {
          coach_id?: string
          created_at?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean
          name?: string
          start_date?: string
        }
        Relationships: []
      }
      session_loads: {
        Row: {
          coach_id: string
          created_at: string
          duration_min: number
          id: string
          notes: string | null
          profile_id: string
          rpe: number
          session_date: string
          session_type: string
          updated_at: string
        }
        Insert: {
          coach_id: string
          created_at?: string
          duration_min: number
          id?: string
          notes?: string | null
          profile_id: string
          rpe: number
          session_date?: string
          session_type?: string
          updated_at?: string
        }
        Update: {
          coach_id?: string
          created_at?: string
          duration_min?: number
          id?: string
          notes?: string | null
          profile_id?: string
          rpe?: number
          session_date?: string
          session_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      team_members: {
        Row: {
          created_at: string | null
          id: string
          profile_id: string
          team_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          profile_id: string
          team_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          profile_id?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_members_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          coach_id: string
          created_at: string | null
          id: string
          level: string | null
          name: string
          sport: Database["public"]["Enums"]["sport_type"]
        }
        Insert: {
          coach_id: string
          created_at?: string | null
          id?: string
          level?: string | null
          name: string
          sport?: Database["public"]["Enums"]["sport_type"]
        }
        Update: {
          coach_id?: string
          created_at?: string | null
          id?: string
          level?: string | null
          name?: string
          sport?: Database["public"]["Enums"]["sport_type"]
        }
        Relationships: []
      }
      test_library: {
        Row: {
          created_at: string | null
          created_by_user_id: string | null
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
          created_by_user_id?: string | null
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
          created_by_user_id?: string | null
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
      weight_logs: {
        Row: {
          created_at: string | null
          id: string
          logged_at: string
          profile_id: string
          weight_kg: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          logged_at?: string
          profile_id: string
          weight_kg: number
        }
        Update: {
          created_at?: string | null
          id?: string
          logged_at?: string
          profile_id?: string
          weight_kg?: number
        }
        Relationships: [
          {
            foreignKeyName: "weight_logs_profile_id_fkey"
            columns: ["profile_id"]
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
      generate_invite_code: { Args: never; Returns: string }
      get_profile_user_id: { Args: { _profile_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_coach_creator: {
        Args: { _coach_id: string; _profile_id: string }
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
