"use client";

import { getRankDisplay } from "@/utils/rank";
import { ReactNode, useState } from "react";

interface ProfileStatProps {
  label: string;
  value: string | number;
  icon: ReactNode;
  rank?: number | null;
  totalUsers?: number | null;
}

export default function ProfileStat({
  label,
  value,
  icon,
  rank,
  totalUsers,
}: ProfileStatProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const rankInfo = rank ? getRankDisplay(rank, totalUsers || undefined) : null;
  const tooltipText = rankInfo?.tooltip || undefined;

  return (
    <div className="inline-flex flex-col gap-1">
      <span className="text-[10px] font-bold text-[#6e7787] uppercase tracking-wider">
        {label}
      </span>
      <div
        className={`relative flex items-center gap-1.5 px-2 py-1.5 bg-[#151619] border border-divider rounded-md w-fit ${tooltipText ? 'tooltip-container cursor-pointer md:cursor-default' : ''}`}
        data-tooltip={tooltipText}
        onClick={() => tooltipText && setShowTooltip(!showTooltip)}
      >
        {icon}
        <span className="text-white text-base font-medium">
          {typeof value === "number" ? value.toLocaleString() : value}
        </span>
        {rankInfo && (
          <span className={`flex items-center gap-1 text-xs font-medium ${rankInfo.color} ml-auto self-start`}>
            {rankInfo.text}
            {rankInfo.icon && <i className={`${rankInfo.icon} ${rankInfo.iconColor} text-[9px]`}></i>}
          </span>
        )}

        {/* Mobile tooltip */}
        {tooltipText && showTooltip && (
          <div className="md:hidden absolute bottom-full left-1/2 -translate-x-1/2 -translate-y-2 px-2 py-1 bg-[#161a29] text-[#b8bdc7] text-[11px] rounded border border-divider whitespace-nowrap z-50 shadow-lg">
            {tooltipText}
          </div>
        )}
      </div>
    </div>
  );
}
