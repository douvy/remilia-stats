// Strict API response types with proper error handling
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  status: 'idle' | 'loading' | 'success' | 'error';
}

export interface ApiError {
  message: string;
  status: number;
  code?: string;
}

export class ApiException extends Error {
  constructor(
    public message: string,
    public status: number,
    public code?: string
  ) {
    super(message);
    this.name = 'ApiException';
  }
}

// Result pattern for better error handling
export type Result<T, E = ApiError> =
  | { success: true; data: T }
  | { success: false; error: E };

// Async result utilities
export const success = <T>(data: T): Result<T> => ({ success: true, data });
export const failure = <E = ApiError>(error: E): Result<never, E> => ({
  success: false,
  error
});

// Connection status types
export type ConnectionStatus = 'connected' | 'disconnected' | 'connecting';

export interface ConnectionState {
  status: ConnectionStatus;
  lastConnected?: Date;
  error?: ApiError;
}