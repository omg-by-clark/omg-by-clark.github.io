/* omg-render.js */
/*
    omg-by-clark.github.io: A website for sharing daily stories.
    Copyright (C) 2026  Chi (Clark) Zhang

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU Affero General Public License as published
    by the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU Affero General Public License for more details.
*/

/* omgRender
用途：集中处理帖子正文的特色指令和本地 Markdown 渲染，避免 index/content/user 各写一遍。
原理：先识别帖子开头的 \emd；开启后按本地 Markdown 规则渲染，再继续套用 OMG 特色指令；公式使用本地 KaTeX，不连接任何 API。
*/
window.omgRender = (function () {
    const SUPPORTED_CODE_LANGUAGES = {
        javascript: 'JavaScript',
        js: 'JavaScript',
        mjs: 'JavaScript',
        cjs: 'JavaScript',
        html: 'HTML',
        htm: 'HTML',
        yaml: 'YAML',
        yml: 'YAML',
        python: 'Python',
        py: 'Python',
        'c++': 'C++',
        cpp: 'C++',
        cxx: 'C++',
        cc: 'C++',
        c: 'C',
        plaintext: 'Plaintext',
        text: 'Plaintext',
        txt: 'Plaintext',
        plain: 'Plaintext',
        'plain text': 'Plaintext'
    };

    const CODE_LANGUAGE_ALIASES = {
        javascript: 'javascript',
        js: 'javascript',
        mjs: 'javascript',
        cjs: 'javascript',
        html: 'html',
        htm: 'html',
        yaml: 'yaml',
        yml: 'yaml',
        python: 'python',
        py: 'python',
        'c++': 'cpp',
        cpp: 'cpp',
        cxx: 'cpp',
        cc: 'cpp',
        c: 'c',
        plaintext: 'plaintext',
        text: 'plaintext',
        txt: 'plaintext',
        plain: 'plaintext',
        'plain text': 'plaintext'
    };

    /* normalizeCodeLanguage
    用途：把代码块语言名统一成内部使用的白名单名称。
    原理：只允许 JavaScript、HTML、YAML、Python、C++、C、Plaintext；其它语言或拼错的语言全部按 Plaintext 处理。
    */
    function normalizeCodeLanguage(lang) {
        const normalized = String(lang || 'plaintext').trim().toLowerCase();
        return CODE_LANGUAGE_ALIASES[normalized] || 'plaintext';
    }

    function escapeHTML(str) {
        const div = document.createElement('div');
        div.textContent = String(str || '');
        return div.innerHTML;
    }

    function shouldRenderCommand(command) {
        return typeof window.shouldRenderCustomCommand !== 'function' || window.shouldRenderCustomCommand(command);
    }

    function sanitizeUrl(url) {
        if (!url) return '';
        const trimmedUrl = String(url).trim();
        if (!trimmedUrl) return '';

        try {
            const parsedUrl = new URL(trimmedUrl, window.location.href);
            const allowedProtocols = ['http:', 'https:', 'mailto:'];
            if (!allowedProtocols.includes(parsedUrl.protocol)) return '';
            return trimmedUrl;
        } catch (error) {
            return '';
        }
    }

    function escapeAttribute(str) {
        return escapeHTML(str).replace(/`/g, '&#96;');
    }

    function renderLink(label, safeUrl) {
        return `<a href="${escapeAttribute(safeUrl)}" class="omg-render-link" rel="noopener noreferrer">${label}</a>`;
    }

    function stripEnableMarkdownCommand(text) {
        const source = String(text || '');
        const match = source.match(/^\s*\\emd[ \t]*(?:\r?\n|$)/i);
        return {
            enabled: Boolean(match),
            source: match ? source.slice(match[0].length) : source
        };
    }

    function renderKatex(latex, displayMode) {
        if (!window.katex) return `<span class="md-math-fallback">${escapeHTML(latex)}</span>`;
        try {
            return window.katex.renderToString(latex, {
                displayMode,
                throwOnError: false,
                strict: false,
                trust: false
            });
        } catch (error) {
            return `<span class="md-math-fallback">${escapeHTML(latex)}</span>`;
        }
    }

    function tokenSpan(type, text) {
        return `<span class="md-token-${type}">${text}</span>`;
    }

    function createHighlightStash() {
        const stash = [];

        function stashValue(value) {
            const token = `\uE100${String.fromCharCode(0xE200 + stash.length)}\uE100`;
            stash.push(value);
            return token;
        }

        return {
            replace(html, regex, render) {
                return html.replace(regex, function (...args) {
                    return stashValue(render(...args));
                });
            },
            restore(html) {
                return html.replace(/\uE100([\uE200-\uEFFF])\uE100/g, function (match, indexChar) {
                    return stash[indexChar.charCodeAt(0) - 0xE200] || match;
                });
            }
        };
    }

    function stashHighlightedTokens(html, rules) {
        const tokenStash = createHighlightStash();
        let highlighted = html;

        rules.forEach(rule => {
            highlighted = tokenStash.replace(highlighted, rule.regex, function (...args) {
                return rule.render(...args);
            });
        });

        return {
            html: highlighted,
            replace: tokenStash.replace,
            restore: tokenStash.restore
        };
    }

    function highlightWords(html, words, type, tokenStash) {
        if (!words.length) return html;
        const pattern = new RegExp(`\\b(${words.join('|')})\\b`, 'g');
        if (!tokenStash) return html.replace(pattern, `<span class="md-token-${type}">$1</span>`);
        return tokenStash.replace(html, pattern, match => tokenSpan(type, match));
    }

    function highlightCStyleCode(html, language) {
        const keywordMap = {
            javascript: ['async', 'await', 'break', 'case', 'catch', 'class', 'const', 'continue', 'default', 'delete', 'do', 'else', 'export', 'extends', 'finally', 'for', 'from', 'function', 'if', 'import', 'in', 'let', 'new', 'of', 'return', 'static', 'switch', 'this', 'throw', 'try', 'typeof', 'var', 'void', 'while', 'yield'],
            cpp: ['alignas', 'alignof', 'auto', 'bool', 'break', 'case', 'catch', 'char', 'char16_t', 'char32_t', 'class', 'const', 'constexpr', 'continue', 'decltype', 'default', 'delete', 'do', 'double', 'else', 'enum', 'explicit', 'export', 'extern', 'float', 'for', 'friend', 'goto', 'if', 'inline', 'int', 'long', 'mutable', 'namespace', 'new', 'noexcept', 'operator', 'private', 'protected', 'public', 'return', 'short', 'signed', 'sizeof', 'static', 'struct', 'switch', 'template', 'this', 'throw', 'try', 'typedef', 'typename', 'union', 'unsigned', 'using', 'virtual', 'void', 'volatile', 'while'],
            c: ['auto', 'bool', 'break', 'case', 'char', 'const', 'continue', 'default', 'do', 'double', 'else', 'enum', 'extern', 'float', 'for', 'goto', 'if', 'inline', 'int', 'long', 'register', 'restrict', 'return', 'short', 'signed', 'sizeof', 'static', 'struct', 'switch', 'typedef', 'union', 'unsigned', 'void', 'volatile', 'while']
        };
        const typeMap = {
            javascript: ['Array', 'Boolean', 'Date', 'Error', 'Map', 'Number', 'Object', 'Promise', 'RegExp', 'Set', 'String', 'Symbol', 'WeakMap', 'WeakSet'],
            cpp: ['size_t', 'string', 'wchar_t'],
            c: ['FILE', 'size_t', 'uint8_t', 'uint16_t', 'uint32_t', 'uint64_t']
        };
        const builtinMap = {
            javascript: ['console', 'document', 'JSON', 'Math', 'navigator', 'window'],
            cpp: ['printf', 'scanf'],
            c: ['fclose', 'fopen', 'free', 'malloc', 'printf', 'scanf', 'sizeof', 'strlen']
        };
        const protectionRules = [
            { regex: /\/\*[\s\S]*?\*\//g, render: match => tokenSpan('comment', match) },
            { regex: /\/\/[^\n]*/g, render: match => tokenSpan('comment', match) },
            { regex: /("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`)/g, render: match => tokenSpan('string', match.replace(/(\\[nrt"'`\\])/g, tokenSpan('escape', '$1'))) }
        ];

        if (language === 'cpp' || language === 'c') {
            protectionRules.splice(2, 0,
                { regex: /(^|\n)(\s*#\s*include)(\s+)(&lt;[^&\n]+&gt;|"[^"\n]+")/g, render: (match, prefix, directive, space, header) => `${prefix}${tokenSpan('preprocessor', directive)}${space}${tokenSpan('header', header)}` },
                { regex: /(^|\n)(\s*#\s*define)(\s+)([A-Za-z_]\w*)/g, render: (match, prefix, directive, space, name) => `${prefix}${tokenSpan('preprocessor', directive)}${space}${tokenSpan('function', name)}` },
                { regex: /(^|\n)(\s*#\s*[A-Za-z_]\w*)/g, render: (match, prefix, directive) => `${prefix}${tokenSpan('preprocessor', directive)}` }
            );
        }

        const protectedParts = stashHighlightedTokens(html, protectionRules);
        let highlighted = protectedParts.html;

        if (language === 'cpp') {
            highlighted = protectedParts.replace(highlighted, /\b([A-Za-z_]\w*)(?=\s*::)/g, match => tokenSpan('namespace', match));
            highlighted = protectedParts.replace(highlighted, /\b(namespace)(\s+)([A-Za-z_]\w*)/g, (match, keyword, space, name) => `${tokenSpan('keyword', keyword)}${space}${tokenSpan('namespace', name)}`);
        }
        highlighted = highlightWords(highlighted, keywordMap[language] || [], 'keyword', protectedParts);
        highlighted = highlightWords(highlighted, typeMap[language] || [], 'type', protectedParts);
        highlighted = highlightWords(highlighted, builtinMap[language] || [], 'builtin', protectedParts);
        highlighted = protectedParts.replace(highlighted, /\b(true|false|null|nullptr|undefined)\b/g, match => tokenSpan('atom', match));
        highlighted = protectedParts.replace(highlighted, /\b(\d+(?:\.\d+)?(?:e[+-]?\d+)?|0x[\da-f]+)\b/gi, match => tokenSpan('number', match));
        highlighted = protectedParts.replace(highlighted, /\b([A-Za-z_$]\w*)(?=\s*\()/g, match => tokenSpan('function', match));
        highlighted = protectedParts.replace(highlighted, /\.([A-Za-z_$]\w*)\b/g, (match, property) => `${tokenSpan('delimiter', '.')}${tokenSpan('property', property)}`);
        highlighted = protectedParts.replace(highlighted, /(&amp;&amp;|&amp;|&lt;&lt;|&gt;&gt;|===|!==|==|!=|&lt;=|&gt;=|\|\||[-+*/%=!?:~^|])/g, match => tokenSpan('operator', match));
        highlighted = protectedParts.replace(highlighted, /(&lt;|&gt;|[()[\]{},.;])/g, match => tokenSpan('delimiter', match));
        return protectedParts.restore(highlighted);
    }

    function highlightPythonCode(html) {
        const protectedParts = stashHighlightedTokens(html, [
            { regex: /#.*$/gm, render: match => tokenSpan('comment', match) },
            { regex: /("""[\s\S]*?"""|'''[\s\S]*?'''|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')/g, render: match => tokenSpan('string', match.replace(/(\\[nrt"'\\])/g, tokenSpan('escape', '$1'))) },
            { regex: /(^|\n)(\s*@\w+)/g, render: (match, prefix, decorator) => `${prefix}${tokenSpan('macro', decorator)}` }
        ]);
        let highlighted = protectedParts.html;

        highlighted = highlightWords(highlighted, ['and', 'as', 'assert', 'async', 'await', 'break', 'class', 'continue', 'def', 'del', 'elif', 'else', 'except', 'finally', 'for', 'from', 'global', 'if', 'import', 'in', 'is', 'lambda', 'nonlocal', 'not', 'or', 'pass', 'raise', 'return', 'try', 'while', 'with', 'yield'], 'keyword', protectedParts);
        highlighted = highlightWords(highlighted, ['False', 'None', 'True'], 'atom', protectedParts);
        highlighted = highlightWords(highlighted, ['dict', 'float', 'int', 'len', 'list', 'print', 'range', 'set', 'str', 'tuple'], 'builtin', protectedParts);
        highlighted = protectedParts.replace(highlighted, /\b(\d+(?:\.\d+)?(?:e[+-]?\d+)?)\b/gi, match => tokenSpan('number', match));
        highlighted = protectedParts.replace(highlighted, /\b([A-Za-z_]\w*)(?=\s*\()/g, match => tokenSpan('function', match));
        highlighted = protectedParts.replace(highlighted, /\.([A-Za-z_]\w*)\b/g, (match, property) => `${tokenSpan('delimiter', '.')}${tokenSpan('property', property)}`);
        highlighted = protectedParts.replace(highlighted, /(==|!=|&lt;=|&gt;=|[-+*/%=!?:])/g, match => tokenSpan('operator', match));
        highlighted = protectedParts.replace(highlighted, /([()[\]{},.;])/g, match => tokenSpan('delimiter', match));
        return protectedParts.restore(highlighted);
    }

    function highlightHtmlCode(html) {
        const protectedParts = stashHighlightedTokens(html, [
            { regex: /&lt;!--[\s\S]*?--&gt;/g, render: match => tokenSpan('comment', match) },
            { regex: /("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')/g, render: match => tokenSpan('string', match) }
        ]);
        let highlighted = protectedParts.html;

        highlighted = protectedParts.replace(highlighted, /(&lt;\/?)([A-Za-z][\w-]*)/g, (match, prefix, name) => `${tokenSpan('delimiter', prefix)}${tokenSpan('keyword', name)}`);
        highlighted = protectedParts.replace(highlighted, /\s([A-Za-z_:][-A-Za-z0-9_:.]*)(?=\=)/g, (match, name) => ` ${tokenSpan('attribute', name)}`);
        highlighted = protectedParts.replace(highlighted, /=/g, match => tokenSpan('operator', match));
        highlighted = protectedParts.replace(highlighted, /(&lt;|&gt;|\/&gt;)/g, match => tokenSpan('delimiter', match));
        return protectedParts.restore(highlighted);
    }

    function highlightYamlCode(html) {
        const protectedParts = stashHighlightedTokens(html, [
            { regex: /#.*$/gm, render: match => tokenSpan('comment', match) },
            { regex: /("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')/g, render: match => tokenSpan('string', match) }
        ]);
        let highlighted = protectedParts.html;

        highlighted = protectedParts.replace(highlighted, /^(\s*)([A-Za-z0-9_.-]+)(\s*:)/gm, (match, prefix, key, colon) => `${prefix}${tokenSpan('property', key)}${tokenSpan('delimiter', colon)}`);
        highlighted = protectedParts.replace(highlighted, /\b(true|false|null|yes|no|on|off)\b/gi, match => tokenSpan('atom', match));
        highlighted = protectedParts.replace(highlighted, /\b(\d+(?:\.\d+)?)\b/g, match => tokenSpan('number', match));
        highlighted = protectedParts.replace(highlighted, /^(\s*)-\s/gm, (match, prefix) => `${prefix}${tokenSpan('delimiter', '-')} `);
        return protectedParts.restore(highlighted);
    }

    function highlightCode(canonicalLang, code) {
        if (canonicalLang === 'javascript') return highlightCStyleCode(code, 'javascript');
        if (canonicalLang === 'cpp') return highlightCStyleCode(code, 'cpp');
        if (canonicalLang === 'c') return highlightCStyleCode(code, 'c');
        if (canonicalLang === 'python') return highlightPythonCode(code);
        if (canonicalLang === 'html') return highlightHtmlCode(code);
        if (canonicalLang === 'yaml') return highlightYamlCode(code);
        return code;
    }

    function buildCodeFenceHtml(lang, code) {
        const rawLang = String(lang || 'plaintext').trim().toLowerCase();
        const canonicalLang = normalizeCodeLanguage(rawLang);
        const displayLang = SUPPORTED_CODE_LANGUAGES[rawLang] || SUPPORTED_CODE_LANGUAGES[canonicalLang] || 'Plaintext';
        return `<figure class="md-code-block"><figcaption>${displayLang}</figcaption><pre><code>${highlightCode(canonicalLang, code.replace(/\n$/, ''))}</code></pre></figure>`;
    }

    function stashCodeFences(text, stash) {
        let renderedText = text.replace(/```([^\n`]*)\n?([\s\S]*?)```/g, function (match, lang, code) {
            const token = `\uE000CODE${stash.length}\uE000`;
            stash.push(buildCodeFenceHtml(lang, code));
            return token;
        });

        renderedText = renderedText.replace(/```([^\n`]*)\n?([\s\S]*)$/g, function (match, lang, code) {
            const token = `\uE000CODE${stash.length}\uE000`;
            stash.push(buildCodeFenceHtml(lang, code));
            return token;
        });

        return renderedText;
    }

    function stashMathBlocks(text, stash) {
        return text.replace(/\$\$([\s\S]+?)\$\$/g, function (match, latex) {
            const token = `\uE000MATH${stash.length}\uE000`;
            stash.push(`<div class="md-math-block">${renderKatex(unescapeBasicEntities(latex.trim()), true)}</div>`);
            return token;
        });
    }

    function restoreStash(html, stash, prefix) {
        return html.replace(new RegExp(`\\uE000${prefix}(\\d+)\\uE000`, 'g'), function (match, index) {
            return stash[Number(index)] || match;
        });
    }

    function renderInlineMarkdown(text) {
        const codeStash = [];
        const mathStash = [];
        let html = text;

        html = html.replace(/``([^`\n]+)``|`([^`\n]+)`/g, function (match, doubleCode, singleCode) {
            const token = `\uE000ICODE${codeStash.length}\uE000`;
            const code = doubleCode || singleCode || '';
            codeStash.push(`<code class="md-inline-code">${code}</code>`);
            return token;
        });

        html = html.replace(/\$([^\n$]+?)\$/g, function (match, latex) {
            const token = `\uE000IMATH${mathStash.length}\uE000`;
            mathStash.push(`<span class="md-inline-math">${renderKatex(unescapeBasicEntities(latex.trim()), false)}</span>`);
            return token;
        });

        html = html.replace(/!\[([^\]]*)\]\(([^)]*)\)/g, '![$1]($2)');
        html = html.replace(/(^|[^!])\[([^\]]+)\]\(([^)\s]+)\)/g, function (match, prefix, label, url) {
            const safeUrl = sanitizeUrl(url);
            if (!safeUrl) return match;
            return `${prefix}${renderLink(label, safeUrl)}`;
        });

        html = html.replace(/(^|[^*])\*{3,}([^\n]+?)\*{3,}(?!\*)/g, '$1<span class="md-bold-italic">$2</span>');
        html = html.replace(/(^|[^*])\*\*([^\n]+?)\*\*(?!\*)/g, '$1<strong>$2</strong>');
        html = html.replace(/(^|[^*])\*([^*\n]+?)\*(?!\*)/g, '$1<em>$2</em>');
        html = html.replace(/(^|[^_])_{3,}([^\n]+?)_{3,}(?!_)/g, '$1<span class="md-bold-italic">$2</span>');
        html = html.replace(/(^|[^_])__([^\n]+?)__(?!_)/g, '$1<strong>$2</strong>');
        html = html.replace(/(^|[^_])_([^_\n]+?)_(?!_)/g, '$1<em>$2</em>');
        html = html.replace(/~~([^~\n]+)~~/g, '<del>$1</del>');

        html = restoreStash(html, codeStash, 'ICODE');
        html = restoreStash(html, mathStash, 'IMATH');
        return html;
    }

    function unescapeBasicEntities(text) {
        return String(text || '')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'");
    }

    function renderMarkdownBlocks(escapedText) {
        const codeStash = [];
        const mathStash = [];
        const lines = stashMathBlocks(stashCodeFences(escapedText, codeStash), mathStash).split(/\r?\n/);
        const out = [];
        let i = 0;

        function renderParagraph(parts) {
            out.push(`<p>${renderInlineMarkdown(parts.join('<br>'))}</p>`);
        }

        while (i < lines.length) {
            const line = lines[i];
            if (!line.trim()) {
                i++;
                continue;
            }

            const codeToken = line.match(/^\uE000CODE\d+\uE000$/);
            const mathToken = line.match(/^\uE000MATH\d+\uE000$/);
            if (codeToken || mathToken) {
                out.push(line);
                i++;
                continue;
            }

            const heading = line.match(/^(#{1,6})\s+(.+)$/);
            if (heading) {
                const level = heading[1].length;
                out.push(`<h${level} class="md-heading">${renderInlineMarkdown(heading[2])}</h${level}>`);
                i++;
                continue;
            }

            if (/^\s*(-{3,}|\*{3,}|_{3,})\s*$/.test(line)) {
                out.push('<hr class="md-hr">');
                i++;
                continue;
            }

            if (/^&gt;\s?/.test(line)) {
                const quoteLines = [];
                while (i < lines.length && /^&gt;\s?/.test(lines[i])) {
                    quoteLines.push(lines[i].replace(/^&gt;\s?/, ''));
                    i++;
                }
                out.push(`<blockquote>${quoteLines.map(renderInlineMarkdown).join('<br>')}</blockquote>`);
                continue;
            }

            if (/^\s*[-+*]\s+/.test(line)) {
                const items = [];
                while (i < lines.length && /^\s*[-+*]\s+/.test(lines[i])) {
                    items.push(`<li>${renderInlineMarkdown(lines[i].replace(/^\s*[-+*]\s+/, ''))}</li>`);
                    i++;
                }
                out.push(`<ul>${items.join('')}</ul>`);
                continue;
            }

            if (/^\s*\d+\.\s+/.test(line)) {
                const items = [];
                while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
                    items.push(`<li>${renderInlineMarkdown(lines[i].replace(/^\s*\d+\.\s+/, ''))}</li>`);
                    i++;
                }
                out.push(`<ol>${items.join('')}</ol>`);
                continue;
            }

            const paragraph = [];
            while (i < lines.length && lines[i].trim() && !/^(#{1,6})\s+/.test(lines[i]) && !/^&gt;\s?/.test(lines[i]) && !/^\s*[-+*]\s+/.test(lines[i]) && !/^\s*\d+\.\s+/.test(lines[i]) && !/^\uE000(?:CODE|MATH)\d+\uE000$/.test(lines[i])) {
                paragraph.push(lines[i]);
                i++;
            }
            renderParagraph(paragraph);
        }

        return restoreStash(restoreStash(out.join(''), codeStash, 'CODE'), mathStash, 'MATH');
    }

    function renderCustomCommands(html) {
        if (!html || !shouldRenderCommand('__all__')) return html || '';
        const regex = /([\\/\.])(\1)?(link|b|italic|code|subt)\[((?:[^\[\]]|\[[^\]]*\])*?)\](?:\((.*?)\))?/g;

        return html.replace(regex, function (match, p1, p2, command, innerText, url) {
            if (p2) {
                const safeUrl = url ? `(${url})` : '';
                return `${p1}${command}[${innerText}]${safeUrl}`;
            }
            if (!shouldRenderCommand(command)) return match;

            if (command === 'link') {
                const safeUrl = sanitizeUrl(url);
                if (innerText === '' && !url) return match;
                if (!safeUrl) return match;
                return renderLink(innerText, safeUrl);
            }
            if (command === 'b') return `<span style="font-weight: bold;">${innerText}</span>`;
            if (command === 'italic') return `<em>${innerText}</em>`;
            if (command === 'code') return `<code class="md-inline-code">${innerText}</code>`;
            if (command === 'subt') return `<span style="display: block; font-size: 1.17em; font-weight: bold; margin: 1em 0;">${innerText}</span>`;
            return match;
        });
    }

    function highlightOrderedMarkers(html) {
        return html.replace(/(^|\n)([ \t]*)(\d+\.)/g, '$1$2<span class="post-list-marker">$3</span>');
    }

    function protectRenderedMarkdownHtml(html, callback) {
        const stash = [];
        const protectedHtml = html.replace(/<figure class="md-code-block">[\s\S]*?<\/figure>|<code class="md-inline-code">[\s\S]*?<\/code>|<span class="md-inline-math">[\s\S]*?<\/span>|<div class="md-math-block">[\s\S]*?<\/div>/g, function (match) {
            const token = `\uE000HTML${stash.length}\uE000`;
            stash.push(match);
            return token;
        });
        return callback(protectedHtml).replace(/\uE000HTML(\d+)\uE000/g, function (match, index) {
            return stash[Number(index)] || match;
        });
    }

    /* buildPreviewSource
    用途：为首页和用户页生成适合卡片展示的 Markdown 预览文本。
    原理：普通正文仍按字数截断；一旦遇到 Markdown 标题或代码块，就停在这个块之前，避免首页卡片被大标题或代码块撑得很长。
    */
    function buildPreviewSource(source, options, markdownEnabled) {
        const limit = Number(options.previewLength) || 0;
        if (!limit && !options.stopPreviewAtBlocks) {
            return { source, truncated: false };
        }
        if (!markdownEnabled || !options.stopPreviewAtBlocks) {
            return {
                source: limit ? source.substring(0, limit) : source,
                truncated: Boolean(limit && source.length > limit)
            };
        }

        const lines = source.split(/\r?\n/);
        const previewLines = [];
        let lengthSoFar = 0;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const lineWithBreak = i < lines.length - 1 ? `${line}\n` : line;

            if (/^(#{1,6})\s+/.test(line)) {
                return {
                    source: previewLines.join('\n'),
                    truncated: true
                };
            }

            if (/^\s*```/.test(line)) {
                return {
                    source: previewLines.join('\n'),
                    truncated: true
                };
            }

            if (limit && lengthSoFar + lineWithBreak.length > limit) {
                const remainingLength = Math.max(limit - lengthSoFar, 0);
                if (remainingLength > 0) previewLines.push(lineWithBreak.slice(0, remainingLength));
                return {
                    source: previewLines.join('\n'),
                    truncated: true
                };
            }

            previewLines.push(line);
            lengthSoFar += lineWithBreak.length;
        }

        return {
            source: previewLines.join('\n'),
            truncated: false
        };
    }

    function renderPost(text, options = {}) {
        const parsed = stripEnableMarkdownCommand(text);
        const markdownEnabled = parsed.enabled && !(typeof window.isRawTextRenderingMode === 'function' && window.isRawTextRenderingMode());
        const preview = buildPreviewSource(parsed.source, options, markdownEnabled);
        let html = escapeHTML(preview.source);
        html = markdownEnabled ? renderMarkdownBlocks(html) : html;
        html = protectRenderedMarkdownHtml(html, renderCustomCommands);
        html = protectRenderedMarkdownHtml(html, highlightOrderedMarkers);
        return {
            enabled: markdownEnabled,
            source: parsed.source,
            previewSource: preview.source,
            previewTruncated: preview.truncated,
            html
        };
    }

    function renderCustomOnly(text) {
        return renderCustomCommands(escapeHTML(text || ''));
    }

    return {
        renderPost,
        renderCustomOnly,
        renderCustomCommands,
        stripEnableMarkdownCommand,
        sanitizeUrl
    };
})();
