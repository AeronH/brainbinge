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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      fill_in_blank_questions: {
        Row: {
          created_at: string
          explanation: string
          id: string
          lesson_id: string
          missing_word: string
          order_index: number
          question_text: string
        }
        Insert: {
          created_at?: string
          explanation: string
          id?: string
          lesson_id: string
          missing_word: string
          order_index: number
          question_text: string
        }
        Update: {
          created_at?: string
          explanation?: string
          id?: string
          lesson_id?: string
          missing_word?: string
          order_index?: number
          question_text?: string
        }
        Relationships: [
          {
            foreignKeyName: "fill_in_blank_questions_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      flashcards: {
        Row: {
          back: string
          created_at: string
          front: string
          id: string
          lesson_id: string
          order_index: number
        }
        Insert: {
          back: string
          created_at?: string
          front: string
          id?: string
          lesson_id: string
          order_index: number
        }
        Update: {
          back?: string
          created_at?: string
          front?: string
          id?: string
          lesson_id?: string
          order_index?: number
        }
        Relationships: [
          {
            foreignKeyName: "flashcards_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_podcasts: {
        Row: {
          created_at: string | null
          full_audio_url: string | null
          id: string
          lesson_id: string | null
          status: string
          tone: string
          transcript: Json
          user_id: string | null
          voice_1: string
          voice_2: string
        }
        Insert: {
          created_at?: string | null
          full_audio_url?: string | null
          id?: string
          lesson_id?: string | null
          status?: string
          tone: string
          transcript: Json
          user_id?: string | null
          voice_1: string
          voice_2: string
        }
        Update: {
          created_at?: string | null
          full_audio_url?: string | null
          id?: string
          lesson_id?: string | null
          status?: string
          tone?: string
          transcript?: Json
          user_id?: string | null
          voice_1?: string
          voice_2?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_podcasts_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_podcasts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      lessons: {
        Row: {
          created_at: string | null
          humor_level: string | null
          id: string
          original_content: string | null
          outline: Json | null
          source_type: string | null
          source_url: string | null
          status: string
          subject: string | null
          summary: string | null
          title: string
          user_id: string
          voice_style: string | null
          word_count: number | null
        }
        Insert: {
          created_at?: string | null
          humor_level?: string | null
          id?: string
          original_content?: string | null
          outline?: Json | null
          source_type?: string | null
          source_url?: string | null
          status?: string
          subject?: string | null
          summary?: string | null
          title: string
          user_id: string
          voice_style?: string | null
          word_count?: number | null
        }
        Update: {
          created_at?: string | null
          humor_level?: string | null
          id?: string
          original_content?: string | null
          outline?: Json | null
          source_type?: string | null
          source_url?: string | null
          status?: string
          subject?: string | null
          summary?: string | null
          title?: string
          user_id?: string
          voice_style?: string | null
          word_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "lessons_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          created_at: string | null
          id: string
          metadata: Json | null
          role: string
          session_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          role: string
          session_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          role?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      podcasts: {
        Row: {
          audio_url: string | null
          created_at: string | null
          id: string
          lessons_included: Json | null
          title: string
          user_id: string
        }
        Insert: {
          audio_url?: string | null
          created_at?: string | null
          id?: string
          lessons_included?: Json | null
          title: string
          user_id: string
        }
        Update: {
          audio_url?: string | null
          created_at?: string | null
          id?: string
          lessons_included?: Json | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "podcasts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_attempts: {
        Row: {
          answers: Json
          completed_at: string
          id: string
          lesson_id: string
          score: number
          user_id: string
        }
        Insert: {
          answers: Json
          completed_at?: string
          id?: string
          lesson_id: string
          score: number
          user_id: string
        }
        Update: {
          answers?: Json
          completed_at?: string
          id?: string
          lesson_id?: string
          score?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_attempts_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_attempts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_questions: {
        Row: {
          correct_answer: string
          created_at: string
          explanation: string
          id: string
          lesson_id: string
          options: Json | null
          order_index: number
          question: string
          question_type: string
        }
        Insert: {
          correct_answer: string
          created_at?: string
          explanation: string
          id?: string
          lesson_id: string
          options?: Json | null
          order_index: number
          question: string
          question_type: string
        }
        Update: {
          correct_answer?: string
          created_at?: string
          explanation?: string
          id?: string
          lesson_id?: string
          options?: Json | null
          order_index?: number
          question?: string
          question_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_questions_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          audio_urls: Json | null
          chat_log: Json | null
          created_at: string | null
          id: string
          learning_mode: string | null
          lesson_id: string
          score: number | null
          started_at: string | null
          title: string
        }
        Insert: {
          audio_urls?: Json | null
          chat_log?: Json | null
          created_at?: string | null
          id?: string
          learning_mode?: string | null
          lesson_id: string
          score?: number | null
          started_at?: string | null
          title: string
        }
        Update: {
          audio_urls?: Json | null
          chat_log?: Json | null
          created_at?: string | null
          id?: string
          learning_mode?: string | null
          lesson_id?: string
          score?: number | null
          started_at?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "sessions_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string | null
          email: string
          id: string
          name: string
          podcast_generations_count: number
          podcast_generations_reset_at: string
          preferences: Json | null
          subscription_expires_at: string | null
          subscription_id: string | null
          subscription_status: string | null
          whop_user_id: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          name: string
          podcast_generations_count?: number
          podcast_generations_reset_at?: string
          preferences?: Json | null
          subscription_expires_at?: string | null
          subscription_id?: string | null
          subscription_status?: string | null
          whop_user_id?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          name?: string
          podcast_generations_count?: number
          podcast_generations_reset_at?: string
          preferences?: Json | null
          subscription_expires_at?: string | null
          subscription_id?: string | null
          subscription_status?: string | null
          whop_user_id?: string | null
        }
        Relationships: []
      }
      voice_previews: {
        Row: {
          audio_url: string
          created_at: string | null
          id: string
          preview_text: string
          voice_id: string
          voice_name: string
        }
        Insert: {
          audio_url: string
          created_at?: string | null
          id?: string
          preview_text: string
          voice_id: string
          voice_name: string
        }
        Update: {
          audio_url?: string
          created_at?: string | null
          id?: string
          preview_text?: string
          voice_id?: string
          voice_name?: string
        }
        Relationships: []
      }
      walkthrough_quiz_questions: {
        Row: {
          asked_after_message_id: string | null
          correct_answer: number
          created_at: string | null
          explanation: string | null
          id: string
          is_correct: boolean | null
          lesson_id: string
          options: Json
          question: string
          session_id: string
          user_answer: number | null
        }
        Insert: {
          asked_after_message_id?: string | null
          correct_answer: number
          created_at?: string | null
          explanation?: string | null
          id?: string
          is_correct?: boolean | null
          lesson_id: string
          options: Json
          question: string
          session_id: string
          user_answer?: number | null
        }
        Update: {
          asked_after_message_id?: string | null
          correct_answer?: number
          created_at?: string | null
          explanation?: string | null
          id?: string
          is_correct?: boolean | null
          lesson_id?: string
          options?: Json
          question?: string
          session_id?: string
          user_answer?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "walkthrough_quiz_questions_asked_after_message_id_fkey"
            columns: ["asked_after_message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "walkthrough_quiz_questions_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "walkthrough_quiz_questions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
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
