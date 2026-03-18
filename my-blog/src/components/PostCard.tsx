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
        // 增加 dark:bg-gray-900, dark:border-gray-800
        <article className="bg-white/50 dark:bg-gray-900/50 p-6 rounded-lg shadow-sm border border-gray-100 dark:border-gray-800 hover:shadow-md transition-all">
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-3">
            <Calendar className="w-4 h-4" />
            <time dateTime={post.date}>{formatDate(post.date)}</time>
          </div>
    
          {/* 标题 dark:text-gray-100 */}
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-3 hover:text-blue-600 dark:hover:text-blue-400">
            <Link to={`/post/${post.id}`}>
              {post.title}
            </Link>
          </h2>
    
          <p className="text-gray-600 dark:text-gray-300 mb-4 leading-relaxed">
            {post.summary}
          </p>
    
          <div className="flex items-center justify-between mt-4">
            <div className="flex gap-2">
              {post.tags.map(tag => (
                // 标签 dark:bg-blue-900/30 dark:text-blue-300
                <span key={tag} className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                  <Tag className="w-3 h-3" />
                  {tag}
                </span>
              ))}
            </div>
            {/* ... 阅读更多链接保持默认颜色即可，或者改为 blue-400 */}
             <Link 
              to={`/post/${post.id}`}
              className="inline-flex items-center text-sm font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
            >
              阅读全文 <ArrowRight className="w-4 h-4 ml-1" />
            </Link>
          </div>
        </article>
      );
    }
