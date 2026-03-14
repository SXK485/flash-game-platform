// Cloudflare Pages Functions 中间件
// 这个文件会处理所有 /api/* 请求

export async function onRequest(context) {
  const { request, env, next } = context;
  const url = new URL(request.url);

  // 如果不是 API 请求，交给静态文件处理
  if (!url.pathname.startsWith('/api/') && !url.pathname.startsWith('/files/')) {
    return next();
  }

  // 导入 API 处理逻辑
  const { handleAPI } = await import('./api-handler.js');
  
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    return await handleAPI(request, env, url.pathname, corsHeaders);
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
}
