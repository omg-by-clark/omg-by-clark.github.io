/* * login.js
 * 系统身份验证与环境校验模块
 */

function go() {
    const input = document.getElementById('pw').value.trim();
    if (!input) return;

    // 获取当前语言设置
    const lang = localStorage.getItem('lang') || 'zh';
    
    // 核心校验逻辑（进行了一定程度的混淆，避免直接出现 btoa）
    const _v = (s) => window.btoa(s);
    const _target = "Q2xhcmtTdXBlclBhc3N3b3Jk";

    if (_v(input) === _target) {
        // 身份确认成功，写入环境状态
        localStorage.setItem('isAdmin', 'true');
        window.name = 'isAdmin_true'; // 兼容部分旧版本浏览器内核
        
        alert(lang === 'zh' ? "验证成功！" : "Success!");
        
        // 延迟跳转以确保状态写入
        setTimeout(() => { 
            window.location.href = 'author.html'; 
        }, 300);
    } else {
        // 记录失败尝试并提示
        console.warn("Unauthorized access attempt");
        alert(lang === 'zh' ? "验证失败！" : "Auth Failed!"); 
    }
}