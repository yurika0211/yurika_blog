import { Github, Twitter, Mail } from 'lucide-react';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="py-8 mt-12 border-t border-gray-200 dark:border-gray-800/50 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm transition-colors duration-300">
      <div className="max-w-4xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-4">
        
        {/* 左侧：版权信息 */}
        <div className="text-gray-500 dark:text-gray-400 text-sm text-center md:text-left">
          <p>© {currentYear} My DevBlog. Built with React & Tailwind.</p>
        </div>

        {/* 右侧：社交图标 */}
        <div className="flex items-center gap-6">
          <a 
            href="https://github.com" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            title="GitHub"
          >
            <Github className="w-5 h-5" />
          </a>
          <a 
            href="https://twitter.com" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-gray-400 hover:text-blue-400 transition-colors"
            title="Twitter"
          >
            <Twitter className="w-5 h-5" />
          </a>
          <a 
            href="mailto:your.email@example.com" 
            className="text-gray-400 hover:text-red-500 transition-colors"
            title="Email"
          >
            <Mail className="w-5 h-5" />
          </a>
        </div>
      </div>
    </footer>
  );
}