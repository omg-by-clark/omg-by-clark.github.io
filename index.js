/* index.js */
let currentPage = 0;
const PAGE_SIZE = 15;
let globalUserMap = {};
let isFetching = false;
let hasMore = true;
let observer;

// 新增的搜索全局变量
const keywords = [
    '#学校 School',
    '#老师 Teachers',
    '#作业 Homework',
    '#家人 Family',
    '#避雷 Avoid',
    '#奸商 Scammer',
    '#编程 Coding',
    '#上课 Class',
    '#旅游 Travel',
    '#奇葩 Weird',
    '#食物 Food',
    '#生活 Life',
    '#宠物 Pets',
    '#科技 Tech',
    '#娱乐 Fun',
    '#体育 Sport',
    '#其他 Others'
];
let currentSearchKeywords = [];
let currentSearchText = '';
let searchTimeout = null;
let currentSearchId = 0; // 用于避免搜索频率过快导致的数据请求冲突

/* initSearch
用途：初始化搜索模块。
用法：初始化搜索框的事件监听，包括输入检测和点击外部关闭下拉框。
原理：监听 input 事件，如果是 # 开头则展示关键词列表；否则执行防抖的文本搜索。
*/
function initSearch() {
    const searchInput = document.getElementById('searchInput');
    const keywordDropdown = document.getElementById('keywordDropdown');

    searchInput.addEventListener('input', (e) => {
        const val = e.target.value;
        if (val.startsWith('#')) {
            const filterText = val.toLowerCase();
            const matcheds = keywords.filter(t => t.toLowerCase().includes(filterText));
            renderKeywordDropdown(matcheds);
        } else {
            keywordDropdown.classList.remove('visible');
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                currentSearchText = val.trim();
                triggerSearch();
            }, 500); // 防抖：停止输入500毫秒后触发查询
        }
    });

    // 点击外部隐藏下拉框
    document.addEventListener('click', (e) => {
        if (!document.querySelector('.search-container').contains(e.target)) {
            keywordDropdown.classList.remove('visible');
        }
    });
}

/* renderKeywordDropdown
用途：渲染搜索下拉提示。
用法：渲染并显示下拉的关键词选项。
原理：接收匹配的关键词数组，生成对应的 div 列表并注入到 keywordDropdown 容器中。
*/
function renderKeywordDropdown(tags) {
    const keywordDropdown = document.getElementById('keywordDropdown');
    if (tags.length === 0) {
        keywordDropdown.classList.remove('visible');
        return;
    }
    keywordDropdown.innerHTML = tags.map(tag =>
        `<div class="tag-dropdown-item" onclick="addSearchKeyword('${tag}')">${tag}</div>`
    ).join('');
    keywordDropdown.classList.add('visible');
}

/* addSearchKeyword
用途：添加筛选标签。
用法：将用户点击的关键词加入到筛选列表，并触发重新搜索。
原理：将选中的关键词压入 currentSearchKeywords 数组，清空输入框，隐藏下拉列表并调用 triggerSearch。
*/
function addSearchKeyword(keyword) {
    if (!currentSearchKeywords.includes(keyword)) {
        currentSearchKeywords.push(keyword);
        updateSelectedKeywordsUI();
        triggerSearch();
    }
    document.getElementById('searchInput').value = '';
    document.getElementById('keywordDropdown').classList.remove('visible');
    document.getElementById('searchInput').focus();
}

/* removeSearchKeyword
用途：移除筛选标签。
用法：从已选关键词列表中移除某个关键词，并触发重新搜索。
原理：过滤掉被点击的关键词，更新 UI 并调用 triggerSearch。
*/
function removeSearchKeyword(keyword) {
    currentSearchKeywords = currentSearchKeywords.filter(t => t !== keyword);
    updateSelectedKeywordsUI();
    triggerSearch();
}

/* updateSelectedKeywordsUI
用途：更新已选标签视图。
用法：更新搜索框下方的已选关键词气泡显示。
原理：遍历 currentSearchKeywords，渲染带有删除图标的 HTML 并插入容器。
*/
function updateSelectedKeywordsUI() {
    const selectedKeywordsDiv = document.getElementById('selectedKeywords');
    selectedKeywordsDiv.innerHTML = currentSearchKeywords.map(keyword =>
        `<div class="selected-keyword-chip">${keyword} <span onclick="removeSearchKeyword('${keyword}')">×</span></div>`
    ).join('');
}

/* triggerSearch
用途：触发列表检索。
用法：重置所有分页状态并清空当前列表，以新的搜索条件重新加载帖子。
原理：将 currentPage 置 0，设 hasMore 为 true，恢复加载动画的显示状态，最后调用 loadNextPage。
*/
function triggerSearch() {
    currentPage = 0;
    hasMore = true;
    document.getElementById('list-all').innerHTML = '';
    document.getElementById('end-message').style.display = 'none';
    document.getElementById('scroll-sentinel').style.display = 'flex';
    currentSearchId++; // 让仍在进行中的旧请求失效
    isFetching = false;
    loadNextPage();
}

/* escapeHTML
用途：安全处理字符串。
用法：将用户输入的字符串转换为安全的 HTML 代码，避免网页执行恶意代码。
原理：创建一个内存中的 div 元素，将文本设为 textContent，然后读取 innerHTML，由浏览器原生完成转义。
*/
function escapeHTML(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

/* getNicknameStyle
用途：个性化用户名展示。
用法：根据数据库中用户的库存物品（inventory）返回对应的专属昵称 CSS 样式。
原理：判断 inventory 中的特定道具 ID 及过期时间，返回预设的内联 CSS 字符串（如渐变色或特定文字发光）。
*/
function getNicknameStyle(inventory) {
    if (!inventory) return '';
    const now = new Date();
    if (inventory['100'] && new Date(inventory['100']) > now) return 'background: linear-gradient(to right, #d20f39, #fe640b, #df8e1d, #40a02b, #04a5e5, #8839ef); -webkit-background-clip: text; color: transparent; font-weight: bold;';
    if (inventory['101'] && new Date(inventory['101']) > now) return 'color: #04a5e5; font-weight: bold;';
    if (inventory['102'] && new Date(inventory['102']) > now) return 'color: #ffa600; text-shadow: 0 0 5px rgba(255, 215, 0, 0.5); font-weight: bold;';
    return '';
}

/* updateLanguage
用途：前端国际化显示。
用法：根据本地浏览器存储（localStorage）中的语言偏好动态切换网页显示语言。
原理：遍历带有 data-zh 或 data-en 属性的 DOM 元素，根据当前选定的语言标识替换其 innerText。
*/
function updateLanguage() {
    const lang = localStorage.getItem('lang') || 'zh';
    document.querySelectorAll('[data-zh]').forEach(el => {
        el.innerText = (lang === 'zh') ? el.getAttribute('data-zh') : el.getAttribute('data-en');
    });
}

/* goRandom
用途：随机阅读功能。
用法：触发时计算并随机跳转到数据库中的某一篇吐槽帖子。
原理：先查询 posts 表获取总行数，生成随机索引，再利用 range 方法查出对应行的 ID，最后拼接 URL 跳转。
*/
async function goRandom() {
    if (isFetching) return;
    isFetching = true;
    try {
        const { count, error: countErr } = await _supabase.from('posts').select('*', { count: 'exact', head: true });
        if (countErr) throw countErr;
        let noPostsMessage = localStorage.getItem("lang") === 'zh' ? "广场还是空荡荡的..." : "The square is still empty...";
        if (count === 0) return alert(noPostsMessage);
        const fetchUntilFound = async () => {
            const randomIndex = Math.floor(Math.random() * count);
            const { data, error } = await _supabase.from('posts').select('id').range(randomIndex, randomIndex).maybeSingle();
            if (!data || error) return await fetchUntilFound();
            return data.id;
        };
        const validId = await fetchUntilFound();
        location.href = `content.html?id=${validId}`;
    } catch (error) {
        let errCode = localStorage.getItem("lang") === 'zh' ? `随机失败，原因: ${error}` : `Random failure. Reason: ${error}`;
        alert(errCode);
        console.error("[随机失败]", error);
    } finally {
        isFetching = false;
    }
}

/* handleVote
用途：点赞与点踩交互。
用法：处理用户在前端界面点击帖子的“赞”或“踩”按钮的具体逻辑。
原理：读取 localStorage 判断是否已操作，计算新的赞踩数量并更新 UI 类名，最后通过 Supabase API 更新后端。
*/
async function handleVote(event, postId, type) {
    event.stopPropagation();
    const card = event.currentTarget.closest('.card');
    const votePill = card.querySelector('.vote-pill');
    const likeBtn = card.querySelector('.like-btn');
    const dislikeBtn = card.querySelector('.dislike-btn');
    const likeSpan = likeBtn.querySelector('.count');
    const dislikeSpan = dislikeBtn.querySelector('.count');

    let likedPosts = JSON.parse(localStorage.getItem('likedPosts') || '[]');
    let dislikedPosts = JSON.parse(localStorage.getItem('dislikedPosts') || '[]');

    let likes = parseInt(likeSpan.innerText);
    let dislike = parseInt(dislikeSpan.innerText);

    if (type === 'like') {
        if (likedPosts.includes(postId)) {
            likes--;
            likedPosts = likedPosts.filter(id => id !== postId);
            votePill.classList.remove('is-liked');
        } else {
            likes++;
            likedPosts.push(postId);
            votePill.classList.add('is-liked');
            if (dislikedPosts.includes(postId)) {
                dislike--;
                dislikedPosts = dislikedPosts.filter(id => id !== postId);
                votePill.classList.remove('is-disliked');
                dislikeSpan.innerText = dislike;
            }
        }
        likeSpan.innerText = likes;
    } else {
        if (dislikedPosts.includes(postId)) {
            dislike--;
            dislikedPosts = dislikedPosts.filter(id => id !== postId);
            votePill.classList.remove('is-disliked');
        } else {
            dislike++;
            dislikedPosts.push(postId);
            votePill.classList.add('is-disliked');
            if (likedPosts.includes(postId)) {
                likes--;
                likedPosts = likedPosts.filter(id => id !== postId);
                votePill.classList.remove('is-liked');
                likeSpan.innerText = likes;
            }
        }
        dislikeSpan.innerText = dislike;
    }

    localStorage.setItem('likedPosts', JSON.stringify(likedPosts));
    localStorage.setItem('dislikedPosts', JSON.stringify(dislikedPosts));

    try {
        await _supabase.from('posts').update({ likes, dislike }).eq('id', postId);
    } catch (err) {
        console.error("同步失败", err);
    }
}

/* toggleNSFW
用途：敏感内容控制。
用法：在用户点击特定的 NSFW 关键词时，切换对应帖子的模糊显示状态。
原理：获取帖子内容容器，通过 classList 增加或移除 blur-content 和 revealed-content 类，实现 CSS 滤镜切换。
*/
function toggleNSFW(event, element) {
    event.stopPropagation();
    const card = element.closest('.card');
    const contentArea = card.querySelector('.post-body');
    const isBlurry = contentArea.classList.contains('blur-content');

    if (isBlurry) {
        contentArea.classList.remove('blur-content');
        contentArea.classList.add('revealed-content');
        element.classList.remove('nsfw-keyword');
    } else {
        contentArea.classList.add('blur-content');
        contentArea.classList.remove('revealed-content');
        element.classList.add('nsfw-keyword');
    }
}

/* createCardHTML
用途：帖子卡片组件渲染。
用法：将从数据库抓取的单条帖子 JSON 数据，转换成可在页面上直接渲染的 HTML 结构。
原理：拼接作者信息、点赞状态、关键词标签和正文的 HTML 字符串，并包含跳转至对应 user.html 详情页的点击事件。
*/
function createCardHTML(postData, userMap) {
    const author = userMap ? userMap[postData.nickname] : null;
    const userLevel = getLevelInfo(author ? author.points : 0);
    const nickStyle = getNicknameStyle(author ? author.inventory : null);
    const likedPosts = JSON.parse(localStorage.getItem('likedPosts') || '[]');
    const dislikedPosts = JSON.parse(localStorage.getItem('dislikedPosts') || '[]');

    const hasNSFW = postData.keywords && postData.keywords.includes('#NSFW');

    let kwHtml = '';
    if (postData.keywords && postData.keywords.length > 0) {
        const kwItems = postData.keywords.map(kw => {
            if (kw === '#NSFW') {
                return `<span class="nsfw-keyword" onclick="toggleNSFW(event, this)">${kw}</span>`;
            }
            if (kw === '#疑似搬运 Suspected Repost' || kw === '#搬运 Reposted') {
                return `<span class="repost-keyword">${kw}</span>`;
            }
            return `<span>${kw}</span>`;
        });
        kwHtml = `<span class="kw-display">关键词 Keyword(s)：${kwItems.join('&nbsp;&nbsp;&nbsp;')}</span>`;
    }

    let pillClass = 'vote-pill';
    if (likedPosts.includes(postData.id)) pillClass += ' is-liked';
    if (dislikedPosts.includes(postData.id)) pillClass += ' is-disliked';

    const safeContent = postData.content || '';
    let displayContent = '';

    // 截取字数按原样计算，只在最后将换行符 \n 替换为两个不换行空格 &nbsp;&nbsp; 供前端显示
    if (safeContent.length > 200) {
        displayContent = escapeHTML(safeContent.substring(0, 200)).replace(/\n/g, '&nbsp;&nbsp;') +
            `...<span class="read-more" data-zh="点击以查看全文" data-en="Click to read more">点击以查看全文</span>`;
    } else {
        displayContent = escapeHTML(safeContent).replace(/\n/g, '&nbsp;&nbsp;');
    }

    let dateStr = '';
    if (postData.created_at) {
        const d = new Date(postData.created_at);
        const pad = n => n.toString().padStart(2, '0');
        dateStr = d.getFullYear() + '/' + pad(d.getMonth() + 1) + '/' + pad(d.getDate()) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds());
    }

    return `
            <div class="card" onclick="location.href='content.html?id=${postData.id}'">
                <div style="width: 100%;">
                    <b>${escapeHTML(postData.title)}</b>
                    ${kwHtml}
                    <p class="post-body ${hasNSFW ? 'blur-content' : ''}" style="font-size:0.9em; color: var(--body-text); margin:8px 0;">${displayContent}</p>

                    <div class="post-footer">
                        <div class="${pillClass}">
                            <button class="like-btn" onclick="handleVote(event, ${postData.id}, 'like')">
                                👍 <span class="count">${postData.likes || 0}</span>
                            </button>
                            <div class="vote-divider"></div>
                            <button class="dislike-btn" onclick="handleVote(event, ${postData.id}, 'dislike')">
                                👎 <span class="count">${postData.dislike || 0}</span>
                            </button>
                        </div>
                        <div class="post-meta">
                            👤 <span class="author-link" style="${nickStyle}; margin-left: 4px;" onclick="event.stopPropagation(); location.href='user.html?user=${encodeURIComponent(postData.nickname)}'">${escapeHTML(postData.nickname)}</span> <span class="lv-badge ${userLevel.class}">${userLevel.name}</span> &nbsp;|&nbsp; 📅 ${dateStr}
                        </div>
                    </div>
                </div>
            </div>`;
}

/* loadNextPage
用途：数据分页加载与搜索过滤。
用法：执行触底后的自动加载动作（实现无限下拉滚动列表的核心业务逻辑），支持多条件搜索组合。
原理：计算偏移量，构建 Supabase 查询（包含标签与文本匹配），获取数据后调用 createCardHTML 渲染并追加到列表中。
*/
async function loadNextPage() {
    if (isFetching || !hasMore) return;
    isFetching = true;
    document.getElementById('scroll-sentinel').style.display = 'flex';
    document.getElementById('scroll-sentinel').classList.add('visible');
    let fetchId = currentSearchId;

    try {
        const from = currentPage * PAGE_SIZE;
        const to = (currentPage + 1) * PAGE_SIZE - 1;

        let query = _supabase.from('posts').select('*').order('created_at', { ascending: false });

        if (currentSearchKeywords.length > 0) {
            query = query.contains('keywords', JSON.stringify(currentSearchKeywords));
        }

        if (currentSearchText) {
            query = query.or(`title.ilike.%${currentSearchText}%,content.ilike.%${currentSearchText}%`);
        }

        const { data, error } = await query.range(from, to);

        if (error) throw error;

        if (fetchId !== currentSearchId) {
            isFetching = false;
            return;
        }

        if (data.length > 0) {
            document.getElementById('list-all').insertAdjacentHTML('beforeend', data.map(postData => createCardHTML(postData, globalUserMap)).join(''));
            currentPage++;
        }
        if (data.length < PAGE_SIZE) {
            hasMore = false;
            document.getElementById('scroll-sentinel').style.display = 'none';
            document.getElementById('end-message').style.display = 'block';
        }
        updateLanguage();
    } catch (err) {
        console.error("列表加载失败", err);

        document.getElementById('scroll-sentinel').style.display = 'none';

        document.getElementById('list-all').insertAdjacentHTML('beforeend',
            `<p style="text-align:center; color:var(--brand); margin-top: 30px; font-weight: bold;">
                        搜索出错拉闸了：${err.message || '查询解析失败'}
                    </p>`
        );
    } finally {
        if (fetchId === currentSearchId) {
            isFetching = false;
        }
    }
}

/* setupIntersectionObserver
用途：无限滚动监听。
用法：设置滚动监听器，以便在用户刷到页面底端时触发下翻页。
原理：利用浏览器的 IntersectionObserver API，当底部的 sentinel 元素进入视口时调用 loadNextPage。
*/
function setupIntersectionObserver() {
    observer = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMore && !isFetching) loadNextPage();
    }, { rootMargin: '100px' });
    observer.observe(document.getElementById('scroll-sentinel'));
}

/* init
用途：页面初始化入口。
用法：作为应用的主要入口文件，当页面完成基本渲染后负责拉取底层数据。
原理：加载主题、绑定搜索、鉴权检查显示特定按钮、并一次性拉取用户和热榜数据进行首页的初始渲染加载。
*/
async function init() {
    if (localStorage.getItem('theme') === 'dark') document.body.classList.add('dark');
    const listHotEl = document.getElementById('list-hot');

    initSearch();

    /* 检查用户是否已登录。如果已登录，将“登录”按钮改为“退出登录”并绑定退出逻辑 */
    const authBtn = document.getElementById('btn-auth');
    const username = localStorage.getItem('username');
    if (username) {
        authBtn.setAttribute('data-zh', '🚪 退出登录');
        authBtn.setAttribute('data-en', '🚪 Sign Out');
        authBtn.href = "javascript:void(0)"; // 阻止默认的页面跳转
        authBtn.onclick = function () {
            localStorage.removeItem('username'); // 核心：清理本地的用户名凭证
            alert(localStorage.getItem('lang') === 'zh' ? '已成功退出登录！' : 'Successfully signed out!');
            window.location.reload(); // 刷新页面以恢复未登录状态
        };
    }

    try {
        const [postsRes, usersRes] = await Promise.all([
            _supabase.from('posts').select('*'),
            _supabase.from('users').select('username, points, inventory')
        ]);
        if (usersRes.data) globalUserMap = usersRes.data.reduce((acc, user) => {
            acc[user.username] = user;
            return acc;
        }, {});

        /* 新增：登录后在顶部显示个性化问候语 */
        if (username) {
            const greetingEl = document.getElementById('user-greeting');
            const hour = new Date().getHours();
            let greetingText = '';

            // 根据时间范围设置不同的问候语
            if (localStorage.getItem('lang') === 'zh') {
                if (hour >= 6 && hour <= 9) greetingText = '☀️ 早上好';
                else if (hour >= 10 && hour <= 11) greetingText = '☀️ 上午好';
                else if (hour >= 12 && hour <= 13) greetingText = '⛱️ 中午好';
                else if (hour >= 14 && hour <= 17) greetingText = '🌻 下午好';
                else greetingText = '🌙 晚上好'; // 覆盖 18:00 - 05:59
            } else {
                if (hour >= 6 && hour <= 9) greetingText = '☀️ Good morning';
                else if (hour >= 10 && hour <= 11) greetingText = '☀️ Good morning';
                else if (hour >= 12 && hour <= 13) greetingText = '⛱️ Good afternoon';
                else if (hour >= 14 && hour <= 17) greetingText = '🌻 Good afternoon';
                else if (hour >= 18 && hour <= 19) greetingText = '🌇 Good evening'; // 英语多加一个傍晚的问候语
                else greetingText = '🌙 Good night'; // 覆盖 20:00 - 05:59
            }

            // 获取该用户的个性化变色样式
            const nickStyle = getNicknameStyle(globalUserMap[username] ? globalUserMap[username].inventory : null);

            // 渲染问候语和加粗的变色用户名
            greetingEl.innerHTML = `${greetingText}，<b style="${nickStyle}">${escapeHTML(username)}</b>`;
            greetingEl.style.display = 'inline-flex';
        }

        const now = Date.now();

        const weightedPosts = postsRes.data.map(post => {
            const likes = post.likes || 0;
            const dislikes = post.dislike || 0;
            let netVotes = likes - dislikes;

            if (post.keywords && post.keywords.includes('#疑似搬运 Suspected Repost')) {
                netVotes -= 5;
            } else if (post.keywords && post.keywords.includes('#搬运 Reposted')) {
                netVotes -= 2;
            }

            const postTime = new Date(post.created_at).getTime();
            const ageInHours = (now - postTime) / (1000 * 60 * 60);

            let hotScore = 0;
            if (netVotes > 0) {
                hotScore = netVotes / Math.pow((ageInHours + 225), 1.0001);
            } else if (netVotes < 0) {
                hotScore = netVotes;
            }

            return { ...post, hotScore };
        });

        const hotPosts = weightedPosts
            .sort((a, b) => b.hotScore - a.hotScore)
            .slice(0, 5);

        listHotEl.innerHTML = hotPosts.map(postData => createCardHTML(postData, globalUserMap)).join('');

        setupIntersectionObserver();
    } catch (err) {
        listHotEl.innerHTML = "<p>数据加载失败</p>";
    }
    updateLanguage(); // 这里会自动将前面设置的 data-zh 或 data-en 渲染到按钮文字上
}

init();
