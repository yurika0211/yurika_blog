import { useState, useEffect } from 'react';
import { Link, useLocation, matchPath } from 'react-router-dom';
import { BookOpen, Moon, Sun, Menu, X } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';
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
  const [menuOpen, setMenuOpen] = useState(false);

  // 路由变化时关闭菜单
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  const navLinkClass = useLandingTexture
    ? 'hover:text-white'
    : 'hover:text-blue-600 dark:hover:text-blue-400';

  const btnClass = (base: string) =>
    `flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${base}`;

  return (
    <header
      className={`sticky top-0 z-50 border-b transition-colors duration-300 ${
        useLandingTexture
          ? 'border-white/10 bg-black/45 backdrop-blur-md'
          : 'border-gray-200 bg-white/30 backdrop-blur-md dark:border-gray-800 dark:bg-gray-900/30'
      }`}
    >
      <div className="max-w-10xl mx-auto px-4 h-14 sm:h-16 flex items-center justify-between">
        {/* Logo */}
        <Link
          to="/"
          className={`flex items-center gap-1.5 sm:gap-2 text-base sm:text-xl font-bold shrink-0 ${
            useLandingTexture ? 'text-white' : 'text-gray-800 dark:text-gray-100'
          }`}
        >
          <BookOpen className={`h-5 w-5 sm:h-6 sm:w-6 ${useLandingTexture ? 'text-blue-300' : 'text-blue-600'}`} />
          <span>ユリカのブログ</span>
        </Link>

        {/* 桌面端导航 */}
        <nav
          className={`hidden md:flex items-center gap-6 font-medium ${
            useLandingTexture ? 'text-gray-200' : 'text-gray-600 dark:text-gray-300'
          }`}
        >
          <Link to="/" className={navLinkClass}>Home</Link>
          <Link to="/posts" className={navLinkClass}>Posts</Link>
          <Link to="/tags" className={navLinkClass}>Tags</Link>
          <Link to="/about" className={navLinkClass}>About</Link>
          <Link
            to={editorLink}
            className={btnClass(
              useLandingTexture
                ? 'bg-white/10 text-white hover:bg-white/20'
                : 'bg-gray-100 text-gray-600 hover:bg-blue-50 hover:text-blue-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-blue-900/30 dark:hover:text-blue-400'
            )}
          >
            <PenLine className="w-4 h-4" />
            Write
          </Link>
          {isLoggedIn ? (
            <button
              type="button"
              onClick={logout}
              className={btnClass(
                useLandingTexture
                  ? 'bg-red-500/25 text-white hover:bg-red-500/35'
                  : 'bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-300 dark:hover:bg-red-900/30'
              )}
            >
              <LogOut className="w-4 h-4" />
              Log Out
            </button>
          ) : (
            <Link
              to="/login"
              className={btnClass(
                useLandingTexture
                  ? 'bg-white/10 text-white hover:bg-white/20'
                  : 'bg-gray-100 text-gray-600 hover:bg-blue-50 hover:text-blue-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-blue-900/30 dark:hover:text-blue-400'
              )}
            >
              <LogIn className="w-4 h-4" />
              Log in
            </Link>
          )}
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

        {/* 移动端按钮区 */}
        <div className="flex md:hidden items-center gap-2">
          <button
            onClick={toggleTheme}
            className={`rounded-lg p-2 transition-colors ${
              useLandingTexture ? 'hover:bg-white/20 text-gray-200' : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300'
            }`}
            title="switch theme"
          >
            {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
          </button>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className={`rounded-lg p-2 transition-colors ${
              useLandingTexture ? 'hover:bg-white/20 text-gray-200' : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300'
            }`}
            title="menu"
          >
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* 移动端下拉菜单 */}
      {menuOpen && (
        <nav
          className={`md:hidden border-t px-4 py-3 flex flex-col gap-3 font-medium ${
            useLandingTexture
              ? 'border-white/10 bg-black/50 backdrop-blur-md text-gray-200'
              : 'border-gray-200 bg-white/80 backdrop-blur-md text-gray-600 dark:border-gray-800 dark:bg-gray-900/80 dark:text-gray-300'
          }`}
        >
          <Link to="/" className={`py-1 ${navLinkClass}`}>Home</Link>
          <Link to="/posts" className={`py-1 ${navLinkClass}`}>Posts</Link>
          <Link to="/tags" className={`py-1 ${navLinkClass}`}>Tags</Link>
          <Link to="/about" className={`py-1 ${navLinkClass}`}>About</Link>
          <Link
            to={editorLink}
            className={btnClass(
              useLandingTexture
                ? 'bg-white/10 text-white hover:bg-white/20 w-fit'
                : 'bg-gray-100 text-gray-600 hover:bg-blue-50 hover:text-blue-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-blue-900/30 dark:hover:text-blue-400 w-fit'
            )}
          >
            <PenLine className="w-4 h-4" />
            Write
          </Link>
          {isLoggedIn ? (
            <button
              type="button"
              onClick={() => { logout(); setMenuOpen(false); }}
              className={btnClass(
                useLandingTexture
                  ? 'bg-red-500/25 text-white hover:bg-red-500/35 w-fit'
                  : 'bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-300 dark:hover:bg-red-900/30 w-fit'
              )}
            >
              <LogOut className="w-4 h-4" />
              Log Out
            </button>
          ) : (
            <Link
              to="/login"
              className={btnClass(
                useLandingTexture
                  ? 'bg-white/10 text-white hover:bg-white/20 w-fit'
                  : 'bg-gray-100 text-gray-600 hover:bg-blue-50 hover:text-blue-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-blue-900/30 dark:hover:text-blue-400 w-fit'
              )}
            >
              <LogIn className="w-4 h-4" />
              Log in
            </Link>
          )}
        </nav>
      )}
    </header>
  );
}
