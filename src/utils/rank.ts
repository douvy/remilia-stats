// Helper to format rank with visual hierarchy and context
export const getRankDisplay = (rank: number, totalUsers?: number) => {
  if (!rank) return null;

  // Calculate percentile if we have total
  const percentile = totalUsers ? Math.round((rank / totalUsers) * 100) : null;

  // Determine tier and color
  let tierColor = "text-[#979ba3]"; // Default gray

  if (rank <= 50) {
    tierColor = "text-soft-lime-green"; // Lime green for top 50
  }

  return {
    text: `#${rank.toLocaleString()}`,
    tooltip: percentile ? `TOP ${percentile}%` : null,
    color: tierColor,
    icon: "",
    iconColor: "",
  };
};
