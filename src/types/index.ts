export interface Content {
  id: string;
  title: string;
  description: string;
  body: string;
  createdAt: string;
  isPublic: boolean;
  youtubeChannelUrl?: string;
  youtubeChannelId?: string;
  attachments?: FileAttachment[];
}

export interface FileAttachment {
  id: string;
  name: string;
  type: string;
  size: number;
  url: string;
  uploadedAt: string;
}

export interface Subscription {
  id: string;
  email: string;
  contentId: string;
  subscribedAt: string;
  youtubeSubscribed: boolean;
  googleAccessToken?: string;
}

export interface User {
  id: string;
  email: string;
  role: 'admin' | 'visitor';
}

export interface YouTubeChannelConfig {
  channelUrl: string;
  channelName: string;
  channelId: string;
  enabled: boolean;
}

export interface GoogleAuthResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
}

export interface YouTubeSubscription {
  kind: string;
  etag: string;
  id: string;
  snippet: {
    publishedAt: string;
    title: string;
    description: string;
    resourceId: {
      kind: string;
      channelId: string;
    };
    channelId: string;
    thumbnails: {
      default: { url: string };
      medium: { url: string };
      high: { url: string };
    };
  };
}

export interface YouTubeSubscriptionsResponse {
  kind: string;
  etag: string;
  nextPageToken?: string;
  prevPageToken?: string;
  pageInfo: {
    totalResults: number;
    resultsPerPage: number;
  };
  items: YouTubeSubscription[];
}