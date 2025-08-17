import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/Button';
import { GoogleSignInButton } from '../components/GoogleSignInButton';
import { 
  Database, 
  Brain, 
  Trophy, 
  TrendingUp, 
  CheckCircle,
  ArrowRight,
  Play
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  const { user, signIn } = useAuth();

  const features = [
    {
      icon: Brain,
      title: 'AI-Powered Learning',
      description: 'Get personalized SQL practice with intelligent feedback and explanations.'
    },
    {
      icon: Database,
      title: 'Real Database Practice',
      description: 'Practice with real database schemas and realistic scenarios.'
    },
    {
      icon: Trophy,
      title: 'Competitive Mode',
      description: 'Compete against AI agents in real-time SQL challenges.'
    },
    {
      icon: TrendingUp,
      title: 'Track Progress',
      description: 'Monitor your learning progress with detailed analytics and insights.'
    }
  ];

  const benefits = [
    'Interactive SQL editor with syntax highlighting',
    'Real-time feedback and explanations',
    'Multiple difficulty levels',
    'Topic-based learning paths',
    'Progress tracking and analytics',
    'Competitive challenges',
    'Mobile-responsive design'
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b border-secondary-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <div className="flex items-center space-x-2">
                <Database className="h-8 w-8 text-primary-600" />
                <span className="text-xl font-bold text-secondary-900">SQL Tutor AI</span>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Link to="/pricing" className="text-secondary-600 hover:text-secondary-900">
                Pricing
              </Link>
              {user ? (
                <Link to="/practice">
                  <Button>Go to Practice</Button>
                </Link>
              ) : (
                <GoogleSignInButton />
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary-50 to-secondary-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold text-secondary-900 mb-6">
              Master SQL with
              <span className="text-primary-600"> AI-Powered</span> Practice
            </h1>
            <p className="text-xl text-secondary-600 mb-8 max-w-3xl mx-auto">
              Learn SQL through interactive practice sessions, compete with AI agents, 
              and track your progress with personalized feedback and real database scenarios.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {user ? (
                <Link to="/practice">
                  <Button size="lg" className="flex items-center space-x-2">
                    <Play className="h-5 w-5" />
                    <span>Start Practicing</span>
                  </Button>
                </Link>
              ) : (
                <GoogleSignInButton size="lg" className="flex items-center space-x-2">
                  <span>Get Started Free</span>
                  <ArrowRight className="h-5 w-5" />
                </GoogleSignInButton>
              )}
              <Link to="/pricing">
                <Button variant="outline" size="lg">
                  View Pricing
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-secondary-900 mb-4">
              Why Choose SQL Tutor AI?
            </h2>
            <p className="text-xl text-secondary-600 max-w-2xl mx-auto">
              Our platform combines cutting-edge AI technology with proven learning methods 
              to help you master SQL faster and more effectively.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div key={index} className="text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-100 rounded-full mb-4">
                    <Icon className="h-8 w-8 text-primary-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-secondary-900 mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-secondary-600">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-24 bg-secondary-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-secondary-900 mb-6">
                Everything You Need to Excel in SQL
              </h2>
              <p className="text-lg text-secondary-600 mb-8">
                From beginners to advanced users, our comprehensive platform provides 
                all the tools and resources you need to become a SQL expert.
              </p>
              <div className="space-y-4">
                {benefits.map((benefit, index) => (
                  <div key={index} className="flex items-center space-x-3">
                    <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                    <span className="text-secondary-700">{benefit}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-lg p-8">
              <div className="bg-secondary-100 rounded-lg p-4 mb-4">
                <div className="bg-secondary-200 h-4 w-3/4 rounded mb-2"></div>
                <div className="bg-secondary-200 h-4 w-1/2 rounded"></div>
              </div>
              <div className="space-y-2">
                <div className="bg-primary-100 text-primary-800 px-3 py-2 rounded text-sm font-medium">
                  SELECT * FROM users WHERE age &gt; 18;
                </div>
                <div className="text-sm text-secondary-600">
                  ✓ Query executed successfully
                </div>
                <div className="text-sm text-secondary-600">
                  ✓ 25 rows returned
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-primary-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Ready to Master SQL?
          </h2>
          <p className="text-xl text-primary-100 mb-8 max-w-2xl mx-auto">
            Join thousands of learners who are already improving their SQL skills 
            with our AI-powered platform.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {user ? (
              <Link to="/practice">
                <Button size="lg" variant="secondary" className="flex items-center space-x-2">
                  <Play className="h-5 w-5" />
                  <span>Continue Learning</span>
                </Button>
              </Link>
            ) : (
              <GoogleSignInButton size="lg" className="flex items-center space-x-2 bg-white text-primary-600 hover:bg-gray-50">
                <span>Start Learning Free</span>
                <ArrowRight className="h-5 w-5" />
              </GoogleSignInButton>
            )}
            <Link to="/pricing">
              <Button size="lg" variant="outline" className="border-white text-white hover:bg-white hover:text-primary-600">
                View Plans
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-secondary-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <Database className="h-8 w-8 text-primary-400" />
                <span className="text-xl font-bold">SQL Tutor AI</span>
              </div>
              <p className="text-secondary-400">
                Master SQL with AI-powered practice and real-time feedback.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Product</h3>
              <ul className="space-y-2 text-secondary-400">
                <li><Link to="/practice" className="hover:text-white">Practice</Link></li>
                <li><Link to="/compete" className="hover:text-white">Compete</Link></li>
                <li><Link to="/dashboard" className="hover:text-white">Dashboard</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Company</h3>
              <ul className="space-y-2 text-secondary-400">
                <li><Link to="/pricing" className="hover:text-white">Pricing</Link></li>
                <li><a href="#" className="hover:text-white">About</a></li>
                <li><a href="#" className="hover:text-white">Contact</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Support</h3>
              <ul className="space-y-2 text-secondary-400">
                <li><a href="#" className="hover:text-white">Help Center</a></li>
                <li><a href="#" className="hover:text-white">Documentation</a></li>
                <li><a href="#" className="hover:text-white">Privacy Policy</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-secondary-800 mt-8 pt-8 text-center text-secondary-400">
            <p>&copy; 2024 SQL Tutor AI. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}; 