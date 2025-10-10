interface PaginationProps {
  currentPage: number;
  totalPages: number;
  total: number;
  limit: number;
  isLoading: boolean;
  onPageChange: (page: number) => void;
}

export default function Pagination({
  currentPage,
  totalPages,
  total,
  limit,
  isLoading,
  onPageChange,
}: PaginationProps) {
  return (
    <div className="flex justify-between items-center mt-6">
      <div className="text-sm text-[#6e7787]">
        <span className="hidden sm:inline">
          Showing {(currentPage - 1) * limit + 1}-
          {Math.min(currentPage * limit, total)} of {total.toLocaleString()}{" "}
          users
        </span>
        <span className="sm:hidden">
          Page {currentPage} of {totalPages}
        </span>
      </div>

      <div className="flex items-center space-x-3">
        {currentPage > 2 && (
          <button
            onClick={() => onPageChange(1)}
            disabled={isLoading}
            className="px-2 py-1 text-sm rounded-md transition-none bg-[#1d1f23] text-white border border-divider border-b-[#282a2f] border-b-2"
            aria-label="First page"
          >
            <i className="fa-regular fa-angles-left"></i>
          </button>
        )}
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1 || isLoading}
          className="px-3 py-1 text-sm rounded-md transition-none bg-[#1d1f23] text-white border border-divider border-b-[#282a2f] border-b-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Previous
        </button>

        <div className="hidden sm:flex items-center space-x-1">
          {/* Pagination buttons - desktop (5 buttons) */}
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            let pageNum;
            if (totalPages <= 5) {
              pageNum = i + 1;
            } else if (currentPage <= 3) {
              pageNum = i + 1;
            } else if (currentPage >= totalPages - 2) {
              pageNum = totalPages - 4 + i;
            } else {
              pageNum = currentPage - 2 + i;
            }

            if (pageNum < 1 || pageNum > totalPages) return null;

            return (
              <button
                key={pageNum}
                onClick={() => onPageChange(pageNum)}
                disabled={isLoading}
                className={`px-3 py-1 text-sm rounded-md transition-none border border-b-2 ${
                  currentPage === pageNum
                    ? "bg-primary-blue text-white border-primary-blue border-b-primary-dark-blue"
                    : "bg-[#1d1f23] text-white border-divider border-b-[#282a2f]"
                }`}
              >
                {pageNum}
              </button>
            );
          })}
        </div>

        <div className="flex sm:hidden items-center space-x-1">
          {/* Pagination buttons - mobile (3 buttons) */}
          {Array.from({ length: Math.min(3, totalPages) }, (_, i) => {
            let pageNum;
            if (totalPages <= 3) {
              pageNum = i + 1;
            } else if (currentPage <= 2) {
              pageNum = i + 1;
            } else if (currentPage >= totalPages - 1) {
              pageNum = totalPages - 2 + i;
            } else {
              pageNum = currentPage - 1 + i;
            }

            if (pageNum < 1 || pageNum > totalPages) return null;

            return (
              <button
                key={pageNum}
                onClick={() => onPageChange(pageNum)}
                disabled={isLoading}
                className={`px-2.5 py-1 text-sm rounded-md transition-none border border-b-2 ${
                  currentPage === pageNum
                    ? "bg-primary-blue text-white border-primary-blue border-b-primary-dark-blue"
                    : "bg-[#1d1f23] text-white border-divider border-b-[#282a2f]"
                }`}
              >
                {pageNum}
              </button>
            );
          })}
        </div>

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages || isLoading}
          className="px-3 py-1 text-sm rounded-md transition-none bg-[#1d1f23] text-white border border-divider border-b-[#282a2f] border-b-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Next
        </button>
        {currentPage < totalPages - 1 && (
          <button
            onClick={() => onPageChange(totalPages)}
            disabled={isLoading}
            className="px-2 py-1 text-sm rounded-md transition-none bg-[#1d1f23] text-white border border-divider border-b-[#282a2f] border-b-2"
            aria-label="Last page"
          >
            <i className="fa-regular fa-angles-right"></i>
          </button>
        )}
      </div>
    </div>
  );
}
