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
      achievements: {
        Row: {
          category: string
          description: string
          icon: string
          id: string
          key: string
          title: string
          xp_reward: number
        }
        Insert: {
          category?: string
          description?: string
          icon?: string
          id?: string
          key: string
          title: string
          xp_reward?: number
        }
        Update: {
          category?: string
          description?: string
          icon?: string
          id?: string
          key?: string
          title?: string
          xp_reward?: number
        }
        Relationships: []
      }
      battle_pass_claims: {
        Row: {
          claimed_at: string
          id: string
          tier_id: string
          user_id: string
        }
        Insert: {
          claimed_at?: string
          id?: string
          tier_id: string
          user_id: string
        }
        Update: {
          claimed_at?: string
          id?: string
          tier_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "battle_pass_claims_tier_id_fkey"
            columns: ["tier_id"]
            isOneToOne: false
            referencedRelation: "battle_pass_tiers"
            referencedColumns: ["id"]
          },
        ]
      }
      battle_pass_progress: {
        Row: {
          created_at: string
          current_xp: number
          id: string
          is_premium: boolean
          season_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_xp?: number
          id?: string
          is_premium?: boolean
          season_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_xp?: number
          id?: string
          is_premium?: boolean
          season_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "battle_pass_progress_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "battle_pass_seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      battle_pass_seasons: {
        Row: {
          created_at: string
          ends_at: string
          id: string
          name: string
          season_number: number
          starts_at: string
          status: string
        }
        Insert: {
          created_at?: string
          ends_at?: string
          id?: string
          name: string
          season_number?: number
          starts_at?: string
          status?: string
        }
        Update: {
          created_at?: string
          ends_at?: string
          id?: string
          name?: string
          season_number?: number
          starts_at?: string
          status?: string
        }
        Relationships: []
      }
      battle_pass_tiers: {
        Row: {
          id: string
          is_premium: boolean
          reward_amount: number
          reward_icon: string
          reward_label: string
          reward_type: string
          season_id: string
          tier_number: number
          xp_required: number
        }
        Insert: {
          id?: string
          is_premium?: boolean
          reward_amount?: number
          reward_icon?: string
          reward_label?: string
          reward_type?: string
          season_id: string
          tier_number: number
          xp_required?: number
        }
        Update: {
          id?: string
          is_premium?: boolean
          reward_amount?: number
          reward_icon?: string
          reward_label?: string
          reward_type?: string
          season_id?: string
          tier_number?: number
          xp_required?: number
        }
        Relationships: [
          {
            foreignKeyName: "battle_pass_tiers_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "battle_pass_seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      challenge_progress: {
        Row: {
          challenge_id: string
          completed: boolean
          completed_at: string | null
          current_value: number
          id: string
          reward_claimed: boolean
          started_at: string
          user_id: string
        }
        Insert: {
          challenge_id: string
          completed?: boolean
          completed_at?: string | null
          current_value?: number
          id?: string
          reward_claimed?: boolean
          started_at?: string
          user_id: string
        }
        Update: {
          challenge_id?: string
          completed?: boolean
          completed_at?: string | null
          current_value?: number
          id?: string
          reward_claimed?: boolean
          started_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "challenge_progress_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
        ]
      }
      challenges: {
        Row: {
          active_from: string
          active_until: string
          category: string
          challenge_type: string
          created_at: string
          crown_reward: number
          description: string
          icon: string
          id: string
          target_value: number
          title: string
          xp_reward: number
        }
        Insert: {
          active_from?: string
          active_until?: string
          category?: string
          challenge_type?: string
          created_at?: string
          crown_reward?: number
          description?: string
          icon?: string
          id?: string
          target_value?: number
          title: string
          xp_reward?: number
        }
        Update: {
          active_from?: string
          active_until?: string
          category?: string
          challenge_type?: string
          created_at?: string
          crown_reward?: number
          description?: string
          icon?: string
          id?: string
          target_value?: number
          title?: string
          xp_reward?: number
        }
        Relationships: []
      }
      club_members: {
        Row: {
          club_id: string
          id: string
          joined_at: string
          role: string
          user_id: string
        }
        Insert: {
          club_id: string
          id?: string
          joined_at?: string
          role?: string
          user_id: string
        }
        Update: {
          club_id?: string
          id?: string
          joined_at?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "club_members_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      clubs: {
        Row: {
          avg_rating: number
          created_at: string
          description: string | null
          id: string
          is_public: boolean
          logo_url: string | null
          member_count: number
          name: string
          owner_id: string
          total_games: number
          total_wins: number
        }
        Insert: {
          avg_rating?: number
          created_at?: string
          description?: string | null
          id?: string
          is_public?: boolean
          logo_url?: string | null
          member_count?: number
          name: string
          owner_id: string
          total_games?: number
          total_wins?: number
        }
        Update: {
          avg_rating?: number
          created_at?: string
          description?: string | null
          id?: string
          is_public?: boolean
          logo_url?: string | null
          member_count?: number
          name?: string
          owner_id?: string
          total_games?: number
          total_wins?: number
        }
        Relationships: []
      }
      daily_logins: {
        Row: {
          bonus_claimed: boolean
          created_at: string
          crown_bonus: number
          id: string
          login_date: string
          streak: number
          user_id: string
        }
        Insert: {
          bonus_claimed?: boolean
          created_at?: string
          crown_bonus?: number
          id?: string
          login_date?: string
          streak?: number
          user_id: string
        }
        Update: {
          bonus_claimed?: boolean
          created_at?: string
          crown_bonus?: number
          id?: string
          login_date?: string
          streak?: number
          user_id?: string
        }
        Relationships: []
      }
      daily_puzzles: {
        Row: {
          active_date: string
          id: string
          puzzle_id: string
        }
        Insert: {
          active_date?: string
          id?: string
          puzzle_id: string
        }
        Update: {
          active_date?: string
          id?: string
          puzzle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_puzzles_puzzle_id_fkey"
            columns: ["puzzle_id"]
            isOneToOne: false
            referencedRelation: "puzzles"
            referencedColumns: ["id"]
          },
        ]
      }
      direct_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          is_read: boolean
          receiver_id: string
          sender_id: string
        }
        Insert: {
          content?: string
          created_at?: string
          id?: string
          is_read?: boolean
          receiver_id: string
          sender_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_read?: boolean
          receiver_id?: string
          sender_id?: string
        }
        Relationships: []
      }
      elo_history: {
        Row: {
          elo_after: number
          elo_before: number
          elo_delta: number | null
          game_id: string | null
          id: string
          player_id: string
          recorded_at: string
        }
        Insert: {
          elo_after: number
          elo_before: number
          elo_delta?: number | null
          game_id?: string | null
          id?: string
          player_id: string
          recorded_at?: string
        }
        Update: {
          elo_after?: number
          elo_before?: number
          elo_delta?: number | null
          game_id?: string | null
          id?: string
          player_id?: string
          recorded_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "elo_history_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
        ]
      }
      friendships: {
        Row: {
          addressee_id: string
          created_at: string
          id: string
          requester_id: string
          status: string
        }
        Insert: {
          addressee_id: string
          created_at?: string
          id?: string
          requester_id: string
          status?: string
        }
        Update: {
          addressee_id?: string
          created_at?: string
          id?: string
          requester_id?: string
          status?: string
        }
        Relationships: []
      }
      game_chat: {
        Row: {
          created_at: string
          emoji: string | null
          game_id: string
          id: string
          is_reaction: boolean
          message: string
          user_id: string
        }
        Insert: {
          created_at?: string
          emoji?: string | null
          game_id: string
          id?: string
          is_reaction?: boolean
          message?: string
          user_id: string
        }
        Update: {
          created_at?: string
          emoji?: string | null
          game_id?: string
          id?: string
          is_reaction?: boolean
          message?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "game_chat_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
        ]
      }
      game_comments: {
        Row: {
          content: string
          created_at: string
          game_id: string
          id: string
          user_id: string
        }
        Insert: {
          content?: string
          created_at?: string
          game_id: string
          id?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          game_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "game_comments_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
        ]
      }
      game_reports: {
        Row: {
          admin_notes: string | null
          analysis: Json | null
          created_at: string
          game_id: string
          id: string
          reason: string
          reported_player_id: string
          reporter_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          suspicion_score: number | null
        }
        Insert: {
          admin_notes?: string | null
          analysis?: Json | null
          created_at?: string
          game_id: string
          id?: string
          reason?: string
          reported_player_id: string
          reporter_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          suspicion_score?: number | null
        }
        Update: {
          admin_notes?: string | null
          analysis?: Json | null
          created_at?: string
          game_id?: string
          id?: string
          reason?: string
          reported_player_id?: string
          reporter_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          suspicion_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "game_reports_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
        ]
      }
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
      leaderboard_seasons: {
        Row: {
          created_at: string
          ends_at: string
          id: string
          name: string
          reward_1st: number
          reward_2nd: number
          reward_3rd: number
          season_number: number
          starts_at: string
          status: string
        }
        Insert: {
          created_at?: string
          ends_at?: string
          id?: string
          name: string
          reward_1st?: number
          reward_2nd?: number
          reward_3rd?: number
          season_number?: number
          starts_at?: string
          status?: string
        }
        Update: {
          created_at?: string
          ends_at?: string
          id?: string
          name?: string
          reward_1st?: number
          reward_2nd?: number
          reward_3rd?: number
          season_number?: number
          starts_at?: string
          status?: string
        }
        Relationships: []
      }
      matchmaking_queue: {
        Row: {
          created_at: string
          game_mode: string
          id: string
          player_id: string
          rating: number
          region: string | null
        }
        Insert: {
          created_at?: string
          game_mode?: string
          id?: string
          player_id: string
          rating?: number
          region?: string | null
        }
        Update: {
          created_at?: string
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
      opening_lines: {
        Row: {
          category: string
          color: string
          created_at: string
          description: string | null
          difficulty: string
          eco: string
          id: string
          moves: string[]
          name: string
        }
        Insert: {
          category?: string
          color?: string
          created_at?: string
          description?: string | null
          difficulty?: string
          eco?: string
          id?: string
          moves: string[]
          name: string
        }
        Update: {
          category?: string
          color?: string
          created_at?: string
          description?: string | null
          difficulty?: string
          eco?: string
          id?: string
          moves?: string[]
          name?: string
        }
        Relationships: []
      }
      opening_progress: {
        Row: {
          correct_streak: number
          created_at: string
          ease_factor: number
          id: string
          interval_days: number
          last_reviewed_at: string | null
          line_id: string
          next_review_at: string
          repetitions: number
          user_id: string
        }
        Insert: {
          correct_streak?: number
          created_at?: string
          ease_factor?: number
          id?: string
          interval_days?: number
          last_reviewed_at?: string | null
          line_id: string
          next_review_at?: string
          repetitions?: number
          user_id: string
        }
        Update: {
          correct_streak?: number
          created_at?: string
          ease_factor?: number
          id?: string
          interval_days?: number
          last_reviewed_at?: string | null
          line_id?: string
          next_review_at?: string
          repetitions?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "opening_progress_line_id_fkey"
            columns: ["line_id"]
            isOneToOne: false
            referencedRelation: "opening_lines"
            referencedColumns: ["id"]
          },
        ]
      }
      player_achievements: {
        Row: {
          achievement_id: string
          id: string
          unlocked_at: string
          user_id: string
        }
        Insert: {
          achievement_id: string
          id?: string
          unlocked_at?: string
          user_id: string
        }
        Update: {
          achievement_id?: string
          id?: string
          unlocked_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "player_achievements_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "achievements"
            referencedColumns: ["id"]
          },
        ]
      }
      player_notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          kind: string
          message: string
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          kind?: string
          message?: string
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          kind?: string
          message?: string
          title?: string
          user_id?: string
        }
        Relationships: []
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
          player_uid: string | null
          puzzle_rating: number
          puzzle_streak: number
          puzzles_solved: number
          rank_tier: string
          referral_code: string | null
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
          player_uid?: string | null
          puzzle_rating?: number
          puzzle_streak?: number
          puzzles_solved?: number
          rank_tier?: string
          referral_code?: string | null
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
          player_uid?: string | null
          puzzle_rating?: number
          puzzle_streak?: number
          puzzles_solved?: number
          rank_tier?: string
          referral_code?: string | null
          updated_at?: string
          username?: string | null
          wallet_crowns?: number
          win_streak?: number
          wins?: number
          xp?: number
        }
        Relationships: []
      }
      puzzle_attempts: {
        Row: {
          attempts: number
          created_at: string
          id: string
          puzzle_id: string
          solved: boolean
          time_seconds: number | null
          user_id: string
        }
        Insert: {
          attempts?: number
          created_at?: string
          id?: string
          puzzle_id: string
          solved?: boolean
          time_seconds?: number | null
          user_id: string
        }
        Update: {
          attempts?: number
          created_at?: string
          id?: string
          puzzle_id?: string
          solved?: boolean
          time_seconds?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "puzzle_attempts_puzzle_id_fkey"
            columns: ["puzzle_id"]
            isOneToOne: false
            referencedRelation: "puzzles"
            referencedColumns: ["id"]
          },
        ]
      }
      puzzles: {
        Row: {
          created_at: string
          fen: string
          id: string
          rating: number
          solution: string[]
          source: string | null
          themes: string[]
        }
        Insert: {
          created_at?: string
          fen: string
          id?: string
          rating?: number
          solution: string[]
          source?: string | null
          themes?: string[]
        }
        Update: {
          created_at?: string
          fen?: string
          id?: string
          rating?: number
          solution?: string[]
          source?: string | null
          themes?: string[]
        }
        Relationships: []
      }
      recent_tournaments: {
        Row: {
          created_by: string
          ended_at: string | null
          id: string
          max_players: number
          name: string
          original_id: string
          player_count: number
          prize_pool: number
          starts_at: string | null
          status: string
          tournament_type: string
        }
        Insert: {
          created_by: string
          ended_at?: string | null
          id?: string
          max_players?: number
          name: string
          original_id: string
          player_count?: number
          prize_pool?: number
          starts_at?: string | null
          status?: string
          tournament_type?: string
        }
        Update: {
          created_by?: string
          ended_at?: string | null
          id?: string
          max_players?: number
          name?: string
          original_id?: string
          player_count?: number
          prize_pool?: number
          starts_at?: string | null
          status?: string
          tournament_type?: string
        }
        Relationships: []
      }
      referrals: {
        Row: {
          created_at: string
          id: string
          referral_code: string
          referred_id: string
          referrer_id: string
          reward_claimed: boolean
        }
        Insert: {
          created_at?: string
          id?: string
          referral_code: string
          referred_id: string
          referrer_id: string
          reward_claimed?: boolean
        }
        Update: {
          created_at?: string
          id?: string
          referral_code?: string
          referred_id?: string
          referrer_id?: string
          reward_claimed?: boolean
        }
        Relationships: []
      }
      season_entries: {
        Row: {
          games_played: number
          id: string
          score: number
          season_id: string
          updated_at: string
          user_id: string
          wins: number
        }
        Insert: {
          games_played?: number
          id?: string
          score?: number
          season_id: string
          updated_at?: string
          user_id: string
          wins?: number
        }
        Update: {
          games_played?: number
          id?: string
          score?: number
          season_id?: string
          updated_at?: string
          user_id?: string
          wins?: number
        }
        Relationships: [
          {
            foreignKeyName: "season_entries_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_items: {
        Row: {
          category: string
          created_at: string
          description: string
          icon: string
          id: string
          is_active: boolean
          metadata: Json
          name: string
          price_crowns: number
          rarity: string
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string
          icon?: string
          id?: string
          is_active?: boolean
          metadata?: Json
          name: string
          price_crowns?: number
          rarity?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string
          icon?: string
          id?: string
          is_active?: boolean
          metadata?: Json
          name?: string
          price_crowns?: number
          rarity?: string
        }
        Relationships: []
      }
      shop_purchases: {
        Row: {
          id: string
          is_equipped: boolean
          item_id: string
          purchased_at: string
          user_id: string
        }
        Insert: {
          id?: string
          is_equipped?: boolean
          item_id: string
          purchased_at?: string
          user_id: string
        }
        Update: {
          id?: string
          is_equipped?: boolean
          item_id?: string
          purchased_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shop_purchases_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "shop_items"
            referencedColumns: ["id"]
          },
        ]
      }
      studies: {
        Row: {
          created_at: string
          description: string | null
          id: string
          opening_name: string | null
          owner_id: string
          title: string
          updated_at: string
          visibility: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          opening_name?: string | null
          owner_id: string
          title: string
          updated_at?: string
          visibility?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          opening_name?: string | null
          owner_id?: string
          title?: string
          updated_at?: string
          visibility?: string
        }
        Relationships: []
      }
      study_chapters: {
        Row: {
          annotations: Json | null
          created_at: string
          fen: string
          id: string
          moves: Json | null
          sort_order: number
          study_id: string
          title: string
        }
        Insert: {
          annotations?: Json | null
          created_at?: string
          fen?: string
          id?: string
          moves?: Json | null
          sort_order?: number
          study_id: string
          title?: string
        }
        Update: {
          annotations?: Json | null
          created_at?: string
          fen?: string
          id?: string
          moves?: Json | null
          sort_order?: number
          study_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_chapters_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "studies"
            referencedColumns: ["id"]
          },
        ]
      }
      team_battle_boards: {
        Row: {
          battle_id: string
          board_number: number
          challenger_player_id: string
          created_at: string
          game_id: string | null
          id: string
          opponent_player_id: string | null
          result: string
        }
        Insert: {
          battle_id: string
          board_number?: number
          challenger_player_id: string
          created_at?: string
          game_id?: string | null
          id?: string
          opponent_player_id?: string | null
          result?: string
        }
        Update: {
          battle_id?: string
          board_number?: number
          challenger_player_id?: string
          created_at?: string
          game_id?: string | null
          id?: string
          opponent_player_id?: string | null
          result?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_battle_boards_battle_id_fkey"
            columns: ["battle_id"]
            isOneToOne: false
            referencedRelation: "team_battles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_battle_boards_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
        ]
      }
      team_battles: {
        Row: {
          board_count: number
          challenger_club_id: string
          challenger_score: number
          completed_at: string | null
          created_at: string
          id: string
          opponent_club_id: string
          opponent_score: number
          status: string
        }
        Insert: {
          board_count?: number
          challenger_club_id: string
          challenger_score?: number
          completed_at?: string | null
          created_at?: string
          id?: string
          opponent_club_id: string
          opponent_score?: number
          status?: string
        }
        Update: {
          board_count?: number
          challenger_club_id?: string
          challenger_score?: number
          completed_at?: string | null
          created_at?: string
          id?: string
          opponent_club_id?: string
          opponent_score?: number
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_battles_challenger_club_id_fkey"
            columns: ["challenger_club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_battles_opponent_club_id_fkey"
            columns: ["opponent_club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      tournament_matches: {
        Row: {
          created_at: string
          game_id: string | null
          id: string
          player1_id: string
          player2_id: string | null
          result: string
          round: number
          tournament_id: string
          winner_id: string | null
        }
        Insert: {
          created_at?: string
          game_id?: string | null
          id?: string
          player1_id: string
          player2_id?: string | null
          result?: string
          round?: number
          tournament_id: string
          winner_id?: string | null
        }
        Update: {
          created_at?: string
          game_id?: string | null
          id?: string
          player1_id?: string
          player2_id?: string | null
          result?: string
          round?: number
          tournament_id?: string
          winner_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tournament_matches_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_matches_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
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
          created_at: string
          created_by: string
          current_round: number
          id: string
          max_players: number
          max_rounds: number
          name: string
          prize_pool: number
          starts_at: string | null
          status: string
          tournament_type: string
        }
        Insert: {
          created_at?: string
          created_by: string
          current_round?: number
          id?: string
          max_players?: number
          max_rounds?: number
          name: string
          prize_pool?: number
          starts_at?: string | null
          status?: string
          tournament_type?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          current_round?: number
          id?: string
          max_players?: number
          max_rounds?: number
          name?: string
          prize_pool?: number
          starts_at?: string | null
          status?: string
          tournament_type?: string
        }
        Relationships: []
      }
      user_bans: {
        Row: {
          ban_type: string
          banned_by: string
          created_at: string
          expires_at: string | null
          id: string
          is_active: boolean
          reason: string
          user_id: string
        }
        Insert: {
          ban_type?: string
          banned_by: string
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          reason?: string
          user_id: string
        }
        Update: {
          ban_type?: string
          banned_by?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          reason?: string
          user_id?: string
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
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
      app_role: "admin" | "moderator" | "user"
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
    },
  },
} as const
