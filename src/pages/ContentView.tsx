import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Content, Subscription } from '../types';
import { getContentById, saveSubscription, isSubscribed, generateId, getYouTubeConfig } from '../utils/storage';
import { Lock, Mail, CheckCircle, ArrowLeft, Youtube, Download, Eye } from 'lucide-react';
import { Link } from 'react-router-dom';

export const ContentView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [content, setContent] = useState<Content | null>(null);
  const [email, setEmail] = useState('');
  const [hasAccess, setHasAccess] = useState(false);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState(false);
  const [error, setError] = useState('');
  const [youtubeConfig, setYoutubeConfig] = useState<any>(null);

  useEffect(() => {
    loadContent();
  }, [id]);

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

  const handleYouTubeSubscribe = () => {
    if (!content || !youtubeConfig) return;

    const channelUrl = content.youtubeChannelUrl || youtubeConfig.channelUrl;
    
    // Open YouTube channel in new tab
    window.open(channelUrl, '_blank');
    
    // After a short delay, show the confirmation button
    setTimeout(() => {
      const confirmed = window.confirm(
        `Please subscribe to our YouTube channel and then click OK to access the content.\n\nChannel: ${youtubeConfig.channelName}`
      );
      
      if (confirmed && id) {
        // Create subscription record
        const subscription: Subscription = {
          id: generateId(),
          email: email,
          contentId: id,
          subscribedAt: new Date().toISOString(),
          youtubeSubscribed: true
        };

        saveSubscription(subscription);
        setHasAccess(true);
      }
    }, 2000);
  };

  const handleEmailSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !content) return;

    setSubscribing(true);
    setError('');

    try {
      // Check if already subscribed
      const alreadySubscribed = await isSubscribed(email, id);
      if (alreadySubscribed) {
        setHasAccess(true);
        setSubscribing(false);
        return;
      }

      // If YouTube subscription is required and enabled
      if (youtubeConfig?.enabled && !content.isPublic) {
        handleYouTubeSubscribe();
      } else {
        // Direct subscription without YouTube requirement
        const subscription: Subscription = {
          id: generateId(),
          email: email,
          contentId: id,
          subscribedAt: new Date().toISOString(),
          youtubeSubscribed: false
        };

        await saveSubscription(subscription);
        setHasAccess(true);
      }
    } catch (err) {
      setError('Subscription failed. Please try again.');
      console.error('Subscription error:', err);
    } finally {
      setSubscribing(false);
    }
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
    const channelUrl = content.youtubeChannelUrl || youtubeConfig?.channelUrl;
    
    return (
      <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock className="h-8 w-8 text-indigo-600" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900">Premium Content</h2>
            <p className="mt-2 text-gray-600">
              {youtubeConfig?.enabled ? 'Subscribe to our YouTube channel to access this content' : 'Subscribe to access this exclusive content'}
            </p>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg p-8">
            <div className="mb-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">{content.title}</h3>
              <p className="text-gray-600">{content.description}</p>
            </div>

            {youtubeConfig?.enabled && channelUrl && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <Youtube className="h-5 w-5 text-red-600" />
                  <span className="font-medium text-red-800">YouTube Subscription Required</span>
                </div>
                <p className="text-sm text-red-700 mb-3">
                  Subscribe to <strong>{youtubeConfig.channelName}</strong> to unlock this premium content.
                </p>
                <button
                  onClick={handleYouTubeSubscribe}
                  className="w-full bg-red-600 hover:bg-red-700 text-white px-4 py-3 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
                >
                  <Youtube className="h-5 w-5" />
                  <span>Subscribe on YouTube</span>
                </button>
              </div>
            )}

            <form onSubmit={handleEmailSubscribe} className="space-y-6">
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-red-700 text-sm">{error}</p>
                </div>
              )}

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
                    placeholder="Enter your email to subscribe"
                  />
                </div>
              </div>

              {!youtubeConfig?.enabled && (
                <button
                  type="submit"
                  disabled={subscribing}
                  className="w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {subscribing ? 'Subscribing...' : 'Subscribe & Access Content'}
                </button>
              )}
            </form>

            <div className="mt-6 text-center">
              <p className="text-xs text-gray-500">
                {youtubeConfig?.enabled 
                  ? 'By subscribing to our YouTube channel, you\'ll get instant access to this premium content.'
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