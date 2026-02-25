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
      game_rooms: {
        Row: {
          created_at: string
          duration_seconds: number | null
          game_id: string | null
          guest_id: string | null
          host_id: string
          id: string
          room_code: string
          status: string
        }
        Insert: {
          created_at?: string
          duration_seconds?: number | null
          game_id?: string | null
          guest_id?: string | null
          host_id: string
          id?: string
          room_code: string
          status?: string
        }
        Update: {
          created_at?: string
          duration_seconds?: number | null
          game_id?: string | null
          guest_id?: string | null
          host_id?: string
          id?: string
          room_code?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "game_rooms_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_rooms_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_rooms_host_id_fkey"
            columns: ["host_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      games: {
        Row: {
          created_at: string
          current_fen: string | null
          duration_seconds: number | null
          ended_at: string | null
          game_mode: string
          id: string
          moves: Json | null
          pgn: string | null
          player_black: string | null
          player_white: string | null
          player1_id: string
          player2_id: string | null
          result_type: string
          winner_id: string | null
        }
        Insert: {
          created_at?: string
          current_fen?: string | null
          duration_seconds?: number | null
          ended_at?: string | null
          game_mode?: string
          id?: string
          moves?: Json | null
          pgn?: string | null
          player_black?: string | null
          player_white?: string | null
          player1_id: string
          player2_id?: string | null
          result_type?: string
          winner_id?: string | null
        }
        Update: {
          created_at?: string
          current_fen?: string | null
          duration_seconds?: number | null
          ended_at?: string | null
          game_mode?: string
          id?: string
          moves?: Json | null
          pgn?: string | null
          player_black?: string | null
          player_white?: string | null
          player1_id?: string
          player2_id?: string | null
          result_type?: string
          winner_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "games_player_black_fkey"
            columns: ["player_black"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "games_player_white_fkey"
            columns: ["player_white"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "games_player1_id_fkey"
            columns: ["player1_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "games_player2_id_fkey"
            columns: ["player2_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "games_winner_id_fkey"
            columns: ["winner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      matchmaking_queue: {
        Row: {
          created_at: string
          duration_seconds: number | null
          game_mode: string
          id: string
          player_id: string
          rating: number
          region: string | null
        }
        Insert: {
          created_at?: string
          duration_seconds?: number | null
          game_mode?: string
          id?: string
          player_id: string
          rating?: number
          region?: string | null
        }
        Update: {
          created_at?: string
          duration_seconds?: number | null
          game_mode?: string
          id?: string
          player_id?: string
          rating?: number
          region?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "matchmaking_queue_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          country: string | null
          created_at: string
          crown_score: number
          draws: number
          games_played: number
          id: string
          level: number
          losses: number
          rank_tier: string
          updated_at: string
          username: string | null
          wallet_crowns: number
          win_streak: number
          wins: number
          xp: number
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          country?: string | null
          created_at?: string
          crown_score?: number
          draws?: number
          games_played?: number
          id: string
          level?: number
          losses?: number
          rank_tier?: string
          updated_at?: string
          username?: string | null
          wallet_crowns?: number
          win_streak?: number
          wins?: number
          xp?: number
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          country?: string | null
          created_at?: string
          crown_score?: number
          draws?: number
          games_played?: number
          id?: string
          level?: number
          losses?: number
          rank_tier?: string
          updated_at?: string
          username?: string | null
          wallet_crowns?: number
          win_streak?: number
          wins?: number
          xp?: number
        }
        Relationships: []
      }
      tournament_registrations: {
        Row: {
          id: string
          player_id: string
          registered_at: string
          tournament_id: string
        }
        Insert: {
          id?: string
          player_id: string
          registered_at?: string
          tournament_id: string
        }
        Update: {
          id?: string
          player_id?: string
          registered_at?: string
          tournament_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tournament_registrations_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      tournaments: {
        Row: {
          cancelled_at: string | null
          created_at: string
          created_by: string
          id: string
          max_players: number
          name: string
          prize_pool: number
          starts_at: string | null
          status: string
        }
        Insert: {
          cancelled_at?: string | null
          created_at?: string
          created_by: string
          id?: string
          max_players?: number
          name: string
          prize_pool?: number
          starts_at?: string | null
          status?: string
        }
        Update: {
          cancelled_at?: string | null
          created_at?: string
          created_by?: string
          id?: string
          max_players?: number
          name?: string
          prize_pool?: number
          starts_at?: string | null
          status?: string
        }
        Relationships: []
      }
      wallet_transactions: {
        Row: {
          amount: number
          created_at: string
          id: string
          player_id: string
          txn_type: string
          upi_provider: string | null
          upi_ref: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          player_id: string
          txn_type?: string
          upi_provider?: string | null
          upi_ref?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          player_id?: string
          txn_type?: string
          upi_provider?: string | null
          upi_ref?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      register_tournament_with_wallet: {
        Args: { target_tournament: string }
        Returns: undefined
      }
      topup_wallet_via_upi: {
        Args: { topup_rupees: number; upi_provider: string; upi_ref: string }
        Returns: {
          wallet_balance: number
        }[]
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
