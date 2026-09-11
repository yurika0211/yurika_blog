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
    <div className="paper-search">
      <label className="paper-kicker" htmlFor="paper-search-input">
        检索
      </label>

      <div className="paper-search-field">
        <Search className="paper-search-icon" aria-hidden="true" />
        <input
          id="paper-search-input"
          type="text"
          value={inputValue}
          onChange={handleSearch}
          onCompositionStart={handleCompositionStart}
          onCompositionEnd={handleCompositionEnd}
          placeholder="检索标题或正文…"
          className="scroll-field paper-search-input"
        />
        {inputValue && (
          <button
            type="button"
            onClick={clearSearch}
            className="paper-search-clear"
            aria-label="清除检索"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
