// src/types/index.ts
export interface BlogPost {
  id: string;
  title: string;
  summary: string;
  content: string; // 暂时存 Markdown 文本
  date: string;
  tags: string[];
  is_pinned?: boolean;
  is_login_required?: boolean;
}

export interface BlogComment {
  id?: string | number;
  article_id: string;
  author: string;
  content: string;
  date: string;
}

export interface BlogMoment {
  id: number;
  author: string;
  content: string;
  images: string[];
  created_at?: string | null;
  updated_at?: string | null;
}

export interface CreateMomentPayload {
  author?: string;
  content?: string;
  images?: string[];
}

export type FriendLinkStatus = "pending" | "approved" | "rejected";

export interface FriendLinkApplication {
  id: number;
  site_name: string;
  site_url: string;
  description: string;
  avatar_url: string;
  status: FriendLinkStatus;
  review_note?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  reviewed_at?: string | null;
}

export interface FriendLinkApplicationPayload {
  site_name: string;
  site_url: string;
  description: string;
  avatar_url: string;
}

export interface BlogChat {
  role: string;
  content: string;
}

export interface BlogLogin {
  role: string;
  content: string;
}
