import { Content, Subscription, User, FileAttachment, YouTubeChannelConfig } from '../types';
import { getDatabase, saveDatabase } from './database';

// Content operations
export const saveContent = async (content: Content): Promise<void> => {
  const db = getDatabase();
  if (!db) throw new Error('Database not initialized');

  const stmt = db.prepare(`
    INSERT OR REPLACE INTO content 
    (id, title, description, body, created_at, is_public, youtube_channel_url)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run([
    content.id,
    content.title,
    content.description,
    content.body,
    content.createdAt,
    content.isPublic ? 1 : 0,
    content.youtubeChannelUrl || null
  ]);
  stmt.free();

  // Save attachments if any
  if (content.attachments) {
    for (const attachment of content.attachments) {
      await saveFileAttachment(content.id, attachment);
    }
  }

  saveDatabase();
};

export const getContent = (): Content[] => {
  const db = getDatabase();
  if (!db) return [];

  const stmt = db.prepare(`
    SELECT c.*, 
           GROUP_CONCAT(
             json_object(
               'id', f.id,
               'name', f.name,
               'type', f.type,
               'size', f.size,
               'url', f.url,
               'uploadedAt', f.uploaded_at
             )
           ) as attachments
    FROM content c
    LEFT JOIN file_attachments f ON c.id = f.content_id
    GROUP BY c.id
    ORDER BY c.created_at DESC
  `);

  const results = stmt.getAsObject({});
  const content: Content[] = [];

  while (stmt.step()) {
    const row = stmt.getAsObject();
    const attachments = row.attachments 
      ? row.attachments.toString().split(',').map((a: string) => JSON.parse(a))
      : [];

    content.push({
      id: row.id as string,
      title: row.title as string,
      description: row.description as string,
      body: row.body as string,
      createdAt: row.created_at as string,
      isPublic: Boolean(row.is_public),
      youtubeChannelUrl: row.youtube_channel_url as string || undefined,
      attachments
    });
  }

  stmt.free();
  return content;
};

export const getContentById = (id: string): Content | null => {
  const db = getDatabase();
  if (!db) return null;

  const stmt = db.prepare(`
    SELECT c.*, 
           GROUP_CONCAT(
             json_object(
               'id', f.id,
               'name', f.name,
               'type', f.type,
               'size', f.size,
               'url', f.url,
               'uploadedAt', f.uploaded_at
             )
           ) as attachments
    FROM content c
    LEFT JOIN file_attachments f ON c.id = f.content_id
    WHERE c.id = ?
    GROUP BY c.id
  `);

  stmt.bind([id]);
  
  if (stmt.step()) {
    const row = stmt.getAsObject();
    const attachments = row.attachments 
      ? row.attachments.toString().split(',').map((a: string) => JSON.parse(a))
      : [];

    stmt.free();
    return {
      id: row.id as string,
      title: row.title as string,
      description: row.description as string,
      body: row.body as string,
      createdAt: row.created_at as string,
      isPublic: Boolean(row.is_public),
      youtubeChannelUrl: row.youtube_channel_url as string || undefined,
      attachments
    };
  }

  stmt.free();
  return null;
};

export const deleteContent = (id: string): void => {
  const db = getDatabase();
  if (!db) return;

  const stmt = db.prepare("DELETE FROM content WHERE id = ?");
  stmt.run([id]);
  stmt.free();
  saveDatabase();
};

// File attachment operations
export const saveFileAttachment = async (contentId: string, attachment: FileAttachment): Promise<void> => {
  const db = getDatabase();
  if (!db) throw new Error('Database not initialized');

  const stmt = db.prepare(`
    INSERT OR REPLACE INTO file_attachments 
    (id, content_id, name, type, size, url, uploaded_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run([
    attachment.id,
    contentId,
    attachment.name,
    attachment.type,
    attachment.size,
    attachment.url,
    attachment.uploadedAt
  ]);
  stmt.free();
  saveDatabase();
};

// Subscription operations
export const saveSubscription = (subscription: Subscription): void => {
  const db = getDatabase();
  if (!db) return;

  const stmt = db.prepare(`
    INSERT OR REPLACE INTO subscriptions 
    (id, email, content_id, subscribed_at, youtube_subscribed)
    VALUES (?, ?, ?, ?, ?)
  `);

  stmt.run([
    subscription.id,
    subscription.email,
    subscription.contentId,
    subscription.subscribedAt,
    subscription.youtubeSubscribed ? 1 : 0
  ]);
  stmt.free();
  saveDatabase();
};

export const getSubscriptions = (): Subscription[] => {
  const db = getDatabase();
  if (!db) return [];

  const stmt = db.prepare("SELECT * FROM subscriptions ORDER BY subscribed_at DESC");
  const subscriptions: Subscription[] = [];

  while (stmt.step()) {
    const row = stmt.getAsObject();
    subscriptions.push({
      id: row.id as string,
      email: row.email as string,
      contentId: row.content_id as string,
      subscribedAt: row.subscribed_at as string,
      youtubeSubscribed: Boolean(row.youtube_subscribed)
    });
  }

  stmt.free();
  return subscriptions;
};

export const isSubscribed = (email: string, contentId: string): boolean => {
  const db = getDatabase();
  if (!db) return false;

  const stmt = db.prepare(`
    SELECT COUNT(*) as count FROM subscriptions 
    WHERE email = ? AND content_id = ? AND youtube_subscribed = 1
  `);
  stmt.bind([email, contentId]);
  
  const result = stmt.getAsObject();
  stmt.free();
  return (result.count as number) > 0;
};

// YouTube configuration
export const saveYouTubeConfig = (config: YouTubeChannelConfig): void => {
  const db = getDatabase();
  if (!db) return;

  const stmt = db.prepare(`
    INSERT OR REPLACE INTO youtube_config (id, channel_url, channel_name, enabled)
    VALUES (1, ?, ?, ?)
  `);

  stmt.run([config.channelUrl, config.channelName, config.enabled ? 1 : 0]);
  stmt.free();
  saveDatabase();
};

export const getYouTubeConfig = (): YouTubeChannelConfig | null => {
  const db = getDatabase();
  if (!db) return null;

  const stmt = db.prepare("SELECT * FROM youtube_config WHERE id = 1");
  
  if (stmt.step()) {
    const row = stmt.getAsObject();
    stmt.free();
    return {
      channelUrl: row.channel_url as string,
      channelName: row.channel_name as string,
      enabled: Boolean(row.enabled)
    };
  }

  stmt.free();
  return null;
};

// User operations
export const setCurrentUser = (user: User | null): void => {
  if (user) {
    localStorage.setItem('current_user', JSON.stringify(user));
  } else {
    localStorage.removeItem('current_user');
  }
};

export const getCurrentUser = (): User | null => {
  const data = localStorage.getItem('current_user');
  return data ? JSON.parse(data) : null;
};

// Admin authentication
export const validateAdminCredentials = (email: string, password: string): boolean => {
  const db = getDatabase();
  if (!db) return false;

  const stmt = db.prepare("SELECT COUNT(*) as count FROM admin_credentials WHERE email = ? AND password = ?");
  stmt.bind([email, password]);
  
  const result = stmt.getAsObject();
  stmt.free();
  return (result.count as number) > 0;
};

// Generate unique ID
export const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

// File upload utilities
export const uploadFile = (file: File): Promise<FileAttachment> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const attachment: FileAttachment = {
        id: generateId(),
        name: file.name,
        type: file.type,
        size: file.size,
        url: reader.result as string,
        uploadedAt: new Date().toISOString()
      };
      resolve(attachment);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};