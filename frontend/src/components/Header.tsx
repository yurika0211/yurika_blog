import { useEffect, useRef, useState } from 'react';
import { Link, matchPath, useLocation, type To } from 'react-router-dom';
import {
  BookOpen,
  ChevronLeft,
  FileText,
  House,
  LogIn,
  LogOut,
  Menu,
  MessageSquare,
  Moon,
  PenLine,
  Sparkles,
  Sun,
  UserRound,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react';
import { useTheme } from '../hooks/useTheme';
import { useAuth } from '../hooks/useAuth';
import { lockDocumentScroll } from '../utils/scroll';

const HOVER_NAV_QUERY = '(min-width: 1280px) and (hover: hover) and (pointer: fine)';

type NavItem = {
  to: To;
  label: string;
  shortLabel: string;
  icon: LucideIcon;
  isActive: (pathname: string) => boolean;
};

const NAV_ITEMS: NavItem[] = [
  {
    to: '/',
    label: 'Home',
    shortLabel: '首',
    icon: House,
    isActive: (pathname) => pathname === '/',
  },
  {
    to: '/posts',
    label: 'Posts',
    shortLabel: '文',
    icon: FileText,
    isActive: (pathname) => pathname === '/posts' || Boolean(matchPath('/post/:id', pathname)) || Boolean(matchPath('/tag/:tag', pathname)),
  },
  {
    to: '/friends',
    label: 'Friends',
    shortLabel: '友',
    icon: Users,
    isActive: (pathname) => pathname === '/friends',
  },
  {
    to: '/moments',
    label: 'Moments',
    shortLabel: '瞬',
    icon: Sparkles,
    isActive: (pathname) => pathname === '/moments',
  },
  {
    to: '/guestbook',
    label: 'Guestbook',
    shortLabel: '札',
    icon: MessageSquare,
    isActive: (pathname) => pathname === '/guestbook',
  },
  {
    to: '/about',
    label: 'About',
    shortLabel: '我',
    icon: UserRound,
    isActive: (pathname) => pathname === '/about',
  },
];

const actionBaseClass = 'right-scroll-sidebar__action';

export default function Header() {
  const { theme, toggleTheme } = useTheme();
  const { isLoggedIn, logout } = useAuth();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [desktopSidebarVisible, setDesktopSidebarVisible] = useState(false);
  const [hoverNavAvailable, setHoverNavAvailable] = useState(() => {
    if (typeof window === 'undefined') {
      return false;
    }
    return window.matchMedia(HOVER_NAV_QUERY).matches;
  });
  const edgeTabPinnedClosedRef = useRef(false);

  const editorLink = isLoggedIn ? '/editor' : '/login?redirect=%2Feditor';
  const pathname = location.pathname;
  const isEditorRoute = Boolean(matchPath('/editor', pathname)) || Boolean(matchPath('/editor/:id', pathname));
  const isLoginRoute = pathname === '/login';
  const nextThemeLabel = theme === 'light' ? '夜' : '昼';
  const nextThemeText = theme === 'light' ? 'Night mode' : 'Light mode';

  useEffect(() => {
    setMenuOpen(false);
    setDesktopSidebarVisible(false);
    edgeTabPinnedClosedRef.current = false;
  }, [location.pathname, location.search, location.hash]);

  useEffect(() => {
    if (!menuOpen) {
      return;
    }

    const unlockScroll = lockDocumentScroll();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuOpen(false);
      }
    };

    window.addEventListener('keydown', onKeyDown);

    return () => {
      unlockScroll();
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [menuOpen]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const mediaQuery = window.matchMedia(HOVER_NAV_QUERY);
    const revealZone = 28;
    const keepZone = 156;
    let listenersAttached = false;

    const syncVisibility = (clientX: number) => {
      if (edgeTabPinnedClosedRef.current) {
        return;
      }
      const edge = window.innerWidth - clientX;
      setDesktopSidebarVisible((current) => (current ? edge <= keepZone : edge <= revealZone));
    };

    const handleMouseMove = (event: MouseEvent) => {
      const edge = window.innerWidth - event.clientX;
      if (edgeTabPinnedClosedRef.current && edge > revealZone) {
        edgeTabPinnedClosedRef.current = false;
      }
      syncVisibility(event.clientX);
    };

    const handleDocumentMouseLeave = (event: MouseEvent) => {
      if (event.relatedTarget === null) {
        setDesktopSidebarVisible(false);
      }
    };

    const attachHoverListeners = () => {
      if (listenersAttached) {
        return;
      }
      window.addEventListener('mousemove', handleMouseMove);
      document.documentElement.addEventListener('mouseleave', handleDocumentMouseLeave);
      listenersAttached = true;
    };

    const detachHoverListeners = () => {
      if (!listenersAttached) {
        return;
      }
      window.removeEventListener('mousemove', handleMouseMove);
      document.documentElement.removeEventListener('mouseleave', handleDocumentMouseLeave);
      listenersAttached = false;
    };

    const syncHoverNavMode = (matches: boolean) => {
      setHoverNavAvailable(matches);
      if (matches) {
        setMenuOpen(false);
        attachHoverListeners();
        return;
      }

      detachHoverListeners();
      setDesktopSidebarVisible(false);
      edgeTabPinnedClosedRef.current = false;
    };

    syncHoverNavMode(mediaQuery.matches);
    const handleMediaChange = () => syncHoverNavMode(mediaQuery.matches);
    mediaQuery.addEventListener('change', handleMediaChange);

    return () => {
      detachHoverListeners();
      mediaQuery.removeEventListener('change', handleMediaChange);
    };
  }, []);

  const desktopNav = NAV_ITEMS.map((item) => {
    const active = item.isActive(pathname);
    const Icon = item.icon;
    return (
      <Link
        key={String(item.to)}
        to={item.to}
        title={item.label}
        aria-current={active ? 'page' : undefined}
        data-active={active ? 'true' : 'false'}
        className="right-scroll-sidebar__nav-link"
      >
        <Icon className="h-4 w-4" />
        <span>{item.shortLabel}</span>
      </Link>
    );
  });

  const mobileNav = NAV_ITEMS.map((item) => {
    const active = item.isActive(pathname);
    const Icon = item.icon;
    return (
      <Link
        key={`mobile-${String(item.to)}`}
        to={item.to}
        aria-current={active ? 'page' : undefined}
        data-active={active ? 'true' : 'false'}
        className="right-scroll-mobile-link"
        onClick={() => setMenuOpen(false)}
      >
        <span className="right-scroll-mobile-link-main">
          <Icon className="h-4 w-4" />
          <span>{item.label}</span>
        </span>
        <span className="right-scroll-mobile-link-mark">{item.shortLabel}</span>
      </Link>
    );
  });

  return (
    <>
      <aside
        id="right-scroll-sidebar"
        className={`right-scroll-sidebar hidden xl:block ${desktopSidebarVisible ? 'is-visible' : ''}`}
        aria-label="Primary navigation"
        aria-hidden={desktopSidebarVisible ? undefined : true}
        inert={desktopSidebarVisible ? undefined : true}
      >
        <div className="right-scroll-sidebar__panel">
          <Link to="/" className="right-scroll-sidebar__brand" title="ユリカのブログ">
            <span className="right-scroll-sidebar__brand-seal">
              <BookOpen className="h-4 w-4" />
            </span>
            <span className="right-scroll-sidebar__title">ユリカ</span>
            <span className="right-scroll-sidebar__subtitle">blog</span>
          </Link>

          <nav className="right-scroll-sidebar__nav">
            {desktopNav}
          </nav>

          <div className="right-scroll-sidebar__actions">
            <Link
              to={editorLink}
              title="Write"
              aria-current={isEditorRoute ? 'page' : undefined}
              data-active={isEditorRoute ? 'true' : 'false'}
              className={actionBaseClass}
            >
              <PenLine className="h-4 w-4" />
              <span>写</span>
            </Link>

            {isLoggedIn ? (
              <button
                type="button"
                title="Log out"
                className={`${actionBaseClass} right-scroll-sidebar__action--danger`}
                onClick={logout}
              >
                <LogOut className="h-4 w-4" />
                <span>退</span>
              </button>
            ) : (
              <Link
                to="/login"
                title="Log in"
                aria-current={isLoginRoute ? 'page' : undefined}
                data-active={isLoginRoute ? 'true' : 'false'}
                className={actionBaseClass}
              >
                <LogIn className="h-4 w-4" />
                <span>登</span>
              </Link>
            )}

            <button
              type="button"
              title={nextThemeText}
              className={actionBaseClass}
              onClick={toggleTheme}
            >
              {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
              <span>{nextThemeLabel}</span>
            </button>
          </div>
        </div>
      </aside>

      <button
        type="button"
        className={`right-scroll-edge-tab fixed right-0 top-1/2 z-[71] ${hoverNavAvailable ? 'inline-flex' : 'hidden'} ${desktopSidebarVisible ? 'is-active' : ''}`}
        onClick={() => {
          setDesktopSidebarVisible((current) => {
            const next = !current;
            edgeTabPinnedClosedRef.current = !next;
            return next;
          });
        }}
        aria-expanded={desktopSidebarVisible}
        aria-controls="right-scroll-sidebar"
        aria-label={desktopSidebarVisible ? 'Hide navigation' : 'Show navigation'}
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      <button
        type="button"
        className={`right-scroll-mobile-button fixed right-4 top-4 z-[80] items-center justify-center ${hoverNavAvailable ? 'hidden' : 'inline-flex'}`}
        onClick={() => setMenuOpen((current) => !current)}
        aria-expanded={menuOpen}
        aria-controls="right-scroll-mobile-sheet"
        aria-label={menuOpen ? 'Close navigation' : 'Open navigation'}
      >
        {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      <div
        className={`right-scroll-mobile-backdrop ${hoverNavAvailable ? 'hidden' : ''} ${menuOpen ? 'is-open' : ''}`}
        aria-hidden="true"
        onClick={() => setMenuOpen(false)}
      />

      <aside
        id="right-scroll-mobile-sheet"
        className={`right-scroll-mobile-sheet ${hoverNavAvailable ? 'hidden' : ''} ${menuOpen ? 'is-open' : ''}`}
        aria-label="Mobile navigation"
      >
        <div className="right-scroll-mobile-header">
          <div className="right-scroll-mobile-brand">
            <span className="right-scroll-mobile-brand-seal">
              <BookOpen className="h-4 w-4" />
            </span>
            <div>
              <p className="right-scroll-mobile-brand-title">ユリカのブログ</p>
              <p className="right-scroll-mobile-brand-note">右侧卷轴导航</p>
            </div>
          </div>

          <button
            type="button"
            className="right-scroll-mobile-close"
            onClick={() => setMenuOpen(false)}
            aria-label="Close navigation"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="right-scroll-mobile-nav">
          {mobileNav}
        </nav>

        <div className="right-scroll-mobile-actions">
          <Link
            to={editorLink}
            className="right-scroll-mobile-action"
            onClick={() => setMenuOpen(false)}
          >
            <span className="right-scroll-mobile-link-main">
              <PenLine className="h-4 w-4" />
              <span>Write</span>
            </span>
            <span className="right-scroll-mobile-link-mark">写</span>
          </Link>

          {isLoggedIn ? (
            <button
              type="button"
              className="right-scroll-mobile-action right-scroll-mobile-action--danger"
              onClick={() => {
                logout();
                setMenuOpen(false);
              }}
            >
              <span className="right-scroll-mobile-link-main">
                <LogOut className="h-4 w-4" />
                <span>Log out</span>
              </span>
              <span className="right-scroll-mobile-link-mark">退</span>
            </button>
          ) : (
            <Link
              to="/login"
              className="right-scroll-mobile-action"
              onClick={() => setMenuOpen(false)}
            >
              <span className="right-scroll-mobile-link-main">
                <LogIn className="h-4 w-4" />
                <span>Log in</span>
              </span>
              <span className="right-scroll-mobile-link-mark">登</span>
            </Link>
          )}

          <button
            type="button"
            className="right-scroll-mobile-action"
            onClick={toggleTheme}
          >
            <span className="right-scroll-mobile-link-main">
              {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
              <span>{nextThemeText}</span>
            </span>
            <span className="right-scroll-mobile-link-mark">{nextThemeLabel}</span>
          </button>
        </div>
      </aside>
    </>
  );
}
