# Flash 游戏在线播放平台

基于 Cloudflare Workers + Pages + R2 + D1 的 Flash 游戏平台，使用 Ruffle 播放器。前端为原生 HTML/CSS/JavaScript，无框架。

## 🌐 在线演示

访问在线演示站点：[https://flash.flowerspine.xyz](https://flash.flowerspine.xyz)

> 注意：演示站点仅供参考，请勿上传敏感内容。

## ✨ 功能特性

### 核心功能

- 🎮 在线播放 Flash 游戏（基于 Ruffle，支持多渲染器）
- 📤 游戏上传、管理、删除（文件夹 / ZIP / 单个 SWF，支持大文件分片上传）
- ⚡ 快速上传和详细上传两种模式
- 🌍 多语言标题（title、title2、title3、title4）和中英文界面
- 🏷️ 标签系统：标签类型（作者 / 角色 / 身体特征 / 动作姿势 / 内容警告 / 一般）、颜色标识、标签描述、`tag:` 与 `-tag:` 搜索
- ❤️ 游客匿名收藏（设备 ID + D1，无需注册登录）
- 🕘 最近游玩记录（匿名设备 ID，可清空）
- ⭐ 游戏评分：1～5 星，玩过才能评，可修改评分；管理员可查看评分分布
- 🖼️ 封面系统：无封面游戏自动生成渐变封面；管理员可在播放页直接从 Ruffle canvas 截图框选设为封面
- 💬 评论系统：点赞、回复、引用
- 💾 存档导入功能（.sol 存档一键加载）

### 权限系统

- 👑 超级管理员：完整权限（管理员管理、网站设置、标签管理、监控面板）
- 👤 普通管理员：上传和管理游戏
- 👥 游客：浏览、播放、评论、下载、收藏、评分、最近游玩

### 监控与安全

- 📊 访问统计（浏览、播放、下载；今日 / 昨日 / 累计）
- 🔒 下载大小限制
- 🛡️ Referer 检查（防盗链，仅作用于 `/files/`）
- ⏱️ 频率限制（防刷流量）
- 🔐 JWT 登录、上传令牌校验
- 🔑 管理员密码 PBKDF2-SHA256 哈希存储，旧明文密码自动升级
- 🗑️ 删除游戏时自动清理文件、标签、收藏、评分、评论、统计等关联数据

### SEO

- 🤖 动态 sitemap：实时生成全部游戏详情页 URL
- 🖼️ 图片 sitemap：为有封面的游戏生成图片条目
- 📄 服务端 SEO 注入：`game.html?id=N` 返回真实标题、描述、Open Graph 和 JSON-LD（VideoGame）
- 🔍 Google / Bing 站点验证文件
- 📱 PWA：可安装到主屏幕，支持离线页面壳

### 移动端

- 📱 响应式布局和底部弹层
- 🎯 全屏播放支持
- 👆 触控尺寸优化和安全区适配
- 🗂️ 监控页宽表格卡片化，无需左右滑动

## 🚀 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 创建 Cloudflare 资源

#### 创建 D1 数据库

```bash
npx wrangler d1 create flash_games_db
```

复制返回的 `database_id`，更新 `wrangler.toml`。

#### 创建 R2 存储桶

```bash
npx wrangler r2 bucket create flash-games
```

#### 创建 KV 命名空间（频率限制）

```bash
npx wrangler kv:namespace create RATE_LIMIT
npx wrangler kv:namespace create RATE_LIMIT --preview
```

复制返回的 ID，更新 `wrangler.toml`。

#### 初始化数据库

```bash
npm run db:init
```

### 3. 配置环境变量

复制 `wrangler.toml.example` 为 `wrangler.toml`，修改：

```toml
[vars]
ADMIN_PASSWORD = "your-secure-password"
R2_PUBLIC_URL = "https://your-r2-custom-domain.com"
JWT_SECRET = "your-random-64-char-secret"
```

生成 JWT_SECRET：

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

> `wrangler.toml` 已在 `.gitignore` 中，请勿提交真实密码和密钥。

### 4. 本地开发

```bash
npm run dev
```

访问 `http://localhost:8787`

### 5. 部署

```bash
npm run deploy
```

## 📖 使用说明

### 游客功能

- 浏览和搜索游戏：
  - 关键词搜索
  - `tag:标签名` 包含标签
  - `-tag:标签名` 排除标签
  - 最低评分筛选（★1+ ～ ★4.5+）
- 在线播放、查看详情
- 收藏、最近游玩、评分（玩过才能评）
- 发表评论、点赞、回复
- 下载游戏（前端 ZIP 打包）

### 管理员功能

- 上传游戏（文件夹 / ZIP / 单个 SWF）
- 编辑、删除游戏
- 标签管理：设置标签类型、描述
- 删除评论
- 上传存档文件
- 在播放页截取游戏画面设为封面

### 超级管理员功能

- 所有管理员功能
- 管理其他管理员账号
- 查看监控面板（访问统计、游戏排行、访问日志）
- 配置网站设置（下载限制、频率限制、文件类型限制等）

## 🛠️ 技术栈

- **前端**：原生 HTML + CSS + JavaScript（无框架）
- **后端**：Cloudflare Workers
- **数据库**：Cloudflare D1（SQLite）
- **存储**：Cloudflare R2
- **缓存**：Cloudflare KV（频率限制）
- **Flash 播放器**：Ruffle.js
- **国际化**：自定义 i18n（中英文）
- **部署工具**：Wrangler 4

## 📁 文件结构

```
flash-game-platform/
├── public/                  # 前端静态文件
│   ├── index.html           # 首页：搜索、标签、评分筛选、游戏列表
│   ├── game.html            # 游戏详情：评分、评论、下载、SEO
│   ├── play.html            # Ruffle 播放页 + 封面截图
│   ├── analytics.html       # 监控面板
│   ├── app.js               # 首页逻辑
│   ├── i18n.js              # 中英文翻译
│   ├── style.css            # 全局样式 + 移动端适配
│   ├── manifest.webmanifest # PWA 配置
│   ├── sw.js                # Service Worker
│   ├── sitemap.xml          # 静态兜底（线上由 Worker 动态生成）
│   └── robots.txt / 验证文件 / 图标
├── src/
│   └── index.js             # Workers 主入口与全部 API
├── init.sql                 # 数据库初始化脚本
├── wrangler.toml.example    # 配置模板
├── SEO_GUIDE.md             # SEO 说明
└── package.json
```

## 🗄️ 数据库表

- `games` - 游戏信息（多语言标题）
- `users` - 管理员账户
- `tags` / `game_tags` - 标签系统（类型、描述、使用计数）
- `comments` / `comment_likes` - 评论系统
- `favorites` - 游客匿名收藏
- `play_history` - 最近游玩记录
- `ratings` - 游戏评分
- `access_logs` / `game_stats` - 监控统计
- `site_settings` - 网站配置

## 🔧 高级配置

### 网站设置（超级管理员）

- 下载限制：启用/禁用，最大下载大小
- 访问控制：Referer 检查、禁止直接访问、频率限制
- 文件类型限制：自定义允许上传的扩展名

### 上传方式

- 快速上传：自动使用文件夹名/文件名作为游戏名称
- 详细上传：手动填写游戏信息、标签、多语言标题
- 支持格式：文件夹、ZIP（自动解压）、单个 SWF
- 大文件：超过 95MB 自动使用 R2 分片上传

### 标签管理

- 新标签在编辑游戏时用逗号分隔创建，默认类型为“一般”
- 管理员菜单 → 标签管理：设置类型和描述
- 类型：作者 / 角色 / 身体特征 / 动作姿势 / 内容警告 / 一般

### 封面

- 无封面游戏自动显示渐变 + 标题封面
- 管理员在播放页点“设为封面”，从 Ruffle canvas 截取画面并框选裁剪

### 评分

- 游客使用匿名设备 ID 评分
- 必须玩过该游戏后才能评分
- 同一设备可修改评分，不重复计数
- 评分人数仅管理员可见

## 💡 常见问题

### 如何修改管理员密码？

修改 `wrangler.toml` 中的 `ADMIN_PASSWORD`，重新部署。

### 游戏无法播放？

1. 检查 SWF 文件是否正确上传
2. 尝试切换渲染器（WebGPU → WebGL → Canvas2D）
3. 查看浏览器控制台错误

### 如何查看数据库内容？

```bash
npx wrangler d1 execute flash_games_db --command "SELECT * FROM games" --remote
```

### 如何备份数据库？

```bash
npx wrangler d1 export flash_games_db --output=backup.sql --remote
```

### 如何提交搜索引擎？

1. Google Search Console / Bing Webmaster 添加站点并验证；
2. 提交 sitemap：`https://flash.flowerspine.xyz/sitemap.xml`
3. 每款游戏详情页已有服务端 SEO 内容，封面会进入图片 sitemap

## 🚧 待办事项

- [ ] 批量管理工具
- [ ] 相关游戏 / 简单推荐
- [ ] 首页加载更多（游戏超过 150～200 款后再做）
- [ ] 游戏分类筛选（暂定不细分，改用标签系统）

## 📄 许可证

MIT License

## 🙏 致谢

- [Ruffle](https://ruffle.rs/) - Flash 播放器
- [Cloudflare](https://www.cloudflare.com/) - 基础设施
- [JSZip](https://stuk.github.io/jszip/) - ZIP 处理
