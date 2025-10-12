"use client";

import React, { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import SearchModal from "./SearchModal";
import type { ConnectionStatus } from "@/types/api";
import type { UserStats } from "@/types/remilia";

interface HeaderProps {
  onSearch?: (query: string) => void;
  onReset?: () => void;
  users?: UserStats[];
  connectionStatus?: ConnectionStatus;
}

export default function Header({
  onSearch,
  onReset,
  users,
  connectionStatus = "connecting",
}: HeaderProps) {
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [showBeetleAnimation, setShowBeetleAnimation] = useState(false);
  const [beetleVariant, setBeetleVariant] = useState<'pond' | 'ladybug' | 'green' | 'golden-scarab'>('pond');

  // Ensure hydration matching by only showing client-side elements after mounting
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Check for random navigation flag on mount (desktop only)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const wasRandomNav = sessionStorage.getItem('randomNav');
      const variant = sessionStorage.getItem('beetleVariant') as 'pond' | 'ladybug' | 'green' | 'golden-scarab' | null;

      if (wasRandomNav === 'true' && window.innerWidth >= 768) {
        sessionStorage.removeItem('randomNav');
        sessionStorage.removeItem('beetleVariant');

        if (variant) {
          setBeetleVariant(variant);
        }
        setShowBeetleAnimation(true);

        // Play animation for 2s
        const timer = setTimeout(() => {
          setShowBeetleAnimation(false);
        }, 2000);

        return () => clearTimeout(timer);
      }
    } catch (error) {
      // sessionStorage can throw in private browsing mode
      console.warn('sessionStorage access failed:', error);
    }
  }, []);

  // Connection status helper
  const getConnectionConfig = (status: ConnectionStatus) => {
    switch (status) {
      case "connected":
        return {
          bgColor: "bg-soft-lime-green",
          text: "Connected",
          textColor: "text-[#b8bdc7]",
        };
      case "disconnected":
        return {
          bgColor: "bg-primary-dark",
          text: "Disconnected",
          textColor: "text-red-400",
        };
      case "connecting":
        return {
          bgColor: "bg-yellow-500",
          text: "Status",
          textColor: "text-silver-gray",
        };
      default:
        return {
          bgColor: "bg-gray-500",
          text: "Unknown",
          textColor: "text-gray-400",
        };
    }
  };

  const connectionConfig = getConnectionConfig(connectionStatus);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen((prev) => !prev);
  };

  // Handle random profile navigation
  const handleRandomProfile = useCallback(async () => {
    try {
      // Fetch random username
      const res = await fetch('/api/random');
      if (!res.ok) throw new Error('Failed to fetch random profile');
      const { username } = await res.json();

      // Set flag for destination page to play animation (desktop only)
      if (window.innerWidth >= 768) {
        try {
          // Randomize beetle variant
          const variants = ['pond', 'ladybug', 'green', 'golden-scarab'] as const;
          const variant = variants[Math.floor(Math.random() * variants.length)];
          sessionStorage.setItem('randomNav', 'true');
          sessionStorage.setItem('beetleVariant', variant);
        } catch (error) {
          // sessionStorage can throw in private browsing mode - graceful degradation
        }
      }

      // Navigate immediately
      router.push(`/${username}`);
    } catch (error) {
      console.error('Random profile failed:', error);
    }
  }, [router]);

  // Handle keyboard navigation
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && isMobileMenuOpen) {
        event.preventDefault();
        setIsMobileMenuOpen(false);
      }

      if (event.key === "/" && !isSearchModalOpen) {
        event.preventDefault();
        setIsSearchModalOpen(true);
      }

      // Only trigger random if no modifier keys (cmd, ctrl, shift)
      if (event.key === "r" && !isSearchModalOpen && !event.metaKey && !event.ctrlKey && !event.shiftKey) {
        event.preventDefault();
        handleRandomProfile();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isMobileMenuOpen, isSearchModalOpen, handleRandomProfile]);

  return (
    <>
      <header className="sticky top-0 z-50 bg-[#15171a] border-b border-[#1b2028] relative overflow-hidden">
        {/* Scurrying Beetle in Header - Desktop only */}
        {showBeetleAnimation && (
          <img
            src={`/assets/img/beetle-${beetleVariant}.png`}
            alt=""
            className="hidden md:block absolute top-1/2 md:right-[320px] w-8 h-8 animate-beetle-scurry pointer-events-none z-0"
          />
        )}
        <div className="container mx-auto px-4 py-3">
          <div className="relative flex items-center w-full">
            {/* Logo and Brand Name */}
            <div className="flex items-center">
              <Link href="/" className="inline-flex" onClick={onReset}>
                <div className="flex items-center">
                  <div className="flex-shrink-0 mr-2">
                    <Image
                      src="/assets/img/logo.png"
                      alt="Remilia Stats Logo"
                      width={34}
                      height={34}
                      className="h-7 w-7"
                    />
                  </div>
                  <span className="hidden sm:inline-block text-xl font-windsor-bold text-white ml-2 leading-none translate-y-[1px] pt-[3px]">
                    Remilia<span className="text-[#b8bdc7]">NET</span>
                  </span>
                </div>
              </Link>
            </div>

            {/* Mobile Actions - Only visible below md breakpoint */}
            <div className="md:hidden absolute right-0 top-1/2 -translate-y-1/2 flex items-center gap-2">
              <button
                type="button"
                className="flex items-center justify-center h-8 w-8 border border-divider rounded-md text-bright-blue focus:outline-none"
                aria-label="Search"
                onClick={() => setIsSearchModalOpen(true)}
              >
                <i
                  className="fa-regular fa-magnifying-glass"
                  aria-hidden="true"
                ></i>
              </button>
              <button
                type="button"
                className="flex items-center justify-center h-8 w-8 border border-divider rounded-md text-bright-blue focus:outline-none"
                aria-label="Toggle mobile menu"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              >
                <i className="fa-regular fa-bars" aria-hidden="true"></i>
              </button>
            </div>

            {/* Empty flex-grow div to push elements to the right */}
            <div className="flex-grow order-last md:order-none mt-2 md:mt-0"></div>

            <div className="hidden md:flex items-center gap-4">
              {/* Search Button */}
              <button
                onClick={() => setIsSearchModalOpen(true)}
                className="group select-none text-sm tracking-tight rounded-sm flex gap-2 items-center justify-center text-nowrap border transition-colors duration-75 text-[#b8bdc7] border-transparent hover:bg-[#202327] h-8 px-2.5"
              >
                <i
                  className="fa-regular fa-magnifying-glass"
                  aria-hidden="true"
                ></i>
                <span className="h-5 px-1.5 max-w-max rounded-xs flex items-center gap-0.5 text-[.6875rem] font-bold text-gray-500 border border-gray-500/20 bg-gray-900/10">
                  &nbsp;/&nbsp;
                </span>
              </button>

              {/* Random Profile Button */}
              <button
                onClick={handleRandomProfile}
                className="group px-3 py-1.5 bg-[#1b1d21] hover:bg-[#25272b] border border-[#343743] rounded-md transition-all text-sm shadow-[inset_0_-2px_0_0_#282a33] cursor-pointer flex items-center gap-2 text-white"
              >
                <span>Random</span>
                <kbd
                  aria-hidden="true"
                  className="h-5 px-1.5 max-w-max rounded-xs flex items-center text-[.6875rem] font-bold border leading-none bg-[#292a2c] group-hover:bg-[#25272b] border-[#353639] text-[#d2d5db] transition-colors"
                >
                  R
                </kbd>
              </button>

              {/* Connection Status */}
              <div className="flex items-center space-x-2 mr-4 ml-1 min-w-[105px]">
                <div className="relative">
                  <div
                    className={`h-2.5 w-2.5 rounded-full ${connectionConfig.bgColor}`}
                  ></div>
                  <div
                    className={`absolute inset-0 rounded-full ${connectionConfig.bgColor} opacity-75 ${connectionStatus === "connected" ? "animate-ping" : ""}`}
                  ></div>
                </div>
                <span className={`text-sm ${connectionConfig.textColor}`}>
                  {connectionConfig.text}
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Menu Tray */}
      {isMounted && (
        <div
          className={`fixed inset-0 z-40 bg-black/50 backdrop-blur-[0.5px] transition-opacity duration-300 md:hidden ${
            isMobileMenuOpen ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsMobileMenuOpen(false);
            }
          }}
        >
          <div
            className={`select-none absolute bottom-0 left-0 right-0 bg-[#121417] rounded-t-xl transition-transform duration-300 ease-in-out transform ${
              isMobileMenuOpen ? "translate-y-0" : "translate-y-full"
            }`}
          >
            <div className="w-full flex items-center justify-center pt-3 pb-1">
              <div className="w-16 h-1 bg-gray-300/20 rounded-full"></div>
            </div>
            <div className="p-5 space-y-5">
              {/* Search Button */}
              <div
                className="flex items-center justify-between cursor-pointer"
                onClick={() => setIsSearchModalOpen(true)}
              >
                <div className="flex items-center gap-3">
                  <i
                    className="fa-regular fa-magnifying-glass text-white"
                    aria-hidden="true"
                  ></i>
                  <span className="text-[#b8bdc7]">Search</span>
                </div>
              </div>

              {/* Connection Status */}
              <div className="flex items-center gap-3">
                <div className="flex items-center space-x-2">
                  <div className="relative">
                    <div
                      className={`h-2.5 w-2.5 rounded-full ${connectionConfig.bgColor}`}
                    ></div>
                    <div
                      className={`absolute inset-0 rounded-full ${connectionConfig.bgColor} opacity-75 ${connectionStatus === "connected" ? "animate-ping" : ""}`}
                    ></div>
                  </div>
                  <span className={`text-base ${connectionConfig.textColor}`}>
                    {connectionConfig.text}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-divider space-y-2">
                {/* Random Profile Button */}
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    handleRandomProfile();
                  }}
                  className="group w-full px-3 py-1.5 bg-[#1b1d21] hover:bg-[#25272b] border border-[#343743] rounded-md transition-all text-sm shadow-[inset_0_-2px_0_0_#282a33] cursor-pointer flex items-center justify-center gap-2 text-white"
                >
                  <span>Random</span>
                </button>

                {/* Close Button */}
                <button
                  type="button"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="w-full text-center text-white py-2"
                >
                  Close Menu
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Search Modal */}
      <SearchModal
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
        onSearch={onSearch || (() => {})}
        users={users || []}
      />
    </>
  );
}
