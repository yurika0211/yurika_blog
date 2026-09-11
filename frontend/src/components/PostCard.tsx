import { Calendar, Tag, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { BlogPost } from '../types';
import { formatDate } from '../utils/date';

interface PostCardProps {
 post: BlogPost;
}

    // ... imports
 export default function PostCard({ post }: PostCardProps) {
 return (
        // 增加 , dark:border-[color:var(--hair)]
        <article className="bg-[color:var(--paper)] p-6 rounded-[0.14rem] border border-[color:var(--hair)] dark:border-[color:var(--hair)] hover: transition-all">
          <div className="flex items-center gap-2 text-sm text-[color:var(--ink-soft)] dark:text-[color:var(--ink-soft)] mb-3">
            <Calendar className="w-4 h-4" />
            <time dateTime={post.date}>{formatDate(post.date)}</time>
          </div>
    
          {/* 标题  */}
          <h2 className="text-2xl font-bold text-[color:var(--ink)] mb-3 hover:text-[color:var(--seal)] dark:hover:text-[color:var(--seal)]">
            <Link to={`/post/${post.id}`}>
              {post.title}
            </Link>
          </h2>
    
          <p className="text-[color:var(--ink)] mb-4 leading-relaxed">
            {post.summary}
          </p>
    
          <div className="flex items-center justify-between mt-4">
            <div className="flex gap-2">
              {post.tags.map(tag => (
                // 标签 dark:text-[color:var(--seal)]
                <span key={tag} className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[color:var(--seal)] text-[color:var(--seal)] dark:text-[color:var(--seal)]">
                  <Tag className="w-3 h-3" />
                  {tag}
                </span>
              ))}
            </div>
            {/* ... 阅读更多链接保持默认颜色即可，或者改为 blue-400 */}
            <Link 
 to={`/post/${post.id}`}
 className="inline-flex items-center text-sm font-semibold text-[color:var(--seal)] dark:text-[color:var(--seal)] hover:text-[color:var(--seal)] dark:hover:text-[color:var(--seal)] transition-colors"
            >
              Read more <ArrowRight className="w-4 h-4 ml-1" />
            </Link>
          </div>
        </article>
      );
    }
