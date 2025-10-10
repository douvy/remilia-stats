interface LeaderboardHeaderProps {
  searchQuery: string;
  searchResultCount: number;
  totalUsers: number;
  lastUpdated: string | null;
  firstResult?: {
    pfpUrl: string;
    displayName: string;
  } | null;
  onClearSearch: () => void;
}

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

export default function LeaderboardHeader({
  searchQuery,
  searchResultCount,
  totalUsers,
  lastUpdated,
  firstResult,
  onClearSearch,
}: LeaderboardHeaderProps) {
  return (
    <div className="mb-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        {searchQuery ? (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-[#1a1c21] border border-[#2d2f36] rounded-md px-3 py-1">
              {firstResult && (
                <img
                  src={firstResult.pfpUrl}
                  alt={firstResult.displayName}
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
                ({searchResultCount})
              </span>
            </div>
            <button
              onClick={onClearSearch}
              className="px-3 py-1 text-sm rounded-md transition-none bg-[#1d1f23] text-white border border-divider border-b-[#282a2f] border-b-2"
            >
              Clear
            </button>
          </div>
        ) : (
          <>
            {/* Mobile: split layout */}
            <div className="flex justify-between items-center w-full sm:hidden">
              <div className="text-sm text-[#6e7787]">
                <span>{totalUsers.toLocaleString()} users</span>
              </div>
              {lastUpdated && (
                <div className="text-xs text-[#6e7787]">
                  Updated {formatRelativeTime(lastUpdated)}
                </div>
              )}
            </div>

            {/* Desktop: left aligned */}
            <div className="text-sm text-[#6e7787] hidden sm:block">
              Showing {totalUsers.toLocaleString()} users
            </div>

            {/* Desktop: right aligned */}
            {lastUpdated && (
              <div className="text-xs text-[#6e7787] hidden sm:block">
                Updated {formatRelativeTime(lastUpdated)}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
