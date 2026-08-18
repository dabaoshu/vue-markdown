/**
 * 用户信息跳转表格：多角色 token + host/port
 * 数据保存在服务端 user-jump.json
 */

/**
 * @typedef {object} UserProfile
 * @property {string} id
 * @property {string} role
 * @property {string} host
 * @property {number} port
 * @property {string} accessToken
 */

/**
 * @returns {string}
 */
function createId() {
  return `p_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * 从服务端读取配置
 * @returns {Promise<UserProfile[]>}
 */
async function loadProfiles() {
  const res = await fetch('/api/user-jump');
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `读取失败 (${res.status})`);
  }
  return Array.isArray(data.profiles) ? data.profiles : [];
}

/**
 * 保存到服务端 JSON
 * @param {UserProfile[]} profiles
 */
async function saveProfiles(profiles) {
  const res = await fetch('/api/user-jump', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ profiles })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `保存失败 (${res.status})`);
  }
  return Array.isArray(data.profiles) ? data.profiles : profiles;
}

/**
 * 组装跳转 URL
 * @param {Pick<UserProfile, 'host' | 'port' | 'accessToken'>} profile
 */
export function buildProfileUrl(profile) {
  const host = (profile.host || 'localhost').trim() || 'localhost';
  const port = Number(profile.port) || 80;
  const token = (profile.accessToken || '').trim();
  const base = `http://${host}:${port}`;
  if (!token) {
    return base;
  }
  const url = new URL(base);
  url.searchParams.set('accessToken', token);
  return url.toString();
}

/**
 * 转义 HTML
 * @param {string} text
 */
function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * 初始化用户跳转表格
 */
export async function initUserJump() {
  const tbody = /** @type {HTMLElement} */ (
    document.getElementById('user-jump-tbody')
  );
  const btnAdd = /** @type {HTMLButtonElement} */ (
    document.getElementById('btn-profile-add')
  );

  /** @type {UserProfile[]} */
  let profiles = [];
  try {
    profiles = await loadProfiles();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    tbody.innerHTML = `<tr><td colspan="6">${escapeHtml(message)}</td></tr>`;
    return;
  }

  /** @type {ReturnType<typeof setTimeout> | null} */
  let saveTimer = null;

  /**
   * 从某一行 DOM 读取配置
   * @param {HTMLTableRowElement} tr
   * @returns {UserProfile | null}
   */
  function readRow(tr) {
    const id = tr.dataset.id;
    if (!id) {
      return null;
    }
    const role =
      /** @type {HTMLInputElement} */ (tr.querySelector('[data-field="role"]'))
        .value.trim() || '未命名角色';
    const host =
      /** @type {HTMLInputElement} */ (tr.querySelector('[data-field="host"]'))
        .value.trim() || 'localhost';
    const port =
      Number(
        /** @type {HTMLInputElement} */ (tr.querySelector('[data-field="port"]'))
          .value
      ) || 80;
    const accessToken =
      /** @type {HTMLInputElement} */ (
        tr.querySelector('[data-field="token"]')
      ).value.trim();
    return { id, role, host, port, accessToken };
  }

  /**
   * 从 DOM 收集当前表
   * @returns {UserProfile[]}
   */
  function collectFromDom() {
    /** @type {UserProfile[]} */
    const next = [];
    for (const tr of tbody.querySelectorAll('tr')) {
      const row = readRow(/** @type {HTMLTableRowElement} */ (tr));
      if (row) {
        next.push(row);
      }
    }
    return next;
  }

  /**
   * 写入 JSON 文件
   * @param {UserProfile[]} next
   */
  async function persist(next) {
    try {
      profiles = await saveProfiles(next);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      alert(`保存 user-jump.json 失败：\n${message}`);
    }
  }

  /**
   * 防抖保存
   */
  function scheduleSave() {
    profiles = collectFromDom();
    if (saveTimer) {
      clearTimeout(saveTimer);
    }
    saveTimer = setTimeout(() => {
      void persist(profiles);
    }, 300);
  }

  /**
   * 更新某一行预览链接
   * @param {HTMLTableRowElement} tr
   */
  function updateRowPreview(tr) {
    const row = readRow(tr);
    const el = tr.querySelector('[data-preview]');
    if (el && row) {
      el.textContent = buildProfileUrl(row);
    }
  }

  /**
   * 渲染表格
   */
  function renderTable() {
    tbody.innerHTML = '';
    for (const p of profiles) {
      const tr = document.createElement('tr');
      tr.dataset.id = p.id;
      const url = buildProfileUrl(p);
      tr.innerHTML = `
        <td>
          <input data-field="role" type="text" value="${escapeHtml(p.role)}" placeholder="角色名" />
        </td>
        <td>
          <input data-field="host" type="text" value="${escapeHtml(p.host)}" placeholder="localhost" />
        </td>
        <td class="col-port">
          <input data-field="port" type="number" min="1" max="65535" value="${escapeHtml(String(p.port))}" />
        </td>
        <td>
          <input data-field="token" type="text" value="${escapeHtml(p.accessToken)}" placeholder="accessToken" />
        </td>
        <td class="col-url">
          <span class="user-jump-url" data-preview>${escapeHtml(url)}</span>
        </td>
        <td class="col-actions">
          <div class="user-jump-row-actions">
            <button type="button" class="btn btn-primary" data-action="open">跳转</button>
            <button type="button" class="btn btn-ghost" data-action="copy">复制</button>
            <button type="button" class="btn btn-danger" data-action="delete">删除</button>
          </div>
        </td>
      `;

      tr.addEventListener('input', (e) => {
        const target = /** @type {HTMLElement} */ (e.target);
        if (target.matches('input[data-field]')) {
          updateRowPreview(tr);
          scheduleSave();
        }
      });

      tr.addEventListener('click', async (e) => {
        const target = /** @type {HTMLElement} */ (e.target);
        const btn = target.closest('[data-action]');
        if (!btn) {
          return;
        }
        const action = btn.getAttribute('data-action');
        const row = readRow(tr);
        if (!row) {
          return;
        }

        if (action === 'open') {
          profiles = collectFromDom();
          await persist(profiles);
          window.open(buildProfileUrl(row), '_blank', 'noopener,noreferrer');
          return;
        }

        if (action === 'copy') {
          try {
            await navigator.clipboard.writeText(buildProfileUrl(row));
            const label = btn.textContent;
            btn.textContent = '已复制';
            setTimeout(() => {
              btn.textContent = label || '复制';
            }, 900);
          } catch {
            alert('复制失败');
          }
          return;
        }

        if (action === 'delete') {
          if (profiles.length <= 1) {
            alert('至少保留一行');
            return;
          }
          profiles = collectFromDom().filter((item) => item.id !== row.id);
          await persist(profiles);
          renderTable();
        }
      });

      tbody.appendChild(tr);
    }
  }

  btnAdd.addEventListener('click', async () => {
    profiles = collectFromDom();
    profiles.push({
      id: createId(),
      role: `角色${profiles.length + 1}`,
      host: 'localhost',
      port: 5173,
      accessToken: ''
    });
    await persist(profiles);
    renderTable();
    const last = tbody.querySelector('tr:last-child input[data-field="token"]');
    if (last instanceof HTMLInputElement) {
      last.focus();
    }
  });

  renderTable();
}
