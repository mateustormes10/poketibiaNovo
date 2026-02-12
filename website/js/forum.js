(() => {
  const root = document.getElementById('forum-root');
  if (!root) return;

  const t = (key, vars) => (window.I18N && typeof window.I18N.t === 'function' ? window.I18N.t(key, vars) : key);
  const getLocale = () => (window.I18N && typeof window.I18N.locale === 'function' ? window.I18N.locale() : 'en-US');

  function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
  }

  function getAccountId() {
    return getCookie('account_id') || localStorage.getItem('account_id');
  }

  function escapeHtml(text) {
    return String(text)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function formatDate(dateStr) {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return dateStr;
    return d.toLocaleString(getLocale());
  }

  function qs() {
    return new URLSearchParams(window.location.search);
  }

  function setQuery(next) {
    const url = new URL(window.location.href);
    url.search = next.toString();
    window.history.pushState({}, '', url);
    render();
  }

  async function api(action, params = {}, options = {}) {
    const url = new URL('backend/forum.php', window.location.href);
    url.searchParams.set('action', action);
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v));
    });

    const res = await fetch(url.toString(), {
      method: options.method || 'GET',
      headers: options.body ? { 'Content-Type': 'application/json' } : undefined,
      body: options.body ? JSON.stringify(options.body) : undefined,
      credentials: 'same-origin',
    });

    const data = await res.json().catch(() => null);
    if (!data || data.success !== true) {
      const msg = data?.error || t('forum.callError', { action });
      throw new Error(msg);
    }
    return data;
  }

  function renderBreadcrumb(items) {
    const html = `
      <div class="forum-breadcrumb">
        ${items
          .map((it, idx) => {
            const safeLabel = escapeHtml(it.label);
            if (it.onClick) {
              return `<button class="forum-link" data-bc="${idx}">${safeLabel}</button>`;
            }
            return `<span class="forum-crumb">${safeLabel}</span>`;
          })
          .join('<span class="forum-sep">/</span>')}
      </div>
    `;

    root.innerHTML = html + `<div id="forum-content"></div>`;
    const bcButtons = root.querySelectorAll('[data-bc]');
    bcButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const i = Number(btn.getAttribute('data-bc'));
        items[i]?.onClick?.();
      });
    });

    return root.querySelector('#forum-content');
  }

  async function renderCategories() {
    const content = renderBreadcrumb([
      { label: t('forum.forum') },
    ]);
    content.innerHTML = `<p style="margin:0;">${t('forum.loadingCategories')}</p>`;

    const data = await api('list_categories');

    const rows = data.categories
      .map((c) => {
        return `
          <tr>
            <td>
              <div style="display:flex; flex-direction:column; gap:6px;">
                <div style="display:flex; align-items:center; gap:10px;">
                  <button class="forum-link" data-category="${c.id}">${escapeHtml(c.name)}</button>
                  ${Number(c.is_locked) === 1 ? `<span class="forum-pill">${t('forum.locked')}</span>` : ''}
                </div>
                ${c.description ? `<div class="forum-muted">${escapeHtml(c.description)}</div>` : ''}
              </div>
            </td>
            <td style="white-space:nowrap; text-align:right;">${formatDate(c.created_at)}</td>
          </tr>
        `;
      })
      .join('');

    content.innerHTML = `
      <div class="account-box" style="margin:0;">
        <table class="news-table">
          <thead>
            <tr>
              <th>${t('forum.board')}</th>
              <th style="text-align:right;">${t('forum.created')}</th>
            </tr>
          </thead>
          <tbody>
            ${rows || `<tr><td colspan="2">${t('forum.noCategories')}</td></tr>`}
          </tbody>
        </table>
      </div>
    `;

    content.querySelectorAll('[data-category]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const categoryId = btn.getAttribute('data-category');
        const p = qs();
        p.delete('topic_id');
        p.set('category_id', categoryId);
        setQuery(p);
      });
    });
  }

  async function renderTopics(categoryId) {
    let content = renderBreadcrumb([
      { label: t('forum.forum'), onClick: () => setQuery(new URLSearchParams()) },
      { label: `${t('forum.board')} #${categoryId}` },
    ]);
    content.innerHTML = `<p style="margin:0;">${t('forum.loadingTopics')}</p>`;

    const data = await api('list_topics', { category_id: categoryId });

    content = renderBreadcrumb([
      { label: t('forum.forum'), onClick: () => setQuery(new URLSearchParams()) },
      { label: data.category.name },
    ]);

    const isLogged = !!getAccountId();

    const rows = data.topics
      .map((t) => {
        return `
          <tr>
            <td>
              <div style="display:flex; flex-direction:column; gap:6px;">
                <div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap;">
                  <button class="forum-link" data-topic="${t.id}">${escapeHtml(t.title)}</button>
                  ${Number(t.is_locked) === 1 ? `<span class="forum-pill">${t('forum.locked')}</span>` : ''}
                </div>
                <div class="forum-muted">${t('common.by', { name: escapeHtml(t.author_username) })} • ${formatDate(t.created_at)}</div>
              </div>
            </td>
            <td style="white-space:nowrap; text-align:right;">${Number(t.replies || 0)}</td>
            <td style="white-space:nowrap; text-align:right;">${Number(t.views || 0)}</td>
            <td style="white-space:nowrap; text-align:right;">${formatDate(t.last_post_at || t.created_at)}</td>
          </tr>
        `;
      })
      .join('');

    const createBox = isLogged
      ? `
        <div class="account-box" style="margin:0;">
          <h3 style="margin:0 0 12px 0;">${t('forum.createTopic')}</h3>
          <div class="form-row">
            <label>${t('forum.topicTitle')}</label>
            <textarea id="new-topic-title" class="textarea" rows="2" maxlength="140" placeholder="${escapeHtml(t('forum.topicTitlePh'))}"></textarea>
          </div>
          <div class="form-row">
            <label>${t('forum.topicMessage')}</label>
            <textarea id="new-topic-content" class="textarea" rows="5" placeholder="${escapeHtml(t('forum.topicMessagePh'))}"></textarea>
          </div>
          <div style="display:flex; gap:10px; justify-content:flex-end;">
            <button id="new-topic-submit" class="btn">${t('forum.publish')}</button>
          </div>
          <p id="new-topic-error" class="form-error" style="display:none;"></p>
        </div>
      `
      : `
        <div class="account-box" style="margin:0;">
          <p style="margin:0;">${t('forum.loginToCreate')}</p>
        </div>
      `;

    content.innerHTML = `
      <div style="display:flex; flex-direction:column; gap:14px;">
        ${createBox}
        <div class="account-box" style="margin:0;">
          <table class="news-table">
            <thead>
              <tr>
                <th>${t('forum.thread')}</th>
                <th style="text-align:right;">${t('forum.replies')}</th>
                <th style="text-align:right;">${t('forum.views')}</th>
                <th style="text-align:right;">${t('forum.last')}</th>
              </tr>
            </thead>
            <tbody>
              ${rows || `<tr><td colspan="4">${t('forum.noneTopics')}</td></tr>`}
            </tbody>
          </table>
        </div>
      </div>
    `;

    content.querySelectorAll('[data-topic]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const topicId = btn.getAttribute('data-topic');
        const p = qs();
        p.set('category_id', String(categoryId));
        p.set('topic_id', String(topicId));
        setQuery(p);
      });
    });

    const submit = content.querySelector('#new-topic-submit');
    if (submit) {
      submit.addEventListener('click', async () => {
        const title = content.querySelector('#new-topic-title').value.trim();
        const msg = content.querySelector('#new-topic-content').value.trim();
        const err = content.querySelector('#new-topic-error');
        err.style.display = 'none';

        try {
          submit.disabled = true;
          const created = await api('create_topic', {}, { method: 'POST', body: { category_id: categoryId, title, content: msg } });
          const p = qs();
          p.set('category_id', String(categoryId));
          p.set('topic_id', String(created.topic_id));
          setQuery(p);
        } catch (e) {
          err.textContent = e.message;
          err.style.display = 'block';
        } finally {
          submit.disabled = false;
        }
      });
    }
  }

  async function renderTopic(topicId) {
    let content = renderBreadcrumb([
      { label: t('forum.forum'), onClick: () => setQuery(new URLSearchParams()) },
      { label: t('common.loading') },
    ]);
    content.innerHTML = `<p style="margin:0;">${t('forum.loadingTopic')}</p>`;

    const data = await api('get_topic', { topic_id: topicId });

    content = renderBreadcrumb([
      { label: t('forum.forum'), onClick: () => setQuery(new URLSearchParams()) },
      {
        label: data.topic.category_name,
        onClick: () => {
          const p = new URLSearchParams();
          p.set('category_id', String(data.topic.category_id));
          setQuery(p);
        },
      },
      { label: data.topic.title },
    ]);

    const isLogged = !!getAccountId();
    const isLocked = Number(data.topic.is_locked) === 1;

    const postsHtml = (data.posts || [])
      .map((p, idx) => {
        const meta = `${escapeHtml(p.author_username)} • ${formatDate(p.created_at)}${p.updated_at ? ` (${t('forum.edited', { date: formatDate(p.updated_at) })})` : ''}`;
        const safeContent = escapeHtml(p.content).replaceAll('\n', '<br>');
        const likes = Number(p.likes || 0);

        return `
          <div class="forum-post" data-post="${p.id}">
            <div class="forum-post-header">
              <div class="forum-post-title">#${idx + 1}</div>
              <div class="forum-muted">${meta}</div>
            </div>
            <div class="forum-post-body">${safeContent}</div>
            <div class="forum-post-actions">
              <button class="btn" data-like="${p.id}" ${!isLogged ? 'disabled' : ''}>${t('forum.like')} (<span data-like-count="${p.id}">${likes}</span>)</button>
            </div>
          </div>
        `;
      })
      .join('');

    const replyBox = isLogged
      ? `
        <div class="account-box" style="margin:0;">
          <h3 style="margin:0 0 12px 0;">${t('forum.reply')}</h3>
          ${isLocked ? `<p style="margin:0;">${t('forum.topicLocked')}</p>` : `
            <div class="form-row">
              <label>${t('forum.topicMessage')}</label>
              <textarea id="reply-content" class="textarea" rows="5" placeholder="${escapeHtml(t('forum.replyPh'))}"></textarea>
            </div>
            <div style="display:flex; gap:10px; justify-content:flex-end;">
              <button id="reply-submit" class="btn">${t('forum.postReply')}</button>
            </div>
            <p id="reply-error" class="form-error" style="display:none;"></p>
          `}
        </div>
      `
      : `
        <div class="account-box" style="margin:0;">
          <p style="margin:0;">${t('forum.loginToReply')}</p>
        </div>
      `;

    content.innerHTML = `
      <div style="display:flex; flex-direction:column; gap:14px;">
        <div class="account-box" style="margin:0;">
          <div style="display:flex; justify-content:space-between; gap:12px; align-items:flex-start; flex-wrap:wrap;">
            <div>
              <h3 style="margin:0;">${escapeHtml(data.topic.title)}</h3>
              <div class="forum-muted">${t('common.by', { name: escapeHtml(data.topic.author_username) })} • ${formatDate(data.topic.created_at)} • ${t('forum.views')}: ${Number(data.topic.views || 0)}</div>
            </div>
            ${isLocked ? `<span class="forum-pill">${t('forum.locked')}</span>` : ''}
          </div>
        </div>

        ${postsHtml || `<div class="account-box" style="margin:0;">${t('forum.noPosts')}</div>`}

        ${replyBox}
      </div>
    `;

    content.querySelectorAll('[data-like]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const postId = btn.getAttribute('data-like');
        if (!postId) return;
        try {
          btn.disabled = true;
          const res = await api('react', {}, { method: 'POST', body: { post_id: postId, type: 'like' } });
          const counter = content.querySelector(`[data-like-count="${postId}"]`);
          if (counter) counter.textContent = String(res.likes);
        } catch (e) {
          alert(e.message);
        } finally {
          btn.disabled = false;
        }
      });
    });

    const replyBtn = content.querySelector('#reply-submit');
    if (replyBtn) {
      replyBtn.addEventListener('click', async () => {
        const msg = content.querySelector('#reply-content').value.trim();
        const err = content.querySelector('#reply-error');
        err.style.display = 'none';

        try {
          replyBtn.disabled = true;
          await api('create_post', {}, { method: 'POST', body: { topic_id: topicId, content: msg } });
          await renderTopic(topicId);
          const textarea = root.querySelector('#reply-content');
          if (textarea) textarea.value = '';
        } catch (e) {
          err.textContent = e.message;
          err.style.display = 'block';
        } finally {
          replyBtn.disabled = false;
        }
      });
    }
  }

  async function render() {
    try {
      const p = qs();
      const categoryId = p.get('category_id');
      const topicId = p.get('topic_id');

      if (topicId) {
        await renderTopic(topicId);
        return;
      }
      if (categoryId) {
        await renderTopics(categoryId);
        return;
      }

      await renderCategories();
    } catch (e) {
      root.innerHTML = `
        <div class="account-box" style="margin:0;">
          <p class="form-error" style="margin:0;">${escapeHtml(e.message)}</p>
        </div>
      `;
    }
  }

  window.addEventListener('popstate', () => render());
  render();
})();
