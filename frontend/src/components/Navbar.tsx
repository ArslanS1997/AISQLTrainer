import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { UserSubscription } from '../types';
import { Button } from './Button';
import { 
  Database, 
  BarChart3, 
  Trophy, 
  User, 
  LogOut,
  Menu,
  X,
  CreditCard,
  Award
} from 'lucide-react';
import { ModelSelector } from './ModelSelector';
import { useClickOutside } from '../utils/useClickOutside';
import { useSubscriptionUpdate } from '../utils/useSubscriptionUpdate';
import logo from '../../images/SQLTrainerAI.svg';


export const Navbar: React.FC = () => {
  // FIX: Add signOut to the destructuring
  const { user, subscription, isPremiumUser, signOut } = useAuth();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [localSubscription, setLocalSubscription] = useState(subscription);

  // React to subscription updates with proper typing
  useSubscriptionUpdate((newSubscription: UserSubscription) => {
    setLocalSubscription(newSubscription);
    // Force re-render or update any local state
  });

  const navigation = [
    { name: 'Practice', href: '/practice', icon: Database },
    { name: 'Achievements', href: '/achievements', icon: BarChart3 },
    { name: 'Compete', href: '/compete', icon: Trophy },
    { name: 'Certificates', href: '/certificate', icon: Award },
    // { name: 'Subscription', href: '/subscription', icon: CreditCard },
  ];

  const isActive = (path: string) => location.pathname === path;

  const ref = useClickOutside(() => setIsUserMenuOpen(false));

  return (
    <nav className="bg-white shadow-sm border-b border-secondary-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="flex items-center">
              <img 
                src={logo}
                alt="SQL Trainer AI" 
                className="h-8 w-auto" 
              />
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive(item.href)
                      ? 'text-primary-600 bg-primary-50'
                      : 'text-secondary-600 hover:text-secondary-900 hover:bg-secondary-50'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </div>

          {/* User Menu */}
          <div className="hidden md:flex items-center space-x-4">
            {/* Add ModelSelector here */}
            <ModelSelector />
            
            <div className="relative" ref={ref}>
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center space-x-2 hover:bg-gray-50 rounded-md p-1 transition-colors"
              >
                {user?.picture ? (
                  <img
                    src={user.picture}
                    alt={user.name}
                    className="h-8 w-8 rounded-full"
                  />
                ) : (
                  <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center">
                    <User className="h-4 w-4 text-primary-600" />
                  </div>
                )}
                <span className="text-sm font-medium text-secondary-900">{user?.name}</span>
              </button>

              {/* Dropdown Menu */}
              {isUserMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-50">
                  <div className="py-1">
                    <Link
                      to="/subscription"
                      onClick={() => setIsUserMenuOpen(false)}
                      className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      <CreditCard className="h-4 w-4 mr-3" />
                      Subscription
                    </Link>
                    <button
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        signOut();
                      }}
                      className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      <LogOut className="h-4 w-4 mr-3" />
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>


          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-secondary-600 hover:text-secondary-900"
            >
              {isMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      {isMenuOpen && (
        <div className="md:hidden">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-white border-t border-secondary-200">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-md text-base font-medium transition-colors ${
                    isActive(item.href)
                      ? 'text-primary-600 bg-primary-50'
                      : 'text-secondary-600 hover:text-secondary-900 hover:bg-secondary-50'
                  }`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  <Icon className="h-5 w-5" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
            
            <div className="pt-4 border-t border-secondary-200">
              <div className="flex items-center justify-between px-3 py-2">
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-secondary-600">Points:</span>
                  <span className="text-sm font-semibold text-primary-600">{user?.points || 0}</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={signOut}
                  className="text-secondary-600 hover:text-secondary-900"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}; 