export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18";
  };
  public: {
    Tables: {
      bayora_audit_events: {
        Row: {
          created_at: string;
          event_type: string;
          hash: string;
          id: string;
          payload: Json;
          prev_hash: string;
          run_id: string;
          seq: number;
        };
        Insert: {
          created_at?: string;
          event_type: string;
          hash: string;
          id?: string;
          payload: Json;
          prev_hash: string;
          run_id: string;
          seq: number;
        };
        Update: {
          created_at?: string;
          event_type?: string;
          hash?: string;
          id?: string;
          payload?: Json;
          prev_hash?: string;
          run_id?: string;
          seq?: number;
        };
        Relationships: [
          {
            foreignKeyName: "bayora_audit_events_run_id_fkey";
            columns: ["run_id"];
            isOneToOne: false;
            referencedRelation: "bayora_runs";
            referencedColumns: ["id"];
          },
        ];
      };
      bayora_policies: {
        Row: {
          blocked_keywords: string[];
          canary_filtering: boolean;
          created_at: string;
          created_by_role: string;
          fingerprint: string;
          id: string;
          max_prompt_length: number;
          name: string;
          regex_patterns: string[];
          version: string;
        };
        Insert: {
          blocked_keywords?: string[];
          canary_filtering?: boolean;
          created_at?: string;
          created_by_role?: string;
          fingerprint: string;
          id?: string;
          max_prompt_length?: number;
          name: string;
          regex_patterns?: string[];
          version: string;
        };
        Update: {
          blocked_keywords?: string[];
          canary_filtering?: boolean;
          created_at?: string;
          created_by_role?: string;
          fingerprint?: string;
          id?: string;
          max_prompt_length?: number;
          name?: string;
          regex_patterns?: string[];
          version?: string;
        };
        Relationships: [];
      };
      bayora_probe_runs: {
        Row: {
          created_at: string;
          executed_by_role: string;
          id: string;
          results: Json;
        };
        Insert: {
          created_at?: string;
          executed_by_role: string;
          id?: string;
          results: Json;
        };
        Update: {
          created_at?: string;
          executed_by_role?: string;
          id?: string;
          results?: Json;
        };
        Relationships: [];
      };
      bayora_runs: {
        Row: {
          benchmark_suite: string;
          config_fingerprint: string;
          created_at: string;
          created_by_role: string;
          error_detail: string | null;
          finished_at: string | null;
          gateway_timeout_ms: number;
          id: string;
          isolation_result: Json | null;
          model_profile: string;
          policy_fingerprint: string;
          policy_name: string;
          policy_version: string;
          request_budget: number;
          started_at: string | null;
          status: string;
        };
        Insert: {
          benchmark_suite: string;
          config_fingerprint: string;
          created_at?: string;
          created_by_role?: string;
          error_detail?: string | null;
          finished_at?: string | null;
          gateway_timeout_ms: number;
          id: string;
          isolation_result?: Json | null;
          model_profile: string;
          policy_fingerprint: string;
          policy_name: string;
          policy_version: string;
          request_budget: number;
          started_at?: string | null;
          status?: string;
        };
        Update: {
          benchmark_suite?: string;
          config_fingerprint?: string;
          created_at?: string;
          created_by_role?: string;
          error_detail?: string | null;
          finished_at?: string | null;
          gateway_timeout_ms?: number;
          id?: string;
          isolation_result?: Json | null;
          model_profile?: string;
          policy_fingerprint?: string;
          policy_name?: string;
          policy_version?: string;
          request_budget?: number;
          started_at?: string | null;
          status?: string;
        };
        Relationships: [];
      };
      bayora_test_results: {
        Row: {
          category: string;
          expected_behavior: string;
          gateway_decision: string;
          gateway_reason: string | null;
          id: string;
          is_attack: boolean;
          latency_ms: number | null;
          model_response: string | null;
          prompt: string;
          prompt_hash: string;
          run_id: string;
          seq: number;
          test_id: string;
          title: string;
          verdict: string;
        };
        Insert: {
          category: string;
          expected_behavior: string;
          gateway_decision: string;
          gateway_reason?: string | null;
          id?: string;
          is_attack?: boolean;
          latency_ms?: number | null;
          model_response?: string | null;
          prompt: string;
          prompt_hash: string;
          run_id: string;
          seq: number;
          test_id: string;
          title: string;
          verdict: string;
        };
        Update: {
          category?: string;
          expected_behavior?: string;
          gateway_decision?: string;
          gateway_reason?: string | null;
          id?: string;
          is_attack?: boolean;
          latency_ms?: number | null;
          model_response?: string | null;
          prompt?: string;
          prompt_hash?: string;
          run_id?: string;
          seq?: number;
          test_id?: string;
          title?: string;
          verdict?: string;
        };
        Relationships: [
          {
            foreignKeyName: "bayora_test_results_run_id_fkey";
            columns: ["run_id"];
            isOneToOne: false;
            referencedRelation: "bayora_runs";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
