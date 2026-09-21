const vscode = require('vscode');
const path = require('path');
const fs = require('fs');

function activate(context) {
  let panel = null;
  let currentUri = null;
  let mermaidPanels = new Set();

  const openPreview = async (resource) => {
    const editor = vscode.window.activeTextEditor;
    const uri = resource || (editor && editor.document.uri) || currentUri;
    if (!uri) {
      vscode.window.showInformationMessage('Open a Markdown file before running this command.');
      return;
    }
    const ext = path.extname(uri.fsPath).toLowerCase();
    if (!['.md', '.markdown', '.mdown', '.mkdn', '.txt'].includes(ext)) {
      vscode.window.showInformationMessage('Markdown Workbench S supports Markdown and TXT files.');
      return;
    }

    currentUri = uri;
    const column = editor ? editor.viewColumn : vscode.ViewColumn.Active;
    if (!panel) {
      panel = vscode.window.createWebviewPanel(
        'markdownWorkbenchS',
        `Markdown Workbench S: ${path.basename(uri.fsPath)}`,
        { viewColumn: column || vscode.ViewColumn.Active, preserveFocus: true },
        {
          enableScripts: true,
          retainContextWhenHidden: true,
          localResourceRoots: [vscode.Uri.file(path.join(context.extensionPath, 'webview'))]
        }
      );
      panel.onDidDispose(() => {
        panel = null;
        currentUri = null;
      }, null, context.subscriptions);

      panel.webview.onDidReceiveMessage(async message => {
        if (message.type === 'ready') {
          await sendDocument();
        } else if (message.type === 'openSource') {
          await revealSource(message.line || 1, message.column || 1);
        } else if (message.type === 'openMermaid') {
          openMermaidDiagram(message.svg || '', message.language || 'en', message.theme || 'light');
        }
      }, null, context.subscriptions);
    } else {
      panel.reveal(column || vscode.ViewColumn.Active, true);
    }

    panel.title = `Markdown Workbench S: ${path.basename(uri.fsPath)}`;
    panel.webview.html = getWebviewHtml(context, panel.webview);
    await sendDocument();
  };

  const sendDocument = async () => {
    if (!panel || !currentUri) return;
    try {
      const doc = await vscode.workspace.openTextDocument(currentUri);
      await panel.webview.postMessage({
        type: 'document',
        text: doc.getText(),
        name: path.basename(doc.uri.fsPath),
        uri: doc.uri.toString()
      });
    } catch (e) {
      vscode.window.showErrorMessage(`Failed to load Markdown: ${e.message}`);
    }
  };


  const openMermaidDiagram = (svg, language, theme) => {
    if (!svg) {
      vscode.window.showInformationMessage(language === 'ja' ? 'Mermaid図を表示できません。' : 'The Mermaid diagram could not be displayed.');
      return;
    }
    // Keep the Mermaid view in the same editor group as the Markdown preview.
    // ViewColumn.Beside creates a split editor group, which is not what we want.
    const previewColumn = panel && panel.viewColumn ? panel.viewColumn : vscode.ViewColumn.Active;
    const mermaidPanel = vscode.window.createWebviewPanel(
      'markdownWorkbenchSMermaid',
      language === 'ja' ? 'Mermaid図' : 'Mermaid Diagram',
      { viewColumn: previewColumn, preserveFocus: false },
      { enableScripts: true, retainContextWhenHidden: true }
    );
    mermaidPanels.add(mermaidPanel);
    mermaidPanel.onDidDispose(() => mermaidPanels.delete(mermaidPanel), null, context.subscriptions);
    mermaidPanel.webview.html = getMermaidWebviewHtml(mermaidPanel.webview, svg, language, theme);
    mermaidPanel.reveal(previewColumn, false);
  };

  const revealSource = async (line, column) => {
    if (!currentUri) return;
    const doc = await vscode.workspace.openTextDocument(currentUri);
    const editor = await vscode.window.showTextDocument(doc, {
      viewColumn: vscode.ViewColumn.Active,
      preserveFocus: false,
      preview: false
    });
    const safeLine = Math.max(0, Math.min(line - 1, doc.lineCount - 1));
    const safeColumn = Math.max(0, Math.min(column - 1, doc.lineAt(safeLine).text.length));
    const pos = new vscode.Position(safeLine, safeColumn);
    editor.selection = new vscode.Selection(pos, pos);
    editor.revealRange(new vscode.Range(pos, pos), vscode.TextEditorRevealType.InCenterIfOutsideViewport);
  };

  context.subscriptions.push(vscode.commands.registerCommand('markdownWorkbenchS.openPreview', openPreview));

  context.subscriptions.push(vscode.workspace.onDidChangeTextDocument(e => {
    if (currentUri && e.document.uri.toString() === currentUri.toString() && panel) {
      panel.webview.postMessage({ type: 'document', text: e.document.getText(), name: path.basename(e.document.uri.fsPath), uri: e.document.uri.toString() });
    }
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
  const title = ja ? 'Mermaid図' : 'Mermaid Diagram';
  const zoom = ja ? '倍率' : 'Zoom';
  const out = ja ? '縮小' : 'Zoom out';
  const inn = ja ? '拡大' : 'Zoom in';
  const themeColors = {
    light: { bg: '#f7f8fb', fg: '#202634', border: '#dce1e8', surface: '#ffffff', hover: '#f1f4f8' },
    dark: { bg: '#101318', fg: '#e7eaf0', border: '#303846', surface: '#171b22', hover: '#202631' },
    'high-contrast': { bg: '#000000', fg: '#ffffff', border: '#ffffff', surface: '#000000', hover: '#111111' }
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
  const scripts = [
    'vendor/marked.min.js', 'vendor/purify.min.js', 'vendor/mermaid.min.js', 'vendor/highlight.min.js',
    'js/storage.js', 'js/markdown-renderer.js', 'js/table-controller.js', 'js/mermaid-controller.js',
    'js/toc-controller.js', 'js/search-controller.js', 'js/theme-controller.js', 'js/keyboard-controller.js', 'js/app.js'
  ];
  const scriptTags = scripts.map(p => `<script nonce="${nonce}" src="${asUri(p)}"></script>`).join('\n');
  return `<!doctype html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light dark"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${webview.cspSource} data:; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}' ${webview.cspSource}; worker-src blob:; font-src ${webview.cspSource} data:;"><link rel="stylesheet" href="${asUri('css/app.css')}"><link rel="stylesheet" href="${asUri('css/themes.css')}"><style>body.vscode-webview .drop-overlay{display:none}.source-nav-hint{position:fixed;right:16px;bottom:16px;z-index:1000;padding:8px 12px;border:1px solid var(--border);background:var(--panel);border-radius:6px;opacity:0;pointer-events:none;transition:opacity .15s}body.source-nav-active .source-nav-hint{opacity:1}</style></head><body class="vscode-webview"><div id="app" aria-busy="false"></div><div id="toast" class="toast" role="status" aria-live="polite"></div><div class="source-nav-hint">Double-click to open the Markdown source</div><script nonce="${nonce}">window.addEventListener("error",function(e){var a=document.getElementById("app");if(a&&(!a.firstChild||a.textContent.trim()==="")){a.innerHTML="<div style=\"padding:32px;font-family:system-ui,sans-serif\"><h2>Markdown Workbench failed to start</h2><p>Webview error: "+String(e.message||"Unknown error")+"</p><p>Open the Developer Tools console for details.</p></div>";}});window.addEventListener("unhandledrejection",function(e){var a=document.getElementById("app");if(a&&(!a.firstChild||a.textContent.trim()==="")){a.innerHTML="<div style=\"padding:32px;font-family:system-ui,sans-serif\"><h2>Markdown Workbench failed to start</h2><p>Unhandled error: "+String(e.reason&&e.reason.message||e.reason||"Unknown error")+"</p></div>";}});</script>${scriptTags}</body></html>`;
}

function deactivate() {}
module.exports = { activate, deactivate };
