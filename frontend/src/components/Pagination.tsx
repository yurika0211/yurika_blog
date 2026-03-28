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
      <div className="mx-auto flex w-fit max-w-full items-center gap-1.5 overflow-x-auto px-1">
        {/* 上一页按钮 */}
        <button
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-gray-200 text-gray-600 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 sm:h-10 sm:w-10"
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5" />
        </button>

        {/* 页码数字 */}
        <div className="flex items-center gap-1">
          {pageTokens.map((token, index) =>
            token === "ellipsis" ? (
              <span
                key={`ellipsis-${index}`}
                className="inline-flex h-9 w-6 shrink-0 items-center justify-center text-sm text-gray-400 dark:text-gray-500 sm:h-10 sm:w-8"
                aria-hidden="true"
              >
                ...
              </span>
            ) : (
              <button
                key={token}
                onClick={() => handlePageChange(token)}
                className={`
                  h-9 min-w-9 shrink-0 rounded-lg px-2 text-sm font-medium transition-all sm:h-10 sm:min-w-10
                  ${currentPage === token
                    ? 'scale-105 bg-blue-600 text-white shadow-md'
                    : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
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
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-gray-200 text-gray-600 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 sm:h-10 sm:w-10"
          aria-label="Next page"
        >
          <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5" />
        </button>
      </div>
    </nav>
  );
}
