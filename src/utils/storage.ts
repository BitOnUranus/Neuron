import { Content, Subscription, User, FileAttachment, YouTubeChannelConfig } from '../types';
import { getDatabase, saveDatabase, initializeDatabase } from './database';

// Ensure database is initialized before any operations
const ensureDatabase = async () => {
  let db = getDatabase();
  if (!db) {
    db = await initializeDatabase();
  }
  return db;
};

// Content operations
export const saveContent = async (content: Content): Promise<void> => {
  const db = await ensureDatabase();
  if (!db) throw new Error('Database not initialized');

  const stmt = db.prepare(`
    INSERT OR REPLACE INTO content 
    (id, title, description, body, created_at, is_public, youtube_channel_url, youtube_channel_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run([
    content.id,
    content.title,
    content.description,
    content.body,
    content.createdAt,
    content.isPublic ? 1 : 0,
    content.youtubeChannelUrl || null,
    content.youtubeChannelId || null
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

export const getContent = async (): Promise<Content[]> => {
  const db = await ensureDatabase();
  if (!db) return [];

  const stmt = db.prepare(`
    SELECT c.*, 
           json_group_array(
             json_object(
               'id', f.id,
               'name', f.name,
               'type', f.type,
               'size', f.size,
               'url', f.url,
               'uploadedAt', f.uploaded_at
             )
           ) FILTER (WHERE f.id IS NOT NULL) as attachments
    FROM content c
    LEFT JOIN file_attachments f ON c.id = f.content_id
    GROUP BY c.id
    ORDER BY c.created_at DESC
  `);

  const content: Content[] = [];

  while (stmt.step()) {
    const row = stmt.getAsObject();
    const attachments = row.attachments && row.attachments !== 'null'
      ? JSON.parse(row.attachments.toString())
      : [];

    content.push({
      id: row.id as string,
      title: row.title as string,
      description: row.description as string,
      body: row.body as string,
      createdAt: row.created_at as string,
      isPublic: Boolean(row.is_public),
      youtubeChannelUrl: row.youtube_channel_url as string || undefined,
      youtubeChannelId: row.youtube_channel_id as string || undefined,
      attachments
    });
  }

  stmt.free();
  return content;
};

export const getContentById = async (id: string): Promise<Content | null> => {
  const db = await ensureDatabase();
  if (!db) return null;

  const stmt = db.prepare(`
    SELECT c.*, 
           json_group_array(
             json_object(
               'id', f.id,
               'name', f.name,
               'type', f.type,
               'size', f.size,
               'url', f.url,
               'uploadedAt', f.uploaded_at
             )
           ) FILTER (WHERE f.id IS NOT NULL) as attachments
    FROM content c
    LEFT JOIN file_attachments f ON c.id = f.content_id
    WHERE c.id = ?
    GROUP BY c.id
  `);

  stmt.bind([id]);
  
  if (stmt.step()) {
    const row = stmt.getAsObject();
    const attachments = row.attachments && row.attachments !== 'null'
      ? JSON.parse(row.attachments.toString())
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
      youtubeChannelId: row.youtube_channel_id as string || undefined,
      attachments
    };
  }

  stmt.free();
  return null;
};

export const deleteContent = async (id: string): Promise<void> => {
  const db = await ensureDatabase();
  if (!db) return;

  const stmt = db.prepare("DELETE FROM content WHERE id = ?");
  stmt.run([id]);
  stmt.free();
  saveDatabase();
};

// File attachment operations
export const saveFileAttachment = async (contentId: string, attachment: FileAttachment): Promise<void> => {
  const db = await ensureDatabase();
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
export const saveSubscription = async (subscription: Subscription): Promise<void> => {
  const db = await ensureDatabase();
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

export const getSubscriptions = async (): Promise<Subscription[]> => {
  const db = await ensureDatabase();
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
      youtubeSubscribed: Boolean(row.youtube_subscribed),
      googleAccessToken: row.google_access_token as string || undefined
    });
  }

  stmt.free();
  return subscriptions;
};

export const isSubscribed = async (email: string, contentId: string): Promise<boolean> => {
  const db = await ensureDatabase();
  if (!db) return false;

  const stmt = db.prepare(`
    SELECT COUNT(*) as count FROM subscriptions 
    WHERE email = ? AND content_id = ?
  `);
  stmt.bind([email, contentId]);
  
  const result = stmt.getAsObject();
  stmt.free();
  return (result.count as number) > 0;
};

// YouTube configuration
export const saveYouTubeConfig = async (config: YouTubeChannelConfig): Promise<void> => {
  const db = await ensureDatabase();
  if (!db) return;

  const stmt = db.prepare(`
    INSERT OR REPLACE INTO youtube_config (id, channel_url, channel_name, channel_id, enabled)
    VALUES (1, ?, ?, ?, ?)
  `);

  stmt.run([config.channelUrl, config.channelName, config.channelId, config.enabled ? 1 : 0]);
  stmt.free();
  saveDatabase();
};

export const getYouTubeConfig = async (): Promise<YouTubeChannelConfig | null> => {
  const db = await ensureDatabase();
  if (!db) return null;

  const stmt = db.prepare("SELECT * FROM youtube_config WHERE id = 1");
  
  if (stmt.step()) {
    const row = stmt.getAsObject();
    stmt.free();
    return {
      channelUrl: row.channel_url as string,
      channelName: row.channel_name as string,
      channelId: row.channel_id as string,
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
export const validateAdminCredentials = async (email: string, password: string): Promise<boolean> => {
  const db = await ensureDatabase();
  if (!db) return false;

  // Fallback check for demo credentials
  if (email === 'admin@example.com' && password === 'admin123') {
    return true;
  }

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