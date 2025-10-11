interface CreditBreakdownPanelProps {
  breakdown: {
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
  };
  totalCredit: number;
}

export default function CreditBreakdownPanel({
  breakdown,
}: CreditBreakdownPanelProps) {
  const components = [
    { label: "Base Score", value: breakdown.base, isBonus: false },
    breakdown.onboarding > 0 && { label: "Onboarding", value: breakdown.onboarding, isBonus: true },
    breakdown.aggregateBonus > 0 && { label: "Activity", value: breakdown.aggregateBonus, isBonus: true },
    breakdown.friendBonus > 0 && { label: "Friends", value: breakdown.friendBonus, isBonus: true },
  ].filter(Boolean);

  const hasActivityScores = breakdown.aggregateScores &&
    Object.values(breakdown.aggregateScores).some(score => score > 0);

  return (
    <div className="pt-2">
      <h3 className="text-xs font-bold text-[#6e7787] uppercase tracking-wider mb-3">
        Social Credit
      </h3>

      <div className="flex flex-wrap gap-2 mb-3">
        {components.map((component: any) => {
          const isFriends = component.label === 'Friends';
          const valueColor = isFriends ? 'text-soft-lime-green' : 'text-[#dddfe4]';

          return (
            <div
              key={component.label}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 border border-[#252f43] rounded text-xs"
              style={{
                backgroundColor: '#181f2f',
                backgroundImage: `url("data:image/svg+xml,<svg width='6' height='6' viewBox='0 0 6 6' xmlns='http://www.w3.org/2000/svg'><rect x='0.5' y='0.5' width='1.5' height='1.5' fill='%23252f43'/></svg>")`,
              }}
            >
              <span className="text-[#979ba3]">{component.label}</span>
              <span className={`font-medium tabular-nums ${valueColor}`}>
                {component.isBonus ? '+' : ''}{component.value.toLocaleString()}
              </span>
            </div>
          );
        })}
      </div>

      {hasActivityScores && (
        <div className="pt-2">
          <p className="text-[10px] text-[#6e7787] uppercase tracking-wider mb-2">
            RemiliaNET Scores
          </p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(breakdown.aggregateScores)
              .filter(([_, score]) => score > 0)
              .sort(([_, a], [__, b]) => b - a)
              .map(([platform, score]) => (
                <div
                  key={platform}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#181f2f] border border-[#252f43] rounded text-xs"
                >
                  <span className="text-[#6e7787] capitalize">
                    {platform.replace("_", " ")}
                  </span>
                  <span className="text-[#dddfe4] font-medium tabular-nums">
                    {score.toLocaleString()}
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
