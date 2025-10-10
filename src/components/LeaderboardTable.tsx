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
            <tr>
              <td colSpan={5} className="py-12 text-center text-[#6e7787]">
                <i className="fas fa-spinner fa-spin text-2xl mb-2 block" />
                Loading leaderboard...
              </td>
            </tr>
          ) : users.length === 0 ? (
            <tr>
              <td colSpan={5} className="py-12 text-center text-[#6e7787]">
                {searchQuery
                  ? `No users found matching "${searchQuery}"`
                  : "No users found"}
              </td>
            </tr>
          ) : (
            users.map((user) => (
              <tr
                key={user.username}
                onClick={() => onUserClick(user.username)}
                className="bg-[#171924] hover:bg-[#1a1d2a] transition-colors cursor-pointer"
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
  );
}
