// Dummy client for Stripe integration testing
// This file mocks the Stripe integration functionality for local/dev testing

// Dummy data for plans, subscription, and invoices
const dummyPlans = [
  { id: 'plan_basic', name: 'Basic', price: 1000, currency: 'usd', interval: 'month' },
  { id: 'plan_pro', name: 'Pro', price: 2000, currency: 'usd', interval: 'month' }
];

const dummySubscription = {
  id: 'sub_123456',
  plan: dummyPlans[0],
  status: 'active',
  current_period_end: Date.now() + 1000 * 60 * 60 * 24 * 30
};

const dummyInvoices = [
  { id: 'inv_1', amount_paid: 1000, currency: 'usd', status: 'paid', date: Date.now() - 1000 * 60 * 60 * 24 * 10 },
  { id: 'inv_2', amount_paid: 1000, currency: 'usd', status: 'paid', date: Date.now() - 1000 * 60 * 60 * 24 * 40 }
];

// Dummy async helpers to simulate API delay
const dummyAsync = <T>(data: T, error: any = null, delay = 300) =>
  new Promise<{ data?: T; error?: any }>(resolve =>
    setTimeout(() => resolve(error ? { error } : { data }), delay)
  );

export const testStripeIntegration = async () => {
  console.log('Testing Stripe integration (dummy client)...');

  try {
    // Test 1: Get available plans
    console.log('1. Testing getAvailablePlans...');
    const plansResponse = await dummyAsync(dummyPlans);
    if (plansResponse.data) {
      console.log('✅ Available plans:', plansResponse.data);
    } else {
      console.log('❌ Failed to get plans:', plansResponse.error);
    }

    // Test 2: Get subscription (if authenticated)
    console.log('2. Testing getSubscription...');
    const subResponse = await dummyAsync(dummySubscription);
    if (subResponse.data) {
      console.log('✅ Subscription data:', subResponse.data);
    } else {
      console.log('❌ Failed to get subscription:', subResponse.error);
    }

    // Test 3: Get invoices (if authenticated)
    console.log('3. Testing getInvoices...');
    const invoicesResponse = await dummyAsync(dummyInvoices);
    if (invoicesResponse.data) {
      console.log('✅ Invoices data:', invoicesResponse.data);
    } else {
      console.log('❌ Failed to get invoices:', invoicesResponse.error);
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
};

// Dummy checkout session creation (returns a fake URL)
export const testCheckoutSession = async (priceId: string) => {
  console.log('Testing checkout session creation (dummy client)...');

  try {
    const response = await dummyAsync({
      checkout_url: `${window.location.origin}/dummy-checkout?price_id=${priceId}`
    });
    if (response.data) {
      console.log('✅ Checkout session created:', response.data);
      return response.data.checkout_url;
    } else {
      console.log('❌ Failed to create checkout session:', response.error);
      return null;
    }
  } catch (error) {
    console.error('❌ Checkout test failed:', error);
    return null;
  }
};

// Export for use in browser console
if (typeof window !== 'undefined') {
  (window as any).testStripeIntegration = testStripeIntegration;
  (window as any).testCheckoutSession = testCheckoutSession;
}