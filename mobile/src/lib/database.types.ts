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
          address_id: string;
          category: string;
          created_at: string;
          description: string | null;
          end_date: string | null;
          id: string;
          is_tutor: boolean;
          max_participants: number;
          price: number;
          price_period: string;
          provider_id: string;
          schedule: Json | null;
          search_normalized: string;
          start_date: string | null;
          status: string;
          target_age_ranges: string[];
          title: string;
          type: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          address_id: string;
          category: string;
          created_at?: string;
          description?: string | null;
          end_date?: string | null;
          id?: string;
          is_tutor?: boolean;
          max_participants: number;
          price: number;
          price_period: string;
          provider_id?: string;
          schedule?: Json | null;
          search_normalized?: string;
          start_date?: string | null;
          status?: string;
          target_age_ranges: string[];
          title: string;
          type?: string;
          updated_at?: string;
        };
        Update: {
          address_id?: string;
          category?: string;
          created_at?: string;
          description?: string | null;
          end_date?: string | null;
          id?: string;
          is_tutor?: boolean;
          max_participants?: number;
          price?: number;
          price_period?: string;
          provider_id?: string;
          schedule?: Json | null;
          search_normalized?: string;
          start_date?: string | null;
          status?: string;
          target_age_ranges?: string[];
          title?: string;
          type?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "activities_address_fkey";
            columns: ["address_id", "provider_id"];
            isOneToOne: false;
            referencedRelation: "addresses";
            referencedColumns: ["id", "provider_id"];
          },
          {
            foreignKeyName: "activities_category_fkey";
            columns: ["category"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["name"];
          },
          {
            foreignKeyName: "activities_provider_id_fkey";
            columns: ["provider_id"];
            isOneToOne: false;
            referencedRelation: "accounts";
            referencedColumns: ["id"];
          },
        ];
      };
      addresses: {
        Row: {
          address: string | null;
          city: string;
          country: string | null;
          created_at: string;
          door: string | null;
          floor: string | null;
          id: string;
          number: string | null;
          postal_code: string | null;
          provider_id: string;
          province: string | null;
          street: string | null;
        };
        ComputedFields: never;
        Insert: {
          address?: string | null;
          city: string;
          country?: string | null;
          created_at?: string;
          door?: string | null;
          floor?: string | null;
          id?: string;
          number?: string | null;
          postal_code?: string | null;
          provider_id?: string;
          province?: string | null;
          street?: string | null;
        };
        Update: {
          address?: string | null;
          city?: string;
          country?: string | null;
          created_at?: string;
          door?: string | null;
          floor?: string | null;
          id?: string;
          number?: string | null;
          postal_code?: string | null;
          provider_id?: string;
          province?: string | null;
          street?: string | null;
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
      categories: {
        Row: {
          category_type: string;
          id: string;
          name: string;
        };
        ComputedFields: never;
        Insert: {
          category_type: string;
          id?: string;
          name: string;
        };
        Update: {
          category_type?: string;
          id?: string;
          name?: string;
        };
        Relationships: [];
      };
      enrolment_requests: {
        Row: {
          activity_id: string;
          created_at: string;
          customer_id: string;
          family_profile_id: string;
          id: string;
          message: string | null;
          status: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          activity_id: string;
          created_at?: string;
          customer_id: string;
          family_profile_id: string;
          id?: string;
          message?: string | null;
          status?: string;
          updated_at?: string;
        };
        Update: {
          activity_id?: string;
          created_at?: string;
          customer_id?: string;
          family_profile_id?: string;
          id?: string;
          message?: string | null;
          status?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "enrolment_requests_activity_id_fkey";
            columns: ["activity_id"];
            isOneToOne: false;
            referencedRelation: "activities";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "enrolment_requests_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "accounts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "enrolment_requests_family_profile_id_fkey";
            columns: ["family_profile_id"];
            isOneToOne: false;
            referencedRelation: "family_profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      family_group_members: {
        Row: {
          account_id: string;
          created_at: string;
          family_group_id: string;
        };
        ComputedFields: never;
        Insert: {
          account_id: string;
          created_at?: string;
          family_group_id: string;
        };
        Update: {
          account_id?: string;
          created_at?: string;
          family_group_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "family_group_members_account_id_fkey";
            columns: ["account_id"];
            isOneToOne: true;
            referencedRelation: "accounts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "family_group_members_family_group_id_fkey";
            columns: ["family_group_id"];
            isOneToOne: false;
            referencedRelation: "family_groups";
            referencedColumns: ["id"];
          },
        ];
      };
      family_groups: {
        Row: {
          created_at: string;
          id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          id?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
        };
        Relationships: [];
      };
      family_profiles: {
        Row: {
          age_range: string | null;
          created_at: string;
          date_of_birth: string | null;
          family_group_id: string;
          first_name: string;
          id: string;
          interests: string[];
        };
        ComputedFields: never;
        Insert: {
          age_range?: string | null;
          created_at?: string;
          date_of_birth?: string | null;
          family_group_id: string;
          first_name: string;
          id?: string;
          interests?: string[];
        };
        Update: {
          age_range?: string | null;
          created_at?: string;
          date_of_birth?: string | null;
          family_group_id?: string;
          first_name?: string;
          id?: string;
          interests?: string[];
        };
        Relationships: [
          {
            foreignKeyName: "family_profiles_family_group_id_fkey";
            columns: ["family_group_id"];
            isOneToOne: false;
            referencedRelation: "family_groups";
            referencedColumns: ["id"];
          },
        ];
      };
      favourites: {
        Row: {
          activity_id: string;
          created_at: string;
          customer_id: string;
        };
        ComputedFields: never;
        Insert: {
          activity_id: string;
          created_at?: string;
          customer_id: string;
        };
        Update: {
          activity_id?: string;
          created_at?: string;
          customer_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "favourites_activity_id_fkey";
            columns: ["activity_id"];
            isOneToOne: false;
            referencedRelation: "activities";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "favourites_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "accounts";
            referencedColumns: ["id"];
          },
        ];
      };
      languages: {
        Row: {
          activity_id: string;
          id: string;
          language: string;
          level: string;
        };
        ComputedFields: never;
        Insert: {
          activity_id: string;
          id?: string;
          language: string;
          level: string;
        };
        Update: {
          activity_id?: string;
          id?: string;
          language?: string;
          level?: string;
        };
        Relationships: [
          {
            foreignKeyName: "languages_activity_id_fkey";
            columns: ["activity_id"];
            isOneToOne: false;
            referencedRelation: "activities";
            referencedColumns: ["id"];
          },
        ];
      };
      provider_profiles: {
        Row: {
          approved_at: string | null;
          approved_description: string | null;
          approved_headline: string | null;
          description: string;
          generated_at: string;
          headline: string;
          id: string;
          model: string;
          provider_id: string;
          sheet_updated_at: string | null;
          status: string;
        };
        ComputedFields: never;
        Insert: {
          approved_at?: string | null;
          approved_description?: string | null;
          approved_headline?: string | null;
          description: string;
          generated_at?: string;
          headline: string;
          id?: string;
          model: string;
          provider_id?: string;
          sheet_updated_at?: string | null;
          status?: string;
        };
        Update: {
          approved_at?: string | null;
          approved_description?: string | null;
          approved_headline?: string | null;
          description?: string;
          generated_at?: string;
          headline?: string;
          id?: string;
          model?: string;
          provider_id?: string;
          sheet_updated_at?: string | null;
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
      search_summary_cache: {
        Row: {
          cache_key: string;
          created_at: string;
          expires_at: string;
          summary: string;
        };
        ComputedFields: never;
        Insert: {
          cache_key: string;
          created_at?: string;
          expires_at: string;
          summary: string;
        };
        Update: {
          cache_key?: string;
          created_at?: string;
          expires_at?: string;
          summary?: string;
        };
        Relationships: [];
      };
      search_summary_requests: {
        Row: {
          id: string;
          requested_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          id?: string;
          requested_at?: string;
          user_id: string;
        };
        Update: {
          id?: string;
          requested_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "search_summary_requests_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
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
          updated_at: string;
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
          updated_at?: string;
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
          updated_at?: string;
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
      accept_enrolment_request: {
        Args: { p_request_id: string };
        Returns: undefined;
      };
      activity_capacity: {
        Args: { p_activity_id: string };
        Returns: {
          available_places: number;
          max_participants: number;
          taken_places: number;
        }[];
      };
      available_activity_filters: {
        Args: Record<PropertyKey, never>;
        Returns: Json;
      };
      can_publish_activity: {
        Args: { p_activity_id: string };
        Returns: boolean;
      };
      cancel_enrolment_request: {
        Args: { p_request_id: string };
        Returns: undefined;
      };
      is_company: { Args: Record<PropertyKey, never>; Returns: boolean };
      is_family_member: { Args: { group_id: string }; Returns: boolean };
      is_valid_schedule: { Args: { schedule: Json }; Returns: boolean };
      provider_enrolled_family_profiles: {
        Args: { p_activity_id: string };
        Returns: {
          age_years: number;
          first_name: string;
        }[];
      };
      public_approved_provider_profiles: {
        Args: Record<PropertyKey, never>;
        Returns: {
          description: string;
          headline: string;
          provider_id: string;
        }[];
      };
      public_provider_contacts: {
        Args: Record<PropertyKey, never>;
        Returns: {
          email: string;
          name: string;
          phone_number: string;
          provider_id: string;
          website: string;
        }[];
      };
      recommend_activities: {
        Args: { p_city: string; p_family_profile_id: string };
        Returns: {
          address_id: string;
          category: string;
          created_at: string;
          description: string | null;
          end_date: string | null;
          id: string;
          is_tutor: boolean;
          max_participants: number;
          price: number;
          price_period: string;
          provider_id: string;
          schedule: Json | null;
          search_normalized: string;
          start_date: string | null;
          status: string;
          target_age_ranges: string[];
          title: string;
          type: string;
          updated_at: string;
        }[];
        SetofOptions: {
          from: "*";
          to: "activities";
          isOneToOne: false;
          isSetofReturn: true;
        };
      };
      register_search_summary_request: {
        Args: {
          p_max_requests: number;
          p_user_id: string;
          p_window_minutes: number;
        };
        Returns: boolean;
      };
      reject_enrolment_request: {
        Args: { p_request_id: string };
        Returns: undefined;
      };
      search_activities: {
        Args: {
          p_category?: string;
          p_city?: string;
          p_limit?: number;
          p_offset?: number;
          p_price_max?: number;
          p_price_min?: number;
          p_query?: string;
        };
        Returns: {
          address_id: string;
          category: string;
          created_at: string;
          description: string | null;
          end_date: string | null;
          id: string;
          is_tutor: boolean;
          max_participants: number;
          price: number;
          price_period: string;
          provider_id: string;
          schedule: Json | null;
          search_normalized: string;
          start_date: string | null;
          status: string;
          target_age_ranges: string[];
          title: string;
          type: string;
          updated_at: string;
        }[];
        SetofOptions: {
          from: "*";
          to: "activities";
          isOneToOne: false;
          isSetofReturn: true;
        };
      };
      send_enrolment_request: {
        Args: {
          p_activity_id: string;
          p_family_profile_id: string;
          p_message?: string;
        };
        Returns: string;
      };
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
