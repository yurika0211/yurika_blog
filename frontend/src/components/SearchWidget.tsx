import { startTransition, useEffect, useState, type ChangeEvent, type CompositionEvent } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { Search, X } from 'lucide-react';

const SEARCH_SYNC_DELAY = 250;

const buildSearchParams = (prev: URLSearchParams, value: string) => {
  const next = new URLSearchParams(prev);

  next.delete('page');
  next.delete('archive');

  if (value) {
    next.set('search', value);
  } else {
    next.delete('search');
  }

  return next;
};

export default function SearchWidget() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const query = searchParams.get('search') || '';
  const [inputValue, setInputValue] = useState(query);
  const [isComposing, setIsComposing] = useState(false);

  useEffect(() => {
    setInputValue(query);
  }, [query]);

  useEffect(() => {
    if (isComposing || inputValue === query) {
      return;
    }

    const timer = window.setTimeout(() => {
      if (location.pathname !== '/posts') {
        if (!inputValue) {
          return;
        }

        startTransition(() => {
          navigate(`/posts?search=${encodeURIComponent(inputValue)}`);
        });
        return;
      }

      startTransition(() => {
        setSearchParams((prev) => buildSearchParams(prev, inputValue), { replace: true });
      });
    }, SEARCH_SYNC_DELAY);

    return () => {
      window.clearTimeout(timer);
    };
  }, [inputValue, isComposing, location.pathname, navigate, query, setSearchParams]);

  const handleSearch = (e: ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const handleCompositionStart = () => {
    setIsComposing(true);
  };

  const handleCompositionEnd = (e: CompositionEvent<HTMLInputElement>) => {
    setIsComposing(false);
    setInputValue(e.currentTarget.value);
  };

  const clearSearch = () => {
    setIsComposing(false);
    setInputValue('');

    if (location.pathname !== '/posts') {
      startTransition(() => {
        navigate('/posts');
      });
      return;
    }

    startTransition(() => {
      setSearchParams((prev) => buildSearchParams(prev, ''), { replace: true });
    });
  };

  return (
    <div className="bg-slate-100/50 dark:bg-gray-900/30 backdrop-blur-md p-7 rounded-2xl shadow-sm border border-white/20 dark:border-gray-700/30">
      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-5 flex items-center gap-2 border-b border-gray-100 dark:border-gray-800 pb-2.5">
        <Search className="w-5 h-5 text-purple-500" />
        Search Posts
      </h3>
      
      <div className="relative group">
        <input
          type="text"
          value={inputValue}
          onChange={handleSearch}
          onCompositionStart={handleCompositionStart}
          onCompositionEnd={handleCompositionEnd}
          placeholder="Search titles or content..."
          className="w-full pl-12 pr-12 py-3.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all text-gray-700 dark:text-gray-200 placeholder-gray-400"
        />
        {/* 左侧搜索图标 */}
        <Search className="absolute left-4 top-4 w-5 h-5 text-gray-400 group-focus-within:text-purple-500 transition-colors" />
        
        {/* 右侧清除按钮 (只有输入内容时才显示) */}
        {inputValue && (
          <button 
            onClick={clearSearch}
            className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  );
}
