/**
 * Git 分支信息展示与切换
 */

/**
 * @typedef {object} GitInfo
 * @property {string} root
 * @property {string | null} branch
 * @property {boolean} detached
 * @property {string} commit
 * @property {boolean} dirty
 * @property {string[]} localBranches
 * @property {string[]} remoteBranches
 */

/**
 * 初始化 header 中的分支控件
 */
export function initGitBranch() {
  const elMeta = /** @type {HTMLElement} */ (
    document.querySelector('.header-meta')
  );
  if (!elMeta) {
    return;
  }

  const wrap = document.createElement('div');
  wrap.className = 'git-branch';
  wrap.innerHTML = `
    <span class="git-label">分支</span>
    <select id="git-branch-select" class="git-select" title="切换分支"></select>
    <span id="git-commit" class="git-commit" title="当前 commit">—</span>
    <span id="git-dirty" class="git-dirty hidden" title="工作区有未提交改动">dirty</span>
    <button type="button" id="btn-git-refresh" class="btn btn-ghost git-refresh" title="刷新分支信息">刷新</button>
  `;
  elMeta.insertBefore(wrap, elMeta.firstChild);

  const elSelect = /** @type {HTMLSelectElement} */ (
    document.getElementById('git-branch-select')
  );
  const elCommit = /** @type {HTMLElement} */ (
    document.getElementById('git-commit')
  );
  const elDirty = /** @type {HTMLElement} */ (
    document.getElementById('git-dirty')
  );
  const btnRefresh = /** @type {HTMLButtonElement} */ (
    document.getElementById('btn-git-refresh')
  );

  /** 避免程序填充 select 时触发 change */
  let suppressChange = false;

  /**
   * @param {GitInfo} git
   */
  function render(git) {
    suppressChange = true;
    elSelect.innerHTML = '';

    const localGroup = document.createElement('optgroup');
    localGroup.label = '本地分支';
    for (const name of git.localBranches) {
      const opt = document.createElement('option');
      opt.value = name;
      opt.textContent = name;
      if (git.branch === name) {
        opt.selected = true;
      }
      localGroup.appendChild(opt);
    }
    elSelect.appendChild(localGroup);

    const remoteOnly = git.remoteBranches.filter((remote) => {
      const short = remote.replace(/^[^/]+\//, '');
      return !git.localBranches.includes(short);
    });
    if (remoteOnly.length > 0) {
      const remoteGroup = document.createElement('optgroup');
      remoteGroup.label = '远程分支（检出将创建本地跟踪）';
      for (const name of remoteOnly) {
        const opt = document.createElement('option');
        opt.value = name;
        opt.textContent = name;
        remoteGroup.appendChild(opt);
      }
      elSelect.appendChild(remoteGroup);
    }

    if (git.detached) {
      const opt = document.createElement('option');
      opt.value = '';
      opt.textContent = `(detached ${git.commit})`;
      opt.selected = true;
      opt.disabled = true;
      elSelect.insertBefore(opt, elSelect.firstChild);
    }

    elCommit.textContent = git.commit || '—';
    elDirty.classList.toggle('hidden', !git.dirty);
    elSelect.title = git.root;
    suppressChange = false;
  }

  /**
   * 拉取分支信息
   */
  async function refresh() {
    btnRefresh.disabled = true;
    try {
      const res = await fetch('/api/git');
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || `请求失败 (${res.status})`);
      }
      render(/** @type {{ git: GitInfo }} */ (data).git);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      elCommit.textContent = 'error';
      console.error('[git]', message);
    } finally {
      btnRefresh.disabled = false;
    }
  }

  elSelect.addEventListener('change', async () => {
    if (suppressChange) {
      return;
    }
    const branch = elSelect.value;
    if (!branch) {
      return;
    }

    const currentLabel =
      elSelect.querySelector('option:checked')?.textContent || branch;
    const ok = confirm(
      `切换到分支「${currentLabel}」？\n若有正在运行的脚本会先停止。`
    );
    if (!ok) {
      await refresh();
      return;
    }

    elSelect.disabled = true;
    btnRefresh.disabled = true;
    try {
      const res = await fetch('/api/git/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ branch })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || `切换失败 (${res.status})`);
      }
      render(/** @type {{ git: GitInfo }} */ (data).git);
      if (Array.isArray(data.stoppedScripts) && data.stoppedScripts.length) {
        alert(
          `已停止脚本：${data.stoppedScripts.join(', ')}\n已切换到 ${data.git.branch || data.git.commit}`
        );
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      alert(`切换分支失败：\n${message}`);
      await refresh();
    } finally {
      elSelect.disabled = false;
      btnRefresh.disabled = false;
    }
  });

  btnRefresh.addEventListener('click', () => {
    void refresh();
  });

  void refresh();
}
