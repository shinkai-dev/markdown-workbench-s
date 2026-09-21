const vscode = require('vscode');
const path = require('path');
const fs = require('fs');

function activate(context) {
  let panel = null;
  let currentUri = null;

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
