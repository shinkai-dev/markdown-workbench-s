window.MarkdownViewer = window.MarkdownViewer || {};
(function (M) {
  var MERMAID_TOKEN_PREFIX = 'MVMERMAIDTOKEN_';

  function normalizeNewlines(text) {
    return String(text || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  }

  // Normalize accidental indentation on Markdown structural lines.
  // This intentionally targets headings and fenced code/Mermaid blocks only,
  // so ordinary paragraph/list indentation is not changed. A fenced block
  // may itself be indented; in that case the same indentation is removed
  // from its fence and contents until the matching closing fence.
  function normalizeIndentedMarkdown(source) {
    var lines = normalizeNewlines(source).split('\n');
    var out = [];
    var fence = null;
    var fenceIndent = 0;

    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];

      if (!fence) {
        var fm = line.match(/^[ \t]*(`{3,}|~{3,})(.*)$/);
        if (fm) {
          fence = fm[1].charAt(0);
          fenceIndent = (line.match(/^[ \t]*/) || [''])[0].length;
          out.push(line.slice(fenceIndent));
          continue;
        }

        // ATX headings are structural Markdown. Accept any accidental leading
        // spaces so copied/indented documentation still renders as headings.
        var hm = line.match(/^[ \t]+(#{1,10})[ \t]+(.*)$/);
        if (hm) {
          out.push(hm[1] + ' ' + hm[2]);
          continue;
        }

        out.push(line);
        continue;
      }

      var stripped = line;
      var prefix = line.match(/^[ \t]*/);
      var available = prefix ? prefix[0].length : 0;
      var remove = Math.min(fenceIndent, available);
      stripped = line.slice(remove);

      // Closing fence: allow additional indentation, but normalize it to the
      // same column as the opening fence.
      var closeRe = new RegExp('^' + fence + '{3,}[ \t]*$');
      if (closeRe.test(stripped)) {
        out.push(stripped);
        fence = null;
        fenceIndent = 0;
      } else {
        out.push(stripped);
      }
    }
    return out.join('\n');
  }

  function escapeHtml(text) {
    return String(text == null ? '' : text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // Extract Mermaid BEFORE marked sees the source. We intentionally do not
  // put Mermaid SVG/HTML through marked or DOMPurify.
  function extractMermaid(source) {
    var list = [];
    var text = normalizeNewlines(source);
    var re = /^```[ \t]*mermaid[ \t]*\n([\s\S]*?)\n```[ \t]*(?=\n|$)/gmi;
    var replaced = text.replace(re, function (_, code) {
      var index = list.length;
      list.push(code.replace(/\n$/, ''));
      return '\n' + MERMAID_TOKEN_PREFIX + index + '\n';
    });
    return { markdown: replaced, mermaids: list };
  }

  // Extend ATX-style headings to level 7-10. Standard Markdown/marked supports h1-h6;
  // levels 7-10 are represented visually/semantically as h6 with an explicit
  // aria-level marker so the TOC can still preserve the requested hierarchy.
  function normalizeDeepHeadings(source) {
    return normalizeNewlines(source).replace(/^(#{7,10})[ \t]+(.+)$/gm, function (_, hashes, text) {
      var level = hashes.length;
      return '###### MV_HEADING_LEVEL_' + level + '_TOKEN ' + text;
    });
  }

  function wrapTables(html) {
    html = html.replace(/<table>/g, '<table class="raw-md-table">');
    return html.replace(/<table class="raw-md-table">([\s\S]*?)<\/table>/g, function (_, inside) {
      return '<div class="md-table-block">' +
        '<div class="table-toolbar">' +
        '<span class="table-label">Table</span>' +
        '<button type="button" class="table-toggle" data-action="toggle-column" aria-pressed="false">先頭列固定</button>' +
        '<button type="button" class="table-toggle" data-action="toggle-header" aria-pressed="false">先頭行固定</button>' +
        '<button type="button" class="table-toggle" data-action="toggle-both" aria-pressed="false">両方固定</button>' +
        '<button type="button" class="toolbar-btn" data-action="reset-columns">列幅リセット</button>' +
        '<button type="button" class="toolbar-btn" data-action="reset-size">表サイズリセット</button>' +
        '<button type="button" class="toolbar-btn" data-action="copy-table">コピー</button>' +
        '<button type="button" class="toolbar-btn" data-action="export-csv">CSV</button>' +
        '</div>' +
        '<div class="table-scroll"><table>' + inside + '</table></div>' +
        '<div class="table-right-resizer" role="separator" aria-label="表の横幅を変更" tabindex="0"></div>' +
        '<div class="table-resize-handle" role="separator" aria-label="表の幅と高さを変更" tabindex="0"></div>' +
        '</div>';
    });
  }

  function decodeHtml(text) {
    var ta = document.createElement('textarea');
    ta.innerHTML = String(text || '');
    return ta.value;
  }

  function highlightCode(rawHtml, language) {
    var source = decodeHtml(rawHtml);
    var lang = String(language || 'text').toLowerCase().trim().split(/[ :]/)[0];
    var aliases = {
      js:'javascript', jsx:'javascript', ts:'typescript', tsx:'typescript', py:'python',
      sh:'bash', shell:'bash', yml:'yaml', md:'markdown', html:'xml', xhtml:'xml',
      c:'c', 'c++':'cpp', cc:'cpp', cxx:'cpp', cs:'csharp', 'c#':'csharp'
    };
    lang = aliases[lang] || lang || 'text';

    var sets = {
      python: 'and as assert async await break case class continue def del elif else except finally for from global if import in is lambda match nonlocal not or pass raise return try while with yield'.split(' '),
      javascript: 'as async await break case catch class const continue debugger default delete do else export extends finally for from function get if import in instanceof let new of return set static super switch this throw try typeof var void while with yield'.split(' '),
      typescript: 'as async await break case catch class const continue debugger default delete do else export extends finally for from function get if import in interface instanceof let namespace new of private protected public readonly return set static super switch this throw try type typeof var void while with yield'.split(' '),
      java: 'abstract assert boolean break byte case catch char class const continue default do double else enum extends final finally float for if implements import instanceof int interface long native new package private protected public return short static strictfp super switch synchronized this throw throws transient try void volatile while'.split(' '),
      csharp: 'abstract as base bool break byte case catch char checked class const continue decimal default delegate do double else enum event explicit extern false finally fixed float for foreach goto if implicit in int interface internal is lock long namespace new null object operator out override params private protected public readonly ref return sbyte sealed short sizeof stackalloc static string struct switch this throw true try typeof uint ulong unchecked unsafe ushort using virtual void volatile while'.split(' '),
      cpp: 'alignas alignof asm auto bool break case catch char class const constexpr continue default delete do double else enum explicit export extern false float for friend if inline int long namespace new nullptr operator private protected public register return short signed sizeof static struct switch template this throw true try typedef typename union unsigned using virtual void volatile while'.split(' '),
      sql: 'select from where and or not insert into update delete create alter drop table join inner left right full outer on as group by order having limit offset distinct union all null is like in exists case when then else end asc desc'.split(' '),
      bash: 'if then else elif fi for while in do done case esac function select time until coproc return export local readonly declare unset true false'.split(' '),
      xml: 'DOCTYPE'.split(' '),
      css: 'important'.split(' ')
    };
    var keywords = Object.create(null);
    (sets[lang] || []).forEach(function(k){ keywords[k] = true; });
    var literals = { 'true':1, 'false':1, 'null':1, 'undefined':1, 'None':1, 'True':1, 'False':1, 'nil':1, 'NULL':1, 'NaN':1 };
    var builtins = {
      python: 'print len range str int float list dict set tuple open super self'.split(' '),
      javascript: 'console Math JSON Promise Array Object String Number Boolean Date RegExp Error Map Set'.split(' '),
      typescript: 'console Math JSON Promise Array Object String Number Boolean Date RegExp Error Map Set'.split(' '),
      java: 'System String Integer Boolean Double Math List Map Set'.split(' '),
      csharp: 'Console String Int32 Boolean Double List Dictionary Task'.split(' ')
    };
    var builtinSet = Object.create(null);
    (builtins[lang] || []).forEach(function(k){ builtinSet[k] = true; });

    function esc(x) { return escapeHtml(x); }
    function sp(cls, x) {
      var css = {
        keyword: 'var(--mv-code-keyword)',
        string: 'var(--mv-code-string)',
        comment: 'var(--mv-code-comment)',
        number: 'var(--mv-code-number)',
        literal: 'var(--mv-code-literal)',
        built_in: 'var(--mv-code-builtin)',
        'title class_': 'var(--mv-code-class)',
        'title function_': 'var(--mv-code-function)',
        variable: 'var(--mv-code-variable)',
        params: 'var(--mv-code-variable)',
        operator: 'var(--mv-code-operator)',
        punctuation: 'var(--mv-code-punctuation)',
        meta: 'var(--mv-code-meta)'
      };
      var color = css[cls] || 'var(--mv-code-fg)';
      return '<span class="hljs-' + cls + '" style="color:' + color + '">' + esc(x) + '</span>';
    }

    function lineLexer(line) {
      var out = '', i = 0, expectClass = false, expectFunction = false;
      while (i < line.length) {
        var rest = line.slice(i), ch = rest.charAt(0), m;

        if ((lang === 'python' || lang === 'bash') && ch === '#') {
          out += sp('comment', rest); break;
        }
        if ((lang === 'javascript' || lang === 'typescript' || lang === 'java' || lang === 'csharp' || lang === 'cpp' || lang === 'c') && rest.indexOf('//') === 0) {
          out += sp('comment', rest); break;
        }
        if ((lang === 'sql') && rest.indexOf('--') === 0) {
          out += sp('comment', rest); break;
        }
        if ((lang === 'python') && rest.indexOf('"""') === 0) {
          var q3 = rest.indexOf('"""', 3); q3 = q3 < 0 ? rest.length : q3 + 3; out += sp('string', rest.slice(0,q3)); i += q3; continue;
        }
        if ((lang === 'python') && rest.indexOf("'''") === 0) {
          var q3s = rest.indexOf("'''", 3); q3s = q3s < 0 ? rest.length : q3s + 3; out += sp('string', rest.slice(0,q3s)); i += q3s; continue;
        }
        if (ch === '"' || ch === "'") {
          var q = ch, j = 1, escd = false;
          for (; j < rest.length; j++) {
            var c = rest.charAt(j);
            if (!escd && c === q) { j++; break; }
            if (!escd && c === '\\') escd = true; else escd = false;
          }
          out += sp('string', rest.slice(0,j)); i += j; continue;
        }
        if ((lang === 'javascript' || lang === 'typescript') && ch === '`') {
          var bt = 1, besc = false;
          for (; bt < rest.length; bt++) { var bc = rest.charAt(bt); if (!besc && bc === '`') { bt++; break; } if (!besc && bc === '\\') besc=true; else besc=false; }
          out += sp('string', rest.slice(0,bt)); i += bt; continue;
        }
        m = rest.match(/^(?:0x[0-9a-fA-F]+|0b[01]+|\b\d+(?:\.\d+)?(?:[eE][+-]?\d+)?\b)/);
        if (m) { out += sp('number', m[0]); i += m[0].length; continue; }
        m = rest.match(/^[A-Za-z_$][\w$]*/);
        if (m) {
          var word = m[0], cls = '';
          if (expectClass) { cls = 'title class_'; expectClass = false; }
          else if (expectFunction) { cls = 'title function_'; expectFunction = false; }
          else if (keywords[word]) { cls = 'keyword'; if (word === 'class' || word === 'interface' || word === 'struct' || word === 'enum') expectClass = true; if (word === 'def' || word === 'function') expectFunction = true; }
          else if (literals[word]) cls = 'literal';
          else if (builtinSet[word]) cls = 'built_in';
          else if (/^(true|false|null|undefined|None|True|False|nil|NULL|NaN)$/.test(word)) cls = 'literal';
          else if (/^\s*\(/.test(rest.slice(word.length))) cls = 'title function_';
          out += cls ? sp(cls, word) : esc(word);
          i += word.length; continue;
        }
        if (/^[{}[\]();,.]/.test(rest)) { out += sp('punctuation', ch); i++; continue; }
        if (/^[+\-*\/%=!<>:&|?~^]+/.test(rest)) { m = rest.match(/^[+\-*\/%=!<>:&|?~^]+/); out += sp('operator', m[0]); i += m[0].length; continue; }
        out += esc(ch); i++;
      }
      return out;
    }
    return source.split('\n').map(lineLexer).join('\n');
  }
  // Final DOM-side code enhancement. This is intentionally independent from
  // the Markdown HTML regex pass so code highlighting still works if a future
  // marked/highlight combination changes the exact <pre><code> serialization.
  M.enhanceCodeBlocks = function (root) {
    if (!root) return;
    var codes = root.querySelectorAll('pre > code');
    for (var i = 0; i < codes.length; i++) {
      var code = codes[i];
      var pre = code.parentElement;
      var langMatch = String(code.className || '').match(/(?:^|\\s)language-([^\\s]+)/i);
      var lang = langMatch ? langMatch[1] : 'text';
      var wrapper = pre.closest('.code-wrap');
      var highlighted = highlightCode(code.textContent || '', lang);

      // Always replace the code content from plain text. This prevents a
      // previous failed/highlighted HTML result from being double-escaped.
      code.innerHTML = highlighted;
      code.setAttribute('data-highlighted', 'true');

      if (!wrapper) {
        wrapper = document.createElement('div');
        wrapper.className = 'code-wrap';
        wrapper.setAttribute('data-code-language', lang);

        var head = document.createElement('div');
        head.className = 'code-head';
        head.innerHTML = '<span class="code-lang"></span><span class="spacer"></span>' +
          '<button type="button" class="toolbar-btn code-copy">'+M.t('codeCopy')+'</button>' +
          '<button type="button" class="toolbar-btn code-wrap-toggle" aria-pressed="false">'+M.t('codeWrap')+'</button>' +
          '<button type="button" class="toolbar-btn code-collapse" aria-expanded="true">'+M.t('codeCollapse')+'</button>';
        head.querySelector('.code-lang').textContent = lang;

        pre.parentNode.insertBefore(wrapper, pre);
        wrapper.appendChild(head);
        wrapper.appendChild(pre);
      }
    }
  };

  M.refreshCodeText = function () {
    document.querySelectorAll('.code-wrap').forEach(function (wrap) {
      var copy = wrap.querySelector('.code-copy'); if (copy) { copy.textContent = M.t('codeCopy'); copy.title = M.t('codeCopy'); copy.setAttribute('aria-label', M.t('codeCopy')); }
      var toggle = wrap.querySelector('.code-wrap-toggle'); if (toggle) { toggle.textContent = M.t('codeWrap'); toggle.title = M.t('codeWrap'); toggle.setAttribute('aria-label', M.t('codeWrap')); }
      var collapse = wrap.querySelector('.code-collapse'); if (collapse) { var expanded = collapse.getAttribute('aria-expanded') !== 'false'; collapse.textContent = expanded ? M.t('codeCollapse') : M.t('codeExpand'); collapse.title = expanded ? M.t('codeCollapse') : M.t('codeExpand'); collapse.setAttribute('aria-label', expanded ? M.t('codeCollapse') : M.t('codeExpand')); }
    });
  };

  function wrapCodeBlocks(html) {
    return html.replace(/<pre><code([^>]*)>([\s\S]*?)<\/code><\/pre>/g, function (_, attrs, code) {
      var m = String(attrs || '').match(/class=["']language-([^"']+)["']/i);
      var safeLang = m ? m[1] : 'text';
      var highlighted = highlightCode(code, safeLang);
      return '<div class="code-wrap" data-code-language="' + escapeHtml(safeLang) + '"><div class="code-head"><span class="code-lang">' +
        escapeHtml(safeLang) +
        '</span><span class="spacer"></span>' +
        '<button type="button" class="toolbar-btn code-copy">'+M.t('codeCopy')+'</button>' +
        '<button type="button" class="toolbar-btn code-wrap-toggle" aria-pressed="false">'+M.t('codeWrap')+'</button>' +
        '<button type="button" class="toolbar-btn code-collapse" aria-expanded="true">'+M.t('codeCollapse')+'</button>' +
        '</div><pre><code class="language-' + escapeHtml(safeLang) + '">' + highlighted + '</code></pre></div>';
    });
  }

  function injectMermaidPlaceholders(html, sources) {
    for (var i = 0; i < sources.length; i++) {
      var token = MERMAID_TOKEN_PREFIX + i;
      var placeholder = '<div class="mv-mermaid-placeholder" data-mermaid-index="' + i + '">' +
        '<textarea class="mv-mermaid-source-data" hidden>' + escapeHtml(sources[i]) + '</textarea>' +
        '</div>';
      var p = new RegExp('<p>\\s*' + token + '\\s*<\\/p>', 'g');
      var raw = new RegExp(token, 'g');
      if (p.test(html)) {
        html = html.replace(p, placeholder);
      } else {
        html = html.replace(raw, placeholder);
      }
    }
    return html;
  }

  M.renderMarkdown = function (source) {
    if (!window.marked) throw new Error('Markdownライブラリが読み込まれていません');
    if (!window.DOMPurify) throw new Error('サニタイズライブラリが読み込まれていません');

    var normalizedSource = normalizeIndentedMarkdown(source);
    var extracted = extractMermaid(normalizedSource);
    var markdownForMarked = normalizeDeepHeadings(extracted.markdown);
    var html = marked.parse(markdownForMarked, {
      gfm: true,
      breaks: true,
      headerIds: true,
      mangle: false
    });

    // Sanitize ordinary Markdown first. Mermaid has not entered the DOM yet.
    html = DOMPurify.sanitize(html, {
      USE_PROFILES: { html: true }
    });

    // Promote h6 placeholders to logical levels 7-10 after sanitization.
    // Keeping a real h6 element preserves browser heading behavior while the
    // data attribute/aria-level carries the extended hierarchy.
    html = html.replace(/<h6([^>]*)>\s*MV_HEADING_LEVEL_(7|8|9|10)_TOKEN\s*([\s\S]*?)<\/h6>/gi, function (_, attrs, level, body) {
      return '<h6' + attrs + ' data-heading-level="' + level + '" aria-level="' + level + '">' + body + '</h6>';
    });

    // Only after sanitization do we insert our inert Mermaid placeholders.
    // The source is stored as textarea text, never as executable HTML.
    html = injectMermaidPlaceholders(html, extracted.mermaids);
    html = wrapCodeBlocks(html);
    html = wrapTables(html);
    return html;
  };
})(window.MarkdownViewer);
