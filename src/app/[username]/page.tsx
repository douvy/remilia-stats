"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import Header from "@/components/Header";
import ProfileStat from "@/components/ProfileStat";
import CreditBreakdownPanel from "@/components/CreditBreakdownPanel";
import Bio from "@/components/Bio";
import Friends from "@/components/Friends";
import Achievements from "@/components/Achievements";
import SocialCreditIcon from "@/components/SocialCreditIcon";
import Footer from "@/components/Footer";
import type { ConnectionStatus } from "@/types/api";

interface Achievement {
  id: number;
  title: string;
  description: string;
  grantedAt: string;
  grantMessage: string;
  type: string;
  season: number;
}

interface SocialCreditBreakdown {
  base: number;
  onboarding: number;
  aggregateBonus: number;
  aggregateScores: {
    miladychan: number;
    twitter: number;
    profiles: number;
    beetle_game: number;
    miladycraft: number;
    ethereum: number;
  };
  friendBonus: number;
  final: number;
}

interface UserProfile {
  username: string;
  displayName: string;
  pfpUrl: string;
  beetles: number;
  pokes: number;
  socialCredit: number;
  socialCreditBreakdown?: SocialCreditBreakdown;
  friendCount: number;
  achievementsCount: number;
  achievementsDisplayed: Achievement[];
  bio: string;
  location: string;
  cover: string;
  connections: Array<{ type: string; username: string }>;
  friendsDisplayed: Array<{
    displayUsername: string;
    displayName: string;
    pfpUrl: string;
    cover?: string;
  }>;
  rank?: number | null;
  pokesRank?: number | null;
  socialCreditRank?: number | null;
}

export default function UserProfilePage() {
  const params = useParams();
  const router = useRouter();
  const username = params.username as string;
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalUsers, setTotalUsers] = useState<number | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  // Connection status
  const connectionStatus: ConnectionStatus = useMemo(() => {
    if (loading) return "connecting";
    if (error) return "disconnected";
    if (profile) return "connected";
    return "connecting";
  }, [profile, error, loading]);

  // Format relative time helper
  const formatRelativeTime = (timestamp: string) => {
    const now = new Date();
    const then = new Date(timestamp);
    const diffInMs = now.getTime() - then.getTime();
    const diffInMinutes = Math.floor(diffInMs / 60000);
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInMinutes < 1) return "just now";
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInDays < 7) return `${diffInDays}d ago`;

    return then.toLocaleDateString();
  };

  useEffect(() => {
    async function fetchProfile() {
      try {
        // Fetch profile and leaderboard rank in parallel
        const [profileRes, rankRes, statsRes] = await Promise.all([
          fetch(`/api/profile/${username}`),
          fetch(`/api/leaderboard?search=${username}&limit=1`),
          fetch(`/api/leaderboard?limit=1`), // Get total user count
        ]);

        if (!profileRes.ok) throw new Error("Profile not found");
        const data = await profileRes.json();

        // Parse the Remilia API response structure
        if (!data.user) throw new Error("Invalid profile data");

        // Extract lastUpdated from meta
        if (data.meta?.lastUpdated) {
          setLastUpdated(data.meta.lastUpdated);
        }

        // Get ranks from leaderboard if available
        const rankData = rankRes.ok ? await rankRes.json() : null;
        const userRank = rankData?.users?.[0]?.rank || null;
        const pokesRank = rankData?.users?.[0]?.pokesRank || null;
        const socialCreditRank = rankData?.users?.[0]?.socialCreditRank || null;

        // Get total users for percentile calculation
        const statsData = statsRes.ok ? await statsRes.json() : null;
        setTotalUsers(statsData?.meta?.totalUsers || null);

        // Fetch cover images for friends
        const friendsWithCovers = await Promise.all(
          (data.user.friendsDisplayed || []).map(async (friend: any) => {
            try {
              const friendRes = await fetch(
                `/api/profile/${friend.displayUsername}`,
              );
              if (friendRes.ok) {
                const friendData = await friendRes.json();
                return {
                  ...friend,
                  cover: friendData.user?.cover || null,
                };
              }
            } catch {
              // If fetch fails, return friend without cover
            }
            return { ...friend, cover: null };
          }),
        );

        setProfile({
          username: data.user.username,
          displayName: data.user.displayName,
          pfpUrl: data.user.pfpUrl,
          beetles: data.user.beetles || 0,
          pokes: data.user.pokes || 0,
          socialCredit: data.user.socialCredit?.score || 0,
          socialCreditBreakdown:
            data.user.socialCredit?.components || undefined,
          friendCount: data.user.friendCount || 0,
          achievementsCount: data.user.achievementsCount || 0,
          achievementsDisplayed: data.user.achievementsDisplayed || [],
          bio: data.user.bio || "",
          location: data.user.location || "",
          cover: data.user.cover || "",
          connections: data.user.connections || [],
          friendsDisplayed: friendsWithCovers,
          rank: userRank,
          pokesRank: pokesRank,
          socialCreditRank: socialCreditRank,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load profile");
      } finally {
        setLoading(false);
      }
    }
    fetchProfile();
  }, [username]);

  if (loading) {
    return (
      <main className="min-h-screen flex flex-col">
        <div className="bg-background bg-grid-pattern bg-grid-size pb-[415px] md:pb-[445px]">
          <Header connectionStatus={connectionStatus} />
        </div>
        <div className="bg-[#141519] border-t border-[#1c2029] flex-grow flex flex-col">
          <div className="container mx-auto px-4 max-w-7xl -mt-[393px] md:-mt-[428px]">
            <div className="flex items-center justify-center py-32">
              <div className="text-[#6e7787]">
                <i className="fas fa-spinner fa-spin text-2xl"></i>
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (error || !profile) {
    return (
      <main className="min-h-screen flex flex-col">
        <div className="bg-background bg-grid-pattern bg-grid-size pb-[415px] md:pb-[445px]">
          <Header connectionStatus={connectionStatus} />
        </div>
        <div className="bg-[#141519] border-t border-[#1c2029] flex-grow flex flex-col">
          <div className="container mx-auto px-4 max-w-7xl -mt-[393px] md:-mt-[428px]">
            <div className="flex items-center justify-center py-32">
              <div className="text-center">
                <p className="text-red-400 mb-4">
                  {error || "Profile not found"}
                </p>
                <button
                  onClick={() => router.push("/")}
                  className="px-4 py-2 bg-primary-blue text-white rounded-md"
                >
                  Back to Leaderboard
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col">
      <div className="bg-background bg-grid-pattern bg-grid-size pb-[415px] md:pb-[445px]">
        <Header connectionStatus={connectionStatus} />
      </div>
      <div className="bg-[#141519] border-t border-[#1c2029] flex-grow flex flex-col">
        <div className="container mx-auto px-4 max-w-7xl -mt-[393px] md:-mt-[428px]">
          {/* Breadcrumb */}
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => router.push("/")}
              className="flex items-center gap-2 text-soft-blue cursor-pointer"
            >
              <i className="fa-regular fa-arrow-left"></i>
              <span className="underline decoration-[#2f3847] hover:decoration-[#5584cf] transition-colors">Leaderboard</span>
            </button>
            {lastUpdated && (
              <div className="text-xs text-[#6e7787]">
                Updated {formatRelativeTime(lastUpdated)}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column - Profile Card & Stats */}
            <div className="space-y-6">
              <div className="relative bg-[#181a1f] border border-[#2d323b] shadow-[inset_0_-2px_0_0_#23252a] rounded-lg p-5 overflow-hidden">
                {profile.cover && (
                  <>
                    {/* Base Cover Image */}
                    <div
                      className="absolute inset-0"
                      style={{
                        backgroundImage: `url(https://remilia.com/covers/${profile.cover}.png)`,
                        backgroundSize: "200%",
                        backgroundPosition: "30% 30%",
                        imageRendering: "pixelated",
                        filter: "contrast(1.1) saturate(0.9) brightness(1.1)",
                      }}
                    />

                    {/* Subtle RGB Dither Grid */}
                    <div
                      className="absolute inset-0 opacity-20"
                      style={{
                        backgroundImage: `
                        repeating-linear-gradient(90deg, rgba(255,0,0,0.15) 0px, transparent 1px, rgba(0,255,0,0.15) 1px, transparent 2px, rgba(0,0,255,0.15) 2px, transparent 3px)
                      `,
                        backgroundSize: "3px 100%",
                        mixBlendMode: "overlay",
                      }}
                    />

                    {/* Light Scanlines */}
                    <div
                      className="absolute inset-0 opacity-25"
                      style={{
                        backgroundImage:
                          "repeating-linear-gradient(0deg, rgba(0,0,0,0.2) 0px, transparent 1px, transparent 2px)",
                        backgroundSize: "100% 2px",
                      }}
                    />

                    {/* Gradient Overlay for Readability */}
                    <div
                      className="absolute inset-0"
                      style={{
                        background:
                          "linear-gradient(180deg, rgba(22, 26, 41, 0.3), rgba(25, 25, 30, 0.6))",
                      }}
                    />
                  </>
                )}
                <div className="relative flex items-center gap-4 min-h-[200px]">
                  <img
                    src={profile.pfpUrl}
                    alt={profile.displayName}
                    className="w-40 h-40 rounded-lg flex-shrink-0"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        "/assets/img/nopfp.png";
                    }}
                  />
                  <div className="min-w-0">
                    <h1 className="text-2xl font-windsor-bold text-white mb-1 truncate">
                      {profile.displayName}
                    </h1>
                    <p className="text-white text-lg">~{profile.username}</p>
                  </div>
                </div>
              </div>

              {/* Stats Card */}
              <div className="bg-[#181a1f] border border-[#2d323b] shadow-[inset_0_-2px_0_0_#23252a] rounded-lg p-5">
                <div className="space-y-3 mb-6">
                  <div className="flex gap-3 [&>*]:w-fit">
                    <ProfileStat
                      label="Beetles"
                      value={profile.beetles}
                      icon={<i className="fa-regular fa-bug text-soft-blue text-xs"></i>}
                      rank={profile.rank}
                      totalUsers={totalUsers}
                    />
                    <ProfileStat
                      label="Pokes"
                      value={profile.pokes}
                      icon={<i className="fa-regular fa-hand-point-up text-soft-blue text-xs"></i>}
                      rank={profile.pokesRank}
                      totalUsers={totalUsers}
                    />
                    <ProfileStat
                      label="Social Credit"
                      value={profile.socialCredit}
                      icon={<SocialCreditIcon className="w-3.5 h-3.5 flex-shrink-0" />}
                      rank={profile.socialCreditRank}
                      totalUsers={totalUsers}
                    />
                  </div>
                  <div className="flex gap-3 [&>*]:w-fit">
                    <ProfileStat
                      label="Friends"
                      value={profile.friendCount}
                      icon={<i className="fa-regular fa-users text-soft-blue text-xs"></i>}
                    />
                    <ProfileStat
                      label="Achievements"
                      value={profile.achievementsCount}
                      icon={<i className="fa-regular fa-badge text-soft-blue text-xs"></i>}
                    />
                  </div>
                </div>

                {profile.socialCreditBreakdown && (
                  <CreditBreakdownPanel
                    breakdown={profile.socialCreditBreakdown}
                    totalCredit={profile.socialCredit}
                  />
                )}

                {/* View on RemiliaNET */}
                <a
                  href={`https://remilia.com/~${profile.username}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block mt-6 px-4 py-2 bg-primary-blue text-[#f1f2f4] rounded-md text-center hover:bg-primary-dark-blue transition-colors shadow-[inset_0_-2px_0_0_#16368e] hover:shadow-[inset_0_-2px_0_0_#0d1b45]"
                >
                  View on RemiliaNET
                </a>
              </div>
            </div>

            {/* Right Column - Scrollable Content */}
            <div className="space-y-6">
              {profile.bio && (
                <Bio
                  pfpUrl={profile.pfpUrl}
                  displayName={profile.displayName}
                  username={profile.username}
                  bio={profile.bio}
                  connections={profile.connections}
                />
              )}

              {profile.friendsDisplayed &&
                profile.friendsDisplayed.length > 0 && (
                  <Friends
                    friends={profile.friendsDisplayed}
                    friendCount={profile.friendCount}
                    onFriendClick={(username) => router.push(`/${username}`)}
                  />
                )}

              {profile.achievementsDisplayed &&
                profile.achievementsDisplayed.length > 0 && (
                  <Achievements
                    achievements={profile.achievementsDisplayed}
                    achievementsCount={profile.achievementsCount}
                  />
                )}
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </main>
  );
}
