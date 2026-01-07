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
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      ab_tests: {
        Row: {
          campaign_id: string | null
          confidence_level: number | null
          created_at: string
          description: string | null
          end_date: string | null
          id: string
          name: string
          start_date: string | null
          status: string
          traffic_split: Json
          updated_at: string
          user_id: string
          variants: Json
          winner_variant_id: string | null
        }
        Insert: {
          campaign_id?: string | null
          confidence_level?: number | null
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          name: string
          start_date?: string | null
          status?: string
          traffic_split: Json
          updated_at?: string
          user_id: string
          variants: Json
          winner_variant_id?: string | null
        }
        Update: {
          campaign_id?: string | null
          confidence_level?: number | null
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          name?: string
          start_date?: string | null
          status?: string
          traffic_split?: Json
          updated_at?: string
          user_id?: string
          variants?: Json
          winner_variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ab_tests_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_modules: {
        Row: {
          author: string
          category: string
          created_at: string
          description: string | null
          icon_name: string
          id: string
          is_active: boolean
          is_system_module: boolean
          module_id: string
          path: string
          sort_order: number
          title: string
          updated_at: string
          version: string
        }
        Insert: {
          author?: string
          category: string
          created_at?: string
          description?: string | null
          icon_name: string
          id?: string
          is_active?: boolean
          is_system_module?: boolean
          module_id: string
          path: string
          sort_order?: number
          title: string
          updated_at?: string
          version?: string
        }
        Update: {
          author?: string
          category?: string
          created_at?: string
          description?: string | null
          icon_name?: string
          id?: string
          is_active?: boolean
          is_system_module?: boolean
          module_id?: string
          path?: string
          sort_order?: number
          title?: string
          updated_at?: string
          version?: string
        }
        Relationships: []
      }
      advisor_recent_queries: {
        Row: {
          created_at: string
          id: string
          query_text: string
          query_type: string | null
          result_summary: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          query_text: string
          query_type?: string | null
          result_summary?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          query_text?: string
          query_type?: string | null
          result_summary?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      agents: {
        Row: {
          configuration: Json
          created_at: string
          description: string | null
          id: string
          name: string
          status: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          configuration?: Json
          created_at?: string
          description?: string | null
          id?: string
          name: string
          status?: string
          type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          configuration?: Json
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          status?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_audience_segments: {
        Row: {
          ai_suggested: boolean | null
          created_at: string
          description: string | null
          id: string
          predicted_performance: number | null
          segment_name: string
          targeting_criteria: Json
          user_id: string
        }
        Insert: {
          ai_suggested?: boolean | null
          created_at?: string
          description?: string | null
          id?: string
          predicted_performance?: number | null
          segment_name: string
          targeting_criteria: Json
          user_id: string
        }
        Update: {
          ai_suggested?: boolean | null
          created_at?: string
          description?: string | null
          id?: string
          predicted_performance?: number | null
          segment_name?: string
          targeting_criteria?: Json
          user_id?: string
        }
        Relationships: []
      }
      ai_content_generations: {
        Row: {
          confidence_score: number | null
          created_at: string
          generated_content: Json
          generation_type: string
          id: string
          input_prompt: string
          model_used: string | null
          processing_time_ms: number | null
          user_id: string
        }
        Insert: {
          confidence_score?: number | null
          created_at?: string
          generated_content: Json
          generation_type: string
          id?: string
          input_prompt: string
          model_used?: string | null
          processing_time_ms?: number | null
          user_id: string
        }
        Update: {
          confidence_score?: number | null
          created_at?: string
          generated_content?: Json
          generation_type?: string
          id?: string
          input_prompt?: string
          model_used?: string | null
          processing_time_ms?: number | null
          user_id?: string
        }
        Relationships: []
      }
      ai_generation_outputs: {
        Row: {
          ai_model_used: string | null
          created_at: string
          error_message: string | null
          generation_duration_ms: number | null
          generation_step: string
          generation_success: boolean
          id: string
          processed_output: Json
          prompt_used: string
          raw_ai_response: string
          session_id: string
          tokens_used: number | null
          user_input_context: Json | null
        }
        Insert: {
          ai_model_used?: string | null
          created_at?: string
          error_message?: string | null
          generation_duration_ms?: number | null
          generation_step: string
          generation_success?: boolean
          id?: string
          processed_output: Json
          prompt_used: string
          raw_ai_response: string
          session_id: string
          tokens_used?: number | null
          user_input_context?: Json | null
        }
        Update: {
          ai_model_used?: string | null
          created_at?: string
          error_message?: string | null
          generation_duration_ms?: number | null
          generation_step?: string
          generation_success?: boolean
          id?: string
          processed_output?: Json
          prompt_used?: string
          raw_ai_response?: string
          session_id?: string
          tokens_used?: number | null
          user_input_context?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_generation_outputs_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "project_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_interactions: {
        Row: {
          ai_response: Json
          confidence_score: number | null
          created_at: string | null
          id: string
          input_data: Json
          interaction_type: string
          model_used: string | null
          processing_time_ms: number | null
          session_id: string | null
          user_id: string | null
        }
        Insert: {
          ai_response: Json
          confidence_score?: number | null
          created_at?: string | null
          id?: string
          input_data: Json
          interaction_type: string
          model_used?: string | null
          processing_time_ms?: number | null
          session_id?: string | null
          user_id?: string | null
        }
        Update: {
          ai_response?: Json
          confidence_score?: number | null
          created_at?: string | null
          id?: string
          input_data?: Json
          interaction_type?: string
          model_used?: string | null
          processing_time_ms?: number | null
          session_id?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      ai_pricing_calculations: {
        Row: {
          ai_analysis: Json
          confidence_score: number
          created_at: string
          discounts_applied: Json | null
          id: string
          input_data: Json
          market_position: string | null
          policy_type: string
          recommended_premium: number
          user_id: string
        }
        Insert: {
          ai_analysis: Json
          confidence_score: number
          created_at?: string
          discounts_applied?: Json | null
          id?: string
          input_data: Json
          market_position?: string | null
          policy_type: string
          recommended_premium: number
          user_id: string
        }
        Update: {
          ai_analysis?: Json
          confidence_score?: number
          created_at?: string
          discounts_applied?: Json | null
          id?: string
          input_data?: Json
          market_position?: string | null
          policy_type?: string
          recommended_premium?: number
          user_id?: string
        }
        Relationships: []
      }
      ai_recommendations: {
        Row: {
          confidence_score: number
          context_id: string
          context_type: string
          created_at: string
          id: string
          implementation_notes: string | null
          priority_level: string
          recommendation_description: string
          recommendation_details: Json | null
          recommendation_title: string
          recommendation_type: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          confidence_score: number
          context_id: string
          context_type: string
          created_at?: string
          id?: string
          implementation_notes?: string | null
          priority_level?: string
          recommendation_description: string
          recommendation_details?: Json | null
          recommendation_title: string
          recommendation_type: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          confidence_score?: number
          context_id?: string
          context_type?: string
          created_at?: string
          id?: string
          implementation_notes?: string | null
          priority_level?: string
          recommendation_description?: string
          recommendation_details?: Json | null
          recommendation_title?: string
          recommendation_type?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      alternatives_calculations: {
        Row: {
          allocation_chart_data: Json
          asset_percentage: number
          calculated_at: string
          created_at: string
          detailed_holdings: Json
          id: string
          performance_metrics: Json
          sub_asset_summary: Json
          total_cost: number
          total_gains: number
          total_market_value: number
          total_returns: number
          updated_at: string
          user_id: string
        }
        Insert: {
          allocation_chart_data?: Json
          asset_percentage?: number
          calculated_at?: string
          created_at?: string
          detailed_holdings?: Json
          id?: string
          performance_metrics?: Json
          sub_asset_summary?: Json
          total_cost?: number
          total_gains?: number
          total_market_value?: number
          total_returns?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          allocation_chart_data?: Json
          asset_percentage?: number
          calculated_at?: string
          created_at?: string
          detailed_holdings?: Json
          id?: string
          performance_metrics?: Json
          sub_asset_summary?: Json
          total_cost?: number
          total_gains?: number
          total_market_value?: number
          total_returns?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      api_configurations: {
        Row: {
          auth_details: Json | null
          auth_type: string | null
          base_url: string
          created_at: string
          description: string | null
          endpoints: Json | null
          id: string
          is_active: boolean
          metadata: Json | null
          retry_attempts: number | null
          retry_delay_ms: number | null
          service_name: string
          timeout_ms: number | null
          updated_at: string
        }
        Insert: {
          auth_details?: Json | null
          auth_type?: string | null
          base_url: string
          created_at?: string
          description?: string | null
          endpoints?: Json | null
          id?: string
          is_active?: boolean
          metadata?: Json | null
          retry_attempts?: number | null
          retry_delay_ms?: number | null
          service_name: string
          timeout_ms?: number | null
          updated_at?: string
        }
        Update: {
          auth_details?: Json | null
          auth_type?: string | null
          base_url?: string
          created_at?: string
          description?: string | null
          endpoints?: Json | null
          id?: string
          is_active?: boolean
          metadata?: Json | null
          retry_attempts?: number | null
          retry_delay_ms?: number | null
          service_name?: string
          timeout_ms?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      api_endpoints: {
        Row: {
          authentication: Json | null
          created_at: string
          headers: Json | null
          id: string
          is_active: boolean
          method: string
          name: string
          rate_limit: number | null
          timeout_ms: number | null
          updated_at: string
          url: string
          user_id: string
        }
        Insert: {
          authentication?: Json | null
          created_at?: string
          headers?: Json | null
          id?: string
          is_active?: boolean
          method?: string
          name: string
          rate_limit?: number | null
          timeout_ms?: number | null
          updated_at?: string
          url: string
          user_id: string
        }
        Update: {
          authentication?: Json | null
          created_at?: string
          headers?: Json | null
          id?: string
          is_active?: boolean
          method?: string
          name?: string
          rate_limit?: number | null
          timeout_ms?: number | null
          updated_at?: string
          url?: string
          user_id?: string
        }
        Relationships: []
      }
      application_customers: {
        Row: {
          application_id: string | null
          company_name: string | null
          created_at: string
          customer_email: string | null
          customer_name: string
          customer_phone: string | null
          customer_since: string | null
          id: string
          industry: string | null
          last_activity_at: string | null
          metadata: Json | null
          notes: string | null
          status: string
          subscription_tier: string | null
          total_revenue: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          application_id?: string | null
          company_name?: string | null
          created_at?: string
          customer_email?: string | null
          customer_name: string
          customer_phone?: string | null
          customer_since?: string | null
          id?: string
          industry?: string | null
          last_activity_at?: string | null
          metadata?: Json | null
          notes?: string | null
          status?: string
          subscription_tier?: string | null
          total_revenue?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          application_id?: string | null
          company_name?: string | null
          created_at?: string
          customer_email?: string | null
          customer_name?: string
          customer_phone?: string | null
          customer_since?: string | null
          id?: string
          industry?: string | null
          last_activity_at?: string | null
          metadata?: Json | null
          notes?: string | null
          status?: string
          subscription_tier?: string | null
          total_revenue?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "application_customers_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
        ]
      }
      application_llm_configurations: {
        Row: {
          application_id: string
          context_description: string | null
          created_at: string
          id: string
          is_active: boolean
          is_primary: boolean
          llm_configuration_id: string
          priority: number
          updated_at: string
        }
        Insert: {
          application_id: string
          context_description?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          is_primary?: boolean
          llm_configuration_id: string
          priority?: number
          updated_at?: string
        }
        Update: {
          application_id?: string
          context_description?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          is_primary?: boolean
          llm_configuration_id?: string
          priority?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "application_llm_configurations_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "application_llm_configurations_llm_configuration_id_fkey"
            columns: ["llm_configuration_id"]
            isOneToOne: false
            referencedRelation: "llm_configurations"
            referencedColumns: ["id"]
          },
        ]
      }
      application_modules: {
        Row: {
          color_class: string
          created_at: string | null
          description_en: string
          description_id: string
          features_en: Json | null
          features_id: Json | null
          icon_name: string
          id: string
          is_active: boolean | null
          module_id: string
          sort_order: number | null
          title_en: string
          title_id: string
          updated_at: string | null
        }
        Insert: {
          color_class: string
          created_at?: string | null
          description_en: string
          description_id: string
          features_en?: Json | null
          features_id?: Json | null
          icon_name: string
          id?: string
          is_active?: boolean | null
          module_id: string
          sort_order?: number | null
          title_en: string
          title_id: string
          updated_at?: string | null
        }
        Update: {
          color_class?: string
          created_at?: string | null
          description_en?: string
          description_id?: string
          features_en?: Json | null
          features_id?: Json | null
          icon_name?: string
          id?: string
          is_active?: boolean | null
          module_id?: string
          sort_order?: number | null
          title_en?: string
          title_id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      application_user_roles: {
        Row: {
          application_id: string
          created_at: string
          customer_id: string | null
          granted_at: string
          granted_by: string | null
          id: string
          is_active: boolean
          role: Database["public"]["Enums"]["application_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          application_id: string
          created_at?: string
          customer_id?: string | null
          granted_at?: string
          granted_by?: string | null
          id?: string
          is_active?: boolean
          role: Database["public"]["Enums"]["application_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          application_id?: string
          created_at?: string
          customer_id?: string | null
          granted_at?: string
          granted_by?: string | null
          id?: string
          is_active?: boolean
          role?: Database["public"]["Enums"]["application_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "application_user_roles_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "application_user_roles_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "application_customers"
            referencedColumns: ["id"]
          },
        ]
      }
      applications: {
        Row: {
          app_config: Json
          created_at: string
          description: string | null
          display_name: string
          forms: Json
          id: string
          is_active: boolean
          name: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          app_config?: Json
          created_at?: string
          description?: string | null
          display_name: string
          forms?: Json
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          app_config?: Json
          created_at?: string
          description?: string | null
          display_name?: string
          forms?: Json
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      asset_class_performance: {
        Row: {
          allocation_percent: number | null
          asset_class: string
          beginning_value: number
          benchmark_return_percent: number | null
          created_at: string
          currency: string | null
          ending_value: number
          id: string
          net_flows: number | null
          period_date: string
          period_type: string
          target_allocation_percent: number | null
          total_return: number | null
          total_return_percent: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          allocation_percent?: number | null
          asset_class: string
          beginning_value?: number
          benchmark_return_percent?: number | null
          created_at?: string
          currency?: string | null
          ending_value?: number
          id?: string
          net_flows?: number | null
          period_date: string
          period_type: string
          target_allocation_percent?: number | null
          total_return?: number | null
          total_return_percent?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          allocation_percent?: number | null
          asset_class?: string
          beginning_value?: number
          benchmark_return_percent?: number | null
          created_at?: string
          currency?: string | null
          ending_value?: number
          id?: string
          net_flows?: number | null
          period_date?: string
          period_type?: string
          target_allocation_percent?: number | null
          total_return?: number | null
          total_return_percent?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          id: string
          ip_address: unknown | null
          metadata: Json | null
          new_values: Json | null
          old_values: Json | null
          resource_id: string | null
          resource_type: string
          tenant_id: string
          timestamp: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          id?: string
          ip_address?: unknown | null
          metadata?: Json | null
          new_values?: Json | null
          old_values?: Json | null
          resource_id?: string | null
          resource_type: string
          tenant_id: string
          timestamp?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          id?: string
          ip_address?: unknown | null
          metadata?: Json | null
          new_values?: Json | null
          old_values?: Json | null
          resource_id?: string | null
          resource_type?: string
          tenant_id?: string
          timestamp?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      auth_audit_log: {
        Row: {
          created_at: string
          error_message: string | null
          event_type: string
          id: string
          ip_address: unknown | null
          success: boolean
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          event_type: string
          id?: string
          ip_address?: unknown | null
          success?: boolean
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          error_message?: string | null
          event_type?: string
          id?: string
          ip_address?: unknown | null
          success?: boolean
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      banner_interactions: {
        Row: {
          banner_id: string
          city: string | null
          country: string | null
          id: string
          interaction_type: string
          ip_address: unknown | null
          metadata: Json | null
          referrer: string | null
          session_id: string | null
          timestamp: string
          user_agent: string | null
        }
        Insert: {
          banner_id: string
          city?: string | null
          country?: string | null
          id?: string
          interaction_type: string
          ip_address?: unknown | null
          metadata?: Json | null
          referrer?: string | null
          session_id?: string | null
          timestamp?: string
          user_agent?: string | null
        }
        Update: {
          banner_id?: string
          city?: string | null
          country?: string | null
          id?: string
          interaction_type?: string
          ip_address?: unknown | null
          metadata?: Json | null
          referrer?: string | null
          session_id?: string | null
          timestamp?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "banner_interactions_banner_id_fkey"
            columns: ["banner_id"]
            isOneToOne: false
            referencedRelation: "banners"
            referencedColumns: ["id"]
          },
        ]
      }
      banners: {
        Row: {
          ai_generated: boolean | null
          ai_score: number | null
          campaign_id: string | null
          campaign_objective: string | null
          clicks: number | null
          content: string
          conversions: number | null
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          impressions: number | null
          metadata: Json | null
          spend: number | null
          status: string
          target_audience: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_generated?: boolean | null
          ai_score?: number | null
          campaign_id?: string | null
          campaign_objective?: string | null
          clicks?: number | null
          content: string
          conversions?: number | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          impressions?: number | null
          metadata?: Json | null
          spend?: number | null
          status?: string
          target_audience?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_generated?: boolean | null
          ai_score?: number | null
          campaign_id?: string | null
          campaign_objective?: string | null
          clicks?: number | null
          content?: string
          conversions?: number | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          impressions?: number | null
          metadata?: Json | null
          spend?: number | null
          status?: string
          target_audience?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "banners_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      bill_analyses: {
        Row: {
          account_id: string | null
          analysis_date: string
          analysis_status: string
          billing_address: string | null
          billing_period: string | null
          created_at: string
          currency: string | null
          current_provider: string | null
          customer_company: string | null
          customer_email: string | null
          customer_metadata: Json | null
          customer_name: string | null
          file_name: string
          file_size: number | null
          file_type: string
          id: string
          total_estimated_savings: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          account_id?: string | null
          analysis_date?: string
          analysis_status?: string
          billing_address?: string | null
          billing_period?: string | null
          created_at?: string
          currency?: string | null
          current_provider?: string | null
          customer_company?: string | null
          customer_email?: string | null
          customer_metadata?: Json | null
          customer_name?: string | null
          file_name: string
          file_size?: number | null
          file_type: string
          id?: string
          total_estimated_savings?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          account_id?: string | null
          analysis_date?: string
          analysis_status?: string
          billing_address?: string | null
          billing_period?: string | null
          created_at?: string
          currency?: string | null
          current_provider?: string | null
          customer_company?: string | null
          customer_email?: string | null
          customer_metadata?: Json | null
          customer_name?: string | null
          file_name?: string
          file_size?: number | null
          file_type?: string
          id?: string
          total_estimated_savings?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      billing_events: {
        Row: {
          created_at: string
          event_data: Json
          event_type: string
          id: string
          processed_at: string | null
          stripe_event_id: string | null
          tenant_id: string
        }
        Insert: {
          created_at?: string
          event_data?: Json
          event_type: string
          id?: string
          processed_at?: string | null
          stripe_event_id?: string | null
          tenant_id: string
        }
        Update: {
          created_at?: string
          event_data?: Json
          event_type?: string
          id?: string
          processed_at?: string | null
          stripe_event_id?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "billing_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "customer_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "billing_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      brd_documents: {
        Row: {
          content: Json
          created_at: string
          export_formats: Json | null
          generated_at: string | null
          id: string
          project_id: string
          sections: Json
          status: string
          title: string
          updated_at: string
          word_count: number | null
        }
        Insert: {
          content?: Json
          created_at?: string
          export_formats?: Json | null
          generated_at?: string | null
          id?: string
          project_id: string
          sections?: Json
          status?: string
          title: string
          updated_at?: string
          word_count?: number | null
        }
        Update: {
          content?: Json
          created_at?: string
          export_formats?: Json | null
          generated_at?: string | null
          id?: string
          project_id?: string
          sections?: Json
          status?: string
          title?: string
          updated_at?: string
          word_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "brd_documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "excel_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      business_client_data_sources: {
        Row: {
          client_name: string
          created_at: string
          data_format: string | null
          extraction_method: string | null
          id: string
          is_active: boolean
          last_successful_fetch: string | null
          notes: string | null
          priority: number
          scraping_depth: number | null
          source_name: string
          source_type: string
          success_rate: number | null
          updated_at: string
          uploaded_files: Json | null
          url: string
        }
        Insert: {
          client_name: string
          created_at?: string
          data_format?: string | null
          extraction_method?: string | null
          id?: string
          is_active?: boolean
          last_successful_fetch?: string | null
          notes?: string | null
          priority?: number
          scraping_depth?: number | null
          source_name: string
          source_type?: string
          success_rate?: number | null
          updated_at?: string
          uploaded_files?: Json | null
          url: string
        }
        Update: {
          client_name?: string
          created_at?: string
          data_format?: string | null
          extraction_method?: string | null
          id?: string
          is_active?: boolean
          last_successful_fetch?: string | null
          notes?: string | null
          priority?: number
          scraping_depth?: number | null
          source_name?: string
          source_type?: string
          success_rate?: number | null
          updated_at?: string
          uploaded_files?: Json | null
          url?: string
        }
        Relationships: []
      }
      business_clients: {
        Row: {
          created_at: string
          customer_slug: string | null
          customer_status: string | null
          id: string
          name: string
          slug: string
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_slug?: string | null
          customer_status?: string | null
          id?: string
          name: string
          slug: string
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_slug?: string | null
          customer_status?: string | null
          id?: string
          name?: string
          slug?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_clients_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "customer_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "business_clients_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      business_clients_data: {
        Row: {
          active_subsidiaries: string | null
          arpu: string | null
          capacity: string | null
          car: string | null
          churn_rate: string | null
          client_name: string
          coal_production: string | null
          created_at: string
          customers: string | null
          domestic_revenue: string | null
          environmental_score: string | null
          export_revenue: string | null
          gold_production: string | null
          id: string
          key_challenges: Json | null
          ldr: string | null
          market_share: string | null
          net_income: string | null
          nickel_production: string | null
          npl: string | null
          online_revenue_share: string | null
          opportunities: Json | null
          plant_factor: string | null
          production_volume: string | null
          risk_areas: Json | null
          roic: string | null
          same_store_growth: string | null
          sector: string
          store_count: string | null
          strategic_priorities: Json | null
          subscribers: string | null
          subsidiaries: Json | null
          total_assets: string | null
          transmission: string | null
          updated_at: string
          year: number
          ytd_revenue: string | null
        }
        Insert: {
          active_subsidiaries?: string | null
          arpu?: string | null
          capacity?: string | null
          car?: string | null
          churn_rate?: string | null
          client_name: string
          coal_production?: string | null
          created_at?: string
          customers?: string | null
          domestic_revenue?: string | null
          environmental_score?: string | null
          export_revenue?: string | null
          gold_production?: string | null
          id?: string
          key_challenges?: Json | null
          ldr?: string | null
          market_share?: string | null
          net_income?: string | null
          nickel_production?: string | null
          npl?: string | null
          online_revenue_share?: string | null
          opportunities?: Json | null
          plant_factor?: string | null
          production_volume?: string | null
          risk_areas?: Json | null
          roic?: string | null
          same_store_growth?: string | null
          sector: string
          store_count?: string | null
          strategic_priorities?: Json | null
          subscribers?: string | null
          subsidiaries?: Json | null
          total_assets?: string | null
          transmission?: string | null
          updated_at?: string
          year: number
          ytd_revenue?: string | null
        }
        Update: {
          active_subsidiaries?: string | null
          arpu?: string | null
          capacity?: string | null
          car?: string | null
          churn_rate?: string | null
          client_name?: string
          coal_production?: string | null
          created_at?: string
          customers?: string | null
          domestic_revenue?: string | null
          environmental_score?: string | null
          export_revenue?: string | null
          gold_production?: string | null
          id?: string
          key_challenges?: Json | null
          ldr?: string | null
          market_share?: string | null
          net_income?: string | null
          nickel_production?: string | null
          npl?: string | null
          online_revenue_share?: string | null
          opportunities?: Json | null
          plant_factor?: string | null
          production_volume?: string | null
          risk_areas?: Json | null
          roic?: string | null
          same_store_growth?: string | null
          sector?: string
          store_count?: string | null
          strategic_priorities?: Json | null
          subscribers?: string | null
          subsidiaries?: Json | null
          total_assets?: string | null
          transmission?: string | null
          updated_at?: string
          year?: number
          ytd_revenue?: string | null
        }
        Relationships: []
      }
      cached_kpi_predictions: {
        Row: {
          company_name: string
          created_at: string
          data_quality: string
          generated_at: string
          id: string
          is_stale: boolean
          prediction_data: Json
          sector: string
          updated_at: string
        }
        Insert: {
          company_name: string
          created_at?: string
          data_quality?: string
          generated_at?: string
          id?: string
          is_stale?: boolean
          prediction_data: Json
          sector: string
          updated_at?: string
        }
        Update: {
          company_name?: string
          created_at?: string
          data_quality?: string
          generated_at?: string
          id?: string
          is_stale?: boolean
          prediction_data?: Json
          sector?: string
          updated_at?: string
        }
        Relationships: []
      }
      campaign_analytics: {
        Row: {
          banner_id: string | null
          campaign_id: string
          clicks: number | null
          conversions: number | null
          cpc: number | null
          cpm: number | null
          created_at: string
          ctr: number | null
          cvr: number | null
          date: string
          id: string
          impressions: number | null
          revenue: number | null
          roas: number | null
          spend: number | null
        }
        Insert: {
          banner_id?: string | null
          campaign_id: string
          clicks?: number | null
          conversions?: number | null
          cpc?: number | null
          cpm?: number | null
          created_at?: string
          ctr?: number | null
          cvr?: number | null
          date: string
          id?: string
          impressions?: number | null
          revenue?: number | null
          roas?: number | null
          spend?: number | null
        }
        Update: {
          banner_id?: string | null
          campaign_id?: string
          clicks?: number | null
          conversions?: number | null
          cpc?: number | null
          cpm?: number | null
          created_at?: string
          ctr?: number | null
          cvr?: number | null
          date?: string
          id?: string
          impressions?: number | null
          revenue?: number | null
          roas?: number | null
          spend?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_analytics_banner_id_fkey"
            columns: ["banner_id"]
            isOneToOne: false
            referencedRelation: "banners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_analytics_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          budget: number | null
          created_at: string
          description: string | null
          end_date: string
          id: string
          name: string
          start_date: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          budget?: number | null
          created_at?: string
          description?: string | null
          end_date: string
          id?: string
          name: string
          start_date: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          budget?: number | null
          created_at?: string
          description?: string | null
          end_date?: string
          id?: string
          name?: string
          start_date?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      cash_calculations: {
        Row: {
          calculated_at: string
          cash_allocation: number
          cash_breakdown: Json
          created_at: string
          detailed_holdings: Json
          id: string
          liquidity_metrics: Json
          total_cash_value: number
          updated_at: string
          user_id: string
          yield_analysis: Json
        }
        Insert: {
          calculated_at?: string
          cash_allocation?: number
          cash_breakdown?: Json
          created_at?: string
          detailed_holdings?: Json
          id?: string
          liquidity_metrics?: Json
          total_cash_value?: number
          updated_at?: string
          user_id: string
          yield_analysis?: Json
        }
        Update: {
          calculated_at?: string
          cash_allocation?: number
          cash_breakdown?: Json
          created_at?: string
          detailed_holdings?: Json
          id?: string
          liquidity_metrics?: Json
          total_cash_value?: number
          updated_at?: string
          user_id?: string
          yield_analysis?: Json
        }
        Relationships: []
      }
      cash_flow_charts: {
        Row: {
          client_name: string
          created_at: string
          financing_cash_flow: number
          id: string
          investing_cash_flow: number
          month: string
          operating_cash_flow: number
          total_cash_flow: number
          updated_at: string
          year: number
        }
        Insert: {
          client_name: string
          created_at?: string
          financing_cash_flow: number
          id?: string
          investing_cash_flow: number
          month: string
          operating_cash_flow: number
          total_cash_flow: number
          updated_at?: string
          year: number
        }
        Update: {
          client_name?: string
          created_at?: string
          financing_cash_flow?: number
          id?: string
          investing_cash_flow?: number
          month?: string
          operating_cash_flow?: number
          total_cash_flow?: number
          updated_at?: string
          year?: number
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          context: Json | null
          created_at: string
          id: string
          message: string
          response: string | null
          rfp_id: string | null
          user_id: string
        }
        Insert: {
          context?: Json | null
          created_at?: string
          id?: string
          message: string
          response?: string | null
          rfp_id?: string | null
          user_id: string
        }
        Update: {
          context?: Json | null
          created_at?: string
          id?: string
          message?: string
          response?: string | null
          rfp_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_rfp_id_fkey"
            columns: ["rfp_id"]
            isOneToOne: false
            referencedRelation: "rfps"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_sessions: {
        Row: {
          created_at: string
          id: string
          project_id: string
          session_name: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          project_id: string
          session_name?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          project_id?: string
          session_name?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_sessions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      claim_documents: {
        Row: {
          ai_analysis: Json | null
          claim_id: string | null
          document_type: string
          file_name: string
          file_path: string
          file_size: number | null
          id: string
          mime_type: string | null
          uploaded_at: string | null
          user_id: string
          verification_status: string | null
        }
        Insert: {
          ai_analysis?: Json | null
          claim_id?: string | null
          document_type: string
          file_name: string
          file_path: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          uploaded_at?: string | null
          user_id: string
          verification_status?: string | null
        }
        Update: {
          ai_analysis?: Json | null
          claim_id?: string | null
          document_type?: string
          file_name?: string
          file_path?: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          uploaded_at?: string | null
          user_id?: string
          verification_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "claim_documents_claim_id_fkey"
            columns: ["claim_id"]
            isOneToOne: false
            referencedRelation: "claims"
            referencedColumns: ["id"]
          },
        ]
      }
      claims: {
        Row: {
          amount_approved: number | null
          amount_claimed: number
          claim_number: string
          claim_type: string
          created_at: string
          description: string | null
          id: string
          incident_date: string
          metadata: Json | null
          policy_id: string | null
          policy_number: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_approved?: number | null
          amount_claimed: number
          claim_number: string
          claim_type: string
          created_at?: string
          description?: string | null
          id?: string
          incident_date: string
          metadata?: Json | null
          policy_id?: string | null
          policy_number?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_approved?: number | null
          amount_claimed?: number
          claim_number?: string
          claim_type?: string
          created_at?: string
          description?: string | null
          id?: string
          incident_date?: string
          metadata?: Json | null
          policy_id?: string | null
          policy_number?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      clarifications: {
        Row: {
          answer: string | null
          answered_at: string | null
          answered_by: string | null
          asked_by: string | null
          created_at: string
          id: string
          is_public: boolean | null
          question: string
          rfp_id: string
        }
        Insert: {
          answer?: string | null
          answered_at?: string | null
          answered_by?: string | null
          asked_by?: string | null
          created_at?: string
          id?: string
          is_public?: boolean | null
          question: string
          rfp_id: string
        }
        Update: {
          answer?: string | null
          answered_at?: string | null
          answered_by?: string | null
          asked_by?: string | null
          created_at?: string
          id?: string
          is_public?: boolean | null
          question?: string
          rfp_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "clarifications_rfp_id_fkey"
            columns: ["rfp_id"]
            isOneToOne: false
            referencedRelation: "rfps"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          client_name: string
          client_spoc: string | null
          client_spoc_email: string | null
          client_spoc_mobile: string | null
          created_at: string
          customer_slug: string | null
          id: string
          location: string | null
          revenue: string | null
          tenant_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          client_name: string
          client_spoc?: string | null
          client_spoc_email?: string | null
          client_spoc_mobile?: string | null
          created_at?: string
          customer_slug?: string | null
          id?: string
          location?: string | null
          revenue?: string | null
          tenant_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          client_name?: string
          client_spoc?: string | null
          client_spoc_email?: string | null
          client_spoc_mobile?: string | null
          created_at?: string
          customer_slug?: string | null
          id?: string
          location?: string | null
          revenue?: string | null
          tenant_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "clients_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "customer_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "clients_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      cloud_comparisons: {
        Row: {
          alternative_providers: Json
          bill_analysis_id: string
          created_at: string
          current_provider: string
          current_total_cost: number
          id: string
        }
        Insert: {
          alternative_providers?: Json
          bill_analysis_id: string
          created_at?: string
          current_provider: string
          current_total_cost: number
          id?: string
        }
        Update: {
          alternative_providers?: Json
          bill_analysis_id?: string
          created_at?: string
          current_provider?: string
          current_total_cost?: number
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cloud_comparisons_bill_analysis_id_fkey"
            columns: ["bill_analysis_id"]
            isOneToOne: false
            referencedRelation: "bill_analyses"
            referencedColumns: ["id"]
          },
        ]
      }
      collection_prompts: {
        Row: {
          created_at: string
          filters: Json | null
          id: string
          prompt_text: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          filters?: Json | null
          id?: string
          prompt_text: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          filters?: Json | null
          id?: string
          prompt_text?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      collection_stats: {
        Row: {
          id: string
          languages_found: string[] | null
          total_contributors: number | null
          total_repositories: number | null
          total_stars: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          id?: string
          languages_found?: string[] | null
          total_contributors?: number | null
          total_repositories?: number | null
          total_stars?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          id?: string
          languages_found?: string[] | null
          total_contributors?: number | null
          total_repositories?: number | null
          total_stars?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      column_mappings: {
        Row: {
          ai_confidence_score: number | null
          ai_suggestions: Json | null
          created_at: string
          data_type_conversion: string | null
          id: string
          is_required: boolean
          mapping_status: string
          mapping_type: string
          source_column: string
          source_connection_id: string
          source_schema: string
          source_table: string
          target_column: string
          target_connection_id: string
          target_schema: string
          target_table: string
          transformation_logic: string | null
          updated_at: string
          user_id: string
          validation_rules: Json | null
        }
        Insert: {
          ai_confidence_score?: number | null
          ai_suggestions?: Json | null
          created_at?: string
          data_type_conversion?: string | null
          id?: string
          is_required?: boolean
          mapping_status?: string
          mapping_type?: string
          source_column: string
          source_connection_id: string
          source_schema: string
          source_table: string
          target_column: string
          target_connection_id: string
          target_schema: string
          target_table: string
          transformation_logic?: string | null
          updated_at?: string
          user_id: string
          validation_rules?: Json | null
        }
        Update: {
          ai_confidence_score?: number | null
          ai_suggestions?: Json | null
          created_at?: string
          data_type_conversion?: string | null
          id?: string
          is_required?: boolean
          mapping_status?: string
          mapping_type?: string
          source_column?: string
          source_connection_id?: string
          source_schema?: string
          source_table?: string
          target_column?: string
          target_connection_id?: string
          target_schema?: string
          target_table?: string
          transformation_logic?: string | null
          updated_at?: string
          user_id?: string
          validation_rules?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "column_mappings_source_connection_id_fkey"
            columns: ["source_connection_id"]
            isOneToOne: false
            referencedRelation: "database_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "column_mappings_target_connection_id_fkey"
            columns: ["target_connection_id"]
            isOneToOne: false
            referencedRelation: "database_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      commodity_configs: {
        Row: {
          category: string
          created_at: string
          currency: string
          data_sources: Json
          default_price: number | null
          id: string
          is_active: boolean
          name: string
          symbol: string
          unit: string
          updated_at: string
          volatility_level: string | null
        }
        Insert: {
          category?: string
          created_at?: string
          currency?: string
          data_sources?: Json
          default_price?: number | null
          id?: string
          is_active?: boolean
          name: string
          symbol: string
          unit?: string
          updated_at?: string
          volatility_level?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          currency?: string
          data_sources?: Json
          default_price?: number | null
          id?: string
          is_active?: boolean
          name?: string
          symbol?: string
          unit?: string
          updated_at?: string
          volatility_level?: string | null
        }
        Relationships: []
      }
      commodity_prediction_sessions: {
        Row: {
          client_name: string
          created_at: string
          geographic_region: string
          id: string
          session_metadata: Json | null
          timeframe: string
          total_predictions: number | null
          user_id: string | null
        }
        Insert: {
          client_name: string
          created_at?: string
          geographic_region: string
          id?: string
          session_metadata?: Json | null
          timeframe: string
          total_predictions?: number | null
          user_id?: string | null
        }
        Update: {
          client_name?: string
          created_at?: string
          geographic_region?: string
          id?: string
          session_metadata?: Json | null
          timeframe?: string
          total_predictions?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      commodity_predictions: {
        Row: {
          ai_model_used: string | null
          client_name: string
          commodity: string
          confidence_score: number
          created_at: string
          currency: string
          current_price: number
          data_quality: string | null
          data_sources: Json | null
          geographic_region: string
          geopolitical_data: Json | null
          id: string
          key_factors: Json | null
          news_sentiment_data: Json | null
          predicted_1_month: number
          predicted_1_year: number
          predicted_3_month: number
          predicted_6_month: number
          price_drivers: Json | null
          processing_time_ms: number | null
          risk_level: string | null
          session_id: string | null
          supply_demand_data: Json | null
          trend: string
          updated_at: string
          user_id: string | null
          volatility: number | null
        }
        Insert: {
          ai_model_used?: string | null
          client_name: string
          commodity: string
          confidence_score: number
          created_at?: string
          currency: string
          current_price: number
          data_quality?: string | null
          data_sources?: Json | null
          geographic_region: string
          geopolitical_data?: Json | null
          id?: string
          key_factors?: Json | null
          news_sentiment_data?: Json | null
          predicted_1_month: number
          predicted_1_year: number
          predicted_3_month: number
          predicted_6_month: number
          price_drivers?: Json | null
          processing_time_ms?: number | null
          risk_level?: string | null
          session_id?: string | null
          supply_demand_data?: Json | null
          trend: string
          updated_at?: string
          user_id?: string | null
          volatility?: number | null
        }
        Update: {
          ai_model_used?: string | null
          client_name?: string
          commodity?: string
          confidence_score?: number
          created_at?: string
          currency?: string
          current_price?: number
          data_quality?: string | null
          data_sources?: Json | null
          geographic_region?: string
          geopolitical_data?: Json | null
          id?: string
          key_factors?: Json | null
          news_sentiment_data?: Json | null
          predicted_1_month?: number
          predicted_1_year?: number
          predicted_3_month?: number
          predicted_6_month?: number
          price_drivers?: Json | null
          processing_time_ms?: number | null
          risk_level?: string | null
          session_id?: string | null
          supply_demand_data?: Json | null
          trend?: string
          updated_at?: string
          user_id?: string | null
          volatility?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "commodity_predictions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "commodity_prediction_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      compliance_action_comments: {
        Row: {
          action_id: string
          comment: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          action_id: string
          comment: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          action_id?: string
          comment?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "compliance_action_comments_action_id_fkey"
            columns: ["action_id"]
            isOneToOne: false
            referencedRelation: "compliance_actions"
            referencedColumns: ["id"]
          },
        ]
      }
      compliance_actions: {
        Row: {
          assigned_by: string | null
          assigned_to: string | null
          checklist_item_id: string | null
          completed_at: string | null
          compliance_violation: string | null
          created_at: string
          department: string | null
          description: string | null
          document_id: string | null
          due_date: string | null
          evidence_urls: Json | null
          framework_id: string
          id: string
          priority: string
          remediation_steps: Json | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          assigned_by?: string | null
          assigned_to?: string | null
          checklist_item_id?: string | null
          completed_at?: string | null
          compliance_violation?: string | null
          created_at?: string
          department?: string | null
          description?: string | null
          document_id?: string | null
          due_date?: string | null
          evidence_urls?: Json | null
          framework_id: string
          id?: string
          priority?: string
          remediation_steps?: Json | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          assigned_by?: string | null
          assigned_to?: string | null
          checklist_item_id?: string | null
          completed_at?: string | null
          compliance_violation?: string | null
          created_at?: string
          department?: string | null
          description?: string | null
          document_id?: string | null
          due_date?: string | null
          evidence_urls?: Json | null
          framework_id?: string
          id?: string
          priority?: string
          remediation_steps?: Json | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      compliance_activities: {
        Row: {
          activity_type: string
          client_name: string
          created_at: string
          description: string
          id: string
          status: string
          timestamp_info: string
          updated_at: string
          year: number
        }
        Insert: {
          activity_type: string
          client_name: string
          created_at?: string
          description: string
          id?: string
          status: string
          timestamp_info: string
          updated_at?: string
          year: number
        }
        Update: {
          activity_type?: string
          client_name?: string
          created_at?: string
          description?: string
          id?: string
          status?: string
          timestamp_info?: string
          updated_at?: string
          year?: number
        }
        Relationships: []
      }
      compliance_alerts: {
        Row: {
          action_id: string | null
          affected_documents: number | null
          alert_type: string
          created_at: string
          description: string
          dismissed_at: string | null
          framework_id: string | null
          id: string
          metadata: Json | null
          requirement_id: string | null
          resolved_at: string | null
          severity: string
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          action_id?: string | null
          affected_documents?: number | null
          alert_type: string
          created_at?: string
          description: string
          dismissed_at?: string | null
          framework_id?: string | null
          id?: string
          metadata?: Json | null
          requirement_id?: string | null
          resolved_at?: string | null
          severity?: string
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          action_id?: string | null
          affected_documents?: number | null
          alert_type?: string
          created_at?: string
          description?: string
          dismissed_at?: string | null
          framework_id?: string | null
          id?: string
          metadata?: Json | null
          requirement_id?: string | null
          resolved_at?: string | null
          severity?: string
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "compliance_alerts_requirement_id_fkey"
            columns: ["requirement_id"]
            isOneToOne: false
            referencedRelation: "indonesian_regulatory_requirements"
            referencedColumns: ["id"]
          },
        ]
      }
      compliance_analysis_results: {
        Row: {
          analysis_results: Json
          analysis_type: string
          business_context: string | null
          created_at: string | null
          document_id: string | null
          document_text_sample: string | null
          id: string
          industry_context: string | null
          regulations_analyzed: number | null
          updated_at: string | null
        }
        Insert: {
          analysis_results?: Json
          analysis_type: string
          business_context?: string | null
          created_at?: string | null
          document_id?: string | null
          document_text_sample?: string | null
          id?: string
          industry_context?: string | null
          regulations_analyzed?: number | null
          updated_at?: string | null
        }
        Update: {
          analysis_results?: Json
          analysis_type?: string
          business_context?: string | null
          created_at?: string | null
          document_id?: string | null
          document_text_sample?: string | null
          id?: string
          industry_context?: string | null
          regulations_analyzed?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "compliance_analysis_results_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "compliance_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      compliance_document_reviews: {
        Row: {
          ai_analysis: Json | null
          compliance_score: number | null
          created_at: string
          document_id: string
          evidence_mapping: Json | null
          framework_id: string
          gaps_identified: Json | null
          id: string
          recommendations: Json | null
          review_status: string
          reviewed_at: string | null
          reviewer_notes: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_analysis?: Json | null
          compliance_score?: number | null
          created_at?: string
          document_id: string
          evidence_mapping?: Json | null
          framework_id: string
          gaps_identified?: Json | null
          id?: string
          recommendations?: Json | null
          review_status?: string
          reviewed_at?: string | null
          reviewer_notes?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_analysis?: Json | null
          compliance_score?: number | null
          created_at?: string
          document_id?: string
          evidence_mapping?: Json | null
          framework_id?: string
          gaps_identified?: Json | null
          id?: string
          recommendations?: Json | null
          review_status?: string
          reviewed_at?: string | null
          reviewer_notes?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "compliance_document_reviews_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compliance_document_reviews_framework_id_fkey"
            columns: ["framework_id"]
            isOneToOne: false
            referencedRelation: "compliance_frameworks"
            referencedColumns: ["id"]
          },
        ]
      }
      compliance_documents: {
        Row: {
          action_id: string | null
          compliance_score: number | null
          compliance_status: string | null
          created_at: string | null
          description: string | null
          document_type: string
          file_name: string
          file_path: string
          file_size: number | null
          framework_id: string | null
          frameworks: string[] | null
          id: string
          last_reviewed: string | null
          metadata: Json | null
          mime_type: string | null
          next_review_date: string | null
          requirement_id: string | null
          risk_level: string | null
          tags: string[] | null
          title: string
          updated_at: string | null
          upload_date: string | null
          user_id: string
        }
        Insert: {
          action_id?: string | null
          compliance_score?: number | null
          compliance_status?: string | null
          created_at?: string | null
          description?: string | null
          document_type: string
          file_name: string
          file_path: string
          file_size?: number | null
          framework_id?: string | null
          frameworks?: string[] | null
          id?: string
          last_reviewed?: string | null
          metadata?: Json | null
          mime_type?: string | null
          next_review_date?: string | null
          requirement_id?: string | null
          risk_level?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string | null
          upload_date?: string | null
          user_id: string
        }
        Update: {
          action_id?: string | null
          compliance_score?: number | null
          compliance_status?: string | null
          created_at?: string | null
          description?: string | null
          document_type?: string
          file_name?: string
          file_path?: string
          file_size?: number | null
          framework_id?: string | null
          frameworks?: string[] | null
          id?: string
          last_reviewed?: string | null
          metadata?: Json | null
          mime_type?: string | null
          next_review_date?: string | null
          requirement_id?: string | null
          risk_level?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string | null
          upload_date?: string | null
          user_id?: string
        }
        Relationships: []
      }
      compliance_evidence: {
        Row: {
          compliance_status: string
          created_at: string
          document_id: string | null
          evidence_description: string | null
          evidence_title: string
          evidence_type: string
          expiry_date: string | null
          framework_id: string
          id: string
          metadata: Json | null
          requirement_id: string | null
          responsible_party: string | null
          updated_at: string
          user_id: string
          verification_date: string | null
        }
        Insert: {
          compliance_status?: string
          created_at?: string
          document_id?: string | null
          evidence_description?: string | null
          evidence_title: string
          evidence_type: string
          expiry_date?: string | null
          framework_id: string
          id?: string
          metadata?: Json | null
          requirement_id?: string | null
          responsible_party?: string | null
          updated_at?: string
          user_id: string
          verification_date?: string | null
        }
        Update: {
          compliance_status?: string
          created_at?: string
          document_id?: string | null
          evidence_description?: string | null
          evidence_title?: string
          evidence_type?: string
          expiry_date?: string | null
          framework_id?: string
          id?: string
          metadata?: Json | null
          requirement_id?: string | null
          responsible_party?: string | null
          updated_at?: string
          user_id?: string
          verification_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "compliance_evidence_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compliance_evidence_framework_id_fkey"
            columns: ["framework_id"]
            isOneToOne: false
            referencedRelation: "compliance_frameworks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compliance_evidence_requirement_id_fkey"
            columns: ["requirement_id"]
            isOneToOne: false
            referencedRelation: "framework_requirements"
            referencedColumns: ["id"]
          },
        ]
      }
      compliance_framework_checklists: {
        Row: {
          category: string | null
          compliance_criteria: string | null
          compliance_status: string | null
          created_at: string
          description: string | null
          framework_id: string
          id: string
          is_ai_generated: boolean | null
          order_index: number | null
          priority: string
          requirement: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          compliance_criteria?: string | null
          compliance_status?: string | null
          created_at?: string
          description?: string | null
          framework_id: string
          id?: string
          is_ai_generated?: boolean | null
          order_index?: number | null
          priority?: string
          requirement: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          compliance_criteria?: string | null
          compliance_status?: string | null
          created_at?: string
          description?: string | null
          framework_id?: string
          id?: string
          is_ai_generated?: boolean | null
          order_index?: number | null
          priority?: string
          requirement?: string
          updated_at?: string
        }
        Relationships: []
      }
      compliance_frameworks: {
        Row: {
          compliance_score: number | null
          created_at: string
          description: string | null
          documents_count: number | null
          id: string
          industry: string[]
          is_ai_generated: boolean | null
          jurisdiction: string
          mandatory_for: string[]
          name: string
          parent_regulation: string | null
          regional_scope: string[] | null
          regulation_level: string
          regulation_number: string | null
          requirements_count: number | null
          status: string
          updated_at: string
        }
        Insert: {
          compliance_score?: number | null
          created_at?: string
          description?: string | null
          documents_count?: number | null
          id?: string
          industry?: string[]
          is_ai_generated?: boolean | null
          jurisdiction: string
          mandatory_for?: string[]
          name: string
          parent_regulation?: string | null
          regional_scope?: string[] | null
          regulation_level: string
          regulation_number?: string | null
          requirements_count?: number | null
          status?: string
          updated_at?: string
        }
        Update: {
          compliance_score?: number | null
          created_at?: string
          description?: string | null
          documents_count?: number | null
          id?: string
          industry?: string[]
          is_ai_generated?: boolean | null
          jurisdiction?: string
          mandatory_for?: string[]
          name?: string
          parent_regulation?: string | null
          regional_scope?: string[] | null
          regulation_level?: string
          regulation_number?: string | null
          requirements_count?: number | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      compliance_metrics: {
        Row: {
          client_name: string
          completed: number
          compliance_category: string
          created_at: string
          deadline_info: string | null
          id: string
          percentage: number
          status: string
          total: number
          updated_at: string
          year: number
        }
        Insert: {
          client_name: string
          completed: number
          compliance_category: string
          created_at?: string
          deadline_info?: string | null
          id?: string
          percentage: number
          status: string
          total: number
          updated_at?: string
          year: number
        }
        Update: {
          client_name?: string
          completed?: number
          compliance_category?: string
          created_at?: string
          deadline_info?: string | null
          id?: string
          percentage?: number
          status?: string
          total?: number
          updated_at?: string
          year?: number
        }
        Relationships: []
      }
      compliance_workflows: {
        Row: {
          action_id: string
          approved_at: string | null
          approver_id: string | null
          created_at: string
          id: string
          rejection_reason: string | null
          status: string
          workflow_step: string
        }
        Insert: {
          action_id: string
          approved_at?: string | null
          approver_id?: string | null
          created_at?: string
          id?: string
          rejection_reason?: string | null
          status?: string
          workflow_step: string
        }
        Update: {
          action_id?: string
          approved_at?: string | null
          approver_id?: string | null
          created_at?: string
          id?: string
          rejection_reason?: string | null
          status?: string
          workflow_step?: string
        }
        Relationships: [
          {
            foreignKeyName: "compliance_workflows_action_id_fkey"
            columns: ["action_id"]
            isOneToOne: false
            referencedRelation: "compliance_actions"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string
          id: string
          summary: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          summary?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          summary?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      credentials: {
        Row: {
          created_at: string
          credential_type: string
          encrypted_value: string
          id: string
          is_active: boolean
          metadata: Json | null
          name: string
          provider: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          credential_type?: string
          encrypted_value: string
          id?: string
          is_active?: boolean
          metadata?: Json | null
          name: string
          provider: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          credential_type?: string
          encrypted_value?: string
          id?: string
          is_active?: boolean
          metadata?: Json | null
          name?: string
          provider?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      currency_rates: {
        Row: {
          created_at: string
          created_by: string
          effective_from: string
          from_currency: string
          id: string
          is_active: boolean
          rate: number
          to_currency: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          effective_from?: string
          from_currency: string
          id?: string
          is_active?: boolean
          rate: number
          to_currency: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          effective_from?: string
          from_currency?: string
          id?: string
          is_active?: boolean
          rate?: number
          to_currency?: string
          updated_at?: string
        }
        Relationships: []
      }
      customer_segments: {
        Row: {
          created_at: string
          criteria: Json
          description: string | null
          id: string
          name: string
          size_estimate: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          criteria: Json
          description?: string | null
          id?: string
          name: string
          size_estimate?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          criteria?: Json
          description?: string | null
          id?: string
          name?: string
          size_estimate?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      customers: {
        Row: {
          created_at: string
          customer_id: string
          email: string | null
          full_name: string | null
          id: string
          phone_number: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          email?: string | null
          full_name?: string | null
          id?: string
          phone_number?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          email?: string | null
          full_name?: string | null
          id?: string
          phone_number?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      daily_standup: {
        Row: {
          blockers: string | null
          client_id: string | null
          completed_yesterday: string
          created_at: string
          date: string
          id: string
          planning_today: string
          project_id: string | null
          submitted_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          blockers?: string | null
          client_id?: string | null
          completed_yesterday: string
          created_at?: string
          date?: string
          id?: string
          planning_today: string
          project_id?: string | null
          submitted_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          blockers?: string | null
          client_id?: string | null
          completed_yesterday?: string
          created_at?: string
          date?: string
          id?: string
          planning_today?: string
          project_id?: string | null
          submitted_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_standup_company_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "business_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_standup_company_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "customer_overview"
            referencedColumns: ["business_client_id"]
          },
          {
            foreignKeyName: "daily_standup_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_usage_logs: {
        Row: {
          created_at: string
          feature_name: string
          id: string
          metadata: Json | null
          resource_id: string | null
          tenant_id: string
          unit_type: string
          usage_amount: number | null
          usage_count: number
          usage_date: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          feature_name: string
          id?: string
          metadata?: Json | null
          resource_id?: string | null
          tenant_id: string
          unit_type: string
          usage_amount?: number | null
          usage_count?: number
          usage_date?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          feature_name?: string
          id?: string
          metadata?: Json | null
          resource_id?: string | null
          tenant_id?: string
          unit_type?: string
          usage_amount?: number | null
          usage_count?: number
          usage_date?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_usage_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "customer_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "daily_usage_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      dashboard_interactions: {
        Row: {
          after_state: Json | null
          before_state: Json | null
          component_name: string
          id: string
          interaction_details: Json
          interaction_type: string
          session_id: string
          timestamp: string
        }
        Insert: {
          after_state?: Json | null
          before_state?: Json | null
          component_name: string
          id?: string
          interaction_details: Json
          interaction_type: string
          session_id: string
          timestamp?: string
        }
        Update: {
          after_state?: Json | null
          before_state?: Json | null
          component_name?: string
          id?: string
          interaction_details?: Json
          interaction_type?: string
          session_id?: string
          timestamp?: string
        }
        Relationships: [
          {
            foreignKeyName: "dashboard_interactions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "project_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      database_connections: {
        Row: {
          api_endpoint: string | null
          auth_config: Json | null
          connection_metadata: Json | null
          connection_name: string
          connection_string: string | null
          connection_type: string
          created_at: string
          database_name: string
          database_type: string
          host: string
          id: string
          is_active: boolean
          last_tested_at: string | null
          password: string | null
          port: number
          schema_discovered_at: string | null
          supports_schema_discovery: boolean | null
          test_error: string | null
          test_status: string | null
          updated_at: string
          user_id: string
          username: string
        }
        Insert: {
          api_endpoint?: string | null
          auth_config?: Json | null
          connection_metadata?: Json | null
          connection_name: string
          connection_string?: string | null
          connection_type: string
          created_at?: string
          database_name: string
          database_type: string
          host: string
          id?: string
          is_active?: boolean
          last_tested_at?: string | null
          password?: string | null
          port: number
          schema_discovered_at?: string | null
          supports_schema_discovery?: boolean | null
          test_error?: string | null
          test_status?: string | null
          updated_at?: string
          user_id: string
          username: string
        }
        Update: {
          api_endpoint?: string | null
          auth_config?: Json | null
          connection_metadata?: Json | null
          connection_name?: string
          connection_string?: string | null
          connection_type?: string
          created_at?: string
          database_name?: string
          database_type?: string
          host?: string
          id?: string
          is_active?: boolean
          last_tested_at?: string | null
          password?: string | null
          port?: number
          schema_discovered_at?: string | null
          supports_schema_discovery?: boolean | null
          test_error?: string | null
          test_status?: string | null
          updated_at?: string
          user_id?: string
          username?: string
        }
        Relationships: []
      }
      database_schemas: {
        Row: {
          business_name: string | null
          column_description: string | null
          column_name: string
          connection_id: string
          data_type: string
          discovered_at: string
          foreign_key_reference: string | null
          id: string
          is_foreign_key: boolean | null
          is_nullable: boolean | null
          is_primary_key: boolean | null
          metadata: Json | null
          schema_name: string
          semantic_tags: string[] | null
          table_name: string
          user_id: string
        }
        Insert: {
          business_name?: string | null
          column_description?: string | null
          column_name: string
          connection_id: string
          data_type: string
          discovered_at?: string
          foreign_key_reference?: string | null
          id?: string
          is_foreign_key?: boolean | null
          is_nullable?: boolean | null
          is_primary_key?: boolean | null
          metadata?: Json | null
          schema_name: string
          semantic_tags?: string[] | null
          table_name: string
          user_id: string
        }
        Update: {
          business_name?: string | null
          column_description?: string | null
          column_name?: string
          connection_id?: string
          data_type?: string
          discovered_at?: string
          foreign_key_reference?: string | null
          id?: string
          is_foreign_key?: boolean | null
          is_nullable?: boolean | null
          is_primary_key?: boolean | null
          metadata?: Json | null
          schema_name?: string
          semantic_tags?: string[] | null
          table_name?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "database_schemas_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "database_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      debt_calculations: {
        Row: {
          allocation_chart_data: Json
          asset_allocation: number
          benchmark_comparison: Json
          calculated_at: string
          created_at: string
          detailed_holdings: Json
          id: string
          sub_asset_summary: Json
          total_cost: number
          total_gains: number
          total_market_value: number
          total_returns: number
          updated_at: string
          user_id: string
        }
        Insert: {
          allocation_chart_data?: Json
          asset_allocation?: number
          benchmark_comparison?: Json
          calculated_at?: string
          created_at?: string
          detailed_holdings?: Json
          id?: string
          sub_asset_summary?: Json
          total_cost?: number
          total_gains?: number
          total_market_value?: number
          total_returns?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          allocation_chart_data?: Json
          asset_allocation?: number
          benchmark_comparison?: Json
          calculated_at?: string
          created_at?: string
          detailed_holdings?: Json
          id?: string
          sub_asset_summary?: Json
          total_cost?: number
          total_gains?: number
          total_market_value?: number
          total_returns?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      direct_repository_integrations: {
        Row: {
          created_at: string | null
          id: string
          integration_data: Json | null
          integration_type: string
          is_active: boolean | null
          last_sync_at: string | null
          next_sync_at: string | null
          platform: string
          repository_url: string
          sync_frequency_hours: number | null
          sync_status: string | null
          updated_at: string | null
          user_id: string
          webhook_secret: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          integration_data?: Json | null
          integration_type: string
          is_active?: boolean | null
          last_sync_at?: string | null
          next_sync_at?: string | null
          platform: string
          repository_url: string
          sync_frequency_hours?: number | null
          sync_status?: string | null
          updated_at?: string | null
          user_id: string
          webhook_secret?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          integration_data?: Json | null
          integration_type?: string
          is_active?: boolean | null
          last_sync_at?: string | null
          next_sync_at?: string | null
          platform?: string
          repository_url?: string
          sync_frequency_hours?: number | null
          sync_status?: string | null
          updated_at?: string | null
          user_id?: string
          webhook_secret?: string | null
        }
        Relationships: []
      }
      document_categories: {
        Row: {
          color: string | null
          created_at: string
          description: string | null
          icon: string | null
          id: string
          is_system_generated: boolean | null
          name: string
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_system_generated?: boolean | null
          name: string
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_system_generated?: boolean | null
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      document_chunks: {
        Row: {
          chunk_index: number
          chunk_metadata: Json | null
          chunk_text: string
          created_at: string
          document_id: string
          embedding: string | null
          id: string
          token_count: number | null
          user_id: string
        }
        Insert: {
          chunk_index: number
          chunk_metadata?: Json | null
          chunk_text: string
          created_at?: string
          document_id: string
          embedding?: string | null
          id?: string
          token_count?: number | null
          user_id: string
        }
        Update: {
          chunk_index?: number
          chunk_metadata?: Json | null
          chunk_text?: string
          created_at?: string
          document_id?: string
          embedding?: string | null
          id?: string
          token_count?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_chunks_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      document_comments: {
        Row: {
          comment: string
          created_at: string
          document_id: string
          id: string
          is_internal: boolean
          user_id: string
        }
        Insert: {
          comment: string
          created_at?: string
          document_id: string
          id?: string
          is_internal?: boolean
          user_id: string
        }
        Update: {
          comment?: string
          created_at?: string
          document_id?: string
          id?: string
          is_internal?: boolean
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_comments_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "workflow_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      document_folder_relationships: {
        Row: {
          confidence_score: number | null
          created_at: string
          document_id: string
          folder_id: string
          id: string
          is_auto_assigned: boolean | null
        }
        Insert: {
          confidence_score?: number | null
          created_at?: string
          document_id: string
          folder_id: string
          id?: string
          is_auto_assigned?: boolean | null
        }
        Update: {
          confidence_score?: number | null
          created_at?: string
          document_id?: string
          folder_id?: string
          id?: string
          is_auto_assigned?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "document_folder_relationships_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_folder_relationships_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "smart_folders"
            referencedColumns: ["id"]
          },
        ]
      }
      document_insights: {
        Row: {
          ai_generated_title: string | null
          created_at: string
          document_id: string
          estimated_reading_time: number | null
          id: string
          importance_score: number | null
          key_topics: Json | null
          language_detected: string | null
          readability_score: number | null
          sentiment_analysis: Json | null
          suggested_actions: Json | null
          summary: string | null
          updated_at: string
          user_id: string
          word_count: number | null
        }
        Insert: {
          ai_generated_title?: string | null
          created_at?: string
          document_id: string
          estimated_reading_time?: number | null
          id?: string
          importance_score?: number | null
          key_topics?: Json | null
          language_detected?: string | null
          readability_score?: number | null
          sentiment_analysis?: Json | null
          suggested_actions?: Json | null
          summary?: string | null
          updated_at?: string
          user_id: string
          word_count?: number | null
        }
        Update: {
          ai_generated_title?: string | null
          created_at?: string
          document_id?: string
          estimated_reading_time?: number | null
          id?: string
          importance_score?: number | null
          key_topics?: Json | null
          language_detected?: string | null
          readability_score?: number | null
          sentiment_analysis?: Json | null
          suggested_actions?: Json | null
          summary?: string | null
          updated_at?: string
          user_id?: string
          word_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "document_insights_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      document_library: {
        Row: {
          content_type: string | null
          created_at: string | null
          description: string | null
          document_type: string
          file_name: string
          file_path: string
          file_size: number | null
          id: string
          is_active: boolean | null
          updated_at: string | null
          uploaded_at: string | null
          user_id: string
          version: number | null
        }
        Insert: {
          content_type?: string | null
          created_at?: string | null
          description?: string | null
          document_type: string
          file_name: string
          file_path: string
          file_size?: number | null
          id?: string
          is_active?: boolean | null
          updated_at?: string | null
          uploaded_at?: string | null
          user_id: string
          version?: number | null
        }
        Update: {
          content_type?: string | null
          created_at?: string | null
          description?: string | null
          document_type?: string
          file_name?: string
          file_path?: string
          file_size?: number | null
          id?: string
          is_active?: boolean | null
          updated_at?: string | null
          uploaded_at?: string | null
          user_id?: string
          version?: number | null
        }
        Relationships: []
      }
      document_relationships: {
        Row: {
          ai_generated: boolean | null
          created_at: string
          id: string
          related_document_id: string
          relationship_type: string
          similarity_score: number | null
          source_document_id: string
        }
        Insert: {
          ai_generated?: boolean | null
          created_at?: string
          id?: string
          related_document_id: string
          relationship_type?: string
          similarity_score?: number | null
          source_document_id: string
        }
        Update: {
          ai_generated?: boolean | null
          created_at?: string
          id?: string
          related_document_id?: string
          relationship_type?: string
          similarity_score?: number | null
          source_document_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_relationships_related_document_id_fkey"
            columns: ["related_document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_relationships_source_document_id_fkey"
            columns: ["source_document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      document_repositories: {
        Row: {
          connection_config: Json
          created_at: string
          id: string
          is_active: boolean
          last_sync_at: string | null
          name: string
          repository_type: string
          sync_frequency_hours: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          connection_config?: Json
          created_at?: string
          id?: string
          is_active?: boolean
          last_sync_at?: string | null
          name: string
          repository_type: string
          sync_frequency_hours?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          connection_config?: Json
          created_at?: string
          id?: string
          is_active?: boolean
          last_sync_at?: string | null
          name?: string
          repository_type?: string
          sync_frequency_hours?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      document_reviews: {
        Row: {
          comments: string | null
          created_at: string
          document_id: string
          id: string
          review_type: string
          reviewed_at: string | null
          reviewer_id: string
          status: Database["public"]["Enums"]["approval_status"]
        }
        Insert: {
          comments?: string | null
          created_at?: string
          document_id: string
          id?: string
          review_type: string
          reviewed_at?: string | null
          reviewer_id: string
          status?: Database["public"]["Enums"]["approval_status"]
        }
        Update: {
          comments?: string | null
          created_at?: string
          document_id?: string
          id?: string
          review_type?: string
          reviewed_at?: string | null
          reviewer_id?: string
          status?: Database["public"]["Enums"]["approval_status"]
        }
        Relationships: [
          {
            foreignKeyName: "document_reviews_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "workflow_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      document_search_analytics: {
        Row: {
          clicked_document_id: string | null
          created_at: string
          id: string
          query: string
          response_time_ms: number | null
          results_count: number | null
          search_type: string | null
          user_id: string
        }
        Insert: {
          clicked_document_id?: string | null
          created_at?: string
          id?: string
          query: string
          response_time_ms?: number | null
          results_count?: number | null
          search_type?: string | null
          user_id: string
        }
        Update: {
          clicked_document_id?: string | null
          created_at?: string
          id?: string
          query?: string
          response_time_ms?: number | null
          results_count?: number | null
          search_type?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_search_analytics_clicked_document_id_fkey"
            columns: ["clicked_document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      document_tag_relationships: {
        Row: {
          confidence_score: number | null
          created_at: string
          document_id: string
          id: string
          is_ai_suggested: boolean | null
          tag_id: string
        }
        Insert: {
          confidence_score?: number | null
          created_at?: string
          document_id: string
          id?: string
          is_ai_suggested?: boolean | null
          tag_id: string
        }
        Update: {
          confidence_score?: number | null
          created_at?: string
          document_id?: string
          id?: string
          is_ai_suggested?: boolean | null
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_tag_relationships_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_tag_relationships_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "document_tags"
            referencedColumns: ["id"]
          },
        ]
      }
      document_tags: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_ai_generated: boolean | null
          name: string
          usage_count: number | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_ai_generated?: boolean | null
          name: string
          usage_count?: number | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_ai_generated?: boolean | null
          name?: string
          usage_count?: number | null
        }
        Relationships: []
      }
      document_templates: {
        Row: {
          content: string
          created_at: string
          created_by: string
          document_type: Database["public"]["Enums"]["document_type"]
          id: string
          is_active: boolean
          name: string
          updated_at: string
          variables: Json | null
        }
        Insert: {
          content: string
          created_at?: string
          created_by: string
          document_type: Database["public"]["Enums"]["document_type"]
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
          variables?: Json | null
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string
          document_type?: Database["public"]["Enums"]["document_type"]
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
          variables?: Json | null
        }
        Relationships: []
      }
      document_versions: {
        Row: {
          changes_summary: string | null
          content: string
          created_at: string
          created_by: string
          document_id: string
          file_url: string | null
          id: string
          version_number: number
        }
        Insert: {
          changes_summary?: string | null
          content: string
          created_at?: string
          created_by: string
          document_id: string
          file_url?: string | null
          id?: string
          version_number: number
        }
        Update: {
          changes_summary?: string | null
          content?: string
          created_at?: string
          created_by?: string
          document_id?: string
          file_url?: string | null
          id?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "document_versions_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "workflow_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          content_preview: string | null
          created_at: string
          extracted_text: string | null
          file_name: string
          file_path: string
          file_size: number | null
          file_type: string
          id: string
          indexed_at: string | null
          is_searchable: boolean | null
          metadata: Json | null
          mime_type: string | null
          processing_error: string | null
          processing_status: string
          repository_id: string | null
          storage_url: string | null
          thumbnail_url: string | null
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          content_preview?: string | null
          created_at?: string
          extracted_text?: string | null
          file_name: string
          file_path: string
          file_size?: number | null
          file_type: string
          id?: string
          indexed_at?: string | null
          is_searchable?: boolean | null
          metadata?: Json | null
          mime_type?: string | null
          processing_error?: string | null
          processing_status?: string
          repository_id?: string | null
          storage_url?: string | null
          thumbnail_url?: string | null
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          content_preview?: string | null
          created_at?: string
          extracted_text?: string | null
          file_name?: string
          file_path?: string
          file_size?: number | null
          file_type?: string
          id?: string
          indexed_at?: string | null
          is_searchable?: boolean | null
          metadata?: Json | null
          mime_type?: string | null
          processing_error?: string | null
          processing_status?: string
          repository_id?: string | null
          storage_url?: string | null
          thumbnail_url?: string | null
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_repository_id_fkey"
            columns: ["repository_id"]
            isOneToOne: false
            referencedRelation: "document_repositories"
            referencedColumns: ["id"]
          },
        ]
      }
      document_retention_status: {
        Row: {
          id: string
          document_id: string
          user_id: string
          policy_id: string | null
          retention_start_date: string
          retention_end_date: string
          current_status: string
          legal_hold_ids: string[] | null
          disposition_action: string | null
          disposition_date: string | null
          disposition_approved_by: string | null
          disposition_notes: string | null
          exception_reason: string | null
          exception_approved_by: string | null
          exception_end_date: string | null
          notification_sent: boolean | null
          last_review_date: string | null
          next_review_date: string | null
          metadata: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          document_id: string
          user_id: string
          policy_id?: string | null
          retention_start_date: string
          retention_end_date: string
          current_status?: string
          legal_hold_ids?: string[] | null
          disposition_action?: string | null
          disposition_date?: string | null
          disposition_approved_by?: string | null
          disposition_notes?: string | null
          exception_reason?: string | null
          exception_approved_by?: string | null
          exception_end_date?: string | null
          notification_sent?: boolean | null
          last_review_date?: string | null
          next_review_date?: string | null
          metadata?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          document_id?: string
          user_id?: string
          policy_id?: string | null
          retention_start_date?: string
          retention_end_date?: string
          current_status?: string
          legal_hold_ids?: string[] | null
          disposition_action?: string | null
          disposition_date?: string | null
          disposition_approved_by?: string | null
          disposition_notes?: string | null
          exception_reason?: string | null
          exception_approved_by?: string | null
          exception_end_date?: string | null
          notification_sent?: boolean | null
          last_review_date?: string | null
          next_review_date?: string | null
          metadata?: Json | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      disposition_audit_log: {
        Row: {
          id: string
          document_id: string
          user_id: string
          action: string
          action_by: string
          policy_id: string | null
          legal_hold_id: string | null
          previous_status: string | null
          new_status: string | null
          reason: string | null
          document_metadata: Json | null
          certificate_number: string | null
          ip_address: string | null
          user_agent: string | null
          created_at: string
        }
        Insert: {
          id?: string
          document_id: string
          user_id: string
          action: string
          action_by: string
          policy_id?: string | null
          legal_hold_id?: string | null
          previous_status?: string | null
          new_status?: string | null
          reason?: string | null
          document_metadata?: Json | null
          certificate_number?: string | null
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          document_id?: string
          user_id?: string
          action?: string
          action_by?: string
          policy_id?: string | null
          legal_hold_id?: string | null
          previous_status?: string | null
          new_status?: string | null
          reason?: string | null
          document_metadata?: Json | null
          certificate_number?: string | null
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string
        }
        Relationships: []
      }
      enhanced_search_settings: {
        Row: {
          auto_refresh_enabled: boolean | null
          auto_refresh_interval_hours: number | null
          created_at: string | null
          default_search_scope: string | null
          enabled_platforms: string[] | null
          id: string
          results_per_page: number | null
          search_preferences: Json | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          auto_refresh_enabled?: boolean | null
          auto_refresh_interval_hours?: number | null
          created_at?: string | null
          default_search_scope?: string | null
          enabled_platforms?: string[] | null
          id?: string
          results_per_page?: number | null
          search_preferences?: Json | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          auto_refresh_enabled?: boolean | null
          auto_refresh_interval_hours?: number | null
          created_at?: string | null
          default_search_scope?: string | null
          enabled_platforms?: string[] | null
          id?: string
          results_per_page?: number | null
          search_preferences?: Json | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      equity_calculations: {
        Row: {
          allocation_chart_data: Json
          benchmark_comparison: Json
          calculated_at: string
          categories: Json
          created_at: string
          detailed_holdings: Json
          id: string
          returns_contribution: Json
          total_cost: number
          total_gains: number
          total_market_value: number
          total_returns: number
          total_yield: number
          updated_at: string
          user_id: string
        }
        Insert: {
          allocation_chart_data?: Json
          benchmark_comparison?: Json
          calculated_at?: string
          categories?: Json
          created_at?: string
          detailed_holdings?: Json
          id?: string
          returns_contribution?: Json
          total_cost?: number
          total_gains?: number
          total_market_value?: number
          total_returns?: number
          total_yield?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          allocation_chart_data?: Json
          benchmark_comparison?: Json
          calculated_at?: string
          categories?: Json
          created_at?: string
          detailed_holdings?: Json
          id?: string
          returns_contribution?: Json
          total_cost?: number
          total_gains?: number
          total_market_value?: number
          total_returns?: number
          total_yield?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      evaluation_comments: {
        Row: {
          comment: string
          commenter_id: string | null
          created_at: string
          criteria_id: string | null
          evaluation_session_id: string
          id: string
          parent_comment_id: string | null
          updated_at: string
        }
        Insert: {
          comment: string
          commenter_id?: string | null
          created_at?: string
          criteria_id?: string | null
          evaluation_session_id: string
          id?: string
          parent_comment_id?: string | null
          updated_at?: string
        }
        Update: {
          comment?: string
          commenter_id?: string | null
          created_at?: string
          criteria_id?: string | null
          evaluation_session_id?: string
          id?: string
          parent_comment_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "evaluation_comments_criteria_id_fkey"
            columns: ["criteria_id"]
            isOneToOne: false
            referencedRelation: "evaluation_criteria"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluation_comments_evaluation_session_id_fkey"
            columns: ["evaluation_session_id"]
            isOneToOne: false
            referencedRelation: "evaluation_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluation_comments_parent_comment_id_fkey"
            columns: ["parent_comment_id"]
            isOneToOne: false
            referencedRelation: "evaluation_comments"
            referencedColumns: ["id"]
          },
        ]
      }
      evaluation_consensus: {
        Row: {
          consensus_justification: string | null
          consensus_score: number
          criteria_id: string
          evaluation_session_id: string
          id: string
          participants: Json | null
          reached_at: string
          reached_by: string | null
        }
        Insert: {
          consensus_justification?: string | null
          consensus_score: number
          criteria_id: string
          evaluation_session_id: string
          id?: string
          participants?: Json | null
          reached_at?: string
          reached_by?: string | null
        }
        Update: {
          consensus_justification?: string | null
          consensus_score?: number
          criteria_id?: string
          evaluation_session_id?: string
          id?: string
          participants?: Json | null
          reached_at?: string
          reached_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "evaluation_consensus_criteria_id_fkey"
            columns: ["criteria_id"]
            isOneToOne: false
            referencedRelation: "evaluation_criteria"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluation_consensus_evaluation_session_id_fkey"
            columns: ["evaluation_session_id"]
            isOneToOne: false
            referencedRelation: "evaluation_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      evaluation_criteria: {
        Row: {
          created_at: string
          description: string | null
          dimension: string
          id: string
          is_active: boolean | null
          max_score: number
          name: string
          rfp_id: string
          updated_at: string
          weight: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          dimension: string
          id?: string
          is_active?: boolean | null
          max_score?: number
          name: string
          rfp_id: string
          updated_at?: string
          weight?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          dimension?: string
          id?: string
          is_active?: boolean | null
          max_score?: number
          name?: string
          rfp_id?: string
          updated_at?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "evaluation_criteria_rfp_id_fkey"
            columns: ["rfp_id"]
            isOneToOne: false
            referencedRelation: "rfps"
            referencedColumns: ["id"]
          },
        ]
      }
      evaluation_scores: {
        Row: {
          confidence_level: number | null
          created_at: string
          criteria_id: string
          evaluation_session_id: string
          evaluator_id: string | null
          evaluator_type: string
          id: string
          is_final: boolean | null
          justification: string | null
          score: number
          updated_at: string
        }
        Insert: {
          confidence_level?: number | null
          created_at?: string
          criteria_id: string
          evaluation_session_id: string
          evaluator_id?: string | null
          evaluator_type?: string
          id?: string
          is_final?: boolean | null
          justification?: string | null
          score: number
          updated_at?: string
        }
        Update: {
          confidence_level?: number | null
          created_at?: string
          criteria_id?: string
          evaluation_session_id?: string
          evaluator_id?: string | null
          evaluator_type?: string
          id?: string
          is_final?: boolean | null
          justification?: string | null
          score?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "evaluation_scores_criteria_id_fkey"
            columns: ["criteria_id"]
            isOneToOne: false
            referencedRelation: "evaluation_criteria"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluation_scores_evaluation_session_id_fkey"
            columns: ["evaluation_session_id"]
            isOneToOne: false
            referencedRelation: "evaluation_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      evaluation_sessions: {
        Row: {
          ai_analysis_completed: boolean | null
          consensus_reached: boolean | null
          created_at: string
          created_by: string | null
          final_score: number | null
          id: string
          metadata: Json | null
          proposal_id: string
          status: string
          updated_at: string
        }
        Insert: {
          ai_analysis_completed?: boolean | null
          consensus_reached?: boolean | null
          created_at?: string
          created_by?: string | null
          final_score?: number | null
          id?: string
          metadata?: Json | null
          proposal_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          ai_analysis_completed?: boolean | null
          consensus_reached?: boolean | null
          created_at?: string
          created_by?: string | null
          final_score?: number | null
          id?: string
          metadata?: Json | null
          proposal_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "evaluation_sessions_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
        ]
      }
      excel_projects: {
        Row: {
          complexity_score: number | null
          created_at: string
          file_size: number | null
          id: string
          metadata: Json | null
          name: string
          original_filename: string
          status: string
          updated_at: string
          upload_path: string | null
          user_id: string
        }
        Insert: {
          complexity_score?: number | null
          created_at?: string
          file_size?: number | null
          id?: string
          metadata?: Json | null
          name: string
          original_filename: string
          status?: string
          updated_at?: string
          upload_path?: string | null
          user_id: string
        }
        Update: {
          complexity_score?: number | null
          created_at?: string
          file_size?: number | null
          id?: string
          metadata?: Json | null
          name?: string
          original_filename?: string
          status?: string
          updated_at?: string
          upload_path?: string | null
          user_id?: string
        }
        Relationships: []
      }
      excel_sheets: {
        Row: {
          business_summary: string | null
          cell_data: Json | null
          column_count: number | null
          created_at: string
          dependency_map: Json | null
          formulas: Json | null
          id: string
          project_id: string
          row_count: number | null
          sheet_index: number
          sheet_name: string
          test_cases: Json | null
        }
        Insert: {
          business_summary?: string | null
          cell_data?: Json | null
          column_count?: number | null
          created_at?: string
          dependency_map?: Json | null
          formulas?: Json | null
          id?: string
          project_id: string
          row_count?: number | null
          sheet_index: number
          sheet_name: string
          test_cases?: Json | null
        }
        Update: {
          business_summary?: string | null
          cell_data?: Json | null
          column_count?: number | null
          created_at?: string
          dependency_map?: Json | null
          formulas?: Json | null
          id?: string
          project_id?: string
          row_count?: number | null
          sheet_index?: number
          sheet_name?: string
          test_cases?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "excel_sheets_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "excel_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      family_wealth_overview: {
        Row: {
          alternative_investments_value: number | null
          business_interests_value: number | null
          cash_equivalents: number | null
          created_at: string
          currency: string | null
          family_member_id: string | null
          family_member_name: string | null
          id: string
          illiquid_assets: number | null
          inception_return_percent: number | null
          investment_accounts_value: number | null
          liquid_assets: number | null
          net_worth: number
          period_date: string
          real_estate_value: number | null
          risk_score: number | null
          total_assets: number
          total_liabilities: number | null
          updated_at: string
          user_id: string
          ytd_return_percent: number | null
        }
        Insert: {
          alternative_investments_value?: number | null
          business_interests_value?: number | null
          cash_equivalents?: number | null
          created_at?: string
          currency?: string | null
          family_member_id?: string | null
          family_member_name?: string | null
          id?: string
          illiquid_assets?: number | null
          inception_return_percent?: number | null
          investment_accounts_value?: number | null
          liquid_assets?: number | null
          net_worth?: number
          period_date: string
          real_estate_value?: number | null
          risk_score?: number | null
          total_assets?: number
          total_liabilities?: number | null
          updated_at?: string
          user_id: string
          ytd_return_percent?: number | null
        }
        Update: {
          alternative_investments_value?: number | null
          business_interests_value?: number | null
          cash_equivalents?: number | null
          created_at?: string
          currency?: string | null
          family_member_id?: string | null
          family_member_name?: string | null
          id?: string
          illiquid_assets?: number | null
          inception_return_percent?: number | null
          investment_accounts_value?: number | null
          liquid_assets?: number | null
          net_worth?: number
          period_date?: string
          real_estate_value?: number | null
          risk_score?: number | null
          total_assets?: number
          total_liabilities?: number | null
          updated_at?: string
          user_id?: string
          ytd_return_percent?: number | null
        }
        Relationships: []
      }
      feature_flags: {
        Row: {
          created_at: string | null
          default_enabled: boolean | null
          description: string | null
          flag_name: string
          flag_type: string | null
          id: string
          is_global: boolean | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          default_enabled?: boolean | null
          description?: string | null
          flag_name: string
          flag_type?: string | null
          id?: string
          is_global?: boolean | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          default_enabled?: boolean | null
          description?: string | null
          flag_name?: string
          flag_type?: string | null
          id?: string
          is_global?: boolean | null
          updated_at?: string | null
        }
        Relationships: []
      }
      file_attachments: {
        Row: {
          created_at: string
          file_name: string
          file_size: number
          file_type: string
          id: string
          message_id: string
          storage_path: string
        }
        Insert: {
          created_at?: string
          file_name: string
          file_size: number
          file_type: string
          id?: string
          message_id: string
          storage_path: string
        }
        Update: {
          created_at?: string
          file_name?: string
          file_size?: number
          file_type?: string
          id?: string
          message_id?: string
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "file_attachments_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      file_upload_audit: {
        Row: {
          bucket_name: string
          created_at: string
          file_name: string
          file_size: number | null
          id: string
          ip_address: unknown | null
          mime_type: string | null
          upload_status: string
          user_id: string | null
        }
        Insert: {
          bucket_name: string
          created_at?: string
          file_name: string
          file_size?: number | null
          id?: string
          ip_address?: unknown | null
          mime_type?: string | null
          upload_status?: string
          user_id?: string | null
        }
        Update: {
          bucket_name?: string
          created_at?: string
          file_name?: string
          file_size?: number | null
          id?: string
          ip_address?: unknown | null
          mime_type?: string | null
          upload_status?: string
          user_id?: string | null
        }
        Relationships: []
      }
      form_submissions: {
        Row: {
          completion_percentage: number | null
          created_at: string
          form_data: Json
          form_name: string
          id: string
          status: string
          submitted_at: string | null
          template_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          completion_percentage?: number | null
          created_at?: string
          form_data?: Json
          form_name: string
          id?: string
          status?: string
          submitted_at?: string | null
          template_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          completion_percentage?: number | null
          created_at?: string
          form_data?: Json
          form_name?: string
          id?: string
          status?: string
          submitted_at?: string | null
          template_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      formula_analysis: {
        Row: {
          business_context: string | null
          business_logic: string | null
          cell_reference: string
          complexity_score: number | null
          created_at: string
          data_types: Json | null
          dependencies: Json | null
          formula_text: string
          id: string
          input_fields: Json | null
          output_fields: Json | null
          sheet_id: string
          test_cases: Json | null
          validation_rules: Json | null
        }
        Insert: {
          business_context?: string | null
          business_logic?: string | null
          cell_reference: string
          complexity_score?: number | null
          created_at?: string
          data_types?: Json | null
          dependencies?: Json | null
          formula_text: string
          id?: string
          input_fields?: Json | null
          output_fields?: Json | null
          sheet_id: string
          test_cases?: Json | null
          validation_rules?: Json | null
        }
        Update: {
          business_context?: string | null
          business_logic?: string | null
          cell_reference?: string
          complexity_score?: number | null
          created_at?: string
          data_types?: Json | null
          dependencies?: Json | null
          formula_text?: string
          id?: string
          input_fields?: Json | null
          output_fields?: Json | null
          sheet_id?: string
          test_cases?: Json | null
          validation_rules?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "formula_analysis_sheet_id_fkey"
            columns: ["sheet_id"]
            isOneToOne: false
            referencedRelation: "excel_sheets"
            referencedColumns: ["id"]
          },
        ]
      }
      framework_document_templates: {
        Row: {
          created_at: string | null
          description: string | null
          document_type: string
          download_count: number | null
          file_name: string
          file_path: string
          file_size: number | null
          framework_id: string
          id: string
          is_required: boolean | null
          mime_type: string | null
          template_name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          document_type: string
          download_count?: number | null
          file_name: string
          file_path: string
          file_size?: number | null
          framework_id: string
          id?: string
          is_required?: boolean | null
          mime_type?: string | null
          template_name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          document_type?: string
          download_count?: number | null
          file_name?: string
          file_path?: string
          file_size?: number | null
          framework_id?: string
          id?: string
          is_required?: boolean | null
          mime_type?: string | null
          template_name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "framework_document_templates_framework_id_fkey"
            columns: ["framework_id"]
            isOneToOne: false
            referencedRelation: "indonesian_regulatory_frameworks"
            referencedColumns: ["id"]
          },
        ]
      }
      framework_requirements: {
        Row: {
          category: string | null
          compliance_criteria: string | null
          created_at: string
          framework_id: string
          id: string
          order_index: number | null
          priority: string
          requirement_description: string | null
          requirement_title: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          compliance_criteria?: string | null
          created_at?: string
          framework_id: string
          id?: string
          order_index?: number | null
          priority?: string
          requirement_description?: string | null
          requirement_title: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          compliance_criteria?: string | null
          created_at?: string
          framework_id?: string
          id?: string
          order_index?: number | null
          priority?: string
          requirement_description?: string | null
          requirement_title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "framework_requirements_framework_id_fkey"
            columns: ["framework_id"]
            isOneToOne: false
            referencedRelation: "compliance_frameworks"
            referencedColumns: ["id"]
          },
        ]
      }
      generated_test_files: {
        Row: {
          component_name: string
          component_path: string
          created_at: string | null
          id: string
          status: string
          storage_path: string
          test_content: string
          test_file_path: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          component_name: string
          component_path: string
          created_at?: string | null
          id?: string
          status?: string
          storage_path: string
          test_content: string
          test_file_path: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          component_name?: string
          component_path?: string
          created_at?: string | null
          id?: string
          status?: string
          storage_path?: string
          test_content?: string
          test_file_path?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      geographic_regions: {
        Row: {
          code: string
          country: string | null
          created_at: string
          currency: string | null
          id: string
          is_active: boolean
          name: string
          timezone: string | null
          updated_at: string
        }
        Insert: {
          code: string
          country?: string | null
          created_at?: string
          currency?: string | null
          id?: string
          is_active?: boolean
          name: string
          timezone?: string | null
          updated_at?: string
        }
        Update: {
          code?: string
          country?: string | null
          created_at?: string
          currency?: string | null
          id?: string
          is_active?: boolean
          name?: string
          timezone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      github_integrations: {
        Row: {
          access_token_encrypted: string | null
          created_at: string | null
          default_branch: string | null
          github_user_id: number | null
          github_username: string | null
          id: string
          last_sync_at: string | null
          project_id: string
          refresh_token_encrypted: string | null
          repository_full_name: string | null
          repository_id: number | null
          repository_name: string | null
          repository_url: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          access_token_encrypted?: string | null
          created_at?: string | null
          default_branch?: string | null
          github_user_id?: number | null
          github_username?: string | null
          id?: string
          last_sync_at?: string | null
          project_id: string
          refresh_token_encrypted?: string | null
          repository_full_name?: string | null
          repository_id?: number | null
          repository_name?: string | null
          repository_url?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          access_token_encrypted?: string | null
          created_at?: string | null
          default_branch?: string | null
          github_user_id?: number | null
          github_username?: string | null
          id?: string
          last_sync_at?: string | null
          project_id?: string
          refresh_token_encrypted?: string | null
          repository_full_name?: string | null
          repository_id?: number | null
          repository_name?: string | null
          repository_url?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      gold_calculations: {
        Row: {
          allocation_chart_data: Json
          asset_percentage: number
          calculated_at: string
          created_at: string
          detailed_holdings: Json
          id: string
          returns_contribution: number
          returns_contribution_ranking: Json
          sub_asset_summary: Json
          total_cost: number
          total_gains: number
          total_market_value: number
          total_returns: number
          updated_at: string
          user_id: string
        }
        Insert: {
          allocation_chart_data?: Json
          asset_percentage?: number
          calculated_at?: string
          created_at?: string
          detailed_holdings?: Json
          id?: string
          returns_contribution?: number
          returns_contribution_ranking?: Json
          sub_asset_summary?: Json
          total_cost?: number
          total_gains?: number
          total_market_value?: number
          total_returns?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          allocation_chart_data?: Json
          asset_percentage?: number
          calculated_at?: string
          created_at?: string
          detailed_holdings?: Json
          id?: string
          returns_contribution?: number
          returns_contribution_ranking?: Json
          sub_asset_summary?: Json
          total_cost?: number
          total_gains?: number
          total_market_value?: number
          total_returns?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      help_documents: {
        Row: {
          category: string
          content: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          is_public: boolean
          search_vector: unknown | null
          target_role: string | null
          tenant_id: string | null
          title: string
          updated_at: string
          view_count: number
        }
        Insert: {
          category?: string
          content: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          is_public?: boolean
          search_vector?: unknown | null
          target_role?: string | null
          tenant_id?: string | null
          title: string
          updated_at?: string
          view_count?: number
        }
        Update: {
          category?: string
          content?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          is_public?: boolean
          search_vector?: unknown | null
          target_role?: string | null
          tenant_id?: string | null
          title?: string
          updated_at?: string
          view_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "help_documents_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "customer_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "help_documents_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      hybrid_structure_calculations: {
        Row: {
          allocation_chart_data: Json
          calculated_at: string
          created_at: string
          detailed_holdings: Json
          hybrid_total_cost: number
          hybrid_total_gains: number
          hybrid_total_market_value: number
          hybrid_total_returns: number
          id: string
          returns_contribution: Json
          structured_sub_assets: Json
          structured_total_cost: number
          structured_total_gains: number
          structured_total_market_value: number
          structured_total_returns: number
          updated_at: string
          user_id: string
        }
        Insert: {
          allocation_chart_data?: Json
          calculated_at?: string
          created_at?: string
          detailed_holdings?: Json
          hybrid_total_cost?: number
          hybrid_total_gains?: number
          hybrid_total_market_value?: number
          hybrid_total_returns?: number
          id?: string
          returns_contribution?: Json
          structured_sub_assets?: Json
          structured_total_cost?: number
          structured_total_gains?: number
          structured_total_market_value?: number
          structured_total_returns?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          allocation_chart_data?: Json
          calculated_at?: string
          created_at?: string
          detailed_holdings?: Json
          hybrid_total_cost?: number
          hybrid_total_gains?: number
          hybrid_total_market_value?: number
          hybrid_total_returns?: number
          id?: string
          returns_contribution?: Json
          structured_sub_assets?: Json
          structured_total_cost?: number
          structured_total_gains?: number
          structured_total_market_value?: number
          structured_total_returns?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      indonesian_compliance_actions: {
        Row: {
          assigned_by: string | null
          assigned_to: string | null
          comments_count: number | null
          compliance_violation: string | null
          created_at: string | null
          department: string | null
          description: string | null
          due_date: string | null
          framework_id: string
          id: string
          priority: string | null
          progress: number | null
          remediation_steps: string[] | null
          requirement_id: string
          status: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          assigned_by?: string | null
          assigned_to?: string | null
          comments_count?: number | null
          compliance_violation?: string | null
          created_at?: string | null
          department?: string | null
          description?: string | null
          due_date?: string | null
          framework_id: string
          id?: string
          priority?: string | null
          progress?: number | null
          remediation_steps?: string[] | null
          requirement_id: string
          status?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          assigned_by?: string | null
          assigned_to?: string | null
          comments_count?: number | null
          compliance_violation?: string | null
          created_at?: string | null
          department?: string | null
          description?: string | null
          due_date?: string | null
          framework_id?: string
          id?: string
          priority?: string | null
          progress?: number | null
          remediation_steps?: string[] | null
          requirement_id?: string
          status?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "indonesian_compliance_actions_framework_id_fkey"
            columns: ["framework_id"]
            isOneToOne: false
            referencedRelation: "indonesian_regulatory_frameworks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "indonesian_compliance_actions_requirement_id_fkey"
            columns: ["requirement_id"]
            isOneToOne: false
            referencedRelation: "indonesian_regulatory_requirements"
            referencedColumns: ["id"]
          },
        ]
      }
      indonesian_compliance_workflows: {
        Row: {
          assigned_to: string[] | null
          created_at: string | null
          description: string | null
          framework_ids: string[] | null
          frequency: string | null
          id: string
          last_run_date: string | null
          name: string
          next_run_date: string | null
          status: string | null
          steps: Json | null
          success_rate: number | null
          trigger_type: string | null
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string[] | null
          created_at?: string | null
          description?: string | null
          framework_ids?: string[] | null
          frequency?: string | null
          id?: string
          last_run_date?: string | null
          name: string
          next_run_date?: string | null
          status?: string | null
          steps?: Json | null
          success_rate?: number | null
          trigger_type?: string | null
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string[] | null
          created_at?: string | null
          description?: string | null
          framework_ids?: string[] | null
          frequency?: string | null
          id?: string
          last_run_date?: string | null
          name?: string
          next_run_date?: string | null
          status?: string | null
          steps?: Json | null
          success_rate?: number | null
          trigger_type?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      indonesian_regulations: {
        Row: {
          applicable_industries: string[] | null
          business_size_scope: string[] | null
          created_at: string
          created_by: string | null
          description: string | null
          effective_date: string | null
          file_url: string | null
          full_text: string
          id: string
          issuing_authority: string
          metadata: Json | null
          regulation_number: string
          regulation_type: string
          sector_tags: string[] | null
          status: string
          title: string
          updated_at: string
          upload_date: string
          year: number
        }
        Insert: {
          applicable_industries?: string[] | null
          business_size_scope?: string[] | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          effective_date?: string | null
          file_url?: string | null
          full_text: string
          id?: string
          issuing_authority: string
          metadata?: Json | null
          regulation_number: string
          regulation_type: string
          sector_tags?: string[] | null
          status?: string
          title: string
          updated_at?: string
          upload_date?: string
          year: number
        }
        Update: {
          applicable_industries?: string[] | null
          business_size_scope?: string[] | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          effective_date?: string | null
          file_url?: string | null
          full_text?: string
          id?: string
          issuing_authority?: string
          metadata?: Json | null
          regulation_number?: string
          regulation_type?: string
          sector_tags?: string[] | null
          status?: string
          title?: string
          updated_at?: string
          upload_date?: string
          year?: number
        }
        Relationships: []
      }
      indonesian_regulatory_frameworks: {
        Row: {
          compliance_score: number | null
          created_at: string | null
          description: string | null
          document_count: number | null
          effective_date: string | null
          id: string
          industry: string[] | null
          issuing_authority: string
          jurisdiction: string | null
          last_updated: string | null
          mandatory_for: string[] | null
          name: string
          parent_regulation: string | null
          regional_scope: string[] | null
          regulation_level: string
          regulation_number: string
          requirement_count: number | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          compliance_score?: number | null
          created_at?: string | null
          description?: string | null
          document_count?: number | null
          effective_date?: string | null
          id?: string
          industry?: string[] | null
          issuing_authority: string
          jurisdiction?: string | null
          last_updated?: string | null
          mandatory_for?: string[] | null
          name: string
          parent_regulation?: string | null
          regional_scope?: string[] | null
          regulation_level: string
          regulation_number: string
          requirement_count?: number | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          compliance_score?: number | null
          created_at?: string | null
          description?: string | null
          document_count?: number | null
          effective_date?: string | null
          id?: string
          industry?: string[] | null
          issuing_authority?: string
          jurisdiction?: string | null
          last_updated?: string | null
          mandatory_for?: string[] | null
          name?: string
          parent_regulation?: string | null
          regional_scope?: string[] | null
          regulation_level?: string
          regulation_number?: string
          requirement_count?: number | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      indonesian_regulatory_requirements: {
        Row: {
          article_number: string
          category: string | null
          chapter_section: string | null
          compliance_status: string | null
          created_at: string | null
          due_date: string | null
          evidence_required: string[] | null
          framework_id: string
          id: string
          penalty_description: string | null
          priority: string | null
          requirement_text: string
          requirement_title: string
          responsible_party: string | null
          updated_at: string | null
        }
        Insert: {
          article_number: string
          category?: string | null
          chapter_section?: string | null
          compliance_status?: string | null
          created_at?: string | null
          due_date?: string | null
          evidence_required?: string[] | null
          framework_id: string
          id?: string
          penalty_description?: string | null
          priority?: string | null
          requirement_text: string
          requirement_title: string
          responsible_party?: string | null
          updated_at?: string | null
        }
        Update: {
          article_number?: string
          category?: string | null
          chapter_section?: string | null
          compliance_status?: string | null
          created_at?: string | null
          due_date?: string | null
          evidence_required?: string[] | null
          framework_id?: string
          id?: string
          penalty_description?: string | null
          priority?: string | null
          requirement_text?: string
          requirement_title?: string
          responsible_party?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "indonesian_regulatory_requirements_framework_id_fkey"
            columns: ["framework_id"]
            isOneToOne: false
            referencedRelation: "indonesian_regulatory_frameworks"
            referencedColumns: ["id"]
          },
        ]
      }
      international_calculations: {
        Row: {
          allocation_chart_data: Json
          asset_percentage: number
          calculated_at: string
          created_at: string
          detailed_holdings: Json
          id: string
          returns_contribution: Json
          sub_asset_summary: Json
          total_cost: number
          total_gains: number
          total_market_value: number
          total_returns: number
          updated_at: string
          user_id: string
        }
        Insert: {
          allocation_chart_data?: Json
          asset_percentage?: number
          calculated_at?: string
          created_at?: string
          detailed_holdings?: Json
          id?: string
          returns_contribution?: Json
          sub_asset_summary?: Json
          total_cost?: number
          total_gains?: number
          total_market_value?: number
          total_returns?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          allocation_chart_data?: Json
          asset_percentage?: number
          calculated_at?: string
          created_at?: string
          detailed_holdings?: Json
          id?: string
          returns_contribution?: Json
          sub_asset_summary?: Json
          total_cost?: number
          total_gains?: number
          total_market_value?: number
          total_returns?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      invoice_line_items: {
        Row: {
          amount: number
          billing_period_end: string | null
          billing_period_start: string | null
          created_at: string
          currency: string
          description: string
          feature_name: string | null
          id: string
          invoice_id: string
          metadata: Json | null
          quantity: number
          unit_price: number
        }
        Insert: {
          amount: number
          billing_period_end?: string | null
          billing_period_start?: string | null
          created_at?: string
          currency?: string
          description: string
          feature_name?: string | null
          id?: string
          invoice_id: string
          metadata?: Json | null
          quantity?: number
          unit_price: number
        }
        Update: {
          amount?: number
          billing_period_end?: string | null
          billing_period_start?: string | null
          created_at?: string
          currency?: string
          description?: string
          feature_name?: string | null
          id?: string
          invoice_id?: string
          metadata?: Json | null
          quantity?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_line_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount_due: number | null
          amount_paid: number | null
          billing_period_end: string | null
          billing_period_start: string | null
          created_at: string
          currency: string
          due_date: string | null
          id: string
          invoice_number: string
          invoice_pdf_url: string | null
          metadata: Json | null
          paid_at: string | null
          status: string
          stripe_invoice_id: string | null
          subtotal: number
          tax_amount: number | null
          tenant_id: string
          total_amount: number
          updated_at: string
        }
        Insert: {
          amount_due?: number | null
          amount_paid?: number | null
          billing_period_end?: string | null
          billing_period_start?: string | null
          created_at?: string
          currency?: string
          due_date?: string | null
          id?: string
          invoice_number: string
          invoice_pdf_url?: string | null
          metadata?: Json | null
          paid_at?: string | null
          status?: string
          stripe_invoice_id?: string | null
          subtotal?: number
          tax_amount?: number | null
          tenant_id: string
          total_amount?: number
          updated_at?: string
        }
        Update: {
          amount_due?: number | null
          amount_paid?: number | null
          billing_period_end?: string | null
          billing_period_start?: string | null
          created_at?: string
          currency?: string
          due_date?: string | null
          id?: string
          invoice_number?: string
          invoice_pdf_url?: string | null
          metadata?: Json | null
          paid_at?: string | null
          status?: string
          stripe_invoice_id?: string | null
          subtotal?: number
          tax_amount?: number | null
          tenant_id?: string
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "customer_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "invoices_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      kpi_thresholds: {
        Row: {
          average_min: number
          created_at: string
          excellent_min: number
          good_min: number
          id: string
          is_active: boolean
          metric_name: string
          poor_min: number
          sector: string | null
          unit: string | null
          updated_at: string
        }
        Insert: {
          average_min: number
          created_at?: string
          excellent_min: number
          good_min: number
          id?: string
          is_active?: boolean
          metric_name: string
          poor_min: number
          sector?: string | null
          unit?: string | null
          updated_at?: string
        }
        Update: {
          average_min?: number
          created_at?: string
          excellent_min?: number
          good_min?: number
          id?: string
          is_active?: boolean
          metric_name?: string
          poor_min?: number
          sector?: string | null
          unit?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      legal_holds: {
        Row: {
          id: string
          user_id: string
          name: string
          description: string | null
          hold_reason: string
          matter_id: string | null
          custodian_name: string | null
          custodian_email: string | null
          start_date: string
          end_date: string | null
          status: string
          document_ids: string[] | null
          folder_ids: string[] | null
          search_criteria: Json | null
          notes: string | null
          created_by: string | null
          released_by: string | null
          released_at: string | null
          release_reason: string | null
          metadata: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          description?: string | null
          hold_reason: string
          matter_id?: string | null
          custodian_name?: string | null
          custodian_email?: string | null
          start_date?: string
          end_date?: string | null
          status?: string
          document_ids?: string[] | null
          folder_ids?: string[] | null
          search_criteria?: Json | null
          notes?: string | null
          created_by?: string | null
          released_by?: string | null
          released_at?: string | null
          release_reason?: string | null
          metadata?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          description?: string | null
          hold_reason?: string
          matter_id?: string | null
          custodian_name?: string | null
          custodian_email?: string | null
          start_date?: string
          end_date?: string | null
          status?: string
          document_ids?: string[] | null
          folder_ids?: string[] | null
          search_criteria?: Json | null
          notes?: string | null
          created_by?: string | null
          released_by?: string | null
          released_at?: string | null
          release_reason?: string | null
          metadata?: Json | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      liquidity_data: {
        Row: {
          available_credit_lines: number
          cash_equivalents: number
          company_name: string
          created_at: string
          id: string
          short_term_investments: number
          updated_at: string
          working_capital: number
          year: number
        }
        Insert: {
          available_credit_lines: number
          cash_equivalents: number
          company_name: string
          created_at?: string
          id?: string
          short_term_investments: number
          updated_at?: string
          working_capital: number
          year: number
        }
        Update: {
          available_credit_lines?: number
          cash_equivalents?: number
          company_name?: string
          created_at?: string
          id?: string
          short_term_investments?: number
          updated_at?: string
          working_capital?: number
          year?: number
        }
        Relationships: []
      }
      liveness_results: {
        Row: {
          created_at: string
          customer_id: string
          error_message: string | null
          face_detected: boolean
          face_quality: Json
          id: string
          is_live: boolean
          liveness_score: number
          processing_time_ms: number | null
          session_id: string
          source: string
          spoof_type: string | null
          video_metadata: Json | null
        }
        Insert: {
          created_at?: string
          customer_id: string
          error_message?: string | null
          face_detected?: boolean
          face_quality?: Json
          id?: string
          is_live: boolean
          liveness_score: number
          processing_time_ms?: number | null
          session_id: string
          source?: string
          spoof_type?: string | null
          video_metadata?: Json | null
        }
        Update: {
          created_at?: string
          customer_id?: string
          error_message?: string | null
          face_detected?: boolean
          face_quality?: Json
          id?: string
          is_live?: boolean
          liveness_score?: number
          processing_time_ms?: number | null
          session_id?: string
          source?: string
          spoof_type?: string | null
          video_metadata?: Json | null
        }
        Relationships: []
      }
      liveness_sessions: {
        Row: {
          created_at: string
          customer_id: string
          expires_at: string
          id: string
          session_id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          expires_at?: string
          id?: string
          session_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          expires_at?: string
          id?: string
          session_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      llm_configurations: {
        Row: {
          ab_test_config: Json | null
          created_at: string
          description: string | null
          environment: string
          error_rate_threshold: number | null
          failover_triggers: Json | null
          fallback_models: Json | null
          feature_flags: Json | null
          id: string
          is_active: boolean
          last_used_at: string | null
          max_retries: number | null
          name: string
          primary_model_id: string
          primary_parameters: Json
          priority: number | null
          retry_delay_ms: number | null
          timeout_ms: number | null
          traffic_percentage: number | null
          updated_at: string
          usage_stats: Json | null
          use_case_id: string
        }
        Insert: {
          ab_test_config?: Json | null
          created_at?: string
          description?: string | null
          environment?: string
          error_rate_threshold?: number | null
          failover_triggers?: Json | null
          fallback_models?: Json | null
          feature_flags?: Json | null
          id?: string
          is_active?: boolean
          last_used_at?: string | null
          max_retries?: number | null
          name: string
          primary_model_id: string
          primary_parameters?: Json
          priority?: number | null
          retry_delay_ms?: number | null
          timeout_ms?: number | null
          traffic_percentage?: number | null
          updated_at?: string
          usage_stats?: Json | null
          use_case_id: string
        }
        Update: {
          ab_test_config?: Json | null
          created_at?: string
          description?: string | null
          environment?: string
          error_rate_threshold?: number | null
          failover_triggers?: Json | null
          fallback_models?: Json | null
          feature_flags?: Json | null
          id?: string
          is_active?: boolean
          last_used_at?: string | null
          max_retries?: number | null
          name?: string
          primary_model_id?: string
          primary_parameters?: Json
          priority?: number | null
          retry_delay_ms?: number | null
          timeout_ms?: number | null
          traffic_percentage?: number | null
          updated_at?: string
          usage_stats?: Json | null
          use_case_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "llm_configurations_primary_model_id_fkey"
            columns: ["primary_model_id"]
            isOneToOne: false
            referencedRelation: "llm_models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "llm_configurations_use_case_id_fkey"
            columns: ["use_case_id"]
            isOneToOne: false
            referencedRelation: "llm_use_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      llm_models: {
        Row: {
          capabilities: Json
          context_window: number | null
          cost_per_input_token: number | null
          cost_per_output_token: number | null
          created_at: string
          display_name: string
          id: string
          is_active: boolean
          max_output_tokens: number | null
          metadata: Json | null
          model_name: string
          model_type: string
          provider_id: string
          supports_functions: boolean | null
          supports_streaming: boolean | null
          supports_vision: boolean | null
          updated_at: string
        }
        Insert: {
          capabilities?: Json
          context_window?: number | null
          cost_per_input_token?: number | null
          cost_per_output_token?: number | null
          created_at?: string
          display_name: string
          id?: string
          is_active?: boolean
          max_output_tokens?: number | null
          metadata?: Json | null
          model_name: string
          model_type: string
          provider_id: string
          supports_functions?: boolean | null
          supports_streaming?: boolean | null
          supports_vision?: boolean | null
          updated_at?: string
        }
        Update: {
          capabilities?: Json
          context_window?: number | null
          cost_per_input_token?: number | null
          cost_per_output_token?: number | null
          created_at?: string
          display_name?: string
          id?: string
          is_active?: boolean
          max_output_tokens?: number | null
          metadata?: Json | null
          model_name?: string
          model_type?: string
          provider_id?: string
          supports_functions?: boolean | null
          supports_streaming?: boolean | null
          supports_vision?: boolean | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "llm_models_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "llm_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      llm_provider_configs: {
        Row: {
          api_endpoint: string | null
          assigned_areas: Json
          configuration: Json
          created_at: string
          fallback_config_id: string | null
          frequency_penalty: number
          id: string
          is_default: boolean
          is_enabled: boolean
          max_tokens: number
          model_name: string
          name: string
          presence_penalty: number
          priority: number
          provider_type: string
          rate_limit_rpm: number
          retry_attempts: number
          streaming_enabled: boolean
          system_prompt: string | null
          temperature: number
          timeout_seconds: number
          top_p: number
          updated_at: string
          use_cases: Json
        }
        Insert: {
          api_endpoint?: string | null
          assigned_areas?: Json
          configuration?: Json
          created_at?: string
          fallback_config_id?: string | null
          frequency_penalty?: number
          id?: string
          is_default?: boolean
          is_enabled?: boolean
          max_tokens?: number
          model_name: string
          name: string
          presence_penalty?: number
          priority?: number
          provider_type: string
          rate_limit_rpm?: number
          retry_attempts?: number
          streaming_enabled?: boolean
          system_prompt?: string | null
          temperature?: number
          timeout_seconds?: number
          top_p?: number
          updated_at?: string
          use_cases?: Json
        }
        Update: {
          api_endpoint?: string | null
          assigned_areas?: Json
          configuration?: Json
          created_at?: string
          fallback_config_id?: string | null
          frequency_penalty?: number
          id?: string
          is_default?: boolean
          is_enabled?: boolean
          max_tokens?: number
          model_name?: string
          name?: string
          presence_penalty?: number
          priority?: number
          provider_type?: string
          rate_limit_rpm?: number
          retry_attempts?: number
          streaming_enabled?: boolean
          system_prompt?: string | null
          temperature?: number
          timeout_seconds?: number
          top_p?: number
          updated_at?: string
          use_cases?: Json
        }
        Relationships: [
          {
            foreignKeyName: "llm_provider_configs_fallback_config_id_fkey"
            columns: ["fallback_config_id"]
            isOneToOne: false
            referencedRelation: "llm_provider_configs"
            referencedColumns: ["id"]
          },
        ]
      }
      llm_providers: {
        Row: {
          auth_config: Json | null
          auth_type: string
          base_url: string
          created_at: string
          default_headers: Json | null
          display_name: string
          id: string
          is_active: boolean
          metadata: Json | null
          name: string
          rate_limits: Json | null
          updated_at: string
        }
        Insert: {
          auth_config?: Json | null
          auth_type?: string
          base_url: string
          created_at?: string
          default_headers?: Json | null
          display_name: string
          id?: string
          is_active?: boolean
          metadata?: Json | null
          name: string
          rate_limits?: Json | null
          updated_at?: string
        }
        Update: {
          auth_config?: Json | null
          auth_type?: string
          base_url?: string
          created_at?: string
          default_headers?: Json | null
          display_name?: string
          id?: string
          is_active?: boolean
          metadata?: Json | null
          name?: string
          rate_limits?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      llm_usage_logs: {
        Row: {
          configuration_id: string
          cost_usd: number | null
          created_at: string
          error_code: string | null
          error_message: string | null
          id: string
          input_tokens: number | null
          model_id: string
          model_parameters: Json | null
          output_tokens: number | null
          request_id: string | null
          request_metadata: Json | null
          response_time_ms: number | null
          session_id: string | null
          status: string
          total_tokens: number | null
          use_case: string
          user_id: string | null
        }
        Insert: {
          configuration_id: string
          cost_usd?: number | null
          created_at?: string
          error_code?: string | null
          error_message?: string | null
          id?: string
          input_tokens?: number | null
          model_id: string
          model_parameters?: Json | null
          output_tokens?: number | null
          request_id?: string | null
          request_metadata?: Json | null
          response_time_ms?: number | null
          session_id?: string | null
          status: string
          total_tokens?: number | null
          use_case: string
          user_id?: string | null
        }
        Update: {
          configuration_id?: string
          cost_usd?: number | null
          created_at?: string
          error_code?: string | null
          error_message?: string | null
          id?: string
          input_tokens?: number | null
          model_id?: string
          model_parameters?: Json | null
          output_tokens?: number | null
          request_id?: string | null
          request_metadata?: Json | null
          response_time_ms?: number | null
          session_id?: string | null
          status?: string
          total_tokens?: number | null
          use_case?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "llm_usage_logs_configuration_id_fkey"
            columns: ["configuration_id"]
            isOneToOne: false
            referencedRelation: "llm_configurations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "llm_usage_logs_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "llm_models"
            referencedColumns: ["id"]
          },
        ]
      }
      llm_use_cases: {
        Row: {
          compatible_models: string[] | null
          created_at: string
          default_parameters: Json | null
          description: string | null
          display_name: string
          id: string
          is_active: boolean
          name: string
          prompt_template: string | null
          required_capabilities: Json
          updated_at: string
        }
        Insert: {
          compatible_models?: string[] | null
          created_at?: string
          default_parameters?: Json | null
          description?: string | null
          display_name: string
          id?: string
          is_active?: boolean
          name: string
          prompt_template?: string | null
          required_capabilities?: Json
          updated_at?: string
        }
        Update: {
          compatible_models?: string[] | null
          created_at?: string
          default_parameters?: Json | null
          description?: string | null
          display_name?: string
          id?: string
          is_active?: boolean
          name?: string
          prompt_template?: string | null
          required_capabilities?: Json
          updated_at?: string
        }
        Relationships: []
      }
      market_data: {
        Row: {
          coverage_details: Json
          features: Json | null
          id: string
          last_updated: string
          policy_type: string
          premium_range: Json
          provider_name: string
          rating: number | null
        }
        Insert: {
          coverage_details: Json
          features?: Json | null
          id?: string
          last_updated?: string
          policy_type: string
          premium_range: Json
          provider_name: string
          rating?: number | null
        }
        Update: {
          coverage_details?: Json
          features?: Json | null
          id?: string
          last_updated?: string
          policy_type?: string
          premium_range?: Json
          provider_name?: string
          rating?: number | null
        }
        Relationships: []
      }
      market_insights: {
        Row: {
          category: string
          created_at: string
          id: string
          impact: string
          portfolio_context: Json | null
          relevance_score: number | null
          source: string
          summary: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string
          created_at?: string
          id?: string
          impact: string
          portfolio_context?: Json | null
          relevance_score?: number | null
          source?: string
          summary: string
          title: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          impact?: string
          portfolio_context?: Json | null
          relevance_score?: number | null
          source?: string
          summary?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      market_outlook_sections: {
        Row: {
          charts: Json | null
          content: Json
          created_at: string
          id: string
          last_updated_at: string
          section_type: string
          title: string
          updated_at: string
        }
        Insert: {
          charts?: Json | null
          content?: Json
          created_at?: string
          id?: string
          last_updated_at?: string
          section_type: string
          title: string
          updated_at?: string
        }
        Update: {
          charts?: Json | null
          content?: Json
          created_at?: string
          id?: string
          last_updated_at?: string
          section_type?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      meetings: {
        Row: {
          attendees: Json | null
          company_id: string | null
          created_at: string | null
          description: string | null
          duration_minutes: number | null
          id: string
          location: string | null
          meeting_date: string
          meeting_type: string | null
          organizer_id: string
          project_id: string | null
          start_time: string
          status: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          attendees?: Json | null
          company_id?: string | null
          created_at?: string | null
          description?: string | null
          duration_minutes?: number | null
          id?: string
          location?: string | null
          meeting_date: string
          meeting_type?: string | null
          organizer_id: string
          project_id?: string | null
          start_time: string
          status?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          attendees?: Json | null
          company_id?: string | null
          created_at?: string | null
          description?: string | null
          duration_minutes?: number | null
          id?: string
          location?: string | null
          meeting_date?: string
          meeting_type?: string | null
          organizer_id?: string
          project_id?: string | null
          start_time?: string
          status?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "meetings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "business_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meetings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "customer_overview"
            referencedColumns: ["business_client_id"]
          },
          {
            foreignKeyName: "meetings_organizer_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "meetings_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          metadata: Json | null
          role: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          metadata?: Json | null
          role: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      migration_job_executions: {
        Row: {
          created_at: string
          end_time: string | null
          error_details: Json | null
          execution_number: number
          execution_status: string
          id: string
          job_id: string
          performance_stats: Json | null
          rows_failed: number | null
          rows_processed: number | null
          start_time: string
        }
        Insert: {
          created_at?: string
          end_time?: string | null
          error_details?: Json | null
          execution_number: number
          execution_status?: string
          id?: string
          job_id: string
          performance_stats?: Json | null
          rows_failed?: number | null
          rows_processed?: number | null
          start_time?: string
        }
        Update: {
          created_at?: string
          end_time?: string | null
          error_details?: Json | null
          execution_number?: number
          execution_status?: string
          id?: string
          job_id?: string
          performance_stats?: Json | null
          rows_failed?: number | null
          rows_processed?: number | null
          start_time?: string
        }
        Relationships: [
          {
            foreignKeyName: "migration_job_executions_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "migration_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      migration_jobs: {
        Row: {
          batch_size: number | null
          created_at: string
          end_time: string | null
          error_message: string | null
          execution_log: Json | null
          id: string
          job_name: string
          job_status: string
          migration_type: string
          parallel_jobs: number | null
          performance_metrics: Json | null
          progress_percentage: number | null
          rows_failed: number | null
          rows_processed: number | null
          schedule_config: Json | null
          schedule_type: string
          source_connection_id: string
          start_time: string | null
          tables_to_migrate: string[]
          target_connection_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          batch_size?: number | null
          created_at?: string
          end_time?: string | null
          error_message?: string | null
          execution_log?: Json | null
          id?: string
          job_name: string
          job_status?: string
          migration_type: string
          parallel_jobs?: number | null
          performance_metrics?: Json | null
          progress_percentage?: number | null
          rows_failed?: number | null
          rows_processed?: number | null
          schedule_config?: Json | null
          schedule_type?: string
          source_connection_id: string
          start_time?: string | null
          tables_to_migrate: string[]
          target_connection_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          batch_size?: number | null
          created_at?: string
          end_time?: string | null
          error_message?: string | null
          execution_log?: Json | null
          id?: string
          job_name?: string
          job_status?: string
          migration_type?: string
          parallel_jobs?: number | null
          performance_metrics?: Json | null
          progress_percentage?: number | null
          rows_failed?: number | null
          rows_processed?: number | null
          schedule_config?: Json | null
          schedule_type?: string
          source_connection_id?: string
          start_time?: string | null
          tables_to_migrate?: string[]
          target_connection_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "migration_jobs_source_connection_id_fkey"
            columns: ["source_connection_id"]
            isOneToOne: false
            referencedRelation: "database_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "migration_jobs_target_connection_id_fkey"
            columns: ["target_connection_id"]
            isOneToOne: false
            referencedRelation: "database_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      migration_projects: {
        Row: {
          active_tab: string
          created_at: string
          discovered_schema: Json | null
          id: string
          name: string
          selected_source_db: string | null
          selected_tables: string[] | null
          selected_target_db: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          active_tab?: string
          created_at?: string
          discovered_schema?: Json | null
          id?: string
          name: string
          selected_source_db?: string | null
          selected_tables?: string[] | null
          selected_target_db?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          active_tab?: string
          created_at?: string
          discovered_schema?: Json | null
          id?: string
          name?: string
          selected_source_db?: string | null
          selected_tables?: string[] | null
          selected_target_db?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      migration_recommendations: {
        Row: {
          bill_analysis_id: string
          cost_impact: number | null
          created_at: string
          description: string
          estimated_effort_weeks: number | null
          id: string
          prerequisites: string[] | null
          recommendation_type: string
          risk_level: string | null
          steps: string[] | null
          title: string
        }
        Insert: {
          bill_analysis_id: string
          cost_impact?: number | null
          created_at?: string
          description: string
          estimated_effort_weeks?: number | null
          id?: string
          prerequisites?: string[] | null
          recommendation_type: string
          risk_level?: string | null
          steps?: string[] | null
          title: string
        }
        Update: {
          bill_analysis_id?: string
          cost_impact?: number | null
          created_at?: string
          description?: string
          estimated_effort_weeks?: number | null
          id?: string
          prerequisites?: string[] | null
          recommendation_type?: string
          risk_level?: string | null
          steps?: string[] | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "migration_recommendations_bill_analysis_id_fkey"
            columns: ["bill_analysis_id"]
            isOneToOne: false
            referencedRelation: "bill_analyses"
            referencedColumns: ["id"]
          },
        ]
      }
      module_configurations: {
        Row: {
          chatbot_config: Json | null
          chatbot_enabled: boolean | null
          created_at: string
          id: string
          is_active: boolean | null
          module_id: string
          updated_at: string
          user_id: string
          website_url: string | null
        }
        Insert: {
          chatbot_config?: Json | null
          chatbot_enabled?: boolean | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          module_id: string
          updated_at?: string
          user_id: string
          website_url?: string | null
        }
        Update: {
          chatbot_config?: Json | null
          chatbot_enabled?: boolean | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          module_id?: string
          updated_at?: string
          user_id?: string
          website_url?: string | null
        }
        Relationships: []
      }
      module_permissions: {
        Row: {
          allow_company_admin: boolean
          created_at: string
          id: string
          module_id: string
          require_platform_admin: boolean
          required_roles: Json | null
          updated_at: string
        }
        Insert: {
          allow_company_admin?: boolean
          created_at?: string
          id?: string
          module_id: string
          require_platform_admin?: boolean
          required_roles?: Json | null
          updated_at?: string
        }
        Update: {
          allow_company_admin?: boolean
          created_at?: string
          id?: string
          module_id?: string
          require_platform_admin?: boolean
          required_roles?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "module_permissions_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: true
            referencedRelation: "admin_modules"
            referencedColumns: ["module_id"]
          },
        ]
      }
      monitoring_schedules: {
        Row: {
          config_id: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          next_check: string | null
          schedule_type: string | null
        }
        Insert: {
          config_id?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          next_check?: string | null
          schedule_type?: string | null
        }
        Update: {
          config_id?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          next_check?: string | null
          schedule_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "monitoring_schedules_config_id_fkey"
            columns: ["config_id"]
            isOneToOne: false
            referencedRelation: "regulation_monitoring_configs"
            referencedColumns: ["id"]
          },
        ]
      }
      monitoring_source_checks: {
        Row: {
          created_at: string | null
          id: string
          last_check_time: string | null
          regulations_found: number | null
          source_name: string | null
          source_url: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          last_check_time?: string | null
          regulations_found?: number | null
          source_name?: string | null
          source_url: string
        }
        Update: {
          created_at?: string | null
          id?: string
          last_check_time?: string | null
          regulations_found?: number | null
          source_name?: string | null
          source_url?: string
        }
        Relationships: []
      }
      nl_queries: {
        Row: {
          created_at: string
          error_message: string | null
          execution_status: string | null
          execution_time_ms: number | null
          generated_sql: string | null
          id: string
          metadata: Json | null
          original_question: string
          parsed_intent: Json | null
          results: Json | null
          user_id: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          execution_status?: string | null
          execution_time_ms?: number | null
          generated_sql?: string | null
          id?: string
          metadata?: Json | null
          original_question: string
          parsed_intent?: Json | null
          results?: Json | null
          user_id: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          execution_status?: string | null
          execution_time_ms?: number | null
          generated_sql?: string | null
          id?: string
          metadata?: Json | null
          original_question?: string
          parsed_intent?: Json | null
          results?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          action_url: string | null
          created_at: string | null
          document_id: string | null
          id: string
          message: string
          metadata: Json | null
          read_at: string | null
          status: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          action_url?: string | null
          created_at?: string | null
          document_id?: string | null
          id?: string
          message: string
          metadata?: Json | null
          read_at?: string | null
          status?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          action_url?: string | null
          created_at?: string | null
          document_id?: string | null
          id?: string
          message?: string
          metadata?: Json | null
          read_at?: string | null
          status?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "workflow_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      operations_data: {
        Row: {
          company_name: string
          cost_per_unit: string | null
          created_at: string
          efficiency: number | null
          id: string
          metadata: Json | null
          metric: string
          operation_name: string
          region: string
          revenue: string | null
          status: string | null
          updated_at: string
          value: string
          year: number
        }
        Insert: {
          company_name: string
          cost_per_unit?: string | null
          created_at?: string
          efficiency?: number | null
          id?: string
          metadata?: Json | null
          metric: string
          operation_name: string
          region: string
          revenue?: string | null
          status?: string | null
          updated_at?: string
          value: string
          year: number
        }
        Update: {
          company_name?: string
          cost_per_unit?: string | null
          created_at?: string
          efficiency?: number | null
          id?: string
          metadata?: Json | null
          metric?: string
          operation_name?: string
          region?: string
          revenue?: string | null
          status?: string | null
          updated_at?: string
          value?: string
          year?: number
        }
        Relationships: []
      }
      opportunities: {
        Row: {
          client_id: string
          client_spoc: string | null
          close_date: string | null
          commitment: string | null
          created_at: string
          id: string
          next_steps: string | null
          opportunity_description: string | null
          opportunity_name: string
          opportunity_number: string
          opportunity_owner: string | null
          product_service_id: string | null
          spoc_relation: string | null
          stage: string | null
          status_update: string | null
          tcv: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          client_id: string
          client_spoc?: string | null
          close_date?: string | null
          commitment?: string | null
          created_at?: string
          id?: string
          next_steps?: string | null
          opportunity_description?: string | null
          opportunity_name: string
          opportunity_number: string
          opportunity_owner?: string | null
          product_service_id?: string | null
          spoc_relation?: string | null
          stage?: string | null
          status_update?: string | null
          tcv?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          client_id?: string
          client_spoc?: string | null
          close_date?: string | null
          commitment?: string | null
          created_at?: string
          id?: string
          next_steps?: string | null
          opportunity_description?: string | null
          opportunity_name?: string
          opportunity_number?: string
          opportunity_owner?: string | null
          product_service_id?: string | null
          spoc_relation?: string | null
          stage?: string | null
          status_update?: string | null
          tcv?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "opportunities_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunities_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "customer_overview"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "opportunities_product_service_id_fkey"
            columns: ["product_service_id"]
            isOneToOne: false
            referencedRelation: "products_services"
            referencedColumns: ["id"]
          },
        ]
      }
      optimization_recommendations: {
        Row: {
          bill_analysis_id: string
          category: string
          complexity: string
          created_at: string
          current_cost: number
          id: string
          implementation_effort: string | null
          potential_savings: number
          priority: string
          recommendation_text: string
          service_name: string
        }
        Insert: {
          bill_analysis_id: string
          category: string
          complexity: string
          created_at?: string
          current_cost: number
          id?: string
          implementation_effort?: string | null
          potential_savings: number
          priority: string
          recommendation_text: string
          service_name: string
        }
        Update: {
          bill_analysis_id?: string
          category?: string
          complexity?: string
          created_at?: string
          current_cost?: number
          id?: string
          implementation_effort?: string | null
          potential_savings?: number
          priority?: string
          recommendation_text?: string
          service_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "optimization_recommendations_bill_analysis_id_fkey"
            columns: ["bill_analysis_id"]
            isOneToOne: false
            referencedRelation: "bill_analyses"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          application_id: string | null
          created_at: string | null
          id: string
          metadata: Json | null
          payment_date: string | null
          payment_gateway: string | null
          payment_method: string
          payment_reference: string
          payment_status: string | null
          policy_id: string | null
          transaction_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          amount: number
          application_id?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          payment_date?: string | null
          payment_gateway?: string | null
          payment_method: string
          payment_reference: string
          payment_status?: string | null
          policy_id?: string | null
          transaction_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          application_id?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          payment_date?: string | null
          payment_gateway?: string | null
          payment_method?: string
          payment_reference?: string
          payment_status?: string | null
          policy_id?: string | null
          transaction_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "policy_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "policies"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_configurations: {
        Row: {
          api_token: string | null
          base_url: string | null
          created_at: string | null
          id: string
          is_enabled: boolean | null
          last_used_at: string | null
          platform: string
          rate_limit_per_hour: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          api_token?: string | null
          base_url?: string | null
          created_at?: string | null
          id?: string
          is_enabled?: boolean | null
          last_used_at?: string | null
          platform: string
          rate_limit_per_hour?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          api_token?: string | null
          base_url?: string | null
          created_at?: string | null
          id?: string
          is_enabled?: boolean | null
          last_used_at?: string | null
          platform?: string
          rate_limit_per_hour?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      policies: {
        Row: {
          coverage_details: Json | null
          created_at: string
          end_date: string
          id: string
          policy_number: string
          policy_type: string
          premium_amount: number
          start_date: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          coverage_details?: Json | null
          created_at?: string
          end_date: string
          id?: string
          policy_number: string
          policy_type: string
          premium_amount: number
          start_date: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          coverage_details?: Json | null
          created_at?: string
          end_date?: string
          id?: string
          policy_number?: string
          policy_type?: string
          premium_amount?: number
          start_date?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      policy_applications: {
        Row: {
          ai_recommendations: Json | null
          ai_risk_score: number | null
          application_number: string
          created_at: string | null
          customer_data: Json
          documents_uploaded: Json | null
          id: string
          payment_status: string | null
          policy_id: string | null
          premium_amount: number
          quote_id: string | null
          underwriting_status: string | null
          updated_at: string | null
          user_id: string
          verification_status: string | null
        }
        Insert: {
          ai_recommendations?: Json | null
          ai_risk_score?: number | null
          application_number: string
          created_at?: string | null
          customer_data: Json
          documents_uploaded?: Json | null
          id?: string
          payment_status?: string | null
          policy_id?: string | null
          premium_amount: number
          quote_id?: string | null
          underwriting_status?: string | null
          updated_at?: string | null
          user_id: string
          verification_status?: string | null
        }
        Update: {
          ai_recommendations?: Json | null
          ai_risk_score?: number | null
          application_number?: string
          created_at?: string | null
          customer_data?: Json
          documents_uploaded?: Json | null
          id?: string
          payment_status?: string | null
          policy_id?: string | null
          premium_amount?: number
          quote_id?: string | null
          underwriting_status?: string | null
          updated_at?: string | null
          user_id?: string
          verification_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "policy_applications_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "policies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "policy_applications_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "policy_quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      policy_quotes: {
        Row: {
          ai_analysis: Json | null
          ai_recommendations: Json | null
          base_premium: number
          coverage_details: Json
          created_at: string | null
          customer_details: Json
          discounts_applied: Json | null
          final_premium: number
          id: string
          policy_type_id: string | null
          quote_number: string
          risk_assessment: Json | null
          status: string | null
          updated_at: string | null
          user_id: string
          valid_until: string
        }
        Insert: {
          ai_analysis?: Json | null
          ai_recommendations?: Json | null
          base_premium: number
          coverage_details: Json
          created_at?: string | null
          customer_details: Json
          discounts_applied?: Json | null
          final_premium: number
          id?: string
          policy_type_id?: string | null
          quote_number: string
          risk_assessment?: Json | null
          status?: string | null
          updated_at?: string | null
          user_id: string
          valid_until: string
        }
        Update: {
          ai_analysis?: Json | null
          ai_recommendations?: Json | null
          base_premium?: number
          coverage_details?: Json
          created_at?: string | null
          customer_details?: Json
          discounts_applied?: Json | null
          final_premium?: number
          id?: string
          policy_type_id?: string | null
          quote_number?: string
          risk_assessment?: Json | null
          status?: string | null
          updated_at?: string | null
          user_id?: string
          valid_until?: string
        }
        Relationships: [
          {
            foreignKeyName: "policy_quotes_policy_type_id_fkey"
            columns: ["policy_type_id"]
            isOneToOne: false
            referencedRelation: "policy_types"
            referencedColumns: ["id"]
          },
        ]
      }
      policy_types: {
        Row: {
          base_premium: number
          category: string
          coverage_details: Json | null
          created_at: string | null
          description: string | null
          eligibility_criteria: Json | null
          features: Json | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          base_premium: number
          category: string
          coverage_details?: Json | null
          created_at?: string | null
          description?: string | null
          eligibility_criteria?: Json | null
          features?: Json | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          base_premium?: number
          category?: string
          coverage_details?: Json | null
          created_at?: string | null
          description?: string | null
          eligibility_criteria?: Json | null
          features?: Json | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      portfolio_calculations: {
        Row: {
          asset_allocation: Json
          asset_class_returns: Json
          calculated_at: string
          created_at: string
          id: string
          performance_summary: Json
          portfolio_holdings: Json
          total_cost: number
          total_gains: number
          total_market_value: number
          total_returns: number
          updated_at: string
          user_id: string
        }
        Insert: {
          asset_allocation?: Json
          asset_class_returns?: Json
          calculated_at?: string
          created_at?: string
          id?: string
          performance_summary?: Json
          portfolio_holdings?: Json
          total_cost?: number
          total_gains?: number
          total_market_value?: number
          total_returns?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          asset_allocation?: Json
          asset_class_returns?: Json
          calculated_at?: string
          created_at?: string
          id?: string
          performance_summary?: Json
          portfolio_holdings?: Json
          total_cost?: number
          total_gains?: number
          total_market_value?: number
          total_returns?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      portfolio_overview_calculations: {
        Row: {
          asset_allocation: Json
          calculated_at: string
          created_at: string
          id: string
          performance_vs_benchmark: Json
          risk_score: number
          sharpe_ratio: number
          total_cost: number
          total_gains: number
          total_portfolio_value: number
          total_returns: number
          updated_at: string
          user_id: string
          ytd_performance: number
        }
        Insert: {
          asset_allocation?: Json
          calculated_at?: string
          created_at?: string
          id?: string
          performance_vs_benchmark?: Json
          risk_score?: number
          sharpe_ratio?: number
          total_cost?: number
          total_gains?: number
          total_portfolio_value?: number
          total_returns?: number
          updated_at?: string
          user_id: string
          ytd_performance?: number
        }
        Update: {
          asset_allocation?: Json
          calculated_at?: string
          created_at?: string
          id?: string
          performance_vs_benchmark?: Json
          risk_score?: number
          sharpe_ratio?: number
          total_cost?: number
          total_gains?: number
          total_portfolio_value?: number
          total_returns?: number
          updated_at?: string
          user_id?: string
          ytd_performance?: number
        }
        Relationships: []
      }
      portfolio_positions: {
        Row: {
          account_id: string | null
          asset_class: string
          asset_name: string
          cost_basis: number | null
          created_at: string
          currency: string | null
          geography: string | null
          id: string
          market_value: number
          position_date: string
          quantity: number
          sector: string | null
          symbol: string
          unit_price: number
          unrealized_gain_loss: number | null
          unrealized_gain_loss_percent: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          account_id?: string | null
          asset_class: string
          asset_name: string
          cost_basis?: number | null
          created_at?: string
          currency?: string | null
          geography?: string | null
          id?: string
          market_value?: number
          position_date: string
          quantity?: number
          sector?: string | null
          symbol: string
          unit_price?: number
          unrealized_gain_loss?: number | null
          unrealized_gain_loss_percent?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          account_id?: string | null
          asset_class?: string
          asset_name?: string
          cost_basis?: number | null
          created_at?: string
          currency?: string | null
          geography?: string | null
          id?: string
          market_value?: number
          position_date?: string
          quantity?: number
          sector?: string | null
          symbol?: string
          unit_price?: number
          unrealized_gain_loss?: number | null
          unrealized_gain_loss_percent?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      portfolio_summary_calculations: {
        Row: {
          asset_class_weights: Json
          calculated_at: string
          created_at: string
          id: string
          overall_returns: number
          rebalancing_suggestions: Json
          risk_metrics: Json
          top_performers: Json
          total_cost_basis: number
          total_portfolio_value: number
          total_unrealized_gains: number
          updated_at: string
          user_id: string
        }
        Insert: {
          asset_class_weights?: Json
          calculated_at?: string
          created_at?: string
          id?: string
          overall_returns?: number
          rebalancing_suggestions?: Json
          risk_metrics?: Json
          top_performers?: Json
          total_cost_basis?: number
          total_portfolio_value?: number
          total_unrealized_gains?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          asset_class_weights?: Json
          calculated_at?: string
          created_at?: string
          id?: string
          overall_returns?: number
          rebalancing_suggestions?: Json
          risk_metrics?: Json
          top_performers?: Json
          total_cost_basis?: number
          total_portfolio_value?: number
          total_unrealized_gains?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      pricing_data: {
        Row: {
          ai_recommendations: Json | null
          base_premium: number
          created_at: string
          discount_factors: Json | null
          id: string
          market_comparison: Json | null
          policy_type: string
          risk_factors: Json
        }
        Insert: {
          ai_recommendations?: Json | null
          base_premium: number
          created_at?: string
          discount_factors?: Json | null
          id?: string
          market_comparison?: Json | null
          policy_type: string
          risk_factors: Json
        }
        Update: {
          ai_recommendations?: Json | null
          base_premium?: number
          created_at?: string
          discount_factors?: Json | null
          id?: string
          market_comparison?: Json | null
          policy_type?: string
          risk_factors?: Json
        }
        Relationships: []
      }
      processed_documents: {
        Row: {
          analysis_results: Json | null
          analysis_type: string | null
          clauses_reviewed: number | null
          compliance_score: number | null
          created_at: string
          document_content: string | null
          document_metadata: Json | null
          extracted_text: string | null
          file_name: string
          id: string
          issues_found: number | null
          original_file_size: number | null
          processed_at: string
          processing_metadata: Json | null
          raw_ocr_data: Json | null
          risk_level: string | null
          search_vector: unknown | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          analysis_results?: Json | null
          analysis_type?: string | null
          clauses_reviewed?: number | null
          compliance_score?: number | null
          created_at?: string
          document_content?: string | null
          document_metadata?: Json | null
          extracted_text?: string | null
          file_name: string
          id?: string
          issues_found?: number | null
          original_file_size?: number | null
          processed_at?: string
          processing_metadata?: Json | null
          raw_ocr_data?: Json | null
          risk_level?: string | null
          search_vector?: unknown | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          analysis_results?: Json | null
          analysis_type?: string | null
          clauses_reviewed?: number | null
          compliance_score?: number | null
          created_at?: string
          document_content?: string | null
          document_metadata?: Json | null
          extracted_text?: string | null
          file_name?: string
          id?: string
          issues_found?: number | null
          original_file_size?: number | null
          processed_at?: string
          processing_metadata?: Json | null
          raw_ocr_data?: Json | null
          risk_level?: string | null
          search_vector?: unknown | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      products_services: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          client: string | null
          client_id: string | null
          country: string | null
          created_at: string
          department: string | null
          email: string | null
          full_name: string | null
          id: string
          is_platform_admin: boolean | null
          phone: string | null
          platform_role: Database["public"]["Enums"]["platform_role"] | null
          role: Database["public"]["Enums"]["app_role"] | null
          role_level: string | null
          tenant_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          client?: string | null
          client_id?: string | null
          country?: string | null
          created_at?: string
          department?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          is_platform_admin?: boolean | null
          phone?: string | null
          platform_role?: Database["public"]["Enums"]["platform_role"] | null
          role?: Database["public"]["Enums"]["app_role"] | null
          role_level?: string | null
          tenant_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          client?: string | null
          client_id?: string | null
          country?: string | null
          created_at?: string
          department?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          is_platform_admin?: boolean | null
          phone?: string | null
          platform_role?: Database["public"]["Enums"]["platform_role"] | null
          role?: Database["public"]["Enums"]["app_role"] | null
          role_level?: string | null
          tenant_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_company_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "business_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_company_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "customer_overview"
            referencedColumns: ["business_client_id"]
          },
          {
            foreignKeyName: "profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "customer_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      project_activities: {
        Row: {
          activity: string
          assignee_id: string | null
          comments: string | null
          company_id: string | null
          created_at: string
          dependency_id: string | null
          end_date: string
          id: string
          project_id: string
          start_date: string
          status: string
          updated_at: string
        }
        Insert: {
          activity: string
          assignee_id?: string | null
          comments?: string | null
          company_id?: string | null
          created_at?: string
          dependency_id?: string | null
          end_date: string
          id?: string
          project_id: string
          start_date: string
          status?: string
          updated_at?: string
        }
        Update: {
          activity?: string
          assignee_id?: string | null
          comments?: string | null
          company_id?: string | null
          created_at?: string
          dependency_id?: string | null
          end_date?: string
          id?: string
          project_id?: string
          start_date?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_activities_assignee_id_fkey"
            columns: ["assignee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "project_activities_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "business_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_activities_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "customer_overview"
            referencedColumns: ["business_client_id"]
          },
          {
            foreignKeyName: "project_activities_dependency_id_fkey"
            columns: ["dependency_id"]
            isOneToOne: false
            referencedRelation: "project_activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_activities_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_assignments: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          id: string
          project_id: string
          user_id: string
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          id?: string
          project_id: string
          user_id: string
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string | null
          id?: string
          project_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_assignments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_issues: {
        Row: {
          assignee_id: string | null
          company_id: string | null
          created_at: string
          description: string | null
          id: string
          priority: string
          project_id: string
          resolved_at: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          assignee_id?: string | null
          company_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          priority?: string
          project_id: string
          resolved_at?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          assignee_id?: string | null
          company_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          priority?: string
          project_id?: string
          resolved_at?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_issues_assignee_id_fkey"
            columns: ["assignee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "project_issues_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "business_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_issues_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "customer_overview"
            referencedColumns: ["business_client_id"]
          },
          {
            foreignKeyName: "project_issues_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_sessions: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          is_completed: boolean
          session_metadata: Json | null
          session_type: string
          started_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          is_completed?: boolean
          session_metadata?: Json | null
          session_type: string
          started_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          is_completed?: boolean
          session_metadata?: Json | null
          session_type?: string
          started_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      project_team_assignments: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          id: string
          project_id: string
          role: string
          user_id: string
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          id?: string
          project_id: string
          role: string
          user_id: string
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string | null
          id?: string
          project_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_team_assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "project_team_assignments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_team_assignments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      project_versions: {
        Row: {
          created_at: string
          id: string
          is_current: boolean
          project_data: Json
          project_id: string
          user_id: string
          version_name: string | null
          version_number: number
        }
        Insert: {
          created_at?: string
          id?: string
          is_current?: boolean
          project_data?: Json
          project_id: string
          user_id: string
          version_name?: string | null
          version_number?: number
        }
        Update: {
          created_at?: string
          id?: string
          is_current?: boolean
          project_data?: Json
          project_id?: string
          user_id?: string
          version_name?: string | null
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "project_versions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          budget: number | null
          company_id: string | null
          created_at: string
          created_by: string
          description: string | null
          due_date: string | null
          id: string
          issues: number | null
          name: string
          priority: string | null
          progress: number | null
          project_manager_id: string | null
          spent: number | null
          start_date: string | null
          status: string | null
          team: number | null
          updated_at: string
        }
        Insert: {
          budget?: number | null
          company_id?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          due_date?: string | null
          id?: string
          issues?: number | null
          name: string
          priority?: string | null
          progress?: number | null
          project_manager_id?: string | null
          spent?: number | null
          start_date?: string | null
          status?: string | null
          team?: number | null
          updated_at?: string
        }
        Update: {
          budget?: number | null
          company_id?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          due_date?: string | null
          id?: string
          issues?: number | null
          name?: string
          priority?: string | null
          progress?: number | null
          project_manager_id?: string | null
          spent?: number | null
          start_date?: string | null
          status?: string | null
          team?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "business_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "customer_overview"
            referencedColumns: ["business_client_id"]
          },
        ]
      }
      prompt_templates: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          is_custom: boolean
          models: Json | null
          name: string
          provider: string | null
          template: string
          updated_at: string
          use_case: string | null
          variables: Json | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          is_custom?: boolean
          models?: Json | null
          name: string
          provider?: string | null
          template: string
          updated_at?: string
          use_case?: string | null
          variables?: Json | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          is_custom?: boolean
          models?: Json | null
          name?: string
          provider?: string | null
          template?: string
          updated_at?: string
          use_case?: string | null
          variables?: Json | null
        }
        Relationships: []
      }
      proposals: {
        Row: {
          ai_evaluation: Json | null
          content: Json | null
          evaluated_at: string | null
          files: Json | null
          final_score: number | null
          id: string
          manual_scores: Json | null
          rfp_id: string
          status: string | null
          submitted_at: string | null
          vendor_id: string
        }
        Insert: {
          ai_evaluation?: Json | null
          content?: Json | null
          evaluated_at?: string | null
          files?: Json | null
          final_score?: number | null
          id?: string
          manual_scores?: Json | null
          rfp_id: string
          status?: string | null
          submitted_at?: string | null
          vendor_id: string
        }
        Update: {
          ai_evaluation?: Json | null
          content?: Json | null
          evaluated_at?: string | null
          files?: Json | null
          final_score?: number | null
          id?: string
          manual_scores?: Json | null
          rfp_id?: string
          status?: string | null
          submitted_at?: string | null
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "proposals_rfp_id_fkey"
            columns: ["rfp_id"]
            isOneToOne: false
            referencedRelation: "rfps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      public_form_submissions: {
        Row: {
          form_data: Json
          id: string
          ip_address: unknown | null
          public_form_id: string
          submitted_at: string
          submitter_email: string | null
          submitter_name: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          form_data?: Json
          id?: string
          ip_address?: unknown | null
          public_form_id: string
          submitted_at?: string
          submitter_email?: string | null
          submitter_name?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          form_data?: Json
          id?: string
          ip_address?: unknown | null
          public_form_id?: string
          submitted_at?: string
          submitter_email?: string | null
          submitter_name?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "public_form_submissions_public_form_id_fkey"
            columns: ["public_form_id"]
            isOneToOne: false
            referencedRelation: "public_forms"
            referencedColumns: ["id"]
          },
        ]
      }
      public_forms: {
        Row: {
          allow_multiple_submissions: boolean
          created_at: string
          form_config: Json
          form_description: string | null
          form_title: string
          id: string
          is_active: boolean
          public_url_slug: string | null
          requires_auth: boolean
          submission_count: number | null
          success_message: string | null
          template_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          allow_multiple_submissions?: boolean
          created_at?: string
          form_config?: Json
          form_description?: string | null
          form_title: string
          id?: string
          is_active?: boolean
          public_url_slug?: string | null
          requires_auth?: boolean
          submission_count?: number | null
          success_message?: string | null
          template_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          allow_multiple_submissions?: boolean
          created_at?: string
          form_config?: Json
          form_description?: string | null
          form_title?: string
          id?: string
          is_active?: boolean
          public_url_slug?: string | null
          requires_auth?: boolean
          submission_count?: number | null
          success_message?: string | null
          template_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      query_execution_logs: {
        Row: {
          connection_id: string | null
          created_at: string
          error_details: Json | null
          execution_status: string
          execution_time_ms: number | null
          id: string
          query_id: string | null
          rows_returned: number | null
          sql_query: string
          user_id: string
        }
        Insert: {
          connection_id?: string | null
          created_at?: string
          error_details?: Json | null
          execution_status: string
          execution_time_ms?: number | null
          id?: string
          query_id?: string | null
          rows_returned?: number | null
          sql_query: string
          user_id: string
        }
        Update: {
          connection_id?: string | null
          created_at?: string
          error_details?: Json | null
          execution_status?: string
          execution_time_ms?: number | null
          id?: string
          query_id?: string | null
          rows_returned?: number | null
          sql_query?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "query_execution_logs_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "database_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "query_execution_logs_query_id_fkey"
            columns: ["query_id"]
            isOneToOne: false
            referencedRelation: "nl_queries"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_cards: {
        Row: {
          created_at: string
          created_by: string
          currency: string
          effective_from: string
          effective_to: string | null
          hourly_rate: number
          hours_per_day: number
          id: string
          is_active: boolean
          rate_type: string
          role: Database["public"]["Enums"]["app_role"]
          role_level: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          currency?: string
          effective_from?: string
          effective_to?: string | null
          hourly_rate: number
          hours_per_day?: number
          id?: string
          is_active?: boolean
          rate_type?: string
          role: Database["public"]["Enums"]["app_role"]
          role_level?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          currency?: string
          effective_from?: string
          effective_to?: string | null
          hourly_rate?: number
          hours_per_day?: number
          id?: string
          is_active?: boolean
          rate_type?: string
          role?: Database["public"]["Enums"]["app_role"]
          role_level?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      reconciliation_results: {
        Row: {
          created_at: string
          discrepancy_details: Json | null
          id: string
          job_id: string
          match_status: string
          reconciliation_date: string
          reconciliation_type: string
          source_value: string | null
          table_name: string
          target_value: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          discrepancy_details?: Json | null
          id?: string
          job_id: string
          match_status: string
          reconciliation_date?: string
          reconciliation_type: string
          source_value?: string | null
          table_name: string
          target_value?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          discrepancy_details?: Json | null
          id?: string
          job_id?: string
          match_status?: string
          reconciliation_date?: string
          reconciliation_type?: string
          source_value?: string | null
          table_name?: string
          target_value?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reconciliation_results_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "migration_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      refresh_schedules: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          last_run_at: string | null
          next_run_at: string | null
          prompt_id: string | null
          schedule_expression: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_run_at?: string | null
          next_run_at?: string | null
          prompt_id?: string | null
          schedule_expression: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_run_at?: string | null
          next_run_at?: string | null
          prompt_id?: string | null
          schedule_expression?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "refresh_schedules_prompt_id_fkey"
            columns: ["prompt_id"]
            isOneToOne: false
            referencedRelation: "collection_prompts"
            referencedColumns: ["id"]
          },
        ]
      }
      retention_policies: {
        Row: {
          id: string
          user_id: string
          name: string
          description: string | null
          retention_period_days: number
          disposition_action: string
          trigger_type: string
          trigger_event: string | null
          is_active: boolean | null
          priority: number | null
          applies_to_categories: string[] | null
          applies_to_folders: string[] | null
          compliance_framework: string | null
          notification_days_before: number | null
          requires_approval: boolean | null
          approval_roles: string[] | null
          metadata: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          description?: string | null
          retention_period_days: number
          disposition_action: string
          trigger_type: string
          trigger_event?: string | null
          is_active?: boolean | null
          priority?: number | null
          applies_to_categories?: string[] | null
          applies_to_folders?: string[] | null
          compliance_framework?: string | null
          notification_days_before?: number | null
          requires_approval?: boolean | null
          approval_roles?: string[] | null
          metadata?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          description?: string | null
          retention_period_days?: number
          disposition_action?: string
          trigger_type?: string
          trigger_event?: string | null
          is_active?: boolean | null
          priority?: number | null
          applies_to_categories?: string[] | null
          applies_to_folders?: string[] | null
          compliance_framework?: string | null
          notification_days_before?: number | null
          requires_approval?: boolean | null
          approval_roles?: string[] | null
          metadata?: Json | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      retention_policy_templates: {
        Row: {
          id: string
          name: string
          description: string | null
          compliance_framework: string
          retention_period_days: number
          disposition_action: string
          trigger_type: string
          requires_approval: boolean | null
          category_suggestions: string[] | null
          is_system_template: boolean | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          compliance_framework: string
          retention_period_days: number
          disposition_action: string
          trigger_type: string
          requires_approval?: boolean | null
          category_suggestions?: string[] | null
          is_system_template?: boolean | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          compliance_framework?: string
          retention_period_days?: number
          disposition_action?: string
          trigger_type?: string
          requires_approval?: boolean | null
          category_suggestions?: string[] | null
          is_system_template?: boolean | null
          created_at?: string
        }
        Relationships: []
      }
      regulation_chunks: {
        Row: {
          article_number: string | null
          character_count: number | null
          chunk_index: number
          chunk_text: string
          chunk_type: string
          created_at: string
          embedding: string | null
          id: string
          metadata: Json | null
          regulation_id: string
          section_title: string | null
          word_count: number | null
        }
        Insert: {
          article_number?: string | null
          character_count?: number | null
          chunk_index: number
          chunk_text: string
          chunk_type?: string
          created_at?: string
          embedding?: string | null
          id?: string
          metadata?: Json | null
          regulation_id: string
          section_title?: string | null
          word_count?: number | null
        }
        Update: {
          article_number?: string | null
          character_count?: number | null
          chunk_index?: number
          chunk_text?: string
          chunk_type?: string
          created_at?: string
          embedding?: string | null
          id?: string
          metadata?: Json | null
          regulation_id?: string
          section_title?: string | null
          word_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "regulation_chunks_regulation_id_fkey"
            columns: ["regulation_id"]
            isOneToOne: false
            referencedRelation: "indonesian_regulations"
            referencedColumns: ["id"]
          },
        ]
      }
      regulation_embeddings: {
        Row: {
          chunk_id: string | null
          content_type: string
          created_at: string
          embedding: string | null
          embedding_model: string
          id: string
          metadata: Json | null
          regulation_id: string
          text_content: string
        }
        Insert: {
          chunk_id?: string | null
          content_type: string
          created_at?: string
          embedding?: string | null
          embedding_model?: string
          id?: string
          metadata?: Json | null
          regulation_id: string
          text_content: string
        }
        Update: {
          chunk_id?: string | null
          content_type?: string
          created_at?: string
          embedding?: string | null
          embedding_model?: string
          id?: string
          metadata?: Json | null
          regulation_id?: string
          text_content?: string
        }
        Relationships: [
          {
            foreignKeyName: "regulation_embeddings_chunk_id_fkey"
            columns: ["chunk_id"]
            isOneToOne: false
            referencedRelation: "regulation_chunks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "regulation_embeddings_regulation_id_fkey"
            columns: ["regulation_id"]
            isOneToOne: false
            referencedRelation: "indonesian_regulations"
            referencedColumns: ["id"]
          },
        ]
      }
      regulation_monitoring_configs: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          keywords: string[] | null
          last_check: string | null
          monitored_topics: string[] | null
          notification_settings: Json | null
          sources: Json | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          keywords?: string[] | null
          last_check?: string | null
          monitored_topics?: string[] | null
          notification_settings?: Json | null
          sources?: Json | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          keywords?: string[] | null
          last_check?: string | null
          monitored_topics?: string[] | null
          notification_settings?: Json | null
          sources?: Json | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      regulation_notifications: {
        Row: {
          created_at: string | null
          id: string
          matched_keywords: string[] | null
          matched_topics: string[] | null
          message: string | null
          notification_type: string
          read_status: boolean | null
          regulation_id: string | null
          relevance_score: number | null
          title: string
          urgency_level: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          matched_keywords?: string[] | null
          matched_topics?: string[] | null
          message?: string | null
          notification_type: string
          read_status?: boolean | null
          regulation_id?: string | null
          relevance_score?: number | null
          title: string
          urgency_level?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          matched_keywords?: string[] | null
          matched_topics?: string[] | null
          message?: string | null
          notification_type?: string
          read_status?: boolean | null
          regulation_id?: string | null
          relevance_score?: number | null
          title?: string
          urgency_level?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "regulation_notifications_regulation_id_fkey"
            columns: ["regulation_id"]
            isOneToOne: false
            referencedRelation: "indonesian_regulations"
            referencedColumns: ["id"]
          },
        ]
      }
      regulation_searches: {
        Row: {
          created_at: string
          id: string
          response_time_ms: number | null
          results_found: number
          search_embedding: string | null
          search_query: string
          search_type: string
          top_results: Json | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          response_time_ms?: number | null
          results_found?: number
          search_embedding?: string | null
          search_query: string
          search_type?: string
          top_results?: Json | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          response_time_ms?: number | null
          results_found?: number
          search_embedding?: string | null
          search_query?: string
          search_type?: string
          top_results?: Json | null
          user_id?: string | null
        }
        Relationships: []
      }
      report_templates: {
        Row: {
          created_at: string
          description: string | null
          file_name: string
          file_path: string
          file_size: number | null
          id: string
          is_active: boolean
          mime_type: string | null
          name: string
          template_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          file_name: string
          file_path: string
          file_size?: number | null
          id?: string
          is_active?: boolean
          mime_type?: string | null
          name: string
          template_type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          file_name?: string
          file_path?: string
          file_size?: number | null
          id?: string
          is_active?: boolean
          mime_type?: string | null
          name?: string
          template_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      repositories: {
        Row: {
          brd_url: string | null
          collection_prompt_id: string | null
          content_hash: string | null
          contributors: number | null
          created_at: string
          default_branch: string | null
          description: string | null
          fetch_frequency_hours: number | null
          forks: number | null
          has_brd: boolean | null
          has_documentation: boolean | null
          has_prd: boolean | null
          id: string
          is_active: boolean | null
          language: string | null
          last_fetched_at: string | null
          last_updated: string | null
          license_name: string | null
          metadata: Json | null
          name: string
          network_count: number | null
          open_issues_count: number | null
          platform: string | null
          platform_specific_data: Json | null
          prd_url: string | null
          readme_content: string | null
          repository_size: number | null
          repository_topics: string[] | null
          stars: number | null
          subscribers_count: number | null
          tech_stack: string[] | null
          updated_at: string
          url: string
          user_id: string
          watchers_count: number | null
        }
        Insert: {
          brd_url?: string | null
          collection_prompt_id?: string | null
          content_hash?: string | null
          contributors?: number | null
          created_at?: string
          default_branch?: string | null
          description?: string | null
          fetch_frequency_hours?: number | null
          forks?: number | null
          has_brd?: boolean | null
          has_documentation?: boolean | null
          has_prd?: boolean | null
          id?: string
          is_active?: boolean | null
          language?: string | null
          last_fetched_at?: string | null
          last_updated?: string | null
          license_name?: string | null
          metadata?: Json | null
          name: string
          network_count?: number | null
          open_issues_count?: number | null
          platform?: string | null
          platform_specific_data?: Json | null
          prd_url?: string | null
          readme_content?: string | null
          repository_size?: number | null
          repository_topics?: string[] | null
          stars?: number | null
          subscribers_count?: number | null
          tech_stack?: string[] | null
          updated_at?: string
          url: string
          user_id: string
          watchers_count?: number | null
        }
        Update: {
          brd_url?: string | null
          collection_prompt_id?: string | null
          content_hash?: string | null
          contributors?: number | null
          created_at?: string
          default_branch?: string | null
          description?: string | null
          fetch_frequency_hours?: number | null
          forks?: number | null
          has_brd?: boolean | null
          has_documentation?: boolean | null
          has_prd?: boolean | null
          id?: string
          is_active?: boolean | null
          language?: string | null
          last_fetched_at?: string | null
          last_updated?: string | null
          license_name?: string | null
          metadata?: Json | null
          name?: string
          network_count?: number | null
          open_issues_count?: number | null
          platform?: string | null
          platform_specific_data?: Json | null
          prd_url?: string | null
          readme_content?: string | null
          repository_size?: number | null
          repository_topics?: string[] | null
          stars?: number | null
          subscribers_count?: number | null
          tech_stack?: string[] | null
          updated_at?: string
          url?: string
          user_id?: string
          watchers_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "repositories_collection_prompt_id_fkey"
            columns: ["collection_prompt_id"]
            isOneToOne: false
            referencedRelation: "collection_prompts"
            referencedColumns: ["id"]
          },
        ]
      }
      repository_refresh_log: {
        Row: {
          changes_detected: Json | null
          completed_at: string | null
          error_message: string | null
          id: string
          processing_time_ms: number | null
          refresh_type: string
          repository_id: string | null
          started_at: string | null
          status: string
          user_id: string
        }
        Insert: {
          changes_detected?: Json | null
          completed_at?: string | null
          error_message?: string | null
          id?: string
          processing_time_ms?: number | null
          refresh_type: string
          repository_id?: string | null
          started_at?: string | null
          status?: string
          user_id: string
        }
        Update: {
          changes_detected?: Json | null
          completed_at?: string | null
          error_message?: string | null
          id?: string
          processing_time_ms?: number | null
          refresh_type?: string
          repository_id?: string | null
          started_at?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "repository_refresh_log_repository_id_fkey"
            columns: ["repository_id"]
            isOneToOne: false
            referencedRelation: "repositories"
            referencedColumns: ["id"]
          },
        ]
      }
      revenue_charts: {
        Row: {
          company_name: string
          created_at: string
          current_revenue: number
          id: string
          month: string
          previous_revenue: number
          target_revenue: number
          updated_at: string
          year: number
        }
        Insert: {
          company_name: string
          created_at?: string
          current_revenue: number
          id?: string
          month: string
          previous_revenue: number
          target_revenue: number
          updated_at?: string
          year: number
        }
        Update: {
          company_name?: string
          created_at?: string
          current_revenue?: number
          id?: string
          month?: string
          previous_revenue?: number
          target_revenue?: number
          updated_at?: string
          year?: number
        }
        Relationships: []
      }
      rfp_vendors: {
        Row: {
          acknowledged_at: string | null
          downloaded_at: string | null
          id: string
          invited_at: string | null
          proposal_files: Json | null
          rfp_id: string
          submitted_at: string | null
          vendor_id: string
        }
        Insert: {
          acknowledged_at?: string | null
          downloaded_at?: string | null
          id?: string
          invited_at?: string | null
          proposal_files?: Json | null
          rfp_id: string
          submitted_at?: string | null
          vendor_id: string
        }
        Update: {
          acknowledged_at?: string | null
          downloaded_at?: string | null
          id?: string
          invited_at?: string | null
          proposal_files?: Json | null
          rfp_id?: string
          submitted_at?: string | null
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rfp_vendors_rfp_id_fkey"
            columns: ["rfp_id"]
            isOneToOne: false
            referencedRelation: "rfps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rfp_vendors_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      rfps: {
        Row: {
          ai_generated_content: Json | null
          commercial_terms: string | null
          created_at: string
          created_by: string
          description: string | null
          evaluation_criteria: Json | null
          id: string
          legal_terms: string | null
          requirements: Json | null
          status: string | null
          submission_deadline: string | null
          title: string
          updated_at: string
        }
        Insert: {
          ai_generated_content?: Json | null
          commercial_terms?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          evaluation_criteria?: Json | null
          id?: string
          legal_terms?: string | null
          requirements?: Json | null
          status?: string | null
          submission_deadline?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          ai_generated_content?: Json | null
          commercial_terms?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          evaluation_criteria?: Json | null
          id?: string
          legal_terms?: string | null
          requirements?: Json | null
          status?: string | null
          submission_deadline?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      risk_assessments: {
        Row: {
          company_name: string
          created_at: string
          id: string
          risk_category: string
          risk_score: string
          risk_trend: string
          risk_value: number
          updated_at: string
          year: number
        }
        Insert: {
          company_name: string
          created_at?: string
          id?: string
          risk_category: string
          risk_score: string
          risk_trend: string
          risk_value: number
          updated_at?: string
          year: number
        }
        Update: {
          company_name?: string
          created_at?: string
          id?: string
          risk_category?: string
          risk_score?: string
          risk_trend?: string
          risk_value?: number
          updated_at?: string
          year?: number
        }
        Relationships: []
      }
      schema_discovery: {
        Row: {
          column_description: string | null
          column_name: string
          connection_id: string
          created_at: string
          data_type: string
          default_value: string | null
          discovered_at: string
          discovery_status: string
          id: string
          is_foreign_key: boolean
          is_nullable: boolean
          is_primary_key: boolean
          max_length: number | null
          row_count: number | null
          schema_name: string
          table_description: string | null
          table_name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          column_description?: string | null
          column_name: string
          connection_id: string
          created_at?: string
          data_type: string
          default_value?: string | null
          discovered_at?: string
          discovery_status?: string
          id?: string
          is_foreign_key?: boolean
          is_nullable?: boolean
          is_primary_key?: boolean
          max_length?: number | null
          row_count?: number | null
          schema_name: string
          table_description?: string | null
          table_name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          column_description?: string | null
          column_name?: string
          connection_id?: string
          created_at?: string
          data_type?: string
          default_value?: string | null
          discovered_at?: string
          discovery_status?: string
          id?: string
          is_foreign_key?: boolean
          is_nullable?: boolean
          is_primary_key?: boolean
          max_length?: number | null
          row_count?: number | null
          schema_name?: string
          table_description?: string | null
          table_name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "schema_discovery_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "database_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      search_history: {
        Row: {
          created_at: string | null
          filters_applied: Json | null
          id: string
          platform: string
          results_count: number | null
          search_duration_ms: number | null
          search_query: string
          search_type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          filters_applied?: Json | null
          id?: string
          platform: string
          results_count?: number | null
          search_duration_ms?: number | null
          search_query: string
          search_type: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          filters_applied?: Json | null
          id?: string
          platform?: string
          results_count?: number | null
          search_duration_ms?: number | null
          search_query?: string
          search_type?: string
          user_id?: string
        }
        Relationships: []
      }
      search_results: {
        Row: {
          chunk_id: string | null
          clicked: boolean | null
          clicked_at: string | null
          document_id: string | null
          id: string
          rank_position: number | null
          relevance_score: number | null
          search_session_id: string
        }
        Insert: {
          chunk_id?: string | null
          clicked?: boolean | null
          clicked_at?: string | null
          document_id?: string | null
          id?: string
          rank_position?: number | null
          relevance_score?: number | null
          search_session_id: string
        }
        Update: {
          chunk_id?: string | null
          clicked?: boolean | null
          clicked_at?: string | null
          document_id?: string | null
          id?: string
          rank_position?: number | null
          relevance_score?: number | null
          search_session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "search_results_chunk_id_fkey"
            columns: ["chunk_id"]
            isOneToOne: false
            referencedRelation: "document_chunks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "search_results_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "search_results_search_session_id_fkey"
            columns: ["search_session_id"]
            isOneToOne: false
            referencedRelation: "search_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      search_sessions: {
        Row: {
          created_at: string
          filters: Json | null
          id: string
          query: string
          response_time_ms: number | null
          results_count: number | null
          search_type: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          filters?: Json | null
          id?: string
          query: string
          response_time_ms?: number | null
          results_count?: number | null
          search_type?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          filters?: Json | null
          id?: string
          query?: string
          response_time_ms?: number | null
          results_count?: number | null
          search_type?: string | null
          user_id?: string
        }
        Relationships: []
      }
      semantic_entities: {
        Row: {
          business_definition: string | null
          created_at: string
          entity_description: string | null
          entity_name: string
          id: string
          metadata: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          business_definition?: string | null
          created_at?: string
          entity_description?: string | null
          entity_name: string
          id?: string
          metadata?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          business_definition?: string | null
          created_at?: string
          entity_description?: string | null
          entity_name?: string
          id?: string
          metadata?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      semantic_mappings: {
        Row: {
          confidence_score: number | null
          created_at: string
          entity_id: string
          id: string
          mapping_type: string
          metadata: Json | null
          schema_id: string
          transformation_logic: string | null
          user_id: string
        }
        Insert: {
          confidence_score?: number | null
          created_at?: string
          entity_id: string
          id?: string
          mapping_type?: string
          metadata?: Json | null
          schema_id: string
          transformation_logic?: string | null
          user_id: string
        }
        Update: {
          confidence_score?: number | null
          created_at?: string
          entity_id?: string
          id?: string
          mapping_type?: string
          metadata?: Json | null
          schema_id?: string
          transformation_logic?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "semantic_mappings_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "semantic_entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "semantic_mappings_schema_id_fkey"
            columns: ["schema_id"]
            isOneToOne: false
            referencedRelation: "database_schemas"
            referencedColumns: ["id"]
          },
        ]
      }
      session_activity_logs: {
        Row: {
          activity_type: string
          additional_data: Json | null
          created_at: string
          id: string
          ip_address: unknown | null
          page_url: string | null
          session_id: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          activity_type: string
          additional_data?: Json | null
          created_at?: string
          id?: string
          ip_address?: unknown | null
          page_url?: string | null
          session_id: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          activity_type?: string
          additional_data?: Json | null
          created_at?: string
          id?: string
          ip_address?: unknown | null
          page_url?: string | null
          session_id?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      simplify_chat_messages: {
        Row: {
          chat_session_id: string
          created_at: string
          id: string
          message_content: string
          message_type: string
          metadata: Json | null
          user_id: string
        }
        Insert: {
          chat_session_id: string
          created_at?: string
          id?: string
          message_content: string
          message_type: string
          metadata?: Json | null
          user_id: string
        }
        Update: {
          chat_session_id?: string
          created_at?: string
          id?: string
          message_content?: string
          message_type?: string
          metadata?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "simplify_chat_messages_chat_session_id_fkey"
            columns: ["chat_session_id"]
            isOneToOne: false
            referencedRelation: "chat_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      sku_alternatives: {
        Row: {
          alternative_providers: Json
          bill_analysis_id: string
          created_at: string
          current_cost: number
          current_sku: string
          id: string
        }
        Insert: {
          alternative_providers?: Json
          bill_analysis_id: string
          created_at?: string
          current_cost: number
          current_sku: string
          id?: string
        }
        Update: {
          alternative_providers?: Json
          bill_analysis_id?: string
          created_at?: string
          current_cost?: number
          current_sku?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sku_alternatives_bill_analysis_id_fkey"
            columns: ["bill_analysis_id"]
            isOneToOne: false
            referencedRelation: "bill_analyses"
            referencedColumns: ["id"]
          },
        ]
      }
      smart_folders: {
        Row: {
          ai_criteria: Json | null
          color: string | null
          created_at: string
          description: string | null
          document_count: number | null
          icon: string | null
          id: string
          is_smart: boolean | null
          name: string
          order_index: number
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_criteria?: Json | null
          color?: string | null
          created_at?: string
          description?: string | null
          document_count?: number | null
          icon?: string | null
          id?: string
          is_smart?: boolean | null
          name: string
          order_index?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_criteria?: Json | null
          color?: string | null
          created_at?: string
          description?: string | null
          document_count?: number | null
          icon?: string | null
          id?: string
          is_smart?: boolean | null
          name?: string
          order_index?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      sso_configurations: {
        Row: {
          client_id: string | null
          client_secret_encrypted: string | null
          created_at: string | null
          created_by: string | null
          id: string
          is_active: boolean | null
          metadata: Json | null
          provider_name: string
          provider_type: string
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          client_id?: string | null
          client_secret_encrypted?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          metadata?: Json | null
          provider_name: string
          provider_type: string
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          client_id?: string | null
          client_secret_encrypted?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          metadata?: Json | null
          provider_name?: string
          provider_type?: string
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      sso_tokens: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          revoked_at: string | null
          target_url: string
          token_hash: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          revoked_at?: string | null
          target_url: string
          token_hash: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          revoked_at?: string | null
          target_url?: string
          token_hash?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      strategic_initiatives: {
        Row: {
          announcement_date: string | null
          budget_allocated: string | null
          company_name: string
          created_at: string | null
          description: string
          expected_impact: string | null
          id: string
          key_milestones: Json | null
          priority: string | null
          role: string
          sector: string
          source_document: string
          source_url: string | null
          status: string
          target_date: string | null
          title: string
          updated_at: string | null
          year: number
        }
        Insert: {
          announcement_date?: string | null
          budget_allocated?: string | null
          company_name: string
          created_at?: string | null
          description: string
          expected_impact?: string | null
          id?: string
          key_milestones?: Json | null
          priority?: string | null
          role: string
          sector: string
          source_document: string
          source_url?: string | null
          status?: string
          target_date?: string | null
          title: string
          updated_at?: string | null
          year: number
        }
        Update: {
          announcement_date?: string | null
          budget_allocated?: string | null
          company_name?: string
          created_at?: string | null
          description?: string
          expected_impact?: string | null
          id?: string
          key_milestones?: Json | null
          priority?: string | null
          role?: string
          sector?: string
          source_document?: string
          source_url?: string | null
          status?: string
          target_date?: string | null
          title?: string
          updated_at?: string | null
          year?: number
        }
        Relationships: []
      }
      subscription_plans: {
        Row: {
          created_at: string
          currency: string
          description: string | null
          features: Json
          id: string
          is_active: boolean
          limits: Json
          name: string
          plan_type: string | null
          price_monthly: number | null
          price_per_request: number | null
          price_yearly: number | null
          stripe_price_id_monthly: string | null
          stripe_price_id_yearly: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency?: string
          description?: string | null
          features?: Json
          id?: string
          is_active?: boolean
          limits?: Json
          name: string
          plan_type?: string | null
          price_monthly?: number | null
          price_per_request?: number | null
          price_yearly?: number | null
          stripe_price_id_monthly?: string | null
          stripe_price_id_yearly?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency?: string
          description?: string | null
          features?: Json
          id?: string
          is_active?: boolean
          limits?: Json
          name?: string
          plan_type?: string | null
          price_monthly?: number | null
          price_per_request?: number | null
          price_yearly?: number | null
          stripe_price_id_monthly?: string | null
          stripe_price_id_yearly?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      subsidiary_operations: {
        Row: {
          company_name: string
          cost_per_unit: string
          created_at: string
          efficiency_percentage: number
          id: string
          metric_type: string
          metric_value: string
          region: string
          revenue: string
          status: string
          subsidiary_name: string
          updated_at: string
          year: number
        }
        Insert: {
          company_name: string
          cost_per_unit: string
          created_at?: string
          efficiency_percentage: number
          id?: string
          metric_type: string
          metric_value: string
          region: string
          revenue: string
          status: string
          subsidiary_name: string
          updated_at?: string
          year: number
        }
        Update: {
          company_name?: string
          cost_per_unit?: string
          created_at?: string
          efficiency_percentage?: number
          id?: string
          metric_type?: string
          metric_value?: string
          region?: string
          revenue?: string
          status?: string
          subsidiary_name?: string
          updated_at?: string
          year?: number
        }
        Relationships: []
      }
      support_ticket_comments: {
        Row: {
          attachments: Json | null
          comment: string
          created_at: string
          id: string
          is_internal: boolean
          ticket_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          attachments?: Json | null
          comment: string
          created_at?: string
          id?: string
          is_internal?: boolean
          ticket_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          attachments?: Json | null
          comment?: string
          created_at?: string
          id?: string
          is_internal?: boolean
          ticket_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_ticket_comments_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          assigned_to: string | null
          category: string
          created_at: string
          created_by: string
          description: string
          id: string
          metadata: Json | null
          priority: string
          requester_email: string | null
          resolved_at: string | null
          status: string
          tenant_id: string | null
          ticket_number: string
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          category?: string
          created_at?: string
          created_by: string
          description: string
          id?: string
          metadata?: Json | null
          priority?: string
          requester_email?: string | null
          resolved_at?: string | null
          status?: string
          tenant_id?: string | null
          ticket_number: string
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          category?: string
          created_at?: string
          created_by?: string
          description?: string
          id?: string
          metadata?: Json | null
          priority?: string
          requester_email?: string | null
          resolved_at?: string | null
          status?: string
          tenant_id?: string | null
          ticket_number?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "customer_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "support_tickets_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      system_configurations: {
        Row: {
          config_key: string
          config_value: Json
          created_at: string | null
          description: string | null
          id: string
          is_public: boolean | null
          updated_at: string | null
        }
        Insert: {
          config_key: string
          config_value: Json
          created_at?: string | null
          description?: string | null
          id?: string
          is_public?: boolean | null
          updated_at?: string | null
        }
        Update: {
          config_key?: string
          config_value?: Json
          created_at?: string | null
          description?: string | null
          id?: string
          is_public?: boolean | null
          updated_at?: string | null
        }
        Relationships: []
      }
      system_settings: {
        Row: {
          application_id: string
          category: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          setting_key: string
          setting_value: Json
          updated_at: string
        }
        Insert: {
          application_id: string
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          setting_key: string
          setting_value: Json
          updated_at?: string
        }
        Update: {
          application_id?: string
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          setting_key?: string
          setting_value?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "system_settings_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          actual_hours: number | null
          assignee_id: string | null
          company_id: string | null
          completed_at: string | null
          created_at: string | null
          created_by: string
          description: string | null
          due_date: string | null
          estimated_hours: number | null
          id: string
          priority: string | null
          project_id: string | null
          status: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          actual_hours?: number | null
          assignee_id?: string | null
          company_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          created_by: string
          description?: string | null
          due_date?: string | null
          estimated_hours?: number | null
          id?: string
          priority?: string | null
          project_id?: string | null
          status?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          actual_hours?: number | null
          assignee_id?: string | null
          company_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          created_by?: string
          description?: string | null
          due_date?: string | null
          estimated_hours?: number | null
          id?: string
          priority?: string | null
          project_id?: string | null
          status?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_assignee_id_fkey"
            columns: ["assignee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "tasks_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "business_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "customer_overview"
            referencedColumns: ["business_client_id"]
          },
          {
            foreignKeyName: "tasks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      technology_savings_config: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          saved_days: number
          source_technology: string
          target_technology: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          saved_days: number
          source_technology: string
          target_technology: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          saved_days?: number
          source_technology?: string
          target_technology?: string
          updated_at?: string
        }
        Relationships: []
      }
      template_usage_logs: {
        Row: {
          analysis_metadata: Json | null
          confidence_score: number | null
          created_at: string | null
          document_name: string | null
          fields_matched: number | null
          id: string
          template_id: string
          total_fields: number | null
          user_id: string
        }
        Insert: {
          analysis_metadata?: Json | null
          confidence_score?: number | null
          created_at?: string | null
          document_name?: string | null
          fields_matched?: number | null
          id?: string
          template_id: string
          total_fields?: number | null
          user_id: string
        }
        Update: {
          analysis_metadata?: Json | null
          confidence_score?: number | null
          created_at?: string | null
          document_name?: string | null
          fields_matched?: number | null
          id?: string
          template_id?: string
          total_fields?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "template_usage_logs_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "document_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      templates: {
        Row: {
          accuracy_score: number | null
          created_at: string
          description: string | null
          document_image: string | null
          document_type: string
          field_count: number
          fields: Json
          id: string
          is_public: boolean
          metadata: Json | null
          name: string
          status: string
          updated_at: string
          usage_count: number
          user_id: string
          version: string
        }
        Insert: {
          accuracy_score?: number | null
          created_at?: string
          description?: string | null
          document_image?: string | null
          document_type?: string
          field_count?: number
          fields?: Json
          id?: string
          is_public?: boolean
          metadata?: Json | null
          name: string
          status?: string
          updated_at?: string
          usage_count?: number
          user_id: string
          version?: string
        }
        Update: {
          accuracy_score?: number | null
          created_at?: string
          description?: string | null
          document_image?: string | null
          document_type?: string
          field_count?: number
          fields?: Json
          id?: string
          is_public?: boolean
          metadata?: Json | null
          name?: string
          status?: string
          updated_at?: string
          usage_count?: number
          user_id?: string
          version?: string
        }
        Relationships: []
      }
      tenant_analytics: {
        Row: {
          event_data: Json | null
          event_type: string
          id: string
          ip_address: unknown | null
          session_id: string | null
          tenant_id: string
          timestamp: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          event_data?: Json | null
          event_type: string
          id?: string
          ip_address?: unknown | null
          session_id?: string | null
          tenant_id: string
          timestamp?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          event_data?: Json | null
          event_type?: string
          id?: string
          ip_address?: unknown | null
          session_id?: string | null
          tenant_id?: string
          timestamp?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      tenant_api_keys: {
        Row: {
          api_key: string
          created_at: string
          created_by: string | null
          expires_at: string | null
          id: string
          is_active: boolean
          last_used_at: string | null
          name: string
          scopes: Json
          tenant_id: string
          updated_at: string
        }
        Insert: {
          api_key: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          last_used_at?: string | null
          name: string
          scopes?: Json
          tenant_id: string
          updated_at?: string
        }
        Update: {
          api_key?: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          last_used_at?: string | null
          name?: string
          scopes?: Json
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_api_keys_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "customer_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "tenant_api_keys_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_branding: {
        Row: {
          brand_colors: Json | null
          created_at: string | null
          custom_css: string | null
          custom_themes: Json | null
          email_templates: Json | null
          favicon_url: string | null
          id: string
          logo_dark_url: string | null
          logo_light_url: string | null
          tenant_id: string
          theme_mode: string | null
          typography: Json | null
          updated_at: string | null
        }
        Insert: {
          brand_colors?: Json | null
          created_at?: string | null
          custom_css?: string | null
          custom_themes?: Json | null
          email_templates?: Json | null
          favicon_url?: string | null
          id?: string
          logo_dark_url?: string | null
          logo_light_url?: string | null
          tenant_id: string
          theme_mode?: string | null
          typography?: Json | null
          updated_at?: string | null
        }
        Update: {
          brand_colors?: Json | null
          created_at?: string | null
          custom_css?: string | null
          custom_themes?: Json | null
          email_templates?: Json | null
          favicon_url?: string | null
          id?: string
          logo_dark_url?: string | null
          logo_light_url?: string | null
          tenant_id?: string
          theme_mode?: string | null
          typography?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenant_branding_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "customer_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "tenant_branding_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_connectors: {
        Row: {
          auth_config: Json
          authentication_method: string
          connector_type: string
          created_at: string
          data_source_url: string
          error_logs: Json | null
          field_mappings: Json
          id: string
          is_active: boolean
          last_sync_at: string | null
          name: string
          records_synced: number | null
          sync_schedule: Json
          sync_status: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          auth_config?: Json
          authentication_method?: string
          connector_type: string
          created_at?: string
          data_source_url: string
          error_logs?: Json | null
          field_mappings?: Json
          id?: string
          is_active?: boolean
          last_sync_at?: string | null
          name: string
          records_synced?: number | null
          sync_schedule?: Json
          sync_status?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          auth_config?: Json
          authentication_method?: string
          connector_type?: string
          created_at?: string
          data_source_url?: string
          error_logs?: Json | null
          field_mappings?: Json
          id?: string
          is_active?: boolean
          last_sync_at?: string | null
          name?: string
          records_synced?: number | null
          sync_schedule?: Json
          sync_status?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_connectors_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "customer_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "tenant_connectors_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_domains: {
        Row: {
          created_at: string | null
          dns_records: Json | null
          domain_name: string
          domain_type: string
          id: string
          is_primary: boolean | null
          is_verified: boolean | null
          ssl_enabled: boolean | null
          tenant_id: string
          verification_method: string | null
          verification_token: string | null
          verified_at: string | null
        }
        Insert: {
          created_at?: string | null
          dns_records?: Json | null
          domain_name: string
          domain_type: string
          id?: string
          is_primary?: boolean | null
          is_verified?: boolean | null
          ssl_enabled?: boolean | null
          tenant_id: string
          verification_method?: string | null
          verification_token?: string | null
          verified_at?: string | null
        }
        Update: {
          created_at?: string | null
          dns_records?: Json | null
          domain_name?: string
          domain_type?: string
          id?: string
          is_primary?: boolean | null
          is_verified?: boolean | null
          ssl_enabled?: boolean | null
          tenant_id?: string
          verification_method?: string | null
          verification_token?: string | null
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenant_domains_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "customer_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "tenant_domains_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_feature_overrides: {
        Row: {
          created_at: string | null
          enabled: boolean
          flag_name: string
          id: string
          tenant_id: string
          updated_at: string | null
          value: Json | null
        }
        Insert: {
          created_at?: string | null
          enabled: boolean
          flag_name: string
          id?: string
          tenant_id: string
          updated_at?: string | null
          value?: Json | null
        }
        Update: {
          created_at?: string | null
          enabled?: boolean
          flag_name?: string
          id?: string
          tenant_id?: string
          updated_at?: string | null
          value?: Json | null
        }
        Relationships: []
      }
      tenant_integrations: {
        Row: {
          configuration: Json
          created_at: string
          credentials: Json
          error_message: string | null
          id: string
          integration_name: string
          integration_type: string
          is_active: boolean
          last_sync_at: string | null
          sync_frequency: string | null
          sync_status: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          configuration?: Json
          created_at?: string
          credentials?: Json
          error_message?: string | null
          id?: string
          integration_name: string
          integration_type: string
          is_active?: boolean
          last_sync_at?: string | null
          sync_frequency?: string | null
          sync_status?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          configuration?: Json
          created_at?: string
          credentials?: Json
          error_message?: string | null
          id?: string
          integration_name?: string
          integration_type?: string
          is_active?: boolean
          last_sync_at?: string | null
          sync_frequency?: string | null
          sync_status?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_integrations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "customer_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "tenant_integrations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_metrics: {
        Row: {
          active_users: number | null
          api_calls_count: number | null
          created_at: string | null
          date: string
          feature_usage: Json | null
          id: string
          storage_used_bytes: number | null
          tenant_id: string
          transformations_count: number | null
          updated_at: string | null
        }
        Insert: {
          active_users?: number | null
          api_calls_count?: number | null
          created_at?: string | null
          date?: string
          feature_usage?: Json | null
          id?: string
          storage_used_bytes?: number | null
          tenant_id: string
          transformations_count?: number | null
          updated_at?: string | null
        }
        Update: {
          active_users?: number | null
          api_calls_count?: number | null
          created_at?: string | null
          date?: string
          feature_usage?: Json | null
          id?: string
          storage_used_bytes?: number | null
          tenant_id?: string
          transformations_count?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      tenant_module_configs: {
        Row: {
          created_at: string
          custom_config: Json | null
          custom_description: string | null
          custom_title: string | null
          id: string
          is_enabled: boolean
          module_id: string
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          custom_config?: Json | null
          custom_description?: string | null
          custom_title?: string | null
          id?: string
          is_enabled?: boolean
          module_id: string
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          custom_config?: Json | null
          custom_description?: string | null
          custom_title?: string | null
          id?: string
          is_enabled?: boolean
          module_id?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_module_configs_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "admin_modules"
            referencedColumns: ["module_id"]
          },
        ]
      }
      tenant_onboarding: {
        Row: {
          completed_at: string | null
          created_by: string
          current_step: number | null
          id: string
          onboarding_data: Json | null
          started_at: string | null
          steps_completed: Json | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          completed_at?: string | null
          created_by: string
          current_step?: number | null
          id?: string
          onboarding_data?: Json | null
          started_at?: string | null
          steps_completed?: Json | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          completed_at?: string | null
          created_by?: string
          current_step?: number | null
          id?: string
          onboarding_data?: Json | null
          started_at?: string | null
          steps_completed?: Json | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenant_onboarding_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "customer_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "tenant_onboarding_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_payment_methods: {
        Row: {
          card_brand: string | null
          card_exp_month: number | null
          card_exp_year: number | null
          card_last_four: string | null
          created_at: string
          id: string
          is_active: boolean
          is_default: boolean
          metadata: Json | null
          stripe_payment_method_id: string
          tenant_id: string
          type: string
          updated_at: string
        }
        Insert: {
          card_brand?: string | null
          card_exp_month?: number | null
          card_exp_year?: number | null
          card_last_four?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          metadata?: Json | null
          stripe_payment_method_id: string
          tenant_id: string
          type: string
          updated_at?: string
        }
        Update: {
          card_brand?: string | null
          card_exp_month?: number | null
          card_exp_year?: number | null
          card_last_four?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          metadata?: Json | null
          stripe_payment_method_id?: string
          tenant_id?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_payment_methods_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "customer_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "tenant_payment_methods_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_quotas: {
        Row: {
          created_at: string | null
          features_enabled: string[] | null
          id: string
          max_api_calls_per_month: number | null
          max_storage_bytes: number | null
          max_transformations_per_month: number | null
          max_users: number | null
          plan_tier: string
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          features_enabled?: string[] | null
          id?: string
          max_api_calls_per_month?: number | null
          max_storage_bytes?: number | null
          max_transformations_per_month?: number | null
          max_users?: number | null
          plan_tier?: string
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          features_enabled?: string[] | null
          id?: string
          max_api_calls_per_month?: number | null
          max_storage_bytes?: number | null
          max_transformations_per_month?: number | null
          max_users?: number | null
          plan_tier?: string
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      tenant_settings: {
        Row: {
          created_at: string | null
          currency: string | null
          custom_fields: Json | null
          date_format: string | null
          feature_flags: Json | null
          id: string
          integration_settings: Json | null
          language: string | null
          notification_settings: Json | null
          security_settings: Json | null
          tenant_id: string
          timezone: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          currency?: string | null
          custom_fields?: Json | null
          date_format?: string | null
          feature_flags?: Json | null
          id?: string
          integration_settings?: Json | null
          language?: string | null
          notification_settings?: Json | null
          security_settings?: Json | null
          tenant_id: string
          timezone?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          currency?: string | null
          custom_fields?: Json | null
          date_format?: string | null
          feature_flags?: Json | null
          id?: string
          integration_settings?: Json | null
          language?: string | null
          notification_settings?: Json | null
          security_settings?: Json | null
          tenant_id?: string
          timezone?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenant_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "customer_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "tenant_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_subscriptions: {
        Row: {
          billing_cycle: string
          canceled_at: string | null
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          metadata: Json | null
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_plan_id: string | null
          tenant_id: string
          trial_end: string | null
          trial_start: string | null
          updated_at: string
        }
        Insert: {
          billing_cycle?: string
          canceled_at?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          metadata?: Json | null
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_plan_id?: string | null
          tenant_id: string
          trial_end?: string | null
          trial_start?: string | null
          updated_at?: string
        }
        Update: {
          billing_cycle?: string
          canceled_at?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          metadata?: Json | null
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_plan_id?: string | null
          tenant_id?: string
          trial_end?: string | null
          trial_start?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_subscriptions_subscription_plan_id_fkey"
            columns: ["subscription_plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_subscriptions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "customer_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "tenant_subscriptions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_usage: {
        Row: {
          billing_period: string
          created_at: string
          feature_name: string
          id: string
          metadata: Json | null
          tenant_id: string
          unit_type: string
          updated_at: string
          usage_amount: number | null
          usage_count: number
        }
        Insert: {
          billing_period: string
          created_at?: string
          feature_name: string
          id?: string
          metadata?: Json | null
          tenant_id: string
          unit_type: string
          updated_at?: string
          usage_amount?: number | null
          usage_count?: number
        }
        Update: {
          billing_period?: string
          created_at?: string
          feature_name?: string
          id?: string
          metadata?: Json | null
          tenant_id?: string
          unit_type?: string
          updated_at?: string
          usage_amount?: number | null
          usage_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "tenant_usage_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "customer_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "tenant_usage_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_user_roles: {
        Row: {
          granted_at: string | null
          granted_by: string | null
          id: string
          is_active: boolean | null
          role: Database["public"]["Enums"]["tenant_role"]
          tenant_id: string
          user_id: string
        }
        Insert: {
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          is_active?: boolean | null
          role?: Database["public"]["Enums"]["tenant_role"]
          tenant_id: string
          user_id: string
        }
        Update: {
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          is_active?: boolean | null
          role?: Database["public"]["Enums"]["tenant_role"]
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_user_roles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "customer_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "tenant_user_roles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_webhooks: {
        Row: {
          created_at: string
          endpoint_url: string
          events: Json
          failure_count: number
          id: string
          is_active: boolean
          last_triggered_at: string | null
          name: string
          retry_attempts: number
          secret_key: string
          success_count: number
          tenant_id: string
          timeout_seconds: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          endpoint_url: string
          events?: Json
          failure_count?: number
          id?: string
          is_active?: boolean
          last_triggered_at?: string | null
          name: string
          retry_attempts?: number
          secret_key: string
          success_count?: number
          tenant_id: string
          timeout_seconds?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          endpoint_url?: string
          events?: Json
          failure_count?: number
          id?: string
          is_active?: boolean
          last_triggered_at?: string | null
          name?: string
          retry_attempts?: number
          secret_key?: string
          success_count?: number
          tenant_id?: string
          timeout_seconds?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_webhooks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "customer_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "tenant_webhooks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          accent_color: string | null
          billing_info: Json | null
          contact_info: Json | null
          created_at: string | null
          custom_css: string | null
          custom_domain: string | null
          customer_slug: string | null
          domain: string | null
          features: Json | null
          id: string
          is_active: boolean | null
          logo_url: string | null
          metadata: Json | null
          name: string
          onboarding_completed: boolean | null
          primary_color: string | null
          secondary_color: string | null
          settings: Json | null
          slug: string
          subdomain: string | null
          subscription_plan: string | null
          updated_at: string | null
        }
        Insert: {
          accent_color?: string | null
          billing_info?: Json | null
          contact_info?: Json | null
          created_at?: string | null
          custom_css?: string | null
          custom_domain?: string | null
          customer_slug?: string | null
          domain?: string | null
          features?: Json | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          metadata?: Json | null
          name: string
          onboarding_completed?: boolean | null
          primary_color?: string | null
          secondary_color?: string | null
          settings?: Json | null
          slug: string
          subdomain?: string | null
          subscription_plan?: string | null
          updated_at?: string | null
        }
        Update: {
          accent_color?: string | null
          billing_info?: Json | null
          contact_info?: Json | null
          created_at?: string | null
          custom_css?: string | null
          custom_domain?: string | null
          customer_slug?: string | null
          domain?: string | null
          features?: Json | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          metadata?: Json | null
          name?: string
          onboarding_completed?: boolean | null
          primary_color?: string | null
          secondary_color?: string | null
          settings?: Json | null
          slug?: string
          subdomain?: string | null
          subscription_plan?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      training_progress: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          last_accessed_at: string | null
          progress_percentage: number
          resource_id: string
          tenant_id: string
          time_spent: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          last_accessed_at?: string | null
          progress_percentage?: number
          resource_id: string
          tenant_id: string
          time_spent?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          last_accessed_at?: string | null
          progress_percentage?: number
          resource_id?: string
          tenant_id?: string
          time_spent?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_progress_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "training_resources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_progress_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "customer_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "training_progress_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      training_resources: {
        Row: {
          completion_count: number
          content_data: Json | null
          content_type: string
          content_url: string | null
          created_at: string
          created_by: string | null
          description: string | null
          difficulty_level: string
          estimated_duration: number | null
          id: string
          is_active: boolean
          is_required: boolean
          target_role: string | null
          tenant_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          completion_count?: number
          content_data?: Json | null
          content_type?: string
          content_url?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          difficulty_level?: string
          estimated_duration?: number | null
          id?: string
          is_active?: boolean
          is_required?: boolean
          target_role?: string | null
          tenant_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          completion_count?: number
          content_data?: Json | null
          content_type?: string
          content_url?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          difficulty_level?: string
          estimated_duration?: number | null
          id?: string
          is_active?: boolean
          is_required?: boolean
          target_role?: string | null
          tenant_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_resources_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "customer_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "training_resources_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      transformation_projects: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          source_type: string
          status: string
          target_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          source_type: string
          status?: string
          target_type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          source_type?: string
          status?: string
          target_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      transformation_results: {
        Row: {
          analysis_report: Json | null
          created_at: string
          files: Json
          id: string
          project_id: string
          source_code: string
          transformed_code: string
        }
        Insert: {
          analysis_report?: Json | null
          created_at?: string
          files?: Json
          id?: string
          project_id: string
          source_code: string
          transformed_code: string
        }
        Update: {
          analysis_report?: Json | null
          created_at?: string
          files?: Json
          id?: string
          project_id?: string
          source_code?: string
          transformed_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "transformation_results_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "transformation_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      usage_pricing: {
        Row: {
          created_at: string
          currency: string
          feature_name: string
          id: string
          is_active: boolean
          price_per_unit: number
          unit_name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency?: string
          feature_name: string
          id?: string
          is_active?: boolean
          price_per_unit: number
          unit_name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency?: string
          feature_name?: string
          id?: string
          is_active?: boolean
          price_per_unit?: number
          unit_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_behavior_analytics: {
        Row: {
          event_name: string
          event_properties: Json | null
          event_type: string
          id: string
          page_url: string | null
          session_id: string | null
          timestamp: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          event_name: string
          event_properties?: Json | null
          event_type: string
          id?: string
          page_url?: string | null
          session_id?: string | null
          timestamp?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          event_name?: string
          event_properties?: Json | null
          event_type?: string
          id?: string
          page_url?: string | null
          session_id?: string | null
          timestamp?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_behavior_analytics_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "project_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      user_invitations: {
        Row: {
          accepted_at: string | null
          created_at: string | null
          email: string
          expires_at: string
          id: string
          invitation_token: string
          invited_by: string
          role: Database["public"]["Enums"]["tenant_role"]
          status: string | null
          tenant_id: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string | null
          email: string
          expires_at: string
          id?: string
          invitation_token: string
          invited_by: string
          role?: Database["public"]["Enums"]["tenant_role"]
          status?: string | null
          tenant_id: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string | null
          email?: string
          expires_at?: string
          id?: string
          invitation_token?: string
          invited_by?: string
          role?: Database["public"]["Enums"]["tenant_role"]
          status?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_invitations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "customer_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "user_invitations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      user_preferences: {
        Row: {
          auto_save: boolean | null
          azure_openai_api_key: string | null
          contract_review_alerts: boolean | null
          created_at: string | null
          default_module: string | null
          document_processing_alerts: boolean | null
          document_retention: number | null
          email_notifications: boolean | null
          id: string
          language: string | null
          password_requirements: string | null
          preferences: Json | null
          session_timeout: number | null
          system_updates: boolean | null
          theme: string | null
          two_factor_enabled: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          auto_save?: boolean | null
          azure_openai_api_key?: string | null
          contract_review_alerts?: boolean | null
          created_at?: string | null
          default_module?: string | null
          document_processing_alerts?: boolean | null
          document_retention?: number | null
          email_notifications?: boolean | null
          id?: string
          language?: string | null
          password_requirements?: string | null
          preferences?: Json | null
          session_timeout?: number | null
          system_updates?: boolean | null
          theme?: string | null
          two_factor_enabled?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          auto_save?: boolean | null
          azure_openai_api_key?: string | null
          contract_review_alerts?: boolean | null
          created_at?: string | null
          default_module?: string | null
          document_processing_alerts?: boolean | null
          document_retention?: number | null
          email_notifications?: boolean | null
          id?: string
          language?: string | null
          password_requirements?: string | null
          preferences?: Json | null
          session_timeout?: number | null
          system_updates?: boolean | null
          theme?: string | null
          two_factor_enabled?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_pricing_preferences: {
        Row: {
          budget_range: Json | null
          communication_preferences: Json | null
          created_at: string
          id: string
          preferred_coverage_level: string | null
          priority_factors: Json | null
          risk_tolerance: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          budget_range?: Json | null
          communication_preferences?: Json | null
          created_at?: string
          id?: string
          preferred_coverage_level?: string | null
          priority_factors?: Json | null
          risk_tolerance?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          budget_range?: Json | null
          communication_preferences?: Json | null
          created_at?: string
          id?: string
          preferred_coverage_level?: string | null
          priority_factors?: Json | null
          risk_tolerance?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          created_at: string
          department: string | null
          email: string
          full_name: string
          id: string
          manager_id: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          department?: string | null
          email: string
          full_name: string
          id?: string
          manager_id?: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          department?: string | null
          email?: string
          full_name?: string
          id?: string
          manager_id?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_profiles_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_projects: {
        Row: {
          chat_history: Json
          created_at: string
          data: Json
          description: string | null
          id: string
          integrations: Json | null
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          chat_history?: Json
          created_at?: string
          data?: Json
          description?: string | null
          id?: string
          integrations?: Json | null
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          chat_history?: Json
          created_at?: string
          data?: Json
          description?: string | null
          id?: string
          integrations?: Json | null
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_provisioning_logs: {
        Row: {
          completed_at: string | null
          created_at: string | null
          errors: Json | null
          failed_records: number | null
          file_name: string | null
          id: string
          operation_type: string
          performed_by: string
          status: string | null
          successful_records: number | null
          tenant_id: string
          total_records: number | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          errors?: Json | null
          failed_records?: number | null
          file_name?: string | null
          id?: string
          operation_type: string
          performed_by: string
          status?: string | null
          successful_records?: number | null
          tenant_id: string
          total_records?: number | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          errors?: Json | null
          failed_records?: number | null
          file_name?: string | null
          id?: string
          operation_type?: string
          performed_by?: string
          status?: string | null
          successful_records?: number | null
          tenant_id?: string
          total_records?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "user_provisioning_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "customer_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "user_provisioning_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_search_settings: {
        Row: {
          created_at: string
          frameworks: string[]
          id: string
          languages: string[]
          repository_count: number
          star_options: string[]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          frameworks?: string[]
          id?: string
          languages?: string[]
          repository_count?: number
          star_options?: string[]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          frameworks?: string[]
          id?: string
          languages?: string[]
          repository_count?: number
          star_options?: string[]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_session_settings: {
        Row: {
          allow_multiple_devices: boolean
          created_at: string
          force_logout_on_new_device: boolean
          id: string
          max_concurrent_sessions: number
          notification_preferences: Json | null
          session_timeout_hours: number
          updated_at: string
          user_id: string
        }
        Insert: {
          allow_multiple_devices?: boolean
          created_at?: string
          force_logout_on_new_device?: boolean
          id?: string
          max_concurrent_sessions?: number
          notification_preferences?: Json | null
          session_timeout_hours?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          allow_multiple_devices?: boolean
          created_at?: string
          force_logout_on_new_device?: boolean
          id?: string
          max_concurrent_sessions?: number
          notification_preferences?: Json | null
          session_timeout_hours?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_sessions: {
        Row: {
          created_at: string
          id: string
          messages: Json
          name: string
          project_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          messages?: Json
          name: string
          project_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          messages?: Json
          name?: string
          project_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_sessions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "user_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      vendors: {
        Row: {
          address: string | null
          capabilities: Json | null
          contact_person: string | null
          created_at: string
          email: string
          historical_performance: Json | null
          id: string
          name: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          capabilities?: Json | null
          contact_person?: string | null
          created_at?: string
          email: string
          historical_performance?: Json | null
          id?: string
          name: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          capabilities?: Json | null
          contact_person?: string | null
          created_at?: string
          email?: string
          historical_performance?: Json | null
          id?: string
          name?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      wizard_data_snapshots: {
        Row: {
          complete_wizard_data: Json
          completion_percentage: number | null
          created_at: string
          id: string
          session_id: string
          step_number: number
          validation_status: Json | null
        }
        Insert: {
          complete_wizard_data: Json
          completion_percentage?: number | null
          created_at?: string
          id?: string
          session_id: string
          step_number: number
          validation_status?: Json | null
        }
        Update: {
          complete_wizard_data?: Json
          completion_percentage?: number | null
          created_at?: string
          id?: string
          session_id?: string
          step_number?: number
          validation_status?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "wizard_data_snapshots_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "project_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      wizard_step_interactions: {
        Row: {
          field_name: string
          field_type: string
          id: string
          interaction_type: string
          new_value: Json
          old_value: Json | null
          session_id: string
          step_name: string
          step_number: number
          timestamp: string
          user_session_data: Json | null
        }
        Insert: {
          field_name: string
          field_type: string
          id?: string
          interaction_type: string
          new_value: Json
          old_value?: Json | null
          session_id: string
          step_name: string
          step_number: number
          timestamp?: string
          user_session_data?: Json | null
        }
        Update: {
          field_name?: string
          field_type?: string
          id?: string
          interaction_type?: string
          new_value?: Json
          old_value?: Json | null
          session_id?: string
          step_name?: string
          step_number?: number
          timestamp?: string
          user_session_data?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "wizard_step_interactions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "project_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_documents: {
        Row: {
          assigned_legal_user: string | null
          content: string
          created_at: string
          created_by: string
          current_version: number
          document_type: Database["public"]["Enums"]["document_type"]
          file_url: string | null
          id: string
          metadata: Json | null
          status: Database["public"]["Enums"]["document_status"]
          template_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          assigned_legal_user?: string | null
          content: string
          created_at?: string
          created_by: string
          current_version?: number
          document_type: Database["public"]["Enums"]["document_type"]
          file_url?: string | null
          id?: string
          metadata?: Json | null
          status?: Database["public"]["Enums"]["document_status"]
          template_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          assigned_legal_user?: string | null
          content?: string
          created_at?: string
          created_by?: string
          current_version?: number
          document_type?: Database["public"]["Enums"]["document_type"]
          file_url?: string | null
          id?: string
          metadata?: Json | null
          status?: Database["public"]["Enums"]["document_status"]
          template_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_documents_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "document_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      working_hours_config: {
        Row: {
          created_at: string
          created_by: string
          hours_per_week: number
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          hours_per_week?: number
          id?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          hours_per_week?: number
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      customer_overview: {
        Row: {
          business_client_id: string | null
          business_name: string | null
          business_slug: string | null
          client_id: string | null
          client_location: string | null
          client_name: string | null
          client_revenue: string | null
          client_spoc: string | null
          client_spoc_email: string | null
          customer_slug: string | null
          customer_status: string | null
          overall_status: string | null
          subdomain: string | null
          tenant_active: boolean | null
          tenant_id: string | null
          tenant_name: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      binary_quantize: {
        Args: { "": string } | { "": unknown }
        Returns: unknown
      }
      check_repository_duplicate: {
        Args: { repo_url: string; repo_user_id: string }
        Returns: string
      }
      cleanup_expired_sessions: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      cleanup_expired_sso_tokens: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      cleanup_old_predictions: {
        Args: { days_old?: number }
        Returns: number
      }
      complete_tenant_onboarding: {
        Args: { tenant_uuid: string }
        Returns: boolean
      }
      create_anthropic_chat_function: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      detect_repository_changes: {
        Args: {
          new_contributors: number
          new_forks: number
          new_last_updated: string
          new_metadata: Json
          new_stars: number
          old_repo: Database["public"]["Tables"]["repositories"]["Row"]
        }
        Returns: Json
      }
      enforce_session_limits: {
        Args: { user_id_param: string }
        Returns: number
      }
      generate_api_key: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      generate_application_number: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      generate_client_slug: {
        Args: { client_name: string }
        Returns: string
      }
      generate_invitation_token: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      generate_invoice_number: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      generate_opportunity_number: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      generate_quote_number: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      generate_repository_hash: {
        Args: {
          repo_contributors: number
          repo_forks: number
          repo_last_updated: string
          repo_metadata: Json
          repo_stars: number
        }
        Returns: string
      }
      generate_subdomain: {
        Args: { company_name: string }
        Returns: string
      }
      generate_ticket_number: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      generate_webhook_secret: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_current_user_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_llm_config_for_use_case: {
        Args: { case_name: string }
        Returns: {
          api_endpoint: string
          assigned_areas: Json
          configuration: Json
          id: string
          max_tokens: number
          model_name: string
          name: string
          provider_type: string
          temperature: number
          use_cases: Json
        }[]
      }
      get_repositories_for_refresh: {
        Args: { batch_size?: number }
        Returns: {
          fetch_frequency_hours: number
          id: string
          last_fetched_at: string
          name: string
          url: string
          user_id: string
        }[]
      }
      get_user_role: {
        Args: { user_uuid: string }
        Returns: Database["public"]["Enums"]["user_role"]
      }
      get_user_tenant_role: {
        Args: { tenant_uuid: string; user_uuid: string }
        Returns: Database["public"]["Enums"]["tenant_role"]
      }
      halfvec_avg: {
        Args: { "": number[] }
        Returns: unknown
      }
      halfvec_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      halfvec_send: {
        Args: { "": unknown }
        Returns: string
      }
      halfvec_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_tenant_role: {
        Args: {
          required_role: Database["public"]["Enums"]["tenant_role"]
          tenant_uuid: string
          user_uuid: string
        }
        Returns: boolean
      }
      hnsw_bit_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnsw_halfvec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnsw_sparsevec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnswhandler: {
        Args: { "": unknown }
        Returns: unknown
      }
      increment_template_downloads: {
        Args: { template_id: string }
        Returns: undefined
      }
      increment_template_usage: {
        Args: { confidence_param?: number; template_id_param: string }
        Returns: undefined
      }
      ivfflat_bit_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      ivfflat_halfvec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      ivfflathandler: {
        Args: { "": unknown }
        Returns: unknown
      }
      l2_norm: {
        Args: { "": unknown } | { "": unknown }
        Returns: number
      }
      l2_normalize: {
        Args: { "": string } | { "": unknown } | { "": unknown }
        Returns: string
      }
      mark_predictions_stale: {
        Args: { days_old?: number }
        Returns: number
      }
      revoke_user_session: {
        Args: {
          reason_param?: string
          revoked_by_param: string
          session_id_param: string
        }
        Returns: boolean
      }
      search_documents_by_similarity: {
        Args: {
          match_count?: number
          match_threshold?: number
          query_embedding: string
          user_uuid: string
        }
        Returns: {
          chunk_id: string
          chunk_metadata: Json
          chunk_text: string
          document_id: string
          document_title: string
          file_name: string
          file_type: string
          similarity: number
          storage_url: string
        }[]
      }
      search_regulations_by_similarity: {
        Args: {
          match_count?: number
          match_threshold?: number
          query_embedding: string
        }
        Returns: {
          article_number: string
          chunk_id: string
          chunk_text: string
          regulation_id: string
          regulation_number: string
          regulation_title: string
          section_title: string
          similarity: number
        }[]
      }
      sparsevec_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      sparsevec_send: {
        Args: { "": unknown }
        Returns: string
      }
      sparsevec_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
      test_anthropic_call: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      validate_file_upload: {
        Args: {
          bucket_name: string
          file_name: string
          file_size: number
          mime_type: string
        }
        Returns: Json
      }
      validate_password_strength: {
        Args: { password: string }
        Returns: boolean
      }
      vector_avg: {
        Args: { "": number[] }
        Returns: string
      }
      vector_dims: {
        Args: { "": string } | { "": unknown }
        Returns: number
      }
      vector_norm: {
        Args: { "": string }
        Returns: number
      }
      vector_out: {
        Args: { "": string }
        Returns: unknown
      }
      vector_send: {
        Args: { "": string }
        Returns: string
      }
      vector_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
    }
    Enums: {
      app_role:
        | "program_manager"
        | "project_manager"
        | "employee"
        | "ai_engineer"
        | "architect"
        | "consultant"
        | "devops"
        | "fullstack_engineer"
        | "pmo"
        | "product_designer"
        | "product_manager"
        | "pmo_lead"
        | "admin"
        | "superadmin"
      application_role:
        | "application_admin"
        | "customer_admin"
        | "manager"
        | "employee"
        | "viewer"
      approval_status: "pending" | "approved" | "rejected" | "requires_changes"
      document_status:
        | "draft"
        | "pending_legal_review"
        | "legal_review_in_progress"
        | "pending_business_approval"
        | "pending_legal_manager_approval"
        | "pending_business_manager_approval"
        | "approved"
        | "rejected"
        | "requires_changes"
      document_type: "contract" | "mou" | "dou" | "nda" | "other"
      platform_role: "platform_admin" | "tenant_admin" | "tenant_user"
      tenant_role: "admin" | "manager" | "developer" | "viewer"
      user_role:
        | "business_user"
        | "business_manager"
        | "legal_user"
        | "legal_manager"
        | "superadmin"
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
      app_role: [
        "program_manager",
        "project_manager",
        "employee",
        "ai_engineer",
        "architect",
        "consultant",
        "devops",
        "fullstack_engineer",
        "pmo",
        "product_designer",
        "product_manager",
        "pmo_lead",
        "admin",
        "superadmin",
      ],
      application_role: [
        "application_admin",
        "customer_admin",
        "manager",
        "employee",
        "viewer",
      ],
      approval_status: ["pending", "approved", "rejected", "requires_changes"],
      document_status: [
        "draft",
        "pending_legal_review",
        "legal_review_in_progress",
        "pending_business_approval",
        "pending_legal_manager_approval",
        "pending_business_manager_approval",
        "approved",
        "rejected",
        "requires_changes",
      ],
      document_type: ["contract", "mou", "dou", "nda", "other"],
      platform_role: ["platform_admin", "tenant_admin", "tenant_user"],
      tenant_role: ["admin", "manager", "developer", "viewer"],
      user_role: [
        "business_user",
        "business_manager",
        "legal_user",
        "legal_manager",
        "superadmin",
      ],
    },
  },
} as const
