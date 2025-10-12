interface Friend {
  displayUsername: string;
  displayName: string;
  pfpUrl: string;
  cover?: string;
}

interface FriendsProps {
  friends: Friend[];
  friendCount: number;
  onFriendClick: (username: string) => void;
}

export default function Friends({
  friends,
  friendCount,
  onFriendClick,
}: FriendsProps) {
  return (
    <div>
      <h2 className="text-lg font-windsor-bold text-white mb-3">
        Friends ({friendCount.toLocaleString()})
      </h2>
      <div className="bg-[#181a1f] border border-[#2d323b] shadow-[inset_0_-2px_0_0_#23252a] rounded-lg p-5">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {friends.slice(0, 6).map((friend) => (
            <div
              key={friend.displayUsername}
              onClick={() => onFriendClick(friend.displayUsername)}
              className="relative flex items-center gap-3 p-3 bg-[#151619] border border-divider rounded-md hover:bg-[#181a1f] transition-colors cursor-pointer overflow-hidden"
            >
              {friend.cover && (
                <>
                  {/* Base Cover Image */}
                  <div
                    className="absolute inset-0 bg-cover bg-center"
                    style={{
                      backgroundImage: `url(https://remilia.com/covers/${friend.cover}.png)`,
                      imageRendering: "pixelated",
                      filter: "contrast(1.1) saturate(0.9) brightness(0.85)",
                    }}
                  />

                  {/* RGB Dither Grid */}
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

                  {/* Scanlines */}
                  <div
                    className="absolute inset-0 opacity-25"
                    style={{
                      backgroundImage:
                        "repeating-linear-gradient(0deg, rgba(0,0,0,0.2) 0px, transparent 1px, transparent 2px)",
                      backgroundSize: "100% 2px",
                    }}
                  />

                  {/* Gradient overlay for readability */}
                  <div
                    className="absolute inset-0"
                    style={{
                      background:
                        "linear-gradient(180deg, rgba(24, 25, 30, 0.6), rgba(24, 25, 30, 0.8))",
                    }}
                  />
                </>
              )}

              <img
                src={friend.pfpUrl}
                alt={friend.displayName}
                className="w-14 h-14 md:w-16 md:h-16 rounded-md flex-shrink-0 relative z-10"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "/assets/img/nopfp.png";
                }}
              />
              <div className="min-w-0 relative z-10">
                <p className="text-white text-sm font-medium truncate">
                  {friend.displayName}
                </p>
                <p className="text-[#e5e7eb] text-xs truncate">
                  ~{friend.displayUsername}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
