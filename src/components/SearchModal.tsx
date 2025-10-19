"use client";

import React, { useState, useEffect, useRef, FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { UserStats } from "@/types/remilia";
import SocialCreditIcon from "./SocialCreditIcon";

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
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [searchResults, setSearchResults] = useState<UserStats[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // Reset search query and selected type when modal opens
  useEffect(() => {
    if (isOpen) {
      setSearchQuery("");
      setSelectedType(null);
      setSelectedIndex(0);

      // Focus search input when modal opens
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  // Reset selected index when search results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [searchResults.length]);

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
        return;
      }

      // Only handle arrow keys and enter when we have search results
      if (searchQuery.trim() && searchResults.length > 0) {
        if (event.key === "ArrowDown") {
          event.preventDefault();
          setSelectedIndex((prev) =>
            prev < searchResults.length - 1 ? prev + 1 : prev,
          );
        } else if (event.key === "ArrowUp") {
          event.preventDefault();
          setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0));
        } else if (event.key === "Enter") {
          event.preventDefault();
          if (searchResults[selectedIndex]) {
            handleUserClick(searchResults[selectedIndex].username);
          }
        }
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose, searchQuery, searchResults, selectedIndex]);

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
      // Navigate to selected result
      handleUserClick(searchResults[selectedIndex].username);
    }
  };

  // Fetch actual top 5 leaderboards from API
  const [topBeetles, setTopBeetles] = useState<UserStats[]>([]);
  const [topPokes, setTopPokes] = useState<UserStats[]>([]);
  const [topSocialCredit, setTopSocialCredit] = useState<UserStats[]>([]);
  const [isLoadingLeaderboards, setIsLoadingLeaderboards] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    // Fetch top 5 for each category
    const fetchTopLeaderboards = async () => {
      setIsLoadingLeaderboards(true);
      try {
        const [beetlesRes, pokesRes, socialCreditRes] = await Promise.all([
          fetch(
            "/api/leaderboard?sortBy=beetles&sortDirection=desc&limit=5&page=1",
          ),
          fetch(
            "/api/leaderboard?sortBy=pokes&sortDirection=desc&limit=5&page=1",
          ),
          fetch(
            "/api/leaderboard?sortBy=socialCredit&sortDirection=desc&limit=5&page=1",
          ),
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
        console.error("Failed to fetch top leaderboards:", error);
      } finally {
        setIsLoadingLeaderboards(false);
      }
    };

    fetchTopLeaderboards();
  }, [isOpen]);

  // Debounced search effect
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.trim().length < 3) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const timeoutId = setTimeout(async () => {
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
    }, 200); // 200ms debounce

    return () => {
      clearTimeout(timeoutId);
      setIsSearching(false);
    };
  }, [searchQuery]);

  if (!isOpen) return null;

  // Skeleton row component for loading state
  const SkeletonRow = () => (
    <div className="px-2 py-2.5 rounded flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-3 h-4 bg-[#23252a] rounded animate-pulse"></div>
        <div className="w-6 h-6 bg-[#23252a] rounded-sm animate-pulse"></div>
        <div className="h-4 w-24 bg-[#23252a] rounded animate-pulse"></div>
      </div>
      <div className="h-4 w-12 bg-[#23252a] rounded animate-pulse"></div>
    </div>
  );

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
              <div className="text-xs uppercase text-[#6e7688] px-2 py-1.5 font-windsor-bold">
                Search Results{" "}
                {isSearching ? "(searching...)" : `(${searchResults.length})`}
              </div>
              <div className="mt-1 space-y-0.5">
                {searchQuery.trim().length < 3 ? (
                  <div className="px-2 py-8 text-center text-white text-base">
                    <i className="fa-regular fa-bug mr-2"></i>
                    Type 3+ characters to search
                  </div>
                ) : isSearching ? (
                  <div className="px-2 py-8 text-center text-white text-base">
                    <i className="fa-regular fa-bug animate-bounce mr-2"></i>
                    Searching all users...
                  </div>
                ) : searchResults.length > 0 ? (
                  searchResults.map((user, index) => (
                    <div
                      key={user.username}
                      className={`px-2 py-2.5 rounded flex items-center justify-between cursor-pointer hover:bg-[#23252a] ${
                        index === selectedIndex ? "bg-[#23252a]" : ""
                      }`}
                      onClick={() => handleUserClick(user.username)}
                      onMouseEnter={() => setSelectedIndex(index)}
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
                          <SocialCreditIcon className="w-4 h-4" />
                          {user.socialCredit}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="px-2 py-8 text-center">
                    <div className="text-white text-base mb-3">
                      No users found matching "{searchQuery}"
                    </div>
                    <button
                      onClick={() => setSearchQuery("")}
                      className="px-3 py-1.5 bg-[#1b1d21] hover:bg-[#25272b] border border-[#343743] rounded-md transition-all text-sm shadow-[inset_0_-2px_0_0_#282a33] cursor-pointer text-white"
                    >
                      Clear search
                    </button>
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
                  {isLoadingLeaderboards ? (
                    <>
                      {[1, 2, 3, 4, 5].map((i) => (
                        <SkeletonRow key={i} />
                      ))}
                    </>
                  ) : (
                    topBeetles.map((user, index) => {
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
                                (e.target as HTMLImageElement).src =
                                  "/nopfp.png";
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
                    })
                  )}
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
                  {isLoadingLeaderboards ? (
                    <>
                      {[1, 2, 3, 4, 5].map((i) => (
                        <SkeletonRow key={i} />
                      ))}
                    </>
                  ) : (
                    topPokes.map((user, index) => {
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
                                (e.target as HTMLImageElement).src =
                                  "/nopfp.png";
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
                    })
                  )}
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
                  {isLoadingLeaderboards ? (
                    <>
                      {[1, 2, 3, 4, 5].map((i) => (
                        <SkeletonRow key={i} />
                      ))}
                    </>
                  ) : (
                    topSocialCredit.map((user, index) => {
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
                                (e.target as HTMLImageElement).src =
                                  "/nopfp.png";
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
                    })
                  )}
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
