import { initGitBranch } from './gitBranch.js';
import { initUserJump } from './userJump.js';

const TAB_STORAGE_KEY = 'devRunner.activeTab.v1';

/**
 * 初始化顶层 Tab 切换：脚本控制 / 用户跳转
 */
function initAppTabs() {
  const tabs = /** @type {NodeListOf<HTMLButtonElement>} */ (
    document.querySelectorAll('.app-tab[data-tab]')
  );
  const panelScripts = /** @type {HTMLElement} */ (
    document.getElementById('panel-scripts')
  );
  const panelUsers = /** @type {HTMLElement} */ (
    document.getElementById('panel-users')
  );

  /**
   * @param {'scripts' | 'users'} tab
   */
  function setTab(tab) {
    for (const btn of tabs) {
      const active = btn.dataset.tab === tab;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-selected', active ? 'true' : 'false');
    }

    const showScripts = tab === 'scripts';
    panelScripts.classList.toggle('hidden', !showScripts);
    panelUsers.classList.toggle('hidden', showScripts);
    if (showScripts) {
      panelScripts.removeAttribute('hidden');
      panelUsers.setAttribute('hidden', '');
    } else {
      panelUsers.removeAttribute('hidden');
      panelScripts.setAttribute('hidden', '');
    }

    localStorage.setItem(TAB_STORAGE_KEY, tab);
  }

  for (const btn of tabs) {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      if (tab === 'scripts' || tab === 'users') {
        setTab(tab);
      }
    });
  }

  const saved = localStorage.getItem(TAB_STORAGE_KEY);
  setTab(saved === 'users' ? 'users' : 'scripts');
}

/**
 * @typedef {'idle' | 'running' | 'exited' | 'error'} ScriptStatus
 */

/**
 * @typedef {object} ScriptRuntime
 * @property {string} name
 * @property {string} command
 * @property {ScriptStatus} status
 * @property {number | null} pid
 * @property {number | null} exitCode
 * @property {string | null} previewUrl
 * @property {string[]} previewUrls
 * @property {number | null} port
 */

/**
 * @typedef {object} LogChunk
 * @property {'stdout' | 'stderr' | 'system'} stream
 * @property {string} text
 */

/** @type {Map<string, ScriptRuntime>} */
const scripts = new Map();

/** @type {Map<string, LogChunk[]>} */
const logsByScript = new Map();

/** 当前选中的脚本名 */
let activeName = /** @type {string | null} */ (null);

/** @type {WebSocket | null} */
let socket = null;

/** 是否贴底滚动 */
let stickToBottom = true;

const elList = /** @type {HTMLElement} */ (document.getElementById('script-list'));
const elTerminal = /** @type {HTMLElement} */ (document.getElementById('terminal'));
const elActive = /** @type {HTMLElement} */ (document.getElementById('active-script'));
const elWs = /** @type {HTMLElement} */ (document.getElementById('ws-status'));
const btnClear = /** @type {HTMLButtonElement} */ (document.getElementById('btn-clear'));
const btnCopy = /** @type {HTMLButtonElement} */ (document.getElementById('btn-copy'));
const elTargetSelect = /** @type {HTMLSelectElement} */ (
  document.getElementById('target-package-select')
);
const elTargetMeta = /** @type {HTMLElement} */ (
  document.getElementById('target-package-meta')
);
const elHeaderTarget = /** @type {HTMLElement | null} */ (
  document.getElementById('header-target-name')
);

/**
 * @typedef {object} TargetInfo
 * @property {string} id
 * @property {string} dir
 * @property {string} relativePath
 * @property {string} name
 * @property {string} absolutePath
 * @property {'workspace' | 'external'} source
 */

/**
 * @typedef {object} PackageTarget
 * @property {string} id
 * @property {string} dir
 * @property {string} relativePath
 * @property {string} absolutePath
 * @property {string} name
 * @property {string} description
 * @property {string[]} scriptNames
 * @property {'workspace' | 'external'} source
 */

/** @type {TargetInfo | null} */
let currentTarget = null;

/** @type {PackageTarget[]} */
let packageOptions = [];

/** 避免程序填充 select 时触发 change */
let suppressTargetChange = false;

/**
 * 状态文案
 * @param {ScriptStatus} status
 */
function statusLabel(status) {
  switch (status) {
    case 'idle':
      return 'idle';
    case 'running':
      return 'running';
    case 'exited':
      return 'exited';
    case 'error':
      return 'error';
    default: {
      const _exhaustive = /** @type {never} */ (status);
      return String(_exhaustive);
    }
  }
}

/**
 * 调用控制 API
 * @param {string} name
 * @param {'start' | 'stop' | 'restart' | 'clear-logs'} action
 */
async function apiAction(name, action) {
  const res = await fetch(`/api/scripts/${encodeURIComponent(name)}/${action}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `请求失败 (${res.status})`);
  }
  return data;
}

/**
 * 应用目标包信息到 UI
 * @param {TargetInfo} target
 */
function applyTarget(target) {
  currentTarget = target;
  if (elHeaderTarget) {
    const tag = target.source === 'external' ? '外部' : '仓库';
    elHeaderTarget.textContent = `${target.name} · ${tag}`;
  }
  elTargetMeta.textContent = target.absolutePath || target.relativePath;
  if (elTargetSelect) {
    suppressTargetChange = true;
    elTargetSelect.value = target.id || target.absolutePath;
    suppressTargetChange = false;
  }
  const btnRemove = document.getElementById('btn-remove-external');
  if (btnRemove instanceof HTMLButtonElement) {
    btnRemove.disabled = target.source !== 'external';
  }
}

/**
 * 填充目标包下拉
 * @param {PackageTarget[]} packages
 * @param {TargetInfo | null} [selected]
 */
function fillPackageSelect(packages, selected) {
  packageOptions = packages;
  suppressTargetChange = true;
  elTargetSelect.innerHTML = '';

  const workspace = packages.filter((p) => p.source === 'workspace');
  const external = packages.filter((p) => p.source === 'external');

  /**
   * @param {string} label
   * @param {PackageTarget[]} list
   */
  function addGroup(label, list) {
    if (list.length === 0) {
      return;
    }
    const group = document.createElement('optgroup');
    group.label = label;
    for (const pkg of list) {
      const opt = document.createElement('option');
      opt.value = pkg.id;
      opt.textContent =
        pkg.source === 'external'
          ? `${pkg.dir} (${pkg.name})`
          : `${pkg.dir} (${pkg.name})`;
      opt.title = `${pkg.absolutePath}\nscripts: ${pkg.scriptNames.join(', ') || '无'}`;
      group.appendChild(opt);
    }
    elTargetSelect.appendChild(group);
  }

  addGroup('本仓库', workspace);
  addGroup('外部工程', external);

  if (selected) {
    elTargetSelect.value = selected.id || selected.absolutePath;
  }
  suppressTargetChange = false;
}

/**
 * 用服务端返回的 scripts 重置本地状态
 * @param {ScriptRuntime[]} list
 * @param {boolean} [clearLogs]
 */
function replaceScripts(list, clearLogs = true) {
  scripts.clear();
  if (clearLogs) {
    logsByScript.clear();
  }
  for (const item of list) {
    scripts.set(item.name, item);
    if (!logsByScript.has(item.name)) {
      logsByScript.set(item.name, []);
    }
  }
  activeName = list[0]?.name || null;
  stickToBottom = true;
  renderScriptList();
  renderTerminal();
  updateToolbar();
}

/**
 * 拉取脚本列表与目标包
 */
async function loadScripts() {
  const res = await fetch('/api/scripts');
  const data = await res.json();
  /** @type {ScriptRuntime[]} */
  const list = data.scripts || [];
  if (data.target) {
    applyTarget(data.target);
  }
  replaceScripts(list, false);
  for (const item of list) {
    if (!logsByScript.has(item.name)) {
      logsByScript.set(item.name, []);
    }
  }
  if (!activeName && list.length > 0) {
    activeName = list[0].name;
  }
  renderScriptList();
  renderTerminal();
  updateToolbar();
}

/**
 * 初始化目标包下拉框与外部路径
 */
async function initTargetPicker() {
  if (!elTargetSelect) {
    return;
  }

  const elExternalPath = /** @type {HTMLInputElement} */ (
    document.getElementById('target-external-path')
  );
  const btnAdd = /** @type {HTMLButtonElement} */ (
    document.getElementById('btn-add-external')
  );
  const btnRemove = /** @type {HTMLButtonElement} */ (
    document.getElementById('btn-remove-external')
  );

  /**
   * 刷新列表
   */
  async function reloadPackages() {
    const res = await fetch('/api/packages');
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      elTargetMeta.textContent = data.error || '无法加载目标包列表';
      return data;
    }
    fillPackageSelect(data.packages || [], data.target || currentTarget);
    if (data.target) {
      applyTarget(data.target);
    }
    return data;
  }

  await reloadPackages();

  elTargetSelect.addEventListener('change', async () => {
    if (suppressTargetChange) {
      return;
    }
    const id = elTargetSelect.value;
    const pkg = packageOptions.find((p) => p.id === id);
    const pathValue = pkg?.absolutePath || id;
    if (!pathValue || (currentTarget && currentTarget.id === id)) {
      return;
    }
    const label = pkg
      ? `${pkg.dir} (${pkg.relativePath || pkg.absolutePath})`
      : pathValue;
    const ok = confirm(
      `切换目标到「${label}」？\n若有正在运行的脚本会先停止。`
    );
    if (!ok) {
      if (currentTarget) {
        suppressTargetChange = true;
        elTargetSelect.value = currentTarget.id;
        suppressTargetChange = false;
      }
      return;
    }

    elTargetSelect.disabled = true;
    try {
      const switchRes = await fetch('/api/target', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path: pathValue,
          dir: pkg?.dir,
          id: pkg?.id || id
        })
      });
      const switchData = await switchRes.json().catch(() => ({}));
      if (!switchRes.ok) {
        throw new Error(switchData.error || `切换失败 (${switchRes.status})`);
      }
      applyTarget(switchData.target);
      replaceScripts(switchData.scripts || [], true);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      alert(`切换目标失败：\n${message}`);
      if (currentTarget) {
        suppressTargetChange = true;
        elTargetSelect.value = currentTarget.id;
        suppressTargetChange = false;
      }
    } finally {
      elTargetSelect.disabled = false;
    }
  });

  btnAdd?.addEventListener('click', async () => {
    const inputPath = elExternalPath?.value.trim();
    if (!inputPath) {
      alert('请填写外部工程路径（需包含 package.json）');
      return;
    }
    btnAdd.disabled = true;
    try {
      const res = await fetch('/api/packages/external', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: inputPath })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || `添加失败 (${res.status})`);
      }
      fillPackageSelect(data.packages || [], data.target || currentTarget);
      elExternalPath.value = '';
      // 添加后直接切过去
      const switchRes = await fetch('/api/target', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: data.package.absolutePath })
      });
      const switchData = await switchRes.json().catch(() => ({}));
      if (!switchRes.ok) {
        throw new Error(switchData.error || '添加成功但切换失败');
      }
      applyTarget(switchData.target);
      replaceScripts(switchData.scripts || [], true);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      alert(`添加外部工程失败：\n${message}`);
    } finally {
      btnAdd.disabled = false;
    }
  });

  btnRemove?.addEventListener('click', async () => {
    if (!currentTarget || currentTarget.source !== 'external') {
      alert('只能移除外部工程');
      return;
    }
    if (!confirm(`从列表移除外部工程？\n${currentTarget.absolutePath}`)) {
      return;
    }
    btnRemove.disabled = true;
    try {
      const res = await fetch('/api/packages/external', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: currentTarget.absolutePath })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || `移除失败 (${res.status})`);
      }
      fillPackageSelect(data.packages || [], data.target || null);
      if (data.target) {
        applyTarget(data.target);
      }
      await loadScripts();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      alert(`移除失败：\n${message}`);
    } finally {
      btnRemove.disabled = currentTarget?.source !== 'external';
    }
  });
}

/**
 * 渲染左侧脚本卡片
 */
function renderScriptList() {
  elList.innerHTML = '';
  for (const script of scripts.values()) {
    const card = document.createElement('article');
    card.className = 'script-card' + (script.name === activeName ? ' active' : '');
    card.dataset.name = script.name;
    /** 当前脚本是否正在运行 */
    const isRunning = script.status === 'running';

    const previewUrls = Array.isArray(script.previewUrls) && script.previewUrls.length
      ? script.previewUrls
      : script.previewUrl
        ? [script.previewUrl]
        : [];
    const hasPreview = previewUrls.length > 0;
    const previewLinks = hasPreview
      ? previewUrls
          .map(
            (url) =>
              `<a class="preview-link" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(url.replace(/^https?:\/\//, ''))}</a>`
          )
          .join('')
      : '';

    card.innerHTML = `
      <div class="script-card-head">
        <span class="script-name">${escapeHtml(script.name)}</span>
        <span class="badge badge-${script.status}">${statusLabel(script.status)}</span>
      </div>
      <p class="script-cmd">${escapeHtml(script.command)}</p>
      <div class="script-meta">
        <span>pid: ${script.pid ?? '—'}</span>
        <span>exit: ${script.exitCode ?? '—'}</span>
        <span>port: ${script.port ?? '—'}</span>
      </div>
      ${hasPreview ? `<div class="preview-links">${previewLinks}</div>` : ''}
      <div class="script-actions">
        <button type="button" class="btn btn-primary" data-action="start" ${
          isRunning ? 'disabled' : ''
        }>启动</button>
        <button type="button" class="btn btn-danger" data-action="stop" ${
          isRunning ? '' : 'disabled'
        }>停止</button>
        <button type="button" class="btn" data-action="restart">重启</button>
        <button type="button" class="btn" data-action="preview" ${
          hasPreview ? '' : 'disabled'
        } title="${hasPreview ? escapeHtml(previewUrls[0]) : '等待 Vite 输出端口'}">打开预览</button>
      </div>
    `;

    card.addEventListener('click', (e) => {
      const target = /** @type {HTMLElement} */ (e.target);
      const btn = target.closest('[data-action]');
      if (btn) {
        e.stopPropagation();
        void handleCardAction(script.name, btn.getAttribute('data-action'));
        return;
      }
      activeName = script.name;
      stickToBottom = true;
      renderScriptList();
      renderTerminal();
      updateToolbar();
    });

    elList.appendChild(card);
  }
}

/**
 * 处理卡片按钮
 * @param {string} name
 * @param {string | null} action
 */
async function handleCardAction(name, action) {
  try {
    if (action === 'preview') {
      const script = scripts.get(name);
      const url = script?.previewUrl || script?.previewUrls?.[0];
      if (url) {
        window.open(url, '_blank', 'noopener,noreferrer');
      }
      return;
    }
    if (action === 'start' || action === 'stop' || action === 'restart') {
      activeName = name;
      await apiAction(name, action);
      renderScriptList();
      renderTerminal();
      updateToolbar();
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    appendLocalLog(name, 'system', `[ui] ${message}\n`);
    alert(message);
  }
}

/**
 * 去掉 ANSI（复制纯文本用）
 * @param {string} text
 */
function stripAnsi(text) {
  return text
    .replace(/\u001b\[[0-9;?=]*[@-~]/g, '')
    .replace(/\u009b[0-9;?=]*[@-~]/g, '')
    .replace(/\u001b\][\s\S]*?(?:\u0007|\u001b\\)/g, '')
    .replace(/\u001b[@-Z\\-_]/g, '')
    .replace(/\u001b\[[0-9;?=]*$/g, '')
    .replace(/\u001b$/g, '');
}

/**
 * 转义 HTML（不含 ANSI 处理）
 * @param {string} text
 */
function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** ANSI 16 色前景 */
const ANSI_FG = [
  '#000000',
  '#cd3131',
  '#0dbc79',
  '#e5e510',
  '#2472c8',
  '#bc3fbc',
  '#11a8cd',
  '#e5e5e5'
];

/** ANSI 亮色前景 */
const ANSI_FG_BRIGHT = [
  '#666666',
  '#f14c4c',
  '#23d18b',
  '#f5f543',
  '#3b8eea',
  '#d670d6',
  '#29b8db',
  '#ffffff'
];

/**
 * 将含 ANSI 的日志转为带样式的 HTML
 * @param {string} text
 */
function ansiToHtml(text) {
  let html = '';
  let style = {
    fg: /** @type {string | null} */ (null),
    bg: /** @type {string | null} */ (null),
    bold: false,
    dim: false,
    underline: false
  };

  /**
   * 当前样式对应的 CSS
   */
  function cssFromStyle() {
    /** @type {string[]} */
    const parts = [];
    if (style.fg) {
      parts.push(`color:${style.fg}`);
    }
    if (style.bg) {
      parts.push(`background-color:${style.bg}`);
    }
    if (style.bold) {
      parts.push('font-weight:700');
    }
    if (style.dim) {
      parts.push('opacity:0.65');
    }
    if (style.underline) {
      parts.push('text-decoration:underline');
    }
    return parts.join(';');
  }

  /**
   * 写入一段纯文本
   * @param {string} plain
   */
  function pushPlain(plain) {
    if (!plain) {
      return;
    }
    const css = cssFromStyle();
    const escaped = escapeHtml(plain);
    if (css) {
      html += `<span style="${css}">${escaped}</span>`;
    } else {
      html += escaped;
    }
  }

  /**
   * 应用 SGR 参数
   * @param {number[]} codes
   */
  function applySgr(codes) {
    if (codes.length === 0) {
      codes = [0];
    }
    for (let i = 0; i < codes.length; i++) {
      const code = codes[i];
      switch (code) {
        case 0:
          style = { fg: null, bg: null, bold: false, dim: false, underline: false };
          break;
        case 1:
          style.bold = true;
          break;
        case 2:
          style.dim = true;
          break;
        case 4:
          style.underline = true;
          break;
        case 22:
          style.bold = false;
          style.dim = false;
          break;
        case 24:
          style.underline = false;
          break;
        case 39:
          style.fg = null;
          break;
        case 49:
          style.bg = null;
          break;
        default: {
          if (code >= 30 && code <= 37) {
            style.fg = ANSI_FG[code - 30];
          } else if (code >= 90 && code <= 97) {
            style.fg = ANSI_FG_BRIGHT[code - 90];
          } else if (code >= 40 && code <= 47) {
            style.bg = ANSI_FG[code - 40];
          } else if (code >= 100 && code <= 107) {
            style.bg = ANSI_FG_BRIGHT[code - 100];
          } else if (code === 38 || code === 48) {
            // 256 / truecolor：简化跳过后续参数
            const next = codes[i + 1];
            if (next === 5) {
              i += 2;
            } else if (next === 2) {
              i += 4;
            }
          }
          break;
        }
      }
    }
  }

  const re = /\u001b\[([0-9;]*)([@-~])|\u009b([0-9;]*)([@-~])/g;
  let last = 0;
  let match;
  while ((match = re.exec(text)) !== null) {
    pushPlain(text.slice(last, match.index));
    last = re.lastIndex;
    const finalByte = match[2] || match[4];
    const params = match[1] || match[3] || '';
    if (finalByte === 'm') {
      const codes = params
        ? params.split(';').map((n) => Number(n) || 0)
        : [0];
      applySgr(codes);
    }
    // 其它 CSI 直接丢弃（光标控制等）
  }
  pushPlain(text.slice(last));
  // 去掉未闭合的半截 ESC，避免露出乱码
  return html.replace(/\u001b\[[0-9;?=]*$/g, '').replace(/\u001b$/g, '');
}

/**
 * 追加本地提示日志（不经过服务端）
 * @param {string} name
 * @param {LogChunk['stream']} stream
 * @param {string} text
 */
function appendLocalLog(name, stream, text) {
  const list = logsByScript.get(name) || [];
  list.push({ stream, text });
  logsByScript.set(name, list);
  if (name === activeName) {
    renderTerminal();
  }
}

/**
 * 渲染终端区域
 */
function renderTerminal() {
  if (!activeName) {
    elActive.textContent = '—';
    elTerminal.innerHTML = '<span class="empty-hint">暂无脚本</span>';
    return;
  }

  elActive.textContent = activeName;
  const chunks = logsByScript.get(activeName) || [];
  if (chunks.length === 0) {
    elTerminal.innerHTML = '<span class="empty-hint">暂无日志。点击「启动」开始运行。</span>';
    return;
  }

  const html = chunks
    .map((chunk) => {
      const cls =
        chunk.stream === 'stderr'
          ? 'line-stderr'
          : chunk.stream === 'system'
            ? 'line-system'
            : '';
      const body =
        chunk.stream === 'stdout' || chunk.stream === 'stderr'
          ? ansiToHtml(chunk.text)
          : escapeHtml(chunk.text);
      return `<span class="${cls}">${body}</span>`;
    })
    .join('');

  elTerminal.innerHTML = html;
  if (stickToBottom) {
    elTerminal.scrollTop = elTerminal.scrollHeight;
  }
}

/**
 * 更新工具栏按钮状态
 */
function updateToolbar() {
  const enabled = Boolean(activeName);
  btnClear.disabled = !enabled;
  btnCopy.disabled = !enabled;
}

/**
 * 合并脚本状态
 * @param {Partial<ScriptRuntime> & { name: string }} patch
 */
function upsertScript(patch) {
  const prev = scripts.get(patch.name) || {
    name: patch.name,
    command: '',
    status: /** @type {ScriptStatus} */ ('idle'),
    pid: null,
    exitCode: null,
    previewUrl: null,
    previewUrls: [],
    port: null
  };
  scripts.set(patch.name, { ...prev, ...patch });
}

/**
 * 处理 WS 事件
 * @param {any} event
 */
function handleEvent(event) {
  switch (event.type) {
    case 'snapshot': {
      // 重连时先清空本地日志，避免与服务端回放重复
      if (event.target) {
        applyTarget(event.target);
      }
      replaceScripts(event.scripts || [], true);
      break;
    }
    case 'target': {
      if (event.target) {
        applyTarget(event.target);
      }
      replaceScripts(event.scripts || [], true);
      break;
    }
    case 'log': {
      // snapshot 回放时服务端会清空前可能重复；这里直接追加
      const list = logsByScript.get(event.script) || [];
      // clear-logs 后服务端会发 system「日志已清空」——若上一句是清空标记则重置缓冲
      if (
        event.stream === 'system' &&
        typeof event.text === 'string' &&
        event.text.includes('日志已清空')
      ) {
        logsByScript.set(event.script, [{ stream: 'system', text: event.text }]);
      } else {
        list.push({ stream: event.stream, text: event.text });
        logsByScript.set(event.script, list);
      }
      if (event.script === activeName) {
        renderTerminal();
      }
      break;
    }
    case 'status': {
      upsertScript({
        name: event.script,
        status: event.status,
        pid: event.pid,
        exitCode: event.exitCode
      });
      renderScriptList();
      break;
    }
    case 'port': {
      upsertScript({
        name: event.script,
        port: event.port,
        previewUrl: event.previewUrl,
        previewUrls: event.previewUrls || []
      });
      renderScriptList();
      break;
    }
    case 'error': {
      const target = event.script || activeName;
      if (target) {
        appendLocalLog(target, 'system', `[error] ${event.message}\n`);
      }
      break;
    }
    default:
      break;
  }
}

/**
 * 连接 WebSocket（断线自动重连）
 */
function connectWs() {
  const proto = location.protocol === 'https:' ? 'wss' : 'ws';
  socket = new WebSocket(`${proto}://${location.host}/ws`);

  socket.addEventListener('open', () => {
    elWs.textContent = 'WS 已连接';
    elWs.classList.remove('ws-offline');
    elWs.classList.add('ws-online');
  });

  socket.addEventListener('close', () => {
    elWs.textContent = 'WS 未连接';
    elWs.classList.remove('ws-online');
    elWs.classList.add('ws-offline');
    setTimeout(connectWs, 1500);
  });

  socket.addEventListener('message', (msg) => {
    try {
      const event = JSON.parse(String(msg.data));
      handleEvent(event);
    } catch (err) {
      console.error('解析 WS 消息失败', err);
    }
  });
}

elTerminal.addEventListener('scroll', () => {
  const gap =
    elTerminal.scrollHeight - elTerminal.scrollTop - elTerminal.clientHeight;
  stickToBottom = gap < 40;
});

btnClear.addEventListener('click', async () => {
  if (!activeName) return;
  try {
    await apiAction(activeName, 'clear-logs');
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    alert(message);
  }
});

btnCopy.addEventListener('click', async () => {
  if (!activeName) return;
  const chunks = logsByScript.get(activeName) || [];
  const text = stripAnsi(chunks.map((c) => c.text).join(''));
  try {
    await navigator.clipboard.writeText(text);
    btnCopy.textContent = '已复制';
    setTimeout(() => {
      btnCopy.textContent = '复制';
    }, 1200);
  } catch {
    alert('复制失败，请手动选择终端文本');
  }
});

try {
  await initTargetPicker();
  await loadScripts();
} catch (err) {
  console.error('[devRunner] 初始化失败', err);
}
connectWs();
initAppTabs();
initUserJump();
initGitBranch();
