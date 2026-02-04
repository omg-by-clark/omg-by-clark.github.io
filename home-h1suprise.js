// home-h1suprise.js
const mainTitle = document.getElementById('main-title');
mainTitle.addEventListener('click', () => {
    const lang = localStorage.getItem('lang') || 'zh';
    const languChange = lang == 'zh' ? '恭喜你看到了这个隐藏彩蛋！' : 'Congratulations on finding this hidden Easter egg!';
    alert(languChange);
});