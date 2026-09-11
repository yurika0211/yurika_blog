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
    <nav className="paper-pager" aria-label="分页">
      <button
        type="button"
        onClick={() => handlePageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="paper-pager-step"
        aria-label="上一页"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      <div className="paper-pager-pages">
        {pageTokens.map((token, index) =>
          token === "ellipsis" ? (
            <span key={`ellipsis-${index}`} className="paper-pager-gap" aria-hidden="true">
              ⋯
            </span>
          ) : (
            <button
              key={token}
              type="button"
              onClick={() => handlePageChange(token)}
              className="paper-pager-page"
              data-active={currentPage === token ? "true" : "false"}
              aria-current={currentPage === token ? "page" : undefined}
            >
              {token}
            </button>
          )
        )}
      </div>

      <button
        type="button"
        onClick={() => handlePageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="paper-pager-step"
        aria-label="下一页"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </nav>
  );
}
