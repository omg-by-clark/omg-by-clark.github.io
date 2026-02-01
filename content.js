/**** content.js ****/
// === 0. 国际化字典配置 (i18n) ===
const currentLang = localStorage.getItem('lang') || 'zh';

const TRANS = {
    noId: { zh: "未找到帖子 ID", en: "Post ID not found" },
    alienError: { zh: "加载失败，可能帖子被外星人抓走了 🛸", en: "Load failed. The post might have been abducted by aliens 🛸" },
    noComments: { zh: "暂无评论，快来抢沙发！", en: "No comments yet. Be the first!" },
    loginReq: { zh: "请先登录！", en: "Please login first!" },
    emptyContent: { zh: "内容不能为空", en: "Content cannot be empty" },
    sendFail: { zh: "发送失败 😢", en: "Send failed 😢" }
};

// 1. 获取 URL 里的帖子 ID
const urlParams = new URLSearchParams(window.location.search);
const postId = urlParams.get('id'); // 全局帖子ID

function getNickStyle(inventory) {
    if (!inventory) return '';
    const now = new Date();
    // 彩虹色昵称
    if (inventory['100'] && new Date(inventory['100']) > now) return 'background: linear-gradient(to right, #d20f39, #fe640b, #df8e1d, #40a02b, #04a5e5, #8839ef); -webkit-background-clip: text; color: transparent; font-weight: bold;';
    // 极客蓝昵称
    if (inventory['101'] && new Date(inventory['101']) > now) return 'color: #04a5e5; font-weight: bold;';
    // 土豪金昵称
    if (inventory['102'] && new Date(inventory['102']) > now) return 'color: #f9e2af; text-shadow: 0 0 5px rgba(250, 179, 135, 0.5); font-weight: bold;';
    return '';
}

function escapeHTML(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// 加载主帖详情
async function loadPostDetails() {
    if (!postId) return alert(TRANS.noId[currentLang]);

    try {
        const { data: post, error } = await _supabase
            .from('posts').select('*').eq('id', postId).single();
        if (error) throw error;

        // 获取作者信息
        const { data: author } = await _supabase
            .from('users').select('points, inventory').eq('username', post.nickname).maybeSingle();

        const lv = getLevelInfo(author ? author.points : 0);
        const nStyle = getNickStyle(author ? author.inventory : null);

        // 渲染文本
        document.getElementById('t').innerText = post.title;
        document.getElementById('c').innerText = post.content;

        document.getElementById('info').innerHTML = `
            👤 <span style="${nStyle}">${escapeHTML(post.nickname)}</span> 
            <span class="lv-badge ${lv.class}">${lv.name}</span> 
            | 📅 ${new Date(post.created_at).toLocaleString()}
        `;

        // 初始化点赞按钮状态
        const likedPosts = JSON.parse(localStorage.getItem('likedPosts') || '[]');
        const isLiked = likedPosts.includes(Number(postId)) || likedPosts.includes(String(postId));
        const btnLike = document.getElementById('btn-like');
        const likeCount = document.getElementById('like-count');

        likeCount.innerText = post.likes;
        if (isLiked) {
            btnLike.classList.add('active');
        }

        loadComments();
    } catch (err) {
        console.error(err);
        // 双语报错信息
        document.getElementById('c').innerText = TRANS.alienError[currentLang];
    }
}

// 详情页点赞逻辑
async function toggleDetailLike() {
    const btn = document.getElementById('btn-like');
    const countSpan = document.getElementById('like-count');

    let likedPosts = JSON.parse(localStorage.getItem('likedPosts') || '[]');
    const pIdStr = String(postId);
    const isLikedAlready = likedPosts.some(id => String(id) === pIdStr);

    let currentCount = parseInt(countSpan.innerText, 10);
    let newCount = isLikedAlready ? Math.max(0, currentCount - 1) : currentCount + 1;

    countSpan.innerText = newCount;

    if (isLikedAlready) {
        btn.classList.remove('active');
        likedPosts = likedPosts.filter(id => String(id) !== pIdStr);
    } else {
        btn.classList.add('active');
        likedPosts.push(Number(postId));
    }

    localStorage.setItem('likedPosts', JSON.stringify(likedPosts));

    try {
        const { error } = await _supabase.from('posts').update({ likes: newCount }).eq('id', postId);
        if (error) throw error;
    } catch (err) {
        console.error("[错误] 详情页点赞同步失败:", err);
    }
}

// 加载评论逻辑
async function loadComments() {
    try {
        const { data: cmts, error } = await _supabase
            .from('comments').select('*').eq('post_id', postId).order('created_at', { ascending: true });
        if (error) throw error;

        const { data: users } = await _supabase.from('users').select('username, points, inventory');
        const userMap = (users || []).reduce((acc, u) => { acc[u.username] = u; return acc; }, {});

        const cmtList = document.getElementById('cmt-list');

        // 这里使用了双语变量 TRANS.noComments[currentLang]
        cmtList.innerHTML = cmts.map(c => {
            const u = userMap[c.nickname];
            const clv = getLevelInfo(u ? u.points : 0);
            const cnStyle = getNickStyle(u ? u.inventory : null);
            return `
                <div class="cmt-item">
                    <div class="cmt-content">
                        <b><span style="${cnStyle}">${escapeHTML(c.nickname)}</span> 
                        <span class="lv-badge ${clv.class}">${clv.name}</span>:</b> ${escapeHTML(c.content)}
                    </div>
                </div>
            `;
        }).join('') || `<p style="color:#888">${TRANS.noComments[currentLang]}</p>`;
    } catch (err) {
        console.error("评论加载失败:", err);
    }
}

// 发送评论逻辑
async function addCmt() {
    const nick = localStorage.getItem('username');
    if (!nick) {
        // 双语 Alert
        alert(TRANS.loginReq[currentLang]);
        window.location.href = 'index.html';
        return;
    }

    const content = document.getElementById('cC').value.trim();
    if (!content) return alert(TRANS.emptyContent[currentLang]);

    const { error } = await _supabase.from('comments').insert([{
        post_id: postId, nickname: nick, content: content
    }]);

    if (error) {
        alert(TRANS.sendFail[currentLang]);
    } else {
        const { data: user } = await _supabase.from('users').select('points').eq('username', nick).maybeSingle();
        const newPoints = (user ? user.points : 0) + 5;

        await _supabase.from('users').update({ points: newPoints }).eq('username', nick);
        localStorage.setItem('userPoints', newPoints);

        document.getElementById('cC').value = "";
        loadComments();
    }
}

loadPostDetails();