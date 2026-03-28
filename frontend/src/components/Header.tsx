import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { Link, useLocation, matchPath } from 'react-router-dom';
import { BookOpen, Moon, Sun, Menu, X, PenLine, LogIn, LogOut } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';
import { useAuth } from '../hooks/useAuth';

const HEADER_SHARDS = [
  { x: 8, y: 34, tx: -36, ty: -20, rot: -28, delay: 0, w: 8, h: 4 },
  { x: 16, y: 56, tx: -48, ty: -10, rot: -16, delay: 12, w: 9, h: 5 },
  { x: 24, y: 30, tx: -34, ty: -24, rot: -22, delay: 24, w: 7, h: 4 },
  { x: 33, y: 50, tx: -22, ty: -14, rot: -14, delay: 42, w: 10, h: 5 },
  { x: 43, y: 36, tx: -12, ty: -22, rot: -10, delay: 60, w: 8, h: 4 },
  { x: 52, y: 54, tx: 10, ty: -18, rot: 12, delay: 80, w: 9, h: 5 },
  { x: 60, y: 34, tx: 16, ty: -24, rot: 18, delay: 96, w: 8, h: 4 },
  { x: 68, y: 52, tx: 22, ty: -14, rot: 22, delay: 112, w: 10, h: 5 },
  { x: 75, y: 30, tx: 30, ty: -24, rot: 26, delay: 128, w: 8, h: 4 },
  { x: 82, y: 50, tx: 36, ty: -16, rot: 20, delay: 148, w: 9, h: 5 },
  { x: 88, y: 36, tx: 42, ty: -22, rot: 26, delay: 168, w: 8, h: 4 },
  { x: 93, y: 58, tx: 52, ty: -12, rot: 18, delay: 184, w: 9, h: 5 },
];

export default function Header() {
  const { theme, toggleTheme } = useTheme();
  const { isLoggedIn, logout } = useAuth();
  const location = useLocation();
  const isLanding = location.pathname === '/';
  const isPostPage = Boolean(matchPath('/post/:id', location.pathname));
  const useLandingTexture = isLanding || isPostPage;
  const editorLink = isLoggedIn ? '/editor' : '/login?redirect=%2Feditor';
  const [menuOpenPath, setMenuOpenPath] = useState<string | null>(null);
  const menuOpen = menuOpenPath === location.pathname;
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const [isShattering, setIsShattering] = useState(false);
  const lastScrollYRef = useRef(0);
  const shatterTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const triggerShatter = () => {
    if (shatterTimerRef.current) {
      clearTimeout(shatterTimerRef.current);
    }
    setIsShattering(true);
    shatterTimerRef.current = setTimeout(() => {
      setIsShattering(false);
      shatterTimerRef.current = null;
    }, 560);
  };

  useEffect(() => {
    lastScrollYRef.current = window.scrollY;
    setIsHeaderVisible(true);
    setIsShattering(false);
  }, [location.pathname]);

  useEffect(() => {
    const onScroll = () => {
      const currentY = window.scrollY;
      const delta = currentY - lastScrollYRef.current;
      const threshold = 6;

      if (currentY <= 8) {
        setIsHeaderVisible(true);
        lastScrollYRef.current = currentY;
        return;
      }

      if (Math.abs(delta) < threshold) {
        return;
      }

      if (delta > 0 && !menuOpen) {
        if (isHeaderVisible) {
          triggerShatter();
        }
        setIsHeaderVisible(false);
      } else {
        setIsHeaderVisible(true);
      }

      lastScrollYRef.current = currentY;
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [menuOpen, isHeaderVisible]);

  useEffect(() => {
    if (menuOpen) {
      setIsHeaderVisible(true);
      setIsShattering(false);
    }
  }, [menuOpen]);

  useEffect(() => {
    document.documentElement.style.setProperty('--header-offset', isHeaderVisible ? '3.5rem' : '0px');
  }, [isHeaderVisible]);

  useEffect(
    () => () => {
      if (shatterTimerRef.current) {
        clearTimeout(shatterTimerRef.current);
      }
      document.documentElement.style.setProperty('--header-offset', '3.5rem');
    },
    [],
  );

  const navLinkClass = useLandingTexture
    ? 'hover:text-white'
    : 'hover:text-blue-600 dark:hover:text-blue-400';

  const btnClass = (base: string) =>
    'flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ' + base;

  const headerClass =
    `sticky top-0 z-50 border-b transition-[transform,opacity,background-color,border-color] duration-300 will-change-transform ${
      isHeaderVisible ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'
    } ` +
    (useLandingTexture
      ? 'border-white/15 bg-cyan-950/35 backdrop-blur-md'
      : 'border-gray-200 bg-slate-100/50 backdrop-blur-md dark:border-gray-800 dark:bg-gray-900/30');
  const shatterSurfaceClass = useLandingTexture ? 'header-shatter-surface-dark' : 'header-shatter-surface-light';

  const logoClass =
    'flex items-center gap-1.5 sm:gap-2 text-base sm:text-xl font-bold shrink-0 ' +
    (useLandingTexture ? 'text-white' : 'text-gray-800 dark:text-gray-100');

  const navClass =
    'hidden md:flex items-center gap-6 font-medium ' +
    (useLandingTexture ? 'text-gray-200' : 'text-gray-600 dark:text-gray-300');

  const toggleBtnClass =
    'rounded-lg p-2 transition-colors ' +
    (useLandingTexture ? 'hover:bg-white/20' : 'hover:bg-gray-100 dark:hover:bg-gray-800');

  const mobileBtnClass =
    'rounded-lg p-2 transition-colors ' +
    (useLandingTexture
      ? 'hover:bg-white/20 text-gray-200'
      : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300');

  const mobileMenuClass =
    'md:hidden border-t px-4 py-3 flex flex-col gap-3 font-medium ' +
    (useLandingTexture
      ? 'border-white/15 bg-cyan-950/40 backdrop-blur-md text-gray-200'
      : 'border-gray-200 bg-white/80 backdrop-blur-md text-gray-600 dark:border-gray-800 dark:bg-gray-900/80 dark:text-gray-300');

  return (
    <header className={headerClass}>
      <div className={`relative w-full px-2 sm:px-3 md:px-4 h-12 sm:h-14 flex items-center justify-between ${shatterSurfaceClass} ${isShattering ? 'header-shatter-burst' : ''}`}>
        <div className={`header-shatter-layer ${isShattering ? 'header-shatter-burst' : ''}`} aria-hidden="true">
          {HEADER_SHARDS.map((shard, index) => (
            <span
              key={`${shard.x}-${shard.y}-${index}`}
              className="header-shatter-shard"
              style={
                {
                  left: `${shard.x}%`,
                  top: `${shard.y}%`,
                  width: `${shard.w}px`,
                  height: `${shard.h}px`,
                  ['--tx' as any]: `${shard.tx}px`,
                  ['--ty' as any]: `${shard.ty}px`,
                  ['--rot' as any]: `${shard.rot}deg`,
                  animationDelay: `${shard.delay}ms`,
                } as CSSProperties
              }
            />
          ))}
        </div>
        <Link to="/" className={`relative z-10 ${logoClass}`}>
          <BookOpen className={useLandingTexture ? 'h-5 w-5 sm:h-6 sm:w-6 text-blue-300' : 'h-5 w-5 sm:h-6 sm:w-6 text-blue-600'} />
          <span>ユリカのブログ</span>
        </Link>

        <nav className={`relative z-10 ${navClass}`}>
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
          <button onClick={toggleTheme} className={toggleBtnClass} title="switch theme">
            {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
          </button>
        </nav>

        <div className="relative z-10 flex md:hidden items-center gap-2">
          <button onClick={toggleTheme} className={mobileBtnClass} title="switch theme">
            {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
          </button>
          <button
            onClick={() => setMenuOpenPath(menuOpen ? null : location.pathname)}
            className={mobileBtnClass}
            title="menu"
          >
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <nav className={mobileMenuClass}>
          <Link to="/" className={'py-1 ' + navLinkClass}>Home</Link>
          <Link to="/posts" className={'py-1 ' + navLinkClass}>Posts</Link>
          <Link to="/tags" className={'py-1 ' + navLinkClass}>Tags</Link>
          <Link to="/about" className={'py-1 ' + navLinkClass}>About</Link>
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
              onClick={() => {
                logout();
                setMenuOpenPath(null);
              }}
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
