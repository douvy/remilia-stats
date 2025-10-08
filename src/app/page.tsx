"use client";

import Header from "@/components/Header";
import { useState, useMemo, useRef, useEffect } from "react";
import useSWR from "swr";
import type { ConnectionStatus } from "@/types/api";
import type { UserStats } from "@/types/remilia";

interface LeaderboardResponse {
  users: UserStats[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  meta: {
    lastUpdated: string | null;
    totalUsers: number;
    totalPokes: number;
    activeUsers: number;
    searchQuery: string | null;
  };
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const formatRelativeTime = (timestamp: string) => {
  const now = new Date();
  const then = new Date(timestamp);
  const diffInMs = now.getTime() - then.getTime();
  const diffInMinutes = Math.floor(diffInMs / 60000);
  const diffInHours = Math.floor(diffInMinutes / 60);
  const diffInDays = Math.floor(diffInHours / 24);

  if (diffInMinutes < 1) return 'just now';
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  if (diffInHours < 24) return `${diffInHours}h ago`;
  if (diffInDays < 7) return `${diffInDays}d ago`;

  // Fallback to date for older timestamps
  return then.toLocaleDateString();
};

type SortField = "rank" | "beetles" | "pokes" | "socialCredit" | "user";
type SortDirection = "asc" | "desc";

export default function Home() {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<SortField>("beetles");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [activeCardIndex, setActiveCardIndex] = useState(0);
  const carouselRef = useRef<HTMLDivElement>(null);
  const itemsPerPage = 50;

  // Build API URL with pagination, search, and sorting
  const apiUrl = useMemo(() => {
    const params = new URLSearchParams({
      page: currentPage.toString(),
      limit: itemsPerPage.toString(),
      sortBy: sortField === "user" ? "username" : sortField,
      sortDirection: sortDirection,
    });
    if (searchQuery.trim()) {
      params.append("search", searchQuery.trim());
    }
    return `/api/leaderboard?${params}`;
  }, [currentPage, itemsPerPage, searchQuery, sortField, sortDirection]);

  const { data, error, isLoading, isValidating } = useSWR<LeaderboardResponse>(
    apiUrl,
    fetcher,
    {
      refreshInterval: 60000, // 1 minute
      revalidateOnFocus: false,
    },
  );

  // Connection status
  const connectionStatus: ConnectionStatus = useMemo(() => {
    if (isLoading || isValidating) return "connecting";
    if (error) return "disconnected";
    if (data) return "connected";
    return "connecting";
  }, [data, error, isLoading, isValidating]);

  // Map API data to frontend format
  const users = (data?.users || []).map((user) => ({
    rank: user.rank,
    username: user.username,
    displayName: user.displayName,
    pfpUrl: user.pfpUrl,
    beetles: user.beetles,
    pokes: user.pokes ?? 0,
    socialCredit: user.socialCredit ?? 0,
  }));

  const currentData = users;
  const totalPages = data?.pagination?.pages || 0;

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setCurrentPage(1);
  };

  const handleSort = (field: SortField) => {
    // Note: Sorting is currently handled by beetles rank from API
    // Could extend API to support different sort fields
    if (field === sortField) {
      setSortDirection(sortDirection === "desc" ? "asc" : "desc");
    } else {
      setSortField(field);
      setSortDirection(field === "rank" ? "asc" : "desc");
    }
    setCurrentPage(1);
  };

  const getSortIcon = (field: SortField) => {
    if (field !== sortField) return "";
    return sortDirection === "desc"
      ? "fa-regular fa-angle-down text-white"
      : "fa-regular fa-angle-up text-white";
  };

  // Track scroll position for carousel indicator
  useEffect(() => {
    const carousel = carouselRef.current;
    if (!carousel) return;

    const handleScroll = () => {
      const cards = carousel.querySelectorAll('[data-card-index]');
      if (cards.length === 0) return;

      const carouselRect = carousel.getBoundingClientRect();
      const carouselCenter = carouselRect.left + carouselRect.width / 2;

      let closestIndex = 0;
      let closestDistance = Infinity;

      cards.forEach((card, index) => {
        const cardRect = card.getBoundingClientRect();
        const cardCenter = cardRect.left + cardRect.width / 2;
        const distance = Math.abs(carouselCenter - cardCenter);

        if (distance < closestDistance) {
          closestDistance = distance;
          closestIndex = index;
        }
      });

      setActiveCardIndex(closestIndex);
    };

    carousel.addEventListener('scroll', handleScroll);
    handleScroll(); // Initial call
    return () => carousel.removeEventListener('scroll', handleScroll);
  }, []);

  // Handle indicator click to scroll to card
  const scrollToCard = (index: number) => {
    const carousel = carouselRef.current;
    if (!carousel) return;

    const card = carousel.querySelector(`[data-card-index="${index}"]`);
    if (!card) return;

    const cardElement = card as HTMLElement;
    const carouselRect = carousel.getBoundingClientRect();
    const cardRect = cardElement.getBoundingClientRect();

    const scrollLeft = carousel.scrollLeft + (cardRect.left - carouselRect.left) - (carouselRect.width - cardRect.width) / 2;
    carousel.scrollTo({ left: scrollLeft, behavior: 'smooth' });
  };

  return (
    <main className="min-h-screen bg-background bg-grid-pattern bg-grid-size flex flex-col">
      <Header
        onSearch={handleSearch}
        onReset={() => setCurrentPage(1)}
        users={users}
        connectionStatus={connectionStatus}
      />
      <div className="container mx-auto px-4 py-8 max-w-7xl flex-grow">
        {/* Stats Cards */}
        <div className="mb-8 md:grid md:grid-cols-3 md:gap-6 hidden">
          <div className="bg-gradient-to-r from-[#161a29] to-[#19191e]/60 p-6 rounded-lg border border-divider">
            <div className="text-2xl font-bold text-white">
              {data?.meta?.totalUsers?.toLocaleString() || "-"}
            </div>
            <div className="text-[#6e7787]">
              <i className="fa regular fa-users text-soft-blue mr-2"></i>
              Total Users
            </div>
          </div>

          <div className="bg-gradient-to-r from-[#161a29] to-[#19191e]/60 p-6 rounded-lg border border-divider">
            <div className="text-2xl font-bold text-white">
              {data?.meta?.totalPokes?.toLocaleString() || "-"}
            </div>
            <div className="text-[#6e7787]">
              <i className="fa regular fa-hand-pointer text-soft-blue mr-2"></i>
              Total Pokes
            </div>
          </div>

          <div className="bg-gradient-to-r from-[#161a29] to-[#19191e]/60 p-6 rounded-lg border border-divider">
            <div className="text-2xl font-bold text-white">
              {data?.meta?.activeUsers?.toLocaleString() || "-"}
            </div>
            <div className="text-[#6e7787]">
              <i className="fa regular fa-wave-pulse text-soft-blue mr-2"></i>
              Active Users
            </div>
          </div>
        </div>

        {/* Mobile Swipeable Stats Cards */}
        <div className="mb-6 md:hidden">
          <div ref={carouselRef} className="overflow-x-auto scrollbar-hide snap-x snap-mandatory">
            <div className="flex gap-4 px-4 -mx-4">
              <div data-card-index="0" className="bg-gradient-to-r from-[#161a29] to-[#19191e]/60 p-6 rounded-lg border border-divider min-w-[280px] snap-center flex-shrink-0">
                <div className="text-2xl font-bold text-white">
                  {data?.meta?.totalUsers?.toLocaleString() || "-"}
                </div>
                <div className="text-[#6e7787]">
                  <i className="fa regular fa-users text-soft-blue mr-2"></i>
                  Total Users
                </div>
              </div>

              <div data-card-index="1" className="bg-gradient-to-r from-[#161a29] to-[#19191e]/60 p-6 rounded-lg border border-divider min-w-[280px] snap-center flex-shrink-0">
                <div className="text-2xl font-bold text-white">
                  {data?.meta?.totalPokes?.toLocaleString() || "-"}
                </div>
                <div className="text-[#6e7787]">
                  <i className="fa regular fa-hand-pointer text-soft-blue mr-2"></i>
                  Total Pokes
                </div>
              </div>

              <div data-card-index="2" className="bg-gradient-to-r from-[#161a29] to-[#19191e]/60 p-6 rounded-lg border border-divider min-w-[280px] snap-center flex-shrink-0">
                <div className="text-2xl font-bold text-white">
                  {data?.meta?.activeUsers?.toLocaleString() || "-"}
                </div>
                <div className="text-[#6e7787]">
                  <i className="fa regular fa-wave-pulse text-soft-blue mr-2"></i>
                  Active Users
                </div>
              </div>
            </div>
          </div>

          {/* Carousel Indicator Lines */}
          <div className="flex justify-center gap-2 mt-2">
            {[0, 1, 2].map((index) => (
              <button
                key={index}
                onClick={() => scrollToCard(index)}
                className={`fa-regular fa-minus transition-colors ${
                  activeCardIndex === index ? 'text-soft-blue' : 'text-[#6e7787]'
                }`}
                aria-label={`Go to card ${index + 1}`}
              />
            ))}
          </div>
        </div>

        <section>
          <div className="mb-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              {searchQuery ? (
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 bg-[#1a1c21] border border-[#2d2f36] rounded-md px-3 py-1">
                    {currentData.length > 0 && currentData[0] && (
                      <img
                        src={currentData[0].pfpUrl}
                        alt={currentData[0].displayName}
                        className="w-5 h-5 rounded-sm"
                        onError={(e) => {
                          const img = e.target as HTMLImageElement;
                          img.src = "/assets/img/nopfp.png";
                        }}
                      />
                    )}
                    <span className="text-sm text-white font-medium">
                      {searchQuery}
                    </span>
                    <span className="text-xs text-[#6e7787] ml-1">
                      ({data?.pagination?.total || 0})
                    </span>
                  </div>
                  <button
                    onClick={() => handleSearch("")}
                    className="px-3 py-1 text-sm rounded-md transition-none bg-[#1d1f23] text-white border border-divider border-b-[#282a2f] border-b-2"
                  >
                    Clear
                  </button>
                </div>
              ) : (
                <>
                  {/* Mobile: inline */}
                  <div className="text-sm text-[#6e7787] sm:hidden flex items-center gap-2">
                    <span>{data?.pagination?.total?.toLocaleString() || 0} users</span>
                    {data?.meta?.lastUpdated && (
                      <>
                        <span className="text-[#3e4350]">•</span>
                        <span className="text-xs">Updated {formatRelativeTime(data.meta.lastUpdated)}</span>
                      </>
                    )}
                  </div>

                  {/* Desktop: left aligned */}
                  <div className="text-sm text-[#6e7787] hidden sm:block">
                    Showing {data?.pagination?.total?.toLocaleString() || 0} users
                  </div>

                  {/* Desktop: right aligned */}
                  {data?.meta?.lastUpdated && (
                    <div className="text-xs text-[#6e7787] hidden sm:block">
                      Updated {formatRelativeTime(data.meta.lastUpdated)}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {error ? (
            <div className="mb-6 text-red-400">
              <i className="fa-regular fa-circle-info mr-2" />
              {error?.message || "Failed to load leaderboard"}
            </div>
          ) : null}

          <div className="overflow-x-auto border border-divider rounded-lg">
            <table className="min-w-full overflow-hidden table-fixed">
              <thead>
                <tr className="border-b border-divider bg-gradient-to-b from-[#22252c] to-[#16171b]">
                  <th className="py-3 px-6 text-left text-xs font-medium text-[#6e7787] uppercase tracking-wider w-1/6">
                    <button
                      onClick={() => handleSort("rank")}
                      className="flex items-center gap-2 text-[#6e7787] hover:text-white transition-colors"
                    >
                      RANK
                      <i
                        className={`${getSortIcon("rank")} text-xs align-middle`}
                      />
                    </button>
                  </th>
                  <th className="py-3 px-6 text-left text-xs font-medium text-[#6e7787] uppercase tracking-wider w-1/3">
                    <button
                      onClick={() => handleSort("user")}
                      className="flex items-center gap-2 text-[#6e7787] hover:text-white transition-colors"
                    >
                      USER
                      <i
                        className={`${getSortIcon("user")} text-xs align-middle`}
                      />
                    </button>
                  </th>
                  <th className="py-3 px-6 text-left text-xs font-medium text-[#6e7787] uppercase tracking-wider w-1/6">
                    <button
                      onClick={() => handleSort("beetles")}
                      className="flex items-center gap-2 text-[#6e7787] hover:text-white transition-colors"
                    >
                      BEETLES
                      <i
                        className={`${getSortIcon("beetles")} text-xs align-middle`}
                      />
                    </button>
                  </th>
                  <th className="py-3 px-6 text-left text-xs font-medium text-[#6e7787] uppercase tracking-wider w-1/6">
                    <button
                      onClick={() => handleSort("pokes")}
                      className="flex items-center gap-2 text-[#6e7787] hover:text-white transition-colors"
                    >
                      POKES
                      <i
                        className={`${getSortIcon("pokes")} text-xs align-middle`}
                      />
                    </button>
                  </th>
                  <th className="py-3 px-6 text-left text-xs font-medium text-[#6e7787] uppercase tracking-wider w-1/6">
                    <button
                      onClick={() => handleSort("socialCredit")}
                      className="flex items-center gap-2 text-[#6e7787] hover:text-white transition-colors"
                    >
                      SOCIAL CREDIT
                      <i
                        className={`${getSortIcon("socialCredit")} text-xs align-middle`}
                      />
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-divider">
                {isLoading && currentData.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="py-12 text-center text-[#6e7787]"
                    >
                      <i className="fas fa-spinner fa-spin text-2xl mb-2 block" />
                      Loading leaderboard...
                    </td>
                  </tr>
                ) : currentData.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="py-12 text-center text-[#6e7787]"
                    >
                      {searchQuery
                        ? `No users found matching "${searchQuery}"`
                        : "No users found"}
                    </td>
                  </tr>
                ) : (
                  currentData.map((user) => (
                    <tr
                      key={user.username}
                      onClick={() => handleSearch(user.username)}
                      className="bg-gradient-to-r from-[#161a29] to-[#19191e]/60 hover:bg-gradient-to-r hover:from-[#1a1e2d] hover:to-[#1c1f25] transition-colors cursor-pointer"
                    >
                      <td className="py-3 px-6 text-sm font-medium text-white">
                        {user.rank}
                      </td>
                      <td className="py-3 px-6 text-sm font-medium text-white">
                        <div className="flex items-center gap-3">
                          <img
                            src={user.pfpUrl}
                            alt={user.displayName}
                            className="w-8 h-8 rounded-md"
                            loading="lazy"
                            onError={(e) => {
                              const img = e.target as HTMLImageElement;
                              img.src = "/assets/img/nopfp.png";
                              img.classList.add("bg-main-dark", "p-1");
                            }}
                          />
                          <span>{user.username}</span>
                        </div>
                      </td>
                      <td className="py-3 px-6 text-sm text-white">
                        {user.beetles.toLocaleString()}
                      </td>
                      <td className="py-3 px-6 text-sm text-white">
                        {typeof user.pokes === "number"
                          ? user.pokes.toLocaleString()
                          : user.pokes}
                      </td>
                      <td className="py-3 px-6 text-sm text-white">
                        {typeof user.socialCredit === "number"
                          ? user.socialCredit.toLocaleString()
                          : user.socialCredit}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex justify-between items-center mt-6">
            <div className="text-sm text-[#6e7787]">
              {data?.pagination ? (
                <>
                  <span className="hidden sm:inline">
                    Showing {(data.pagination.page - 1) * data.pagination.limit + 1}-{Math.min(data.pagination.page * data.pagination.limit, data.pagination.total)} of {data.pagination.total.toLocaleString()} users
                  </span>
                  <span className="sm:hidden">
                    Page {data.pagination.page} of {data.pagination.pages}
                  </span>
                </>
              ) : (
                "Loading..."
              )}
            </div>

            <div className="flex items-center space-x-3">
              {currentPage > 2 && (
                <button
                  onClick={() => goToPage(1)}
                  disabled={isLoading}
                  className="px-2 py-1 text-sm rounded-md transition-none bg-[#1d1f23] text-white border border-divider border-b-[#282a2f] border-b-2"
                  aria-label="First page"
                >
                  <i className="fa-regular fa-angles-left"></i>
                </button>
              )}
              <button
                onClick={() => goToPage(currentPage - 1)}
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
                      onClick={() => goToPage(pageNum)}
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
                      onClick={() => goToPage(pageNum)}
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
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage === totalPages || isLoading}
                className="px-3 py-1 text-sm rounded-md transition-none bg-[#1d1f23] text-white border border-divider border-b-[#282a2f] border-b-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
              {currentPage < totalPages - 1 && (
                <button
                  onClick={() => goToPage(totalPages)}
                  disabled={isLoading}
                  className="px-2 py-1 text-sm rounded-md transition-none bg-[#1d1f23] text-white border border-divider border-b-[#282a2f] border-b-2"
                  aria-label="Last page"
                >
                  <i className="fa-regular fa-angles-right"></i>
                </button>
              )}
            </div>
          </div>
        </section>
      </div>

      {/* Footer */}
      <footer className="bg-primary-blue py-8 mt-12">
        <div className="container mx-auto px-4 text-center">
          <a
            href="https://github.com/douvy/remilia-stats"
            className="text-[#f1f2f4] transition-colors border-b border-[#5175d1] pb-[1px] hover:border-[#f1f2f4]"
            target="_blank"
            rel="noopener noreferrer"
          >
            Star on GitHub
          </a>
        </div>
      </footer>
    </main>
  );
}
