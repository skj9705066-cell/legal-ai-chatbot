/**
 * Supabase Database type definitions.
 * Mirrors the schema in /supabase/schema.sql.
 * Update both files together when the schema changes.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type ProfileRole = "user" | "lawyer" | "admin";
export type LawyerDBStatus = "pending" | "approved" | "rejected";
export type MatchingDBStatus = "matching" | "matched" | "cancelled";

export interface ProfileRow {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  role: ProfileRole;
  created_at: string;
}

export interface LawyerRow {
  id: string;
  user_id: string | null;
  name: string;
  firm: string | null;
  specialty: string[];
  experience_years: number | null;
  rating: number;
  review_count: number;
  bar_number: string | null;
  status: LawyerDBStatus;
  reject_reason: string | null;
  bio: string | null;
  one_liner: string | null;
  consultation_methods: string[] | null;
  base_fee_manwon: number | null;
  created_at: string;
}

export interface ConsultationRow {
  id: string;
  user_id: string | null;
  category: string | null;
  title: string | null;
  messages: Json;
  analysis_complete: boolean;
  analysis_summary: Json | null;
  created_at: string;
  updated_at: string;
}

export interface MatchingRow {
  id: string;
  consultation_id: string | null;
  user_id: string | null;
  status: MatchingDBStatus;
  case_summary: Json | null;
  fee_min: number;
  fee_max: number;
  consultation_method: string;
  created_at: string;
}

export interface ChatRoomRow {
  id: string;
  matching_id: string | null;
  user_id: string;
  lawyer_user_id: string;
  lawyer_id: string;
  created_at: string;
  last_message_at: string;
}

export interface MessageRow {
  id: string;
  room_id: string;
  sender_id: string;
  content: string;
  file_name: string | null;
  file_data: string | null;
  file_type: string | null;
  file_size: number | null;
  is_read: boolean;
  created_at: string;
}

export interface ProposalRow {
  id: string;
  matching_id: string | null;
  lawyer_id: string | null;
  fee: string | null;
  message: string | null;
  selected: boolean;
  created_at: string;
}

// Insert shapes — required fields only; everything else optional/server-defaulted.
export interface ProfileInsert {
  id: string;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  role?: ProfileRole;
  created_at?: string;
}

export interface LawyerInsert {
  id?: string;
  user_id?: string | null;
  name: string;
  firm?: string | null;
  specialty?: string[];
  experience_years?: number | null;
  rating?: number;
  review_count?: number;
  bar_number?: string | null;
  status?: LawyerDBStatus;
  reject_reason?: string | null;
  bio?: string | null;
  created_at?: string;
}

export interface ConsultationInsert {
  id?: string;
  user_id?: string | null;
  category?: string | null;
  title?: string | null;
  messages?: Json;
  analysis_complete?: boolean;
  analysis_summary?: Json | null;
  created_at?: string;
  updated_at?: string;
}

export interface MatchingInsert {
  id?: string;
  consultation_id?: string | null;
  user_id?: string | null;
  status?: MatchingDBStatus;
  case_summary?: Json | null;
  fee_min?: number;
  fee_max?: number;
  consultation_method?: string;
  created_at?: string;
}

export interface ChatRoomInsert {
  id?: string;
  matching_id?: string | null;
  user_id: string;
  lawyer_user_id: string;
  lawyer_id: string;
  created_at?: string;
  last_message_at?: string;
}

export interface MessageInsert {
  id?: string;
  room_id: string;
  sender_id: string;
  content: string;
  file_name?: string | null;
  file_data?: string | null;
  file_type?: string | null;
  file_size?: number | null;
  is_read?: boolean;
  created_at?: string;
}

export interface ProposalInsert {
  id?: string;
  matching_id?: string | null;
  lawyer_id?: string | null;
  fee?: string | null;
  message?: string | null;
  selected?: boolean;
  created_at?: string;
}

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: ProfileRow;
        Insert: ProfileInsert;
        Update: Partial<ProfileRow>;
        Relationships: [];
      };
      lawyers: {
        Row: LawyerRow;
        Insert: LawyerInsert;
        Update: Partial<LawyerRow>;
        Relationships: [];
      };
      consultations: {
        Row: ConsultationRow;
        Insert: ConsultationInsert;
        Update: Partial<ConsultationRow>;
        Relationships: [];
      };
      matchings: {
        Row: MatchingRow;
        Insert: MatchingInsert;
        Update: Partial<MatchingRow>;
        Relationships: [];
      };
      proposals: {
        Row: ProposalRow;
        Insert: ProposalInsert;
        Update: Partial<ProposalRow>;
        Relationships: [];
      };
      chat_rooms: {
        Row: ChatRoomRow;
        Insert: ChatRoomInsert;
        Update: Partial<ChatRoomRow>;
        Relationships: [];
      };
      messages: {
        Row: MessageRow;
        Insert: MessageInsert;
        Update: Partial<MessageRow>;
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};
