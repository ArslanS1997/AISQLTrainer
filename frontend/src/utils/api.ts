import { 
  CheckCorrectRequest, 
  CheckCorrectResponse, 
  AIModel,  // Add this import
  PlanName  // Also import this if needed
} from '../types';
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:10000';

console.log('Backend URL:', BACKEND_URL); // Add this for debugging

// Types
export interface SQLSchemaRequest {
  user_id: string;
  session_id: string;
  prompt: string;
  difficulty?: string;  // Add this line
}

export interface SQLSchemaResponse {
  user_id: string;
  session_id: string;
  created_at: string;
  schema_script: string;
  schema_created: boolean;
}

export interface SQLExecuteRequest {
  query: string;
  user_id: string;
  session_id: string;
}

export interface SQLExecuteResponse {
  success: boolean;
  result: string;
  error_message?: string;
}

export interface PopulateRequest {
  user_id: string;
  session_id: string;
  sql_schema: string;
}

export interface PopSuccess {
  message: string;
}

export interface QuestionRequest {
  user_id: string;
  session_id: string;
  schema_ddl: string;
  topic: string;
  difficulty: string;
}

export interface QuestionResponse {
  user_id: string;
  session_id: string;
  questions: string[];
}

export interface SessionResponse {
  session_id: string;
  schema_id?: string;
  queries: Array<{ query: string; executed_at: string }>;
  total_score: number;
  created_at: string;
  completed_at?: string;
}

// Create session request
export interface CreateSessionRequest {
  user_id: string;
  session_id: string;
  schema_script: string;
  difficulty: string;
}

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

export interface SubscriptionUsage {
  schemas_generated: number;
  competitions_entered: number;
}

export interface Subscription {
  plan: SubscriptionPlan;
  usage: SubscriptionUsage;
}

// Add these interfaces
export interface CompetitionQuestion {
  round: number;
  question: string;
  difficulty: string;
}

export interface CompetitionStartRequest {
  difficulty: string;
}

export interface CompetitionStartResponse {
  competition_id: string;
  difficulty: string;
  schema_ddl: string;
  questions: CompetitionQuestion[];  // ADD THIS - All 5 questions at start
  total_rounds: number;
  current_round: number;
  time_limit: number;
  ai_time_limit: number;
  started_at: string;
  expires_at: string;
  status: string;
}

export interface CompetitionQuestionRequest {
  competition_id: string;
}

export interface CompetitionQuestionResponse {
  competition_id: string;
  round: number;
  question: string;
  time_remaining: number;
  schema_ddl: string;
}

export interface CompetitionSubmitRequest {
  competition_id: string;
  round: number;
  user_query: string;
}

export interface CompetitionSubmitResponse {
  success: boolean;
  round: number;
  user_correct: boolean;
  ai_correct: boolean;
  ai_query: string;
  user_points: number;
  ai_points: number;
  explanation: string;
  correct_answer: string;
  next_round?: number;
  competition_completed: boolean;
  user_query_results?: any[]; // ADD THIS
  ai_query_results?: any[];   // ADD THIS
}

export interface CompetitionStatusRequest {
  competition_id: string;
}

export interface CompetitionStatusResponse {
  competition_id: string;
  status: string;
  current_round: number;
  total_rounds: number;
  user_score: number;
  ai_score: number;
  time_remaining: number;
  questions: CompetitionQuestion[];  // ADD THIS - Include all questions
  schema_ddl: string;
}

export interface CompetitionResultRequest {
  competition_id: string;
}

export interface CompetitionResultResponse {
  competition_id: string;
  final_result: string;
  user_score: number;
  ai_score: number;
  rounds_data: any[];
  can_get_certificate: boolean;
  certificate_message: string;
  schema_ddl: string;
  questions: CompetitionQuestion[];  // ADD THIS - For review purposes
}

export interface ChangePlanRequest {
  new_plan: string;
  billing_cycle: string;
}

export interface ChangePlanResponse {
  success: boolean;
  message: string;
  effective_date: string;
  proration_amount?: number;
  next_billing_amount: number;
  plan_changed_to: string;
}

export interface PlanChangePreview {
  current_plan: string;
  new_plan: string;
  is_upgrade: boolean;
  effective_immediately: boolean;
  effective_date: string;
  proration_amount: number;
  next_billing_amount: number;
  message: string;
}

// API Client
class APIClient {
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  private getAuthHeaders(): Record<string, string> {
    // Try to get JWT token first (preferred)
    const jwtToken = localStorage.getItem('jwt_token');
    if (jwtToken) {
      return { 'Authorization': `Bearer ${jwtToken}` };
    }

    // Fallback to Google access token
    const googleToken = localStorage.getItem('google_access_token');
    if (googleToken) {
      return { 'Authorization': `Bearer ${googleToken}` };
    }

    return {};
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<{ data?: T; error?: string }> {
    try {
      const url = `${this.baseURL}${endpoint}`;
      const authHeaders = this.getAuthHeaders();
      
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
          ...options.headers,
        },
        ...options,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return { error: errorData.detail || `HTTP ${response.status}` };
      }

      const data = await response.json();
      return { data };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Network error' };
    }
  }

  // Health check
  async healthCheck(): Promise<{ data?: { status: string }; error?: string }> {
    return this.request('/health');
  }

  // Authentication endpoints
  async authenticateWithGoogle(idToken: string, accessToken: string): Promise<{ data?: any; error?: string }> {
    return this.request('/api/auth/google', {
      method: 'POST',
      body: JSON.stringify({
        id_token: idToken,
        access_token: accessToken
      }),
    });
  }

  async getCurrentUser(): Promise<{ data?: any; error?: string }> {
    return this.request('/api/auth/me', {
      method: 'GET',
    });
  }

  async logout(): Promise<{ data?: any; error?: string }> {
    return this.request('/api/auth/logout', {
      method: 'POST',
    });
  }

  // Generate schema
  async generateSchema(request: SQLSchemaRequest): Promise<{ data?: SQLSchemaResponse; error?: string }> {
    return this.request('/api/sql/generate-schema', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  // Execute SQL
  async executeSQL(request: SQLExecuteRequest): Promise<{ data?: SQLExecuteResponse; error?: string }> {
    return this.request('/api/sql/execute', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  // Populate tables
  async populateTables(request: PopulateRequest): Promise<{ data?: PopSuccess; error?: string }> {
    return this.request('/api/sql/populate-tables', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  // Generate questions
  async generateQuestions(request: Omit<QuestionRequest, 'topic'> & { topic?: string }): Promise<{ data?: QuestionResponse; error?: string }> {
    // If topic is not provided, send "all" as the topic
    const reqWithTopic = {
      ...request,
      topic: request.topic ?? 'all',
    };
    return this.request('/api/sql/question-generator', {
      method: 'POST',
      body: JSON.stringify(reqWithTopic),
    });
  }

  // Check answer
  async checkAnswer(request: CheckCorrectRequest): Promise<{ data?: CheckCorrectResponse; error?: string }> {
    return this.request('/api/sql/iscorrect', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  // Delete all DuckDB tables for a user (start fresh)
  async deleteDuckDB(userId: string, sessionId: string) {
    return this.request(`/api/sql/delete-duckdb?user_id=${encodeURIComponent(userId)}&session_id=${encodeURIComponent(sessionId)}`, {
      method: 'POST',
    });
  }

  // Get sessions
  async getSessions(): Promise<{ data?: SessionResponse[]; error?: string }> {
    return this.request('/api/sql/sessions');
  }

  // Create session
  async createSession(request: CreateSessionRequest): Promise<{ data?: { message: string }; error?: string }> {
    return this.request('/api/sql/create-session', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  // Get schemas
  async getSchemas(): Promise<{ data?: SQLSchemaResponse[]; error?: string }> {
    return this.request('/api/sql/schemas');
  }

  // achievements API methods
  async getachievementsStats(): Promise<{ data?: any; error?: string }> {
    return this.request('/api/achievements/stats');
  }

  async getLearningProgress(): Promise<{ data?: any; error?: string }> {
    return this.request('/api/achievements/progress');
  }

  async getRecentActivity(): Promise<{ data?: any; error?: string }> {
    return this.request('/api/achievements/recent-activity');
  }



  async getMasterCertificateEligibility(): Promise<{ data?: any; error?: string }> {
    return this.request('/api/achievements/master-certificate-eligibility');
  }

  async getUserCertificates(): Promise<{ data?: any; error?: string }> {
    return this.request('/api/achievements/certificates');
  }


  // Stripe API methods
  async createCheckoutSession(plan: string, billingCycle: string, promoCode?: string): Promise<{ data?: any; error?: string }> {
    const requestBody: any = { plan, billing_cycle: billingCycle };
    
    if (promoCode) {
      requestBody.promo_code = promoCode;
    }
    
    return this.request('/api/stripe/create-checkout-session', {
      method: 'POST',
      body: JSON.stringify(requestBody),
    })
  }

  async getUserSubscription(): Promise<{ data?: Subscription; error?: string }> {
    return this.request('/api/stripe/user-subscription');
  }

  async checkFeatureAccess(feature: string): Promise<{ data?: any; error?: string }> {
    return this.request(`/api/stripe/feature-check/${feature}`, {
      method: 'GET',
    })
  }

  async cancelSubscription(): Promise<{ data?: any; error?: string }> {
    return this.request('/api/stripe/cancel-subscription', {
      method: 'POST',
    })
  }

  async reactivateSubscription(): Promise<{ data?: any; error?: string }> {
    return this.request('/api/stripe/reactivate-subscription', {
      method: 'POST',
    })
  }

  async getAvailableModels(): Promise<{ data?: { available_models: AIModel[]; current_model: string }; error?: string }> {
    return this.request('/api/auth/available');
  }

  async switchModel(index: number): Promise<{ data?: { success: boolean; model: string }; error?: string }> {
    return this.request('/api/auth/switch-model', {
      method: 'POST',
      body: JSON.stringify({ model_index: index })
    });
  }
  async completeSession(sessionId: string): Promise<{ data?: any; error?: string }> {
    try {
      const response = await this.request(`/sql/complete-session?session_id=${sessionId}`, {
        method: 'POST'
      });
      return response;
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Failed to complete session' };
    }
  }

  async startCompetition(data: CompetitionStartRequest): Promise<{ data?: CompetitionStartResponse; error?: string }> {
    return this.request('/api/competition/start', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getCompetitionQuestion(data: CompetitionQuestionRequest): Promise<{ data?: CompetitionQuestionResponse; error?: string }> {
    return this.request('/api/competition/question', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async submitCompetitionAnswer(data: CompetitionSubmitRequest): Promise<{ data?: CompetitionSubmitResponse; error?: string }> {
    return this.request('/api/competition/submit', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getCompetitionStatus(data: CompetitionStatusRequest): Promise<{ data?: CompetitionStatusResponse; error?: string }> {
    return this.request('/api/competition/status', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getCompetitionResult(data: CompetitionResultRequest): Promise<{ data?: CompetitionResultResponse; error?: string }> {
    return this.request('/api/competition/result', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Keep existing methods
  async getCompetitionStats(): Promise<{ data?: any; error?: string }> {
    return this.request('/api/competition/stats');
  }

  async getCompetitionHistory(): Promise<{ data?: any; error?: string }> {
    return this.request('/api/competition/history');
  }

  async refreshSubscription(): Promise<{ data?: any; error?: string }> {
    return this.request('/api/stripe/refresh-subscription', {
      method: 'POST',
    });
  }

  async getPlanChangePreview(newPlan: string, billingCycle: string = 'monthly'): Promise<{ data?: PlanChangePreview; error?: string }> {
    return this.request(`/api/stripe/plan-change-preview?new_plan=${newPlan}&billing_cycle=${billingCycle}`);
  }

  async changePlan(data: ChangePlanRequest): Promise<{ data?: ChangePlanResponse; error?: string }> {
    return this.request('/api/stripe/change-plan', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async validatePromoCode(promoCode: string): Promise<{ data?: any; error?: string }> {
    return this.request('/api/stripe/validate-promo-code', {
      method: 'POST',
      body: JSON.stringify({ promo_code: promoCode }),
    });
  }
}





export const apiClient = new APIClient(BACKEND_URL); 