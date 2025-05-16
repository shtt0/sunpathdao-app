// API endpoints
export const API_ROUTES = {
  TASKS: '/api/tasks',
  SUBMISSIONS: '/api/submissions',
  USERS: '/api/users',
};

// Solana constants
export const SOLANA_CONSTANTS = {
  NETWORK: 'devnet', // 開発段階なので常にdevnetを使用
  // 常にDevnetのHelius RPCエンドポイントを使用
  RPC_URL: 'https://devnet.helius-rpc.com/?api-key=8af303e8-8551-44c9-b69b-e450b4e00455', // Helius devnet
  PROGRAM_ID: process.env.VITE_SOLANA_PROGRAM_ID || 'Drr2eM6yoGXL2QZHdaFzXzUDDPQarV8acbbYWTBAtNyE', // 正しいプログラムID
  MIN_DEPOSIT_AMOUNT: 0.1, // コミッショナーに必要な最低デポジット量（SOL）
};

// Pagination
export const ITEMS_PER_PAGE = 9;

// Video recording constants
export const MAX_VIDEO_DURATION_SECONDS = 15;
export const VIDEO_MIME_TYPE = 'video/webm; codecs=vp9';

// Task statuses
export const TASK_STATUS = {
  AVAILABLE: 'available',
  IN_PROGRESS: 'in_progress',
  JUDGING: 'judging',
  COMPLETED: 'completed',
  EXPIRED: 'expired',
};

// Submission statuses
export const SUBMISSION_STATUS = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  REJECTED: 'rejected',
};

// Country list for task creation
export const COUNTRIES = [
  'Japan',
  'United States',
  'United Kingdom',
  'Canada',
  'Australia',
  'Germany',
  'France',
  'Italy',
  'Spain',
  'Brazil',
  'South Korea',
  'China',
  'India',
  'Singapore',
  'Thailand',
  'Malaysia',
  'Indonesia',
  'Vietnam',
  'Philippines',
  'New Zealand',
];

// Sort options for task listing
export const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest First' },
  { value: 'reward-high', label: 'Highest Reward' },
  { value: 'reward-low', label: 'Lowest Reward' },
  { value: 'expiry', label: 'Expiring Soon' },
];

// Google Maps API configuration
export const MAPS_CONFIG = {
  defaultCenter: { lat: 35.6812, lng: 139.7671 }, // Tokyo, Japan
  defaultZoom: 14,
  options: {
    disableDefaultUI: false,
    zoomControl: true,
    scrollwheel: true,
    fullscreenControl: false,
    mapTypeControl: false,
  },
  staticMap: {
    width: 800,
    height: 400,
    zoom: 13,
    mapType: 'roadmap',
    markers: {
      color: 'red',
      label: 'S',
    },
    pathColor: '0x0000FF88', // Blue with some transparency
    pathWeight: 5,
  }
};
