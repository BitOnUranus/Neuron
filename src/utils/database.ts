import initSqlJs, { Database } from 'sql.js';

let db: Database | null = null;

export const initializeDatabase = async (): Promise<Database> => {
  if (db) return db;

  const SQL = await initSqlJs({
    locateFile: (file) => `https://sql.js.org/dist/${file}`
  });

  // Try to load existing database from localStorage
  const savedDb = localStorage.getItem('content_database');
  if (savedDb) {
    const uint8Array = new Uint8Array(JSON.parse(savedDb));
    db = new SQL.Database(uint8Array);
  } else {
    db = new SQL.Database();
  }
  
  // Always ensure tables exist and admin credentials are set
  createTables();
  return db;
};

const createTables = () => {
  if (!db) return;

  // Content table
  db.exec(`
    CREATE TABLE IF NOT EXISTS content (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      body TEXT NOT NULL,
      created_at TEXT NOT NULL,
      is_public INTEGER DEFAULT 0,
      youtube_channel_url TEXT,
      youtube_channel_id TEXT
    )
  `);

  // File attachments table
  db.exec(`
    CREATE TABLE IF NOT EXISTS file_attachments (
      id TEXT PRIMARY KEY,
      content_id TEXT NOT NULL,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      size INTEGER NOT NULL,
      url TEXT NOT NULL,
      uploaded_at TEXT NOT NULL,
      FOREIGN KEY (content_id) REFERENCES content (id) ON DELETE CASCADE
    )
  `);

  // Subscriptions table
  db.exec(`
    CREATE TABLE IF NOT EXISTS subscriptions (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      content_id TEXT NOT NULL,
      subscribed_at TEXT NOT NULL,
      youtube_subscribed INTEGER DEFAULT 0,
      google_access_token TEXT,
      FOREIGN KEY (content_id) REFERENCES content (id) ON DELETE CASCADE
    )
  `);

  // YouTube channel configuration
  db.exec(`
    CREATE TABLE IF NOT EXISTS youtube_config (
      id INTEGER PRIMARY KEY,
      channel_url TEXT NOT NULL,
      channel_name TEXT NOT NULL,
      channel_id TEXT NOT NULL,
      enabled INTEGER DEFAULT 1
    )
  `);

  // Admin credentials table
  db.exec(`
    CREATE TABLE IF NOT EXISTS admin_credentials (
      id INTEGER PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL
    )
  `);

  // Always ensure default admin credentials exist
  try {
    db.exec(`
      INSERT OR REPLACE INTO admin_credentials (id, email, password) 
      VALUES (1, 'admin@example.com', 'admin123')
    `);
  } catch (error) {
    console.log('Admin credentials already exist or error inserting:', error);
  }

  saveDatabase();
};

export const saveDatabase = () => {
  if (!db) return;
  const data = db.export();
  localStorage.setItem('content_database', JSON.stringify(Array.from(data)));
};

export const getDatabase = () => db;

// Initialize database on module load
initializeDatabase();