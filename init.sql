-- Flash 游戏平台数据库初始化脚本
-- 包含所有表结构和索引

-- ============================================
-- 1. 游戏表
-- ============================================
CREATE TABLE IF NOT EXISTS games (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    title2 TEXT,
    title3 TEXT,
    title4 TEXT,
    description TEXT,
    folder_name TEXT NOT NULL UNIQUE,
    swf_filename TEXT NOT NULL,
    thumbnail_url TEXT,
    upload_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    play_count INTEGER DEFAULT 0,
    file_size INTEGER,
    save_file_key TEXT,
    save_name TEXT DEFAULT 'mu09',
    sort_order INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_title ON games(title);
CREATE INDEX IF NOT EXISTS idx_title2 ON games(title2);
CREATE INDEX IF NOT EXISTS idx_title3 ON games(title3);
CREATE INDEX IF NOT EXISTS idx_title4 ON games(title4);
CREATE INDEX IF NOT EXISTS idx_upload_date ON games(upload_date DESC);

-- ============================================
-- 2. 用户表（管理员）
-- ============================================
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'admin',
    is_banned INTEGER DEFAULT 0,
    created_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_login DATETIME
);

CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- ============================================
-- 3. Tag 系统
-- ============================================
CREATE TABLE IF NOT EXISTS tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    created_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    use_count INTEGER DEFAULT 0,
    type TEXT NOT NULL DEFAULT 'general',
    description TEXT,
    created_by TEXT,
    is_locked INTEGER DEFAULT 0,
    updated_date DATETIME
);

CREATE TABLE IF NOT EXISTS game_tags (
    game_id INTEGER NOT NULL,
    tag_id INTEGER NOT NULL,
    created_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    added_by TEXT,
    PRIMARY KEY (game_id, tag_id),
    FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_tags_name ON tags(name);
CREATE INDEX IF NOT EXISTS idx_tags_use_count ON tags(use_count DESC);
CREATE INDEX IF NOT EXISTS idx_game_tags_game ON game_tags(game_id);
CREATE INDEX IF NOT EXISTS idx_game_tags_tag ON game_tags(tag_id);

-- ============================================
-- 4. 评论系统
-- ============================================
CREATE TABLE IF NOT EXISTS comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    game_id INTEGER NOT NULL,
    username TEXT NOT NULL,
    content TEXT NOT NULL,
    likes_count INTEGER DEFAULT 0,
    reply_to INTEGER DEFAULT NULL,
    quoted_text TEXT DEFAULT NULL,
    created_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS comment_likes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    comment_id INTEGER NOT NULL,
    user_identifier TEXT NOT NULL,
    created_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(comment_id, user_identifier),
    FOREIGN KEY (comment_id) REFERENCES comments(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_comments_game ON comments(game_id);
CREATE INDEX IF NOT EXISTS idx_comments_date ON comments(created_date DESC);
CREATE INDEX IF NOT EXISTS idx_comments_reply_to ON comments(reply_to);
CREATE INDEX IF NOT EXISTS idx_comment_likes_comment ON comment_likes(comment_id);
CREATE INDEX IF NOT EXISTS idx_comment_likes_user ON comment_likes(user_identifier);

-- ============================================
-- 4.5 游客收藏（匿名设备 ID，无需注册登录）
-- ============================================
CREATE TABLE IF NOT EXISTS favorites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    device_id TEXT NOT NULL,
    game_id INTEGER NOT NULL,
    created_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(device_id, game_id),
    FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_favorites_device ON favorites(device_id);
CREATE INDEX IF NOT EXISTS idx_favorites_game ON favorites(game_id);

-- ============================================
-- 4.6 最近游玩记录（匿名设备 ID）
-- ============================================
CREATE TABLE IF NOT EXISTS play_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    device_id TEXT NOT NULL,
    game_id INTEGER NOT NULL,
    last_played DATETIME DEFAULT CURRENT_TIMESTAMP,
    play_count INTEGER DEFAULT 1,
    UNIQUE(device_id, game_id),
    FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_play_history_device ON play_history(device_id, last_played DESC);
CREATE INDEX IF NOT EXISTS idx_play_history_game ON play_history(game_id);

-- ============================================
-- 4.7 游戏评分（匿名设备 ID，玩过才能评）
-- ============================================
CREATE TABLE IF NOT EXISTS ratings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    device_id TEXT NOT NULL,
    game_id INTEGER NOT NULL,
    rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    created_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(device_id, game_id),
    FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_ratings_game ON ratings(game_id);
CREATE INDEX IF NOT EXISTS idx_ratings_device ON ratings(device_id);

-- ============================================
-- 4.8 游戏愿望单（游客提交，管理员处理）
-- ============================================
CREATE TABLE IF NOT EXISTS wishes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    link TEXT,
    note TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    admin_note TEXT,
    device_id TEXT,
    created_date DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_wishes_status ON wishes(status, created_date DESC);

CREATE TABLE IF NOT EXISTS wish_votes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    wish_id INTEGER NOT NULL,
    device_id TEXT NOT NULL,
    created_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(wish_id, device_id),
    FOREIGN KEY (wish_id) REFERENCES wishes(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_wish_votes_wish ON wish_votes(wish_id);

-- ============================================
-- 5. 监控系统
-- ============================================
CREATE TABLE IF NOT EXISTS access_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    game_id INTEGER NOT NULL,
    action TEXT NOT NULL,
    user_ip TEXT,
    user_agent TEXT,
    country TEXT,
    created_date DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS game_stats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    game_id INTEGER NOT NULL,
    date TEXT NOT NULL,
    view_count INTEGER DEFAULT 0,
    play_count INTEGER DEFAULT 0,
    download_count INTEGER DEFAULT 0,
    UNIQUE(game_id, date)
);

CREATE INDEX IF NOT EXISTS idx_access_logs_game_id ON access_logs(game_id);
CREATE INDEX IF NOT EXISTS idx_access_logs_created_date ON access_logs(created_date DESC);
CREATE INDEX IF NOT EXISTS idx_access_logs_action ON access_logs(action);
CREATE INDEX IF NOT EXISTS idx_game_stats_game_id ON game_stats(game_id);
CREATE INDEX IF NOT EXISTS idx_game_stats_date ON game_stats(date DESC);

-- ============================================
-- 6. 网站设置
-- ============================================
CREATE TABLE IF NOT EXISTS site_settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    max_download_size INTEGER DEFAULT 104857600,
    enable_download_limit INTEGER DEFAULT 1,
    enable_rate_limit INTEGER DEFAULT 1,
    rate_limit_requests INTEGER DEFAULT 100,
    rate_limit_window INTEGER DEFAULT 3600,
    enable_referer_check INTEGER DEFAULT 1,
    block_direct_access INTEGER DEFAULT 0,
    allowed_extensions TEXT DEFAULT '.swf,.json,.xml,.txt,.png,.jpg,.jpeg,.gif,.bmp,.mp3,.wav,.ogg,.dat,.bin',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 插入默认设置
INSERT OR IGNORE INTO site_settings (
    id, 
    max_download_size, 
    enable_download_limit,
    enable_rate_limit,
    rate_limit_requests,
    rate_limit_window,
    enable_referer_check,
    block_direct_access,
    allowed_extensions
) VALUES (
    1, 
    104857600, 
    1,
    1,
    100,
    3600,
    1,
    0,
    '.swf,.json,.xml,.txt,.png,.jpg,.jpeg,.gif,.bmp,.mp3,.wav,.ogg,.dat,.bin'
);
