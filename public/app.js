// 全局状态
let isAdmin = false;
let isSuperAdmin = false;
let adminToken = null;
let currentUser = null;
let uploadMethod = 'folder'; // 'folder', 'zip', or 'single'
let editMethod = 'folder'; // 'folder', 'zip', or 'single'
let allTags = []; // 所有可用的 tags
let favoriteGameIds = new Set(); // 当前设备的收藏游戏 ID
let showFavoritesOnly = false; // 首页是否只看收藏
let visitorDeviceId = null;
let recentPlayedGames = []; // 当前设备最近游玩

// 获取匿名设备 ID（游客免登录收藏用，存在 localStorage）
function getVisitorDeviceId() {
    if (visitorDeviceId) {
        return visitorDeviceId;
    }

    let deviceId = localStorage.getItem('flashVisitorId');
    if (!deviceId) {
        if (window.crypto && typeof window.crypto.randomUUID === 'function') {
            deviceId = window.crypto.randomUUID();
        } else {
            deviceId = 'v_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2);
        }
        localStorage.setItem('flashVisitorId', deviceId);
    }

    visitorDeviceId = deviceId;
    return deviceId;
}

// 加载当前设备的收藏列表
async function loadFavorites() {
    try {
        const deviceId = getVisitorDeviceId();
        const response = await fetch(`/api/favorites?deviceId=${encodeURIComponent(deviceId)}`);
        if (!response.ok) {
            return;
        }

        const ids = await response.json();
        favoriteGameIds = new Set(ids.map(id => Number(id)));
    } catch (error) {
        console.error('加载收藏失败:', error);
    }
}

// 加载当前设备最近游玩记录
async function loadPlayHistory() {
    if (!recentGamesSection || !recentGamesList) {
        return;
    }

    try {
        const deviceId = getVisitorDeviceId();
        const response = await fetch(`/api/play-history?deviceId=${encodeURIComponent(deviceId)}&limit=12`);
        if (!response.ok) {
            return;
        }

        recentPlayedGames = await response.json();
        renderRecentGames();
    } catch (error) {
        console.error('加载最近游玩失败:', error);
    }
}

// 根据游戏 ID 生成稳定的渐变封面背景
function coverGradient(gameId) {
    const hue = (Number(gameId) * 47) % 360;
    return `linear-gradient(135deg, hsl(${hue}, 70%, 52%), hsl(${(hue + 45) % 360}, 72%, 34%))`;
}

// 渲染最近游玩区域
function renderRecentGames() {
    if (!recentGamesSection || !recentGamesList) {
        return;
    }

    if (recentPlayedGames.length === 0) {
        recentGamesSection.style.display = 'none';
        return;
    }

    recentGamesSection.style.display = 'block';
    recentGamesList.innerHTML = recentPlayedGames.map(game => `
        <div class="recent-game-card" onclick="window.location.href='/play.html?id=${game.id}'">
            ${game.thumbnail_url
                ? `<img src="${escapeHtml(game.thumbnail_url)}" alt="${escapeHtml(game.title)}">`
                : `<div class="recent-game-thumbnail-placeholder auto-cover" style="background:${coverGradient(game.id)}"><span>${escapeHtml(game.title)}</span></div>`
            }
            <div class="recent-game-title">${escapeHtml(game.title)}</div>
        </div>
    `).join('');
}

// 清空最近游玩记录
async function clearPlayHistory() {
    if (!confirm(i18n.t('history.clearConfirm'))) {
        return;
    }

    try {
        const deviceId = getVisitorDeviceId();
        const response = await fetch(`/api/play-history?deviceId=${encodeURIComponent(deviceId)}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            recentPlayedGames = [];
            renderRecentGames();
        }
    } catch (error) {
        console.error('清空最近游玩失败:', error);
    }
}

// 切换收藏
async function toggleFavorite(event, gameId) {
    if (event) {
        event.stopPropagation();
    }

    const deviceId = getVisitorDeviceId();
    const wasFavorite = favoriteGameIds.has(Number(gameId));

    try {
        const response = await fetch('/api/favorites', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ deviceId, gameId })
        });

        if (!response.ok) {
            throw new Error('HTTP ' + response.status);
        }

        const result = await response.json();
        const isFavorite = result.action === 'added';

        if (isFavorite) {
            favoriteGameIds.add(Number(gameId));
        } else {
            favoriteGameIds.delete(Number(gameId));
        }

        updateFavoriteButtons(gameId, isFavorite);

        // 如果当前处于“只看收藏”模式，移除后需要刷新列表
        if (showFavoritesOnly && !isFavorite) {
            performSearch(searchInput.value);
        }
    } catch (error) {
        console.error('收藏操作失败:', error);
        alert(i18n.t('favorites.toggleFailed'));
    }
}

// 更新页面上该游戏所有收藏按钮的状态
function updateFavoriteButtons(gameId, isFavorite) {
    document.querySelectorAll(`[data-favorite-btn="${gameId}"]`).forEach(btn => {
        btn.classList.toggle('active', isFavorite);
        btn.title = isFavorite ? i18n.t('favorites.remove') : i18n.t('favorites.add');
        btn.innerHTML = isFavorite ? '❤️' : '🤍';
    });
}

// 更新“我的收藏”筛选按钮的图标和文案
function updateFavoritesFilterButton() {
    if (!favoritesFilterBtn) {
        return;
    }
    const label = i18n.t('games.filter.favorites');
    favoritesFilterBtn.innerHTML = `${showFavoritesOnly ? '❤️' : '🤍'} <span>${escapeHtml(label)}</span>`;
}

// DOM 元素
const gameGrid = document.getElementById('gameGrid');
const emptyState = document.getElementById('emptyState');
const searchInput = document.getElementById('searchInput');
const hotTags = document.getElementById('hotTags');
const favoritesFilterBtn = document.getElementById('favoritesFilterBtn');
const recentGamesSection = document.getElementById('recentGamesSection');
const recentGamesList = document.getElementById('recentGamesList');
const adminBtn = document.getElementById('adminBtn');
const loginModal = document.getElementById('loginModal');
const uploadModal = document.getElementById('uploadModal');
const editModal = document.getElementById('editModal');
const loginBtn = document.getElementById('loginBtn');
const adminUsername = document.getElementById('adminUsername');
const adminPassword = document.getElementById('adminPassword');
const uploadForm = document.getElementById('uploadForm');
const editForm = document.getElementById('editForm');

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    console.log('[DEBUG] 页面加载完成，开始初始化');
    console.log('[DEBUG] JSZip 是否加载:', typeof JSZip !== 'undefined');
    
    // 初始化语言
    initLanguage();
    
    // 加载允许的文件扩展名
    loadAllowedExtensions();
    
    // 先加载 tags 和设置事件监听
    loadTags();
    setupEventListeners();
    
    // 先检查登录状态，再加载收藏、最近游玩和游戏
    checkAdminStatus().then(async () => {
        console.log('[DEBUG] 初始化：登录状态检查完成，开始加载收藏、最近游玩和游戏');
        await Promise.all([loadFavorites(), loadPlayHistory()]);
        loadGames();
        
        // 检查是否有编辑参数
        const urlParams = new URLSearchParams(window.location.search);
        const editId = urlParams.get('edit');
        if (editId && isAdmin) {
            editGame(parseInt(editId));
            // 清除 URL 参数
            window.history.replaceState({}, '', '/');
        }
    });
});

// 页面显示时重新检查状态（处理浏览器返回）
let pageLoadCount = 0;
window.addEventListener('pageshow', (event) => {
    pageLoadCount++;
    console.log('[DEBUG] pageshow 事件触发, persisted:', event.persisted, 'pageLoadCount:', pageLoadCount);
    
    // 如果不是第一次触发 pageshow，说明是浏览器返回
    if (pageLoadCount > 1) {
        console.log('[DEBUG] 检测到浏览器返回，重新检查登录状态并渲染');
        checkAdminStatus().then(async () => {
            console.log('[DEBUG] 登录状态检查完成，重新渲染游戏列表');
            await Promise.all([loadFavorites(), loadPlayHistory()]);
            performSearch(searchInput.value);
        });
    }
});

// 监听 visibilitychange 事件（页面重新可见时）
document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
        console.log('[DEBUG] 页面重新可见，检查是否需要刷新');
        // 检查是否刚从其他页面返回
        const now = Date.now();
        const lastRender = window.lastRenderTime || 0;
        if (now - lastRender > 1000) { // 超过1秒，可能是从其他页面返回
            console.log('[DEBUG] 可能从其他页面返回，重新渲染');
            checkAdminStatus().then(async () => {
                await Promise.all([loadFavorites(), loadPlayHistory()]);
                performSearch(searchInput.value);
            });
        }
    }
});

// 设置事件监听
function setupEventListeners() {
    console.log('[DEBUG] 开始设置事件监听器');
    
    // ==================== 快速上传模式切换 ====================
    document.querySelectorAll('.mode-tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const mode = btn.dataset.mode;
            
            // 切换按钮样式
            document.querySelectorAll('.mode-tab-btn').forEach(b => {
                if (b.dataset.mode === mode) {
                    b.style.background = '#667eea';
                    b.style.color = 'white';
                    b.style.borderColor = '#667eea';
                } else {
                    b.style.background = 'white';
                    b.style.color = '#333';
                    b.style.borderColor = '#ddd';
                }
            });
            
            // 切换表单显示
            if (mode === 'quick') {
                document.getElementById('quickUploadForm').style.display = 'block';
                document.getElementById('uploadForm').style.display = 'none';
            } else {
                document.getElementById('quickUploadForm').style.display = 'none';
                document.getElementById('uploadForm').style.display = 'block';
            }
        });
    });

    // 快速上传 - 方式切换
    document.querySelectorAll('#quickUploadForm .tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            document.querySelectorAll('#quickUploadForm .tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const method = btn.dataset.method;
            
            document.getElementById('quickFolderUpload').style.display = method === 'folder' ? 'block' : 'none';
            document.getElementById('quickSingleSwfUpload').style.display = method === 'single' ? 'block' : 'none';
            document.getElementById('quickGameInfo').style.display = 'none';
        });
    });

    // 快速上传 - 文件夹选择
    const quickGameFiles = document.getElementById('quickGameFiles');
    if (quickGameFiles) {
        quickGameFiles.addEventListener('change', (e) => {
            const allFiles = Array.from(e.target.files);
            const gameFiles = filterGameFiles(allFiles);
            const swfFiles = filterSwfFiles(gameFiles);
            const fileList = document.getElementById('quickFileList');
            const gameInfo = document.getElementById('quickGameInfo');
            const gameName = document.getElementById('quickGameName');
            
            if (gameFiles.length === 0) {
                fileList.innerHTML = '<div style="color: #d32f2f; padding: 10px;">❌ 未找到支持的游戏文件</div>';
                gameInfo.style.display = 'none';
                return;
            }
            
            if (swfFiles.length === 0) {
                fileList.innerHTML = '<div style="color: #d32f2f; padding: 10px;">❌ 未找到 SWF 文件</div>';
                gameInfo.style.display = 'none';
                return;
            }
            
            // 获取文件夹名称
            const folderPath = gameFiles[0].webkitRelativePath || gameFiles[0].name;
            const folderName = folderPath.split('/')[0];
            
            fileList.innerHTML = `<div style="margin-top: 10px; padding: 10px; background: #e8f5e9; border: 2px solid #4caf50; border-radius: 6px; font-size: 13px;">
                <strong style="color: #2e7d32;">✓ 已选择 ${gameFiles.length} 个文件</strong> (${swfFiles.length} 个 SWF${allFiles.length > gameFiles.length ? `, 已过滤 ${allFiles.length - gameFiles.length} 个不支持的文件` : ''})<br>
                ${gameFiles.slice(0, 5).map(f => `• ${f.webkitRelativePath || f.name}`).join('<br>')}
                ${gameFiles.length > 5 ? `<br>... 还有 ${gameFiles.length - 5} 个文件` : ''}
            </div>`;
            
            gameName.textContent = `游戏名称：${folderName}`;
            gameInfo.style.display = 'block';
        });
    }

    // 快速上传 - 单个 SWF 选择
    const quickSingleSwf = document.getElementById('quickSingleSwf');
    if (quickSingleSwf) {
        quickSingleSwf.addEventListener('change', (e) => {
            const file = e.target.files[0];
            const fileInfo = document.getElementById('quickSingleSwfInfo');
            const gameInfo = document.getElementById('quickGameInfo');
            const gameName = document.getElementById('quickGameName');
            
            if (file) {
                const fileName = file.name.replace('.swf', '');
                fileInfo.innerHTML = `<div style="margin-top: 10px; padding: 10px; background: #e8f5e9; border: 2px solid #4caf50; border-radius: 6px; font-size: 13px;">
                    <strong style="color: #2e7d32;">✓ 已选择：${file.name}</strong><br>
                    大小：${formatFileSize(file.size)}
                </div>`;
                
                gameName.textContent = `游戏名称：${fileName}`;
                gameInfo.style.display = 'block';
            } else {
                fileInfo.innerHTML = '';
                gameInfo.style.display = 'none';
            }
        });
    }

    // 快速上传表单提交
    const quickUploadForm = document.getElementById('quickUploadForm');
    if (quickUploadForm) {
        quickUploadForm.addEventListener('submit', handleQuickUpload);
    }
    
    // ==================== 原有事件监听器 ====================
    
    // 搜索
    let searchTimeout;
    searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            console.log('[DEBUG] 搜索:', e.target.value);
            performSearch(e.target.value);
        }, 300);
    });

    // 排序
    const sortSelect = document.getElementById('sortSelect');
    sortSelect.addEventListener('change', () => {
        performSearch(searchInput.value);
    });

    // 最低评分筛选
    const ratingFilterSelect = document.getElementById('ratingFilterSelect');
    if (ratingFilterSelect) {
        ratingFilterSelect.addEventListener('change', () => {
            performSearch(searchInput.value);
        });
    }

    // 我的收藏筛选
    if (favoritesFilterBtn) {
        favoritesFilterBtn.addEventListener('click', () => {
            showFavoritesOnly = !showFavoritesOnly;
            favoritesFilterBtn.classList.toggle('active', showFavoritesOnly);
            updateFavoritesFilterButton();
            performSearch(searchInput.value);
        });
    }

    // 管理员按钮
    adminBtn.addEventListener('click', () => {
        console.log('[DEBUG] 管理员按钮点击, isAdmin:', isAdmin, 'isSuperAdmin:', isSuperAdmin);
        if (isAdmin) {
            if (isSuperAdmin) {
                showAdminMenu();
            } else {
                showUploadModal();
            }
        } else {
            showLoginModal();
        }
    });

    // 登录
    loginBtn.addEventListener('click', handleLogin);
    adminPassword.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleLogin();
    });
    adminUsername.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleLogin();
    });

    // 上传表单
    uploadForm.addEventListener('submit', handleUpload);

    // 编辑表单
    editForm.addEventListener('submit', handleEdit);

    // 上传方式切换 - 详细上传模式
    document.querySelectorAll('#uploadForm .tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            document.querySelectorAll('#uploadForm .tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            uploadMethod = btn.dataset.method;
            
            document.getElementById('folderUpload').style.display = 'none';
            document.getElementById('zipUpload').style.display = 'none';
            document.getElementById('singleSwfUpload').style.display = 'none';
            
            if (uploadMethod === 'folder') {
                document.getElementById('folderUpload').style.display = 'block';
            } else if (uploadMethod === 'zip') {
                document.getElementById('zipUpload').style.display = 'block';
            } else if (uploadMethod === 'single') {
                document.getElementById('singleSwfUpload').style.display = 'block';
            }
        });
    });

    // 编辑方式切换
    document.querySelectorAll('#editModal .tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            document.querySelectorAll('#editModal .tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            editMethod = btn.dataset.method;
            
            document.getElementById('editFolderUpload').style.display = 'none';
            document.getElementById('editZipUpload').style.display = 'none';
            document.getElementById('editSingleSwfUpload').style.display = 'none';
            
            if (editMethod === 'folder') {
                document.getElementById('editFolderUpload').style.display = 'block';
            } else if (editMethod === 'zip') {
                document.getElementById('editZipUpload').style.display = 'block';
            } else if (editMethod === 'single') {
                document.getElementById('editSingleSwfUpload').style.display = 'block';
            }
        });
    });

    // 文件选择显示
    const gameFilesInput = document.getElementById('gameFiles');
    if (gameFilesInput) {
        console.log('[DEBUG] 设置文件夹选择监听');
        gameFilesInput.addEventListener('change', (e) => {
            const fileList = document.getElementById('fileList');
            const allFiles = Array.from(e.target.files);
            const gameFiles = filterGameFiles(allFiles);
            const swfFiles = filterSwfFiles(gameFiles);
            
            console.log('[DEBUG] 选择了文件夹，总文件数:', allFiles.length, '游戏文件数:', gameFiles.length, 'SWF 文件数:', swfFiles.length);
            
            if (gameFiles.length > 0) {
                fileList.innerHTML = `<div style="margin-top: 10px; padding: 10px; background: #e8f5e9; border: 2px solid #4caf50; border-radius: 6px; font-size: 13px;">
                    <strong style="color: #2e7d32;">✓ 已选择 ${gameFiles.length} 个文件</strong> (${swfFiles.length} 个 SWF${allFiles.length > gameFiles.length ? `, 已过滤 ${allFiles.length - gameFiles.length} 个不支持的文件` : ''})<br>
                    ${gameFiles.slice(0, 10).map(f => `• ${f.webkitRelativePath || f.name}`).join('<br>')}
                    ${gameFiles.length > 10 ? `<br>... 还有 ${gameFiles.length - 10} 个文件` : ''}
                </div>`;
            } else {
                fileList.innerHTML = '<div style="color: #d32f2f; padding: 10px;">❌ 未找到支持的游戏文件</div>';
            }
        });
    } else {
        console.warn('[DEBUG] 未找到 gameFiles 元素');
    }

    const editGameFilesInput = document.getElementById('editGameFiles');
    if (editGameFilesInput) {
        editGameFilesInput.addEventListener('change', (e) => {
            const fileList = document.getElementById('editFileList');
            const allFiles = Array.from(e.target.files);
            const gameFiles = filterGameFiles(allFiles);
            const swfFiles = filterSwfFiles(gameFiles);
            
            console.log('[DEBUG] 编辑-选择了文件夹，总文件数:', allFiles.length, '游戏文件数:', gameFiles.length, 'SWF 文件数:', swfFiles.length);
            
            if (gameFiles.length > 0) {
                fileList.innerHTML = `<div style="margin-top: 10px; padding: 10px; background: #e8f5e9; border: 2px solid #4caf50; border-radius: 6px; font-size: 13px;">
                    <strong style="color: #2e7d32;">✓ 已选择 ${gameFiles.length} 个文件</strong> (${swfFiles.length} 个 SWF${allFiles.length > gameFiles.length ? `, 已过滤 ${allFiles.length - gameFiles.length} 个不支持的文件` : ''})<br>
                    ${gameFiles.slice(0, 10).map(f => `• ${f.webkitRelativePath || f.name}`).join('<br>')}
                    ${gameFiles.length > 10 ? `<br>... 还有 ${gameFiles.length - 10} 个文件` : ''}
                </div>`;
            } else {
                fileList.innerHTML = '<div style="color: #d32f2f; padding: 10px;">❌ 未找到支持的游戏文件</div>';
            }
        });
    }

    // 存档文件选择（上传）
    const saveFileInput = document.getElementById('saveFile');
    if (saveFileInput) {
        console.log('[DEBUG] 设置存档文件选择监听');
        saveFileInput.addEventListener('change', (e) => {
            const saveFileInfo = document.getElementById('saveFileInfo');
            const file = e.target.files[0];
            console.log('[DEBUG] 选择了存档文件:', file ? file.name : 'null');
            if (file) {
                saveFileInfo.innerHTML = `<div style="margin-top: 10px; padding: 10px; background: #e8f5e9; border: 2px solid #4caf50; border-radius: 6px; font-size: 13px;">
                    <strong style="color: #2e7d32;">✓ 已选择存档文件</strong><br>
                    文件名: ${file.name}<br>
                    大小: ${formatFileSize(file.size)}
                </div>`;
            } else {
                saveFileInfo.innerHTML = '';
            }
        });
    } else {
        console.warn('[DEBUG] 未找到 saveFile 元素');
    }

    // 存档文件选择（编辑）
    const editSaveFileInput = document.getElementById('editSaveFile');
    if (editSaveFileInput) {
        console.log('[DEBUG] 设置编辑存档文件选择监听');
        editSaveFileInput.addEventListener('change', (e) => {
            const editSaveFileInfo = document.getElementById('editSaveFileInfo');
            const file = e.target.files[0];
            console.log('[DEBUG] 编辑-选择了存档文件:', file ? file.name : 'null');
            if (file) {
                editSaveFileInfo.innerHTML = `<div style="margin-top: 10px; padding: 10px; background: #e8f5e9; border: 2px solid #4caf50; border-radius: 6px; font-size: 13px;">
                    <strong style="color: #2e7d32;">✓ 已选择存档文件</strong><br>
                    文件名: ${file.name}<br>
                    大小: ${formatFileSize(file.size)}
                </div>`;
            } else {
                editSaveFileInfo.innerHTML = '';
            }
        });
    } else {
        console.warn('[DEBUG] 未找到 editSaveFile 元素');
    }

    // 单个 SWF 文件选择（上传）
    const singleSwfInput = document.getElementById('singleSwf');
    if (singleSwfInput) {
        singleSwfInput.addEventListener('change', (e) => {
            const singleSwfInfo = document.getElementById('singleSwfInfo');
            const file = e.target.files[0];
            if (file) {
                singleSwfInfo.innerHTML = `<div style="margin-top: 10px; padding: 10px; background: #e8f5e9; border: 2px solid #4caf50; border-radius: 6px; font-size: 13px;">
                    <strong style="color: #2e7d32;">✓ 已选择 SWF 文件</strong><br>
                    文件名: ${file.name}<br>
                    大小: ${formatFileSize(file.size)}
                </div>`;
                // 自动填充主 SWF 文件名
                document.getElementById('entryFile').value = file.name;
            } else {
                singleSwfInfo.innerHTML = '';
            }
        });
    }

    // 单个 SWF 文件选择（编辑）
    const editSingleSwfInput = document.getElementById('editSingleSwf');
    if (editSingleSwfInput) {
        editSingleSwfInput.addEventListener('change', (e) => {
            const editSingleSwfInfo = document.getElementById('editSingleSwfInfo');
            const file = e.target.files[0];
            if (file) {
                editSingleSwfInfo.innerHTML = `<div style="margin-top: 10px; padding: 10px; background: #e8f5e9; border: 2px solid #4caf50; border-radius: 6px; font-size: 13px;">
                    <strong style="color: #2e7d32;">✓ 已选择 SWF 文件</strong><br>
                    文件名: ${file.name}<br>
                    大小: ${formatFileSize(file.size)}
                </div>`;
                // 自动填充主 SWF 文件名
                document.getElementById('editEntryFile').value = file.name;
            } else {
                editSingleSwfInfo.innerHTML = '';
            }
        });
    }

    // ZIP 文件选择（编辑）
    const editGameZipInput = document.getElementById('editGameZip');
    if (editGameZipInput) {
        editGameZipInput.addEventListener('change', async (e) => {
            const editZipInfo = document.getElementById('editZipInfo');
            const file = e.target.files[0];
            if (file) {
                editZipInfo.innerHTML = `<div style="margin-top: 10px; padding: 10px; background: #fff3cd; border: 2px solid #ffc107; border-radius: 6px; font-size: 13px;">
                    <strong style="color: #856404;">⏳ 正在分析 ZIP 文件...</strong>
                </div>`;
                
                try {
                    const zip = new JSZip();
                    const contents = await zip.loadAsync(file);
                    const fileCount = Object.keys(contents.files).filter(path => !contents.files[path].dir).length;
                    
                    editZipInfo.innerHTML = `<div style="margin-top: 10px; padding: 10px; background: #e8f5e9; border: 2px solid #4caf50; border-radius: 6px; font-size: 13px;">
                        <strong style="color: #2e7d32;">✓ 已选择 ZIP 文件</strong><br>
                        文件名: ${file.name}<br>
                        大小: ${formatFileSize(file.size)}<br>
                        包含: ${fileCount} 个文件
                    </div>`;
                } catch (error) {
                    editZipInfo.innerHTML = `<div style="margin-top: 10px; padding: 10px; background: #ffebee; border: 2px solid #f44336; border-radius: 6px; font-size: 13px;">
                        <strong style="color: #c62828;">✗ ZIP 文件无效</strong><br>
                        ${error.message}
                    </div>`;
                }
            } else {
                editZipInfo.innerHTML = '';
            }
        });
    }

    // ZIP 文件选择
    const gameZipInput = document.getElementById('gameZip');
    if (gameZipInput) {
        console.log('[DEBUG] 设置 ZIP 选择监听');
        gameZipInput.addEventListener('change', async (e) => {
            const zipInfo = document.getElementById('zipInfo');
            const file = e.target.files[0];
            console.log('[DEBUG] 选择了 ZIP 文件:', file ? file.name : 'null');
            if (file) {
                try {
                    console.log('[DEBUG] 开始解析 ZIP...');
                    const zip = new JSZip();
                    const contents = await zip.loadAsync(file);
                    const fileCount = Object.keys(contents.files).filter(name => !contents.files[name].dir).length;
                    console.log('[DEBUG] ZIP 包含文件数:', fileCount);
                    zipInfo.innerHTML = `<div style="margin-top: 10px; padding: 10px; background: #e8f5e9; border: 2px solid #4caf50; border-radius: 6px; font-size: 13px;">
                        <strong style="color: #2e7d32;">✓ 已选择 ZIP 文件</strong><br>
                        文件名: ${file.name}<br>
                        大小: ${formatFileSize(file.size)}<br>
                        包含 ${fileCount} 个文件
                    </div>`;
                } catch (error) {
                    console.error('[DEBUG] ZIP 解析失败:', error);
                    zipInfo.innerHTML = `<div style="margin-top: 10px; padding: 10px; background: #ffebee; border: 2px solid #f44336; border-radius: 6px; font-size: 13px; color: #c62828;">
                        ✗ ZIP 文件无效或已损坏: ${error.message}
                    </div>`;
                }
            } else {
                zipInfo.innerHTML = '';
            }
        });
    } else {
        console.warn('[DEBUG] 未找到 gameZip 元素');
    }

    // 关闭模态框
    document.querySelectorAll('.close').forEach(closeBtn => {
        closeBtn.addEventListener('click', () => {
            closeBtn.closest('.modal').classList.remove('active');
        });
    });

    // 点击模态框外部关闭
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            e.target.classList.remove('active');
        }
    });
    
    console.log('[DEBUG] 事件监听器设置完成');
}

// 检查管理员状态
async function checkAdminStatus() {
    adminToken = localStorage.getItem('adminToken');
    if (adminToken) {
        try {
            const response = await fetch('/api/auth/me', {
                headers: {
                    'Authorization': `Bearer ${adminToken}`
                }
            });
            
            if (response.ok) {
                currentUser = await response.json();
                isAdmin = true;
                isSuperAdmin = currentUser.role === 'super_admin';
                updateAdminUI();
            } else {
                // Token 无效，清除
                localStorage.removeItem('adminToken');
                adminToken = null;
                isAdmin = false;
                isSuperAdmin = false;
            }
        } catch (error) {
            console.error('检查登录状态失败:', error);
        }
    }
}

// 更新管理员 UI
function updateAdminUI() {
    console.log('[DEBUG] 更新UI - isAdmin:', isAdmin, 'isSuperAdmin:', isSuperAdmin, 'currentUser:', currentUser);
    
    if (isAdmin) {
        if (isSuperAdmin) {
            adminBtn.textContent = i18n.t('admin.panel') + ' ▼';
            adminBtn.classList.remove('btn-secondary');
            adminBtn.classList.add('btn-primary');
        } else {
            adminBtn.textContent = i18n.t('admin.uploadGame');
            adminBtn.classList.remove('btn-secondary');
            adminBtn.classList.add('btn-primary');
        }
        
        // 显示当前登录用户
        showCurrentUser();
    } else {
        adminBtn.textContent = i18n.t('nav.admin');
        adminBtn.classList.remove('btn-primary');
        adminBtn.classList.add('btn-secondary');
        hideCurrentUser();
    }
}

// 显示当前登录用户
function showCurrentUser() {
    let userDisplay = document.getElementById('currentUserDisplay');
    if (!userDisplay) {
        userDisplay = document.createElement('div');
        userDisplay.id = 'currentUserDisplay';
        userDisplay.className = 'current-user-display';
        document.querySelector('.header-actions').insertBefore(userDisplay, adminBtn);
    }
    
    const roleText = isSuperAdmin ? i18n.t('admin.superAdmin') : i18n.t('admin.normalAdmin');
    userDisplay.innerHTML = `
        <span class="user-role">${roleText}</span>
        <span class="user-name">${escapeHtml(currentUser.username)}</span>
        <button onclick="logout()" class="btn-logout">${i18n.t('nav.logout')}</button>
    `;
}

// 隐藏当前登录用户
function hideCurrentUser() {
    const userDisplay = document.getElementById('currentUserDisplay');
    if (userDisplay) {
        userDisplay.remove();
    }
}

// 显示管理员菜单（超级管理员）
function showAdminMenu() {
    const menu = document.createElement('div');
    menu.className = 'admin-menu';
    menu.innerHTML = `
        <div class="admin-menu-content">
            <button onclick="showUploadModal(); closeAdminMenu()">📤 ${i18n.t('admin.uploadGame')}</button>
            <button onclick="window.location.href='/analytics.html'; closeAdminMenu()">📊 ${i18n.t('admin.analytics')}</button>
            <button onclick="showAdminManagement(); closeAdminMenu()">👥 ${i18n.t('admin.manageAdmins')}</button>
            <button onclick="showSiteSettings(); closeAdminMenu()">⚙️ ${i18n.t('admin.siteSettings')}</button>
            <button onclick="logout()">🚪 ${i18n.t('nav.logout')}</button>
        </div>
    `;
    
    // 点击外部关闭
    menu.addEventListener('click', (e) => {
        if (e.target === menu) {
            closeAdminMenu();
        }
    });
    
    document.body.appendChild(menu);
    setTimeout(() => menu.classList.add('active'), 10);
}

function closeAdminMenu() {
    const menu = document.querySelector('.admin-menu');
    if (menu) {
        menu.classList.remove('active');
        setTimeout(() => menu.remove(), 300);
    }
}

// 显示网站设置界面
async function showSiteSettings() {
    try {
        const response = await fetch('/api/settings', {
            headers: {
                'Authorization': `Bearer ${adminToken}`
            }
        });
        
        if (!response.ok) {
            alert(i18n.t('settings.getFailed'));
            return;
        }
        
        const settings = await response.json();
        
        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.id = 'siteSettingsModal';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 600px;">
                <span class="close" onclick="closeSiteSettings()">&times;</span>
                <h2>⚙️ ${i18n.t('settings.title')}</h2>
                
                <div style="margin-bottom: 24px;">
                    <h3 style="margin-bottom: 16px; color: #667eea;">${i18n.t('settings.downloadLimit')}</h3>
                    
                    <div style="margin-bottom: 16px;">
                        <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                            <input type="checkbox" id="enableDownloadLimit" ${settings.enable_download_limit ? 'checked' : ''} 
                                   style="width: 20px; height: 20px; cursor: pointer;">
                            <span style="font-size: 15px; font-weight: 500;">${i18n.t('settings.enableDownloadLimit')}</span>
                        </label>
                        <p style="margin: 8px 0 0 28px; font-size: 13px; color: #666;">
                            ${i18n.t('settings.downloadLimitDesc')}
                        </p>
                    </div>
                    
                    <div style="margin-bottom: 16px;">
                        <label style="display: block; margin-bottom: 8px; font-size: 14px; font-weight: 500; color: #333;">
                            ${i18n.t('settings.maxDownloadSize')}
                        </label>
                        <input type="number" id="maxDownloadSize" 
                               value="${Math.round(settings.max_download_size / 1024 / 1024)}" 
                               min="1" max="5000"
                               style="width: 100%; padding: 12px 16px; border: 2px solid #e0e0e0; border-radius: 8px; font-size: 14px;">
                        <p style="margin: 8px 0 0 0; font-size: 13px; color: #666;">
                            ${i18n.t('settings.currentSize')}${formatFileSize(settings.max_download_size)}
                        </p>
                    </div>
                </div>
                
                <div style="margin-bottom: 24px;">
                    <h3 style="margin-bottom: 16px; color: #667eea;">${i18n.t('settings.accessControl')}</h3>
                    
                    <div style="margin-bottom: 16px;">
                        <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                            <input type="checkbox" id="enableRefererCheck" ${settings.enable_referer_check ? 'checked' : ''} 
                                   style="width: 20px; height: 20px; cursor: pointer;">
                            <span style="font-size: 15px; font-weight: 500;">${i18n.t('settings.enableRefererCheck')}</span>
                        </label>
                        <p style="margin: 8px 0 0 28px; font-size: 13px; color: #666;">
                            ${i18n.t('settings.refererCheckDesc')}
                        </p>
                    </div>
                    
                    <div style="margin-bottom: 16px; margin-left: 28px;">
                        <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                            <input type="checkbox" id="blockDirectAccess" ${settings.block_direct_access ? 'checked' : ''} 
                                   style="width: 20px; height: 20px; cursor: pointer;">
                            <span style="font-size: 14px; font-weight: 500;">${i18n.t('settings.blockDirectAccess')}</span>
                        </label>
                        <p style="margin: 8px 0 0 28px; font-size: 13px; color: #666;">
                            ${i18n.t('settings.blockDirectAccessDesc')}
                        </p>
                    </div>
                    
                    <div style="margin-bottom: 16px;">
                        <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                            <input type="checkbox" id="enableRateLimit" ${settings.enable_rate_limit ? 'checked' : ''} 
                                   style="width: 20px; height: 20px; cursor: pointer;">
                            <span style="font-size: 15px; font-weight: 500;">${i18n.t('settings.enableRateLimit')}</span>
                        </label>
                        <p style="margin: 8px 0 0 28px; font-size: 13px; color: #666;">
                            ${i18n.t('settings.rateLimitDesc')}
                        </p>
                    </div>
                    
                    <div style="margin-bottom: 16px;">
                        <label style="display: block; margin-bottom: 8px; font-size: 14px; font-weight: 500; color: #333;">
                            ${i18n.t('settings.rateLimitRequests')}
                        </label>
                        <input type="number" id="rateLimitRequests" 
                               value="${settings.rate_limit_requests || 100}" 
                               min="10" max="10000"
                               style="width: 100%; padding: 12px 16px; border: 2px solid #e0e0e0; border-radius: 8px; font-size: 14px;">
                        <p style="margin: 8px 0 0 0; font-size: 13px; color: #666;">
                            ${i18n.t('settings.rateLimitRequestsDesc')}
                        </p>
                    </div>
                </div>
                
                <div style="margin-bottom: 24px;">
                    <h3 style="margin-bottom: 16px; color: #667eea;">${i18n.t('settings.fileTypeLimit')}</h3>
                    
                    <div style="margin-bottom: 16px;">
                        <label style="display: block; margin-bottom: 8px; font-size: 14px; font-weight: 500; color: #333;">
                            ${i18n.t('settings.allowedExtensions')}
                        </label>
                        <textarea id="allowedExtensions" 
                                  rows="3"
                                  style="width: 100%; padding: 12px 16px; border: 2px solid #e0e0e0; border-radius: 8px; font-size: 14px; font-family: monospace; resize: vertical;"
                                  placeholder=".swf,.json,.xml,.txt,.png,.jpg">${settings.allowed_extensions || '.swf,.json,.xml,.txt,.png,.jpg,.jpeg,.gif,.bmp,.mp3,.wav,.ogg,.dat,.bin'}</textarea>
                        <p style="margin: 8px 0 0 0; font-size: 13px; color: #666;">
                            ${i18n.t('settings.allowedExtensionsDesc')}<br>
                            ${i18n.t('settings.allowedExtensionsNote')}
                        </p>
                    </div>
                </div>
                
                <div style="padding: 12px; background: #fff3cd; border-left: 4px solid #ffc107; border-radius: 4px; margin-bottom: 16px;">
                    <p style="margin: 0; font-size: 13px; color: #856404;">
                        💡 ${i18n.t('settings.tip')}
                    </p>
                </div>
                
                <button onclick="saveSiteSettings()" class="btn-primary" style="width: 100%;">
                    💾 ${i18n.t('settings.save')}
                </button>
            </div>
        `;
        
        document.body.appendChild(modal);
    } catch (error) {
        console.error('加载设置失败:', error);
        alert(i18n.t('settings.loadFailed'));
    }
}

function closeSiteSettings() {
    const modal = document.getElementById('siteSettingsModal');
    if (modal) {
        modal.classList.remove('active');
        setTimeout(() => modal.remove(), 300);
    }
}

async function saveSiteSettings() {
    const enableDownloadLimit = document.getElementById('enableDownloadLimit').checked;
    const maxSizeMB = parseInt(document.getElementById('maxDownloadSize').value);
    const enableRefererCheck = document.getElementById('enableRefererCheck').checked;
    const blockDirectAccess = document.getElementById('blockDirectAccess').checked;
    const enableRateLimit = document.getElementById('enableRateLimit').checked;
    const rateLimitRequests = parseInt(document.getElementById('rateLimitRequests').value);
    const allowedExtensions = document.getElementById('allowedExtensions').value.trim();
    
    if (isNaN(maxSizeMB) || maxSizeMB < 1) {
        alert(i18n.t('settings.invalidSize'));
        return;
    }
    
    if (isNaN(rateLimitRequests) || rateLimitRequests < 10) {
        alert(i18n.t('settings.invalidRateLimit'));
        return;
    }
    
    if (!allowedExtensions) {
        alert(i18n.t('settings.invalidExtensions'));
        return;
    }
    
    // 验证扩展名格式
    const extensions = allowedExtensions.split(',').map(ext => ext.trim()).filter(ext => ext);
    if (extensions.length === 0) {
        alert(i18n.t('settings.noExtensions'));
        return;
    }
    
    for (const ext of extensions) {
        if (!ext.startsWith('.')) {
            alert(`${i18n.t('settings.extensionFormatError')}${ext} ${i18n.t('settings.extensionFormatNote')}`);
            return;
        }
    }
    
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    
    try {
        const response = await fetch('/api/settings', {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${adminToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                enable_download_limit: enableDownloadLimit ? 1 : 0,
                max_download_size: maxSizeBytes,
                enable_referer_check: enableRefererCheck ? 1 : 0,
                block_direct_access: blockDirectAccess ? 1 : 0,
                enable_rate_limit: enableRateLimit ? 1 : 0,
                rate_limit_requests: rateLimitRequests,
                allowed_extensions: allowedExtensions
            })
        });
        
        if (response.ok) {
            alert(i18n.t('settings.saveSuccess'));
            // 重新加载允许的文件扩展名
            await loadAllowedExtensions();
            closeSiteSettings();
        } else {
            const error = await response.json();
            alert(i18n.t('settings.saveFailed') + ': ' + error.error);
        }
    } catch (error) {
        console.error('保存设置失败:', error);
        alert(i18n.t('settings.saveFailed'));
    }
}

// 退出登录
function logout() {
    if (confirm(i18n.t('logout.confirm'))) {
        // 先关闭管理员菜单
        closeAdminMenu();
        
        localStorage.removeItem('adminToken');
        adminToken = null;
        isAdmin = false;
        isSuperAdmin = false;
        currentUser = null;
        updateAdminUI();
        performSearch(searchInput.value);
        alert(i18n.t('logout.success'));
    }
}

// 显示管理员管理界面
async function showAdminManagement() {
    try {
        const response = await fetch('/api/admins', {
            headers: {
                'Authorization': `Bearer ${adminToken}`
            }
        });
        
        if (!response.ok) {
            alert(i18n.t('settings.getFailed'));
            return;
        }
        
        const admins = await response.json();
        
        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.id = 'adminManagementModal';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 800px;">
                <span class="close" onclick="closeAdminManagement()">&times;</span>
                <h2>${i18n.t('admin.manageAdmins')}</h2>
                
                <div style="margin-bottom: 24px;">
                    <button onclick="showAddAdminForm()" class="btn-primary">➕ ${i18n.t('admin.addAdmin')}</button>
                </div>
                
                <div id="addAdminForm" style="display: none; margin-bottom: 24px; padding: 16px; background: #f5f5f5; border-radius: 8px;">
                    <h3>${i18n.t('admin.addNew')}</h3>
                    <input type="text" id="newAdminUsername" placeholder="${i18n.t('admin.username.placeholder')}" style="margin-bottom: 8px;">
                    <input type="password" id="newAdminPassword" placeholder="${i18n.t('admin.password.placeholder')}" style="margin-bottom: 8px;">
                    <select id="newAdminRole" style="margin-bottom: 8px; padding: 12px 16px; border: 2px solid #e0e0e0; border-radius: 8px; width: 100%;">
                        <option value="admin">${i18n.t('admin.role.normal')}</option>
                        <option value="super_admin">${i18n.t('admin.role.super')}</option>
                    </select>
                    <div style="display: flex; gap: 8px;">
                        <button onclick="addAdmin()" class="btn-primary">${i18n.t('admin.confirmAdd')}</button>
                        <button onclick="hideAddAdminForm()" class="btn-secondary">${i18n.t('app.cancel')}</button>
                    </div>
                </div>
                
                <table class="admin-table">
                    <thead>
                        <tr>
                            <th>${i18n.t('admin.id')}</th>
                            <th>${i18n.t('admin.username')}</th>
                            <th>${i18n.t('admin.role')}</th>
                            <th>${i18n.t('admin.status')}</th>
                            <th>${i18n.t('admin.createdDate')}</th>
                            <th>${i18n.t('admin.lastLogin')}</th>
                            <th>${i18n.t('admin.actions')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${admins.map(admin => `
                            <tr>
                                <td>${admin.id}</td>
                                <td>${escapeHtml(admin.username)}</td>
                                <td>${admin.role === 'super_admin' ? i18n.t('admin.superAdmin') : i18n.t('admin.normalAdmin')}</td>
                                <td>${admin.is_banned ? `<span style="color: #f44336;">${i18n.t('admin.status.banned')}</span>` : `<span style="color: #4caf50;">${i18n.t('admin.status.normal')}</span>`}</td>
                                <td>${new Date(admin.created_date).toLocaleDateString(i18n.getLanguage())}</td>
                                <td>${admin.last_login ? new Date(admin.last_login).toLocaleString(i18n.getLanguage()) : i18n.t('admin.neverLogin')}</td>
                                <td>
                                    ${admin.id !== 1 ? `
                                        ${admin.is_banned ? 
                                            `<button onclick="toggleBanAdmin(${admin.id}, false)" class="btn-secondary" style="font-size: 12px; padding: 6px 12px;">${i18n.t('admin.unban')}</button>` :
                                            `<button onclick="toggleBanAdmin(${admin.id}, true)" class="btn-secondary" style="font-size: 12px; padding: 6px 12px;">${i18n.t('admin.ban')}</button>`
                                        }
                                        <button onclick="deleteAdmin(${admin.id})" class="btn-danger" style="font-size: 12px; padding: 6px 12px;">${i18n.t('app.delete')}</button>
                                    ` : '<span style="color: #999;">-</span>'}
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
        
        document.body.appendChild(modal);
    } catch (error) {
        console.error('加载管理员列表失败:', error);
        alert(i18n.t('settings.loadFailed'));
    }
}

function closeAdminManagement() {
    const modal = document.getElementById('adminManagementModal');
    if (modal) modal.remove();
}

function showAddAdminForm() {
    document.getElementById('addAdminForm').style.display = 'block';
}

function hideAddAdminForm() {
    document.getElementById('addAdminForm').style.display = 'none';
    document.getElementById('newAdminUsername').value = '';
    document.getElementById('newAdminPassword').value = '';
}

async function addAdmin() {
    const username = document.getElementById('newAdminUsername').value.trim();
    const password = document.getElementById('newAdminPassword').value;
    const role = document.getElementById('newAdminRole').value;
    
    if (!username || !password) {
        alert(i18n.t('admin.fillRequired'));
        return;
    }
    
    try {
        const response = await fetch('/api/admins', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${adminToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password, role })
        });
        
        if (response.ok) {
            alert(i18n.t('admin.addSuccess'));
            closeAdminManagement();
            showAdminManagement();
        } else {
            const error = await response.json();
            alert(i18n.t('admin.addFailed') + ': ' + error.error);
        }
    } catch (error) {
        console.error('添加管理员失败:', error);
        alert(i18n.t('admin.addFailed'));
    }
}

async function toggleBanAdmin(adminId, banned) {
    const action = banned ? i18n.t('admin.ban') : i18n.t('admin.unban');
    const confirmMsg = banned ? i18n.t('admin.banConfirm') : i18n.t('admin.unbanConfirm');
    if (!confirm(confirmMsg)) {
        return;
    }
    
    try {
        const response = await fetch(`/api/admins/${adminId}/ban`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${adminToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ banned })
        });
        
        if (response.ok) {
            const successMsg = banned ? i18n.t('admin.banSuccess') : i18n.t('admin.unbanSuccess');
            alert(successMsg);
            closeAdminManagement();
            showAdminManagement();
        } else {
            const failMsg = banned ? i18n.t('admin.banFailed') : i18n.t('admin.unbanFailed');
            alert(failMsg);
        }
    } catch (error) {
        console.error(`${action}失败:`, error);
        const failMsg = banned ? i18n.t('admin.banFailed') : i18n.t('admin.unbanFailed');
        alert(failMsg);
    }
}

async function deleteAdmin(adminId) {
    if (!confirm(i18n.t('game.deleteConfirm'))) {
        return;
    }
    
    try {
        const response = await fetch(`/api/admins/${adminId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${adminToken}`
            }
        });
        
        if (response.ok) {
            alert(i18n.t('game.deleteSuccess'));
            closeAdminManagement();
            showAdminManagement();
        } else {
            alert(i18n.t('game.deleteFailed'));
        }
    } catch (error) {
        console.error('删除失败:', error);
        alert(i18n.t('game.deleteFailed'));
    }
}

// 显示登录模态框
function showLoginModal() {
    loginModal.classList.add('active');
    adminUsername.value = '';
    adminPassword.value = '';
    adminUsername.focus();
}

// 显示上传模态框
function showUploadModal() {
    uploadModal.classList.add('active');
    
    // 重置两个表单
    uploadForm.reset();
    const quickUploadForm = document.getElementById('quickUploadForm');
    if (quickUploadForm) {
        quickUploadForm.reset();
    }
    
    // 重置到快速上传模式
    document.querySelectorAll('.mode-tab-btn').forEach(btn => {
        if (btn.dataset.mode === 'quick') {
            btn.style.background = '#667eea';
            btn.style.color = 'white';
            btn.style.borderColor = '#667eea';
        } else {
            btn.style.background = 'white';
            btn.style.color = '#333';
            btn.style.borderColor = '#ddd';
        }
    });
    
    // 显示快速上传，隐藏详细上传
    if (quickUploadForm) {
        quickUploadForm.style.display = 'block';
    }
    uploadForm.style.display = 'none';
    
    // 清空文件列表显示
    document.getElementById('quickFileList').innerHTML = '';
    document.getElementById('quickSingleSwfInfo').innerHTML = '';
    document.getElementById('quickGameInfo').style.display = 'none';
    document.getElementById('fileList').innerHTML = '';
    document.getElementById('zipInfo').innerHTML = '';
    document.getElementById('singleSwfInfo').innerHTML = '';
    
    // 重置上传方式到文件夹
    uploadMethod = 'folder';
}

// 处理登录
async function handleLogin() {
    const username = adminUsername.value.trim();
    const password = adminPassword.value.trim();
    
    if (!password) {
        alert(i18n.t('login.enterPassword'));
        return;
    }

    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                username: username || 'super_admin', // 如果没输入用户名，默认尝试超管
                password 
            })
        });

        if (response.ok) {
            const result = await response.json();
            adminToken = result.token;
            localStorage.setItem('adminToken', result.token);
            await checkAdminStatus(); // 重新检查状态
            loginModal.classList.remove('active');
            alert(i18n.t('login.success') + result.username);
            
            // 重新加载游戏列表以显示管理按钮
            console.log('[DEBUG] 登录成功，重新加载游戏列表');
            performSearch(searchInput.value);
        } else {
            const error = await response.json();
            alert(error.error || i18n.t('login.failed'));
        }
    } catch (error) {
        console.error('登录失败:', error);
        alert(i18n.t('login.retry'));
    }
}

// 允许的文件扩展名（从服务器获取）
let allowedExtensions = ['.swf', '.json', '.xml', '.txt', '.png', '.jpg', '.jpeg', '.gif', '.bmp', '.mp3', '.wav', '.ogg', '.dat', '.bin'];

// 初始化语言
function initLanguage() {
    const languageSelect = document.getElementById('languageSelect');
    if (languageSelect) {
        // 设置当前语言
        languageSelect.value = i18n.getLanguage();
        
        // 监听语言切换
        languageSelect.addEventListener('change', (e) => {
            i18n.setLanguage(e.target.value);
            i18n.translatePage();
            updateFavoritesFilterButton();
            // 重新渲染热门标签（更新 "🔥 热门标签" 文字）
            renderHotTags();
            // 重新渲染游戏列表（更新动态内容）
            performSearch(searchInput.value);
            // 如果有打开的模态框，重新渲染它们
            refreshOpenModals();
            // 更新用户显示区域
            if (isAdmin) {
                showCurrentUser();
            }
        });
    }
    
    // 翻译页面
    i18n.translatePage();
    updateFavoritesFilterButton();
}

// 刷新打开的模态框
function refreshOpenModals() {
    // 检查上传模态框是否打开
    if (uploadModal && uploadModal.classList.contains('active')) {
        // 不需要重新打开，只需要更新按钮文本
        updateModalButtons();
    }
    
    // 检查编辑模态框是否打开
    if (editModal && editModal.classList.contains('active')) {
        const gameId = document.getElementById('editGameId').value;
        if (gameId) {
            // 重新加载编辑模态框以更新语言
            editGame(parseInt(gameId));
        }
    }
    
    // 检查管理员管理模态框是否打开
    const adminManagementModal = document.getElementById('adminManagementModal');
    if (adminManagementModal) {
        showAdminManagement();
    }
    
    // 检查网站设置模态框是否打开
    const siteSettingsModal = document.getElementById('siteSettingsModal');
    if (siteSettingsModal) {
        showSiteSettings();
    }
}

// 更新模态框按钮文本（用于上传模态框）
function updateModalButtons() {
    // 更新模式切换按钮
    const modeTabs = document.querySelectorAll('.mode-tab-btn');
    modeTabs.forEach(btn => {
        if (btn.dataset.mode === 'quick') {
            btn.textContent = i18n.t('upload.quickUpload');
        } else if (btn.dataset.mode === 'detailed') {
            btn.textContent = i18n.t('upload.detailedUpload');
        }
    });
    
    // 更新上传方式按钮
    const uploadTabs = document.querySelectorAll('#uploadForm .tab-btn, #quickUploadForm .tab-btn');
    uploadTabs.forEach(btn => {
        const method = btn.dataset.method;
        if (method === 'folder') {
            btn.textContent = i18n.t('upload.selectFolder');
        } else if (method === 'zip') {
            btn.textContent = i18n.t('upload.selectZip');
        } else if (method === 'single') {
            btn.textContent = i18n.t('upload.selectFile');
        }
    });
}

// 获取允许的文件扩展名
async function loadAllowedExtensions() {
    try {
        const response = await fetch('/api/allowed-extensions');
        if (response.ok) {
            const data = await response.json();
            if (data.extensions) {
                allowedExtensions = data.extensions.split(',').map(ext => ext.trim());
                console.log('[DEBUG] 加载允许的文件扩展名:', allowedExtensions);
            }
        }
    } catch (error) {
        console.error('[DEBUG] 加载文件扩展名失败:', error);
    }
}

// 过滤允许的游戏文件类型
function filterGameFiles(files) {
    return Array.from(files).filter(file => {
        const fileName = file.name.toLowerCase();
        return allowedExtensions.some(ext => fileName.endsWith(ext));
    });
}

// 从文件列表中过滤出 SWF 文件（用于识别主文件）
function filterSwfFiles(files) {
    return Array.from(files).filter(file => {
        const fileName = file.name.toLowerCase();
        return fileName.endsWith('.swf');
    });
}

// 分片上传大文件
async function uploadLargeFile(folderName, filePath, file, uploadToken, progressCallback) {
    const CHUNK_SIZE = 50 * 1024 * 1024; // 50MB 每片
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
    
    console.log(`[分片上传] 文件: ${filePath}, 大小: ${formatFileSize(file.size)}, 分片数: ${totalChunks}`);
    
    try {
        // 1. 初始化分片上传
        const initResponse = await fetch('/api/upload/multipart/init', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${adminToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ folderName, filePath, uploadToken })
        });
        
        if (!initResponse.ok) {
            throw new Error('初始化分片上传失败');
        }
        
        const { uploadId, key } = await initResponse.json();
        console.log(`[分片上传] 初始化成功, uploadId: ${uploadId}`);
        
        // 2. 上传每个分片
        const parts = [];
        for (let i = 0; i < totalChunks; i++) {
            const start = i * CHUNK_SIZE;
            const end = Math.min(start + CHUNK_SIZE, file.size);
            const chunk = file.slice(start, end);
            const partNumber = i + 1;
            
            if (progressCallback) {
                progressCallback(i + 1, totalChunks);
            }
            
            console.log(`[分片上传] 上传分片 ${partNumber}/${totalChunks}, 大小: ${formatFileSize(chunk.size)}`);
            
            const formData = new FormData();
            formData.append('key', key);
            formData.append('uploadId', uploadId);
            formData.append('partNumber', partNumber);
            formData.append('chunk', chunk);
            formData.append('uploadToken', uploadToken);
            
            const partResponse = await fetch('/api/upload/multipart/part', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${adminToken}`
                },
                body: formData
            });
            
            if (!partResponse.ok) {
                throw new Error(`分片 ${partNumber} 上传失败`);
            }
            
            const partResult = await partResponse.json();
            parts.push({
                partNumber: partResult.partNumber,
                etag: partResult.etag
            });
        }
        
        // 3. 完成分片上传
        const completeResponse = await fetch('/api/upload/multipart/complete', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${adminToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ key, uploadId, parts, uploadToken })
        });
        
        if (!completeResponse.ok) {
            throw new Error('完成分片上传失败');
        }
        
        console.log(`[分片上传] 完成: ${filePath}`);
        return { success: true, key };
        
    } catch (error) {
        console.error(`[分片上传] 失败: ${filePath}`, error);
        throw error;
    }
}

// 快速上传处理
async function handleQuickUpload(e) {
    e.preventDefault();
    
    if (!isAdmin) {
        alert(i18n.t('admin.needPermission'));
        return;
    }

    const quickGameFiles = document.getElementById('quickGameFiles');
    const quickSingleSwf = document.getElementById('quickSingleSwf');
    const quickUploadBtn = document.getElementById('quickUploadBtn');
    
    let files = [];
    let gameName = '';
    let entryFile = '';
    
    // 判断上传方式
    if (quickGameFiles.files.length > 0) {
        // 文件夹上传 - 先过滤所有游戏文件
        const allGameFiles = filterGameFiles(quickGameFiles.files);
        if (allGameFiles.length === 0) {
            alert('文件夹中没有支持的游戏文件');
            return;
        }
        
        // 从游戏文件中提取 SWF 文件用于识别主文件
        const swfFiles = filterSwfFiles(allGameFiles);
        if (swfFiles.length === 0) {
            alert(i18n.t('upload.noSwf'));
            return;
        }
        
        // 使用所有游戏文件（包括资源文件）
        files = allGameFiles;
        
        // 获取文件夹名称作为游戏名
        const folderPath = files[0].webkitRelativePath || files[0].name;
        gameName = folderPath.split('/')[0];
        
        // 查找主 SWF 文件
        // 优先级：根目录的 game.swf > 根目录的 index.swf > 根目录的任意 swf > 子目录的 game.swf > 子目录的 index.swf > 第一个 swf
        const rootSwfFiles = swfFiles.filter(f => {
            const path = f.webkitRelativePath || f.name;
            const pathParts = path.split('/');
            return pathParts.length === 2; // 文件夹名/文件名，说明在根目录
        });
        
        const subDirSwfFiles = swfFiles.filter(f => {
            const path = f.webkitRelativePath || f.name;
            const pathParts = path.split('/');
            return pathParts.length > 2; // 在子目录中
        });
        
        let mainSwf = null;
        
        // 1. 优先查找根目录的 game.swf
        mainSwf = rootSwfFiles.find(f => (f.webkitRelativePath || f.name).toLowerCase().includes('game.swf'));
        
        // 2. 其次查找根目录的 index.swf
        if (!mainSwf) {
            mainSwf = rootSwfFiles.find(f => (f.webkitRelativePath || f.name).toLowerCase().includes('index.swf'));
        }
        
        // 3. 再查找根目录的任意 swf
        if (!mainSwf && rootSwfFiles.length > 0) {
            mainSwf = rootSwfFiles[0];
        }
        
        // 4. 查找子目录的 game.swf
        if (!mainSwf) {
            mainSwf = subDirSwfFiles.find(f => (f.webkitRelativePath || f.name).toLowerCase().includes('game.swf'));
        }
        
        // 5. 查找子目录的 index.swf
        if (!mainSwf) {
            mainSwf = subDirSwfFiles.find(f => (f.webkitRelativePath || f.name).toLowerCase().includes('index.swf'));
        }
        
        // 6. 使用第一个 swf
        if (!mainSwf) {
            mainSwf = files[0];
        }
        
        const relativePath = mainSwf.webkitRelativePath || mainSwf.name;
        entryFile = relativePath.substring(relativePath.indexOf('/') + 1) || mainSwf.name;
        
    } else if (quickSingleSwf.files.length > 0) {
        // 单个 SWF 上传
        const file = quickSingleSwf.files[0];
        if (!file.name.toLowerCase().endsWith('.swf')) {
            alert(i18n.t('upload.noSwf'));
            return;
        }
        
        files = [file];
        gameName = file.name.replace('.swf', '');
        entryFile = file.name;
    } else {
        alert(i18n.t('upload.noFiles'));
        return;
    }

    try {
        quickUploadBtn.disabled = true;
        quickUploadBtn.textContent = `⏳ ${i18n.t('upload.preparing')}`;

        // 1. 准备上传
        const prepareResponse = await fetch('/api/upload/prepare', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${adminToken}`
            },
            body: JSON.stringify({ fileCount: files.length })
        });

        if (!prepareResponse.ok) {
            throw new Error('准备上传失败');
        }

        const { folderName, uploadToken } = await prepareResponse.json();

        // 2. 上传文件（带容错机制）
        let uploadedCount = 0;
        let failedFiles = [];
        const maxFileSize = 95 * 1024 * 1024; // 95MB，小文件直接上传
        
        for (const file of files) {
            const relativePath = file.webkitRelativePath 
                ? file.webkitRelativePath.substring(file.webkitRelativePath.indexOf('/') + 1)
                : file.name;

            try {
                // 根据文件大小选择上传方式
                if (file.size > maxFileSize) {
                    // 使用分片上传
                    console.log(`[快速上传] 大文件，使用分片上传: ${relativePath}`);
                    await uploadLargeFile(folderName, relativePath, file, uploadToken, (current, total) => {
                        quickUploadBtn.textContent = `⏳ 上传中 (${uploadedCount}/${files.length}) - 分片 ${current}/${total}`;
                    });
                } else {
                    // 普通上传
                    const formData = new FormData();
                    formData.append('folderName', folderName);
                    formData.append('filePath', relativePath);
                    formData.append('file', file);
                    formData.append('uploadToken', uploadToken);

                    const uploadResponse = await fetch('/api/upload/file', {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${adminToken}`
                        },
                        body: formData
                    });

                    if (!uploadResponse.ok) {
                        const errorText = await uploadResponse.text();
                        console.error(`文件上传失败: ${relativePath}`, uploadResponse.status, errorText);
                        failedFiles.push({
                            path: relativePath,
                            reason: `HTTP ${uploadResponse.status}: ${uploadResponse.statusText}`
                        });
                        continue;
                    }
                }

                uploadedCount++;
                quickUploadBtn.textContent = `⏳ ${i18n.t('upload.uploadProgress')} (${uploadedCount}/${files.length})...`;
            } catch (error) {
                console.error(`文件上传异常: ${relativePath}`, error);
                failedFiles.push({
                    path: relativePath,
                    reason: error.message
                });
                continue;
            }
        }

        // 检查是否有文件成功上传
        if (uploadedCount === 0) {
            throw new Error(i18n.t('upload.allFilesFailed'));
        }

        // 3. 完成上传
        const totalSize = files.reduce((sum, file) => sum + file.size, 0);

        const completeResponse = await fetch('/api/upload/complete', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${adminToken}`
            },
            body: JSON.stringify({
                folderName,
                title: gameName,
                description: '',
                entryFile,
                fileSize: totalSize,
                uploadToken
            })
        });

        if (!completeResponse.ok) {
            throw new Error('完成上传失败');
        }

        // 显示上传结果
        let resultMessage = `✅ ${i18n.t('upload.uploadComplete')}\n${i18n.t('upload.successCount')} ${uploadedCount}/${files.length} ${i18n.t('upload.files')}`;
        
        if (failedFiles.length > 0) {
            resultMessage += `\n\n⚠️ ${i18n.t('upload.failedFiles')} (${failedFiles.length}):\n`;
            failedFiles.slice(0, 5).forEach(f => {
                resultMessage += `\n• ${f.path}\n  ${i18n.t('upload.reason')} ${f.reason}`;
            });
            if (failedFiles.length > 5) {
                resultMessage += `\n\n... ${i18n.t('upload.andMore')} ${failedFiles.length - 5} ${i18n.t('upload.moreFailed')}`;
            }
        }
        
        alert(resultMessage);
        uploadModal.classList.remove('active');
        quickUploadForm.reset();
        document.getElementById('quickFileList').innerHTML = '';
        document.getElementById('quickSingleSwfInfo').innerHTML = '';
        document.getElementById('quickGameInfo').style.display = 'none';
        performSearch(searchInput.value);

    } catch (error) {
        console.error('快速上传失败:', error);
        alert('上传失败: ' + error.message);
    } finally {
        quickUploadBtn.disabled = false;
        quickUploadBtn.textContent = '⚡ 快速上传';
    }
}

// 处理上传
async function handleUpload(e) {
    e.preventDefault();
    console.log('[DEBUG] 开始上传，uploadMethod:', uploadMethod);

    if (!isAdmin) {
        alert('需要管理员权限');
        return;
    }

    const titleInput = document.getElementById('gameTitle');
    const descriptionInput = document.getElementById('gameDescription');
    const entryFileInput = document.getElementById('entryFile');
    const thumbnailInput = document.getElementById('thumbnailFile');

    if (!titleInput || !entryFileInput) {
        alert('表单元素未找到，请刷新页面重试');
        return;
    }

    console.log('[DEBUG] 表单数据:', {
        title: titleInput.value,
        entryFile: entryFileInput.value
    });

    // 收集所有文件
    let filesToUpload = [];
    let totalSize = 0;

    // 根据上传方式处理文件
    if (uploadMethod === 'single') {
        console.log('[DEBUG] 使用单个 SWF 上传方式');
        const singleSwfInput = document.getElementById('singleSwf');
        const swfFile = singleSwfInput.files[0];
        if (!swfFile) {
            alert('请选择 SWF 文件');
            return;
        }

        console.log('[DEBUG] SWF 文件:', swfFile.name, swfFile.size);
        totalSize = swfFile.size;
        filesToUpload.push({
            path: swfFile.name,
            file: swfFile
        });
    } else if (uploadMethod === 'zip') {
        console.log('[DEBUG] 使用 ZIP 上传方式');
        const zipInput = document.getElementById('gameZip');
        const zipFile = zipInput.files[0];
        if (!zipFile) {
            alert('请选择 ZIP 文件');
            return;
        }

        console.log('[DEBUG] ZIP 文件:', zipFile.name, zipFile.size);

        try {
            console.log('[DEBUG] 开始解压 ZIP...');
            const zip = new JSZip();
            const contents = await zip.loadAsync(zipFile);
            
            // 检测是否所有文件都在同一个根文件夹下
            const allPaths = Object.keys(contents.files).filter(path => !contents.files[path].dir);
            let commonPrefix = '';
            if (allPaths.length > 0) {
                const firstPath = allPaths[0];
                const parts = firstPath.split('/');
                if (parts.length > 1) {
                    const potentialPrefix = parts[0] + '/';
                    if (allPaths.every(p => p.startsWith(potentialPrefix))) {
                        commonPrefix = potentialPrefix;
                        console.log('[DEBUG] 检测到公共前缀:', commonPrefix);
                    }
                }
            }
            
            let fileCount = 0;
            let swfCount = 0;
            const allowedExtensions = ['.swf', '.json', '.xml', '.txt', '.png', '.jpg', '.jpeg', '.gif', '.bmp', '.mp3', '.wav', '.ogg', '.dat', '.bin'];
            
            for (const [relativePath, zipEntry] of Object.entries(contents.files)) {
                if (!zipEntry.dir) {
                    const fileName = relativePath.toLowerCase();
                    
                    // 检查是否是支持的文件类型
                    const isAllowed = allowedExtensions.some(ext => fileName.endsWith(ext));
                    if (!isAllowed) {
                        console.log('[DEBUG] 跳过不支持的文件:', relativePath);
                        continue;
                    }
                    
                    // 统计 SWF 文件数量
                    if (fileName.endsWith('.swf')) {
                        swfCount++;
                    }
                    
                    let cleanPath = relativePath;
                    if (commonPrefix && relativePath.startsWith(commonPrefix)) {
                        cleanPath = relativePath.substring(commonPrefix.length);
                    }
                    
                    console.log('[DEBUG] 解压文件:', relativePath, '->', cleanPath);
                    const blob = await zipEntry.async('blob');
                    totalSize += blob.size;
                    filesToUpload.push({
                        path: cleanPath,
                        file: blob
                    });
                    fileCount++;
                }
            }
            
            if (swfCount === 0) {
                alert('ZIP 文件中没有 SWF 文件');
                return;
            }
            
            console.log('[DEBUG] 解压完成，共', fileCount, '个文件 (', swfCount, '个 SWF)，总大小:', formatFileSize(totalSize));
        } catch (error) {
            console.error('[DEBUG] ZIP 解压失败:', error);
            alert('ZIP 文件解压失败: ' + error.message);
            return;
        }
    } else {
        console.log('[DEBUG] 使用文件夹上传方式');
        const gameFilesInput = document.getElementById('gameFiles');
        const gameFiles = gameFilesInput.files;
        
        if (!gameFiles || gameFiles.length === 0) {
            alert('请选择游戏文件夹');
            return;
        }

        console.log('[DEBUG] 文件夹包含', gameFiles.length, '个文件');
        
        // 过滤保留支持的游戏文件
        const allowedFiles = filterGameFiles(gameFiles);
        if (allowedFiles.length === 0) {
            alert('文件夹中没有支持的游戏文件');
            return;
        }
        
        // 检查是否有 SWF 文件
        const swfFiles = filterSwfFiles(allowedFiles);
        if (swfFiles.length === 0) {
            alert('文件夹中没有 SWF 文件');
            return;
        }
        
        console.log('[DEBUG] 过滤后剩余', allowedFiles.length, '个文件 (', swfFiles.length, '个 SWF)');
        
        for (const file of allowedFiles) {
            totalSize += file.size;
            const relativePath = file.webkitRelativePath || file.name;
            const pathParts = relativePath.split('/');
            const cleanPath = pathParts.slice(1).join('/') || pathParts[0];
            console.log('[DEBUG] 添加文件:', cleanPath, formatFileSize(file.size));
            filesToUpload.push({
                path: cleanPath,
                file: file
            });
        }
        console.log('[DEBUG] 文件夹总大小:', formatFileSize(totalSize));
    }

    if (filesToUpload.length === 0) {
        alert('没有找到可上传的文件');
        return;
    }

    // 显示上传中提示
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;

    try {
        // 1. 准备上传
        console.log('[DEBUG] 准备上传...');
        submitBtn.textContent = i18n.t('upload.preparing');
        const prepareResponse = await fetch('/api/upload/prepare', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${adminToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ fileCount: filesToUpload.length })
        });

        if (!prepareResponse.ok) {
            throw new Error('准备上传失败');
        }

        const { folderName, uploadToken } = await prepareResponse.json();
        console.log('[DEBUG] 获得文件夹名:', folderName);

        // 2. 逐个上传文件（带容错机制）
        let uploadedSize = 0;
        let uploadedCount = 0;
        let failedFiles = [];
        const maxFileSize = 95 * 1024 * 1024; // 95MB
        
        for (let i = 0; i < filesToUpload.length; i++) {
            const { path, file } = filesToUpload[i];
            const progress = Math.round((i / filesToUpload.length) * 100);
            submitBtn.textContent = `${i18n.t('upload.uploadProgress')} ${progress}% (${i + 1}/${filesToUpload.length})`;
            
            console.log('[DEBUG] 上传文件', i + 1, '/', filesToUpload.length, ':', path);
            
            try {
                // 根据文件大小选择上传方式
                if (file.size > maxFileSize) {
                    // 使用分片上传
                    console.log(`[详细上传] 大文件，使用分片上传: ${path}`);
                    await uploadLargeFile(folderName, path, file, uploadToken, (current, total) => {
                        submitBtn.textContent = `上传中... ${progress}% (${i + 1}/${filesToUpload.length}) - 分片 ${current}/${total}`;
                    });
                } else {
                    // 普通上传
                    const fileFormData = new FormData();
                    fileFormData.append('folderName', folderName);
                    fileFormData.append('filePath', path);
                    fileFormData.append('file', file);
                    fileFormData.append('uploadToken', uploadToken);

                    const uploadResponse = await fetch('/api/upload/file', {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${adminToken}`
                        },
                        body: fileFormData
                    });

                    if (!uploadResponse.ok) {
                        const errorText = await uploadResponse.text();
                        console.error(`文件上传失败: ${path}`, uploadResponse.status, errorText);
                        failedFiles.push({
                            path: path,
                            reason: `HTTP ${uploadResponse.status}: ${uploadResponse.statusText}`
                        });
                        continue;
                    }
                }

                uploadedSize += file.size;
                uploadedCount++;
            } catch (error) {
                console.error(`文件上传异常: ${path}`, error);
                failedFiles.push({
                    path: path,
                    reason: error.message
                });
                continue;
            }
        }
        
        // 检查是否有文件成功上传
        if (uploadedCount === 0) {
            throw new Error(i18n.t('upload.allFilesFailed'));
        }

        // 3. 上传缩略图（如果有）
        let thumbnailKey = null;
        const thumbnail = thumbnailInput.files[0];
        if (thumbnail) {
            console.log('[DEBUG] 上传缩略图:', thumbnail.name);
            submitBtn.textContent = i18n.t('upload.uploadingThumbnail');
            
            const thumbFormData = new FormData();
            thumbFormData.append('folderName', folderName);
            thumbFormData.append('filePath', 'thumbnail.jpg');
            thumbFormData.append('file', thumbnail);
            thumbFormData.append('uploadToken', uploadToken);

            const thumbResponse = await fetch('/api/upload/file', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${adminToken}`
                },
                body: thumbFormData
            });

            if (thumbResponse.ok) {
                const result = await thumbResponse.json();
                thumbnailKey = result.key;
            }
        }

        // 4. 上传存档文件（如果有）
        let saveFileKey = null;
        const saveFile = document.getElementById('saveFile').files[0];
        const saveName = document.getElementById('saveName').value.trim();
        
        if (saveFile) {
            console.log('[DEBUG] 上传存档文件:', saveFile.name);
            submitBtn.textContent = i18n.t('upload.uploadingSave');
            
            const saveFormData = new FormData();
            saveFormData.append('folderName', folderName);
            saveFormData.append('filePath', 'save.sol');
            saveFormData.append('file', saveFile);
            saveFormData.append('uploadToken', uploadToken);

            const saveResponse = await fetch('/api/upload/file', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${adminToken}`
                },
                body: saveFormData
            });

            if (saveResponse.ok) {
                const result = await saveResponse.json();
                saveFileKey = result.key;
            }
        }

        // 5. 完成上传，保存游戏信息
        console.log('[DEBUG] 保存游戏信息...');
        submitBtn.textContent = i18n.t('upload.savingInfo');
        
        // 处理 tags
        const tagsInput = document.getElementById('gameTags').value;
        const tags = tagsInput ? tagsInput.split(',').map(t => t.trim()).filter(t => t) : [];
        
        const completeResponse = await fetch('/api/upload/complete', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${adminToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                folderName,
                title: titleInput.value,
                title2: document.getElementById('gameTitle2').value || null,
                title3: document.getElementById('gameTitle3').value || null,
                title4: document.getElementById('gameTitle4').value || null,
                description: descriptionInput.value,
                saveFileKey,
                saveName,
                entryFile: entryFileInput.value,
                fileSize: totalSize,
                thumbnailKey,
                tags,
                uploadToken
            })
        });

        if (!completeResponse.ok) {
            throw new Error('保存游戏信息失败');
        }

        const result = await completeResponse.json();
        console.log('[DEBUG] 上传成功:', result);
        
        // 显示上传结果
        let resultMessage = `✅ ${i18n.t('upload.uploadComplete')}\n${i18n.t('upload.successCount')} ${uploadedCount}/${filesToUpload.length} ${i18n.t('upload.files')}`;
        
        if (failedFiles.length > 0) {
            resultMessage += `\n\n⚠️ ${i18n.t('upload.failedFiles')} (${failedFiles.length}):\n`;
            failedFiles.slice(0, 5).forEach(f => {
                resultMessage += `\n• ${f.path}\n  ${i18n.t('upload.reason')} ${f.reason}`;
            });
            if (failedFiles.length > 5) {
                resultMessage += `\n\n... ${i18n.t('upload.andMore')} ${failedFiles.length - 5} ${i18n.t('upload.moreFailed')}`;
            }
        }
        
        alert(resultMessage);
        uploadModal.classList.remove('active');
        uploadForm.reset();
        document.getElementById('fileList').innerHTML = '';
        document.getElementById('zipInfo').innerHTML = '';
        loadTags(); // 重新加载 tags
        loadGames();
    } catch (error) {
        console.error('[DEBUG] 上传异常:', error);
        alert(i18n.t('upload.failed') + ': ' + error.message);
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
    }
}

// 加载所有 tags
async function loadTags() {
    try {
        const response = await fetch('/api/tags');
        allTags = await response.json();
        
        // 显示热门标签（前 10 个）
        renderHotTags();
    } catch (error) {
        console.error('加载 tags 失败:', error);
    }
}

// 渲染热门标签
function renderHotTags() {
    // 只有至少 3 个标签时才显示热门标签区域
    if (allTags.length < 3) {
        hotTags.style.display = 'none';
        return;
    }
    
    hotTags.style.display = 'block';
    
    // 显示前 12 个热门标签（按使用次数排序）
    const topTags = allTags.slice(0, 12);
    
    hotTags.innerHTML = `
        <div class="hot-tags-label">🔥 ${i18n.t('games.hotTags')}：</div>
        <div class="hot-tags-list">
            ${topTags.map(tag => `
                <button class="hot-tag-btn" onclick="searchByTag('${escapeHtml(tag.name)}')">
                    ${escapeHtml(tag.name)} <span class="tag-count">${tag.use_count}</span>
                </button>
            `).join('')}
        </div>
    `;
}

// 点击热门标签搜索
function searchByTag(tagName) {
    searchInput.value = `tag:${tagName}`;
    performSearch(searchInput.value);
}

// 解析搜索查询
function parseSearchQuery(query) {
    const result = {
        titleSearch: '',
        includeTags: [],
        excludeTags: []
    };
    
    if (!query) return result;
    
    // 匹配 tag:xxx 和 -tag:xxx
    const tagPattern = /(-)?tag:([^\s]+)/g;
    let match;
    let remainingQuery = query;
    
    while ((match = tagPattern.exec(query)) !== null) {
        const isExclude = match[1] === '-';
        const tagName = match[2].toLowerCase();
        
        if (isExclude) {
            result.excludeTags.push(tagName);
        } else {
            result.includeTags.push(tagName);
        }
        
        // 从查询中移除已匹配的标签
        remainingQuery = remainingQuery.replace(match[0], '');
    }
    
    // 剩余的作为标题搜索
    result.titleSearch = remainingQuery.trim();
    
    return result;
}

// 执行搜索
function performSearch(query) {
    const parsed = parseSearchQuery(query);
    console.log('[DEBUG] 解析搜索:', parsed);
    loadGames(parsed);
}

// 加载游戏列表
async function loadGames(searchParams = {}) {
    try {
        // 如果传入的是旧格式（字符串），转换为新格式
        if (typeof searchParams === 'string') {
            searchParams = { titleSearch: searchParams, includeTags: [], excludeTags: [] };
        }
        
        const { titleSearch = '', includeTags = [], excludeTags = [] } = searchParams;
        
        let url = '/api/games';
        const params = new URLSearchParams();
        
        if (titleSearch) params.append('search', titleSearch);
        if (includeTags.length > 0) params.append('tags', includeTags.join(','));
        if (excludeTags.length > 0) params.append('excludeTags', excludeTags.join(','));

        const ratingFilterSelect = document.getElementById('ratingFilterSelect');
        const minRating = ratingFilterSelect ? parseFloat(ratingFilterSelect.value || '0') : 0;
        if (Number.isFinite(minRating) && minRating > 0) {
            params.append('minRating', String(minRating));
        }
        
        if (params.toString()) url += '?' + params.toString();
        
        const response = await fetch(url, { cache: 'no-store' });
        let games = await response.json();

        // 应用排序
        const sortBy = document.getElementById('sortSelect').value;
        games = sortGames(games, sortBy);

        // “只看收藏”过滤（游客匿名收藏）
        if (showFavoritesOnly) {
            games = games.filter(game => favoriteGameIds.has(Number(game.id)));
        }

        if (games.length === 0) {
            gameGrid.innerHTML = '';
            const emptyText = showFavoritesOnly ? i18n.t('favorites.empty') : i18n.t('games.emptyState');
            const emptyParagraph = emptyState.querySelector('p');
            if (emptyParagraph) {
                emptyParagraph.textContent = emptyText;
            }
            emptyState.style.display = 'block';
            return;
        }

        emptyState.style.display = 'none';
        renderGames(games);
    } catch (error) {
        console.error('加载游戏失败:', error);
        gameGrid.innerHTML = '<p style="color: white;">加载失败，请刷新页面</p>';
    }
}

// 排序游戏列表
function sortGames(games, sortBy) {
    const sorted = [...games];
    
    switch (sortBy) {
        case 'date_desc':
            // 最新上传（默认，已经是这个顺序）
            sorted.sort((a, b) => new Date(b.upload_date) - new Date(a.upload_date));
            break;
        case 'date_asc':
            // 最早上传
            sorted.sort((a, b) => new Date(a.upload_date) - new Date(b.upload_date));
            break;
        case 'play_desc':
            // 播放最多
            sorted.sort((a, b) => (b.play_count || 0) - (a.play_count || 0));
            break;
        case 'title_asc':
            // 标题 A-Z
            sorted.sort((a, b) => a.title.localeCompare(b.title));
            break;
    }
    
    return sorted;
}

// 渲染游戏列表
function renderGames(games) {
    // 记录渲染时间
    window.lastRenderTime = Date.now();
    
    console.log('[DEBUG] 渲染游戏列表, isAdmin:', isAdmin, 'isSuperAdmin:', isSuperAdmin, '游戏数量:', games.length);
    
    gameGrid.innerHTML = games.map(game => {
        const adminButtons = isAdmin ? `
            <div style="display: flex; gap: 8px; margin-top: 12px;">
                <button class="btn-secondary" style="flex: 1;" 
                        onclick="event.stopPropagation(); editGame(${game.id})">
                    ${i18n.t('app.edit')}
                </button>
                <button class="btn-danger" style="flex: 1;" 
                        onclick="event.stopPropagation(); deleteGame(${game.id})">
                    ${i18n.t('app.delete')}
                </button>
            </div>
        ` : '';
        
        console.log(`[DEBUG] 游戏 ${game.id} - ${game.title}, 显示管理按钮: ${isAdmin}`);
        
        return `
            <div class="game-card" onclick="window.location.href='/game.html?id=${game.id}'">
                <button class="favorite-btn ${favoriteGameIds.has(Number(game.id)) ? 'active' : ''}"
                        data-favorite-btn="${game.id}"
                        onclick="toggleFavorite(event, ${game.id})"
                        title="${favoriteGameIds.has(Number(game.id)) ? i18n.t('favorites.remove') : i18n.t('favorites.add')}">
                    ${favoriteGameIds.has(Number(game.id)) ? '❤️' : '🤍'}
                </button>
                ${game.thumbnail_url 
                    ? `<img src="${game.thumbnail_url}" alt="${game.title}" class="game-thumbnail">`
                    : `<div class="game-thumbnail auto-cover" style="background:${coverGradient(game.id)}"><span>${escapeHtml(game.title)}</span></div>`
                }
                <div class="game-info">
                    <div class="game-title">${escapeHtml(game.title)}</div>
                    ${game.tags && game.tags.length > 0 ? `
                        <div class="game-tags">
                            ${game.tags.map(tag => `<span class="tag" onclick="event.stopPropagation(); filterByTag('${escapeHtml(tag.name)}')">${escapeHtml(tag.name)}</span>`).join('')}
                        </div>
                    ` : ''}
                    <div class="game-description">${escapeHtml(game.description || i18n.t('game.noDescription'))}</div>
                    <div class="game-meta">
                        ${game.rating_count > 0 ? `<span class="game-rating">★ ${Number(game.rating_avg).toFixed(1)} (${game.rating_count})</span>` : ''}
                        <span>🎮 ${game.play_count} ${i18n.t('games.plays')}</span>
                        <span>${formatFileSize(game.file_size)}</span>
                    </div>
                    ${adminButtons}
                </div>
            </div>
        `;
    }).join('');
}

// 按 tag 筛选
function filterByTag(tagName) {
    searchInput.value = `tag:${tagName}`;
    performSearch(searchInput.value);
}

// 播放游戏
async function playGame(gameId) {
    try {
        console.log('[DEBUG] 播放游戏 ID:', gameId);
        // 直接跳转到播放页面，通过 URL 参数传递游戏 ID
        window.open(`/play.html?id=${gameId}`, '_blank');
    } catch (error) {
        console.error('[DEBUG] 播放失败:', error);
        alert('播放失败，请重试');
    }
}

// 编辑游戏
async function editGame(gameId) {
    try {
        const response = await fetch(`/api/games/${gameId}`);
        const game = await response.json();

        document.getElementById('editGameId').value = game.id;
        document.getElementById('editFolderName').value = game.folder_name || '';
        document.getElementById('editGameTitle').value = game.title;
        document.getElementById('editGameTitle2').value = game.title2 || '';
        document.getElementById('editGameTitle3').value = game.title3 || '';
        document.getElementById('editGameTitle4').value = game.title4 || '';
        document.getElementById('editGameDescription').value = game.description || '';
        document.getElementById('editEntryFile').value = game.swf_filename;
        document.getElementById('editGameTags').value = '';
        document.getElementById('editSaveName').value = game.save_name || '';
        document.getElementById('editSaveName').placeholder = game.save_name ? `${i18n.t('edit.saveName.current')}${game.save_name}` : i18n.t('edit.saveName.placeholder');

        // 显示当前 tags
        const currentTagsDiv = document.getElementById('currentTags');
        if (game.tags && game.tags.length > 0) {
            currentTagsDiv.innerHTML = `<div style="margin: 10px 0; font-size: 13px; color: #666;">${i18n.t('tags.current')}</div>` +
                game.tags.map(tag => `
                    <span class="tag" style="display: inline-block; margin: 4px;">
                        ${escapeHtml(tag.name)}
                        <button onclick="removeTag(${game.id}, ${tag.id})" style="margin-left: 6px; background: none; border: none; color: #f44336; cursor: pointer; font-weight: bold;">×</button>
                    </span>
                `).join('');
        } else {
            currentTagsDiv.innerHTML = `<div style="margin: 10px 0; font-size: 13px; color: #999;">${i18n.t('tags.none')}</div>`;
        }

        editModal.classList.add('active');
    } catch (error) {
        console.error('加载游戏信息失败:', error);
        alert(i18n.t('edit.loadFailed'));
    }
}

// 删除 tag
async function removeTag(gameId, tagId) {
    if (!confirm(i18n.t('tags.removeConfirm'))) {
        return;
    }

    try {
        const response = await fetch(`/api/games/${gameId}/tags/${tagId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${adminToken}`
            }
        });

        if (response.ok) {
            // 重新加载游戏信息
            editGame(gameId);
            loadTags();
        } else {
            alert(i18n.t('tags.removeFailed'));
        }
    } catch (error) {
        console.error('删除 tag 失败:', error);
        alert(i18n.t('tags.removeFailed'));
    }
}

// 处理编辑
async function handleEdit(e) {
    e.preventDefault();

    if (!isAdmin) {
        alert(i18n.t('admin.needPermission'));
        return;
    }

    const gameId = document.getElementById('editGameId').value;
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    
    try {
        // 收集要上传的文件
        let filesToUpload = [];
        
        if (editMethod === 'single') {
            const singleSwfFile = document.getElementById('editSingleSwf').files[0];
            if (singleSwfFile) {
                filesToUpload.push({
                    path: singleSwfFile.name,
                    file: singleSwfFile
                });
            }
        } else if (editMethod === 'zip') {
            const zipFile = document.getElementById('editGameZip').files[0];
            if (zipFile) {
                submitBtn.textContent = '解压 ZIP...';
                try {
                    const zip = new JSZip();
                    const contents = await zip.loadAsync(zipFile);
                    
                    // 检测公共前缀
                    const allPaths = Object.keys(contents.files).filter(path => !contents.files[path].dir);
                    let commonPrefix = '';
                    if (allPaths.length > 0) {
                        const firstPath = allPaths[0];
                        const parts = firstPath.split('/');
                        if (parts.length > 1) {
                            const potentialPrefix = parts[0] + '/';
                            if (allPaths.every(p => p.startsWith(potentialPrefix))) {
                                commonPrefix = potentialPrefix;
                            }
                        }
                    }
                    
                    const allowedExtensions = ['.swf', '.json', '.xml', '.txt', '.png', '.jpg', '.jpeg', '.gif', '.bmp', '.mp3', '.wav', '.ogg', '.dat', '.bin'];
                    
                    for (const [relativePath, zipEntry] of Object.entries(contents.files)) {
                        if (!zipEntry.dir) {
                            const fileName = relativePath.toLowerCase();
                            
                            // 检查是否是支持的文件类型
                            const isAllowed = allowedExtensions.some(ext => fileName.endsWith(ext));
                            if (!isAllowed) {
                                continue;
                            }
                            
                            let cleanPath = relativePath;
                            if (commonPrefix && relativePath.startsWith(commonPrefix)) {
                                cleanPath = relativePath.substring(commonPrefix.length);
                            }
                            
                            const blob = await zipEntry.async('blob');
                            filesToUpload.push({
                                path: cleanPath,
                                file: blob
                            });
                        }
                    }
                } catch (error) {
                    alert(i18n.t('edit.unzipFailed') + ': ' + error.message);
                    submitBtn.textContent = originalText;
                    submitBtn.disabled = false;
                    return;
                }
            }
        } else {
            const gameFiles = document.getElementById('editGameFiles').files;
            if (gameFiles.length > 0) {
                // 过滤支持的游戏文件
                const allowedFiles = filterGameFiles(gameFiles);
                
                for (const file of allowedFiles) {
                    const relativePath = file.webkitRelativePath || file.name;
                    const pathParts = relativePath.split('/');
                    const cleanPath = pathParts.slice(1).join('/') || pathParts[0];
                    filesToUpload.push({
                        path: cleanPath,
                        file: file
                    });
                }
            }
        }
        
        // 如果有文件要上传，使用分步上传
        let newFolderName = null;
        let editUploadToken = null;
        let editUploadFolder = null;
        if (filesToUpload.length > 0) {
            submitBtn.textContent = i18n.t('upload.preparing');
            
            // 1. 准备上传
            const prepareResponse = await fetch('/api/upload/prepare', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${adminToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ fileCount: filesToUpload.length })
            });

            if (!prepareResponse.ok) {
                throw new Error('准备上传失败');
            }

            const { folderName, uploadToken } = await prepareResponse.json();
            newFolderName = folderName;
            editUploadToken = uploadToken;
            editUploadFolder = folderName;
            
            // 2. 逐个上传文件（带分片上传支持）
            let uploadedCount = 0;
            let failedFiles = [];
            const maxFileSize = 95 * 1024 * 1024; // 95MB
            
            for (let i = 0; i < filesToUpload.length; i++) {
                const { path, file } = filesToUpload[i];
                const progress = Math.round((i / filesToUpload.length) * 100);
                submitBtn.textContent = `上传中... ${progress}% (${i + 1}/${filesToUpload.length})`;
                
                try {
                    // 根据文件大小选择上传方式
                    if (file.size > maxFileSize) {
                        // 使用分片上传
                        console.log(`[编辑游戏] 大文件，使用分片上传: ${path}`);
                        await uploadLargeFile(folderName, path, file, uploadToken, (current, total) => {
                            submitBtn.textContent = `上传中... ${progress}% (${i + 1}/${filesToUpload.length}) - 分片 ${current}/${total}`;
                        });
                    } else {
                        // 普通上传
                        const fileFormData = new FormData();
                        fileFormData.append('folderName', folderName);
                        fileFormData.append('filePath', path);
                        fileFormData.append('file', file);
                        fileFormData.append('uploadToken', uploadToken);

                        const uploadResponse = await fetch('/api/upload/file', {
                            method: 'POST',
                            headers: {
                                'Authorization': `Bearer ${adminToken}`
                            },
                            body: fileFormData
                        });

                        if (!uploadResponse.ok) {
                            const errorText = await uploadResponse.text();
                            console.error(`文件上传失败: ${path}`, uploadResponse.status, errorText);
                            failedFiles.push({
                                path: path,
                                reason: `HTTP ${uploadResponse.status}: ${uploadResponse.statusText}`
                            });
                            continue;
                        }
                    }
                    
                    uploadedCount++;
                } catch (error) {
                    console.error(`文件上传异常: ${path}`, error);
                    failedFiles.push({
                        path: path,
                        reason: error.message
                    });
                    continue;
                }
            }
            
            // 检查是否有文件成功上传
            if (uploadedCount === 0) {
                throw new Error(i18n.t('edit.allFilesFailed'));
            }
            
            // 如果有失败的文件，显示警告
            if (failedFiles.length > 0) {
                let warningMsg = `⚠️ ${i18n.t('edit.partialFailed')} (${failedFiles.length}):\n`;
                failedFiles.slice(0, 3).forEach(f => {
                    warningMsg += `\n• ${f.path}\n  ${f.reason}`;
                });
                if (failedFiles.length > 3) {
                    warningMsg += `\n\n... ${i18n.t('upload.andMore')} ${failedFiles.length - 3} ${i18n.t('upload.moreFailed')}`;
                }
                console.warn(warningMsg);
            }
        }
        
        // 3. 上传缩略图（如果有）
        const thumbnail = document.getElementById('editThumbnailFile').files[0];
        const saveFile = document.getElementById('editSaveFile').files[0];
        let thumbnailKey = null;
        let saveFileKey = null;

        // 如果没有替换游戏文件、只替换缩略图/存档，需要为现有文件夹单独申请上传令牌
        if ((thumbnail || saveFile) && !editUploadToken) {
            const existingFolder = document.getElementById('editFolderName')?.value || '';
            if (!existingFolder) {
                throw new Error('无法确定游戏文件夹，请重新打开编辑窗口');
            }

            submitBtn.textContent = i18n.t('upload.preparing');
            const attachPrepareResponse = await fetch('/api/upload/prepare', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${adminToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ fileCount: 1, folderName: existingFolder })
            });

            if (!attachPrepareResponse.ok) {
                throw new Error('准备上传失败');
            }

            const attachPrepare = await attachPrepareResponse.json();
            editUploadToken = attachPrepare.uploadToken;
            editUploadFolder = attachPrepare.folderName;
        }

        if (thumbnail) {
            submitBtn.textContent = i18n.t('upload.uploadingThumbnail');
            
            const folderForThumb = newFolderName || editUploadFolder;
            
            const thumbFormData = new FormData();
            thumbFormData.append('folderName', folderForThumb);
            thumbFormData.append('filePath', 'thumbnail.jpg');
            thumbFormData.append('file', thumbnail);
            thumbFormData.append('uploadToken', editUploadToken);

            const thumbResponse = await fetch('/api/upload/file', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${adminToken}`
                },
                body: thumbFormData
            });

            if (thumbResponse.ok) {
                const result = await thumbResponse.json();
                thumbnailKey = result.key;
            }
        }
        
        // 4. 上传存档文件（如果有）
        if (saveFile) {
            submitBtn.textContent = i18n.t('upload.uploadingSave');
            
            const folderForSave = newFolderName || editUploadFolder;
            
            const saveFormData = new FormData();
            saveFormData.append('folderName', folderForSave);
            saveFormData.append('filePath', 'save.sol');
            saveFormData.append('file', saveFile);
            saveFormData.append('uploadToken', editUploadToken);

            const saveResponse = await fetch('/api/upload/file', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${adminToken}`
                },
                body: saveFormData
            });

            if (saveResponse.ok) {
                const result = await saveResponse.json();
                saveFileKey = result.key;
            }
        }
        
        // 5. 更新游戏信息
        submitBtn.textContent = i18n.t('edit.updatingInfo');
        
        const updateData = {
            title: document.getElementById('editGameTitle').value,
            title2: document.getElementById('editGameTitle2').value,
            title3: document.getElementById('editGameTitle3').value,
            title4: document.getElementById('editGameTitle4').value,
            description: document.getElementById('editGameDescription').value,
            entryFile: document.getElementById('editEntryFile').value
        };
        
        // 如果有新文件夹，更新文件夹名
        if (newFolderName) {
            updateData.folderName = newFolderName;
        }
        
        // 如果有新缩略图
        if (thumbnailKey) {
            updateData.thumbnailKey = thumbnailKey;
        }
        
        // 如果有新存档
        if (saveFileKey) {
            updateData.saveFileKey = saveFileKey;
        }
        
        const saveName = document.getElementById('editSaveName').value.trim();
        // 总是发送 saveName，即使为空（用于清除旧值）
        updateData.saveName = saveName || null;
        
        const response = await fetch(`/api/games/${gameId}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${adminToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updateData)
        });

        if (!response.ok) {
            const contentType = response.headers.get('content-type');
            let errorMsg = '更新失败';
            
            if (contentType && contentType.includes('application/json')) {
                const error = await response.json();
                errorMsg = error.error || errorMsg;
            } else {
                const text = await response.text();
                console.error('服务器返回非 JSON 响应:', text.substring(0, 500));
                errorMsg = `服务器错误 (${response.status})`;
            }
            
            throw new Error(errorMsg);
        }
        
        // 6. 添加新 tags（如果有）
        const tagsInput = document.getElementById('editGameTags').value;
        if (tagsInput) {
            submitBtn.textContent = i18n.t('edit.updatingTags');
            const tags = tagsInput.split(',').map(t => t.trim()).filter(t => t);
            if (tags.length > 0) {
                await fetch(`/api/games/${gameId}/tags`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${adminToken}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ tags })
                });
            }
        }

        alert(i18n.t('edit.updateSuccess'));
        editModal.classList.remove('active');
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
        loadTags();
        loadGames();
    } catch (error) {
        console.error('修改失败:', error);
        alert(i18n.t('edit.updateFailed') + ': ' + error.message);
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
}

// 删除游戏
async function deleteGame(gameId) {
    if (!confirm(i18n.t('game.deleteConfirm'))) {
        return;
    }

    try {
        const response = await fetch(`/api/games/${gameId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${adminToken}`
            }
        });

        if (response.ok) {
            alert(i18n.t('game.deleteSuccess'));
            loadTags();
            loadGames();
        } else {
            alert(i18n.t('game.deleteFailed'));
        }
    } catch (error) {
        console.error('删除失败:', error);
        alert(i18n.t('game.deleteFailed'));
    }
}

// 工具函数
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatFileSize(bytes) {
    if (!bytes) return i18n.t('fileSize.unknown');
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
}
