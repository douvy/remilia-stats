interface BioProps {
  pfpUrl: string;
  displayName: string;
  username: string;
  bio: string;
  connections: Array<{ type: string; username: string }>;
}

export default function Bio({
  pfpUrl,
  displayName,
  username,
  bio,
  connections,
}: BioProps) {
  return (
    <div className="bg-[#181a1f] border border-[#2d323b] shadow-[inset_0_-2px_0_0_#23252a] rounded-lg p-5">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex items-center gap-4">
          <div className="relative rounded-lg animate-pfp-enter opacity-0 [animation-delay:150ms]">
            <div
              className="absolute inset-0 rounded-lg"
              style={{
                padding: '1px',
                background: '#576c8b',
              }}
            >
              <div
                className="w-full h-full rounded-lg"
                style={{
                  padding: '2px',
                  background: 'rgba(58, 62, 68, 0.95)',
                }}
              >
                <div className="w-full h-full rounded-lg bg-[#181a1f]"></div>
              </div>
            </div>
            <img
              src={pfpUrl}
              alt={displayName}
              className="relative w-16 h-16 rounded-lg m-[3px]"
              onError={(e) => {
                (e.target as HTMLImageElement).src = "/assets/img/nopfp.png";
              }}
            />
          </div>
          <div>
            <h2 className="text-lg font-windsor-bold text-white">
              {displayName}
            </h2>
            <p className="text-[#6e7787] text-sm">~{username}</p>
          </div>
        </div>

        {/* Connections */}
        {connections && connections.length > 0 && (
          <div className="flex flex-wrap gap-2 justify-end">
            {connections
              .filter((conn) => conn.type !== "discord")
              .map((conn) => (
                <a
                  key={conn.type}
                  href={
                    conn.type === "twitter"
                      ? `https://twitter.com/${conn.username}`
                      : conn.type === "github"
                        ? `https://github.com/${conn.username}`
                        : "#"
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-2 bg-[#151619]/40 hover:bg-[#1e2026]/60 border border-[#343743] rounded-md text-white transition-all text-sm capitalize shadow-[inset_0_-2px_0_0_#282a33]"
                >
                  {conn.type}
                </a>
              ))}
          </div>
        )}
      </div>
      <p className="text-[#b8bdc7] whitespace-pre-wrap break-words overflow-wrap-anywhere">{bio}</p>
    </div>
  );
}
