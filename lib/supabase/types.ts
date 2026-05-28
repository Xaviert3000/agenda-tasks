export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          name: string;
          avatar_url: string | null;
          is_online: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          name: string;
          avatar_url?: string | null;
          is_online?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          avatar_url?: string | null;
          is_online?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
      workspaces: {
        Row: {
          id: string;
          name: string;
          slug: string;
          plan: "free" | "pro";
          stripe_customer_id: string | null;
          stripe_subscription_id: string | null;
          subscription_status: "active" | "inactive" | "past_due" | "cancelled";
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          plan?: "free" | "pro";
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          subscription_status?: "active" | "inactive" | "past_due" | "cancelled";
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          plan?: "free" | "pro";
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          subscription_status?: "active" | "inactive" | "past_due" | "cancelled";
          updated_at?: string;
        };
        Relationships: [];
      };
      workspace_members: {
        Row: {
          workspace_id: string;
          user_id: string;
          role: Database["public"]["Enums"]["workspace_role"];
          joined_at: string;
        };
        Insert: {
          workspace_id: string;
          user_id: string;
          role?: Database["public"]["Enums"]["workspace_role"];
          joined_at?: string;
        };
        Update: {
          role?: Database["public"]["Enums"]["workspace_role"];
        };
        Relationships: [];
      };
      projects: {
        Row: {
          id: string;
          workspace_id: string;
          name: string;
          icon: string;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          name: string;
          icon?: string;
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          icon?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      project_members: {
        Row: {
          project_id: string;
          user_id: string;
          role: Database["public"]["Enums"]["project_role"];
          joined_at: string;
        };
        Insert: {
          project_id: string;
          user_id: string;
          role?: Database["public"]["Enums"]["project_role"];
          joined_at?: string;
        };
        Update: {
          role?: Database["public"]["Enums"]["project_role"];
        };
        Relationships: [];
      };
      labels: {
        Row: {
          id: string;
          workspace_id: string;
          name: string;
          light_color: string;
          solid_color: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          name: string;
          light_color: string;
          solid_color: string;
          created_at?: string;
        };
        Update: {
          name?: string;
          light_color?: string;
          solid_color?: string;
        };
        Relationships: [];
      };
      folders: {
        Row: {
          id: string;
          project_id: string;
          name: string;
          position: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          name: string;
          position?: number;
          created_at?: string;
        };
        Update: {
          name?: string;
          position?: number;
        };
        Relationships: [];
      };
      kanban_lists: {
        Row: {
          id: string;
          project_id: string;
          folder_id: string | null;
          name: string;
          color: string;
          wip_limit: number | null;
          position: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          folder_id?: string | null;
          name: string;
          color?: string;
          wip_limit?: number | null;
          position?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          folder_id?: string | null;
          name?: string;
          color?: string;
          wip_limit?: number | null;
          position?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      tasks: {
        Row: {
          id: string;
          list_id: string;
          title: string;
          description: string | null;
          priority: Database["public"]["Enums"]["priority"];
          due_date: string | null;
          is_completed: boolean;
          attachment_count: number;
          comment_count: number;
          position: number;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          list_id: string;
          title: string;
          description?: string | null;
          priority?: Database["public"]["Enums"]["priority"];
          due_date?: string | null;
          is_completed?: boolean;
          attachment_count?: number;
          comment_count?: number;
          position?: number;
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          list_id?: string;
          title?: string;
          description?: string | null;
          priority?: Database["public"]["Enums"]["priority"];
          due_date?: string | null;
          is_completed?: boolean;
          attachment_count?: number;
          comment_count?: number;
          position?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      task_assignees: {
        Row: {
          task_id: string;
          user_id: string;
          assigned_at: string;
        };
        Insert: {
          task_id: string;
          user_id: string;
          assigned_at?: string;
        };
        Update: {
          assigned_at?: string;
        };
        Relationships: [];
      };
      task_labels: {
        Row: {
          task_id: string;
          label_id: string;
        };
        Insert: {
          task_id: string;
          label_id: string;
        };
        Update: {
          task_id?: string;
          label_id?: string;
        };
        Relationships: [];
      };
      subtasks: {
        Row: {
          id: string;
          task_id: string;
          title: string;
          is_completed: boolean;
          position: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          task_id: string;
          title: string;
          is_completed?: boolean;
          position?: number;
          created_at?: string;
        };
        Update: {
          title?: string;
          is_completed?: boolean;
          position?: number;
        };
        Relationships: [];
      };
      documents: {
        Row: {
          id: string;
          workspace_id: string;
          project_id: string | null;
          title: string;
          content: Json | null;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          project_id?: string | null;
          title?: string;
          content?: Json | null;
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          project_id?: string | null;
          title?: string;
          content?: Json | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      messages: {
        Row: {
          id: string;
          workspace_id: string;
          sender_id: string;
          recipient_id: string;
          content: string;
          read_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          sender_id: string;
          recipient_id: string;
          content: string;
          read_at?: string | null;
          created_at?: string;
        };
        Update: {
          read_at?: string | null;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      priority: "low" | "med" | "high" | "urgent";
      workspace_role: "owner" | "admin" | "member";
      project_role: "owner" | "admin" | "member";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];

export type TablesInsert<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];

export type TablesUpdate<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];

export type Enums<T extends keyof Database["public"]["Enums"]> =
  Database["public"]["Enums"][T];
