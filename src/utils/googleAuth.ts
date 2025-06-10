// Google OAuth configuration
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || 'your-google-client-id';
const GOOGLE_REDIRECT_URI = `${window.location.origin}/auth/callback`;
const YOUTUBE_API_KEY = import.meta.env.VITE_YOUTUBE_API_KEY || 'your-youtube-api-key';

export interface GoogleAuthConfig {
  clientId: string;
  redirectUri: string;
  scope: string;
}

export const getGoogleAuthUrl = (): string => {
  const config: GoogleAuthConfig = {
    clientId: GOOGLE_CLIENT_ID,
    redirectUri: GOOGLE_REDIRECT_URI,
    scope: 'https://www.googleapis.com/auth/youtube.readonly email profile'
  };

  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: 'code',
    scope: config.scope,
    access_type: 'offline',
    prompt: 'consent'
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
};

export const exchangeCodeForToken = async (code: string): Promise<any> => {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: import.meta.env.VITE_GOOGLE_CLIENT_SECRET || '',
      code,
      grant_type: 'authorization_code',
      redirect_uri: GOOGLE_REDIRECT_URI,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to exchange code for token');
  }

  return response.json();
};

export const getUserProfile = async (accessToken: string): Promise<any> => {
  const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to get user profile');
  }

  return response.json();
};

export const checkYouTubeSubscription = async (
  accessToken: string,
  targetChannelId: string
): Promise<boolean> => {
  try {
    let nextPageToken = '';
    let isSubscribed = false;

    do {
      const url = new URL('https://www.googleapis.com/youtube/v3/subscriptions');
      url.searchParams.append('part', 'snippet');
      url.searchParams.append('mine', 'true');
      url.searchParams.append('maxResults', '50');
      if (nextPageToken) {
        url.searchParams.append('pageToken', nextPageToken);
      }

      const response = await fetch(url.toString(), {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        console.error('YouTube API error:', response.status, response.statusText);
        throw new Error('Failed to fetch YouTube subscriptions');
      }

      const data = await response.json();
      
      // Check if target channel is in the subscriptions
      isSubscribed = data.items.some((item: any) => 
        item.snippet.resourceId.channelId === targetChannelId
      );

      if (isSubscribed) {
        break;
      }

      nextPageToken = data.nextPageToken || '';
    } while (nextPageToken);

    return isSubscribed;
  } catch (error) {
    console.error('Error checking YouTube subscription:', error);
    throw error;
  }
};

export const getChannelIdFromUrl = (channelUrl: string): string | null => {
  try {
    const url = new URL(channelUrl);
    
    // Handle different YouTube URL formats
    if (url.pathname.includes('/channel/')) {
      return url.pathname.split('/channel/')[1];
    }
    
    if (url.pathname.includes('/@')) {
      // For @username format, we need to resolve it to channel ID
      // This would typically require another API call
      const username = url.pathname.split('/@')[1];
      return username; // Return username for now, will need API resolution
    }
    
    if (url.pathname.includes('/c/') || url.pathname.includes('/user/')) {
      // Custom URL format, would need API resolution
      return null;
    }
    
    return null;
  } catch (error) {
    console.error('Error parsing channel URL:', error);
    return null;
  }
};

export const resolveChannelId = async (channelUrl: string): Promise<string | null> => {
  try {
    const directId = getChannelIdFromUrl(channelUrl);
    if (directId && directId.startsWith('UC')) {
      return directId;
    }

    // For @username or custom URLs, use YouTube API to resolve
    const url = new URL('https://www.googleapis.com/youtube/v3/search');
    url.searchParams.append('part', 'snippet');
    url.searchParams.append('type', 'channel');
    url.searchParams.append('q', channelUrl);
    url.searchParams.append('key', YOUTUBE_API_KEY);

    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error('Failed to resolve channel ID');
    }

    const data = await response.json();
    if (data.items && data.items.length > 0) {
      return data.items[0].snippet.channelId;
    }

    return null;
  } catch (error) {
    console.error('Error resolving channel ID:', error);
    return null;
  }
};