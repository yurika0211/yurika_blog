// src/types/index.ts
export interface BlogPost {
  id: string;
  title: string;
  summary: string;
  content: string; // 暂时存 Markdown 文本
  date: string;
  tags: string[];
  is_pinned?: boolean;
}

export interface BlogComment {
  id?: string | number;
  article_id: string;
  author: string;
  content: string;
  date: string;
}

export interface BlogChat {
  role: string;
  content: string;
}

export interface BlogLogin {
  role: string;
  content: string;
}
