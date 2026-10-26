export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: {
          extensions?: Json;
          operationName?: string;
          query?: string;
          variables?: Json;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      accounts: {
        Row: {
          account_type: string;
          created_at: string;
          email: string;
          id: string;
        };
        ComputedFields: never;
        Insert: {
          account_type?: string;
          created_at?: string;
          email: string;
          id: string;
        };
        Update: {
          account_type?: string;
          created_at?: string;
          email?: string;
          id?: string;
        };
        Relationships: [];
      };
      activities: {
        Row: {
          account_id: string;
          address_id: string | null;
          created_at: string;
          description: string | null;
          end_date: string | null;
          id: string;
          max_age: number;
          min_age: number;
          price: number;
          provider_profile_id: string | null;
          schedule: string[];
          start_date: string | null;
          status: string;
          title: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          account_id?: string;
          address_id?: string | null;
          created_at?: string;
          description?: string | null;
          end_date?: string | null;
          id?: string;
          max_age: number;
          min_age: number;
          price?: number;
          provider_profile_id?: string | null;
          schedule?: string[];
          start_date?: string | null;
          status?: string;
          title: string;
          updated_at?: string;
        };
        Update: {
          account_id?: string;
          address_id?: string | null;
          created_at?: string;
          description?: string | null;
          end_date?: string | null;
          id?: string;
          max_age?: number;
          min_age?: number;
          price?: number;
          provider_profile_id?: string | null;
          schedule?: string[];
          start_date?: string | null;
          status?: string;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "activities_account_id_fkey";
            columns: ["account_id"];
            isOneToOne: false;
            referencedRelation: "accounts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "activities_address_id_account_id_fkey";
            columns: ["address_id", "account_id"];
            isOneToOne: false;
            referencedRelation: "addresses";
            referencedColumns: ["id", "provider_id"];
          },
          {
            foreignKeyName: "activities_provider_profile_id_fkey";
            columns: ["provider_profile_id"];
            isOneToOne: false;
            referencedRelation: "provider_profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      addresses: {
        Row: {
          address: string;
          city: string;
          created_at: string;
          id: string;
          provider_id: string;
        };
        ComputedFields: never;
        Insert: {
          address: string;
          city: string;
          created_at?: string;
          id?: string;
          provider_id?: string;
        };
        Update: {
          address?: string;
          city?: string;
          created_at?: string;
          id?: string;
          provider_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "addresses_provider_id_fkey";
            columns: ["provider_id"];
            isOneToOne: false;
            referencedRelation: "accounts";
            referencedColumns: ["id"];
          },
        ];
      };
      provider_profiles: {
        Row: {
          approved_at: string | null;
          description: string;
          generated_at: string;
          headline: string;
          id: string;
          model: string;
          provider_id: string;
          status: string;
        };
        ComputedFields: never;
        Insert: {
          approved_at?: string | null;
          description: string;
          generated_at?: string;
          headline: string;
          id?: string;
          model: string;
          provider_id?: string;
          status?: string;
        };
        Update: {
          approved_at?: string | null;
          description?: string;
          generated_at?: string;
          headline?: string;
          id?: string;
          model?: string;
          provider_id?: string;
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: "provider_profiles_provider_id_fkey";
            columns: ["provider_id"];
            isOneToOne: true;
            referencedRelation: "accounts";
            referencedColumns: ["id"];
          },
        ];
      };
      technical_sheets: {
        Row: {
          activity_types: string[];
          address_id: string;
          created_at: string;
          description: string | null;
          email: string | null;
          facilities: string[];
          id: string;
          name: string;
          phone_number: string | null;
          provider_id: string;
          provider_type: string;
          website: string | null;
        };
        ComputedFields: never;
        Insert: {
          activity_types: string[];
          address_id: string;
          created_at?: string;
          description?: string | null;
          email?: string | null;
          facilities?: string[];
          id?: string;
          name: string;
          phone_number?: string | null;
          provider_id?: string;
          provider_type: string;
          website?: string | null;
        };
        Update: {
          activity_types?: string[];
          address_id?: string;
          created_at?: string;
          description?: string | null;
          email?: string | null;
          facilities?: string[];
          id?: string;
          name?: string;
          phone_number?: string | null;
          provider_id?: string;
          provider_type?: string;
          website?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "technical_sheets_address_fkey";
            columns: ["address_id", "provider_id"];
            isOneToOne: false;
            referencedRelation: "addresses";
            referencedColumns: ["id", "provider_id"];
          },
          {
            foreignKeyName: "technical_sheets_provider_id_fkey";
            columns: ["provider_id"];
            isOneToOne: false;
            referencedRelation: "accounts";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      is_company: { Args: Record<PropertyKey, never>; Returns: boolean };
      is_valid_schedule: { Args: { schedule: Json }; Returns: boolean };
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

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

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
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const;