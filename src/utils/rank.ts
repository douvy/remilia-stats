// Helper to format rank with visual hierarchy and context
export const getRankDisplay = (rank: number, totalUsers?: number) => {
  if (!rank) return null;

  // Calculate percentile if we have total
  const percentile = totalUsers ? Math.round((rank / totalUsers) * 100) : null;

  // Determine tier and color
  let tierColor = "text-[#979ba3]"; // Default gray
  let iconClass = "";
  let iconColor = "";
  let tierName = "";

  if (rank <= 10) {
    tierColor = "text-yellow";
    iconClass = "fa-regular fa-star-shooting";
    iconColor = "text-yellow";
    tierName = "TOP 10";
  } else if (rank <= 25) {
    tierColor = "text-yellow";
    iconClass = "fa-regular fa-stars";
    iconColor = "text-yellow";
    tierName = "TOP 25";
  } else if (rank <= 50) {
    tierColor = "text-yellow";
    iconClass = "fa-regular fa-star";
    iconColor = "text-yellow";
    tierName = "TOP 50";
  } else if (rank <= 100) {
    tierColor = "text-soft-lime-green";
    tierName = "TOP 100";
  }

  return {
    text: `#${rank.toLocaleString()}`,
    tooltip: percentile ? `TOP ${percentile}%` : null,
    color: tierColor,
    icon: iconClass,
    iconColor,
  };
};
