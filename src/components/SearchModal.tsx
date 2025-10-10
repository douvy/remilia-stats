"use client";

import React, { useState, useEffect, useRef, FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { UserStats } from "@/types/remilia";

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSearch?: (query: string) => void;
  users?: UserStats[];
}

type SearchType = "users" | "beetles" | "pokes" | "socialCredit" | null;

export default function SearchModal({
  isOpen,
  onClose,
  onSearch,
  users = [],
}: SearchModalProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<SearchType>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // Reset search query and selected type when modal opens
  useEffect(() => {
    if (isOpen) {
      setSearchQuery("");
      setSelectedType(null);

      // Focus search input when modal opens
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  // Close modal when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        modalRef.current &&
        !modalRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onClose]);

  // Handle keyboard navigation
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (!isOpen) return;

      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  // Handler for type selection
  const handleTypeSelect = (type: SearchType, prefix: string) => {
    setSelectedType(type);
    setSearchQuery(prefix);

    // Focus the search input and position cursor at the end
    if (searchInputRef.current) {
      searchInputRef.current.focus();

      // Using setTimeout to ensure focus happens after state update
      setTimeout(() => {
        if (searchInputRef.current) {
          searchInputRef.current.selectionStart =
            searchInputRef.current.value.length;
          searchInputRef.current.selectionEnd =
            searchInputRef.current.value.length;
        }
      }, 0);
    }
  };

  // Handle user click - navigate to profile
  const handleUserClick = (username: string) => {
    router.push(`/${username}`);
    onClose();
  };

  // Handle search submission
  const handleSearchSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim() && searchResults.length > 0) {
      // Navigate to first result
      handleUserClick(searchResults[0].username);
    }
  };

  // Fetch actual top 5 leaderboards from API
  const [topBeetles, setTopBeetles] = useState<UserStats[]>([]);
  const [topPokes, setTopPokes] = useState<UserStats[]>([]);
  const [topSocialCredit, setTopSocialCredit] = useState<UserStats[]>([]);

  useEffect(() => {
    if (!isOpen) return;

    // Fetch top 5 for each category
    const fetchTopLeaderboards = async () => {
      try {
        const [beetlesRes, pokesRes, socialCreditRes] = await Promise.all([
          fetch('/api/leaderboard?sortBy=beetles&sortDirection=desc&limit=5&page=1'),
          fetch('/api/leaderboard?sortBy=pokes&sortDirection=desc&limit=5&page=1'),
          fetch('/api/leaderboard?sortBy=socialCredit&sortDirection=desc&limit=5&page=1'),
        ]);

        const [beetlesData, pokesData, socialCreditData] = await Promise.all([
          beetlesRes.json(),
          pokesRes.json(),
          socialCreditRes.json(),
        ]);

        setTopBeetles(beetlesData.users || []);
        setTopPokes(pokesData.users || []);
        setTopSocialCredit(socialCreditData.users || []);
      } catch (error) {
        console.error('Failed to fetch top leaderboards:', error);
      }
    };

    fetchTopLeaderboards();
  }, [isOpen]);

  // Use API to search all users, not just current page
  const [searchResults, setSearchResults] = useState<UserStats[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Debounced search effect
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setIsSearching(true);
      try {
        const response = await fetch(
          `/api/leaderboard?search=${encodeURIComponent(searchQuery.trim())}&limit=10`,
        );
        const data = await response.json();
        setSearchResults(
          data.users?.map((user: any) => ({
            rank: user.rank,
            username: user.username,
            displayName: user.displayName,
            pfpUrl: user.pfpUrl,
            beetles: user.beetles,
            pokes: user.pokes ?? "-",
            socialCredit: user.socialCredit ?? "-",
          })) || [],
        );
      } catch (error) {
        console.error("Search error:", error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300); // 300ms debounce

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center md:pt-32 md:px-4 overflow-y-auto bg-black/30">
      <div
        ref={modalRef}
        className="w-full h-full md:h-auto md:max-h-[70vh] md:max-w-[600px] bg-[#14161a] border-0 md:border border-[#23252a] md:rounded-md shadow-lg flex flex-col"
      >
        {/* Fixed Header */}
        <form
          onSubmit={handleSearchSubmit}
          className="sticky top-0 z-10 bg-[#14161a] border-b border-[#23252a] p-3 flex items-center"
        >
          <div className="flex-grow flex items-center gap-2 text-[#b8bdc7]">
            <i
              className="fa-regular fa-magnifying-glass"
              aria-hidden="true"
            ></i>
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search RemiliaNET users"
              className="flex-grow bg-transparent border-none focus:outline-none text-[#b8bdc7] placeholder-[#b8bdc7]/50 text-base"
            />
          </div>
          <div className="flex items-center">
            <div className="hidden sm:block h-5 px-1.5 max-w-max rounded-sm flex items-center gap-0.5 text-[.6875rem] font-bold text-gray-500 border border-gray-500/20 bg-gray-50/5">
              Esc
            </div>
            <button
              type="button"
              className="sm:hidden text-[#b8bdc7]/70 hover:text-[#b8bdc7] p-1"
              onClick={onClose}
            >
              <i className="fa-regular fa-xmark" aria-hidden="true"></i>
            </button>
          </div>
        </form>

        {/* Scrollable Content */}
        <div className="overflow-y-auto flex-grow">
          {searchQuery.trim() ? (
            /* SEARCH RESULTS */
            <div className="p-2">
              <h3 className="text-xs uppercase text-[#6e7687] px-2 py-1.5">
                Search Results{" "}
                {isSearching ? "(searching...)" : `(${searchResults.length})`}
              </h3>
              <div className="mt-1 space-y-0.5">
                {isSearching ? (
                  <div className="px-2 py-4 text-center text-[#6e7787]">
                    <i className="fa-regular fa-spinner fa-spin mr-2"></i>
                    Searching all users...
                  </div>
                ) : searchResults.length > 0 ? (
                  searchResults.map((user, index) => (
                    <div
                      key={user.username}
                      className="px-2 py-2.5 rounded flex items-center justify-between cursor-pointer hover:bg-[#23252a]"
                      onClick={() => handleUserClick(user.username)}
                    >
                      <div className="flex items-center gap-3">
                        <img
                          src={user.pfpUrl}
                          alt={user.displayName}
                          className="w-6 h-6 rounded-sm"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = "/nopfp.png";
                          }}
                        />
                        <span className="text-white">{user.username}</span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-[#b8bdc7]">
                        <span className="flex items-center gap-1.5">
                          <i className="fa-regular fa-bug text-soft-blue text-xs"></i>
                          {user.beetles}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <i className="fa-regular fa-hand-pointer text-soft-blue text-xs"></i>
                          {user.pokes}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <i className="fa-regular fa-badge text-soft-blue text-xs"></i>
                          {user.socialCredit}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="px-2 py-4 text-center text-[#6e7787]">
                    No users found matching "{searchQuery}"
                  </div>
                )}
              </div>
            </div>
          ) : (
            <>
              {/* TOP BEETLES LEADERBOARD */}
              <div className="p-2">
                <h3
                  className="text-xs uppercase px-2 py-1.5"
                  style={{ color: "#6e7687" }}
                >
                  Beetles
                </h3>
                <div className="mt-1 space-y-0.5">
                  {topBeetles.map((user, index) => {
                    return (
                      <div
                        key={user.username}
                        className="px-2 py-2.5 rounded flex items-center justify-between cursor-pointer hover:bg-[#23252a]"
                        onClick={() => handleUserClick(user.username)}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-blue-400 text-sm">
                            {index + 1}
                          </span>
                          <img
                            src={user.pfpUrl}
                            alt={user.displayName}
                            className="w-6 h-6 rounded-sm"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = "/nopfp.png";
                            }}
                          />
                          <span className="text-white text-sm">
                            {user.username}
                          </span>
                        </div>
                        <span className="text-[#b8bdc7] text-sm">
                          {user.beetles.toLocaleString()}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="border-t border-[#23252a] w-full"></div>
              {/* TOP POKES LEADERBOARD */}
              <div className="p-2">
                <h3
                  className="text-xs uppercase px-2 py-1.5"
                  style={{ color: "#6e7687" }}
                >
                  Pokes
                </h3>
                <div className="mt-1 space-y-0.5">
                  {topPokes.map((user, index) => {
                    return (
                      <div
                        key={user.username}
                        className="px-2 py-2.5 rounded flex items-center justify-between cursor-pointer hover:bg-[#23252a]"
                        onClick={() => handleUserClick(user.username)}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-blue-400 text-sm">
                            {index + 1}
                          </span>
                          <img
                            src={user.pfpUrl}
                            alt={user.displayName}
                            className="w-6 h-6 rounded-sm"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = "/nopfp.png";
                            }}
                          />
                          <span className="text-white text-sm">
                            {user.username}
                          </span>
                        </div>
                        <span className="text-[#b8bdc7] text-sm">
                          {user.pokes.toLocaleString()}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="border-t border-[#23252a] w-full"></div>
              {/* TOP SOCIAL CREDIT LEADERBOARD */}
              <div className="p-2">
                <h3
                  className="text-xs uppercase px-2 py-1.5"
                  style={{ color: "#6e7687" }}
                >
                  Social Credit
                </h3>
                <div className="mt-1 space-y-0.5">
                  {topSocialCredit.map((user, index) => {
                    return (
                      <div
                        key={user.username}
                        className="px-2 py-2.5 rounded flex items-center justify-between cursor-pointer hover:bg-[#23252a]"
                        onClick={() => handleUserClick(user.username)}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-blue-400 text-sm">
                            {index + 1}
                          </span>
                          <img
                            src={user.pfpUrl}
                            alt={user.displayName}
                            className="w-6 h-6 rounded-sm"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = "/nopfp.png";
                            }}
                          />
                          <span className="text-white text-sm">
                            {user.username}
                          </span>
                        </div>
                        <span className="text-[#b8bdc7] text-sm">
                          {user.socialCredit.toLocaleString()}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="h-2"></div> {/* Bottom spacing */}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
