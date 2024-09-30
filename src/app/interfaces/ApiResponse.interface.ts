export interface ApiResponse<T> {
    Success: boolean;
    Message: string;
    Data: T;
  }