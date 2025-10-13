interface Achievement {
  id: number;
  title: string;
  description: string;
  grantedAt: string;
  grantMessage: string;
  type: string;
  season: number;
}

interface AchievementsProps {
  achievements: Achievement[];
  achievementsCount: number;
}

export default function Achievements({
  achievements,
  achievementsCount,
}: AchievementsProps) {
  return (
    <div>
      <h2 className="text-lg font-windsor-bold text-white mb-3">
        Achievements ({achievementsCount})
      </h2>
      <div className="bg-[#181a1f] border border-[#2d323b] shadow-[inset_0_-2px_0_0_#23252a] rounded-lg p-5">
        <div className="grid grid-cols-2 gap-3">
          {achievements.map((achievement) => (
            <div
              key={achievement.id}
              className="flex items-center gap-4 p-4 border border-[#252f43] rounded-md bg-[#141823] shadow-[0_4px_12px_rgba(24,28,41,0.5)]"
              style={{
                backgroundImage: `url("data:image/svg+xml,<svg width='6' height='6' viewBox='0 0 6 6' xmlns='http://www.w3.org/2000/svg'><rect x='0.5' y='0.5' width='1.5' height='1.5' fill='%231a2230'/></svg>")`,
              }}
            >
              <img
                src={`https://remilia.com/images/achievements/pfp-${String(achievement.id).padStart(3, "0")}.png`}
                alt={achievement.title}
                className="w-10 h-10 md:w-12 md:h-12 rounded-md flex-shrink-0"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
              <div className="flex-1 min-w-0">
                <h3 className="text-white font-windsor-bold text-xs md:text-sm">
                  {achievement.title}
                </h3>
                <p className="text-[#979ba3] text-xs hidden md:block">
                  {achievement.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
