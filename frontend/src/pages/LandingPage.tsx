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
  Play,
  DollarSign,
  Users,
  Award,
  BookOpen,
  Zap,
  Target,
  ExternalLink
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  const { user, signIn } = useAuth();

  const features = [
    {
      icon: Zap,
      title: 'Instant AI Feedback',
      description: 'Get immediate, detailed explanations for every query. Our AI analyzes your SQL and provides personalized suggestions for improvement.'
    },
    {
      icon: Target,
      title: 'Adaptive Learning',
      description: 'AI adjusts difficulty based on your progress, ensuring optimal challenge levels and accelerated skill development.'
    },
    {
      icon: Users,
      title: 'Compete with AI Agents',
      description: 'Face off against intelligent AI opponents in timed SQL challenges. Make learning competitive and fun!'
    },
    {
      icon: Award,
      title: 'Professional Certification',
      description: 'Earn industry-recognized certificates that showcase your SQL mastery to employers and advance your career.'
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
              <Link to="/" className="flex items-center">
                <img 
                  src="/images/SQLTrainerAI.png" 
                  alt="SQL Trainer AI" 
                  className="h-8 w-auto" 
                />
              </Link>
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
            <div className="flex justify-center mb-8">
              <img 
                src="/images/SQLTrainerAI.png" 
                alt="SQL Trainer AI" 
                className="h-20 md:h-28 w-auto mx-auto" 
              />
            </div>
            
            <h2 className="mt-6 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              Skip Expensive Bootcamps, Master SQL with AI
            </h2>

            <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-gray-600">
              Learn SQL through interactive practice,<br className="hidden sm:inline" /> real-time AI feedback, and professional certification.
              <br className="hidden sm:inline"/>
              <span className="block mt-8"></span>
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

      {/* Value-Driven Learning Section */}
      <section className="py-16 bg-gradient-to-br from-blue-50 to-primary-50 border-b border-blue-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-secondary-900 mb-4">
              Why Choose <span className="text-blue-600">Smart Learning</span> Over Traditional Methods?
            </h2>
            <p className="text-lg text-secondary-600 max-w-3xl mx-auto">
              Break free from outdated learning approaches. Experience the future of SQL education with 
              AI-powered personalization that adapts to your unique learning style and pace.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center p-8 bg-blue-100 rounded-xl border-2 border-blue-200 shadow-lg">
              <div className="bg-blue-200 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
                <Users className="h-8 w-8 text-blue-700" />
              </div>
              <h3 className="text-xl font-semibold text-blue-900 mb-4">Traditional Bootcamps</h3>
              <div className="space-y-3 text-blue-800">
                <div className="flex items-center text-sm">
                  <div className="w-2 h-2 bg-blue-600 rounded-full mr-3 flex-shrink-0"></div>
                  <span>Rigid class schedules</span>
                </div>
                <div className="flex items-center text-sm">
                  <div className="w-2 h-2 bg-blue-600 rounded-full mr-3 flex-shrink-0"></div>
                  <span>Generic curriculum</span>
                </div>
                <div className="flex items-center text-sm">
                  <div className="w-2 h-2 bg-blue-600 rounded-full mr-3 flex-shrink-0"></div>
                  <span>Limited instructor time</span>
                </div>
                <div className="flex items-center text-sm">
                  <div className="w-2 h-2 bg-blue-600 rounded-full mr-3 flex-shrink-0"></div>
                  <span>Expensive commitments</span>
                </div>
              </div>
            </div>
            
            <div className="text-center p-8 bg-blue-600 rounded-xl shadow-xl relative transform scale-105">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-blue-400 to-blue-500 text-white px-6 py-2 rounded-full text-sm font-bold shadow-lg">
                ⭐ SMART CHOICE
              </div>
              <div className="bg-blue-500 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
                <Brain className="h-8 w-8 text-white" />
              </div>
                              <h3 className="text-xl font-semibold text-white mb-4">SQL Trainer AI</h3>
              <div className="space-y-3 text-blue-100">
                <div className="flex items-center text-sm">
                  <div className="w-2 h-2 bg-blue-300 rounded-full mr-3 flex-shrink-0"></div>
                  <span>24/7 availability - learn anytime</span>
                </div>
                <div className="flex items-center text-sm">
                  <div className="w-2 h-2 bg-blue-300 rounded-full mr-3 flex-shrink-0"></div>
                  <span>AI adapts to your learning style</span>
                </div>
                <div className="flex items-center text-sm">
                  <div className="w-2 h-2 bg-blue-300 rounded-full mr-3 flex-shrink-0"></div>
                  <span>Instant personalized feedback</span>
                </div>
                <div className="flex items-center text-sm">
                  <div className="w-2 h-2 bg-blue-300 rounded-full mr-3 flex-shrink-0"></div>
                  <span>Industry-recognized certificates</span>
                </div>
              </div>
              <div className="mt-6 bg-blue-500 rounded-lg p-3">
                <div className="text-blue-100 font-semibold text-sm">Exceptional Value</div>
                <div className="text-white text-xs">Professional training without the premium cost</div>
              </div>
            </div>
            
            <div className="text-center p-8 bg-blue-50 rounded-xl border-2 border-blue-150 shadow-lg">
              <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
                <BookOpen className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-blue-900 mb-4">Self-Study Materials</h3>
              <div className="space-y-3 text-blue-700">
                <div className="flex items-center text-sm">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mr-3 flex-shrink-0"></div>
                  <span>Static content only</span>
                </div>
                <div className="flex items-center text-sm">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mr-3 flex-shrink-0"></div>
                  <span>No interactive practice</span>
                </div>
                <div className="flex items-center text-sm">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mr-3 flex-shrink-0"></div>
                  <span>Zero feedback mechanism</span>
                </div>
                <div className="flex items-center text-sm">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mr-3 flex-shrink-0"></div>
                  <span>No skill verification</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="text-center mt-12">
            <div className="inline-flex items-center bg-blue-600 text-white px-6 py-3 rounded-full">
              <Zap className="h-5 w-5 mr-2" />
              <span className="font-semibold">Experience the difference AI-powered learning makes</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-secondary-900 mb-4">
              AI-Assisted Training That Actually Works
            </h2>
            <p className="text-xl text-secondary-600 max-w-2xl mx-auto">
              Experience personalized learning powered by advanced AI. Get instant feedback, 
              compete with intelligent agents, and earn professional certifications that matter.
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

      {/* AI Competition Section */}
      <section className="py-24 bg-gradient-to-br from-blue-50 to-blue-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-secondary-900 mb-6">
                Battle AI Agents in <span className="text-blue-600">Epic SQL Showdowns</span>
              </h2>
              <p className="text-lg text-secondary-600 mb-8">
                Transform learning into an adrenaline-pumping competition! Face off against AI opponents 
                that adapt to your skill level, making every challenge engaging and fun.
              </p>
              <div className="space-y-6">
                <div className="flex items-start space-x-4">
                  <div className="bg-blue-100 rounded-full p-2 flex-shrink-0">
                    <Trophy className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-secondary-900 mb-1">Timed Challenges</h3>
                    <p className="text-secondary-600">Race against the clock in intense 60-second SQL battles</p>
                  </div>
                </div>
                <div className="flex items-start space-x-4">
                  <div className="bg-blue-200 rounded-full p-2 flex-shrink-0">
                    <Brain className="h-6 w-6 text-blue-700" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-secondary-900 mb-1">Adaptive AI Opponents</h3>
                    <p className="text-secondary-600">AI agents that match your skill level for balanced competition</p>
                  </div>
                </div>
                <div className="flex items-start space-x-4">
                  <div className="bg-blue-300 rounded-full p-2 flex-shrink-0">
                    <TrendingUp className="h-6 w-6 text-blue-800" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-secondary-900 mb-1">Skill Progression</h3>
                    <p className="text-secondary-600">Unlock harder opponents as you improve your SQL mastery</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-xl p-8 border border-blue-200">
              <div className="text-center mb-6">
                <div className="inline-flex items-center space-x-4 mb-4">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    <span className="font-semibold text-secondary-900">You</span>
                  </div>
                  <span className="text-2xl">⚔️</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-blue-700 rounded-full"></div>
                    <span className="font-semibold text-secondary-900">AI Agent</span>
                  </div>
                </div>
                <div className="bg-blue-100 rounded-lg p-4 mb-4">
                  <p className="text-sm font-medium text-blue-800 mb-2">Challenge: Find all customers from New York</p>
                  <div className="bg-white rounded p-3 text-left">
                    <code className="text-sm text-secondary-700">
                      SELECT * FROM customers<br/>
                      WHERE city = 'New York';
                    </code>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div className="bg-blue-50 rounded-lg p-3">
                    <div className="text-2xl font-bold text-blue-600">87</div>
                    <div className="text-sm text-blue-700">Your Score</div>
                  </div>
                  <div className="bg-blue-100 rounded-lg p-3">
                    <div className="text-2xl font-bold text-blue-800">82</div>
                    <div className="text-sm text-blue-700">AI Score</div>
                  </div>
                </div>
                <div className="mt-4 text-center">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                    🎉 Victory! +50 XP
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Professional Certification Section */}
      <section className="py-24 bg-secondary-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-secondary-900 mb-4">
              Earn <span className="text-primary-600">Professional Certificates</span> That Matter
            </h2>
            <p className="text-xl text-secondary-600 max-w-3xl mx-auto">
              Showcase your SQL mastery with industry-recognized certificates. Stand out to employers 
              and advance your career with verified accomplishments.
            </p>
          </div>
          
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="space-y-8">
                <div className="flex items-start space-x-4">
                  <div className="bg-blue-100 rounded-full p-2 flex-shrink-0">
                    <Award className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-secondary-900 mb-2">Industry Recognition</h3>
                    <p className="text-secondary-600">Certificates backed by FireBirdTech's reputation in enterprise AI solutions</p>
                  </div>
                </div>
                <div className="flex items-start space-x-4">
                  <div className="bg-green-100 rounded-full p-2 flex-shrink-0">
                    <Trophy className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-secondary-900 mb-2">Verified Skills</h3>
                    <p className="text-secondary-600">Each certificate represents real accomplishments validated through AI-powered assessments</p>
                  </div>
                </div>
                <div className="flex items-start space-x-4">
                  <div className="bg-purple-100 rounded-full p-2 flex-shrink-0">
                    <CheckCircle className="h-6 w-6 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-secondary-900 mb-2">Career Advancement</h3>
                    <p className="text-secondary-600">Add credentials to LinkedIn, resumes, and portfolios to stand out in competitive job markets</p>
                  </div>
                </div>
                  </div>
              
              <div className="mt-8 bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg p-6 text-white">
                <h4 className="text-lg font-semibold mb-2">🏆 Certificate Types Available</h4>
                <ul className="space-y-2 text-blue-100">
                  <li>• SQL Fundamentals Mastery</li>
                  <li>• Advanced Query Optimization</li>
                  <li>• Database Design & Modeling</li>
                  <li>• AI Competition Champion</li>
                </ul>
              </div>
            </div>
            
            {/* Certificate Preview */}
            <div className="bg-white rounded-xl shadow-2xl p-8 border-4 border-blue-200">
              <div className="text-center">
                <div className="mb-6">
                  <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-blue-700 rounded-full mx-auto mb-4 flex items-center justify-center">
                    <Award className="h-8 w-8 text-white" />
                  </div>
                  <div className="h-1 w-24 bg-gradient-to-r from-blue-600 to-blue-700 mx-auto mb-6"></div>
                </div>
                
                <h3 className="text-2xl font-bold text-secondary-900 mb-2">Certificate of Achievement</h3>
                <p className="text-secondary-600 mb-6">SQL Fundamentals Mastery</p>
                
                <div className="border-2 border-dashed border-blue-200 rounded-lg p-6 mb-6">
                  <p className="text-lg text-secondary-700 mb-2">This certifies that</p>
                  <p className="text-2xl font-bold text-blue-600 mb-2">Your Name</p>
                  <p className="text-secondary-700 mb-4">has successfully completed the SQL Fundamentals course with a score of</p>
                  <p className="text-3xl font-bold text-blue-600">95%</p>
                </div>
                
                <div className="flex justify-between items-center text-sm text-secondary-500">
                  <div>
                    <p>Issued: Dec 2024</p>
                    <p>ID: #SQL-2024-001</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">FireBirdTech</p>
                    <p>Singapore</p>
              </div>
                </div>
                
                <div className="mt-6 pt-6 border-t border-secondary-200">
                  <div className="flex justify-center space-x-4">
                    <Button size="sm" variant="outline" className="text-xs">
                      Download PDF
                    </Button>
                    <Button size="sm" className="text-xs">
                      Add to LinkedIn
                    </Button>
                </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why Our Certification is Legitimate Section */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-secondary-900 mb-4">
              Why Our Certification is <span className="text-green-600">Legitimate</span>
            </h2>
            <p className="text-xl text-secondary-600 max-w-3xl mx-auto">
              We understand your concerns about certification legitimacy. Here's why our system 
              provides genuine, verifiable SQL skills that employers can trust.
            </p>
          </div>
          
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="space-y-8">
                <div className="flex items-start space-x-4">
                  <div className="bg-green-100 rounded-full p-2 flex-shrink-0">
                    <Database className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-secondary-900 mb-2">Unique Schema Generation</h3>
                    <p className="text-secondary-600">Every practice session generates completely unique database schemas based on your prompts. No two users ever see the same questions or data.</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-4">
                  <div className="bg-blue-100 rounded-full p-2 flex-shrink-0">
                    <CheckCircle className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-secondary-900 mb-2">Real Query Execution</h3>
                    <p className="text-secondary-600">Your SQL queries run on actual database engines with populated tables. We verify correctness by executing your code, not just pattern matching.</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-4">
                  <div className="bg-purple-100 rounded-full p-2 flex-shrink-0">
                    <Brain className="h-6 w-6 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-secondary-900 mb-2">AI-Powered Verification</h3>
                    <p className="text-secondary-600">Advanced AI analyzes your query logic, efficiency, and approach - not just the final answer. This prevents memorization and ensures real understanding.</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-4">
                  <div className="bg-orange-100 rounded-full p-2 flex-shrink-0">
                    <Trophy className="h-6 w-6 text-orange-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-secondary-900 mb-2">Competitive Validation</h3>
                    <p className="text-secondary-600">Compete against AI agents in real-time challenges. Your performance metrics provide additional proof of your capabilities.</p>
                  </div>
                </div>
              </div>
              
              <div className="mt-8 bg-gradient-to-r from-green-600 to-green-700 rounded-lg p-6 text-white">
                <h4 className="text-lg font-semibold mb-2">🛡️ Anti-Cheating Measures</h4>
                <ul className="space-y-2 text-green-100">
                  <li>• No answer banks or test banks to memorize</li>
                  <li>• Unique scenarios for every practice session</li>
                  <li>• Real-time query execution and validation</li>
                  <li>• AI analysis of problem-solving approach</li>
                  <li>• Performance tracking across multiple sessions</li>
                </ul>
              </div>
            </div>
            
            {/* Legitimacy Comparison */}
            <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl shadow-xl p-8 border border-gray-200">
              <h3 className="text-2xl font-bold text-secondary-900 mb-6 text-center">
                Traditional vs. Our Approach
              </h3>
              
              <div className="space-y-6">
                <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-r-lg">
                  <h4 className="font-semibold text-red-800 mb-2">❌ Traditional Bootcamps</h4>
                  <ul className="text-sm text-red-700 space-y-1">
                    <li>• Reuse popular test banks every semester</li>
                    <li>• Answers available online for memorization</li>
                    <li>• Limited verification of actual skills</li>
                    <li>• Same curriculum year after year</li>
                  </ul>
                </div>
                
                <div className="bg-green-50 border-l-4 border-green-400 p-4 rounded-r-lg">
                  <h4 className="font-semibold text-green-800 mb-2">✅ SQL Trainer AI</h4>
                  <ul className="text-sm text-green-700 space-y-1">
                    <li>• Unique schemas generated for each session</li>
                    <li>• Real database execution and validation</li>
                    <li>• AI analysis of problem-solving approach</li>
                    <li>• Continuous adaptation and improvement</li>
                  </ul>
                </div>
                
                <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-r-lg">
                  <h4 className="font-semibold text-blue-800 mb-2">💡 The Reality</h4>
                  <p className="text-sm text-blue-700">
                    Even at elite universities like Harvard, students can get help from others or find answers online. 
                    Our system focuses on <strong>verifiable skill demonstration</strong> rather than just preventing all forms of assistance.
                  </p>
                </div>
              </div>
              
              <div className="mt-6 text-center">
                <div className="inline-flex items-center bg-green-100 text-green-800 px-4 py-2 rounded-full text-sm font-medium">
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Legitimate because it's verifiable
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gradient-to-br from-blue-600 to-blue-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Ready to Master SQL?
          </h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Join thousands of learners who are already improving their SQL skills 
            with our AI-powered platform.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {user ? (
              <Link to="/practice">
                <Button size="lg" variant="secondary" className="flex items-center space-x-2 bg-white text-blue-900 font-bold hover:bg-blue-50 hover:text-blue-900 shadow-lg border-2 border-blue-300">
                  <Play className="h-5 w-5" />
                  <span>Continue Learning</span>
                </Button>
              </Link>
            ) : (
              <GoogleSignInButton size="lg" className="flex items-center space-x-2 !bg-blue-600 !text-white hover:!bg-blue-700 hover:!text-white font-bold shadow-lg border-0">
                <span>Start Learning Free</span>
                <ArrowRight className="h-5 w-5" />
              </GoogleSignInButton>
            )}
            <Link to="/pricing">
              <Button size="lg" variant="outline" className="border-white text-white hover:bg-white hover:text-blue-600 shadow-lg">
                View Plans
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-secondary-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Stay Updated Section */}
          <div className="text-center mb-12">
            <h3 className="text-2xl font-bold mb-4">Stay Updated with Our Journey</h3>
            <p className="text-secondary-400 max-w-2xl mx-auto mb-8">
              Follow our development progress, technical insights, and community updates. 
              Learn about the latest advancements in AI-powered data analytics.
            </p>
            
            <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
              <a 
                href="https://www.firebird-technologies.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="bg-secondary-800 hover:bg-secondary-700 rounded-lg p-6 transition-colors group"
              >
                <div className="flex items-center justify-center mb-3">
                  <BookOpen className="h-8 w-8 text-primary-400 group-hover:text-primary-300" />
                </div>
                <h4 className="font-semibold mb-2">Read Our Substack</h4>
                <p className="text-sm text-secondary-400">Technical insights and updates</p>
                <div className="flex items-center justify-center mt-3 text-primary-400 group-hover:text-primary-300">
                  <ExternalLink className="h-4 w-4" />
                </div>
              </a>
              
              <a 
                href="https://www.firebird-technologies.com/p/building-sql-trainer-ais-backend" 
                target="_blank" 
                rel="noopener noreferrer"
                className="bg-secondary-800 hover:bg-secondary-700 rounded-lg p-6 transition-colors group"
              >
                <div className="flex items-center justify-center mb-3">
                  <Brain className="h-8 w-8 text-primary-400 group-hover:text-primary-300" />
                </div>
                <h4 className="font-semibold mb-2">Technical Blog</h4>
                <p className="text-sm text-secondary-400">Deep dive into our AI architecture</p>
                <div className="flex items-center justify-center mt-3 text-primary-400 group-hover:text-primary-300">
                  <ExternalLink className="h-4 w-4" />
                </div>
              </a>
              
              <a 
                href="https://www.linkedin.com/company/firebird-technologies-singapore/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="bg-secondary-800 hover:bg-secondary-700 rounded-lg p-6 transition-colors group"
              >
                <div className="flex items-center justify-center mb-3">
                  <Users className="h-8 w-8 text-primary-400 group-hover:text-primary-300" />
                </div>
                <h4 className="font-semibold mb-2">FireBirdTech</h4>
                <p className="text-sm text-secondary-400">Follow us on LinkedIn</p>
                <div className="flex items-center justify-center mt-3 text-primary-400 group-hover:text-primary-300">
                  <ExternalLink className="h-4 w-4" />
                </div>
              </a>
            </div>
          </div>
          
          {/* Traditional Footer Links */}
                      <div className="grid md:grid-cols-4 gap-8 mb-8">
              <div>
                <div className="flex items-center space-x-2 mb-4">
                  <img 
                    src="/images/SQLTrainerAI.png" 
                    alt="SQL Trainer AI" 
                    className="h-8 w-auto" 
                  />
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
                <li><a href="https://www.firebird-technologies.com" className="hover:text-white">Follow our Blog</a></li>
                <li><a href="#" className="hover:text-white">Contact</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Resources</h3>
              <ul className="space-y-2 text-secondary-400">
                <li><a href="#" className="hover:text-white">Help Center</a></li>
                <li><a href="#" className="hover:text-white">Documentation</a></li>
                <li><a href="#" className="hover:text-white">Privacy Policy</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-secondary-800 pt-8 text-center text-secondary-400">
            <p>&copy; 2025 sqltrainerai.com. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}; 