"use client";

import Header from "@/components/Header";
import StatsCards from "@/components/StatsCards";
import LeaderboardHeader from "@/components/LeaderboardHeader";
import LeaderboardTable from "@/components/LeaderboardTable";
import Pagination from "@/components/Pagination";
import Footer from "@/components/Footer";
import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
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

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    const error = new Error(`API error: ${res.status}`);
    try {
      const data = await res.json();
      error.message = data.error || error.message;
    } catch {
      // Response isn't JSON, use status text
      error.message = res.statusText || error.message;
    }
    throw error;
  }
  return res.json();
};

type SortField = "rank" | "beetles" | "pokes" | "socialCredit" | "user";
type SortDirection = "asc" | "desc";

export default function Home() {
  const router = useRouter();
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<SortField>("beetles");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
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
      keepPreviousData: true,
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

  return (
    <main className="min-h-screen flex flex-col">
      <Header
        onSearch={handleSearch}
        onReset={() => setCurrentPage(1)}
        users={users}
        connectionStatus={connectionStatus}
      />
      {/* Top section with grid pattern */}
      <div className="bg-background bg-grid-pattern bg-grid-size pb-52 md:pb-64">
        <div className="container mx-auto px-4 py-8 max-w-7xl">
          <StatsCards
            totalUsers={data?.meta?.totalUsers || 0}
            totalPokes={data?.meta?.totalPokes || 0}
            activeUsers={data?.meta?.activeUsers || 0}
          />
        </div>
      </div>

      {/* Bottom section with darker background */}
      <div className="bg-[#141519] border-t border-[#1c2029] flex-grow flex flex-col">
        <div className="container mx-auto px-4 max-w-7xl">
          <section className="-mt-[230px] md:-mt-[292px]">
            <LeaderboardHeader
              searchQuery={searchQuery}
              searchResultCount={data?.pagination?.total || 0}
              totalUsers={data?.pagination?.total || 0}
              lastUpdated={data?.meta?.lastUpdated || null}
              firstResult={
                currentData.length > 0 && currentData[0]
                  ? {
                      pfpUrl: currentData[0].pfpUrl,
                      displayName: currentData[0].displayName,
                    }
                  : null
              }
              onClearSearch={() => handleSearch("")}
            />

            {error ? (
              <div className="mb-6 text-red-400">
                <i className="fa-regular fa-circle-info mr-2" />
                {error?.message || "Failed to load leaderboard"}
              </div>
            ) : null}

            <LeaderboardTable
              users={currentData}
              isLoading={isLoading}
              searchQuery={searchQuery}
              sortField={sortField}
              sortDirection={sortDirection}
              onSort={handleSort}
              onUserClick={(username) => router.push(`/${username}`)}
            />

            {data?.pagination && (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                total={data.pagination.total}
                limit={data.pagination.limit}
                isLoading={isLoading}
                onPageChange={goToPage}
              />
            )}
          </section>
        </div>
      </div>

      <Footer />
    </main>
  );
}
