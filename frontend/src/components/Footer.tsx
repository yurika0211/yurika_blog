import { Github } from 'lucide-react';
import { matchPath, useLocation } from 'react-router-dom';

export default function Footer() {
  const currentYear = new Date().getFullYear();
  const location = useLocation();
  const SCROLL_ROUTES = ['/', '/moments', '/guestbook', '/posts', '/friends'];
  if (SCROLL_ROUTES.includes(location.pathname)) {
    return null;
  }
  const isPostPage = Boolean(matchPath('/post/:id', location.pathname));
  const footerClass = isPostPage
    ? 'post-paper-wall py-8 mt-0 border-t border-[#b0aea5]/60 dark:border-[#a1a0a0]/70 transition-colors duration-300'
    : 'paper-page py-8 border-t border-[color:var(--hair-strong)] transition-colors duration-300';

  return (
    <footer className={footerClass}>
      <div className="max-w-4xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-4">
        
        {/* 左侧：版权信息 */}
        <div className="paper-muted text-sm text-center md:text-left">
          <p>Copyright © {currentYear} My DevBlog. All rights reserved.</p>
        </div>

        {/* 右侧：社交图标 */}
        <div className="flex items-center gap-6">
          <a
            href="https://github.com/yurika0211"
            target="_blank"
            rel="noopener noreferrer"
            className="paper-muted hover:text-[color:var(--seal)] transition-colors"
            title="GitHub"
          >
            <Github className="w-5 h-5" />
          </a>
        </div>
      </div>
    </footer>
  );
}
