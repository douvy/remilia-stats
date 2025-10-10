import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;

  try {
    const response = await fetch(`https://remilia.com/api/profile/~${username}`, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'RemiliaStats/1.0',
      },
      next: { revalidate: 14400 }, // 4 hours
    });

    if (response.ok) {
      const data = await response.json();
      const displayName = data.user?.displayName || username;
      const pfpUrl = data.user?.pfpUrl || '/assets/img/avatar.jpg';

      return {
        title: `${displayName} (~${username}) - Remilia Stats`,
        openGraph: {
          title: `${displayName} (~${username})`,
          images: [pfpUrl],
        },
        twitter: {
          card: 'summary',
          title: `${displayName} (~${username})`,
          images: [pfpUrl],
        },
      };
    }
  } catch (error) {
    // Fallback on error
  }

  return {
    title: `~${username} - Remilia Stats`,
    openGraph: {
      title: `~${username}`,
      images: ['/assets/img/avatar.jpg'],
    },
    twitter: {
      card: 'summary',
      title: `~${username}`,
      images: ['/assets/img/avatar.jpg'],
    },
  };
}

export default function ProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
