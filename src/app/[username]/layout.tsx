import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;

  try {
    // Use internal API route to benefit from 2-minute cache
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ||
                    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');

    const response = await fetch(`${baseUrl}/api/profile/${username}`, {
      headers: {
        'Accept': 'application/json',
      },
      next: { revalidate: 120 }, // 2 minutes - matches API cache
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
