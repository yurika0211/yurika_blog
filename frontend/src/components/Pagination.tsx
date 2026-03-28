import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

type PageToken = number | "ellipsis";

const buildPageTokens = (currentPage: number, totalPages: number): PageToken[] => {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const pages = new Set<number>([1, totalPages, currentPage, currentPage - 1, currentPage + 1]);

  if (currentPage <= 3) {
    pages.add(2);
    pages.add(3);
    pages.add(4);
  }

  if (currentPage >= totalPages - 2) {
    pages.add(totalPages - 1);
    pages.add(totalPages - 2);
    pages.add(totalPages - 3);
  }

  const orderedPages = Array.from(pages)
    .filter((page) => page >= 1 && page <= totalPages)
    .sort((a, b) => a - b);

  const tokens: PageToken[] = [];
  for (let i = 0; i < orderedPages.length; i += 1) {
    const page = orderedPages[i];
    const previousPage = orderedPages[i - 1];

    if (previousPage !== undefined && page - previousPage > 1) {
      tokens.push("ellipsis");
    }

    tokens.push(page);
  }

  return tokens;
};

export default function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
  // 如果只有 1 页，就不显示分页器
  if (totalPages <= 1) return null;

  const pageTokens = buildPageTokens(currentPage, totalPages);

  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages || page === currentPage) {
      return;
    }
    onPageChange(page);
  };

  return (
      <nav className="mt-12 animate-fade-in">
      <div className="mx-auto w-fit max-w-full rounded-2xl border border-white/55 bg-slate-100/78 px-3 py-2 shadow-md backdrop-blur-md dark:border-gray-700/70 dark:bg-gray-900/72">
        <div className="flex items-center gap-2 overflow-x-auto px-1">
        {/* 上一页按钮 */}
        <button
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-gray-300/80 bg-white/70 text-gray-700 transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-45 dark:border-gray-600/80 dark:bg-gray-800/70 dark:text-gray-300 dark:hover:bg-gray-800 sm:h-11 sm:w-11"
          aria-label="Previous page"
        >
          <ChevronLeft className="h-5 w-5 sm:h-5 sm:w-5" />
        </button>

        {/* 页码数字 */}
        <div className="flex items-center gap-1">
          {pageTokens.map((token, index) =>
            token === "ellipsis" ? (
              <span
                key={`ellipsis-${index}`}
                className="inline-flex h-10 w-7 shrink-0 items-center justify-center text-base text-gray-600 dark:text-gray-300 sm:h-11 sm:w-9"
                aria-hidden="true"
              >
                ...
              </span>
            ) : (
              <button
                key={token}
                onClick={() => handlePageChange(token)}
                className={`
                  h-10 min-w-10 shrink-0 rounded-lg px-2 text-base font-medium transition-all sm:h-11 sm:min-w-11
                  ${currentPage === token
                    ? 'scale-105 bg-blue-600 text-white shadow-md'
                    : 'border border-gray-300/70 bg-white/70 text-gray-700 hover:bg-white dark:border-gray-600/70 dark:bg-gray-800/70 dark:text-gray-300 dark:hover:bg-gray-800'
                  }
                `}
                aria-current={currentPage === token ? "page" : undefined}
              >
                {token}
              </button>
            )
          )}
        </div>

        {/* 下一页按钮 */}
        <button
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-gray-300/80 bg-white/70 text-gray-700 transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-45 dark:border-gray-600/80 dark:bg-gray-800/70 dark:text-gray-300 dark:hover:bg-gray-800 sm:h-11 sm:w-11"
          aria-label="Next page"
        >
          <ChevronRight className="h-5 w-5 sm:h-5 sm:w-5" />
        </button>
        </div>
      </div>
    </nav>
  );
}
