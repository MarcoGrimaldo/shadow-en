// User types
export interface User {
  id: string;
  email: string;
  username: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

// Pause point for lessons
export interface PausePoint {
  id: number;
  time: number;
  subtitle: string;
}

// Lesson types
export interface Lesson {
  id: string;
  title: string;
  video_id: string;
  video_url: string;
  pauses: PausePoint[];
  user_id: string;
  user?: User;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

// Database types for Supabase
export interface Database {
  public: {
    Tables: {
      users: {
        Row: User;
        Insert: Omit<User, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<User, "id" | "created_at" | "updated_at">>;
      };
      lessons: {
        Row: Lesson;
        Insert: Omit<Lesson, "id" | "created_at" | "updated_at" | "user">;
        Update: Partial<
          Omit<Lesson, "id" | "created_at" | "updated_at" | "user">
        >;
      };
    };
  };
}

// Auth types
export interface AuthState {
  user: User | null;
  loading: boolean;
  accessToken: string | null;
}

// API Response types
export interface ApiResponse<T> {
  data?: T;
  error?: {
    message: string;
    code?: string;
  };
}

// Practice session types
export interface PracticeResult {
  pauseId: number;
  expectedText: string;
  actualText: string;
  accuracy: number;
  timestamp: number;
}

export interface PracticeSession {
  lessonId: string;
  results: PracticeResult[];
  overallAccuracy: number;
  completedAt: string;
}
