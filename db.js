/**
 * db.js - omg-by-Clark 核心数据库与业务逻辑配置
 * 包含：Supabase 初始化、SHA-256 加密、以及双语等级计算
 */

const { createClient } = supabase;

// Supabase 接入凭证
const SUPABASE_URL = 'https://rptrbdkgryybipbshlkz.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJwdHJiZGtncnl5YmlwYnNobGt6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgzNzgyODksImV4cCI6MjA4Mzk1NDI4OX0.PXe7ZeN70e86xXxxXUgc0UeDaEBNgRHZmGmc5zyKyRE';

// 创建客户端实例
const _supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

/**
 * 🔒 密码加密逻辑：使用 Web Crypto API 实现 SHA-256
 */
async function hashPassword(password) {
    const msgUint8 = new TextEncoder().encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    // 转换为 64 位十六进制字符串
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * 🏆 等级计算逻辑：支持动态中英双语显示
 */
function getLevelInfo(points) {
    const p = parseInt(points) || 0;
    const lang = localStorage.getItem('lang') || 'zh';

    // 史诗级 (Epic)：1401+
    if (p >= 1401) {
        return {
            name: lang === 'zh' ? '史诗' : 'Epic',
            class: 'lv-epic'
        };
    }
    // 王者级 (King)：1201~1400
    if (p >= 1201) {
        return {
            name: lang === 'zh' ? '王者' : 'King',
            class: 'lv-king'
        };
    }
    // 钻石级 (Diamond)：1001~1200
    if (p >= 1001) {
        return {
            name: lang === 'zh' ? '钻石' : 'Diamond',
            class: 'lv-diamond'
        };
    }
    // 黄金级 (Gold)：801~1000
    if (p >= 801) {
        return {
            name: lang === 'zh' ? '黄金' : 'Gold',
            class: 'lv-gold'
        };
    }
    // 白银级 (Silver)：601~800
    if (p >= 601) {
        return {
            name: lang === 'zh' ? '白银' : 'Silver',
            class: 'lv-silver'
        };
    }
    // 青铜级 (Bronze)：401~600
    if (p >= 401) {
        return {
            name: lang === 'zh' ? '青铜' : 'Bronze',
            class: 'lv-bronze'
        };
    }
    // 黑铁级 (Iron)：201~400
    if (p >= 201) {
        return {
            name: lang === 'zh' ? '黑铁' : 'Iron',
            class: 'lv-iron'
        };
    }
    // 原木级 (Log)：0~200
    return {
        name: lang === 'zh' ? '原木' : 'Log',
        class: 'lv-log'
    };
}