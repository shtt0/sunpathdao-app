// Common types used throughout the application

export type TaskStatus = 'available' | 'in_progress' | 'judging' | 'completed' | 'expired';

export type SubmissionStatus = 'pending' | 'accepted' | 'rejected';

export type WalletStatus = 'disconnected' | 'connecting' | 'connected';

export interface RouteData {
  bounds: {
    northeast: { lat: number; lng: number };
    southwest: { lat: number; lng: number };
  };
  distance: { text: string; value: number };
  duration: { text: string; value: number };
  polyline: string; // Encoded polyline
  startLocation: { lat: number; lng: number };
  endLocation: { lat: number; lng: number };
}

export interface VideoRecordingData {
  blob: Blob;
  startTime: Date;
  endTime: Date;
  duration: number;
}

export interface TaskFilters {
  search?: string;
  country?: string;
  status?: TaskStatus;
  sortBy?: 'newest' | 'oldest' | 'reward-high' | 'reward-low' | 'expiry';
  page: number;
  limit: number;
}
