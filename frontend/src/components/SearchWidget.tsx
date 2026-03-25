import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { Search, X } from 'lucide-react';

export default function SearchWidget() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const query = searchParams.get('search') || '';

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;

    // 如果用户不在文章列表，输入时自动跳转到文章列表
    if (location.pathname !== '/posts') {
      if (value) {
        navigate(`/posts?search=${encodeURIComponent(value)}`);
      }
      return;
    }

    // 在文章列表：实时更新 URL 参数
    if (value) {
      setSearchParams(prev => {
        prev.set('search', value);
        return prev;
      }, { replace: true });
    } else {
      // 如果清空了输入，就删除 search 参数
      setSearchParams(prev => {
        prev.delete('search');
        return prev;
      }, { replace: true });
    }
  };

  const clearSearch = () => {
    if (location.pathname !== '/posts') {
      navigate('/posts');
      return;
    }

    setSearchParams(prev => {
      prev.delete('search');
      return prev;
    }, { replace: true });
  };

  return (
    <div className="bg-slate-100/50 dark:bg-gray-900/30 backdrop-blur-md p-6 rounded-2xl shadow-sm border border-white/20 dark:border-gray-700/30">
      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2 border-b border-gray-100 dark:border-gray-800 pb-2">
        <Search className="w-4 h-4 text-purple-500" />
        搜索文章
      </h3>
      
      <div className="relative group">
        <input
          type="text"
          value={query}
          onChange={handleSearch}
          placeholder="搜索标题或内容..."
          className="w-full pl-10 pr-10 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all text-gray-700 dark:text-gray-200 placeholder-gray-400"
        />
        {/* 左侧搜索图标 */}
        <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400 group-focus-within:text-purple-500 transition-colors" />
        
        {/* 右侧清除按钮 (只有输入内容时才显示) */}
        {query && (
          <button 
            onClick={clearSearch}
            className="absolute right-3 top-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
