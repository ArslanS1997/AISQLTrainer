export interface User {
  id: string;
  email: string;
  name: string;
  picture?: string;
  points: number;
  createdAt: Date;
  lastLoginAt: Date;
  subscription?: UserSubscription;  // Optional subscription data
}

export interface SQLSession {
  id: string;
  userId: string;
  difficulty: 'basic' | 'intermediate' | 'advanced';
  topic?: string;
  prompt: string;
  schema: string;
  userQuery?: string;
  aiResponse?: string;
  isCorrect?: boolean;
  pointsEarned: number;
  timeSpent: number;
  createdAt: Date;
}

// API Response format for sessions
export interface APISessionResponse {
  session_id: string;
  schema_id?: string;
  queries: Array<{ query: string; executed_at: string }>;
  total_score: number;
  created_at: string;
  completed_at?: string;
}

export interface CompetitionSession {
  id: string;
  userId: string;
  aiAgentId: string;
  userScore: number;
  aiScore: number;
  duration: number;
  queries: CompetitionQuery[];
  winner: 'user' | 'ai' | 'tie';
  createdAt: Date;
}

export interface CompetitionQuery {
  id: string;
  prompt: string;
  userQuery: string;
  aiQuery: string;
  userTime: number;
  aiTime: number;
  userCorrect: boolean;
  aiCorrect: boolean;
}

export interface Topic {
  id: string;
  name: string;
  description: string;
  difficulty: 'basic' | 'intermediate' | 'advanced';
  category: string;
}

export interface PricingPlan {
  id: string;
  name: string;
  price: number;
  interval: 'month' | 'year';
  features: string[];
  popular?: boolean;
}

export interface DashboardStats {
  totalSessions: number;
  totalPoints: number;
  averageScore: number;
  sessionsThisWeek: number;
  pointsThisWeek: number;
  weeklyProgress: WeeklyProgress[];
  topTopics: TopicStats[];
}

export interface WeeklyProgress {
  date: string;
  sessions: number;
  points: number;
}

export interface TopicStats {
  topic: string;
  sessions: number;
  averageScore: number;
}

export interface SQLQuestion {
  id: string;
  prompt: string;
  difficulty: 'basic' | 'intermediate' | 'advanced';
  topic: string;
  expectedQuery?: string;
  hint?: string;
  explanation?: string;
  points: number;
  timeLimit?: number; // in seconds
}

export interface TableColumn {
  name: string;
  type: string;
  nullable: boolean;
  primaryKey?: boolean;
  foreignKey?: {
    table: string;
    column: string;
  };
}

export interface TableData {
  tableName: string;
  columns: TableColumn[];
  sampleData: any[][];
  rowCount: number;
}

export interface DatabaseSchema {
  tables: TableData[];
  relationships: {
    fromTable: string;
    fromColumn: string;
    toTable: string;
    toColumn: string;
  }[];
}

export interface QuestionSession {
  id: string;
  questions: SQLQuestion[];
  currentQuestionIndex: number;
  userAnswers: {
    questionId: string;
    query: string;
    isCorrect: boolean;
    timeSpent: number;
    pointsEarned: number;
  }[];
  totalPoints: number;
  startTime: Date;
  endTime?: Date;
}

// Check-answer API types
export interface CheckCorrectRequest {
  user_id: string;
  session_id: string;
  difficulty: 'basic' | 'intermediate' | 'advanced';
  question: string;
  sql: string;
}

export interface CheckCorrectResponse {
  user_id: string;
  session_id: string;
  is_correct: boolean;
  explanation: string;
  table_head?: string;
  points: number;
  difficulty: 'basic' | 'intermediate' | 'advanced';
}

// Add these interfaces
export type PlanName = 'free' | 'pro' | 'max';

export interface SubscriptionPlan {
  name: PlanName;
  display_name: string;
  limits: {
    max_schemas_per_month: number;
    max_competitions_per_month: number;
  };
  features: {
    can_download_certificates: boolean;
    can_get_master_certificate: boolean;
    ai_model_tier: string;
  };
  selected_model_index: number;
}

export interface UserSubscription {
  plan: SubscriptionPlan;
  usage: {
    schemas_generated: number;
    competitions_entered: number;
  };
  // Add subscription management fields
  stripe_subscription_id?: string;
  status?: string;
  cancel_at_period_end?: boolean;
  current_period_end?: string;
  stripe_price_id?: string;
  billing_cycle?: string;
}

// Add shared types
export type Difficulty = 'basic' | 'intermediate' | 'advanced';

export interface AIModel {
  name: string;
  description: string;
  premium: boolean;
} 