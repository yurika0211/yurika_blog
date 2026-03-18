import { Link, useLocation, matchPath } from 'react-router-dom';
import { BookOpen, Moon, Sun } from 'lucide-react'; // 引入图标
import { useTheme } from '../hooks/useTheme'; // 引入 hook
import { PenLine, LogIn, LogOut } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';


export default function Header() {
  const { theme, toggleTheme } = useTheme();
  const { isLoggedIn, logout } = useAuth();
  const location = useLocation();
  const isLanding = location.pathname === '/';
  const isPostPage = Boolean(matchPath('/post/:id', location.pathname));
  const useLandingTexture = isLanding || isPostPage;
  const editorLink = isLoggedIn ? '/editor' : '/login?redirect=%2Feditor';

  return (
    // dark:bg-gray-900 dark:border-gray-700 是深色模式下的样式
    <header
      className={`sticky top-0 z-10 border-b transition-colors duration-300 ${
        useLandingTexture
          ? 'border-white/10 bg-black/45 backdrop-blur-md'
          : 'border-gray-200 bg-white/90 backdrop-blur-md dark:border-gray-800 dark:bg-gray-900/90'
      }`}
    >
      <div className="max-w-10xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link
          to="/"
          className={`flex items-center gap-2 text-xl font-bold ${
            useLandingTexture ? 'text-white' : 'text-gray-800 dark:text-gray-100'
          }`}
        >
          <BookOpen className={`h-6 w-6 ${useLandingTexture ? 'text-blue-300' : 'text-blue-600'}`} />
          <span> ユリカのブログ</span>
        </Link>

        <nav
          className={`flex items-center gap-6 font-medium ${
            useLandingTexture ? 'text-gray-200' : 'text-gray-600 dark:text-gray-300'
          }`}
        >
          <Link
            to="/"
            className={
              useLandingTexture ? 'hover:text-white' : 'hover:text-blue-600 dark:hover:text-blue-400'
            }
          >
            Home
          </Link>
          <Link
            to="/about"
            className={
              useLandingTexture ? 'hover:text-white' : 'hover:text-blue-600 dark:hover:text-blue-400'
            }
          >
            About
          </Link>
          <Link
            to={editorLink}
            className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              useLandingTexture
                ? 'bg-white/10 text-white hover:bg-white/20'
                : 'bg-gray-100 text-gray-600 hover:bg-blue-50 hover:text-blue-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-blue-900/30 dark:hover:text-blue-400'
            }`}
          >
            <PenLine className="w-4 h-4" />
            Write
          </Link>
          {isLoggedIn ? (
            <button
              type="button"
              onClick={logout}
              className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                useLandingTexture
                  ? 'bg-red-500/25 text-white hover:bg-red-500/35'
                  : 'bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-300 dark:hover:bg-red-900/30'
              }`}
            >
              <LogOut className="w-4 h-4" />
              Log Out
            </button>
          ) : (
            <Link
              to="/login"
              className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                useLandingTexture
                  ? 'bg-white/10 text-white hover:bg-white/20'
                  : 'bg-gray-100 text-gray-600 hover:bg-blue-50 hover:text-blue-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-blue-900/30 dark:hover:text-blue-400'
              }`}
            >
              <LogIn className="w-4 h-4" />
              Log in
            </Link>
          )}
          {/* 切换按钮 */}
          <button
            onClick={toggleTheme}
            className={`rounded-lg p-2 transition-colors ${
              useLandingTexture ? 'hover:bg-white/20' : 'hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
            title="switch theme"
          >
            {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
          </button>
        </nav>
      </div>
    </header>
  );
}
