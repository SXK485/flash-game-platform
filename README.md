# Flash 游戏在线播放平台

基于 Cloudflare Workers + Pages + R2 + D1 的 Flash 游戏平台，使用 Ruffle 播放器。

## 🌐 在线演示

访问在线演示站点：[https://flash.flowerspine.xyz](https://flash.flowerspine.xyz)

> 注意：演示站点仅供参考，请勿上传敏感内容。

## ✨ 功能特性

### 核心功能
- 🎮 在线播放 Flash 游戏（基于 Ruffle）
- 📤 游戏上传、管理、删除（支持大文件分片上传）
- ⚡ 快速上传和详细上传两种模式
- 🌍 多语言标题支持（title、title2、title3、title4）
- 🏷️ Tag 标签系统（热门标签展示）
- 💬 评论系统（点赞、回复、引用）
- 💾 存档导入功能（一键加载全 CG）

### 权限系统
- 👑 超级管理员：完整权限（管理员管理、网站设置、监控面板）
- 👤 普通管理员：上传和管理游戏
- 👥 游客：浏览、播放、评论、下载

### 监控与安全
- 📊 访问统计（浏览、播放、下载）
- 🔒 下载大小限制
- 🛡️ Referer 检查（防盗链）
- ⏱️ 频率限制（防刷流量）
- 📝 访问日志记录

### 国际化
- 🌐 中文/英文双语支持
- 🔄 实时语言切换

### 移动端优化
- 📱 响应式设计
- 🎯 全屏播放支持

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

复制返回的 `database_id`，更新 `wrangler.toml` 中的 `database_id`。

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
npx wrangler d1 execute flash_games_db --file=./init.sql --remote
```

### 3. 配置环境变量

复制 `wrangler.toml.example` 为 `wrangler.toml`，修改以下配置：

```toml
[vars]
ADMIN_PASSWORD = "your-secure-password"
R2_PUBLIC_URL = "https://your-r2-public-url.r2.dev"
JWT_SECRET = "your-random-64-char-secret"
```

生成 JWT_SECRET：
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 4. 本地开发

```bash
npm run dev
```

访问 `http://localhost:8787`

### 5. 部署到 Cloudflare

```bash
npm run deploy
```

## 📖 使用说明

### 游客功能
- 浏览和搜索游戏（支持标签搜索：`tag:RPG` 或 `-tag:RPG` 排除）
- 在线播放游戏（支持多种渲染器切换）
- 查看游戏详情
- 发表评论、点赞、回复
- 下载游戏（ZIP 打包）

### 管理员功能
- 上传游戏（支持文件夹、ZIP、单个 SWF 三种方式）
- 编辑和删除游戏
- 管理 Tag 标签
- 删除评论
- 上传存档文件（.sol 格式）

### 超级管理员功能
- 所有管理员功能
- 管理其他管理员账号（添加、封禁、删除）
- 查看监控面板（访问统计、游戏排行、访问日志）
- 配置网站设置（下载限制、频率限制、文件类型限制等）

## 🛠️ 技术栈

- **前端**: 原生 HTML + CSS + JavaScript（无框架）
- **后端**: Cloudflare Workers + Pages Functions
- **数据库**: Cloudflare D1（SQLite）
- **存储**: Cloudflare R2（对象存储）
- **缓存**: Cloudflare KV（频率限制）
- **Flash 播放器**: Ruffle.js
- **国际化**: 自定义 i18n 实现

## 📁 文件结构

```
flash-game-platform/
├── public/              # 前端静态文件
│   ├── index.html      # 主页（游戏列表）
│   ├── game.html       # 游戏详情页
│   ├── play.html       # 播放页面
│   ├── analytics.html  # 监控面板
│   ├── style.css       # 样式
│   ├── app.js          # 前端逻辑
│   └── i18n.js         # 国际化
├── functions/          # Pages Functions
│   ├── _middleware.js  # 路由中间件
│   └── api-handler.js  # API 处理逻辑
├── src/
│   └── index.js        # Workers 主入口
├── init.sql            # 数据库初始化脚本
├── wrangler.toml.example  # 配置示例
└── package.json
```

## 🗄️ 数据库表结构

- `games` - 游戏信息（支持多语言标题）
- `users` - 管理员账户
- `tags` / `game_tags` - 标签系统
- `comments` / `comment_likes` - 评论系统
- `access_logs` / `game_stats` - 监控统计
- `site_settings` - 网站配置

## 🔧 高级配置

### 网站设置（超级管理员）

1. **下载限制**
   - 启用/禁用下载大小限制
   - 设置最大下载大小（MB）

2. **访问控制**
   - Referer 检查（防止外链）
   - 禁止直接访问文件
   - 频率限制（每小时最大请求次数）

3. **文件类型限制**
   - 自定义允许上传的文件扩展名
   - 默认：`.swf,.json,.xml,.txt,.png,.jpg,.jpeg,.gif,.bmp,.mp3,.wav,.ogg,.dat,.bin`

### 上传方式

1. **快速上传**：自动使用文件夹名或文件名作为游戏名称
2. **详细上传**：手动填写游戏信息、标签、多语言标题等
3. **支持格式**：
   - 文件夹上传（推荐）
   - ZIP 压缩包（自动解压）
   - 单个 SWF 文件

### 存档功能

- 支持上传 `.sol` 格式的 Flash 存档文件
- 自动加载到 LocalStorage
- 适用于全 CG 存档等场景

## 💡 常见问题

### 如何修改管理员密码？
修改 `wrangler.toml` 中的 `ADMIN_PASSWORD`，然后重新部署。

### 如何添加普通管理员？
以超级管理员身份登录，进入"管理员管理"界面添加。

### 游戏无法播放？
1. 检查 SWF 文件是否正确上传
2. 尝试切换渲染器（WebGPU → WebGL → Canvas2D）
3. 查看浏览器控制台错误信息

### 如何查看数据库内容？
```bash
npx wrangler d1 execute flash_games_db --command "SELECT * FROM games" --remote
```

### 如何清理旧的访问日志？
```bash
npx wrangler d1 execute flash_games_db --command "DELETE FROM access_logs WHERE created_date < date('now', '-30 days')" --remote
```

### 如何备份数据库？
```bash
npx wrangler d1 export flash_games_db --output=backup.sql --remote
```

## 📊 Cloudflare 免费版限制

- **R2**: 10GB 存储，每月 100 万次读取
- **D1**: 5GB 存储，每天 500 万次读取
- **Workers**: 每天 10 万次请求
- **KV**: 100,000 次读取/天，1,000 次写入/天

## 🔐 安全建议

1. **强密码**：使用复杂的 `ADMIN_PASSWORD` 和 `JWT_SECRET`
2. **定期更新**：定期更新依赖和 Wrangler 版本
3. **访问控制**：启用 Referer 检查和频率限制
4. **日志监控**：定期查看访问日志，发现异常行为
5. **备份数据**：定期备份数据库和 R2 存储

## 🚧 待办事项

### 短期优化
- [ ] 游戏评分系统
- [ ] 用户收藏功能
- [ ] 批量管理工具
- [ ] 游戏分类筛选

### 中长期计划
- [ ] 迁移到 Astro 框架
- [ ] 游戏推荐算法
- [ ] 全文搜索优化
- [ ] PWA 支持

## 📄 许可证

MIT License

## 🙏 致谢

- [Ruffle](https://ruffle.rs/) - Flash 播放器
- [Cloudflare](https://www.cloudflare.com/) - 基础设施
- [JSZip](https://stuk.github.io/jszip/) - ZIP 处理

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📮 联系方式

如有问题或建议，请提交 Issue。
