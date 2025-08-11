# SQL Tutor AI Backend

FastAPI backend for the SQL Tutor AI application.

## Features

- 🔐 **Authentication**: Google OAuth integration
- 🗄️ **SQL Practice**: Generate schemas and execute queries with AI feedback
- 🏆 **Competitions**: Real-time SQL competitions with leaderboards
- 📊 **Dashboard**: User statistics and learning progress
- 💳 **Billing**: Stripe integration for subscriptions
- 🚀 **FastAPI**: Modern, fast web framework with automatic API documentation

## Setup

### Prerequisites

- Python 3.8+
- PostgreSQL
- Redis
- Google OAuth credentials
- Stripe account (for billing)

### Installation

1. **Clone and navigate to backend directory:**
   ```bash
   cd backend
   ```

2. **Create virtual environment:**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Set up environment variables:**
   ```bash
   cp env.example .env
   # Edit .env with your actual values
   ```

5. **Run the development server:**
   ```bash
   uvicorn main:app --reload --host 0.0.0.0 --port 8000
   ```

## API Documentation

Once the server is running, visit:
- **Interactive API docs**: http://localhost:8000/docs
- **ReDoc documentation**: http://localhost:8000/redoc

## API Endpoints

### Authentication
- `POST /api/auth/google` - Google OAuth authentication
- `POST /api/auth/logout` - User logout

### SQL Practice
- `POST /api/sql/generate-schema` - Generate database schema from prompt
- `POST /api/sql/execute` - Execute SQL query and get feedback
- `GET /api/sql/sessions` - Get user's practice sessions

### Competition
- `POST /api/competition/start` - Start new competition
- `POST /api/competition/submit` - Submit competition query
- `GET /api/competition/history` - Get competition history

### Dashboard
- `GET /api/dashboard/stats` - Get user statistics
- `GET /api/dashboard/progress` - Get learning progress

### Billing
- `POST /api/billing/create-checkout` - Create Stripe checkout session
- `GET /api/billing/subscription` - Get user subscription

## Database Schema (Planned)

### Users
- id, email, name, photo_url, points, membership, created_at, last_login_at

### Schemas
- id, user_id, tables (JSON), description, difficulty, created_at

### Sessions
- id, user_id, schema_id, queries (JSON), total_score, created_at, completed_at

### Competitions
- id, schema_id, difficulty, time_limit, started_at, expires_at

### Competition_Submissions
- id, competition_id, user_id, query, score, time_taken, submitted_at

### Subscriptions
- id, user_id, stripe_subscription_id, status, plan, current_period_end

## Development

### Project Structure
```
backend/
├── main.py              # FastAPI application and routes
├── requirements.txt     # Python dependencies
├── env.example         # Environment variables template
├── README.md           # This file
└── .gitignore          # Git ignore rules
```

### Adding New Endpoints

1. Define Pydantic models for request/response schemas
2. Create the endpoint function with proper documentation
3. Add authentication dependency if needed
4. Update this README with endpoint details

### Testing

```bash
# Run tests (when implemented)
pytest

# Run with coverage
pytest --cov=app
```

## Deployment

### Production Setup

1. **Environment Variables**: Set all production values in `.env`
2. **Database**: Set up PostgreSQL with proper credentials
3. **Redis**: Configure Redis for caching and sessions
4. **SSL**: Set up SSL certificates
5. **Process Manager**: Use Gunicorn with Uvicorn workers

### Docker (Optional)

```dockerfile
FROM python:3.9-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

## Contributing

1. Create a feature branch
2. Implement your changes
3. Add tests if applicable
4. Update documentation
5. Submit a pull request

## License

This project is licensed under the MIT License. 