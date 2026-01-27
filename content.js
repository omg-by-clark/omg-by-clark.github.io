// content.js
// 1. 获取 URL 里的帖子 ID
const urlParams = new URLSearchParams(window.location.search);
const postId = urlParams.get('id');

// 加载主帖详情
async function loadPostDetails() {
    if (!postId) {
        alert("未找到帖子 ID");
        return;
    }

    try {
        const { data: post, error } = await _supabase
            .from('posts')
            .select('*')
            .eq('id', postId)
            .single();

        if (error) throw error;

        // 获取作者积分，增加容错逻辑
        const { data: author } = await _supabase
            .from('users')
            .select('points')
            .eq('username', post.nickname)
            .maybeSingle();

        const lv = getLevelInfo(author ? author.points : 0);

        document.getElementById('t').innerText = post.title;
        document.getElementById('c').innerText = post.content;
        
        // 渲染发布人信息
        document.getElementById('info').innerHTML = `
            👤 ${post.nickname} <span class="lv-badge ${lv.class}">${lv.name}</span> 
            | 📅 ${new Date(post.created_at).toLocaleString()}
        `;

        loadComments();
    } catch (err) {
        console.error(err);
        document.getElementById('c').innerText = "内容加载失败，请检查连接状况。";
    }
}

// 加载评论逻辑
async function loadComments() {
    try {
        const { data: cmts, error } = await _supabase
            .from('comments')
            .select('*')
            .eq('post_id', postId)
            .order('created_at', { ascending: true });

        if (error) throw error;

        const { data: users } = await _supabase.from('users').select('username, points');
        const cmtList = document.getElementById('cmt-list');
        
        cmtList.innerHTML = cmts.map(c => {
            const u = (users || []).find(user => user.username === c.nickname);
            const clv = getLevelInfo(u ? u.points : 0);
            return `
                <div class="cmt-item">
                    <div class="cmt-content">
                        <b>${c.nickname} <span class="lv-badge ${clv.class}">${clv.name}</span>:</b> ${c.content}
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
        post_id: postId,
        nickname: nick,
        content: content
    }]);

    if (error) {
        alert("发送失败，请检查配置。");
    } else {
        const { data: user } = await _supabase.from('users').select('points').eq('username', nick).maybeSingle();
        const newPoints = (user ? user.points : 0) + 5; // 按照你之前要求的发帖加5分逻辑更新
        
        await _supabase.from('users').update({ points: newPoints }).eq('username', nick);
        localStorage.setItem('userPoints', newPoints);

        document.getElementById('cC').value = ""; 
        loadComments(); 
    }
}

loadPostDetails();