// src/data/posts.ts
import type { BlogPost } from '../types';

export const initialPosts: BlogPost[] = [
  {
    id: '2',
    title: '为什么我选择 Rust 进行系统编程',
    summary: 'Rust 的内存安全机制和所有权系统解决了 C++ 长期以来的痛点...',
    content: '这里是旧的内容...',
    date: '2026-02-05',
    tags: ['Rust', 'Systems']
  }
];

// 2. 从 LocalStorage 加载数据 (如果之前存过的话)
const loadPosts = (): BlogPost[] => {
  const saved = localStorage.getItem('my_blog_posts');
  if (saved) {
    return JSON.parse(saved);
  }
  return initialPosts;
};

// 3. 在内存中维护一份数据
let currentPosts = loadPosts();

// 4. 导出工具函数 (API)

// 获取所有文章
export const getPosts = () => {
  // 每次读取都重新从 localStorage 拿一下，保证是最新的
  return loadPosts();
};

// 获取单篇文章
export const getPostById = (id: string) => {
  return currentPosts.find(p => p.id === id);
};

// ✨ 添加文章 (核心功能)
export const addPost = (post: BlogPost) => {
  // 把新文章加到最前面
  currentPosts = [post, ...currentPosts];
  // 保存到浏览器缓存
  localStorage.setItem('my_blog_posts', JSON.stringify(currentPosts));
};

// ✨ 新增：删除文章
export const deletePost = (id: string) => {
  // 1. 过滤掉要删除的那个 ID
  currentPosts = currentPosts.filter(post => post.id !== id);

  // 2. 更新 LocalStorage
  localStorage.setItem('my_blog_posts', JSON.stringify(currentPosts));
};

// ✨ 新增：更新文章
export const updatePost = (updatedPost: BlogPost) => {
  // 1. 找到该文章在数组中的索引
  const index = currentPosts.findIndex(p => p.id === updatedPost.id);

  if (index !== -1) {
    // 2. 替换旧数据
    currentPosts[index] = updatedPost;
    // 3. 保存到 LocalStorage
    localStorage.setItem('my_blog_posts', JSON.stringify(currentPosts));
  }
};
