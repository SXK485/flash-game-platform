// Cloudflare Workers API
import manifestJSON from '__STATIC_CONTENT_MANIFEST';
const assetManifest = JSON.parse(manifestJSON);

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    // CORS 头
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, DELETE',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // API 路由
      if (path.startsWith('/api/')) {
        return handleAPI(request, env, path, corsHeaders);
      }

      // 文件代理路由（从 R2 获取游戏文件）
      if (path.startsWith('/files/')) {
        return handleFileProxy(request, env, path, corsHeaders);
      }

      // 静态文件服务
      return await getStaticAsset(request, env);
    } catch (error) {
      console.error('Error:', error);
      return jsonResponse({ error: error.message }, 500, corsHeaders);
    }
  }
};

// 静态资源处理
async function getStaticAsset(request, env) {
  const url = new URL(request.url);
  let path = url.pathname;
  
  // 默认首页
  if (path === '/') {
    path = '/index.html';
  }
  
  // 查找资源
  const assetKey = path.substring(1); // 移除开头的 /
  const mappedPath = assetManifest[assetKey] || assetKey;
  
  try {
    const asset = await env.__STATIC_CONTENT.get(mappedPath, { type: 'stream' });
    
    if (!asset) {
      return new Response('Not Found', { status: 404 });
    }
    
    // 设置正确的 Content-Type
    const contentType = getContentType(path);
    
    return new Response(asset, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (e) {
    return new Response('Not Found', { status: 404 });
  }
}

function getContentType(path) {
  const ext = path.split('.').pop();
  const types = {
    'html': 'text/html; charset=utf-8',
    'css': 'text/css; charset=utf-8',
    'js': 'application/javascript; charset=utf-8',
    'json': 'application/json',
    'png': 'image/png',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'gif': 'image/gif',
    'svg': 'image/svg+xml',
    'ico': 'image/x-icon',
  };
  return types[ext] || 'application/octet-stream';
}

// 文件代理处理（从 R2 获取游戏文件）
async function handleFileProxy(request, env, path, corsHeaders) {
  // 移除 /files/ 前缀，获取 R2 中的实际路径
  const key = path.replace('/files/', '');
  
  try {
    // 获取网站设置
    const settings = await env.DB.prepare('SELECT * FROM site_settings WHERE id = 1').first();
    const enableRateLimit = settings ? settings.enable_rate_limit : 1;
    const rateLimitRequests = settings ? settings.rate_limit_requests : 100;
    const rateLimitWindow = settings ? settings.rate_limit_window : 3600;
    const enableRefererCheck = settings ? settings.enable_referer_check : 1;
    const blockDirectAccess = settings ? settings.block_direct_access : 0;
    
    // 1. Referer 检查
    if (enableRefererCheck) {
      const referer = request.headers.get('Referer') || '';
      const host = request.headers.get('Host') || '';
      
      // 根据设置决定是否允许空 Referer（直接访问）
      let isValidReferer;
      if (blockDirectAccess) {
        // 禁止直接访问：必须有 Referer 且来自本站
        isValidReferer = referer && (
                          referer.includes(host) || 
                          referer.includes('localhost') || 
                          referer.includes('127.0.0.1')
                        );
      } else {
        // 允许直接访问：空 Referer 或来自本站
        isValidReferer = !referer || 
                          referer.includes(host) || 
                          referer.includes('localhost') || 
                          referer.includes('127.0.0.1');
      }
      
      if (!isValidReferer) {
        console.log(`[Referer 检查] 拒绝访问，Referer: ${referer}, Host: ${host}, 禁止直接访问: ${blockDirectAccess}`);
        return new Response('Access denied: Invalid referer', { 
          status: 403,
          headers: corsHeaders
        });
      }
    }
    
    // 2. 频率限制
    if (enableRateLimit && env.RATE_LIMIT) {
      const clientIP = request.headers.get('CF-Connecting-IP') || 
                      request.headers.get('X-Forwarded-For') || 
                      'unknown';
      
      const rateLimitKey = `rate_limit:${clientIP}`;
      
      // 获取当前计数
      const currentCount = await env.RATE_LIMIT.get(rateLimitKey);
      const count = currentCount ? parseInt(currentCount) : 0;
      
      if (count >= rateLimitRequests) {
        console.log(`[频率限制] IP ${clientIP} 超过限制: ${count}/${rateLimitRequests}`);
        return new Response('Too many requests. Please try again later.', { 
          status: 429,
          headers: {
            ...corsHeaders,
            'Retry-After': rateLimitWindow.toString()
          }
        });
      }
      
      // 增加计数
      await env.RATE_LIMIT.put(rateLimitKey, (count + 1).toString(), {
        expirationTtl: rateLimitWindow
      });
    }
    
    // 3. 获取文件
    const object = await env.FLASH_STORAGE.get(key);
    
    if (!object) {
      return new Response('File not found', { 
        status: 404,
        headers: corsHeaders
      });
    }
    
    // 设置响应头
    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set('Cache-Control', 'public, max-age=31536000');
    headers.set('Access-Control-Allow-Origin', '*');
    headers.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    headers.set('Access-Control-Allow-Headers', '*');
    
    // 根据文件扩展名设置 Content-Type
    const ext = key.split('.').pop().toLowerCase();
    const contentTypes = {
      'swf': 'application/x-shockwave-flash',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'mp3': 'audio/mpeg',
      'wav': 'audio/wav',
      'xml': 'application/xml',
      'txt': 'text/plain',
    };
    
    if (contentTypes[ext]) {
      headers.set('Content-Type', contentTypes[ext]);
    }
    
    return new Response(object.body, { headers });
  } catch (error) {
    console.error('File proxy error:', error);
    return new Response('Internal server error', { 
      status: 500,
      headers: corsHeaders
    });
  }
}

async function handleAPI(request, env, path, corsHeaders) {
  const method = request.method;

  // 获取允许的文件扩展名（公开接口）
  if (path === '/api/allowed-extensions' && method === 'GET') {
    const settings = await env.DB.prepare('SELECT allowed_extensions FROM site_settings WHERE id = 1').first();
    const extensions = settings?.allowed_extensions || '.swf,.json,.xml,.txt,.png,.jpg,.jpeg,.gif,.bmp,.mp3,.wav,.ogg,.dat,.bin';
    return jsonResponse({ extensions }, 200, corsHeaders);
  }

  // 获取游戏列表
  if (path === '/api/games' && method === 'GET') {
    const url = new URL(request.url);
    const search = url.searchParams.get('search') || '';
    const tagsParam = url.searchParams.get('tags') || ''; // 包含的标签（逗号分隔）
    const excludeTagsParam = url.searchParams.get('excludeTags') || ''; // 排除的标签（逗号分隔）
    
    const includeTags = tagsParam ? tagsParam.split(',').map(t => t.trim().toLowerCase()).filter(t => t) : [];
    const excludeTags = excludeTagsParam ? excludeTagsParam.split(',').map(t => t.trim().toLowerCase()).filter(t => t) : [];
    
    let query = 'SELECT DISTINCT g.* FROM games g';
    let params = [];
    let whereConditions = [];
    
    // 包含标签筛选
    if (includeTags.length > 0) {
      // 对于每个必须包含的标签，使用 EXISTS 子查询
      for (let i = 0; i < includeTags.length; i++) {
        whereConditions.push(`EXISTS (
          SELECT 1 FROM game_tags gt 
          INNER JOIN tags t ON gt.tag_id = t.id 
          WHERE gt.game_id = g.id AND LOWER(t.name) = ?
        )`);
        params.push(includeTags[i]);
      }
    }
    
    // 排除标签筛选
    if (excludeTags.length > 0) {
      for (let i = 0; i < excludeTags.length; i++) {
        whereConditions.push(`NOT EXISTS (
          SELECT 1 FROM game_tags gt 
          INNER JOIN tags t ON gt.tag_id = t.id 
          WHERE gt.game_id = g.id AND LOWER(t.name) = ?
        )`);
        params.push(excludeTags[i]);
      }
    }
    
    // 标题搜索
    if (search) {
      whereConditions.push('(g.title LIKE ? OR g.title2 LIKE ? OR g.title3 LIKE ? OR g.title4 LIKE ? OR g.description LIKE ?)');
      const searchParam = `%${search}%`;
      params.push(searchParam, searchParam, searchParam, searchParam, searchParam);
    }
    
    // 组合 WHERE 条件
    if (whereConditions.length > 0) {
      query += ' WHERE ' + whereConditions.join(' AND ');
    }
    
    query += ' ORDER BY g.upload_date DESC';
    
    const { results } = await env.DB.prepare(query).bind(...params).all();
    
    // 优化：一次性查询所有游戏的 tags（避免 N+1 查询）
    if (results.length > 0) {
      const gameIds = results.map(g => g.id);
      const placeholders = gameIds.map(() => '?').join(',');
      
      const { results: allGameTags } = await env.DB.prepare(
        `SELECT gt.game_id, t.* FROM tags t 
         INNER JOIN game_tags gt ON t.id = gt.tag_id 
         WHERE gt.game_id IN (${placeholders})
         ORDER BY t.name`
      ).bind(...gameIds).all();
      
      // 按游戏 ID 分组 tags
      const tagsByGameId = {};
      for (const tag of allGameTags) {
        if (!tagsByGameId[tag.game_id]) {
          tagsByGameId[tag.game_id] = [];
        }
        tagsByGameId[tag.game_id].push(tag);
      }
      
      // 为每个游戏添加 tags
      for (const game of results) {
        game.tags = tagsByGameId[game.id] || [];
      }
    }
    
    return jsonResponse(results, 200, corsHeaders);
  }

  // 获取单个游戏详情
  if (path.match(/^\/api\/games\/\d+$/) && method === 'GET') {
    const id = path.split('/').pop();
    const game = await env.DB.prepare('SELECT * FROM games WHERE id = ?').bind(id).first();
    
    if (!game) {
      return jsonResponse({ error: '游戏不存在' }, 404, corsHeaders);
    }
    
    // 加载游戏的 tags
    const { results: gameTags } = await env.DB.prepare(
      'SELECT t.* FROM tags t INNER JOIN game_tags gt ON t.id = gt.tag_id WHERE gt.game_id = ? ORDER BY t.name'
    ).bind(id).all();
    game.tags = gameTags;
    
    // 增加播放次数
    await env.DB.prepare('UPDATE games SET play_count = play_count + 1 WHERE id = ?').bind(id).run();
    
    return jsonResponse(game, 200, corsHeaders);
  }

  // 获取游戏文件列表（用于下载）
  if (path.match(/^\/api\/games\/\d+\/files$/) && method === 'GET') {
    const id = path.split('/')[3];
    const game = await env.DB.prepare('SELECT * FROM games WHERE id = ?').bind(id).first();
    
    if (!game) {
      return jsonResponse({ error: '游戏不存在' }, 404, corsHeaders);
    }
    
    // 检查下载限制
    const settings = await env.DB.prepare('SELECT * FROM site_settings WHERE id = 1').first();
    const enableLimit = settings ? settings.enable_download_limit : 1;
    const maxSize = settings ? settings.max_download_size : 104857600; // 默认 100MB
    
    if (enableLimit && game.file_size > maxSize) {
      return jsonResponse({ 
        error: '该游戏文件过大，管理员限制只能下载 ' + formatBytes(maxSize) + ' 以下的游戏',
        restricted: true,
        gameSize: game.file_size,
        maxSize: maxSize
      }, 403, corsHeaders);
    }
    
    // 列出游戏文件夹中的所有文件
    const objects = await env.FLASH_STORAGE.list({ prefix: `${game.folder_name}/` });
    
    const files = objects.objects
      .filter(obj => !obj.key.endsWith('/')) // 过滤掉文件夹
      .map(obj => ({
        name: obj.key.replace(`${game.folder_name}/`, ''), // 相对路径
        path: obj.key, // 完整路径
        size: obj.size
      }));
    
    return jsonResponse(files, 200, corsHeaders);
  }

  // 登录接口
  if (path === '/api/auth/login' && method === 'POST') {
    const body = await request.json();
    const { username, password } = body;

    if (typeof password !== 'string' || !password) {
      return jsonResponse({ error: '密码不能为空' }, 400, corsHeaders);
    }

    if (typeof username !== 'string') {
      return jsonResponse({ error: '用户名格式无效' }, 400, corsHeaders);
    }

    if (password.length > 256) {
      return jsonResponse({ error: '密码长度无效' }, 400, corsHeaders);
    }

    // JWT 密钥
    const jwtSecret = env.JWT_SECRET || env.ADMIN_PASSWORD;

    // 如果提供了用户名且不是 super_admin，优先查询数据库
    if (username && username !== 'super_admin') {
      const user = await env.DB.prepare(
        'SELECT * FROM users WHERE username = ?'
      ).bind(username).first();

      if (user) {
        // 用户存在，检查密码（支持 PBKDF2 哈希和旧明文密码）
        const passwordValid = await verifyPassword(password, user.password_hash);
        if (!passwordValid) {
          return jsonResponse({ error: '密码错误' }, 401, corsHeaders);
        }

        if (user.is_banned) {
          return jsonResponse({ error: '该账号已被封禁' }, 403, corsHeaders);
        }

        // 旧明文密码验证成功后，自动升级为 PBKDF2 哈希
        if (needsPasswordRehash(user.password_hash)) {
          try {
            const newHash = await hashPassword(password);
            await env.DB.prepare('UPDATE users SET password_hash = ? WHERE id = ?').bind(newHash, user.id).run();
          } catch (error) {
            console.error('密码哈希升级失败:', error);
          }
        }

        // 更新最后登录时间
        await env.DB.prepare('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?').bind(user.id).run();

        // 生成 JWT Token
        const token = await generateJWT({
          id: user.id,
          username: user.username,
          role: user.role
        }, jwtSecret, 7 * 24 * 60 * 60); // 7 天过期

        return jsonResponse({ 
          token: token,
          role: user.role,
          username: user.username
        }, 200, corsHeaders);
      }
      
      // 用户名不存在
      return jsonResponse({ error: '用户名不存在' }, 401, corsHeaders);
    }

    // 没有提供用户名或用户名是 super_admin，检查是否是超级管理员密码
    if (password === env.ADMIN_PASSWORD) {
      // 生成超级管理员 JWT Token
      const token = await generateJWT({
        id: 0,
        username: 'super_admin',
        role: 'super_admin'
      }, jwtSecret, 7 * 24 * 60 * 60); // 7 天过期

      return jsonResponse({ 
        token: token,
        role: 'super_admin',
        username: 'super_admin'
      }, 200, corsHeaders);
    }

    // 密码不匹配
    return jsonResponse({ error: '密码错误' }, 401, corsHeaders);
  }

  // 获取当前登录用户信息
  if (path === '/api/auth/me' && method === 'GET') {
    const auth = await checkAuth(request, env);
    if (!auth) {
      return jsonResponse({ error: '未登录' }, 401, corsHeaders);
    }
    return jsonResponse(auth, 200, corsHeaders);
  }

  // ==================== 监控分析 API ====================

  // 记录访问日志
  if (path === '/api/analytics/log' && method === 'POST') {
    try {
      const body = await request.json();
      const { gameId, action } = body; // action: 'view', 'play', 'download'

      if (!gameId || !action) {
        return jsonResponse({ error: '缺少必要参数' }, 400, corsHeaders);
      }

      // 获取用户信息
      const userIP = request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For') || 'unknown';
      const userAgent = request.headers.get('User-Agent') || '';
      const country = request.headers.get('CF-IPCountry') || '';

      // 插入访问日志
      await env.DB.prepare(
        'INSERT INTO access_logs (game_id, action, user_ip, user_agent, country) VALUES (?, ?, ?, ?, ?)'
      ).bind(gameId, action, userIP, userAgent, country).run();

      // 更新每日统计
      const today = new Date().toISOString().split('T')[0];
      const column = action === 'view' ? 'view_count' : action === 'play' ? 'play_count' : 'download_count';
      
      await env.DB.prepare(`
        INSERT INTO game_stats (game_id, date, ${column})
        VALUES (?, ?, 1)
        ON CONFLICT(game_id, date) DO UPDATE SET ${column} = ${column} + 1
      `).bind(gameId, today).run();

      return jsonResponse({ success: true }, 200, corsHeaders);
    } catch (error) {
      console.error('记录访问日志失败:', error);
      return jsonResponse({ error: '记录失败' }, 500, corsHeaders);
    }
  }

  // 获取总体统计（仅超级管理员）
  if (path === '/api/analytics/overview' && method === 'GET') {
    if (!await checkSuperAdmin(request, env)) {
      return jsonResponse({ error: '需要超级管理员权限' }, 403, corsHeaders);
    }

    try {
      const today = new Date().toISOString().split('T')[0];
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

      // 今日统计
      const todayStats = await env.DB.prepare(`
        SELECT 
          COALESCE(SUM(view_count), 0) as views,
          COALESCE(SUM(play_count), 0) as plays,
          COALESCE(SUM(download_count), 0) as downloads
        FROM game_stats WHERE date = ?
      `).bind(today).first();

      // 昨日统计
      const yesterdayStats = await env.DB.prepare(`
        SELECT 
          COALESCE(SUM(view_count), 0) as views,
          COALESCE(SUM(play_count), 0) as plays,
          COALESCE(SUM(download_count), 0) as downloads
        FROM game_stats WHERE date = ?
      `).bind(yesterday).first();

      // 总统计
      const totalStats = await env.DB.prepare(`
        SELECT 
          COALESCE(SUM(view_count), 0) as views,
          COALESCE(SUM(play_count), 0) as plays,
          COALESCE(SUM(download_count), 0) as downloads
        FROM game_stats
      `).first();

      // 计算变化百分比
      const viewsChange = yesterdayStats.views > 0 
        ? Math.round(((todayStats.views - yesterdayStats.views) / yesterdayStats.views) * 100)
        : 0;
      const playsChange = yesterdayStats.plays > 0
        ? Math.round(((todayStats.plays - yesterdayStats.plays) / yesterdayStats.plays) * 100)
        : 0;
      const downloadsChange = yesterdayStats.downloads > 0
        ? Math.round(((todayStats.downloads - yesterdayStats.downloads) / yesterdayStats.downloads) * 100)
        : 0;

      return jsonResponse({
        totalViews: totalStats.views,
        totalPlays: totalStats.plays,
        totalDownloads: totalStats.downloads,
        todayActive: todayStats.views + todayStats.plays + todayStats.downloads,
        viewsChange,
        playsChange,
        downloadsChange,
        activeChange: 0
      }, 200, corsHeaders);
    } catch (error) {
      console.error('获取总体统计失败:', error);
      return jsonResponse({ error: '获取失败' }, 500, corsHeaders);
    }
  }

  // 获取游戏统计（仅超级管理员）
  if (path === '/api/analytics/games' && method === 'GET') {
    if (!await checkSuperAdmin(request, env)) {
      return jsonResponse({ error: '需要超级管理员权限' }, 403, corsHeaders);
    }

    try {
      const url = new URL(request.url);
      const timeRange = url.searchParams.get('timeRange') || '7days';
      const sortBy = url.searchParams.get('sortBy') || 'views';

      let dateCondition = '';
      if (timeRange === 'today') {
        const today = new Date().toISOString().split('T')[0];
        dateCondition = `WHERE gs.date = '${today}'`;
      } else if (timeRange === '7days') {
        const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
        dateCondition = `WHERE gs.date >= '${sevenDaysAgo}'`;
      } else if (timeRange === '30days') {
        const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];
        dateCondition = `WHERE gs.date >= '${thirtyDaysAgo}'`;
      }

      const sortColumn = sortBy === 'plays' ? 'plays' : sortBy === 'downloads' ? 'downloads' : 'views';

      const { results } = await env.DB.prepare(`
        SELECT 
          g.id,
          g.title,
          COALESCE(SUM(gs.view_count), 0) as views,
          COALESCE(SUM(gs.play_count), 0) as plays,
          COALESCE(SUM(gs.download_count), 0) as downloads
        FROM games g
        LEFT JOIN game_stats gs ON g.id = gs.game_id ${dateCondition}
        GROUP BY g.id, g.title
        ORDER BY ${sortColumn} DESC
        LIMIT 50
      `).all();

      return jsonResponse(results, 200, corsHeaders);
    } catch (error) {
      console.error('获取游戏统计失败:', error);
      return jsonResponse({ error: '获取失败' }, 500, corsHeaders);
    }
  }

  // 获取访问日志（仅超级管理员）
  if (path === '/api/analytics/logs' && method === 'GET') {
    if (!await checkSuperAdmin(request, env)) {
      return jsonResponse({ error: '需要超级管理员权限' }, 403, corsHeaders);
    }

    try {
      const url = new URL(request.url);
      const page = parseInt(url.searchParams.get('page') || '1');
      const pageSize = parseInt(url.searchParams.get('pageSize') || '50');
      const gameId = url.searchParams.get('gameId');
      const action = url.searchParams.get('action');
      const date = url.searchParams.get('date');

      let whereConditions = [];
      let params = [];

      if (gameId) {
        whereConditions.push('al.game_id = ?');
        params.push(gameId);
      }

      if (action) {
        whereConditions.push('al.action = ?');
        params.push(action);
      }

      if (date) {
        whereConditions.push('DATE(al.created_date) = ?');
        params.push(date);
      }

      const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';

      // 获取总数
      const countQuery = `SELECT COUNT(*) as total FROM access_logs al ${whereClause}`;
      const { total } = await env.DB.prepare(countQuery).bind(...params).first();

      // 获取日志
      const offset = (page - 1) * pageSize;
      const logsQuery = `
        SELECT 
          al.*,
          g.title as game_title
        FROM access_logs al
        LEFT JOIN games g ON al.game_id = g.id
        ${whereClause}
        ORDER BY al.created_date DESC
        LIMIT ? OFFSET ?
      `;
      const { results } = await env.DB.prepare(logsQuery).bind(...params, pageSize, offset).all();

      return jsonResponse({
        logs: results,
        total: total,
        page: page,
        pageSize: pageSize
      }, 200, corsHeaders);
    } catch (error) {
      console.error('获取访问日志失败:', error);
      return jsonResponse({ error: '获取失败' }, 500, corsHeaders);
    }
  }

  // 获取所有管理员（仅超级管理员）
  if (path === '/api/admins' && method === 'GET') {
    if (!await checkSuperAdmin(request, env)) {
      return jsonResponse({ error: '需要超级管理员权限' }, 403, corsHeaders);
    }

    const { results } = await env.DB.prepare(
      'SELECT id, username, role, is_banned, created_date, last_login FROM users ORDER BY created_date DESC'
    ).all();

    return jsonResponse(results, 200, corsHeaders);
  }

  // 添加管理员（仅超级管理员）
  if (path === '/api/admins' && method === 'POST') {
    if (!await checkSuperAdmin(request, env)) {
      return jsonResponse({ error: '需要超级管理员权限' }, 403, corsHeaders);
    }

    const body = await request.json();
    const { username, password, role = 'admin' } = body;

    if (!username || typeof username !== 'string' || !password || typeof password !== 'string') {
      return jsonResponse({ error: '用户名和密码不能为空' }, 400, corsHeaders);
    }

    if (username.length < 3 || username.length > 20) {
      return jsonResponse({ error: '用户名长度必须在3-20个字符之间' }, 400, corsHeaders);
    }

    if (password.length < 6 || password.length > 256) {
      return jsonResponse({ error: '密码长度必须在6-256个字符之间' }, 400, corsHeaders);
    }

    if (role !== 'admin' && role !== 'super_admin') {
      return jsonResponse({ error: '角色只能是 admin 或 super_admin' }, 400, corsHeaders);
    }

    // 检查用户名是否已存在
    const existing = await env.DB.prepare('SELECT id FROM users WHERE username = ?').bind(username).first();
    if (existing) {
      return jsonResponse({ error: '用户名已存在' }, 400, corsHeaders);
    }

    // 创建管理员（密码使用 PBKDF2-SHA256 哈希后存储）
    const passwordHash = await hashPassword(password);
    const result = await env.DB.prepare(
      'INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)'
    ).bind(username, passwordHash, role).run();

    return jsonResponse({ 
      id: result.meta.last_row_id,
      message: '管理员创建成功' 
    }, 201, corsHeaders);
  }

  // 删除管理员（仅超级管理员）
  if (path.match(/^\/api\/admins\/\d+$/) && method === 'DELETE') {
    if (!await checkSuperAdmin(request, env)) {
      return jsonResponse({ error: '需要超级管理员权限' }, 403, corsHeaders);
    }

    const adminId = path.split('/').pop();

    // 不能删除 ID 为 1 的超级管理员
    if (adminId === '1') {
      return jsonResponse({ error: '不能删除默认超级管理员' }, 400, corsHeaders);
    }

    await env.DB.prepare('DELETE FROM users WHERE id = ?').bind(adminId).run();

    return jsonResponse({ message: '删除成功' }, 200, corsHeaders);
  }

  // 封禁/解封管理员（仅超级管理员）
  if (path.match(/^\/api\/admins\/\d+\/ban$/) && method === 'POST') {
    if (!await checkSuperAdmin(request, env)) {
      return jsonResponse({ error: '需要超级管理员权限' }, 403, corsHeaders);
    }

    const adminId = path.split('/')[3];
    const body = await request.json();
    const { banned } = body; // true 或 false

    // 不能封禁 ID 为 1 的超级管理员
    if (adminId === '1') {
      return jsonResponse({ error: '不能封禁默认超级管理员' }, 400, corsHeaders);
    }

    await env.DB.prepare('UPDATE users SET is_banned = ? WHERE id = ?').bind(banned ? 1 : 0, adminId).run();

    return jsonResponse({ message: banned ? '封禁成功' : '解封成功' }, 200, corsHeaders);
  }

  // ==================== 网站设置 API ====================

  // 获取网站设置（仅超级管理员）
  if (path === '/api/settings' && method === 'GET') {
    if (!await checkSuperAdmin(request, env)) {
      return jsonResponse({ error: '需要超级管理员权限' }, 403, corsHeaders);
    }

    const settings = await env.DB.prepare('SELECT * FROM site_settings WHERE id = 1').first();
    
    if (!settings) {
      // 如果没有设置，返回默认值
      return jsonResponse({
        max_download_size: 104857600, // 100MB
        enable_download_limit: 1
      }, 200, corsHeaders);
    }

    return jsonResponse(settings, 200, corsHeaders);
  }

  // 更新网站设置（仅超级管理员）
  if (path === '/api/settings' && method === 'PUT') {
    if (!await checkSuperAdmin(request, env)) {
      return jsonResponse({ error: '需要超级管理员权限' }, 403, corsHeaders);
    }

    const body = await request.json();
    const { 
      max_download_size, 
      enable_download_limit,
      enable_referer_check,
      block_direct_access,
      enable_rate_limit,
      rate_limit_requests,
      allowed_extensions
    } = body;

    // 验证参数
    if (max_download_size !== undefined && max_download_size < 0) {
      return jsonResponse({ error: '下载大小限制不能为负数' }, 400, corsHeaders);
    }

    if (enable_download_limit !== undefined && enable_download_limit !== 0 && enable_download_limit !== 1) {
      return jsonResponse({ error: '启用下载限制必须是 0 或 1' }, 400, corsHeaders);
    }

    if (enable_referer_check !== undefined && enable_referer_check !== 0 && enable_referer_check !== 1) {
      return jsonResponse({ error: '启用 Referer 检查必须是 0 或 1' }, 400, corsHeaders);
    }

    if (block_direct_access !== undefined && block_direct_access !== 0 && block_direct_access !== 1) {
      return jsonResponse({ error: '禁止直接访问必须是 0 或 1' }, 400, corsHeaders);
    }

    if (enable_rate_limit !== undefined && enable_rate_limit !== 0 && enable_rate_limit !== 1) {
      return jsonResponse({ error: '启用频率限制必须是 0 或 1' }, 400, corsHeaders);
    }

    if (rate_limit_requests !== undefined && rate_limit_requests < 1) {
      return jsonResponse({ error: '频率限制次数必须大于 0' }, 400, corsHeaders);
    }

    if (allowed_extensions !== undefined && typeof allowed_extensions !== 'string') {
      return jsonResponse({ error: '允许的文件扩展名必须是字符串' }, 400, corsHeaders);
    }

    // 更新设置
    const updates = [];
    const params = [];

    if (max_download_size !== undefined) {
      updates.push('max_download_size = ?');
      params.push(max_download_size);
    }

    if (enable_download_limit !== undefined) {
      updates.push('enable_download_limit = ?');
      params.push(enable_download_limit);
    }

    if (enable_referer_check !== undefined) {
      updates.push('enable_referer_check = ?');
      params.push(enable_referer_check);
    }

    if (block_direct_access !== undefined) {
      updates.push('block_direct_access = ?');
      params.push(block_direct_access);
    }

    if (enable_rate_limit !== undefined) {
      updates.push('enable_rate_limit = ?');
      params.push(enable_rate_limit);
    }

    if (rate_limit_requests !== undefined) {
      updates.push('rate_limit_requests = ?');
      params.push(rate_limit_requests);
    }

    if (allowed_extensions !== undefined) {
      updates.push('allowed_extensions = ?');
      params.push(allowed_extensions);
    }

    if (updates.length > 0) {
      updates.push('updated_at = CURRENT_TIMESTAMP');
      params.push(1); // WHERE id = 1

      await env.DB.prepare(
        `UPDATE site_settings SET ${updates.join(', ')} WHERE id = ?`
      ).bind(...params).run();
    }

    return jsonResponse({ message: '设置更新成功' }, 200, corsHeaders);
  }

  // 获取游戏的评论
  if (path.match(/^\/api\/games\/\d+\/comments$/) && method === 'GET') {
    const gameId = path.split('/')[3];
    
    const { results } = await env.DB.prepare(
      'SELECT * FROM comments WHERE game_id = ? ORDER BY created_date DESC'
    ).bind(gameId).all();
    
    return jsonResponse(results, 200, corsHeaders);
  }

  // 添加评论（游客可用）
  if (path.match(/^\/api\/games\/\d+\/comments$/) && method === 'POST') {
    const gameId = path.split('/')[3];
    const body = await request.json();
    const { content, replyTo, quotedText } = body;

    if (!content || content.trim().length === 0) {
      return jsonResponse({ error: '评论内容不能为空' }, 400, corsHeaders);
    }

    if (content.length > 1000) {
      return jsonResponse({ error: '评论内容不能超过1000字' }, 400, corsHeaders);
    }

    // 生成随机匿名用户名
    const randomNum = Math.floor(Math.random() * 10000);
    const username = `匿名用户#${randomNum.toString().padStart(4, '0')}`;

    // 保存评论
    const result = await env.DB.prepare(
      'INSERT INTO comments (game_id, username, content, reply_to, quoted_text) VALUES (?, ?, ?, ?, ?)'
    ).bind(gameId, username, content.trim(), replyTo || null, quotedText || null).run();

    return jsonResponse({ 
      id: result.meta.last_row_id,
      username,
      message: '评论成功' 
    }, 201, corsHeaders);
  }

  // 删除评论（需要管理员权限）
  if (path.match(/^\/api\/comments\/\d+$/) && method === 'DELETE') {
    if (!await checkAuth(request, env)) {
      return jsonResponse({ error: '未授权' }, 401, corsHeaders);
    }

    const commentId = path.split('/').pop();
    await env.DB.prepare('DELETE FROM comments WHERE id = ?').bind(commentId).run();

    return jsonResponse({ message: '删除成功' }, 200, corsHeaders);
  }

  // 点赞评论
  if (path.match(/^\/api\/comments\/\d+\/like$/) && method === 'POST') {
    const commentId = path.split('/')[3];
    
    // 获取用户标识（IP 地址）
    const userIP = request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For') || 'unknown';
    
    try {
      // 尝试插入点赞记录
      await env.DB.prepare(
        'INSERT INTO comment_likes (comment_id, user_identifier) VALUES (?, ?)'
      ).bind(commentId, userIP).run();
      
      // 增加点赞数
      await env.DB.prepare(
        'UPDATE comments SET likes_count = likes_count + 1 WHERE id = ?'
      ).bind(commentId).run();
      
      return jsonResponse({ message: '点赞成功', action: 'liked' }, 200, corsHeaders);
    } catch (error) {
      // 如果已经点赞过（UNIQUE 约束失败），则取消点赞
      await env.DB.prepare(
        'DELETE FROM comment_likes WHERE comment_id = ? AND user_identifier = ?'
      ).bind(commentId, userIP).run();
      
      // 减少点赞数
      await env.DB.prepare(
        'UPDATE comments SET likes_count = CASE WHEN likes_count > 0 THEN likes_count - 1 ELSE 0 END WHERE id = ?'
      ).bind(commentId).run();
      
      return jsonResponse({ message: '取消点赞', action: 'unliked' }, 200, corsHeaders);
    }
  }

  // 检查用户是否已点赞某评论
  if (path.match(/^\/api\/comments\/\d+\/liked$/) && method === 'GET') {
    const commentId = path.split('/')[3];
    const userIP = request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For') || 'unknown';
    
    const like = await env.DB.prepare(
      'SELECT id FROM comment_likes WHERE comment_id = ? AND user_identifier = ?'
    ).bind(commentId, userIP).first();
    
    return jsonResponse({ liked: !!like }, 200, corsHeaders);
  }

  // 获取所有 tags
  if (path === '/api/tags' && method === 'GET') {
    const { results } = await env.DB.prepare(
      'SELECT * FROM tags ORDER BY use_count DESC, name ASC'
    ).all();
    return jsonResponse(results, 200, corsHeaders);
  }

  // 为游戏添加 tags（需要管理员权限）
  if (path.match(/^\/api\/games\/\d+\/tags$/) && method === 'POST') {
    if (!await checkAuth(request, env)) {
      return jsonResponse({ error: '未授权' }, 401, corsHeaders);
    }

    const gameId = path.split('/')[3];
    const body = await request.json();
    const { tags } = body; // tags: ['tag1', 'tag2', ...]

    if (!tags || !Array.isArray(tags) || tags.length === 0) {
      return jsonResponse({ error: '缺少 tags' }, 400, corsHeaders);
    }

    // 检查游戏是否存在
    const game = await env.DB.prepare('SELECT id FROM games WHERE id = ?').bind(gameId).first();
    if (!game) {
      return jsonResponse({ error: '游戏不存在' }, 404, corsHeaders);
    }

    // 为每个 tag 创建或获取 ID，然后关联到游戏
    for (const tagName of tags) {
      const trimmedTag = tagName.trim().toLowerCase();
      if (!trimmedTag) continue;

      // 查找或创建 tag
      let tag = await env.DB.prepare('SELECT id FROM tags WHERE name = ?').bind(trimmedTag).first();
      
      if (!tag) {
        // 创建新 tag
        const result = await env.DB.prepare('INSERT INTO tags (name, use_count) VALUES (?, 1)').bind(trimmedTag).run();
        tag = { id: result.meta.last_row_id };
        
        // 关联游戏和 tag
        await env.DB.prepare('INSERT INTO game_tags (game_id, tag_id) VALUES (?, ?)').bind(gameId, tag.id).run();
      } else {
        // 标签已存在，尝试关联游戏和 tag
        try {
          await env.DB.prepare('INSERT INTO game_tags (game_id, tag_id) VALUES (?, ?)').bind(gameId, tag.id).run();
          // 只有成功插入关联时才增加使用计数
          await env.DB.prepare('UPDATE tags SET use_count = use_count + 1 WHERE id = ?').bind(tag.id).run();
        } catch (e) {
          // 已存在则忽略（不增加 use_count）
          console.log(`Tag ${trimmedTag} already exists for game ${gameId}`);
        }
      }
    }

    return jsonResponse({ message: 'Tags 添加成功' }, 200, corsHeaders);
  }

  // 删除游戏的 tag（需要管理员权限）
  if (path.match(/^\/api\/games\/\d+\/tags\/\d+$/) && method === 'DELETE') {
    if (!await checkAuth(request, env)) {
      return jsonResponse({ error: '未授权' }, 401, corsHeaders);
    }

    const parts = path.split('/');
    const gameId = parts[3];
    const tagId = parts[5];

    // 删除关联
    await env.DB.prepare('DELETE FROM game_tags WHERE game_id = ? AND tag_id = ?').bind(gameId, tagId).run();

    // 减少 tag 使用计数
    await env.DB.prepare('UPDATE tags SET use_count = use_count - 1 WHERE id = ?').bind(tagId).run();

    // 如果 tag 使用计数为 0，删除 tag
    await env.DB.prepare('DELETE FROM tags WHERE id = ? AND use_count <= 0').bind(tagId).run();

    return jsonResponse({ message: 'Tag 删除成功' }, 200, corsHeaders);
  }

  // 准备上传：生成文件夹名和上传令牌（需要管理员权限）
  if (path === '/api/upload/prepare' && method === 'POST') {
    if (!await checkAuth(request, env)) {
      return jsonResponse({ error: '未授权' }, 401, corsHeaders);
    }

    const body = await request.json();
    const { fileCount } = body;
    
    if (!fileCount || fileCount <= 0) {
      return jsonResponse({ error: '文件数量无效' }, 400, corsHeaders);
    }

    // 编辑游戏时可能需要对现有文件夹继续上传（例如只替换缩略图/存档），
    // 因此允许前端指定 folderName；未指定时生成新文件夹。
    const requestedFolderName = typeof body.folderName === 'string' && body.folderName.trim() ? body.folderName.trim() : '';
    if (requestedFolderName && !/^[A-Za-z0-9._-]+$/.test(requestedFolderName)) {
      return jsonResponse({ error: '文件夹名格式无效' }, 400, corsHeaders);
    }

    const folderName = requestedFolderName || `game_${Date.now()}`;
    // 签名令牌：绑定 folderName，2 小时过期，上传接口会校验
    const uploadToken = await generateUploadToken(folderName, env, 2 * 60 * 60);

    return jsonResponse({ 
      folderName,
      uploadToken
    }, 200, corsHeaders);
  }

  // 直接上传单个文件到 R2（需要管理员权限和上传令牌）
  if (path === '/api/upload/file' && method === 'POST') {
    if (!await checkAuth(request, env)) {
      return jsonResponse({ error: '未授权' }, 401, corsHeaders);
    }

    const formData = await request.formData();
    const folderName = formData.get('folderName');
    const filePath = formData.get('filePath');
    const file = formData.get('file');
    const uploadToken = formData.get('uploadToken');

    if (!folderName || !filePath || !file) {
      return jsonResponse({ error: '缺少必要字段' }, 400, corsHeaders);
    }

    if (!uploadToken || !await verifyUploadToken(uploadToken, folderName, env)) {
      return jsonResponse({ error: '上传令牌无效或已过期，请重新发起上传' }, 401, corsHeaders);
    }

    const key = `${folderName}/${filePath}`;
    
    // 检查文件大小，如果超过 95MB，返回错误提示使用分片上传
    if (file.size > 95 * 1024 * 1024) {
      return jsonResponse({ 
        error: '文件过大，请使用分片上传',
        useMultipart: true,
        fileSize: file.size
      }, 413, corsHeaders);
    }
    
    await env.FLASH_STORAGE.put(key, file);

    return jsonResponse({ 
      success: true,
      key: key,
      size: file.size
    }, 200, corsHeaders);
  }

  // 初始化分片上传
  if (path === '/api/upload/multipart/init' && method === 'POST') {
    if (!await checkAuth(request, env)) {
      return jsonResponse({ error: '未授权' }, 401, corsHeaders);
    }

    const body = await request.json();
    const { folderName, filePath, uploadToken } = body;

    if (!folderName || !filePath) {
      return jsonResponse({ error: '缺少必要字段' }, 400, corsHeaders);
    }

    if (!uploadToken || !await verifyUploadToken(uploadToken, folderName, env)) {
      return jsonResponse({ error: '上传令牌无效或已过期，请重新发起上传' }, 401, corsHeaders);
    }

    const key = `${folderName}/${filePath}`;
    const multipartUpload = await env.FLASH_STORAGE.createMultipartUpload(key);

    return jsonResponse({
      uploadId: multipartUpload.uploadId,
      key: multipartUpload.key
    }, 200, corsHeaders);
  }

  // 上传分片
  if (path === '/api/upload/multipart/part' && method === 'POST') {
    if (!await checkAuth(request, env)) {
      return jsonResponse({ error: '未授权' }, 401, corsHeaders);
    }

    const formData = await request.formData();
    const key = formData.get('key');
    const uploadId = formData.get('uploadId');
    const partNumber = parseInt(formData.get('partNumber'));
    const chunk = formData.get('chunk');
    const uploadToken = formData.get('uploadToken');

    if (!key || !uploadId || !partNumber || !chunk) {
      return jsonResponse({ error: '缺少必要字段' }, 400, corsHeaders);
    }

    const partFolderName = key.split('/')[0];
    if (!uploadToken || !await verifyUploadToken(uploadToken, partFolderName, env)) {
      return jsonResponse({ error: '上传令牌无效或已过期，请重新发起上传' }, 401, corsHeaders);
    }

    const multipartUpload = env.FLASH_STORAGE.resumeMultipartUpload(key, uploadId);
    const uploadedPart = await multipartUpload.uploadPart(partNumber, chunk);

    return jsonResponse({
      partNumber: uploadedPart.partNumber,
      etag: uploadedPart.etag
    }, 200, corsHeaders);
  }

  // 完成分片上传
  if (path === '/api/upload/multipart/complete' && method === 'POST') {
    if (!await checkAuth(request, env)) {
      return jsonResponse({ error: '未授权' }, 401, corsHeaders);
    }

    const body = await request.json();
    const { key, uploadId, parts, uploadToken } = body;

    if (!key || !uploadId || !parts) {
      return jsonResponse({ error: '缺少必要字段' }, 400, corsHeaders);
    }

    const completeFolderName = key.split('/')[0];
    if (!uploadToken || !await verifyUploadToken(uploadToken, completeFolderName, env)) {
      return jsonResponse({ error: '上传令牌无效或已过期，请重新发起上传' }, 401, corsHeaders);
    }

    const multipartUpload = env.FLASH_STORAGE.resumeMultipartUpload(key, uploadId);
    await multipartUpload.complete(parts);

    return jsonResponse({
      success: true,
      key: key
    }, 200, corsHeaders);
  }

  // 取消分片上传
  if (path === '/api/upload/multipart/abort' && method === 'POST') {
    if (!await checkAuth(request, env)) {
      return jsonResponse({ error: '未授权' }, 401, corsHeaders);
    }

    const body = await request.json();
    const { key, uploadId, uploadToken } = body;

    if (!key || !uploadId) {
      return jsonResponse({ error: '缺少必要字段' }, 400, corsHeaders);
    }

    const abortFolderName = key.split('/')[0];
    if (!uploadToken || !await verifyUploadToken(uploadToken, abortFolderName, env)) {
      return jsonResponse({ error: '上传令牌无效或已过期，请重新发起上传' }, 401, corsHeaders);
    }

    const multipartUpload = env.FLASH_STORAGE.resumeMultipartUpload(key, uploadId);
    await multipartUpload.abort();

    return jsonResponse({
      success: true
    }, 200, corsHeaders);
  }

  // 完成上传并保存游戏信息（需要管理员权限）
  if (path === '/api/upload/complete' && method === 'POST') {
    if (!await checkAuth(request, env)) {
      return jsonResponse({ error: '未授权' }, 401, corsHeaders);
    }

    const body = await request.json();
    const { 
      folderName, 
      title,
      title2,
      title3,
      title4,
      description, 
      entryFile,
      fileSize,
      thumbnailKey,
      saveFileKey,
      saveName,
      tags,
      uploadToken
    } = body;

    if (!folderName || !title || !entryFile) {
      return jsonResponse({ error: '缺少必要字段' }, 400, corsHeaders);
    }

    if (!uploadToken || !await verifyUploadToken(uploadToken, folderName, env)) {
      return jsonResponse({ error: '上传令牌无效或已过期，请重新发起上传' }, 401, corsHeaders);
    }

    // 保存到数据库
    let thumbnailUrl = null;
    if (thumbnailKey) {
      thumbnailUrl = `${env.R2_PUBLIC_URL}/${thumbnailKey}`;
    }

    const result = await env.DB.prepare(
      'INSERT INTO games (title, title2, title3, title4, description, folder_name, swf_filename, thumbnail_url, file_size, save_file_key, save_name) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).bind(title, title2 || null, title3 || null, title4 || null, description, folderName, entryFile, thumbnailUrl, fileSize, saveFileKey || null, saveName || null).run();

    const gameId = result.meta.last_row_id;

    // 添加 tags
    if (tags && Array.isArray(tags) && tags.length > 0) {
      for (const tagName of tags) {
        const trimmedTag = tagName.trim().toLowerCase();
        if (!trimmedTag) continue;

        let tag = await env.DB.prepare('SELECT id FROM tags WHERE name = ?').bind(trimmedTag).first();
        
        if (!tag) {
          const tagResult = await env.DB.prepare('INSERT INTO tags (name, use_count) VALUES (?, 1)').bind(trimmedTag).run();
          tag = { id: tagResult.meta.last_row_id };
          
          // 关联游戏和 tag
          await env.DB.prepare('INSERT INTO game_tags (game_id, tag_id) VALUES (?, ?)').bind(gameId, tag.id).run();
        } else {
          // 标签已存在，尝试关联游戏和 tag
          try {
            await env.DB.prepare('INSERT INTO game_tags (game_id, tag_id) VALUES (?, ?)').bind(gameId, tag.id).run();
            // 只有成功插入关联时才增加使用计数
            await env.DB.prepare('UPDATE tags SET use_count = use_count + 1 WHERE id = ?').bind(tag.id).run();
          } catch (e) {
            // 已存在则忽略（不增加 use_count）
            console.log(`Tag ${trimmedTag} already exists for game ${gameId}`);
          }
        }
      }
    }

    return jsonResponse({ 
      id: gameId, 
      message: '上传成功' 
    }, 201, corsHeaders);
  }

  // 上传游戏（需要管理员权限）- 保留向后兼容
  if (path === '/api/games' && method === 'POST') {
    if (!await checkAuth(request, env)) {
      return jsonResponse({ error: '未授权' }, 401, corsHeaders);
    }

    const formData = await request.formData();
    const title = formData.get('title');
    const title2 = formData.get('title2');
    const title3 = formData.get('title3');
    const title4 = formData.get('title4');
    const description = formData.get('description');
    const entryFile = formData.get('entryFile');
    const thumbnail = formData.get('thumbnail');

    if (!title || !entryFile) {
      return jsonResponse({ error: '缺少必要字段' }, 400, corsHeaders);
    }

    const folderName = `game_${Date.now()}`;
    let totalSize = 0;

    // 上传所有游戏文件到 R2
    const uploadPromises = [];
    for (const [key, value] of formData.entries()) {
      if (key.startsWith('file_')) {
        const file = value;
        const relativePath = key.substring(5);
        totalSize += file.size;
        uploadPromises.push(
          env.FLASH_STORAGE.put(`${folderName}/${relativePath}`, file)
        );
      }
    }

    if (uploadPromises.length === 0) {
      return jsonResponse({ error: '没有上传任何游戏文件' }, 400, corsHeaders);
    }

    await Promise.all(uploadPromises);

    // 上传缩略图（如果有）
    let thumbnailUrl = null;
    if (thumbnail) {
      await env.FLASH_STORAGE.put(`${folderName}/thumbnail.jpg`, thumbnail);
      thumbnailUrl = `${env.R2_PUBLIC_URL}/${folderName}/thumbnail.jpg`;
    }

    // 保存到数据库
    const result = await env.DB.prepare(
      'INSERT INTO games (title, title2, title3, title4, description, folder_name, swf_filename, thumbnail_url, file_size) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).bind(title, title2 || null, title3 || null, title4 || null, description, folderName, entryFile, thumbnailUrl, totalSize).run();

    return jsonResponse({ id: result.meta.last_row_id, message: '上传成功' }, 201, corsHeaders);
  }

  // 编辑游戏（需要管理员权限）
  if (path.match(/^\/api\/games\/\d+$/) && method === 'PUT') {
    try {
      if (!await checkAuth(request, env)) {
        return jsonResponse({ error: '未授权' }, 401, corsHeaders);
      }

      const id = path.split('/').pop();
      const game = await env.DB.prepare('SELECT * FROM games WHERE id = ?').bind(id).first();
      
      if (!game) {
        return jsonResponse({ error: '游戏不存在' }, 404, corsHeaders);
      }

      // 支持 JSON 和 FormData 两种格式
      const contentType = request.headers.get('content-type') || '';
      let updateData;
      
      if (contentType.includes('application/json')) {
        // JSON 格式（新的分步上传方式）
        updateData = await request.json();
      } else {
        // FormData 格式（旧的一次性上传方式，保留兼容性）
        const formData = await request.formData();
        updateData = {
          title: formData.get('title'),
          title2: formData.get('title2'),
          title3: formData.get('title3'),
          title4: formData.get('title4'),
          description: formData.get('description'),
          entryFile: formData.get('entryFile'),
          saveName: formData.get('saveName'),
          _formData: formData // 保留 formData 用于文件处理
        };
      }

      const { title, title2, title3, title4, description, entryFile, saveName, folderName, thumbnailKey, saveFileKey, _formData } = updateData;

      if (!title) {
        return jsonResponse({ error: '标题不能为空' }, 400, corsHeaders);
      }

      let totalSize = game.file_size;
      let thumbnailUrl = game.thumbnail_url;
      let finalSaveFileKey = game.save_file_key;
      let finalFolderName = game.folder_name;

      // 如果有新的文件夹（分步上传）
      if (folderName) {
        // 删除旧文件夹
        const oldObjects = await env.FLASH_STORAGE.list({ prefix: `${game.folder_name}/` });
        for (const obj of oldObjects.objects) {
          await env.FLASH_STORAGE.delete(obj.key);
        }
        
        // 计算新文件夹的总大小
        const newObjects = await env.FLASH_STORAGE.list({ prefix: `${folderName}/` });
        totalSize = 0;
        for (const obj of newObjects.objects) {
          if (!obj.key.endsWith('thumbnail.jpg') && !obj.key.endsWith('save.sol')) {
            totalSize += obj.size;
          }
        }
        
        finalFolderName = folderName;
      }

      // 如果有新缩略图
      if (thumbnailKey) {
        thumbnailUrl = `${env.R2_PUBLIC_URL}/${thumbnailKey}`;
      } else if (_formData) {
        // FormData 方式的缩略图
        const thumbnail = _formData.get('thumbnail');
        if (thumbnail) {
          await env.FLASH_STORAGE.put(`${finalFolderName}/thumbnail.jpg`, thumbnail);
          thumbnailUrl = `${env.R2_PUBLIC_URL}/${finalFolderName}/thumbnail.jpg`;
        }
      }

      // 如果有新存档
      if (saveFileKey) {
        finalSaveFileKey = saveFileKey;
      } else if (_formData) {
        // FormData 方式的存档
        const saveFile = _formData.get('saveFile');
        if (saveFile) {
          await env.FLASH_STORAGE.put(`${finalFolderName}/save.sol`, saveFile);
          finalSaveFileKey = `${finalFolderName}/save.sol`;
        }
      }

      // FormData 方式的游戏文件
      if (_formData) {
        const hasNewFiles = Array.from(_formData.keys()).some(key => key.startsWith('file_'));
        if (hasNewFiles) {
          // 删除旧的游戏文件（保留缩略图和存档）
          const objects = await env.FLASH_STORAGE.list({ prefix: `${finalFolderName}/` });
          for (const obj of objects.objects) {
            if (!obj.key.endsWith('thumbnail.jpg') && !obj.key.endsWith('save.sol')) {
              await env.FLASH_STORAGE.delete(obj.key);
            }
          }

          // 上传新文件
          totalSize = 0;
          const uploadPromises = [];
          for (const [key, value] of _formData.entries()) {
            if (key.startsWith('file_')) {
              const file = value;
              const relativePath = key.substring(5);
              totalSize += file.size;
              uploadPromises.push(
                env.FLASH_STORAGE.put(`${finalFolderName}/${relativePath}`, file)
              );
            }
          }
          await Promise.all(uploadPromises);
        }
      }

      // 更新数据库（总是更新 save_name，即使为 null）
      const finalEntryFile = entryFile || game.swf_filename;
      const finalSaveName = saveName !== undefined ? saveName : game.save_name;
      
      const updateQuery = 'UPDATE games SET title = ?, title2 = ?, title3 = ?, title4 = ?, description = ?, swf_filename = ?, file_size = ?, thumbnail_url = ?, save_file_key = ?, save_name = ?, folder_name = ? WHERE id = ?';
      const updateParams = [title, title2 || null, title3 || null, title4 || null, description || '', finalEntryFile, totalSize, thumbnailUrl, finalSaveFileKey, finalSaveName, finalFolderName, id];
      
      await env.DB.prepare(updateQuery).bind(...updateParams).run();

      return jsonResponse({ message: '修改成功' }, 200, corsHeaders);
    } catch (error) {
      console.error('编辑游戏失败:', error);
      return jsonResponse({ error: '编辑失败: ' + error.message }, 500, corsHeaders);
    }
  }

  // 删除游戏（需要管理员权限）
  if (path.match(/^\/api\/games\/\d+$/) && method === 'DELETE') {
    if (!await checkAuth(request, env)) {
      return jsonResponse({ error: '未授权' }, 401, corsHeaders);
    }

    const id = path.split('/').pop();
    const game = await env.DB.prepare('SELECT * FROM games WHERE id = ?').bind(id).first();

    if (!game) {
      return jsonResponse({ error: '游戏不存在' }, 404, corsHeaders);
    }

    // 从 R2 删除文件
    const objects = await env.FLASH_STORAGE.list({ prefix: `${game.folder_name}/` });
    for (const obj of objects.objects) {
      await env.FLASH_STORAGE.delete(obj.key);
    }

    // 从数据库删除
    await env.DB.prepare('DELETE FROM games WHERE id = ?').bind(id).run();

    return jsonResponse({ message: '删除成功' }, 200, corsHeaders);
  }

  // 获取文件（从 R2）
  if (path.startsWith('/files/')) {
    const key = path.replace('/files/', '');
    const object = await env.FLASH_STORAGE.get(key);

    if (!object) {
      return new Response('文件不存在', { status: 404 });
    }

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set('etag', object.httpEtag);
    headers.set('Cache-Control', 'public, max-age=31536000');

    return new Response(object.body, { headers });
  }

  return jsonResponse({ error: '未找到' }, 404, corsHeaders);
}

// ==================== JWT / 签名工具函数 ====================

// 用 HMAC-SHA256 对字符串签名，返回 Base64URL 签名
async function signData(data, secret) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
  return base64UrlEncode(signature);
}

// 生成 JWT Token
async function generateJWT(payload, secret, expiresIn = 7 * 24 * 60 * 60) {
  const header = {
    alg: 'HS256',
    typ: 'JWT'
  };

  const now = Math.floor(Date.now() / 1000);
  const jwtPayload = {
    ...payload,
    iat: now,
    exp: now + expiresIn
  };

  const headerBase64 = base64UrlEncode(JSON.stringify(header));
  const payloadBase64 = base64UrlEncode(JSON.stringify(jwtPayload));
  const data = `${headerBase64}.${payloadBase64}`;

  const signatureBase64 = await signData(data, secret);
  return `${data}.${signatureBase64}`;
}

// 生成上传令牌（HMAC 签名，绑定 folderName，带过期时间）
async function generateUploadToken(folderName, env, expiresIn = 2 * 60 * 60) {
  const secret = env.JWT_SECRET || env.ADMIN_PASSWORD;
  const payload = {
    folderName,
    exp: Math.floor(Date.now() / 1000) + expiresIn
  };
  const payloadBase64 = base64UrlEncode(JSON.stringify(payload));
  const signature = await signData(payloadBase64, secret);
  return `${payloadBase64}.${signature}`;
}

// 校验上传令牌：签名有效、未过期、且与目标文件夹一致
async function verifyUploadToken(token, folderName, env) {
  if (!token || typeof token !== 'string' || !folderName) {
    return false;
  }

  try {
    const parts = token.split('.');
    if (parts.length !== 2) {
      return false;
    }

    const [payloadBase64, signatureBase64] = parts;
    const secret = env.JWT_SECRET || env.ADMIN_PASSWORD;
    const expectedSignature = await signData(payloadBase64, secret);

    if (signatureBase64 !== expectedSignature) {
      return false;
    }

    const payload = JSON.parse(new TextDecoder().decode(base64UrlDecode(payloadBase64)));
    if (payload.folderName !== folderName) {
      return false;
    }

    const now = Math.floor(Date.now() / 1000);
    if (!payload.exp || payload.exp < now) {
      return false;
    }

    return true;
  } catch (error) {
    return false;
  }
}


// 验证 JWT Token
async function verifyJWT(token, secret) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    const [headerBase64, payloadBase64, signatureBase64] = parts;
    const data = `${headerBase64}.${payloadBase64}`;

    // 验证签名
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    const signature = base64UrlDecode(signatureBase64);
    const isValid = await crypto.subtle.verify(
      'HMAC',
      key,
      signature,
      encoder.encode(data)
    );

    if (!isValid) {
      return null;
    }

    // 解析 payload
    const payload = JSON.parse(atob(payloadBase64.replace(/-/g, '+').replace(/_/g, '/')));

    // 检查过期时间
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      return null; // Token 已过期
    }

    return payload;
  } catch (error) {
    console.error('JWT 验证失败:', error);
    return null;
  }
}

// Base64 URL 编码
function base64UrlEncode(data) {
  if (typeof data === 'string') {
    data = new TextEncoder().encode(data);
  }
  if (data instanceof ArrayBuffer) {
    data = new Uint8Array(data);
  }
  let base64 = btoa(String.fromCharCode(...data));
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

// Base64 URL 解码
function base64UrlDecode(base64Url) {
  let base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

// ==================== 认证函数 ====================

async function checkAuth(request, env) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return false;
  }
  const token = authHeader.substring(7);
  
  // 尝试验证 JWT Token
  const jwtSecret = env.JWT_SECRET || env.ADMIN_PASSWORD; // 使用 JWT_SECRET 或回退到 ADMIN_PASSWORD
  const payload = await verifyJWT(token, jwtSecret);
  
  if (payload) {
    // JWT 验证成功
    // 如果是普通管理员，检查是否被封禁
    if (payload.id && payload.id !== 0) {
      const user = await env.DB.prepare(
        'SELECT is_banned FROM users WHERE id = ?'
      ).bind(payload.id).first();
      
      if (user && user.is_banned) {
        return false; // 用户已被封禁
      }
    }
    
    return {
      role: payload.role,
      username: payload.username,
      id: payload.id || 0
    };
  }
  
  // JWT 验证失败，尝试旧的 username:password 格式（向后兼容）
  const parts = token.split(':');
  if (parts.length === 2) {
    const [username, password] = parts;
    
    // 检查是否是超级管理员
    if (username === 'super_admin' && password === env.ADMIN_PASSWORD) {
      return { role: 'super_admin', username: 'super_admin', id: 0 };
    }
    
    // 检查数据库中的用户（密码同样走 verifyPassword，兼容哈希和旧明文）
    const user = await env.DB.prepare(
      'SELECT * FROM users WHERE username = ?'
    ).bind(username).first();
    
    if (user && !user.is_banned && await verifyPassword(password, user.password_hash)) {
      return { role: user.role, username: user.username, id: user.id };
    }
  }
  
  return false;
}

// ==================== 密码哈希工具函数 ====================

// 迭代次数取 50,000：兼顾 Workers 免费版 CPU 限制（约数毫秒）与安全性；
// 相比之前的明文存储已经是数量级的提升，后续如需加强可整体提升并保留旧哈希兼容。
const PBKDF2_ITERATIONS = 50000;
const PBKDF2_KEY_BITS = 256;
const PBKDF2_PREFIX = 'pbkdf2-sha256';

// 生成 PBKDF2-SHA256 密码哈希，格式：pbkdf2-sha256$iterations$saltHex$hashHex
async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const derived = await derivePasswordBytes(password, salt, PBKDF2_ITERATIONS);
  return `${PBKDF2_PREFIX}$${PBKDF2_ITERATIONS}$${bytesToHex(salt)}$${bytesToHex(derived)}`;
}

// 校验密码；旧版本存储的是明文，先按哈希校验，格式不匹配时回退到明文比较
async function verifyPassword(password, stored) {
  if (!stored || typeof stored !== 'string') {
    return false;
  }

  const parts = stored.split('$');
  if (parts.length === 4 && parts[0] === PBKDF2_PREFIX) {
    const iterations = parseInt(parts[1], 10);
    if (!Number.isInteger(iterations) || iterations < 1000 || iterations > 1000000) {
      return false;
    }

    const salt = hexToBytes(parts[2]);
    const expectedHash = hexToBytes(parts[3]);
    if (!salt || !expectedHash || expectedHash.length !== PBKDF2_KEY_BITS / 8) {
      return false;
    }

    const actualHash = await derivePasswordBytes(password, salt, iterations);
    return timingSafeEqual(actualHash, expectedHash);
  }

  // 旧明文密码（兼容期，登录成功后会触发自动升级）
  return password === stored;
}

// 旧明文密码是否需要升级为 PBKDF2 哈希
function needsPasswordRehash(stored) {
  return !stored || typeof stored !== 'string' || !stored.startsWith(`${PBKDF2_PREFIX}$`);
}

async function derivePasswordBytes(password, salt, iterations) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      hash: 'SHA-256',
      salt: salt,
      iterations: iterations
    },
    key,
    PBKDF2_KEY_BITS
  );
  return new Uint8Array(bits);
}

function bytesToHex(bytes) {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

function hexToBytes(hex) {
  if (typeof hex !== 'string' || hex.length % 2 !== 0 || !/^[0-9a-fA-F]*$/.test(hex)) {
    return null;
  }
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

function timingSafeEqual(a, b) {
  if (a.length !== b.length) {
    return false;
  }
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a[i] ^ b[i];
  }
  return diff === 0;
}

async function checkSuperAdmin(request, env) {
  const auth = await checkAuth(request, env);
  return auth && auth.role === 'super_admin';
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

function jsonResponse(data, status = 200, additionalHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...additionalHeaders
    }
  });
}
