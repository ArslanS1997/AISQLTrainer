import React from 'react';
import { useAuth } from '../contexts/AuthContext';

interface GoogleSignInButtonProps {
  className?: string;
  children?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

export const GoogleSignInButton: React.FC<GoogleSignInButtonProps> = ({ 
  className = '', 
  children,
  size = 'md'
}) => {
  const { signIn } = useAuth();

  const handleSignIn = async () => {
    try {
      await signIn();
    } catch (error) {
      console.error('Google sign-in failed:', error);
    }
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'px-3 py-1.5 text-sm';
      case 'lg':
        return 'px-6 py-3 text-lg';
      default:
        return 'px-5 py-2.5';
    }
  };

  return (
    <button
      onClick={handleSignIn}
      className={`flex items-center justify-center rounded-lg shadow-sm bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors ${getSizeClasses()} ${className}`}
    >
      {children || 'Sign in'}
    </button>
  );
}; 