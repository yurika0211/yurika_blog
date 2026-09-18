import { useEffect, useRef, useState } from "react";
import { Link, matchPath, useLocation } from "react-router-dom";
import { ArrowUpRight, Menu, Moon, Sun, X } from "lucide-react";
import { useTheme } from "../hooks/useTheme";
import { useAuth } from "../hooks/useAuth";
import { lockDocumentScroll } from "../utils/scroll";
import "../styles/navigation.css";

const NAV_ITEMS = [
  { to: "/posts", label: "文录", note: "Journal" },
  { to: "/moments", label: "瞬间", note: "Moments" },
  { to: "/friends", label: "友人", note: "Friends" },
  { to: "/guestbook", label: "留札", note: "Guestbook" },
  { to: "/about", label: "关于", note: "About" },
];

export default function Header() {
  const { theme, toggleTheme } = useTheme();
  const { isLoggedIn, logout } = useAuth();
  const { pathname } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const editorLink = isLoggedIn ? "/editor" : "/login?redirect=%2Feditor";
  const isActive = (path: string) =>
    pathname === path ||
    (path === "/posts" && Boolean(matchPath("/post/:id", pathname)));

  useEffect(() => {
    dialogRef.current?.close();
  }, [pathname]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (!menuOpen) {
      dialog.close();
      return;
    }
    dialog.showModal();
    return lockDocumentScroll();
  }, [menuOpen]);

  return (
    <>
      <a className="skip-link" href="#main-content">
        跳至正文
      </a>
      <header className="site-header">
        <Link to="/" className="site-brand" aria-label="ユリカのブログ · 首页">
          <span className="site-brand__seal" aria-hidden="true">
            ゆ
          </span>
          <span>
            ユリカ<span className="site-brand__note">のブログ</span>
          </span>
        </Link>
        <nav className="site-nav" aria-label="主导航">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              aria-current={isActive(item.to) ? "page" : undefined}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="site-header__actions">
          <button
            className="site-icon-button"
            onClick={toggleTheme}
            aria-label={theme === "light" ? "切换到夜间" : "切换到日间"}
            title={theme === "light" ? "切换到夜间" : "切换到日间"}
          >
            {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
          </button>
          <button
            className="site-menu-trigger"
            onClick={() => setMenuOpen(true)}
            aria-expanded={menuOpen}
            aria-controls="site-menu"
            aria-label="打开目录"
          >
            <Menu size={18} aria-hidden="true" />
            <span>目录</span>
          </button>
        </div>
      </header>
      <dialog
        ref={dialogRef}
        id="site-menu"
        className="site-menu"
        aria-labelledby="site-menu-title"
        onKeyDown={(event) => {
          if (event.key !== "Tab") return;
          const items = Array.from(
            event.currentTarget.querySelectorAll<HTMLElement>(
              "a[href], button:not(:disabled)",
            ),
          );
          const first = items[0];
          const last = items[items.length - 1];
          if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last?.focus();
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first?.focus();
          }
        }}
        onClose={() => setMenuOpen(false)}
        onClick={(event) => {
          if (event.target === event.currentTarget) setMenuOpen(false);
        }}
      >
        <div className="site-menu__paper">
          <div className="site-menu__heading">
            <div>
              <p>ユリカのブログ</p>
              <h2 id="site-menu-title">卷中目录</h2>
            </div>
            <button
              className="site-icon-button"
              onClick={() => setMenuOpen(false)}
              aria-label="关闭目录"
            >
              <X size={20} />
            </button>
          </div>
          <nav className="site-menu__nav" aria-label="全部导航">
            {[{ to: "/", label: "引首", note: "Home" }, ...NAV_ITEMS].map(
              (item, index) => (
                <Link
                  key={item.to}
                  to={item.to}
                  aria-current={isActive(item.to) ? "page" : undefined}
                  onClick={() => setMenuOpen(false)}
                >
                  <span className="site-menu__number">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span>{item.label}</span>
                  <small>{item.note}</small>
                  <ArrowUpRight size={16} aria-hidden="true" />
                </Link>
              ),
            )}
          </nav>
          <div className="site-menu__footer">
            <Link to={editorLink} onClick={() => setMenuOpen(false)}>
              写一篇 <ArrowUpRight size={14} aria-hidden="true" />
            </Link>
            {isLoggedIn ? (
              <button
                onClick={() => {
                  logout();
                  setMenuOpen(false);
                }}
              >
                退出登录
              </button>
            ) : (
              <Link to="/login" onClick={() => setMenuOpen(false)}>
                登录
              </Link>
            )}
          </div>
        </div>
      </dialog>
    </>
  );
}
