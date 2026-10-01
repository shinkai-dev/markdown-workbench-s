const vscode = require('vscode');
const path = require('path');
const fs = require('fs');
function prepareMarkdownForWebview(text, documentUri, webview) {
  const source = String(text || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const documentDir = path.dirname(documentUri.fsPath);
  const lines = source.split('\n');
  let fenceChar = '';
  let fenceLength = 0;

  function isEscaped(value, index) {
    let count = 0;
    for (let i = index - 1; i >= 0 && value.charAt(i) === '\\'; i--) count++;
    return (count % 2) === 1;
  }

  function findUnescaped(value, start, needle) {
    let pos = start;
    while ((pos = value.indexOf(needle, pos)) >= 0) {
      if (!isEscaped(value, pos)) return pos;
      pos += needle.length;
    }
    return -1;
  }

  function findImageLabelEnd(value, start) {
    let depth = 0;
    for (let i = start; i < value.length; i++) {
      if (isEscaped(value, i)) continue;
      const ch = value.charAt(i);
      if (ch === '[') depth++;
      else if (ch === ']') {
        if (depth === 0) return i;
        depth--;
      }
    }
    return -1;
  }

  function findDestinationEnd(value, openIndex) {
    let depth = 0;
    let quote = '';
    for (let i = openIndex + 1; i < value.length; i++) {
      if (isEscaped(value, i)) continue;
      const ch = value.charAt(i);
      if (quote) {
        if (ch === quote) quote = '';
        continue;
      }
      if (ch === '"' || ch === "'") {
        quote = ch;
        continue;
      }
      if (ch === '(') depth++;
      else if (ch === ')') {
        if (depth === 0) return i;
        depth--;
      }
    }
    return -1;
  }

  function splitDestination(raw) {
    const value = String(raw || '').trim();
    if (!value) return null;
    let url = value;
    let title = '';
    if (value.charAt(0) === '<') {
      const close = findUnescaped(value, 1, '>');
      if (close < 0) return null;
      url = value.slice(1, close);
      const rest = value.slice(close + 1).trim();
      if (rest) {
        const m = rest.match(/^(?:"([\s\S]*)"|'([\s\S]*)'|\(([\s\S]*)\))$/);
        if (!m) return null;
        title = m[1] != null ? m[1] : (m[2] != null ? m[2] : m[3]);
        return { url, title, titleStyle: rest.charAt(0) };
      }
      return { url, title: '', titleStyle: '' };
    }
    const m = value.match(/^(\S+?)(?:[ \t]+(?:"([\s\S]*)"|'([\s\S]*)'|\(([\s\S]*)\)))?$/);
    if (!m) return null;
    title = m[2] != null ? m[2] : (m[3] != null ? m[3] : (m[4] != null ? m[4] : ''));
    return { url: m[1], title, titleStyle: m[2] != null ? '"' : (m[3] != null ? "'" : (m[4] != null ? '(' : '')) };
  }

  function rewriteImages(line) {
    let out = '';
    let i = 0;
    let codeRun = 0;
    while (i < line.length) {
      if (line.charAt(i) === '\\' && i + 1 < line.length) {
        out += line.slice(i, i + 2);
        i += 2;
        continue;
      }
      if (line.charAt(i) === '`') {
        let run = 1;
        while (line.charAt(i + run) === '`') run++;
        const fence = '`'.repeat(run);
        const close = findUnescaped(line, i + run, fence);
        if (codeRun === 0 && close >= 0) codeRun = run;
        else if (codeRun === run) codeRun = 0;
        out += line.slice(i, i + run);
        i += run;
        continue;
      }
      if (codeRun || line.slice(i, i + 2) !== '![') {
        out += line.charAt(i);
        i++;
        continue;
      }
      const labelStart = i + 2;
      const labelEnd = findImageLabelEnd(line, labelStart);
      if (labelEnd < 0 || line.charAt(labelEnd + 1) !== '(') {
        out += line.charAt(i);
        i++;
        continue;
      }
      const destinationEnd = findDestinationEnd(line, labelEnd + 1);
      if (destinationEnd < 0) {
        out += line.charAt(i);
        i++;
        continue;
      }
      const destination = splitDestination(line.slice(labelEnd + 2, destinationEnd));
      if (!destination) {
        out += line.slice(i, destinationEnd + 1);
        i = destinationEnd + 1;
        continue;
      }
      const cleanUrl = String(destination.url || '');
      if (/^(?:https?:|data:|vscode-webview-resource:|\/\/)/i.test(cleanUrl)) {
        out += line.slice(i, destinationEnd + 1);
        i = destinationEnd + 1;
        continue;
      }
      try {
        const suffixMatch = cleanUrl.match(/[?#][\s\S]*$/);
        const pathPart = suffixMatch ? cleanUrl.slice(0, suffixMatch.index) : cleanUrl;
        const urlSuffix = suffixMatch ? cleanUrl.slice(suffixMatch.index) : '';
        const localPath = path.resolve(documentDir, pathPart);
        const resourceUri = webview.asWebviewUri(vscode.Uri.file(localPath)).toString() + urlSuffix;
        let titlePart = '';
        if (destination.title) {
          const style = destination.titleStyle || '"';
          titlePart = ` ${style}${destination.title}${style === '(' ? ')' : style}`;
        }
        out += `![${line.slice(labelStart, labelEnd)}](${resourceUri}${titlePart})`;
      } catch (_) {
        out += line.slice(i, destinationEnd + 1);
      }
      i = destinationEnd + 1;
    }
    return out;
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (fenceChar) {
      lines[i] = line;
      const close = line.match(/^ {0,3}(`{3,}|~{3,})[ \t]*$/);
      if (close && close[1].charAt(0) === fenceChar && close[1].length >= fenceLength) {
        fenceChar = '';
        fenceLength = 0;
      }
      continue;
    }
    const fence = line.match(/^ {0,3}(`{3,}|~{3,})(.*)$/);
    if (fence && !(fence[1].charAt(0) === '`' && fence[2].indexOf('`') >= 0)) {
      fenceChar = fence[1].charAt(0);
      fenceLength = fence[1].length;
      lines[i] = line;
      continue;
    }
    if (/^(?: {4}|\t)/.test(line)) {
      lines[i] = line;
      continue;
    }
    lines[i] = rewriteImages(line);
  }
  return lines.join('\n');
}

function activate(context) {
  let panel = null;
  let currentUri = null;
  let mermaidPanels = new Set();
  let lastSentDocumentVersion = - 1;
  let webviewReady = false;
  let documentChangeTimer = null;
  let prepareSequence = 0;
  const pendingPrepare = new Map();
  const getSourceViewColumn =(uri) => {
    if ( ! uri) return null;
    const target = uri.toString();
    for (const group of vscode.window.tabGroups.all) {
      for (const tab of group.tabs) {
        const input = tab.input;
        if (input && input.uri && input.uri.toString() === target) {
          return group.viewColumn;
        }
      }
    }
    return null;
  };
  const syncPreviewToSourceGroup =() => {
    if ( ! panel || ! currentUri || ! panel.visible) return false;
    const sourceColumn = getSourceViewColumn(currentUri);
    if ( ! sourceColumn || panel.viewColumn === sourceColumn) return false;
    panel.reveal(sourceColumn, true);
    return true;
  };
  const openPreview = async(resource) => {
    const editor = vscode.window.activeTextEditor;
    const uri = resource ||(editor && editor.document.uri) || currentUri;
    if ( ! uri) {
      vscode.window.showInformationMessage('Open a Markdown file before running this command.');
      return;
    }
    const ext = path.extname(uri.fsPath).toLowerCase();
    if ( !['.md', '.markdown', '.mdown', '.mkdn', '.txt'].includes(ext)) {
      vscode.window.showInformationMessage('Markdown Workbench S supports Markdown and TXT files.');
      return;
    }
    const sameDocument = ! !(panel && currentUri && currentUri.toString() === uri.toString());
    const creatingPanel = ! panel;
    currentUri = uri;
    const column = editor ? editor.viewColumn: vscode.ViewColumn.Active;
    if ( ! panel) {
      panel = vscode.window.createWebviewPanel('markdownWorkbenchS', path.basename(uri.fsPath), {
        viewColumn: column || vscode.ViewColumn.Active, preserveFocus: true
      }, {
        enableScripts: true, retainContextWhenHidden: true, localResourceRoots: [vscode.Uri.file(path.join(context.extensionPath, 'webview')), vscode.Uri.file(path.dirname(uri.fsPath)), ...(vscode.workspace.workspaceFolders ||[]).map(folder => folder.uri)]
      });
      panel.iconPath = vscode.Uri.file(path.join(context.extensionPath, 'webview', 'assets', 'binoculars.svg'));
      panel.onDidDispose(() => {
        panel = null;
        currentUri = null;
        lastSentDocumentVersion = - 1;
        webviewReady = false;
        if (documentChangeTimer) {
          clearTimeout(documentChangeTimer);
          documentChangeTimer = null;
        }
        pendingPrepare.forEach(resolve => resolve());
        pendingPrepare.clear();
      }, null, context.subscriptions);
      panel.onDidChangeViewState(async event => {
        if ( ! panel || ! currentUri || ! event.webviewPanel.visible || ! webviewReady) return;
        // A retained Webview can remain in the editor group where it was
        // created even after the Markdown source tab is activated in another
        // group. Synchronize the Webview's group first. This is a layout fix,
        // not a render operation: when a move is required, return immediately
        // and let the follow-up view-state event finish the normal refresh.
        if (syncPreviewToSourceGroup()) return;
        // revealSource() prepares the retained Webview BEFORE switching to the
        // Markdown editor. Do not send prepareRender here: doing so after the
        // Webview becomes visible is exactly what allowed the old document to
        // paint briefly in the top-left before the loading curtain arrived.
        const refreshed = await sendDocument(false);
        if ( ! refreshed && panel) panel.webview.postMessage({
          type: 'renderReady'
        });
      }, null, context.subscriptions);
      panel.webview.onDidReceiveMessage(async message => {
        if (message.type === 'ready') {
          webviewReady = true;
          await sendDocument(true);
        } else if (message.type === 'viewActivated') {
          if ( ! panel || ! currentUri || ! panel.visible) return;
          if (syncPreviewToSourceGroup()) return;
          const refreshed = await sendDocument(false);
          if ( ! refreshed && panel) panel.webview.postMessage({
            type: 'renderReady'
          });
        } else if (message.type === 'renderPrepared') {
          const waiter = pendingPrepare.get(message.requestId);
          if (waiter) {
            pendingPrepare.delete(message.requestId);
            waiter();
          }
        } else if (message.type === 'openSource') {
          await revealSource(message.line || 1, message.column || 1);
        } else if (message.type === 'openMermaid') {
          openMermaidDiagram(message.svg || '', message.language || 'en', message.theme || 'light');
        }
      }, null, context.subscriptions);
    } else {
      panel.reveal(column || vscode.ViewColumn.Active, true);
    }
    panel.title = path.basename(uri.fsPath);
    panel.iconPath = vscode.Uri.file(path.join(context.extensionPath, 'webview', 'assets', 'binoculars.svg'));
    if (sameDocument) {
      // Reusing an already-rendered preview must not recreate the Webview.
      // When the source document has not changed, keep the current preview
      // state (table filters/sort, scroll position, Mermaid state, etc.).
      // If the source changed while the editor was active, sendDocument()
      // compares document.version and updates the preview only when needed.
      await sendDocument();
    } else if (creatingPanel) {
      // The first Webview must load its HTML before any document message is
      // sent. The Webview script sends the ready message after it is installed;
      // the ready handler then performs the first render. Posting the document
      // immediately here can otherwise lose the message and leave the spinner
      // visible forever.
      lastSentDocumentVersion = - 1;
      panel.webview.html = getWebviewHtml(context, panel.webview);
    } else {
      // Reuse the existing Webview instead of replacing its HTML. Replacing
      // webview.html and immediately posting the document can race the new
      // Webview script's ready message, leaving the loading screen up forever.
      // The existing Webview already has all rendering code, so changing the
      // document is safely handled as an ordinary document message.
      lastSentDocumentVersion = - 1;
      panel.webview.postMessage({
        type: 'prepareRender'
      });
      await sendDocument(true);
    }
  };
  const sendDocument = async(force = false) => {
    if ( ! panel || ! currentUri) return;
    try {
      const doc = await vscode.workspace.openTextDocument(currentUri);
      if ( ! force && doc.version === lastSentDocumentVersion) return false;
      lastSentDocumentVersion = doc.version;
      await panel.webview.postMessage({
        type: 'document', text: prepareMarkdownForWebview(doc.getText(), doc.uri, panel.webview), name: path.basename(doc.uri.fsPath), uri: doc.uri.toString()
      });
      return true;
    } catch (e) {
      vscode.window.showErrorMessage(`Failed to load Markdown: ${e.message}`);
      return false;
    }
  };
  const openMermaidDiagram =(svg, language, theme) => {
    if ( ! svg) {
      vscode.window.showInformationMessage(language === 'ja' ? 'Mermaid図を表示できません。': 'The Mermaid diagram could not be displayed.');
      return;
    }
    // Keep the Mermaid view in the same editor group as the Markdown preview.
    // ViewColumn.Beside creates a split editor group, which is not what we want.
    const previewColumn = panel && panel.viewColumn ? panel.viewColumn: vscode.ViewColumn.Active;
    const mermaidPanel = vscode.window.createWebviewPanel('markdownWorkbenchSMermaid', language === 'ja' ? 'Mermaid図': 'Mermaid Diagram', {
      viewColumn: previewColumn, preserveFocus: false
    }, {
      enableScripts: true, retainContextWhenHidden: true
    });
    mermaidPanels.add(mermaidPanel);
    mermaidPanel.onDidDispose(() => mermaidPanels.delete(mermaidPanel), null, context.subscriptions);
    mermaidPanel.webview.html = getMermaidWebviewHtml(mermaidPanel.webview, svg, language, theme);
    mermaidPanel.reveal(previewColumn, false);
  };
  const preparePreviewForNavigation = async() => {
    if ( ! panel) return;
    const requestId = ++prepareSequence;
    await new Promise(resolve => {
      let settled = false;
      const finish =() => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        pendingPrepare.delete(requestId);
        resolve();
      };
      const timer = setTimeout(finish, 500);
      pendingPrepare.set(requestId, finish);
      panel.webview.postMessage({
        type: 'prepareRender', requestId
      });
    });
  };
  const revealSource = async(line, column) => {
    if ( ! currentUri) return;
    const doc = await vscode.workspace.openTextDocument(currentUri);
    // Prepare the retained Webview while it is still visible. Waiting for the
    // Webview acknowledgement guarantees that the old preview is covered
    // BEFORE VS Code activates the Markdown source tab. Without this ordering,
    // VS Code can paint the retained preview once, then process prepareRender,
    // producing the visible top-left flash reported when returning to preview.
    await preparePreviewForNavigation();
    // Let VS Code resolve the actual group that owns the source document.
    // If the Markdown tab is already open in another editor group,
    // showTextDocument() may activate that existing tab there even when the
    // requested ViewColumn is different. Use the returned editor.viewColumn
    // as the authoritative location, then move the retained Preview Webview
    // into that same group. If the source was not open, it stays in the
    // current Preview group and editor.viewColumn points to that group.
    const sourceColumn = getSourceViewColumn(currentUri);
    const requestedColumn = sourceColumn ||(panel && panel.viewColumn) || vscode.ViewColumn.Active;
    const editor = await vscode.window.showTextDocument(doc, {
      viewColumn: requestedColumn, preserveFocus: false, preview: false
    });
    if (panel && editor.viewColumn && panel.viewColumn !== editor.viewColumn) {
      panel.reveal(editor.viewColumn, true);
    }
    const safeLine = Math.max(0, Math.min(line - 1, doc.lineCount - 1));
    const safeColumn = Math.max(0, Math.min(column - 1, doc.lineAt(safeLine).text.length));
    const pos = new vscode.Position(safeLine, safeColumn);
    editor.selection = new vscode.Selection(pos, pos);
    editor.revealRange(new vscode.Range(pos, pos), vscode.TextEditorRevealType.InCenterIfOutsideViewport);
  };
  context.subscriptions.push(vscode.commands.registerCommand('markdownWorkbenchS.openPreview', openPreview));
  context.subscriptions.push(vscode.workspace.onDidChangeTextDocument(e => {
    if ( ! currentUri || e.document.uri.toString() !== currentUri.toString() || ! panel) return;
    // Keep the preview live while avoiding a full Markdown render for every
    // keystroke. A short debounce still makes normal edits feel immediate.
    if (documentChangeTimer) clearTimeout(documentChangeTimer);
    documentChangeTimer = setTimeout(() => {
      documentChangeTimer = null;
      if ( ! panel || ! currentUri) return;
      if (e.document.version === lastSentDocumentVersion) return;
      lastSentDocumentVersion = e.document.version;
      panel.webview.postMessage({
        type: 'document', text: prepareMarkdownForWebview(e.document.getText(), e.document.uri, panel.webview), name: path.basename(e.document.uri.fsPath), uri: e.document.uri.toString()
      });
    }, 220);
  }));
  context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor(e => {
    if (panel && e && currentUri && e.document.uri.toString() === currentUri.toString()) {
      sendDocument();
    }
  }));
}
function getMermaidWebviewHtml(webview, svg, language, theme) {
  const nonce = String(Date.now()) + Math.random().toString(36).slice(2);
  const ja = language === 'ja';
  const title = ja ? 'Mermaid図': 'Mermaid Diagram';
  const zoom = ja ? '倍率': 'Zoom';
  const out = ja ? '縮小': 'Zoom out';
  const inn = ja ? '拡大': 'Zoom in';
  const themeColors = {
    light: {
      bg: '#f7f8fb',
      fg: '#202634',
      border: '#dce1e8',
      surface: '#ffffff',
      hover: '#f1f4f8'
    },
    dark: {
      bg: '#101318',
      fg: '#e7eaf0',
      border: '#303846',
      surface: '#171b22',
      hover: '#202631'
    },
    'high-contrast': {
      bg: '#000000',
      fg: '#ffffff',
      border: '#ffffff',
      surface: '#000000',
      hover: '#111111'
    }
  };
  const colors = themeColors[theme] || themeColors.light;
  const bg = colors.bg;
  const fg = colors.fg;
  const border = colors.border;
  const surface = colors.surface;
  const hover = colors.hover;
  const safeSvg = JSON.stringify(svg);
  return `<!doctype html><html lang="${ja ? 'ja' : 'en'}"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}';"><title>${title}</title><style>
html,body{margin:0;width:100%;height:100%;overflow:hidden;background:${bg};color:${fg};font-family:system-ui,sans-serif}
.bar{position:fixed;z-index:10;top:12px;right:12px;display:flex;align-items:center;gap:6px;padding:6px;background:${surface};border:1px solid ${border};border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,.18)}
button,select{border:1px solid ${border};background:${surface};color:${fg};border-radius:6px;padding:4px 9px;font:inherit;font-size:13px;cursor:pointer}button:hover,select:hover{background:${hover}}
.viewport{position:absolute;inset:0;overflow:hidden;cursor:grab;touch-action:none}.viewport.dragging{cursor:grabbing}
.stage{position:absolute;left:0;top:0;transform-origin:top left;will-change:transform}svg{display:block;max-width:none;height:auto}
</style></head><body><div class="bar"><button id="out" type="button" title="${out}">−</button><select id="zoom" aria-label="${zoom}"><option value="0.5">50%</option><option value="0.67">67%</option><option value="0.75">75%</option><option value="0.8">80%</option><option value="0.9">90%</option><option value="1" selected>100%</option><option value="1.1">110%</option><option value="1.25">125%</option><option value="1.5">150%</option><option value="1.75">175%</option><option value="2">200%</option><option value="2.5">250%</option><option value="3">300%</option></select><button id="in" type="button" title="${inn}">+</button></div><div id="viewport" class="viewport"><div id="stage" class="stage"></div></div><script nonce="${nonce}">(function(){
const svgText=${safeSvg};const viewport=document.getElementById('viewport'),stage=document.getElementById('stage'),sel=document.getElementById('zoom');stage.innerHTML=svgText;const svg=stage.querySelector('svg');if(!svg)return;
const levels=[.5,.67,.75,.8,.9,1,1.1,1.25,1.5,1.75,2,2.5,3];let scale=1,x=0,y=0,drag=null;
const vb=(svg.getAttribute('viewBox')||'').trim().split(/[ ,]+/).map(Number);const nw=vb.length===4&&isFinite(vb[2])&&vb[2]>0?vb[2]:(svg.getBoundingClientRect().width||800);const nh=vb.length===4&&isFinite(vb[3])&&vb[3]>0?vb[3]:(svg.getBoundingClientRect().height||600);svg.removeAttribute('width');svg.removeAttribute('height');svg.style.width=nw+'px';svg.style.height=nh+'px';svg.style.maxWidth='none';
function center(){const w=viewport.clientWidth,h=viewport.clientHeight;x=Math.max(0,(w-nw*scale)/2);y=Math.max(72,(h-nh*scale)/2);render()}function render(){stage.style.transform='translate('+x+'px,'+y+'px) scale('+scale+')';sel.value=String(scale)}function setScale(v){scale=v;center()}
document.getElementById('in').onclick=function(){let i=levels.findIndex(v=>v>=scale-.0001);scale=levels[Math.min(levels.length-1,Math.max(0,i+1))];center()};document.getElementById('out').onclick=function(){let i=levels.findIndex(v=>v>=scale-.0001);scale=levels[Math.max(0,i-1)];center()};sel.onchange=function(){setScale(Number(this.value))};
viewport.addEventListener('pointerdown',e=>{if(e.button!==0)return;drag={id:e.pointerId,sx:e.clientX,sy:e.clientY,x,y};viewport.classList.add('dragging');viewport.setPointerCapture(e.pointerId);e.preventDefault()});viewport.addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId)return;x=drag.x+e.clientX-drag.sx;y=drag.y+e.clientY-drag.sy;render();e.preventDefault()});function end(e){if(drag&&drag.id===e.pointerId){drag=null;viewport.classList.remove('dragging')}}viewport.addEventListener('pointerup',end);viewport.addEventListener('pointercancel',end);window.addEventListener('resize',center);center();
})();</script></body></html>`;
}
function getWebviewHtml(context, webview) {
  const root = vscode.Uri.file(path.join(context.extensionPath, 'webview'));
  const asUri = p => webview.asWebviewUri(vscode.Uri.joinPath(root, p));
  const nonce = String(Date.now());
  const scripts =['vendor/marked.min.js',
  'vendor/purify.min.js',
  'vendor/mermaid.min.js',
  'vendor/highlight.min.js',
  'js/storage.js',
  'js/markdown-renderer.js',
  'js/table-controller.js',
  'js/mermaid-controller.js',
  'js/toc-controller.js',
  'js/search-controller.js',
  'js/theme-controller.js',
  'js/keyboard-controller.js',
  'js/app.js'];
  const scriptTags = scripts.map(p => `<script nonce="${nonce}" src="${asUri(p)}"></script>`).join('\n');
  return `<!doctype html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light dark"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${webview.cspSource} https: http: data:; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}' ${webview.cspSource}; worker-src blob:; font-src ${webview.cspSource} data:;"><link rel="stylesheet" href="${asUri('css/app.css')}"><link rel="stylesheet" href="${asUri('css/themes.css')}"><style>body.vscode-webview .drop-overlay{display:none}.source-nav-hint{position:fixed;right:16px;bottom:16px;z-index:1000;padding:8px 12px;border:1px solid var(--border);background:var(--panel);border-radius:6px;opacity:0;pointer-events:none;transition:opacity .15s}body.source-nav-active .source-nav-hint{opacity:1}</style></head><body class="vscode-webview"><div id="startup-loading" class="loading" role="status" aria-live="polite"><div class="loading-card" aria-hidden="true"><span class="loading-dots"><span></span><span></span><span></span></div></div><div id="app" aria-busy="false"></div><div id="toast" class="toast" role="status" aria-live="polite"></div><div class="source-nav-hint">Double-click to open the Markdown source</div><script nonce="${nonce}">window.addEventListener("error",function(e){var a=document.getElementById("app");if(a&&(!a.firstChild||a.textContent.trim()==="")){a.innerHTML="<div style=\"padding:32px;font-family:system-ui,sans-serif\"><h2>Markdown Workbench failed to start</h2><p>Webview error: "+String(e.message||"Unknown error")+"</p><p>Open the Developer Tools console for details.</p></div>";}});window.addEventListener("unhandledrejection",function(e){var a=document.getElementById("app");if(a&&(!a.firstChild||a.textContent.trim()==="")){a.innerHTML="<div style=\"padding:32px;font-family:system-ui,sans-serif\"><h2>Markdown Workbench failed to start</h2><p>Unhandled error: "+String(e.reason&&e.reason.message||e.reason||"Unknown error")+"</p></div>";}});</script>${scriptTags}</body></html>`;
}
function deactivate() {
}
module.exports = {
  activate,
  deactivate
};
