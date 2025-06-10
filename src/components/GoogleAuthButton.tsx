import React, { useState } from 'react';
import { Chrome, Loader2 } from 'lucide-react';
import { getGoogleAuthUrl } from '../utils/googleAuth';

interface GoogleAuthButtonProps {
  onAuthStart: () => void;
  disabled?: boolean;
  className?: string;
}

export const GoogleAuthButton: React.FC<GoogleAuthButtonProps> = ({
  onAuthStart,
  disabled = false,
  className = ''
}) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleAuth = () => {
    setIsLoading(true);
    onAuthStart();
    
    // Open Google OAuth in a popup window
    const authUrl = getGoogleAuthUrl();
    const popup = window.open(
      authUrl,
      'google-auth',
      'width=500,height=600,scrollbars=yes,resizable=yes'
    );

    // Listen for the popup to close
    const checkClosed = setInterval(() => {
      if (popup?.closed) {
        clearInterval(checkClosed);
        setIsLoading(false);
      }
    }, 1000);
  };

  return (
    <button
      type="button"
      onClick={handleGoogleAuth}
      disabled={disabled || isLoading}
      className={`w-full flex items-center justify-center space-x-2 px-4 py-3 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed transition-colors ${className}`}
    >
      {isLoading ? (
        <Loader2 className="h-5 w-5 animate-spin text-gray-600" />
      ) : (
        <Chrome className="h-5 w-5 text-blue-600" />
      )}
      <span className="text-gray-700 font-medium">
        {isLoading ? 'Connecting to Google...' : 'Sign in with Google'}
      </span>
    </button>
  );
};