// Domain types for Remilia API

export interface RemiliaUser {
  displayUsername: string;
  displayName: string;
  pfp: {
    project: string;
    id: string;
  };
  pfpUrl: string;
}

export interface RemiliaFriendsResponse {
  page: number;
  limit: number;
  friends: RemiliaUser[];
}

export interface RemiliaProfile {
  user: {
    username: string;
    displayName: string;
    pfp: {
      project: string;
      id: string;
    };
    pfpUrl: string;
    beetles: number;
    pokes: number;
    socialCredit: {
      score: number;
      lastCalculated: string;
      components: {
        base: number;
        friendBonus: number;
        final: number;
      };
    };
    friendCount: number;
  };
  isAuthenticated: boolean;
  isOwnProfile: boolean;
}

export interface UserStats {
  rank: number;
  pokesRank?: number;
  socialCreditRank?: number;
  username: string;
  displayName: string;
  pfpUrl: string;
  beetles: number;
  pokes: number;
  socialCredit: number;
}

// Leaderboard specific types
export type SortField = 'beetles' | 'pokes' | 'socialCredit';
export type SortDirection = 'asc' | 'desc';

export interface LeaderboardFilters {
  searchQuery: string;
  sortField: SortField;
  sortDirection: SortDirection;
  minBeetles?: number;
  minPokes?: number;
  minSocialCredit?: number;
}

export interface LeaderboardState {
  users: UserStats[];
  filteredUsers: UserStats[];
  totalFriends: number;
  processedCount: number;
  isLoading: boolean;
  isProcessing: boolean;
  progress: number;
  error: string | null;
  filters: LeaderboardFilters;
}