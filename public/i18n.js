// 多语言配置
const translations = {
    'zh-CN': {
        // 通用
        'app.title': 'Flash 游戏平台',
        'app.loading': '加载中...',
        'app.error': '错误',
        'app.success': '成功',
        'app.confirm': '确认',
        'app.cancel': '取消',
        'app.close': '关闭',
        'app.save': '保存',
        'app.delete': '删除',
        'app.edit': '编辑',
        'app.back': '返回',
        'app.search': '搜索',
        'app.upload': '上传',
        'app.download': '下载',
        
        // 导航
        'nav.home': '首页',
        'nav.admin': '管理员',
        'nav.logout': '退出登录',
        'nav.login': '登录',
        
        // 游戏列表
        'games.title': '游戏列表',
        'games.search.placeholder': '搜索游戏标题或描述...',
        'games.filter.all': '全部游戏',
        'games.filter.tags': '按标签筛选',
        'games.sort.latest': '最新上传',
        'games.sort.earliest': '最早上传',
        'games.sort.popular': '最多播放',
        'games.sort.name': '按名称',
        'games.play': '开始游戏',
        'games.plays': '次播放',
        'games.noGames': '暂无游戏',
        'games.hotTags': '热门标签',
        'games.searchHint': '支持标签搜索：tag:标签名 或 -tag:标签名 排除',
        'games.emptyState': '暂无游戏，管理员可以上传游戏',

        // 游戏详情
        'game.detail': '游戏详情',
        'game.description': '游戏描述',
        'game.noDescription': '暂无描述',
        'game.playCount': '播放次数',
        'game.fileSize': '文件大小',
        'game.uploadDate': '上传日期',
        'game.startGame': '开始游戏',
        'game.downloadGame': '下载游戏',
        'game.renderer': '渲染器选择（如遇到显示问题可切换）',
        'game.renderer.auto': '自动（推荐）',
        'game.renderer.tip': '如果游戏画面异常（如缺失部分），尝试切换到 WebGL 或 Canvas2D',
        
        // 评论
        'comments.title': '评论区',
        'comments.placeholder': '写下你的评论...（最多1000字）',
        'comments.submit': '发表评论',
        'comments.reply': '回复',
        'comments.quote': '引用',
        'comments.like': '点赞',
        'comments.delete': '删除',
        'comments.noComments': '暂无评论，来发表第一条评论吧！',
        'comments.replyTo': '回复',
        'comments.cancelReply': '取消回复',
        'comments.deleteConfirm': '确定要删除这条评论吗？',
        'comments.deleteSuccess': '删除成功！',
        'comments.deleteFailed': '删除失败',
        'comments.postSuccess': '评论成功！',
        'comments.postFailed': '评论失败',
        'comments.inputRequired': '请输入评论内容',
        'comments.loadFailed': '加载评论失败',
        
        // 游戏管理
        'game.editGame': '编辑游戏',
        'game.deleteGame': '删除游戏',
        'game.deleteConfirm': '确定要删除这个游戏吗？此操作不可恢复！',
        'game.deleteSuccess': '删除成功！',
        'game.deleteFailed': '删除失败',
        
        // 管理员
        'admin.panel': '管理面板',
        'admin.uploadGame': '上传游戏',
        'admin.manageAdmins': '管理员管理',
        'admin.siteSettings': '网站设置',
        'admin.analytics': '监控面板',
        'admin.login': '管理员登录',
        'admin.username': '用户名',
        'admin.password': '密码',

        // 上传
        'upload.quickUpload': '快速上传',
        'upload.detailedUpload': '详细上传',
        'upload.selectFolder': '选择文件夹',
        'upload.selectFile': '选择文件',
        'upload.selectZip': '选择 ZIP',
        'upload.gameTitle': '游戏标题',
        'upload.description': '游戏描述',
        'upload.tags': '标签',
        'upload.thumbnail': '缩略图',
        'upload.mainSwf': '主 SWF 文件名',
        'upload.uploading': '上传中...',
        'upload.success': '上传成功',
        'upload.failed': '上传失败',
        'upload.preparing': '准备上传...',
        'upload.savingInfo': '保存信息...',
        'upload.uploadingThumbnail': '上传缩略图...',
        'upload.uploadingSave': '上传存档文件...',
        'upload.noFiles': '请选择要上传的文件',
        'upload.noSwf': '请选择 SWF 文件',
        'upload.noSupportedFiles': '未找到支持的游戏文件',
        'upload.filesSelected': '已选择',
        'upload.files': '个文件',
        'upload.swfFiles': '个 SWF',
        'upload.filtered': '已过滤',
        'upload.unsupportedFiles': '个不支持的文件',
        'upload.selectedFile': '已选择：',
        'upload.size': '大小：',
        'upload.analyzing': '正在分析 ZIP 文件...',
        'upload.invalidZip': 'ZIP 文件无效',
        'upload.zipSelected': '已选择 ZIP 文件',
        'upload.zipContains': '包含',
        'upload.uploadProgress': '上传中...',
        'upload.chunk': '分片',
        'upload.allFilesFailed': '所有文件上传失败，请检查文件大小或网络连接',
        'upload.uploadComplete': '上传完成！',
        'upload.successCount': '成功:',
        'upload.failedFiles': '失败的文件',
        'upload.andMore': '还有',
        'upload.moreFailed': '个文件失败',
        'upload.reason': '原因:',
        'upload.quickUploadHint': '快速上传：游戏名称自动使用文件夹名或文件名，只需选择文件即可',
        'upload.singleSwf': '单个 SWF',
        'upload.selectGameFolder': '选择游戏文件夹（只包含 SWF 文件）',
        'upload.selectSingleSwf': '选择单个 SWF 文件',
        'upload.willUpload': '将要上传：',
        'upload.uploadZip': '上传 ZIP',
        'upload.selectZipFile': '选择 ZIP 压缩包（会自动解压并过滤 SWF 文件）',
        'upload.selectThumbnail': '选择缩略图（可选）',
        'upload.selectSaveFile': '选择存档文件（可选，.sol 格式，用于全 CG）',
        'upload.gameTitle.placeholder': '游戏标题（主标题）',
        'upload.gameTitle2.placeholder': '游戏标题2（可选，如：日文名）',
        'upload.gameTitle3.placeholder': '游戏标题3（可选，如：英文名）',
        'upload.gameTitle4.placeholder': '游戏标题4（可选，如：其他译名）',
        'upload.description.placeholder': '游戏描述（可选）',
        'upload.tags.placeholder': '标签（可选，多个标签用逗号分隔，如：RPG, 冒险, 日系）',
        'upload.entryFile.placeholder': '主 SWF 文件名（如：game.swf 或 data/main.swf）',
        'upload.saveName.placeholder': '存档名称（可选，如：mu09、data01 等，留空则不使用存档）',
        
        // 时间格式
        'time.justNow': '刚刚',
        'time.minutesAgo': '分钟前',
        'time.hoursAgo': '小时前',
        'time.daysAgo': '天前',
        
        // 文件大小
        'fileSize.unknown': '未知',
        
        // 下载
        'download.preparing': '准备下载...',
        'download.packaging': '打包中...',
        'download.downloading': '下载中',
        'download.compressing': '压缩中...',
        'download.complete': '下载完成！',
        'download.failed': '下载失败',
        'download.noFiles': '没有找到游戏文件',
        'download.allFailed': '所有文件下载失败',
        'download.restricted': '该游戏文件过大，管理员限制下载',
        'download.getFilesFailed': '获取文件列表失败',
        
        // 管理员
        'admin.needPermission': '需要管理员权限',
        'admin.loginExpired': '登录已过期，请重新登录',
        'admin.needSuperAdmin': '需要超级管理员权限',
        'admin.permissionCheckFailed': '权限检查失败',
        'admin.addAdmin': '添加管理员',
        'admin.addNew': '添加新管理员',
        'admin.username.placeholder': '用户名（3-20字符）',
        'admin.password.placeholder': '密码（至少6字符）',
        'admin.role.normal': '普通管理员',
        'admin.role.super': '超级管理员',
        'admin.confirmAdd': '确认添加',
        'admin.fillRequired': '请填写用户名和密码',
        'admin.addSuccess': '添加成功！',
        'admin.addFailed': '添加失败',
        'admin.banConfirm': '确定要封禁这个管理员吗？',
        'admin.unbanConfirm': '确定要解封这个管理员吗？',
        'admin.banSuccess': '封禁成功！',
        'admin.unbanSuccess': '解封成功！',
        'admin.banFailed': '封禁失败',
        'admin.unbanFailed': '解封失败',
        'admin.id': 'ID',
        'admin.role': '角色',
        'admin.status': '状态',
        'admin.status.banned': '已封禁',
        'admin.status.normal': '正常',
        'admin.createdDate': '创建时间',
        'admin.lastLogin': '最后登录',
        'admin.neverLogin': '从未登录',
        'admin.actions': '操作',
        'admin.ban': '封禁',
        'admin.unban': '解封',
        'admin.currentUser': '当前用户',
        'admin.superAdmin': '超级管理员',
        'admin.normalAdmin': '管理员',
        
        // 网站设置
        'settings.title': '网站设置',
        'settings.downloadLimit': '下载限制设置',
        'settings.enableDownloadLimit': '启用下载大小限制',
        'settings.downloadLimitDesc': '启用后，超过限制大小的游戏将无法下载（防止流量滥用）',
        'settings.maxDownloadSize': '最大下载大小（MB）',
        'settings.currentSize': '当前设置：',
        'settings.accessControl': '访问控制设置',
        'settings.enableRefererCheck': '启用 Referer 检查',
        'settings.refererCheckDesc': '防止其他网站直接外链你的游戏文件',
        'settings.blockDirectAccess': '禁止直接访问文件',
        'settings.blockDirectAccessDesc': '启用后，用户无法直接在浏览器地址栏访问文件，只能通过网站页面访问（不影响 Ruffle 播放）',
        'settings.enableRateLimit': '启用频率限制',
        'settings.rateLimitDesc': '限制单个 IP 的访问频率，防止恶意刷流量',
        'settings.rateLimitRequests': '每小时最大请求次数',
        'settings.rateLimitRequestsDesc': '单个 IP 每小时最多访问文件的次数（推荐：100-500）',
        'settings.fileTypeLimit': '文件类型限制',
        'settings.allowedExtensions': '允许上传的文件扩展名',
        'settings.allowedExtensionsDesc': '用逗号分隔，例如：.swf,.json,.xml,.txt,.png,.jpg',
        'settings.allowedExtensionsNote': '修改后立即生效，影响所有上传方式（文件夹、ZIP、单文件）',
        'settings.tip': '提示：这些限制不影响正常用户浏览和播放游戏，只防止恶意刷流量。',
        'settings.save': '保存设置',
        'settings.saveSuccess': '设置保存成功！',
        'settings.saveFailed': '保存失败',
        'settings.invalidSize': '请输入有效的大小限制（至少 1MB）',
        'settings.invalidRateLimit': '请输入有效的频率限制（至少 10 次/小时）',
        'settings.invalidExtensions': '请输入允许的文件扩展名',
        'settings.noExtensions': '请至少输入一个文件扩展名',
        'settings.extensionFormatError': '扩展名格式错误：',
        'settings.extensionFormatNote': '（应该以 . 开头）',
        'settings.getFailed': '获取设置失败',
        'settings.loadFailed': '加载设置失败，请重试',
        
        // 标签
        'tags.current': '当前标签：',
        'tags.none': '暂无标签',
        'tags.removeConfirm': '确定要删除这个标签吗？',
        'tags.removeFailed': '删除失败',
        
        // 编辑游戏
        'edit.title': '编辑游戏',
        'edit.updateSuccess': '修改成功！',
        'edit.updateFailed': '修改失败',
        'edit.loadFailed': '加载失败，请重试',
        'edit.saveName.placeholder': '存档名称（可选）',
        'edit.saveName.current': '当前：',
        'edit.unzipping': '解压 ZIP...',
        'edit.unzipFailed': 'ZIP 文件解压失败',
        'edit.updatingInfo': '更新游戏信息...',
        'edit.updatingTags': '更新标签...',
        'edit.allFilesFailed': '所有文件上传失败',
        'edit.partialFailed': '部分文件上传失败',
        'edit.folder': '文件夹',
        'edit.zip': 'ZIP',
        'edit.singleSwf': '单个 SWF',
        'edit.replaceFolder': '替换游戏文件夹（可选，只包含 SWF 文件）',
        'edit.replaceZip': '替换 ZIP 压缩包（可选，会自动解压并过滤 SWF 文件）',
        'edit.replaceSingleSwf': '替换单个 SWF 文件（可选，不选则保持原文件）',
        'edit.replaceThumbnail': '替换缩略图（可选，不选则保持原图）',
        'edit.replaceSaveFile': '替换存档文件（可选，.sol 格式）',
        'edit.saveChanges': '保存修改',
        
        // 登录
        'login.enterPassword': '请输入密码',
        'login.success': '登录成功！欢迎，',
        'login.failed': '登录失败',
        'login.retry': '登录失败，请重试',
        
        // 退出
        'logout.confirm': '确定要退出登录吗？',
        'logout.success': '已退出登录',
        
        // 监控面板
        'analytics.title': '监控面板',
        'analytics.totalViews': '总访问量',
        'analytics.totalPlays': '总播放量',
        'analytics.totalDownloads': '总下载量',
        'analytics.todayActive': '今日活跃',
        'analytics.compared': '较昨日',
        'analytics.gameStats': '游戏统计',
        'analytics.timeRange.today': '今天',
        'analytics.timeRange.7days': '最近 7 天',
        'analytics.timeRange.30days': '最近 30 天',
        'analytics.timeRange.all': '全部时间',
        'analytics.sortBy.views': '按访问量',
        'analytics.sortBy.plays': '按播放量',
        'analytics.sortBy.downloads': '按下载量',
        'analytics.gameName': '游戏名称',
        'analytics.views': '访问量',
        'analytics.plays': '播放量',
        'analytics.downloads': '下载量',
        'analytics.conversionRate': '转化率',
        'analytics.accessLogs': '访问日志',
        'analytics.allGames': '所有游戏',
        'analytics.allActions': '所有操作',
        'analytics.action.view': '查看详情',
        'analytics.action.play': '播放游戏',
        'analytics.action.download': '下载游戏',
        'analytics.filter': '筛选',
        'analytics.time': '时间',
        'analytics.game': '游戏',
        'analytics.action': '操作',
        'analytics.ip': 'IP 地址',
        'analytics.country': '国家/地区',
        'analytics.browser': '浏览器',
        'analytics.prevPage': '上一页',
        'analytics.nextPage': '下一页',
        'analytics.loading': '加载中...',
        'analytics.loadFailed': '加载失败',
    },
    
    'en': {
        // Common
        'app.title': 'Flash Game Platform',
        'app.loading': 'Loading...',
        'app.error': 'Error',
        'app.success': 'Success',
        'app.confirm': 'Confirm',
        'app.cancel': 'Cancel',
        'app.close': 'Close',
        'app.save': 'Save',
        'app.delete': 'Delete',
        'app.edit': 'Edit',
        'app.back': 'Back',
        'app.search': 'Search',
        'app.upload': 'Upload',
        'app.download': 'Download',
        
        // Navigation
        'nav.home': 'Home',
        'nav.admin': 'Admin',
        'nav.logout': 'Logout',
        'nav.login': 'Login',

        // Game List
        'games.title': 'Game List',
        'games.search.placeholder': 'Search game title or description...',
        'games.filter.all': 'All Games',
        'games.filter.tags': 'Filter by Tags',
        'games.sort.latest': 'Latest',
        'games.sort.earliest': 'Earliest',
        'games.sort.popular': 'Most Played',
        'games.sort.name': 'By Name',
        'games.play': 'Play',
        'games.plays': 'plays',
        'games.noGames': 'No games available',
        'games.hotTags': 'Hot Tags',
        'games.searchHint': 'Tag search supported: tag:tagname or -tag:tagname to exclude',
        'games.emptyState': 'No games yet. Admins can upload games',
        
        // Game Detail
        'game.detail': 'Game Detail',
        'game.description': 'Description',
        'game.noDescription': 'No description',
        'game.playCount': 'Play Count',
        'game.fileSize': 'File Size',
        'game.uploadDate': 'Upload Date',
        'game.startGame': 'Start Game',
        'game.downloadGame': 'Download Game',
        'game.renderer': 'Renderer (Switch if display issues occur)',
        'game.renderer.auto': 'Auto (Recommended)',
        'game.renderer.tip': 'If the game display is abnormal (e.g., missing parts), try switching to WebGL or Canvas2D',
        
        // Comments
        'comments.title': 'Comments',
        'comments.placeholder': 'Write your comment... (Max 1000 characters)',
        'comments.submit': 'Post Comment',
        'comments.reply': 'Reply',
        'comments.quote': 'Quote',
        'comments.like': 'Like',
        'comments.delete': 'Delete',
        'comments.noComments': 'No comments yet. Be the first to comment!',
        'comments.replyTo': 'Reply to',
        'comments.cancelReply': 'Cancel Reply',
        'comments.deleteConfirm': 'Are you sure you want to delete this comment?',
        'comments.deleteSuccess': 'Deleted successfully!',
        'comments.deleteFailed': 'Delete failed',
        'comments.postSuccess': 'Comment posted!',
        'comments.postFailed': 'Failed to post comment',
        'comments.inputRequired': 'Please enter comment content',
        'comments.loadFailed': 'Failed to load comments',
        
        // Game Management
        'game.editGame': 'Edit Game',
        'game.deleteGame': 'Delete Game',
        'game.deleteConfirm': 'Are you sure you want to delete this game? This action cannot be undone!',
        'game.deleteSuccess': 'Deleted successfully!',
        'game.deleteFailed': 'Delete failed',

        // Admin
        'admin.panel': 'Admin Panel',
        'admin.uploadGame': 'Upload Game',
        'admin.manageAdmins': 'Manage Admins',
        'admin.siteSettings': 'Site Settings',
        'admin.analytics': 'Analytics',
        'admin.login': 'Admin Login',
        'admin.username': 'Username',
        'admin.password': 'Password',
        
        // Upload
        'upload.quickUpload': 'Quick Upload',
        'upload.detailedUpload': 'Detailed Upload',
        'upload.selectFolder': 'Select Folder',
        'upload.selectFile': 'Select File',
        'upload.selectZip': 'Select ZIP',
        'upload.gameTitle': 'Game Title',
        'upload.description': 'Description',
        'upload.tags': 'Tags',
        'upload.thumbnail': 'Thumbnail',
        'upload.mainSwf': 'Main SWF Filename',
        'upload.uploading': 'Uploading...',
        'upload.success': 'Upload Successful',
        'upload.failed': 'Upload Failed',
        'upload.preparing': 'Preparing upload...',
        'upload.savingInfo': 'Saving info...',
        'upload.uploadingThumbnail': 'Uploading thumbnail...',
        'upload.uploadingSave': 'Uploading save file...',
        'upload.noFiles': 'Please select files to upload',
        'upload.noSwf': 'Please select a SWF file',
        'upload.noSupportedFiles': 'No supported game files found',
        'upload.filesSelected': 'Selected',
        'upload.files': 'files',
        'upload.swfFiles': 'SWF files',
        'upload.filtered': 'filtered',
        'upload.unsupportedFiles': 'unsupported files',
        'upload.selectedFile': 'Selected:',
        'upload.size': 'Size:',
        'upload.analyzing': 'Analyzing ZIP file...',
        'upload.invalidZip': 'Invalid ZIP file',
        'upload.zipSelected': 'ZIP file selected',
        'upload.zipContains': 'contains',
        'upload.uploadProgress': 'Uploading...',
        'upload.chunk': 'chunk',
        'upload.allFilesFailed': 'All files failed to upload. Please check file size or network connection',
        'upload.uploadComplete': 'Upload complete!',
        'upload.successCount': 'Success:',
        'upload.failedFiles': 'Failed files',
        'upload.andMore': 'and',
        'upload.moreFailed': 'more files failed',
        'upload.reason': 'Reason:',
        'upload.quickUploadHint': 'Quick Upload: Game name automatically uses folder or file name, just select files',
        'upload.singleSwf': 'Single SWF',
        'upload.selectGameFolder': 'Select game folder (SWF files only)',
        'upload.selectSingleSwf': 'Select single SWF file',
        'upload.willUpload': 'Will upload:',
        'upload.uploadZip': 'Upload ZIP',
        'upload.selectZipFile': 'Select ZIP archive (will auto-extract and filter SWF files)',
        'upload.selectThumbnail': 'Select thumbnail (optional)',
        'upload.selectSaveFile': 'Select save file (optional, .sol format, for full CG)',
        'upload.gameTitle.placeholder': 'Game Title (Main Title)',
        'upload.gameTitle2.placeholder': 'Game Title 2 (Optional, e.g., Japanese name)',
        'upload.gameTitle3.placeholder': 'Game Title 3 (Optional, e.g., English name)',
        'upload.gameTitle4.placeholder': 'Game Title 4 (Optional, e.g., other translation)',
        'upload.description.placeholder': 'Game Description (Optional)',
        'upload.tags.placeholder': 'Tags (Optional, comma separated, e.g., RPG, Adventure, Japanese)',
        'upload.entryFile.placeholder': 'Main SWF filename (e.g., game.swf or data/main.swf)',
        'upload.saveName.placeholder': 'Save name (Optional, e.g., mu09, data01, leave empty to not use save)',
        
        // Time format
        'time.justNow': 'Just now',
        'time.minutesAgo': 'minutes ago',
        'time.hoursAgo': 'hours ago',
        'time.daysAgo': 'days ago',
        
        // File size
        'fileSize.unknown': 'Unknown',
        
        // Download
        'download.preparing': 'Preparing download...',
        'download.packaging': 'Packaging...',
        'download.downloading': 'Downloading',
        'download.compressing': 'Compressing...',
        'download.complete': 'Download complete!',
        'download.failed': 'Download failed',
        'download.noFiles': 'No game files found',
        'download.allFailed': 'All files failed to download',
        'download.restricted': 'This game file is too large, download restricted by admin',
        'download.getFilesFailed': 'Failed to get file list',
        
        // Admin
        'admin.needPermission': 'Admin permission required',
        'admin.loginExpired': 'Login expired, please login again',
        'admin.needSuperAdmin': 'Super admin permission required',
        'admin.permissionCheckFailed': 'Permission check failed',
        'admin.addAdmin': 'Add Admin',
        'admin.addNew': 'Add New Admin',
        'admin.username.placeholder': 'Username (3-20 characters)',
        'admin.password.placeholder': 'Password (at least 6 characters)',
        'admin.role.normal': 'Normal Admin',
        'admin.role.super': 'Super Admin',
        'admin.confirmAdd': 'Confirm Add',
        'admin.fillRequired': 'Please fill in username and password',
        'admin.addSuccess': 'Added successfully!',
        'admin.addFailed': 'Failed to add',
        'admin.banConfirm': 'Are you sure you want to ban this admin?',
        'admin.unbanConfirm': 'Are you sure you want to unban this admin?',
        'admin.banSuccess': 'Banned successfully!',
        'admin.unbanSuccess': 'Unbanned successfully!',
        'admin.banFailed': 'Failed to ban',
        'admin.unbanFailed': 'Failed to unban',
        'admin.id': 'ID',
        'admin.role': 'Role',
        'admin.status': 'Status',
        'admin.status.banned': 'Banned',
        'admin.status.normal': 'Normal',
        'admin.createdDate': 'Created',
        'admin.lastLogin': 'Last Login',
        'admin.neverLogin': 'Never logged in',
        'admin.actions': 'Actions',
        'admin.ban': 'Ban',
        'admin.unban': 'Unban',
        'admin.currentUser': 'Current User',
        'admin.superAdmin': 'Super Admin',
        'admin.normalAdmin': 'Admin',
        
        // Site Settings
        'settings.title': 'Site Settings',
        'settings.downloadLimit': 'Download Limit Settings',
        'settings.enableDownloadLimit': 'Enable download size limit',
        'settings.downloadLimitDesc': 'When enabled, games exceeding the size limit cannot be downloaded (prevents traffic abuse)',
        'settings.maxDownloadSize': 'Max Download Size (MB)',
        'settings.currentSize': 'Current:',
        'settings.accessControl': 'Access Control Settings',
        'settings.enableRefererCheck': 'Enable Referer Check',
        'settings.refererCheckDesc': 'Prevent other websites from hotlinking your game files',
        'settings.blockDirectAccess': 'Block direct file access',
        'settings.blockDirectAccessDesc': 'When enabled, users cannot directly access files via browser address bar, only through website pages (does not affect Ruffle playback)',
        'settings.enableRateLimit': 'Enable Rate Limiting',
        'settings.rateLimitDesc': 'Limit access frequency per IP to prevent malicious traffic',
        'settings.rateLimitRequests': 'Max Requests Per Hour',
        'settings.rateLimitRequestsDesc': 'Maximum file access per IP per hour (recommended: 100-500)',
        'settings.fileTypeLimit': 'File Type Restrictions',
        'settings.allowedExtensions': 'Allowed File Extensions',
        'settings.allowedExtensionsDesc': 'Comma separated, e.g.: .swf,.json,.xml,.txt,.png,.jpg',
        'settings.allowedExtensionsNote': 'Takes effect immediately, affects all upload methods (folder, ZIP, single file)',
        'settings.tip': 'Tip: These restrictions do not affect normal users browsing and playing games, only prevent malicious traffic.',
        'settings.save': 'Save Settings',
        'settings.saveSuccess': 'Settings saved successfully!',
        'settings.saveFailed': 'Failed to save',
        'settings.invalidSize': 'Please enter a valid size limit (at least 1MB)',
        'settings.invalidRateLimit': 'Please enter a valid rate limit (at least 10 requests/hour)',
        'settings.invalidExtensions': 'Please enter allowed file extensions',
        'settings.noExtensions': 'Please enter at least one file extension',
        'settings.extensionFormatError': 'Extension format error:',
        'settings.extensionFormatNote': '(should start with .)',
        'settings.getFailed': 'Failed to get settings',
        'settings.loadFailed': 'Failed to load settings, please retry',
        
        // Tags
        'tags.current': 'Current tags:',
        'tags.none': 'No tags',
        'tags.removeConfirm': 'Are you sure you want to remove this tag?',
        'tags.removeFailed': 'Failed to remove',
        
        // Edit Game
        'edit.title': 'Edit Game',
        'edit.updateSuccess': 'Updated successfully!',
        'edit.updateFailed': 'Failed to update',
        'edit.loadFailed': 'Failed to load, please retry',
        'edit.saveName.placeholder': 'Save name (optional)',
        'edit.saveName.current': 'Current:',
        'edit.unzipping': 'Unzipping...',
        'edit.unzipFailed': 'Failed to unzip ZIP file',
        'edit.updatingInfo': 'Updating game info...',
        'edit.updatingTags': 'Updating tags...',
        'edit.allFilesFailed': 'All files failed to upload',
        'edit.partialFailed': 'Some files failed to upload',
        'edit.folder': 'Folder',
        'edit.zip': 'ZIP',
        'edit.singleSwf': 'Single SWF',
        'edit.replaceFolder': 'Replace game folder (optional, SWF files only)',
        'edit.replaceZip': 'Replace ZIP archive (optional, will auto-extract and filter SWF files)',
        'edit.replaceSingleSwf': 'Replace single SWF file (optional, keep original if not selected)',
        'edit.replaceThumbnail': 'Replace thumbnail (optional, keep original if not selected)',
        'edit.replaceSaveFile': 'Replace save file (optional, .sol format)',
        'edit.saveChanges': 'Save Changes',
        
        // Login
        'login.enterPassword': 'Please enter password',
        'login.success': 'Login successful! Welcome, ',
        'login.failed': 'Login failed',
        'login.retry': 'Login failed, please retry',
        
        // Logout
        'logout.confirm': 'Are you sure you want to logout?',
        'logout.success': 'Logged out',
        
        // Analytics
        'analytics.title': 'Analytics Dashboard',
        'analytics.totalViews': 'Total Views',
        'analytics.totalPlays': 'Total Plays',
        'analytics.totalDownloads': 'Total Downloads',
        'analytics.todayActive': 'Today Active',
        'analytics.compared': 'vs yesterday',
        'analytics.gameStats': 'Game Statistics',
        'analytics.timeRange.today': 'Today',
        'analytics.timeRange.7days': 'Last 7 Days',
        'analytics.timeRange.30days': 'Last 30 Days',
        'analytics.timeRange.all': 'All Time',
        'analytics.sortBy.views': 'By Views',
        'analytics.sortBy.plays': 'By Plays',
        'analytics.sortBy.downloads': 'By Downloads',
        'analytics.gameName': 'Game Name',
        'analytics.views': 'Views',
        'analytics.plays': 'Plays',
        'analytics.downloads': 'Downloads',
        'analytics.conversionRate': 'Conversion Rate',
        'analytics.accessLogs': 'Access Logs',
        'analytics.allGames': 'All Games',
        'analytics.allActions': 'All Actions',
        'analytics.action.view': 'View Details',
        'analytics.action.play': 'Play Game',
        'analytics.action.download': 'Download Game',
        'analytics.filter': 'Filter',
        'analytics.time': 'Time',
        'analytics.game': 'Game',
        'analytics.action': 'Action',
        'analytics.ip': 'IP Address',
        'analytics.country': 'Country/Region',
        'analytics.browser': 'Browser',
        'analytics.prevPage': 'Previous',
        'analytics.nextPage': 'Next',
        'analytics.loading': 'Loading...',
        'analytics.loadFailed': 'Load failed',
    }
};

// i18n 工具类
class I18n {
    constructor() {
        this.currentLang = localStorage.getItem('language') || this.detectLanguage();
        this.translations = translations;
    }
    
    detectLanguage() {
        const browserLang = navigator.language || navigator.userLanguage;
        if (browserLang.startsWith('zh')) {
            return 'zh-CN';
        }
        return 'en';
    }

    
    setLanguage(lang) {
        if (this.translations[lang]) {
            this.currentLang = lang;
            localStorage.setItem('language', lang);
            return true;
        }
        return false;
    }
    
    getLanguage() {
        return this.currentLang;
    }
    
    t(key, defaultValue = '') {
        const translation = this.translations[this.currentLang];
        return translation && translation[key] ? translation[key] : (defaultValue || key);
    }
    
    // 翻译页面上所有带 data-i18n 属性的元素
    translatePage() {
        document.querySelectorAll('[data-i18n]').forEach(element => {
            const key = element.getAttribute('data-i18n');
            const translation = this.t(key);
            
            if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
                if (element.placeholder !== undefined) {
                    element.placeholder = translation;
                }
            } else {
                element.textContent = translation;
            }
        });
        
        // 翻译 data-i18n-placeholder 属性
        document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
            const key = element.getAttribute('data-i18n-placeholder');
            element.placeholder = this.t(key);
        });
        
        // 翻译 data-i18n-title 属性
        document.querySelectorAll('[data-i18n-title]').forEach(element => {
            const key = element.getAttribute('data-i18n-title');
            element.title = this.t(key);
        });
    }
}

// 创建全局 i18n 实例
const i18n = new I18n();
