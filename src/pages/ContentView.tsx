import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Content, Subscription } from '../types';
import { getContentById, saveSubscription, isSubscribed, generateId, getYouTubeConfig } from '../utils/storage';
import { Lock, Mail, CheckCircle, ArrowLeft, Youtube, Download, Eye, Chrome } from 'lucide-react';
import { Link } from 'react-router-dom';
import { GoogleAuthButton } from '../components/GoogleAuthButton';
import { checkYouTubeSubscription, resolveChannelId } from '../utils/googleAuth';

export const ContentView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [content, setContent] = useState<Content | null>(null);
  const [email, setEmail] = useState('');
  const [hasAccess, setHasAccess] = useState(false);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState(false);
  const [error, setError] = useState('');
  const [youtubeConfig, setYoutubeConfig] = useState<any>(null);
  const [authStep, setAuthStep] = useState<'email' | 'google-auth' | 'checking'>('email');
  const [googleAuthData, setGoogleAuthData] = useState<any>(null);

  useEffect(() => {
    loadContent();
  }, [id]);

  useEffect(() => {
    // Listen for Google auth completion
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'google_auth_data' && e.newValue) {
        const authData = JSON.parse(e.newValue);
        setGoogleAuthData(authData);
        localStorage.removeItem('google_auth_data'); // Clean up
        handleGoogleAuthComplete(authData);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [content, youtubeConfig, email, id]);

  const loadContent = async () => {
    if (!id) return;
    
    try {
      const contentData = await getContentById(id);
      setContent(contentData);
      
      if (contentData?.isPublic) {
        setHasAccess(true);
      }
      
      const config = await getYouTubeConfig();
      setYoutubeConfig(config);
    } catch (error) {
      console.error('Error loading content:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuthComplete = async (authData: any) => {
    if (!content || !youtubeConfig || !id) return;

    setAuthStep('checking');
    setSubscribing(true);
    setError('');

    try {
      // Get the target channel ID
      const targetChannelUrl = content.youtubeChannelUrl || youtubeConfig.channelUrl;
      let targetChannelId = content.youtubeChannelId || youtubeConfig.channelId;

      if (!targetChannelId) {
        targetChannelId = await resolveChannelId(targetChannelUrl);
        if (!targetChannelId) {
          throw new Error('Could not resolve YouTube channel ID');
        }
      }

      // Check if user is subscribed to the channel
      const isSubscribedToChannel = await checkYouTubeSubscription(
        authData.accessToken,
        targetChannelId
      );

      if (isSubscribedToChannel) {
        // Create subscription record
        const subscription: Subscription = {
          id: generateId(),
          email: email || authData.userProfile.email,
          contentId: id,
          subscribedAt: new Date().toISOString(),
          youtubeSubscribed: true,
          googleAccessToken: authData.accessToken
        };

        await saveSubscription(subscription);
        setHasAccess(true);
        setError('');
      } else {
        setError(`You need to subscribe to ${youtubeConfig.channelName} on YouTube to access this content.`);
        setAuthStep('email');
      }
    } catch (error) {
      console.error('Error checking YouTube subscription:', error);
      setError('Failed to verify YouTube subscription. Please try again.');
      setAuthStep('email');
    } finally {
      setSubscribing(false);
    }
  };

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError('Please enter your email address.');
      return;
    }

    if (youtubeConfig?.enabled) {
      setAuthStep('google-auth');
      setError('');
    } else {
      handleDirectSubscription();
    }
  };

  const handleDirectSubscription = async () => {
    if (!id || !content) return;

    setSubscribing(true);
    setError('');

    try {
      const alreadySubscribed = await isSubscribed(email, id);
      if (alreadySubscribed) {
        setHasAccess(true);
        return;
      }

      const subscription: Subscription = {
        id: generateId(),
        email: email,
        contentId: id,
        subscribedAt: new Date().toISOString(),
        youtubeSubscribed: false
      };

      await saveSubscription(subscription);
      setHasAccess(true);
    } catch (err) {
      setError('Subscription failed. Please try again.');
      console.error('Subscription error:', err);
    } finally {
      setSubscribing(false);
    }
  };

  const handleGoogleAuthStart = () => {
    setError('');
    setSubscribing(true);
  };

  const checkExistingSubscription = async () => {
    if (!id || !email) return;
    
    try {
      const subscribed = await isSubscribed(email, id);
      if (subscribed) {
        setHasAccess(true);
      }
    } catch (error) {
      console.error('Error checking subscription:', error);
    }
  };

  const downloadFile = (attachment: any) => {
    const link = document.createElement('a');
    link.href = attachment.url;
    link.download = attachment.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const previewFile = (attachment: any) => {
    if (attachment.type.startsWith('image/') || attachment.type === 'application/pdf') {
      window.open(attachment.url, '_blank');
    } else {
      downloadFile(attachment);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!content) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Content Not Found</h1>
          <p className="text-gray-600 mb-6">The content you're looking for doesn't exist.</p>
          <Link
            to="/"
            className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  if (!hasAccess && !content.isPublic) {
    return (
      <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock className="h-8 w-8 text-indigo-600" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900">Premium Content</h2>
            <p className="mt-2 text-gray-600">
              {youtubeConfig?.enabled 
                ? 'Verify your YouTube subscription to access this content' 
                : 'Subscribe to access this exclusive content'
              }
            </p>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg p-8">
            <div className="mb-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">{content.title}</h3>
              <p className="text-gray-600">{content.description}</p>
            </div>

            {error && (
              <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}

            {authStep === 'email' && (
              <form onSubmit={handleEmailSubmit} className="space-y-6">
                <div>
                  <label htmlFor="email" className="sr-only">
                    Email address
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onBlur={checkExistingSubscription}
                      className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors"
                      placeholder="Enter your email address"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={subscribing || !email}
                  className="w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {youtubeConfig?.enabled ? 'Continue to Verification' : 'Subscribe & Access Content'}
                </button>
              </form>
            )}

            {authStep === 'google-auth' && youtubeConfig?.enabled && (
              <div className="space-y-6">
                <div className="text-center">
                  <Youtube className="h-12 w-12 text-red-600 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Verify YouTube Subscription
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Sign in with Google to verify that you're subscribed to <strong>{youtubeConfig.channelName}</strong>
                  </p>
                </div>

                <GoogleAuthButton
                  onAuthStart={handleGoogleAuthStart}
                  disabled={subscribing}
                />

                <div className="text-center">
                  <button
                    onClick={() => setAuthStep('email')}
                    className="text-sm text-indigo-600 hover:text-indigo-500"
                  >
                    ← Back to email
                  </button>
                </div>
              </div>
            )}

            {authStep === 'checking' && (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Verifying your YouTube subscription...</p>
              </div>
            )}

            <div className="mt-6 text-center">
              <p className="text-xs text-gray-500">
                {youtubeConfig?.enabled 
                  ? 'We use Google OAuth to securely verify your YouTube subscriptions. Your data is not stored.'
                  : 'By subscribing, you\'ll get instant access to this premium content.'
                }
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {hasAccess && !content.isPublic && (
        <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center">
            <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
            <p className="text-green-800 text-sm">
              You have access to this premium content! Thank you for subscribing.
            </p>
          </div>
        </div>
      )}

      <article className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg p-8 border border-gray-200/50">
        <header className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">{content.title}</h1>
          <p className="text-xl text-gray-600 leading-relaxed">{content.description}</p>
          <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
            <span>Published: {new Date(content.createdAt).toLocaleDateString()}</span>
            <span className={`px-3 py-1 rounded-full text-xs ${content.isPublic ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
              {content.isPublic ? 'Free Content' : 'Premium Content'}
            </span>
          </div>
        </header>

        {/* File Attachments */}
        {content.attachments && content.attachments.length > 0 && (
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Attachments</h3>
            <div className="grid gap-3">
              {content.attachments.map((attachment) => (
                <div
                  key={attachment.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <div className="text-gray-500">
                      {attachment.type.startsWith('image/') && <Eye className="h-5 w-5" />}
                      {attachment.type.startsWith('video/') && <Eye className="h-5 w-5" />}
                      {!attachment.type.startsWith('image/') && !attachment.type.startsWith('video/') && <Download className="h-5 w-5" />}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{attachment.name}</p>
                      <p className="text-xs text-gray-500">
                        {(attachment.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => previewFile(attachment)}
                      className="px-3 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors text-sm"
                    >
                      {attachment.type.startsWith('image/') || attachment.type === 'application/pdf' ? 'Preview' : 'Download'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="prose prose-lg max-w-none">
          <div className="whitespace-pre-wrap text-gray-800 leading-relaxed">
            {content.body}
          </div>
        </div>
      </article>

      <div className="mt-8 text-center">
        <Link
          to="/"
          className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-lg text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition-colors"
        >
          <ArrowLeft className="h-5 w-5 mr-2" />
          Back to Home
        </Link>
      </div>
    </div>
  );
};