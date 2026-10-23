window.MarkdownViewer = window.MarkdownViewer || {
};
(function(M) {
  function escapeHtml(text) {
    return String(text == null ? '' : text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function normalizeNewlines(text) {
    return String(text || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  }
  // Rendering must not rewrite ordinary Markdown source. Only line endings are normalized.
  function normalizeIndentedMarkdown(source) {
    return normalizeNewlines(source);
  }
  // Language identifiers are machine-friendly in Markdown, but the toolbar
  // should show readable, official language names instead of abbreviations.
  function languageDisplayName(language) {
    var raw = String(language || '').toLowerCase().trim().split(/[\s,:{]/)[0];
    var aliases = {
      js: 'javascript', jsx: 'javascript', mjs: 'javascript', cjs: 'javascript',
      ts: 'typescript', tsx: 'typescript', py: 'python', python3: 'python',
      cs: 'csharp', 'c#': 'csharp', 'c-sharp': 'csharp', csharp: 'csharp',
      'c++': 'cpp', cc: 'cpp', cxx: 'cpp', hpp: 'cpp', hxx: 'cpp',
      'objective-c': 'objectivec', objc: 'objectivec',
      sh: 'bash', shell: 'bash', zsh: 'bash', yml: 'yaml', md: 'markdown',
      html: 'html', htm: 'html', xhtml: 'html', xml: 'xml', svg: 'xml',
      ps1: 'powershell', ps: 'powershell', golang: 'go', rs: 'rust', kt: 'kotlin',
      kts: 'kotlin', swift: 'swift', rb: 'ruby', pl: 'perl', dockerfile: 'dockerfile',
      plaintext: 'text', txt: 'text', text: 'text', '': 'text'
    };
    var canonical = aliases[raw] || raw;
    var names = {
      javascript: 'JavaScript', typescript: 'TypeScript', python: 'Python', java: 'Java',
      csharp: 'C#', c: 'C', cpp: 'C++', objectivec: 'Objective-C', go: 'Go', rust: 'Rust',
      php: 'PHP', ruby: 'Ruby', perl: 'Perl', kotlin: 'Kotlin', swift: 'Swift',
      bash: 'Bash', powershell: 'PowerShell', sql: 'SQL', json: 'JSON', yaml: 'YAML',
      html: 'HTML', xml: 'XML', css: 'CSS', scss: 'SCSS', less: 'Less', markdown: 'Markdown',
      dockerfile: 'Dockerfile', makefile: 'Makefile', diff: 'Diff', ini: 'INI', toml: 'TOML',
      graphql: 'GraphQL', r: 'R', dart: 'Dart', elixir: 'Elixir', scala: 'Scala',
      text: 'Plain Text'
    };
    if (names[canonical]) return names[canonical];
    if (!canonical) return 'Plain Text';
    return canonical.charAt(0).toUpperCase() + canonical.slice(1);
  }
  // The lightweight Markdown parser supports fences at up to three leading
  // spaces. Fences nested in list items commonly have four or more spaces.
  // Replace those fenced blocks with safe tokens before parsing so they remain
  // code blocks instead of being flattened into list text/indented code.
  function protectIndentedListFences(source) {
    var lines = normalizeNewlines(source).split('\n');
    var output = [], blocks = [], prefix = uniqueToken(source, 'MVLISTFENCECODE_');
    var i = 0;
    while (i < lines.length) {
      var opening = lines[i].match(/^( {4,})(`{3,}|~{3,})(.*)$/);
      if (!opening) { output.push(lines[i++]); continue; }
      var fence = opening[2], marker = fence.charAt(0), minimum = fence.length;
      var body = [], j = i + 1, closed = false;
      while (j < lines.length) {
        var close = lines[j].match(/^ *(?:`{3,}|~{3,})[ \t]*$/);
        if (close) {
          var closeFence = close[0].trim();
          if (closeFence.charAt(0) === marker && closeFence.length >= minimum) { closed = true; break; }
        }
        body.push(lines[j]);
        j++;
      }
      if (!closed) { output.push(lines[i++]); continue; }
      var token = prefix + blocks.length + '_TOKEN';
      blocks.push({ token: token, language: (opening[3].trim().split(/[ \t]/)[0] || 'text'), code: body.map(function(line) {
        var indent = opening[1].length;
        return line.slice(0, indent).trim() === '' ? line.slice(Math.min(indent, (line.match(/^ */) || [''])[0].length)) : line.slice(Math.min(indent, (line.match(/^ */) || [''])[0].length));
      }).join('\n') });
      // Keep the token inside the surrounding list item, but do not retain
      // four or more leading spaces: the bundled parser would treat the token
      // itself as an indented code block, causing restored <pre> markup to be
      // displayed literally inside a Plain Text block. The parser accepts up
      // to three leading spaces for a fence inside a list.
      var tokenIndent = opening[1].slice(0, Math.min(3, opening[1].length));
      output.push(tokenIndent + token);
      i = j + 1;
    }
    return { source: output.join('\n'), blocks: blocks, prefix: prefix };
  }
  function restoreIndentedListFences(html, protectedBlocks) {
    if (!protectedBlocks || !protectedBlocks.blocks.length) return html;
    protectedBlocks.blocks.forEach(function(block) {
      var lang = block.language || 'text';
      // Restore as a plain fenced-code equivalent; the common wrapCodeBlocks
      // pass below performs highlighting and builds the toolbar exactly once.
      var replacement = '<pre data-code-lang="' + escapeHtml(lang) + '"><code class="language-' + escapeHtml(lang) + '">' + escapeHtml(block.code) + '</code></pre>';
      var token = block.token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      // If the parser wrapped the placeholder in a paragraph, replace the
      // whole paragraph rather than inserting a <pre> inside <p>.
      html = html.replace(new RegExp('<p>\\s*(?:<br>\\s*)?' + token + '\\s*</p>', 'g'), replacement);
      html = html.replace(new RegExp('(?:<br>\\s*)?' + token, 'g'), replacement);
    });
    return html;
  }
  // Canonicalize the three common HTML line-break spellings outside code.
  // This also applies to table cells, where <br>, <br/> and <br /> should
  // all render as an actual line break. Inline-code spans and fenced code
  // blocks are copied unchanged so examples such as `\u003cbr\u003e` stay literal.
  function normalizeHtmlBreakTags(source) {
    var lines = normalizeNewlines(source).split('\n');
    var out = [];
    var fence = null;
    var inlineTicks = 0;
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      var fenceMatch = line.match(/^ *(`{3,}|~{3,})(.*)$/);
      if (fence) {
        out.push(line);
        var close = line.match(/^ *(`{3,}|~{3,})[ \t]*$/);
        if (close && close[1].charAt(0) === fence.charAt(0) && close[1].length >= fence.length) fence = null;
        continue;
      }
      if (fenceMatch && inlineTicks === 0) {
        fence = fenceMatch[1];
        out.push(line);
        continue;
      }
      var result = '';
      var pos = 0;
      while (pos < line.length) {
        var ch = line.charAt(pos);
        if (ch === '`') {
          var end = pos + 1;
          while (end < line.length && line.charAt(end) === '`') end++;
          var run = end - pos;
          if (!inlineTicks) inlineTicks = run;
          else if (inlineTicks === run) inlineTicks = 0;
          result += line.slice(pos, end);
          pos = end;
          continue;
        }
        if (!inlineTicks && ch === '<') {
          var br = line.slice(pos).match(/^<br\s*\/?>/i);
          if (br) {
            result += '<br>';
            pos += br[0].length;
            continue;
          }
        }
        result += ch;
        pos++;
      }
      out.push(result);
    }
    return out.join('\n');
  }

  // Protect the small set of raw HTML tags supported by this extension from
  // the lightweight Markdown parser. Restore only normalized, allow-listed tags
  // after sanitization so user-supplied attributes/scripts cannot pass through.
  function protectSupportedHtml(source) {
    var tags = [];
    var normalized = normalizeNewlines(source);
    var prefix = uniqueToken(normalized, 'MVHTMLTAGTOKEN_');
    var lines = normalized.split('\n');
    var out = [];
    var fence = null;
    var inlineTicks = 0;
    for (var li = 0; li < lines.length; li++) {
      var line = lines[li];
      var fm = line.match(/^ *(`{3,}|~{3,})(.*)$/);
      if (fence) {
        out.push(line);
        var fc = line.match(/^ *(`{3,}|~{3,})[ \t]*$/);
        if (fc && fc[1].charAt(0) === fence.charAt(0) && fc[1].length >= fence.length) fence = null;
        continue;
      }
      if (fm && inlineTicks === 0) { fence = fm[1]; out.push(line); continue; }
      var result = '';
      var pos = 0;
      while (pos < line.length) {
        if (line.charAt(pos) === '`') {
          var tickEnd = pos + 1;
          while (tickEnd < line.length && line.charAt(tickEnd) === '`') tickEnd++;
          var run = tickEnd - pos;
          if (!inlineTicks) inlineTicks = run;
          else if (inlineTicks === run) inlineTicks = 0;
          result += line.slice(pos, tickEnd); pos = tickEnd; continue;
        }
        if (!inlineTicks && line.charAt(pos) === '<') {
          var match = line.slice(pos).match(/^<(\/?)(div|p|ul|li|br)\b([^>]*)>/i);
          if (match) {
            var name = match[2].toLowerCase();
            var normalizedTag = name === 'br' ? '<br>' : '<' + (match[1] ? '/' : '') + name + '>';
            // Closing BR tags are not meaningful; preserve them as text rather than
            // treating them as a supported structural tag.
            if (!(name === 'br' && match[1])) {
              tags.push(normalizedTag);
              result += prefix + (tags.length - 1) + '_TOKEN';
              pos += match[0].length;
              continue;
            }
          }
        }
        result += line.charAt(pos++);
      }
      out.push(result);
    }
    return { source: out.join('\n'), prefix: prefix, tags: tags };
  }
  function cleanSupportedHtmlLayout(html) {
    // The bundled lightweight Markdown parser treats each source line as a
    // paragraph break. Remove only those synthetic wrappers/breaks that become
    // invalid around restored block-level HTML elements.
    html = html.replace(/<p>\s*(?=<(?:div|ul|p|details)\b)/gi, '');
    html = html.replace(/(<\/(?:div|ul|li|p|details)\s*>)\s*<\/p>/gi, '$1');
    html = html.replace(/<br>\s*(?=<(?:\/?(?:div|p|ul|li|details))\b)/gi, '');
    html = html.replace(/(<(?:\/?(?:div|p|ul|li|details))\b[^>]*>)\s*<br>/gi, '$1');
    return html;
  }
  function restoreSupportedHtml(html, protectedHtml) {
    if (!protectedHtml || !protectedHtml.tags.length) return html;
    for (var i = 0; i < protectedHtml.tags.length; i++) {
      var token = protectedHtml.prefix + i + '_TOKEN';
      html = html.split(token).join(protectedHtml.tags[i]);
    }
    return html;
  }

  function uniqueToken(source, prefix) {
    var text = String(source || '');
    var n = 0;
    var token;
    do {
      token = prefix + n + '_TOKEN';
      n++;
    } while (text.indexOf(token) >= 0);
    return token;
  }
  // Mermaid is extracted structurally so Mermaid syntax is never interpreted as Markdown.
  function extractMermaid(source) {
    var lines = normalizeNewlines(source).split('\n');
    var list = [];
    var out = [];
    var tokenPrefix = uniqueToken(source, 'MVMERMAIDTOKEN_');
    var i = 0;
    while (i < lines.length) {
      var opening = lines[i].match(/^ *(`{3,}|~{3,})[ \t]*mermaid[ \t]*$/i);
      if (!opening) {
        out.push(lines[i]);
        i++;
        continue;
      }
      var start = i;
      var fence = opening[1];
      var ch = fence.charAt(0);
      var min = fence.length;
      var code = [];
      i++;
      var closed = false;
      while (i < lines.length) {
        var close = lines[i].match(/^ *(`{3,}|~{3,})[ \t]*$/);
        if (close && close[1].charAt(0) === ch && close[1].length >= min) {
          i++;
          closed = true;
          break;
        }
        code.push(lines[i]);
        i++;
      }
      if (!closed) {
        for (var ri = start; ri < lines.length; ri++) out.push(lines[ri]);
        break;
      }
      var index = list.length;
      list.push(code.join('\n'));
      out.push(tokenPrefix + index);
    }
    return { markdown: out.join('\n'), mermaids: list, tokenPrefix: tokenPrefix };
  }
  function normalizeDeepHeadings(source) {
    var lines = normalizeNewlines(source).split('\n');
    var out = [];
    var fence = null;
    var prefix = uniqueToken(source, 'MVHEADINGTOKEN_');
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      if (fence) {
        var close = line.match(/^ *(`{3,}|~{3,})[ \t]*$/);
        out.push(line);
        if (close && close[1].charAt(0) === fence.charAt(0) && close[1].length >= fence.length) fence = null;
        continue;
      }
      var fm = line.match(/^ *(`{3,}|~{3,})(.*)$/);
      if (fm) {
        fence = fm[1];
        out.push(line);
        continue;
      }
      var hm = line.match(/^( {0,3})(#{7,10})[ \t]+(.*)$/);
      if (!hm) {
        out.push(line);
        continue;
      }
      var level = hm[2].length;
      out.push('###### ' + prefix + level + ' ' + hm[3]);
    }
    return { markdown: out.join('\n'), tokenPrefix: prefix };
  }
  function wrapTables(html) {
    html = html.replace(/<table>/g, '<table class="raw-md-table">');
    return html.replace(/<table class="raw-md-table">([\s\S]*?)<\/table>/g, function(_, inside) {
      return '<div class="md-table-block">' + '<div class="table-toolbar">' + '<span class="table-label">Table</span>' + '<button type="button" class="table-toggle" data-action="toggle-column" aria-pressed="false">先頭列固定</button>' + '<button type="button" class="table-toggle" data-action="toggle-header" aria-pressed="false">先頭行固定</button>' + '<button type="button" class="table-toggle" data-action="toggle-both" aria-pressed="false">両方固定</button>' + '<button type="button" class="toolbar-btn" data-action="reset-columns">列幅リセット</button>' + '<button type="button" class="toolbar-btn" data-action="reset-size">表サイズリセット</button>' + '<button type="button" class="toolbar-btn" data-action="copy-table">コピー</button>' + '<button type="button" class="toolbar-btn" data-action="export-csv">CSV</button>' + '</div>' + '<div class="table-scroll"><table>' + inside + '</table></div>' + '<div class="table-right-resizer" role="separator" aria-label="表の横幅を変更" tabindex="0"></div>' + '<div class="table-resize-handle" role="separator" aria-label="表の幅と高さを変更" tabindex="0"></div>' + '</div>';
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
      js: 'javascript', jsx: 'javascript', mjs: 'javascript', cjs: 'javascript', ts: 'typescript', tsx: 'typescript', py: 'python', sh: 'bash', shell: 'bash', ps1: 'powershell', yml: 'yaml', md: 'markdown', html: 'xml', xhtml: 'xml', c: 'c', 'c++': 'cpp', cc: 'cpp', cxx: 'cpp', h: 'c', hpp: 'cpp', cs: 'csharp', 'c#': 'csharp', csharp: 'csharp', golang: 'go', rs: 'rust', kt: 'kotlin', kts: 'kotlin', swift: 'swift', sqlserver: 'sql', tsql: 'sql', hs: 'haskell', lua: 'lua', pl: 'perl', perl: 'perl', r: 'r'
    };
    lang = aliases[lang] || lang || 'text';
    var sets = {
      python: 'and as assert async await break case class continue def del elif else except finally for from global if import in is lambda match nonlocal not or pass raise return try while with yield'.split(' '), javascript: 'as async await break case catch class const continue debugger default delete do else export extends finally for from function get if import in instanceof let new of return set static super switch this throw try typeof var void while with yield'.split(' '), typescript: 'abstract any as asserts async await boolean break case catch class const constructor declare debugger default delete do else export extends finally for from function get if implements import in infer instanceof interface is keyof let module namespace never new number object of override private protected public readonly require return satisfies set static string super switch symbol this throw type typeof undefined unique unknown var void while with yield'.split(' '), java: 'abstract assert boolean break byte case catch char class const continue default do double else enum extends final finally float for if implements import instanceof int interface long native new package private protected public record return sealed permits short static strictfp super switch synchronized this throw throws transient try var void volatile while'.split(' '), csharp: 'abstract as async await base bool break byte case catch char checked class const continue decimal default delegate do double else enum event explicit extern false finally fixed float for foreach get global if implicit in init int interface internal is lock long namespace new nint notnull null object operator out override params private protected public record required ref return sbyte sealed set short sizeof stackalloc static string struct switch this throw true try typeof uint ulong unchecked unsafe ushort using var virtual void volatile while'.split(' '), cpp: 'alignas alignof asm auto bool break case catch char class const constexpr continue default delete do double else enum explicit export extern false float for friend if inline int long namespace new nullptr operator private protected public register return short signed sizeof static struct switch template this throw true try typedef typename union unsigned using virtual void volatile while import module concept requires co_await co_return co_yield'.split(' '), sql: 'select from where and or not insert into update delete create alter drop table join inner left right full outer on as group by order having limit offset distinct union all null is like in exists case when then else end asc desc'.split(' '), bash: 'if then else elif fi for while in do done case esac function select time until coproc return export local readonly declare unset true false'.split(' '), xml: 'DOCTYPE'.split(' '), css: 'important'.split(' '), go: 'break case chan const continue default defer else fallthrough for func go goto if import interface map package range return select struct switch type var any comparable error iota'.split(' '), rust: 'as async await break const continue crate dyn else enum extern false fn for if impl in let loop match mod move mut pub ref return self Self static struct super trait true type unsafe use where while pub'.split(' '), php: 'abstract and array as break callable case catch class clone const continue declare default die do echo else elseif empty enddeclare endfor endforeach endif endswitch endwhile eval exit extends final finally fn for foreach function global goto if implements include include_once instanceof insteadof interface isset list namespace new or print private protected public require require_once return static switch throw trait try unset use var while xor yield'.split(' '), kotlin: 'as break class continue do else false for fun if in interface is null object package return super this throw true try typealias typeof val var when while import'.split(' '), swift: 'associatedtype class deinit enum extension fileprivate func import init inout internal let open operator private protocol public rethrows static struct subscript typealias var break case continue default defer do else fallthrough for guard if repeat return throw switch where while'.split(' '), powershell: 'begin break catch class continue data define do dynamicparam else elseif end endfor endfunction endif endprocess endregion endswitch endtry exit filter finally for foreach from function if in param process return switch throw trap try until using var while'.split(' '), ruby: 'alias and begin break case class def defined do else elsif end ensure false for if in module next nil not or redo rescue retry return self super then true undef unless until when while yield require'.split(' ')
    };
    var keywords = Object.create(null);
    (sets[lang] ||[]).forEach(function(k) {
      keywords[k] = true;
    });
    var literals = {
      'true': 1, 'false': 1, 'null': 1, 'undefined': 1, 'None': 1, 'True': 1, 'False': 1, 'nil': 1, 'NULL': 1, 'NaN': 1
    };
    var builtins = {
      python: 'print len range str int float list dict set tuple open super self'.split(' '), javascript: 'console Math JSON Promise Array Object String Number Boolean Date RegExp Error Map Set'.split(' '), typescript: 'console Math JSON Promise Array Object String Number Boolean Date RegExp Error Map Set'.split(' '), java: 'System String Integer Boolean Double Math List Map Set'.split(' '), csharp: 'Console String Int32 Boolean Double List Dictionary Task'.split(' '), cpp: 'std cout cin cerr endl string vector map set unique_ptr shared_ptr size_t'.split(' '), c: 'printf fprintf snprintf scanf malloc calloc realloc free size_t NULL'.split(' '), go: 'append cap close copy delete len make new panic print println recover'.split(' '), rust: 'Some None Ok Err Vec String Option Result Box println format'.split(' '), php: 'echo print var_dump count array_map'.split(' '), kotlin: 'println listOf mutableListOf mapOf runCatching'.split(' '), swift: 'print guard let var'.split(' ')
    };
    var builtinSet = Object.create(null);
    var inBlockComment = false;
    (builtins[lang] ||[]).forEach(function(k) {
      builtinSet[k] = true;
    });
    function esc(x) {
      return escapeHtml(x);
    }
    function sp(cls, x) {
      var css = {
        keyword: 'var(--mv-code-keyword)', string: 'var(--mv-code-string)', comment: 'var(--mv-code-comment)', number: 'var(--mv-code-number)', literal: 'var(--mv-code-literal)', built_in: 'var(--mv-code-builtin)', 'title class_': 'var(--mv-code-class)', 'title function_': 'var(--mv-code-function)', variable: 'var(--mv-code-variable)', params: 'var(--mv-code-variable)', operator: 'var(--mv-code-operator)', punctuation: 'var(--mv-code-punctuation)', meta: 'var(--mv-code-meta)'
      };
      var color = css[cls] || 'var(--mv-code-fg)';
      return '<span class="hljs-' + cls + '" style="color:' + color + '">' + esc(x) + '</span>';
    }
    function lineLexer(line) {
      var out = '', i = 0, expectClass = false, expectFunction = false;
      while (i < line.length) {
        var rest = line.slice(i), ch = rest.charAt(0), m;
        if (inBlockComment) {
          var blockEnd = rest.indexOf('*/');
          if (blockEnd < 0) { out += sp('comment', rest); break; }
          out += sp('comment', rest.slice(0, blockEnd + 2));
          i += blockEnd + 2;
          inBlockComment = false;
          continue;
        }
        if ((lang === 'javascript' || lang === 'typescript' || lang === 'java' || lang === 'csharp' || lang === 'cpp' || lang === 'c' || lang === 'css' || lang === 'go' || lang === 'rust' || lang === 'php' || lang === 'kotlin' || lang === 'swift') && rest.indexOf('/*') === 0) {
          var blockEndNow = rest.indexOf('*/', 2);
          if (blockEndNow < 0) { out += sp('comment', rest); inBlockComment = true; break; }
          out += sp('comment', rest.slice(0, blockEndNow + 2));
          i += blockEndNow + 2;
          continue;
        }
        if ((lang === 'c' || lang === 'cpp') && ch === '#' && line.slice(0, i).trim() === '') {
          out += sp('meta', rest);
          break;
        }
        if ((lang === 'python' || lang === 'bash' || lang === 'ruby' || lang === 'yaml' || lang === 'powershell' || lang === 'r') && ch === '#') {
          out += sp('comment', rest);
          break;
        }
        // Recognize line-comment markers before token/operator parsing. Keep
        // the language groups explicit so TypeScript/C# and the other common
        // // languages use the same comment color. Markers are checked only at
        // the current lexer position, after strings and block comments have
        // already been handled, avoiding comment-like text inside strings.
        var slashCommentLanguages = {
          javascript: 1, typescript: 1, java: 1, csharp: 1, cpp: 1, c: 1,
          go: 1, rust: 1, php: 1, kotlin: 1, swift: 1, dart: 1,
          scala: 1, solidity: 1, groovy: 1, objectivec: 1, objc: 1
        };
        if (slashCommentLanguages[lang] && rest.slice(0, 2) === '//') {
          out += sp('comment', rest);
          break;
        }
        // SQL-family and several other languages use -- for line comments.
        var dashCommentLanguages = {
          sql: 1, haskell: 1, lua: 1, ada: 1, elm: 1, vhdl: 1,
          fortran: 1, erlang: 1, prolog: 1, coffeescript: 1
        };
        if (dashCommentLanguages[lang] && rest.slice(0, 2) === '--') {
          out += sp('comment', rest);
          break;
        }
        if ((lang === 'python') && rest.indexOf('"""') === 0) {
          var q3 = rest.indexOf('"""', 3);
          q3 = q3 < 0 ? rest.length: q3 + 3;
          out += sp('string', rest.slice(0, q3));
          i += q3;
          continue;
        }
        if ((lang === 'python') && rest.indexOf("'''") === 0) {
          var q3s = rest.indexOf("'''", 3);
          q3s = q3s < 0 ? rest.length: q3s + 3;
          out += sp('string', rest.slice(0, q3s));
          i += q3s;
          continue;
        }
        if (ch === '"' || ch === "'") {
          var q = ch, j = 1, escd = false;
          for (; j < rest.length; j++) {
            var c = rest.charAt(j);
            if ( ! escd && c === q) {
              j++;
              break;
            }
            if ( ! escd && c === '\\') escd = true;
            else escd = false;
          }
          out += sp('string', rest.slice(0, j));
          i += j;
          continue;
        }
        if ((lang === 'javascript' || lang === 'typescript') && ch === '`') {
          var bt = 1, besc = false;
          for (; bt < rest.length; bt++) {
            var bc = rest.charAt(bt);
            if ( ! besc && bc === '`') {
              bt++;
              break;
            }
            if ( ! besc && bc === '\\') besc = true;
            else besc = false;
          }
          out += sp('string', rest.slice(0, bt));
          i += bt;
          continue;
        }
        m = rest.match(/^(?:0x[0-9a-fA-F]+|0b[01]+|\b\d+(?:\.\d+)?(?:[eE][+-]?\d+)?\b)/);
        if (m) {
          out += sp('number', m[0]);
          i += m[0].length;
          continue;
        }
        m = rest.match(/^[A-Za-z_$][\w$]*/);
        if (m) {
          var word = m[0], cls = '';
          if (expectClass) {
            cls = 'title class_';
            expectClass = false;
          } else if (expectFunction) {
            cls = 'title function_';
            expectFunction = false;
          } else if (keywords[word]) {
            cls = 'keyword';
            if (word === 'class' || word === 'interface' || word === 'struct' || word === 'enum') expectClass = true;
            if (/^(def|function|func|fn|fun|sub)$/.test(word)) expectFunction = true;
          } else if (literals[word]) cls = 'literal';
          else if (builtinSet[word]) cls = 'built_in';
          else if (/^(true|false|null|undefined|None|True|False|nil|NULL|NaN)$/.test(word)) cls = 'literal';
          else if (/^\s*\(/.test(rest.slice(word.length))) cls = 'title function_';
          out += cls ? sp(cls, word): esc(word);
          i += word.length;
          continue;
        }
        if (/^[{}[\]();,.]/.test(rest)) {
          out += sp('punctuation', ch);
          i++;
          continue;
        }
        if (/^[+\-*\/%=!<>:&|?~^]+/.test(rest)) {
          m = rest.match(/^[+\-*\/%=!<>:&|?~^]+/);
          out += sp('operator', m[0]);
          i += m[0].length;
          continue;
        }
        out += esc(ch);
        i++;
      }
      return out;
    }
    return source.split('\n').map(lineLexer).join('\n');
  }
  // Final DOM-side code enhancement. This is intentionally independent from
  // the Markdown HTML regex pass so code highlighting still works if a future
  // marked/highlight combination changes the exact <pre><code> serialization.
  M.enhanceCodeBlocks = function(root) {
    if ( ! root) return;
    var codes = root.querySelectorAll('pre > code');
    for (var i = 0; i < codes.length; i++) {
      var code = codes[i];
      var pre = code.parentElement;
      var langMatch = String(code.className || '').match(/(?:^|\s)language-([^\s]+)/i);
      var lang = langMatch ? langMatch[1]: 'text';
      var wrapper = pre.closest('.code-wrap');
      var highlighted = highlightCode(code.textContent || '', lang);
      // Always replace the code content from plain text. This prevents a
      // previous failed/highlighted HTML result from being double-escaped.
      code.innerHTML = highlighted;
      code.setAttribute('data-highlighted', 'true');
      if ( ! wrapper) {
        wrapper = document.createElement('div');
        wrapper.className = 'code-wrap';
        wrapper.setAttribute('data-code-language', lang);
        var head = document.createElement('div');
        head.className = 'code-head';
        head.innerHTML = '<span class="code-lang"></span><span class="spacer"></span>' + '<button type="button" class="toolbar-btn code-copy">' + M.t('codeCopy') + '</button>';
        head.querySelector('.code-lang').textContent = languageDisplayName(lang);
        pre.parentNode.insertBefore(wrapper, pre);
        wrapper.appendChild(head);
        wrapper.appendChild(pre);
      }
    }
  };
  M.refreshCodeText = function() {
    document.querySelectorAll('.code-wrap').forEach(function(wrap) {
      var copy = wrap.querySelector('.code-copy');
      if (copy) {
        copy.textContent = M.t('codeCopy');
        copy.title = M.t('codeCopy');
        copy.setAttribute('aria-label', M.t('codeCopy'));
      }
    });
  };
  function wrapCodeBlocks(html) {
    // The bundled Markdown parser emits a data-code-lang attribute on <pre>,
    // so accept attributes on both <pre> and <code>. Requiring the exact
    // string <pre><code> silently skipped every fenced code block.
    return html.replace(/<pre\b([^>]*)><code\b([^>]*)>([\s\S]*?)<\/code><\/pre>/g, function(_, preAttrs, codeAttrs, code) {
      var codeLang = String(codeAttrs || '').match(/class=["'][^"']*\blanguage-([^\s"']+)[^"']*["']/i);
      var preLang = String(preAttrs || '').match(/data-code-lang=["']([^"']*)["']/i);
      var safeLang = codeLang ? codeLang[1] : (preLang && preLang[1] ? preLang[1] : 'text');
      var highlighted = highlightCode(code, safeLang);
      return '<div class="code-wrap" data-code-language="' + escapeHtml(safeLang) + '"><div class="code-head"><span class="code-lang">' + escapeHtml(languageDisplayName(safeLang)) + '</span><span class="spacer"></span>' + '<button type="button" class="toolbar-btn code-copy">' + M.t('codeCopy') + '</button></div><pre><code class="language-' + escapeHtml(safeLang) + '">' + highlighted + '</code></pre></div>';
    });
  }
  function injectMermaidPlaceholders(html, sources, tokenPrefix) {
    for (var i = 0; i < sources.length; i++) {
      var token = tokenPrefix + i;
      var placeholder = '<div class="mv-mermaid-placeholder" data-mermaid-index="' + i + '">' + '<textarea class="mv-mermaid-source-data" hidden>' + escapeHtml(sources[i]) + '</textarea>' + '</div>';
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
// Extract details blocks with balanced nesting. Each block body is recursively
// prepared so nested accordions can be rendered without losing their Markdown
// content (paragraphs, lists, and other block elements).
function extractDetails(source) {
    var details = [];
    var normalized = normalizeNewlines(source);
    var prefix = uniqueToken(normalized, 'MVDETAILSTOKEN_');
    var lines = normalized.split('\n');
    var out = [];
    var i = 0;
    var fence = null;
    while (i < lines.length) {
        var line = lines[i];
        var fenceMatch = line.match(/^ *(`{3,}|~{3,})(.*)$/);
        if (fence) {
            out.push(line);
            var closeFence = line.match(/^ *(`{3,}|~{3,})[ \t]*$/);
            if (closeFence && closeFence[1].charAt(0) === fence.charAt(0) && closeFence[1].length >= fence.length)
                fence = null;
            i++;
            continue;
        }
        if (fenceMatch) {
            fence = fenceMatch[1];
            out.push(line);
            i++;
            continue;
        }
        var opening = line.match(/^\s*<details\b([^>]*)>\s*$/i);
        if (!opening) {
            out.push(line);
            i++;
            continue;
        }
        var summaryIndex = i + 1;
        while (summaryIndex < lines.length && !lines[summaryIndex].trim()) summaryIndex++;
        var summaryMatch = summaryIndex < lines.length
            ? lines[summaryIndex].match(/^\s*<summary\b[^>]*>([\s\S]*?)<\/summary\s*>\s*$/i)
            : null;
        if (!summaryMatch) {
            out.push(line);
            i++;
            continue;
        }

        var bodyLines = [];
        var j = summaryIndex + 1;
        var innerFence = null;
        var depth = 1;
        var closed = false;
        for (; j < lines.length; j++) {
            var bodyLine = lines[j];
            var bodyFence = bodyLine.match(/^ *(`{3,}|~{3,})(.*)$/);
            if (innerFence) {
                bodyLines.push(bodyLine);
                var innerClose = bodyLine.match(/^ *(`{3,}|~{3,})[ \t]*$/);
                if (innerClose && innerClose[1].charAt(0) === innerFence.charAt(0) && innerClose[1].length >= innerFence.length)
                    innerFence = null;
                continue;
            }
            if (bodyFence) {
                innerFence = bodyFence[1];
                bodyLines.push(bodyLine);
                continue;
            }
            if (/^\s*<details\b[^>]*>\s*$/i.test(bodyLine)) {
                depth++;
                bodyLines.push(bodyLine);
                continue;
            }
            if (/^\s*<\/details\s*>\s*$/i.test(bodyLine)) {
                depth--;
                if (depth === 0) {
                    closed = true;
                    break;
                }
                bodyLines.push(bodyLine);
                continue;
            }
            bodyLines.push(bodyLine);
        }
        if (!closed) {
            out.push(line);
            i++;
            continue;
        }

        // Markdown parsers treat four leading spaces as an indented code block.
        // HTML details content is commonly indented for readability, especially
        // inside nested details. Remove the shared indentation from the body
        // before parsing it as Markdown, while preserving relative indentation.
        var nonBlankIndent = bodyLines
            .filter(function(bodyLine) { return bodyLine.trim().length > 0; })
            .map(function(bodyLine) {
                var match = bodyLine.match(/^[ \t]*/);
                return match ? match[0].replace(/\t/g, '    ').length : 0;
            });
        var commonIndent = nonBlankIndent.length ? Math.min.apply(Math, nonBlankIndent) : 0;
        if (commonIndent > 0) {
            bodyLines = bodyLines.map(function(bodyLine) {
                if (!bodyLine.trim()) return '';
                var remaining = commonIndent;
                var cut = 0;
                while (cut < bodyLine.length && remaining > 0 && (bodyLine.charAt(cut) === ' ' || bodyLine.charAt(cut) === '\t')) {
                    remaining -= bodyLine.charAt(cut) === '\t' ? 4 : 1;
                    cut++;
                }
                return bodyLine.slice(cut);
            });
        }
        // Recursively extract children before storing the parent body.
        var preparedBody = extractDetails(bodyLines.join('\n'));
        var index = details.length;
        details.push({
            open: /(?:^|\s)open(?:\s|=|$)/i.test(opening[1]),
            summary: summaryMatch[1],
            body: preparedBody.markdown,
            children: preparedBody.details,
            childTokenPrefix: preparedBody.tokenPrefix
        });
        out.push(prefix + index + '_TOKEN');
        i = j + 1;
    }
    return { markdown: out.join('\n'), details: details, tokenPrefix: prefix };
}
function injectDetails(html, details, tokenPrefix) {
    for (var i = 0; i < details.length; i++) {
        var item = details[i];
        var protectedSummary = protectSupportedHtml(item.summary);
        var parsedSummary = marked.parse(protectedSummary.source, { gfm: true, breaks: true, mangle: false });
        var summaryHtml = parsedSummary.replace(/^\s*<p>/i, '').replace(/<\/p>\s*$/i, '');
        summaryHtml = DOMPurify.sanitize(summaryHtml, { USE_PROFILES: { html: true } });
        summaryHtml = restoreSupportedHtml(summaryHtml, protectedSummary);
        var listFencePrepared = protectIndentedListFences(item.body);
        var protectedBody = protectSupportedHtml(listFencePrepared.source);
        var bodyHtml = marked.parse(protectedBody.source, { gfm: true, breaks: true, mangle: false });
        bodyHtml = DOMPurify.sanitize(bodyHtml, { USE_PROFILES: { html: true } });
        bodyHtml = cleanSupportedHtmlLayout(restoreSupportedHtml(bodyHtml, protectedBody));
        bodyHtml = restoreIndentedListFences(bodyHtml, listFencePrepared);
        if (item.children && item.children.length) {
            bodyHtml = injectDetails(bodyHtml, item.children, item.childTokenPrefix);
            bodyHtml = cleanSupportedHtmlLayout(bodyHtml);
        }
        var open = item.open ? ' open' : '';
        var block = '<details class="md-details"' + open + '><summary>' + summaryHtml + '</summary><div class="md-details-content">' + bodyHtml + '</div></details>';
        var token = tokenPrefix + i + '_TOKEN';
        var tokenRe = new RegExp('<p>\\s*' + token + '\\s*<\\/p>', 'g');
        html = html.replace(tokenRe, block).replace(new RegExp(token, 'g'), block);
    }
    return html;
}
  M.renderMarkdown = function(source) {
    if ( ! window.marked) throw new Error('Markdownライブラリが読み込まれていません');
    if ( ! window.DOMPurify) throw new Error('サニタイズライブラリが読み込まれていません');
    var normalizedSource = normalizeHtmlBreakTags(normalizeIndentedMarkdown(source));
    var extracted = extractMermaid(normalizedSource);
    var headingPrepared = normalizeDeepHeadings(extracted.markdown);
    var detailsPrepared = extractDetails(headingPrepared.markdown);
    var listFencePrepared = protectIndentedListFences(detailsPrepared.markdown);
    var protectedMarkdownHtml = protectSupportedHtml(listFencePrepared.source);
    var html = marked.parse(protectedMarkdownHtml.source, {
      gfm: true, breaks: true, headerIds: true, mangle: false
    });
    // Sanitize ordinary Markdown first. Mermaid has not entered the DOM yet.
    html = DOMPurify.sanitize(html, {
      USE_PROFILES: {
        html: true
      }
    });
    html = cleanSupportedHtmlLayout(restoreSupportedHtml(html, protectedMarkdownHtml));
    html = restoreIndentedListFences(html, listFencePrepared);
    html = injectDetails(html, detailsPrepared.details, detailsPrepared.tokenPrefix);
    // Promote h6 placeholders to logical levels 7-10 after sanitization.
    // Keeping a real h6 element preserves browser heading behavior while the
    // data attribute/aria-level carries the extended hierarchy.
    var headingTokenPrefix = headingPrepared.tokenPrefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    var headingTokenRe = new RegExp('<h6([^>]*)>\\s*' + headingTokenPrefix + '(7|8|9|10)\\s*([\\s\\S]*?)<\\/h6>', 'gi');
    html = html.replace(headingTokenRe, function(_, attrs, level, body) {
      return '<h6' + attrs + ' data-heading-level="' + level + '" aria-level="' + level + '">' + body + '</h6>';
    });
    // Only after sanitization do we insert our inert Mermaid placeholders.
    // The source is stored as textarea text, never as executable HTML.
    html = injectMermaidPlaceholders(html, extracted.mermaids, extracted.tokenPrefix);
    html = wrapCodeBlocks(html);
    html = wrapTables(html);
    return html;
  };
})(window.MarkdownViewer);
