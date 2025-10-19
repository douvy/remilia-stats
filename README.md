# Remilia Stats

RemiliaNET leaderboard and user profiles with stats.

Next.js 15, TypeScript, Tailwind CSS, Upstash Redis

## Local Development

**Requirements:** Node.js 18+, Redis

```bash
npm install
cp .env.example .env
```

Configure Redis in `.env`:
```
# Upstash (production)
UPSTASH_REDIS_REST_URL=https://your-instance.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token

# OR local Redis
REDIS_URL=redis://localhost:6379
```

Initial sync from API:
```bash
npm run sync
```

Start dev server:
```bash
npm run dev
```
