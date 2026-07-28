/* Catppuccin 主题初始化
用途：在页面样式渲染前读取主题设置，并把统一的主题标识写到根元素上。
原理：使用 html[data-theme] 而不是依赖每个页面各自修改 body.className，避免旧页面只认识 light/dark 时清除 Catppuccin 状态。
*/
(function applySavedTheme() {
    const theme = localStorage.getItem('theme') || 'light';
    document.documentElement.dataset.theme = theme;

    document.addEventListener('DOMContentLoaded', function () {
        document.body.classList.toggle('catppuccin', theme === 'catppuccin');
    });
})();

