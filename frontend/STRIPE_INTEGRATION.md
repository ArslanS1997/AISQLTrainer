# Stripe Integration for SQL Tutor AI Frontend

This document explains the Stripe integration implemented in the frontend.

## Overview

The frontend now includes a complete Stripe billing system with the following features:

- **Pricing Page**: Displays subscription plans with Stripe integration
- **Checkout Flow**: Secure Stripe checkout sessions
- **Billing Management**: Subscription status and billing history
- **Success Page**: Confirmation page after successful payment

## Components

### 1. API Client (`src/utils/api.ts`)
Handles all backend API calls including Stripe endpoints:
- `createCheckoutSession()`: Creates Stripe checkout sessions
- `getSubscription()`: Retrieves current subscription status
- `cancelSubscription()`: Cancels active subscriptions
- `getAvailablePlans()`: Fetches available Stripe plans
- `getInvoices()`: Retrieves billing history

### 2. BillingModal (`src/components/BillingModal.tsx`)
Modal component for subscription management:
- Displays current subscription status
- Shows billing history with downloadable invoices
- Allows subscription cancellation
- Handles loading states and error handling

### 3. CheckoutSuccessPage (`src/pages/CheckoutSuccessPage.tsx`)
Success page after successful Stripe checkout:
- Displays subscription confirmation
- Shows subscription details
- Provides navigation to dashboard and practice

### 4. Updated PricingPage (`src/pages/PricingPage.tsx`)
Enhanced pricing page with Stripe integration:
- Fetches available plans from Stripe
- Creates checkout sessions
- Handles authentication requirements
- Shows loading states during checkout

## Types

### Stripe Types (`src/types/index.ts`)
Added comprehensive TypeScript types for Stripe integration:
- `StripePlan`: Stripe plan structure
- `CheckoutRequest/Response`: Checkout session types
- `SubscriptionResponse`: Subscription status types
- `Invoice`: Billing history types
- `BillingPlan`: Frontend plan structure

## Environment Variables

Create a `.env` file in the frontend directory:

```env
# API Configuration
REACT_APP_API_URL=http://localhost:8000

# Google OAuth (if using Google Sign-In)
REACT_APP_GOOGLE_CLIENT_ID=your_google_client_id_here

# Stripe Configuration (for client-side features if needed)
REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key_here
```

## Usage

### 1. User Flow
1. User visits `/pricing` page
2. Selects a plan and billing interval
3. Clicks "Get Started" (redirects to login if not authenticated)
4. Creates Stripe checkout session via API
5. Redirects to Stripe checkout
6. After payment, redirects to `/checkout/success`
7. User can manage billing via navbar billing icon

### 2. Billing Management
- Click the credit card icon in the navbar
- View current subscription status
- Download invoices
- Cancel subscription if needed

### 3. Backend Integration
The frontend expects the following backend endpoints:
- `POST /api/billing/create-checkout`
- `GET /api/billing/subscription`
- `POST /api/billing/cancel-subscription`
- `GET /api/billing/plans`
- `GET /api/billing/invoices`

## Security Features

1. **Authentication Required**: All billing operations require user authentication
2. **Server-Side Checkout**: Checkout sessions are created server-side for security
3. **Webhook Handling**: Backend handles Stripe webhooks for subscription updates
4. **Error Handling**: Comprehensive error handling for failed payments

## Testing

### Test Cards (Stripe Test Mode)
- **Success**: 4242 4242 4242 4242
- **Decline**: 4000 0000 0000 0002
- **3D Secure**: 4000 0025 0000 3155

### Test Scenarios
1. Successful subscription purchase
2. Failed payment handling
3. Subscription cancellation
4. Billing history display
5. Invoice download

## Error Handling

The implementation includes comprehensive error handling:
- Network errors
- Authentication failures
- Payment failures
- Invalid plan selections
- Loading states for better UX

## Future Enhancements

1. **Subscription Upgrades/Downgrades**: Allow plan changes
2. **Trial Periods**: Implement free trial functionality
3. **Usage-Based Billing**: Track usage and bill accordingly
4. **Multiple Payment Methods**: Support various payment options
5. **Invoice Customization**: Custom invoice templates
6. **Tax Handling**: Automatic tax calculation
7. **Refund Processing**: Handle refunds through Stripe

## Dependencies

The implementation uses:
- `react-router-dom`: For routing
- `lucide-react`: For icons
- Native `fetch`: For API calls
- TypeScript: For type safety

No additional Stripe-specific frontend libraries are required as all Stripe interactions happen server-side for security. 