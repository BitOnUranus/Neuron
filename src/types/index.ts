export interface Content {
  id: string;
  title: string;
  description: string;
  body: string;
  createdAt: string;
  isPublic: boolean;
  youtubeChannelUrl?: string;
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
}

export interface User {
  id: string;
  email: string;
  role: 'admin' | 'visitor';
}

export interface YouTubeChannelConfig {
  channelUrl: string;
  channelName: string;
  enabled: boolean;
}