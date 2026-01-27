// 1. 获取 URL 里的帖子 ID
const urlParams = new URLSearchParams(window.location.search);
const postId = urlParams.get('id');

/**
 * 🎨 昵称特效引擎：同步 store.js 逻辑并避开“浅青柠死灰区”
 */
function getNickStyle(inventory) {
    if (!inventory) return '';
    const now = new Date();
    // ID 100: 改良版彩虹色
    if (inventory['100'] && new Date(inventory['100']) > now) {
        return 'background: linear-gradient(to right, #f38ba8, #fab387, #f9e2af, #c4d695, #a6e3a1, #89dceb, #89b4fa, #cba6f7); -webkit-background-clip: text; color: transparent; font-weight: bold;';
    }
    // ID 101: 极客蓝
    if (inventory['101'] && new Date(inventory['101']) > now) {
        return 'color: #89b4fa; font-weight: bold;';
    }
    // ID 102: 土豪金
    if (inventory['102'] && new Date(inventory['102']) > now) {
        return 'color: #f9e2af; text-shadow: 0 0 5px rgba(250, 179, 135, 0.5); font-weight: bold;';
    }
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
    if (!postId) return alert("未找到帖子 ID");

    try {
        const { data: post, error } = await _supabase
            .from('posts').select('*').eq('id', postId).single();
        if (error) throw error;

        // 【关键改动 1】获取作者的 inventory
        const { data: author } = await _supabase
            .from('users').select('points, inventory').eq('username', post.nickname).maybeSingle();

        const lv = getLevelInfo(author ? author.points : 0); //
        const nStyle = getNickStyle(author ? author.inventory : null);

        document.getElementById('t').innerText = post.title;
        document.getElementById('c').innerText = post.content;

        // 应用主帖作者特效
        document.getElementById('info').innerHTML = `
            👤 <span style="${nStyle}">${escapeHTML(post.nickname)}</span> 
            <span class="lv-badge ${lv.class}">${lv.name}</span> 
            | 📅 ${new Date(post.created_at).toLocaleString()}
        `;

        loadComments();
    } catch (err) {
        console.error(err);
        document.getElementById('c').innerText = "加载失败，可能帖子被外星人抓走了 🛸";
    }
}

// 加载评论逻辑
async function loadComments() {
    try {
        const { data: cmts, error } = await _supabase
            .from('comments').select('*').eq('post_id', postId).order('created_at', { ascending: true });
        if (error) throw error;

        // 【关键改动 2】获取所有评论者的信息（用于渲染特效）
        const { data: users } = await _supabase.from('users').select('username, points, inventory');
        const userMap = (users || []).reduce((acc, u) => { acc[u.username] = u; return acc; }, {});

        const cmtList = document.getElementById('cmt-list');

        // 【关键改动 3】在渲染评论时应用特效样式
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
        }).join('') || '<p style="color:#888">暂无评论，快来抢沙发！</p>';
    } catch (err) {
        console.error("评论加载失败:", err);
    }
}

// 发送评论逻辑
async function addCmt() {
    const nick = localStorage.getItem('username');
    if (!nick) {
        alert("请先登录！");
        window.location.href = 'index.html';
        return;
    }

    const content = document.getElementById('cC').value.trim();
    if (!content) return alert("内容不能为空");

    const { error } = await _supabase.from('comments').insert([{
        post_id: postId, nickname: nick, content: content
    }]);

    if (error) {
        alert("发送失败 😢");
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