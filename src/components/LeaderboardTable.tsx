type SortField = "rank" | "beetles" | "pokes" | "socialCredit" | "user";
type SortDirection = "asc" | "desc";

interface User {
  rank: number;
  username: string;
  displayName: string;
  pfpUrl: string;
  beetles: number;
  pokes: number;
  socialCredit: number;
}

interface LeaderboardTableProps {
  users: User[];
  isLoading: boolean;
  searchQuery: string;
  sortField: SortField;
  sortDirection: SortDirection;
  onSort: (field: SortField) => void;
  onUserClick: (username: string) => void;
}

export default function LeaderboardTable({
  users,
  isLoading,
  searchQuery,
  sortField,
  sortDirection,
  onSort,
  onUserClick,
}: LeaderboardTableProps) {
  const getSortIcon = (field: SortField) => {
    if (field !== sortField) return "";
    return sortDirection === "desc"
      ? "fa-regular fa-angle-down text-white"
      : "fa-regular fa-angle-up text-white";
  };

  // Pre-compute rank counts for tie detection
  const rankCounts = users.reduce((acc, u) => {
    acc[u.rank] = (acc[u.rank] || 0) + 1;
    return acc;
  }, {} as Record<number, number>);

  const formatRank = (rank: number) => {
    return rankCounts[rank] > 1 ? `T${rank}` : rank.toString();
  };

  return (
    <div className="overflow-x-auto border border-[#243147] rounded-lg">
      <table className="min-w-full overflow-hidden table-fixed">
        <thead>
          <tr className="border-b border-[#20242b] bg-gradient-to-b from-[#22252c] to-[#16171b]">
            <th className="py-3 px-6 text-left text-xs font-medium text-[#6e7787] uppercase tracking-wider w-1/6">
              <button
                onClick={() => onSort("rank")}
                className="flex items-center gap-2 text-[#6e7787] hover:text-white transition-colors"
              >
                RANK
                <i className={`${getSortIcon("rank")} text-xs align-middle`} />
              </button>
            </th>
            <th className="py-3 px-6 text-left text-xs font-medium text-[#6e7787] uppercase tracking-wider w-1/3">
              <button
                onClick={() => onSort("user")}
                className="flex items-center gap-2 text-[#6e7787] hover:text-white transition-colors"
              >
                USER
                <i className={`${getSortIcon("user")} text-xs align-middle`} />
              </button>
            </th>
            <th className="py-3 px-6 text-left text-xs font-medium text-[#6e7787] uppercase tracking-wider w-1/6">
              <button
                onClick={() => onSort("beetles")}
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
                onClick={() => onSort("pokes")}
                className="flex items-center gap-2 text-[#6e7787] hover:text-white transition-colors"
              >
                POKES
                <i className={`${getSortIcon("pokes")} text-xs align-middle`} />
              </button>
            </th>
            <th className="py-3 px-6 text-left text-xs font-medium text-[#6e7787] uppercase tracking-wider w-1/6">
              <button
                onClick={() => onSort("socialCredit")}
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
        <tbody className="divide-y divide-[#20242b]">
          {isLoading && users.length === 0 ? (
            <>
              {[...Array(10)].map((_, i) => (
                <tr key={i} className="bg-[#171924]">
                  <td className="py-3 px-6">
                    <div className="h-5 w-8 bg-[#20222a] rounded animate-pulse"></div>
                  </td>
                  <td className="py-3 px-6">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-[#20222a] rounded-md animate-pulse"></div>
                      <div className="h-5 w-24 bg-[#20222a] rounded animate-pulse"></div>
                    </div>
                  </td>
                  <td className="py-3 px-6">
                    <div className="h-5 w-12 bg-[#20222a] rounded animate-pulse"></div>
                  </td>
                  <td className="py-3 px-6">
                    <div className="h-5 w-14 bg-[#20222a] rounded animate-pulse"></div>
                  </td>
                  <td className="py-3 px-6">
                    <div className="h-5 w-16 bg-[#20222a] rounded animate-pulse"></div>
                  </td>
                </tr>
              ))}
            </>
          ) : users.length === 0 ? (
            <tr>
              <td colSpan={5} className="py-12 text-center text-[#6e7787]">
                {searchQuery
                  ? `No users found matching "${searchQuery}"`
                  : "No users found"}
              </td>
            </tr>
          ) : (
            users.map((user, index) => (
              <tr
                key={user.username}
                onClick={() => onUserClick(user.username)}
                className="bg-background hover:bg-[#171c29] transition-colors cursor-pointer"
              >
                <td className="py-3 px-6 text-sm font-medium text-white">
                  {formatRank(user.rank)}
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
  );
}
