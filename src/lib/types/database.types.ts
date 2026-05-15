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
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          metadata: Json | null
          tenant_id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          metadata?: Json | null
          tenant_id: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          metadata?: Json | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_events: {
        Row: {
          all_day: boolean
          assigned_to: string | null
          created_at: string
          deleted_at: string | null
          end_at: string
          id: string
          lark_calendar_event_id: string | null
          location: string | null
          note: string | null
          related_customer_id: string | null
          related_opportunity_id: string | null
          start_at: string
          tenant_id: string
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          all_day?: boolean
          assigned_to?: string | null
          created_at?: string
          deleted_at?: string | null
          end_at: string
          id?: string
          lark_calendar_event_id?: string | null
          location?: string | null
          note?: string | null
          related_customer_id?: string | null
          related_opportunity_id?: string | null
          start_at: string
          tenant_id: string
          title: string
          type?: string
          updated_at?: string
        }
        Update: {
          all_day?: boolean
          assigned_to?: string | null
          created_at?: string
          deleted_at?: string | null
          end_at?: string
          id?: string
          lark_calendar_event_id?: string | null
          location?: string | null
          note?: string | null
          related_customer_id?: string | null
          related_opportunity_id?: string | null
          start_at?: string
          tenant_id?: string
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_events_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_related_customer_id_fkey"
            columns: ["related_customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_related_customer_id_fkey"
            columns: ["related_customer_id"]
            isOneToOne: false
            referencedRelation: "customers_with_age"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_related_opportunity_id_fkey"
            columns: ["related_opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_histories: {
        Row: {
          contacted_at: string
          content: string
          created_at: string
          customer_id: string
          id: string
          next_action: string | null
          next_action_date: string | null
          recorded_by: string
          tenant_id: string
          type: string
        }
        Insert: {
          contacted_at?: string
          content: string
          created_at?: string
          customer_id: string
          id?: string
          next_action?: string | null
          next_action_date?: string | null
          recorded_by: string
          tenant_id: string
          type: string
        }
        Update: {
          contacted_at?: string
          content?: string
          created_at?: string
          customer_id?: string
          id?: string
          next_action?: string | null
          next_action_date?: string | null
          recorded_by?: string
          tenant_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_histories_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_histories_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers_with_age"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_histories_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_histories_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_riders: {
        Row: {
          contract_id: string
          coverage: string | null
          created_at: string
          expiry_date: string | null
          id: string
          is_active: boolean
          name: string
          premium: number | null
          tenant_id: string
        }
        Insert: {
          contract_id: string
          coverage?: string | null
          created_at?: string
          expiry_date?: string | null
          id?: string
          is_active?: boolean
          name: string
          premium?: number | null
          tenant_id: string
        }
        Update: {
          contract_id?: string
          coverage?: string | null
          created_at?: string
          expiry_date?: string | null
          id?: string
          is_active?: boolean
          name?: string
          premium?: number | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contract_riders_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_riders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      contracts: {
        Row: {
          assigned_to: string | null
          created_at: string
          customer_id: string
          deleted_at: string | null
          expiry_date: string | null
          id: string
          insurance_company: string
          note: string | null
          policy_number: string
          premium: number
          product_category: string
          product_name: string
          renewal_status: string
          start_date: string
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          customer_id: string
          deleted_at?: string | null
          expiry_date?: string | null
          id?: string
          insurance_company: string
          note?: string | null
          policy_number: string
          premium?: number
          product_category: string
          product_name: string
          renewal_status?: string
          start_date: string
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          customer_id?: string
          deleted_at?: string | null
          expiry_date?: string | null
          id?: string
          insurance_company?: string
          note?: string | null
          policy_number?: string
          premium?: number
          product_category?: string
          product_name?: string
          renewal_status?: string
          start_date?: string
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contracts_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers_with_age"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          address: string | null
          assigned_to: string | null
          birth_date: string | null
          created_at: string
          deleted_at: string | null
          email: string | null
          gender: string | null
          id: string
          lark_contact_id: string | null
          name: string
          name_kana: string
          note: string | null
          phone: string | null
          postal_code: string | null
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          assigned_to?: string | null
          birth_date?: string | null
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          gender?: string | null
          id?: string
          lark_contact_id?: string | null
          name: string
          name_kana: string
          note?: string | null
          phone?: string | null
          postal_code?: string | null
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          assigned_to?: string | null
          birth_date?: string | null
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          gender?: string | null
          id?: string
          lark_contact_id?: string | null
          name?: string
          name_kana?: string
          note?: string | null
          phone?: string | null
          postal_code?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      document_carry_out_logs: {
        Row: {
          carried_out_at: string
          carried_out_by: string
          created_at: string
          created_by: string
          customer_id: string | null
          destination: string | null
          document_title: string
          document_type: string
          expected_return_at: string | null
          id: string
          loss_reported_at: string | null
          note: string | null
          purpose: string
          returned_at: string | null
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          carried_out_at?: string
          carried_out_by: string
          created_at?: string
          created_by: string
          customer_id?: string | null
          destination?: string | null
          document_title: string
          document_type: string
          expected_return_at?: string | null
          id?: string
          loss_reported_at?: string | null
          note?: string | null
          purpose: string
          returned_at?: string | null
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          carried_out_at?: string
          carried_out_by?: string
          created_at?: string
          created_by?: string
          customer_id?: string | null
          destination?: string | null
          document_title?: string
          document_type?: string
          expected_return_at?: string | null
          id?: string
          loss_reported_at?: string | null
          note?: string | null
          purpose?: string
          returned_at?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_carry_out_logs_carried_out_by_fkey"
            columns: ["carried_out_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_carry_out_logs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_carry_out_logs_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_carry_out_logs_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers_with_age"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_carry_out_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      family_members: {
        Row: {
          birth_date: string | null
          created_at: string
          customer_id: string
          gender: string | null
          id: string
          is_beneficiary: boolean
          is_insured: boolean
          name: string
          name_kana: string | null
          note: string | null
          relationship: string
          tenant_id: string
        }
        Insert: {
          birth_date?: string | null
          created_at?: string
          customer_id: string
          gender?: string | null
          id?: string
          is_beneficiary?: boolean
          is_insured?: boolean
          name: string
          name_kana?: string | null
          note?: string | null
          relationship: string
          tenant_id: string
        }
        Update: {
          birth_date?: string | null
          created_at?: string
          customer_id?: string
          gender?: string | null
          id?: string
          is_beneficiary?: boolean
          is_insured?: boolean
          name?: string
          name_kana?: string | null
          note?: string | null
          relationship?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "family_members_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "family_members_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers_with_age"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "family_members_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_situation_checks: {
        Row: {
          annual_income: string
          contract_id: string | null
          created_at: string
          customer_id: string
          employer_name: string | null
          id: string
          intention_record_id: string | null
          investment_experience: string
          investment_knowledge: string
          note: string | null
          recorded_at: string
          recorded_by: string
          source: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          annual_income: string
          contract_id?: string | null
          created_at?: string
          customer_id: string
          employer_name?: string | null
          id?: string
          intention_record_id?: string | null
          investment_experience: string
          investment_knowledge: string
          note?: string | null
          recorded_at?: string
          recorded_by: string
          source?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          annual_income?: string
          contract_id?: string | null
          created_at?: string
          customer_id?: string
          employer_name?: string | null
          id?: string
          intention_record_id?: string | null
          investment_experience?: string
          investment_knowledge?: string
          note?: string | null
          recorded_at?: string
          recorded_by?: string
          source?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_situation_checks_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_situation_checks_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_situation_checks_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers_with_age"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_situation_checks_intention_record_id_fkey"
            columns: ["intention_record_id"]
            isOneToOne: false
            referencedRelation: "intention_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_situation_checks_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_situation_checks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      intention_products: {
        Row: {
          created_at: string
          id: string
          insurance_company: string
          intention_record_id: string
          is_recommended: boolean
          premium: number | null
          product_category: string
          product_name: string
          recommendation_reason: string | null
          sort_order: number
          tenant_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          insurance_company: string
          intention_record_id: string
          is_recommended?: boolean
          premium?: number | null
          product_category: string
          product_name: string
          recommendation_reason?: string | null
          sort_order?: number
          tenant_id: string
        }
        Update: {
          created_at?: string
          id?: string
          insurance_company?: string
          intention_record_id?: string
          is_recommended?: boolean
          premium?: number | null
          product_category?: string
          product_name?: string
          recommendation_reason?: string | null
          sort_order?: number
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "intention_products_intention_record_id_fkey"
            columns: ["intention_record_id"]
            isOneToOne: false
            referencedRelation: "intention_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intention_products_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      intention_signature_requests: {
        Row: {
          created_at: string
          created_by: string
          expires_at: string
          id: string
          intention_record_id: string
          sent_at: string | null
          signed_at: string | null
          signer_email: string
          signer_name: string
          status: string
          tenant_id: string
          token_hash: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          expires_at: string
          id?: string
          intention_record_id: string
          sent_at?: string | null
          signed_at?: string | null
          signer_email: string
          signer_name: string
          status?: string
          tenant_id: string
          token_hash: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          expires_at?: string
          id?: string
          intention_record_id?: string
          sent_at?: string | null
          signed_at?: string | null
          signer_email?: string
          signer_name?: string
          status?: string
          tenant_id?: string
          token_hash?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "intention_signature_requests_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intention_signature_requests_intention_record_id_fkey"
            columns: ["intention_record_id"]
            isOneToOne: false
            referencedRelation: "intention_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intention_signature_requests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      intention_signature_evidences: {
        Row: {
          client_ip: string | null
          client_user_agent: string | null
          consent_text: string
          consent_version: string
          created_at: string
          created_by: string
          evidence_manifest: Json
          evidence_manifest_sha256: string
          id: string
          intention_record_id: string
          manifest_storage_path: string
          revision: number
          server_seal: string
          server_seal_algorithm: string
          server_seal_key_id: string
          signature_channel: string
          signature_mime_type: string
          signature_request_id: string | null
          signature_sha256: string
          signature_size_bytes: number
          signature_storage_path: string
          signed_at: string
          signer_email: string | null
          signer_name: string
          tenant_id: string
          trusted_timestamp_provider: string | null
          trusted_timestamp_token: string | null
          trusted_timestamped_at: string | null
        }
        Insert: {
          client_ip?: string | null
          client_user_agent?: string | null
          consent_text: string
          consent_version: string
          created_at?: string
          created_by: string
          evidence_manifest: Json
          evidence_manifest_sha256: string
          id?: string
          intention_record_id: string
          manifest_storage_path: string
          revision?: number
          server_seal: string
          server_seal_algorithm?: string
          server_seal_key_id?: string
          signature_channel?: string
          signature_mime_type?: string
          signature_request_id?: string | null
          signature_sha256: string
          signature_size_bytes: number
          signature_storage_path: string
          signed_at?: string
          signer_email?: string | null
          signer_name: string
          tenant_id: string
          trusted_timestamp_provider?: string | null
          trusted_timestamp_token?: string | null
          trusted_timestamped_at?: string | null
        }
        Update: {
          client_ip?: string | null
          client_user_agent?: string | null
          consent_text?: string
          consent_version?: string
          created_at?: string
          created_by?: string
          evidence_manifest?: Json
          evidence_manifest_sha256?: string
          id?: string
          intention_record_id?: string
          manifest_storage_path?: string
          revision?: number
          server_seal?: string
          server_seal_algorithm?: string
          server_seal_key_id?: string
          signature_channel?: string
          signature_mime_type?: string
          signature_request_id?: string | null
          signature_sha256?: string
          signature_size_bytes?: number
          signature_storage_path?: string
          signed_at?: string
          signer_email?: string | null
          signer_name?: string
          tenant_id?: string
          trusted_timestamp_provider?: string | null
          trusted_timestamp_token?: string | null
          trusted_timestamped_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "intention_signature_evidences_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intention_signature_evidences_intention_record_id_fkey"
            columns: ["intention_record_id"]
            isOneToOne: false
            referencedRelation: "intention_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intention_signature_evidences_signature_request_id_fkey"
            columns: ["signature_request_id"]
            isOneToOne: false
            referencedRelation: "intention_signature_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intention_signature_evidences_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      intention_records: {
        Row: {
          approved_at: string | null
          approver_id: string | null
          checklist: Json
          comparison_method: string | null
          comparison_reason: string | null
          contract_id: string | null
          created_at: string
          created_by: string
          customer_id: string
          final_intention: string | null
          final_recorded_at: string | null
          id: string
          initial_intention: string
          initial_recorded_at: string | null
          lark_approval_id: string | null
          rejection_reason: string | null
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approver_id?: string | null
          checklist?: Json
          comparison_method?: string | null
          comparison_reason?: string | null
          contract_id?: string | null
          created_at?: string
          created_by: string
          customer_id: string
          final_intention?: string | null
          final_recorded_at?: string | null
          id?: string
          initial_intention: string
          initial_recorded_at?: string | null
          lark_approval_id?: string | null
          rejection_reason?: string | null
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approver_id?: string | null
          checklist?: Json
          comparison_method?: string | null
          comparison_reason?: string | null
          contract_id?: string | null
          created_at?: string
          created_by?: string
          customer_id?: string
          final_intention?: string | null
          final_recorded_at?: string | null
          id?: string
          initial_intention?: string
          initial_recorded_at?: string | null
          lark_approval_id?: string | null
          rejection_reason?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "intention_records_approver_id_fkey"
            columns: ["approver_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intention_records_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intention_records_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intention_records_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intention_records_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers_with_age"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intention_records_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_record_templates: {
        Row: {
          content: string
          created_at: string
          created_by: string
          id: string
          is_active: boolean
          next_action: string | null
          sort_order: number
          tenant_id: string
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          created_by: string
          id?: string
          is_active?: boolean
          next_action?: string | null
          sort_order?: number
          tenant_id: string
          title: string
          type: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string
          id?: string
          is_active?: boolean
          next_action?: string | null
          sort_order?: number
          tenant_id?: string
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_record_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_record_templates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      mdrt_performances: {
        Row: {
          created_at: string
          id: string
          insurance_company: string
          performance_value: number
          tenant_id: string
          updated_at: string
          user_id: string
          year: number
        }
        Insert: {
          created_at?: string
          id?: string
          insurance_company?: string
          performance_value?: number
          tenant_id: string
          updated_at?: string
          user_id: string
          year: number
        }
        Update: {
          created_at?: string
          id?: string
          insurance_company?: string
          performance_value?: number
          tenant_id?: string
          updated_at?: string
          user_id?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "mdrt_performances_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mdrt_performances_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      mdrt_targets: {
        Row: {
          cot_target: number
          id: string
          mdrt_target: number
          tenant_id: string
          tot_target: number
          year: number
        }
        Insert: {
          cot_target?: number
          id?: string
          mdrt_target?: number
          tenant_id: string
          tot_target?: number
          year: number
        }
        Update: {
          cot_target?: number
          id?: string
          mdrt_target?: number
          tenant_id?: string
          tot_target?: number
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "mdrt_targets_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_logs: {
        Row: {
          channel: string
          created_at: string
          id: string
          last_attempted_at: string | null
          last_error: string | null
          payload: Json
          retry_count: number
          scheduled_at: string
          sent_at: string | null
          status: string
          target_type: string
          target_value: string
          template_key: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          channel: string
          created_at?: string
          id?: string
          last_attempted_at?: string | null
          last_error?: string | null
          payload?: Json
          retry_count?: number
          scheduled_at?: string
          sent_at?: string | null
          status?: string
          target_type: string
          target_value: string
          template_key: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          channel?: string
          created_at?: string
          id?: string
          last_attempted_at?: string | null
          last_error?: string | null
          payload?: Json
          retry_count?: number
          scheduled_at?: string
          sent_at?: string | null
          status?: string
          target_type?: string
          target_value?: string
          template_key?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      opportunities: {
        Row: {
          assigned_to: string | null
          created_at: string
          customer_id: string
          deleted_at: string | null
          estimated_premium: number | null
          expected_close_date: string | null
          id: string
          lost_reason: string | null
          note: string | null
          stage: string
          tenant_id: string
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          customer_id: string
          deleted_at?: string | null
          estimated_premium?: number | null
          expected_close_date?: string | null
          id?: string
          lost_reason?: string | null
          note?: string | null
          stage?: string
          tenant_id: string
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          customer_id?: string
          deleted_at?: string | null
          estimated_premium?: number | null
          expected_close_date?: string | null
          id?: string
          lost_reason?: string | null
          note?: string | null
          stage?: string
          tenant_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "opportunities_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunities_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunities_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers_with_age"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunities_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      opportunity_activities: {
        Row: {
          activity_date: string
          content: string
          created_at: string
          id: string
          opportunity_id: string
          recorded_by: string
          tenant_id: string
          type: string
        }
        Insert: {
          activity_date?: string
          content: string
          created_at?: string
          id?: string
          opportunity_id: string
          recorded_by: string
          tenant_id: string
          type: string
        }
        Update: {
          activity_date?: string
          content?: string
          created_at?: string
          id?: string
          opportunity_id?: string
          recorded_by?: string
          tenant_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "opportunity_activities_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunity_activities_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunity_activities_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      opportunity_suitability: {
        Row: {
          age_confirmed: boolean
          comparison_done: boolean
          consent_obtained: boolean
          existing_confirmed: boolean
          family_confirmed: boolean
          id: string
          income_confirmed: boolean
          need_confirmed: boolean
          opportunity_id: string
          premium_confirmed: boolean
          product_explained: boolean
          recorded_at: string
          recorded_by: string
          tenant_id: string
        }
        Insert: {
          age_confirmed?: boolean
          comparison_done?: boolean
          consent_obtained?: boolean
          existing_confirmed?: boolean
          family_confirmed?: boolean
          id?: string
          income_confirmed?: boolean
          need_confirmed?: boolean
          opportunity_id: string
          premium_confirmed?: boolean
          product_explained?: boolean
          recorded_at?: string
          recorded_by: string
          tenant_id: string
        }
        Update: {
          age_confirmed?: boolean
          comparison_done?: boolean
          consent_obtained?: boolean
          existing_confirmed?: boolean
          family_confirmed?: boolean
          id?: string
          income_confirmed?: boolean
          need_confirmed?: boolean
          opportunity_id?: string
          premium_confirmed?: boolean
          product_explained?: boolean
          recorded_at?: string
          recorded_by?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "opportunity_suitability_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: true
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunity_suitability_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunity_suitability_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      settlement_imports: {
        Row: {
          file_name: string
          id: string
          imported_at: string
          imported_by: string
          insurance_company: string
          matched_rows: number
          raw_payload: Json | null
          settlement_month: string
          tenant_id: string
          total_rows: number
          unmatched_rows: number
        }
        Insert: {
          file_name: string
          id?: string
          imported_at?: string
          imported_by: string
          insurance_company: string
          matched_rows?: number
          raw_payload?: Json | null
          settlement_month: string
          tenant_id: string
          total_rows?: number
          unmatched_rows?: number
        }
        Update: {
          file_name?: string
          id?: string
          imported_at?: string
          imported_by?: string
          insurance_company?: string
          matched_rows?: number
          raw_payload?: Json | null
          settlement_month?: string
          tenant_id?: string
          total_rows?: number
          unmatched_rows?: number
        }
        Relationships: [
          {
            foreignKeyName: "settlement_imports_imported_by_fkey"
            columns: ["imported_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "settlement_imports_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      settlements: {
        Row: {
          contract_id: string | null
          created_at: string
          customer_name: string
          fee_amount: number
          fee_rate: number | null
          id: string
          insurance_company: string
          invoice_amount: number
          note: string | null
          payment_amount: number
          settlement_month: string
          source_import_id: string | null
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          contract_id?: string | null
          created_at?: string
          customer_name: string
          fee_amount?: number
          fee_rate?: number | null
          id?: string
          insurance_company: string
          invoice_amount?: number
          note?: string | null
          payment_amount?: number
          settlement_month: string
          source_import_id?: string | null
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          contract_id?: string | null
          created_at?: string
          customer_name?: string
          fee_amount?: number
          fee_rate?: number | null
          id?: string
          insurance_company?: string
          invoice_amount?: number
          note?: string | null
          payment_amount?: number
          settlement_month?: string
          source_import_id?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_settlements_source_import"
            columns: ["source_import_id"]
            isOneToOne: false
            referencedRelation: "settlement_imports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "settlements_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "settlements_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          code: string
          created_at: string
          id: string
          name: string
          plan: string
          settings: Json
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          name: string
          plan?: string
          settings?: Json
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          name?: string
          plan?: string
          settings?: Json
          updated_at?: string
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          department: string | null
          email: string
          id: string
          is_active: boolean
          lark_open_id: string | null
          lark_union_id: string | null
          lark_user_id: string | null
          name: string
          name_kana: string | null
          role: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          department?: string | null
          email: string
          id: string
          is_active?: boolean
          lark_open_id?: string | null
          lark_union_id?: string | null
          lark_user_id?: string | null
          name: string
          name_kana?: string | null
          role?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          department?: string | null
          email?: string
          id?: string
          is_active?: boolean
          lark_open_id?: string | null
          lark_union_id?: string | null
          lark_user_id?: string | null
          name?: string
          name_kana?: string | null
          role?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      customers_with_age: {
        Row: {
          address: string | null
          age: number | null
          assigned_to: string | null
          birth_date: string | null
          created_at: string | null
          deleted_at: string | null
          email: string | null
          gender: string | null
          id: string | null
          is_elderly: boolean | null
          lark_contact_id: string | null
          name: string | null
          name_kana: string | null
          note: string | null
          phone: string | null
          postal_code: string | null
          status: string | null
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          age?: never
          assigned_to?: string | null
          birth_date?: string | null
          created_at?: string | null
          deleted_at?: string | null
          email?: string | null
          gender?: string | null
          id?: string | null
          is_elderly?: never
          lark_contact_id?: string | null
          name?: string | null
          name_kana?: string | null
          note?: string | null
          phone?: string | null
          postal_code?: string | null
          status?: string | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          age?: never
          assigned_to?: string | null
          birth_date?: string | null
          created_at?: string | null
          deleted_at?: string | null
          email?: string | null
          gender?: string | null
          id?: string | null
          is_elderly?: never
          lark_contact_id?: string | null
          name?: string | null
          name_kana?: string | null
          note?: string | null
          phone?: string | null
          postal_code?: string | null
          status?: string | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customers_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      current_tenant_access_scope: { Args: never; Returns: string }
      current_user_role: { Args: never; Returns: string }
      current_user_tenant_id: { Args: never; Returns: string }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
