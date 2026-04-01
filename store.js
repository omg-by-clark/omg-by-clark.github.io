/* store.js */
/**
 * 根据用户的背包数据，返回昵称的 CSS 样式
 * @param {Object} inventory 用户背包对象
 */
function getNicknameStyle(inventory) {
    if (!inventory) return '';
    const now = new Date();

    // 检查 100: 彩虹色
    if (inventory['100'] && new Date(inventory['100']) > now) {
        return 'background: linear-gradient(to right, #f38ba8, #fab387, #f9e2af, #c4d695, #a6e3a1, #89dceb, #89b4fa, #cba6f7); -webkit-background-clip: text; color: transparent; font-weight: bold;';
    }
    // 检查 101: 极客蓝
    if (inventory['101'] && new Date(inventory['101']) > now) {
        return 'color: #0059ff; font-weight: bold;';
    }
    // 检查 102: 土豪金
    if (inventory['102'] && new Date(inventory['102']) > now) {
        return 'color: #ffa600; text-shadow: 0 0 5px rgba(255, 215, 0, 0.5); font-weight: bold;';
    }

    return '';
}
