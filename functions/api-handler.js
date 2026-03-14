// API 处理逻辑（从 src/index.js 移植）

export async function handleAPI(request, env, path, corsHeaders) {
  const method = request.method;

  // 获取游戏列表
  if (path === '/api/games' && method === 'GET') {
    const url = new URL(request.url);
    const search = url.searchParams.get('search') || '';
    
    let query = 'SELECT * FROM games';
    let params = [];
    
    if (search) {
      query += ' WHERE title LIKE ? OR description LIKE ?';
      params = [`%${search}%`, `%${search}%`];
    }
    
    query += ' ORDER BY upload_date DESC';
    
    const { results } = await env.DB.prepare(query).bind(...params).all();
    return jsonResponse(results, 200, corsHeaders);
  }

  // 获取单个游戏详情
  if (path.match(/^\/api\/games\/\d+$/) && method === 'GET') {
    const id = path.split('/').pop();
    const game = await env.DB.prepare('SELECT * FROM games WHERE id = ?').bind(id).first();
    
    if (!game) {
      return jsonResponse({ error: '游戏不存在' }, 404, corsHeaders);
    }
    
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

    const folderName = `game_${Date.now()}`;
    const uploadToken = crypto.randomUUID();

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

    if (!folderName || !filePath || !file) {
      return jsonResponse({ error: '缺少必要字段' }, 400, corsHeaders);
    }

    const key = `${folderName}/${filePath}`;
    await env.FLASH_STORAGE.put(key, file);

    return jsonResponse({ 
      success: true,
      key: key,
      size: file.size
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
      description, 
      entryFile,
      width = 800,
      height = 600,
      fileSize,
      thumbnailKey
    } = body;

    if (!folderName || !title || !entryFile) {
      return jsonResponse({ error: '缺少必要字段' }, 400, corsHeaders);
    }

    // 保存到数据库
    let thumbnailUrl = null;
    if (thumbnailKey) {
      thumbnailUrl = `/files/${thumbnailKey}`;
    }

    const result = await env.DB.prepare(
      'INSERT INTO games (title, description, folder_name, swf_filename, thumbnail_url, file_size, width, height) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    ).bind(title, description, folderName, entryFile, thumbnailUrl, fileSize, width, height).run();

    return jsonResponse({ 
      id: result.meta.last_row_id, 
      message: '上传成功' 
    }, 201, corsHeaders);
  }

  // 直接上传到 R2（用于小文件，保持向后兼容）
  if (path === '/api/games' && method === 'POST') {
    if (!await checkAuth(request, env)) {
      return jsonResponse({ error: '未授权' }, 401, corsHeaders);
    }

    const formData = await request.formData();
    const title = formData.get('title');
    const description = formData.get('description');
    const entryFile = formData.get('entryFile');
    const width = formData.get('width') || 800;
    const height = formData.get('height') || 600;

    if (!title || !entryFile) {
      return jsonResponse({ error: '缺少必要字段' }, 400, corsHeaders);
    }

    const folderName = `game_${Date.now()}`;
    let totalSize = 0;

    // 上传所有游戏文件
    for (const [key, value] of formData.entries()) {
      if (key.startsWith('file_')) {
        const filePath = key.substring(5); // 移除 'file_' 前缀
        await env.FLASH_STORAGE.put(`${folderName}/${filePath}`, value);
        totalSize += value.size;
      }
    }

    // 上传缩略图（如果有）
    let thumbnailUrl = null;
    const thumbnail = formData.get('thumbnail');
    if (thumbnail) {
      await env.FLASH_STORAGE.put(`${folderName}/thumbnail.jpg`, thumbnail);
      thumbnailUrl = `/files/${folderName}/thumbnail.jpg`;
    }

    // 保存到数据库
    const result = await env.DB.prepare(
      'INSERT INTO games (title, description, folder_name, swf_filename, thumbnail_url, file_size, width, height) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    ).bind(title, description, folderName, entryFile, thumbnailUrl, totalSize, width, height).run();

    return jsonResponse({ id: result.meta.last_row_id, message: '上传成功' }, 201, corsHeaders);
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

async function checkAuth(request, env) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return false;
  }
  const token = authHeader.substring(7);
  return token === env.ADMIN_PASSWORD;
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
