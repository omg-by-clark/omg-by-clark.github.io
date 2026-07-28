/* 本地数据模式管理
用途：让用户选择“允许全部”或“仅存储必要信息”，并用 Cookie 记住选择。
原理：必要模式只允许身份、语言、主题、积分和防重复投票相关键访问 localStorage；其它键读取为空、写入无效。
*/
(function initializeLocalDataMode() {
    const MODE_COOKIE = 'omg_local_data_mode';
    const COOKIE_MAX_AGE = 365 * 24 * 60 * 60;
    const initialPageLanguage = document.documentElement.lang.trim();
    const NECESSARY_KEYS = new Set([
        'username',
        'id_im',
        'isAdmin',
        'lang',
        'theme',
        'likedPosts',
        'dislikedPosts',
        'userPoints',
        'game_user_id',
        'textRenderingMode',
        'disabledRenderingCommands',
        'offlineTestMode',
        'verificationMode100'
    ]);

    function readModeCookie() {
        const prefix = `${MODE_COOKIE}=`;
        const item = document.cookie.split(';').map(value => value.trim())
            .find(value => value.startsWith(prefix));
        const value = item ? decodeURIComponent(item.slice(prefix.length)) : '';
        return value === 'all' || value === 'necessary' ? value : '';
    }

    function writeModeCookie(value) {
        document.cookie = `${MODE_COOKIE}=${encodeURIComponent(value)}; Path=/; Max-Age=${COOKIE_MAX_AGE}; SameSite=Lax`;
    }

    function usesChinese() {
        return /^zh(?:-|$)/i.test(initialPageLanguage || navigator.language || 'zh');
    }

    /* restrictLocalStorage
    用途：在尚未选择时阻断全部 localStorage，或在必要模式下只放行必要键。
    原理：覆盖 Storage 原型方法时只针对真实 localStorage 实例，sessionStorage 不受影响；clear() 也只删除当前模式允许操作的键。
    */
    function restrictLocalStorage(allowedKeys) {
        const realLocalStorage = window.localStorage;
        const prototype = Storage.prototype;
        const originalMethods = {
            key: prototype.key,
            getItem: prototype.getItem,
            setItem: prototype.setItem,
            removeItem: prototype.removeItem,
            clear: prototype.clear
        };

        function isAllowed(key) {
            return allowedKeys !== null && allowedKeys.has(String(key));
        }

        prototype.getItem = function (key) {
            if (this !== realLocalStorage) return originalMethods.getItem.call(this, key);
            return isAllowed(key) ? originalMethods.getItem.call(this, key) : null;
        };

        prototype.setItem = function (key, value) {
            if (this !== realLocalStorage) return originalMethods.setItem.call(this, key, value);
            if (isAllowed(key)) return originalMethods.setItem.call(this, key, value);
        };

        prototype.removeItem = function (key) {
            if (this !== realLocalStorage) return originalMethods.removeItem.call(this, key);
            if (isAllowed(key)) return originalMethods.removeItem.call(this, key);
        };

        prototype.key = function (index) {
            if (this !== realLocalStorage) return originalMethods.key.call(this, index);
            if (allowedKeys === null) return null;

            const visibleKeys = [];
            for (let position = 0; position < realLocalStorage.length; position++) {
                const key = originalMethods.key.call(realLocalStorage, position);
                if (key !== null && allowedKeys.has(key)) visibleKeys.push(key);
            }
            return visibleKeys[index] ?? null;
        };

        prototype.clear = function () {
            if (this !== realLocalStorage) return originalMethods.clear.call(this);
            if (allowedKeys === null) return;
            allowedKeys.forEach(key => originalMethods.removeItem.call(realLocalStorage, key));
        };
    }

    // 清理前一版曾使用的同意 Cookie，只保留当前的两级模式 Cookie。
    document.cookie = 'omg_local_data_consent=; Path=/; Max-Age=0; SameSite=Lax';

    const mode = readModeCookie();
    window.localDataConsent = mode === 'all' ? 'granted' : (mode === 'necessary' ? 'necessary' : 'pending');

    if (mode === 'necessary') {
        restrictLocalStorage(NECESSARY_KEYS);
    } else if (!mode) {
        // 选择前不允许业务脚本抢先使用本地数据。
        restrictLocalStorage(null);
    }

    // 供投票和登录函数使用；两种已选择模式都可以正常提供核心服务。
    window.requireLocalDataConsent = function () {
        if (window.localDataConsent !== 'pending') return true;
        alert(usesChinese()
            ? '如果不允许，我们将无法提供服务。'
            : 'If you do not allow it, we will be unable to provide the service.');
        return false;
    };

    if (mode) return;

    /* showLocalDataDialog
    用途：在没有本地数据模式 Cookie 时显示选择弹窗。
    原理：函数内部先判断是否已经存在弹窗，避免某些浏览器重复触发 ready 事件时生成两个遮罩。
    */
    function showLocalDataDialog() {
        if (document.querySelector('.local-data-consent-overlay')) return;
        const isChinese = usesChinese();
        const overlay = document.createElement('div');
        overlay.className = 'local-data-consent-overlay';
        overlay.innerHTML = `
            <style>
                .local-data-consent-overlay {
                    --local-data-accent: var(--brand, #ff4757);
                    --local-data-accent-text: #ffffff;
                    position: fixed;
                    inset: 0;
                    z-index: 2147483646;
                    display: grid;
                    place-items: center;
                    padding: 20px;
                    box-sizing: border-box;
                    background: rgba(0, 0, 0, 0.58);
                    font-family: sans-serif, "PingFang SC";
                }
                html[data-theme="catppuccin"] .local-data-consent-overlay {
                    --local-data-accent: #a6da95;
                    --local-data-accent-text: #24273a;
                }
                .local-data-consent-dialog {
                    width: min(440px, 100%);
                    box-sizing: border-box;
                    padding: 24px;
                    border-radius: 16px;
                    background: #24273a;
                    color: #cad3f5;
                    box-shadow: 0 20px 55px rgba(0, 0, 0, 0.45);
                }
                .local-data-consent-dialog h2 {
                    margin: 0 0 10px;
                    color: #cad3f5;
                    font-size: 1.25rem;
                }
                .local-data-consent-dialog p {
                    margin: 0;
                    color: #b8c0e0;
                    line-height: 1.65;
                    font-size: 0.92rem;
                }
                .local-data-consent-warning {
                    display: block;
                    margin-top: 10px;
                    color: var(--local-data-accent);
                    font-weight: 700;
                }
                .local-data-consent-actions {
                    display: flex;
                    justify-content: flex-end;
                    flex-wrap: wrap;
                    gap: 10px;
                    margin-top: 20px;
                }
                .local-data-consent-actions button {
                    padding: 8px 18px;
                    border: 0;
                    border-radius: 999px;
                    font: inherit;
                    font-weight: 700;
                    cursor: pointer;
                }
                .local-data-consent-necessary {
                    background: #5b6078;
                    color: #cad3f5;
                }
                .local-data-consent-all {
                    background: var(--local-data-accent);
                    color: var(--local-data-accent-text);
                }
            </style>
            <section class="local-data-consent-dialog" role="dialog" aria-modal="true" aria-labelledby="local-data-consent-title">
                <h2 id="local-data-consent-title"></h2>
                <p id="local-data-consent-description"></p>
                <strong class="local-data-consent-warning"></strong>
                <div class="local-data-consent-actions">
                    <button type="button" class="local-data-consent-necessary"></button>
                    <button type="button" class="local-data-consent-all"></button>
                </div>
            </section>`;

        overlay.querySelector('h2').textContent = isChinese
            ? '我们使用本地数据（Cookies）'
            : 'We use local data (Cookies)';
        overlay.querySelector('p').textContent = isChinese
            ? '本地数据用于保存登录状态、语言、主题、积分和投票记录。你可以允许全部数据，或只存储提供核心功能所需的信息。'
            : 'Local data saves sign-in status, language, theme, points, and vote records. You can allow all data or store only the information required for core features.';
        overlay.querySelector('.local-data-consent-warning').textContent = isChinese
            ? '如果不允许，我们将无法提供服务。'
            : 'If you do not allow it, we will be unable to provide the service.';

        const necessaryButton = overlay.querySelector('.local-data-consent-necessary');
        const allButton = overlay.querySelector('.local-data-consent-all');
        necessaryButton.textContent = isChinese ? '仅存储必要信息' : 'Necessary only';
        allButton.textContent = isChinese ? '允许全部' : 'Allow all';

        function chooseMode(selectedMode) {
            writeModeCookie(selectedMode);
            window.location.reload();
        }

        necessaryButton.addEventListener('click', () => chooseMode('necessary'));
        allButton.addEventListener('click', () => chooseMode('all'));

        document.body.appendChild(overlay);
        allButton.focus();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', showLocalDataDialog, { once: true });
    } else {
        showLocalDataDialog();
    }
})();
