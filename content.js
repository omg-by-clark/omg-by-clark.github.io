/**** content.js ****/
const currentLang = localStorage.getItem('lang') || 'zh';
const TRANS = {
    noId: { zh: "未找到帖子 ID", en: "Post ID not found" },
    alienError: {
        zh: "加载失败，可能帖子被外星人抓走了 🛸",
        en: "Load failed. The post might have been abducted by aliens 🛸"
    },
    noComments: { zh: "暂无评论，快来抢沙发！", en: "No comments yet. Be the first!" },
    loginReq: { zh: "请先登录！", en: "Please login first!" },
    emptyContent: { zh: "内容不能为空", en: "Content cannot be empty" },
    sendFail: { zh: "发送失败 😢", en: "Send failed 😢" },
    // 新增：删除相关的翻译词条
    confirmDelete: { zh: "警告：此操作不可逆！\n你确定要删除这篇帖子吗？", en: "Warning: Irreversible action!\nAre you sure you want to delete this post?" },
    deleteSuccess: { zh: "帖子已彻底删除 💥", en: "Post completely deleted 💥" },
    deleteFail: { zh: "删除失败，可能是权限不足", en: "Delete failed, might be a permission issue" }
};

const urlParams = new URLSearchParams(window.location.search);
const postId = urlParams.get('id');

// 全局变量：用于记录当前帖子的作者名字，供评论区判断 OP 和显示删除按钮使用
let currentPostAuthor = '';

/* getNickStyle 用法：根据传入的物品库数据，返回对应的发帖人特殊昵称 CSS 行内样式（如动态渐变色）。 */
function getNickStyle(inventory) {
    if (!inventory) return '';
    const now = new Date();
    if (inventory['100'] && new Date(inventory['100']) > now) return 'background: linear-gradient(to right, #d20f39, #fe640b, #df8e1d, #40a02b, #04a5e5, #8839ef); -webkit-background-clip: text; color: transparent; font-weight: bold;';
    if (inventory['101'] && new Date(inventory['101']) > now) return 'color: #04a5e5; font-weight: bold;';
    if (inventory['102'] && new Date(inventory['102']) > now) return 'color: #f9e2af; font-weight: bold;';
    return '';
}

/* escapeHTML 用法：防范跨站脚本攻击 (XSS)，将字符串中的敏感字符转换为安全的 HTML 实体。 */
function escapeHTML(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

/* toggleNSFW 用法：在用户点击特定的 NSFW 关键词时，切换正文容器(#c)的模糊和解模状态类名。 */
function toggleNSFW(event, element) {
    event.stopPropagation();
    const contentArea = document.getElementById('c');
    const isBlurry = contentArea.classList.contains('blur-content');

    if (isBlurry) {
        contentArea.classList.remove('blur-content');
        contentArea.classList.add('revealed-content');
        element.classList.remove('nsfw-tag');
    } else {
        contentArea.classList.add('blur-content');
        contentArea.classList.remove('revealed-content');
        element.classList.add('nsfw-tag');
    }
}

/* loadPostDetails 用法：页面初始化时抓取帖子详细数据，并处理数据渲染至 DOM（包括渲染特殊标签、作者权限判断、NSFW模糊判断）。 */
async function loadPostDetails() {
    if (!postId) return alert(TRANS.noId[currentLang]);
    try {
        const { data: post, error } = await _supabase.from('posts').select('*').eq('id', postId).single();
        if (error) throw error;

        // 核心逻辑：拿到帖子数据后，立刻将作者名字存入全局变量
        currentPostAuthor = post.nickname;

        const { data: author } = await _supabase.from('users').select('points, inventory').eq('username', post.nickname).maybeSingle();
        const lv = getLevelInfo(author ? author.points : 0);
        const nStyle = getNickStyle(author ? author.inventory : null);

        document.getElementById('t').innerText = post.title;

        const cContainer = document.getElementById('c');
        cContainer.innerText = post.content;

        document.getElementById('info').innerHTML = `👤 <span style="${nStyle}">${escapeHTML(post.nickname)}</span> <span class="lv-badge ${lv.class}">${lv.name}</span> | 📅 ${new Date(post.created_at).toLocaleString()}`;

        const kwRow = document.getElementById('kw-row');
        let hasNSFW = false;
        if (post.keywords && post.keywords.length > 0) {
            const kwItems = post.keywords.map(kw => {
                if (kw === '#NSFW') {
                    hasNSFW = true;
                    return `<span class="nsfw-tag" onclick="toggleNSFW(event, this)">${kw}</span>`;
                }
                if (kw === '#疑似搬运 Suspected Repost' || kw === '#搬运 Reposted') {
                    return `<span class="repost-tag">${kw}</span>`;
                }
                return `<span>${kw}</span>`;
            });
            kwRow.innerHTML = '关键词：' + kwItems.join('&nbsp;&nbsp;&nbsp;');
            kwRow.style.display = 'block';
        } else {
            kwRow.style.display = 'none';
        }

        // 渲染完标签后，立刻判断正文是否需要模糊
        if (hasNSFW) {
            cContainer.classList.add('blur-content');
        } else {
            cContainer.classList.remove('blur-content');
            cContainer.classList.remove('revealed-content');
        }

        // 处理投票状态显影，列名为 dislike
        const likedPosts = JSON.parse(localStorage.getItem('likedPosts') || '[]');
        const dislikedPosts = JSON.parse(localStorage.getItem('dislikedPosts') || '[]');

        document.getElementById('like-count').innerText = post.likes || 0;
        document.getElementById('dislike-count').innerText = post.dislike || 0;

        // 更新逻辑：检查状态并设置容器颜色
        const voteContainer = document.getElementById('vote-container');
        if (likedPosts.includes(Number(postId)) || likedPosts.includes(String(postId))) {
            voteContainer.classList.add('is-liked');
        }
        if (dislikedPosts.includes(Number(postId)) || dislikedPosts.includes(String(postId))) {
            voteContainer.classList.add('is-disliked');
        }

        // 新增逻辑：前端判断如果当前登录用户等于帖子作者，则显示红色的删除按钮
        const currentUser = localStorage.getItem('username');
        if (currentUser && currentUser === currentPostAuthor) {
            document.getElementById('btn-delete-post').style.display = 'block';
        }

        loadComments();
    } catch (err) {
        document.getElementById('c').innerText = TRANS.alienError[currentLang];
    }
}

/* toggleDetailVote 用法：处理详情页的点赞和点踩操作，含防重复控制、互斥控制及本地存储同步。 */
async function toggleDetailVote(type) {
    const likeSpan = document.getElementById('like-count');
    const dislikeSpan = document.getElementById('dislike-count');
    const voteContainer = document.getElementById('vote-container'); // 获取容器

    let likedPosts = JSON.parse(localStorage.getItem('likedPosts') || '[]');
    let dislikedPosts = JSON.parse(localStorage.getItem('dislikedPosts') || '[]');
    const pIdStr = String(postId);

    let likes = parseInt(likeSpan.innerText);
    let dislike = parseInt(dislikeSpan.innerText);

    if (type === 'like') {
        if (likedPosts.includes(pIdStr) || likedPosts.includes(Number(pIdStr))) {
            // 取消赞
            likes--;
            likedPosts = likedPosts.filter(id => String(id) !== pIdStr);
            voteContainer.classList.remove('is-liked'); // 恢复颜色
        } else {
            // 点赞
            likes++;
            likedPosts.push(Number(postId));
            voteContainer.classList.add('is-liked'); // 变红
            // 互斥：取消踩
            if (dislikedPosts.includes(pIdStr) || dislikedPosts.includes(Number(pIdStr))) {
                dislike--;
                dislikedPosts = dislikedPosts.filter(id => String(id) !== pIdStr);
                voteContainer.classList.remove('is-disliked');
                dislikeSpan.innerText = dislike;
            }
        }
        likeSpan.innerText = likes;
    } else {
        if (dislikedPosts.includes(pIdStr) || dislikedPosts.includes(Number(pIdStr))) {
            // 取消踩
            dislike--;
            dislikedPosts = dislikedPosts.filter(id => String(id) !== pIdStr);
            voteContainer.classList.remove('is-disliked'); // 恢复颜色
        } else {
            // 点踩
            dislike++;
            dislikedPosts.push(Number(postId));
            voteContainer.classList.add('is-disliked'); // 变蓝紫
            // 互斥：取消赞
            if (likedPosts.includes(pIdStr) || likedPosts.includes(Number(pIdStr))) {
                likes--;
                likedPosts = likedPosts.filter(id => String(id) !== pIdStr);
                voteContainer.classList.remove('is-liked');
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

/* loadComments 用法：负责拉取并渲染本帖的评论列表，对发言人的等级、特效以及是否为楼主 OP 进行对应组装。 */
async function loadComments() {
    try {
        const { data: cmts } = await _supabase.from('comments').select('*').eq('post_id', postId).order('created_at', { ascending: true });
        const { data: users } = await _supabase.from('users').select('username, points, inventory');
        const userMap = (users || []).reduce((acc, u) => {
            acc[u.username] = u;
            return acc;
        }, {});
        const cmtList = document.getElementById('cmt-list');
        cmtList.innerHTML = cmts.map(c => {
            const u = userMap[c.nickname];
            const clv = getLevelInfo(u ? u.points : 0);
            const cnStyle = getNickStyle(u ? u.inventory : null);

            // 验证：检查当前渲染的评论作者是否等于帖子的作者，如果是，则生成 OP 标签
            const isOP = c.nickname === currentPostAuthor;
            const opBadgeHtml = isOP ? `<span class="op-badge">[OP]</span>` : '';

            // 在等级标签 ${clv.name} 的左侧插入 ${opBadgeHtml}
            return `<div class="cmt-item"><div class="cmt-content"><b><span style="${cnStyle}">${escapeHTML(c.nickname)}</span>${opBadgeHtml} <span class="lv-badge ${clv.class}">${clv.name}</span>:</b> ${escapeHTML(c.content)}</div></div>`;
        }).join('') || `<p style="color:#888">${TRANS.noComments[currentLang]}</p>`;
    } catch (err) {
        console.error("加载失败", err);
    }
}

/* addCmt 用法：响应用户的发评操作，执行数据插入，并发放积分奖励然后刷新列表。 */
async function addCmt() {
    const nick = localStorage.getItem('username');
    if (!nick) {
        alert(TRANS.loginReq[currentLang]);
        window.location.href = 'index.html'; // 如果之前重命名为 signIn.html，请在这里同步修改哦
        return;
    }
    const content = document.getElementById('cC').value.trim();
    if (!content) return alert(TRANS.emptyContent[currentLang]);
    const { error } = await _supabase.from('comments').insert([{ post_id: postId, nickname: nick, content: content }]);
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

/* deletePost 用法：执行删帖逻辑，需经用户确认，删除成功后强制跳转回广场主页。 */
async function deletePost() {
    // 弹出确认框防误触
    if (!confirm(TRANS.confirmDelete[currentLang])) {
        return;
    }

    try {
        // 请求 Supabase 删除对应的这行数据
        const { error } = await _supabase.from('posts').delete().eq('id', postId);

        if (error) throw error;

        alert(TRANS.deleteSuccess[currentLang]);

        // 删除成功后强行滚回广场页，不留在这个变成空壳的详情页
        window.location.href = 'index.html';
    } catch (err) {
        console.error("删除报错信息：", err);
        alert(TRANS.deleteFail[currentLang]);
    }
}

loadPostDetails();