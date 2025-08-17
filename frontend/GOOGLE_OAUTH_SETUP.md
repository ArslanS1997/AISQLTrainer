# Google OAuth Setup Guide

This guide will help you set up Google OAuth authentication for your SQL Tutor AI application.

## Prerequisites

- A Google account
- Access to Google Cloud Console

## Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click on "Select a project" at the top of the page
3. Click "New Project"
4. Enter a project name (e.g., "SQL Tutor AI")
5. Click "Create"

## Step 2: Enable Google+ API

1. In the Google Cloud Console, go to "APIs & Services" > "Library"
2. Search for "Google+ API" or "Google Identity"
3. Click on "Google Identity" and then "Enable"

## Step 3: Create OAuth 2.0 Credentials

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth 2.0 Client IDs"
3. If prompted, configure the OAuth consent screen:
   - Choose "External" user type
   - Fill in the required information (App name, User support email, Developer contact information)
   - Add scopes: `openid`, `email`, `profile`
   - Add test users if needed
4. Click "Create"

## Step 4: Configure OAuth 2.0 Client ID

1. Application type: "Web application"
2. Name: "SQL Tutor AI Web Client"
3. Authorized JavaScript origins:
   - `http://localhost:3000` (for development)
   - `https://yourdomain.com` (for production)
4. Authorized redirect URIs:
   - `http://localhost:3000` (for development)
   - `https://yourdomain.com` (for production)
5. Click "Create"

## Step 5: Get Your Client ID

After creating the OAuth 2.0 Client ID, you'll see a popup with your client ID. Copy it.

## Step 6: Configure Environment Variables

1. Create a `.env` file in the `frontend` directory
2. Add your Google Client ID:

```env
REACT_APP_GOOGLE_CLIENT_ID=your_google_client_id_here
```

Replace `your_google_client_id_here` with the actual client ID you copied.

## Step 7: Test the Integration

1. Start your development server: `npm start`
2. Navigate to your application
3. Click the "Sign in with Google" button
4. You should be redirected to Google's OAuth consent screen
5. After signing in, you should be redirected back to your application

## Troubleshooting

### Sending Google OAuth Token to the Backend

After a user signs in with Google on the frontend, you will receive a credential (ID token) from Google. To authenticate the user with your backend, you need to send this token to your backend server, which will verify it and create or update the user session.

#### Example (React with @react-oauth/google):