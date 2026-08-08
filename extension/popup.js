const LOCAL_DAEMON_URL = "http://127.0.0.1:54321";

function showToast(msg) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.style.display = 'block';
  setTimeout(() => {
    toast.style.display = 'none';
  }, 2000);
}

document.addEventListener('DOMContentLoaded', async () => {
  const statusBadge = document.getElementById('statusBadge');
  const statusText = document.getElementById('statusText');
  const currentDomainEl = document.getElementById('currentDomain');
  const contentArea = document.getElementById('contentArea');

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab.url) {
    currentDomainEl.textContent = "Nenhum site ativo";
    contentArea.innerHTML = `<div class="empty-state">Abra uma aba de navegador válida.</div>`;
    return;
  }

  let domain = "";
  try {
    const urlObj = new URL(tab.url);
    domain = urlObj.hostname.replace(/^www\./, '');
    currentDomainEl.textContent = domain;
  } catch (e) {
    currentDomainEl.textContent = tab.url;
  }

  try {
    const response = await fetch(`${LOCAL_DAEMON_URL}/get-credentials?domain=${encodeURIComponent(domain)}&url=${encodeURIComponent(tab.url)}`);
    const data = await response.json();

    if (data && data.status === 'ok' && (data.credentials || (data.matches && data.matches.length > 0))) {
      statusBadge.className = 'status-badge';
      statusText.textContent = 'Desbloqueado & Sincronizado';

      const matches = data.matches && data.matches.length > 0 ? data.matches : [data.credentials];
      contentArea.innerHTML = '';

      matches.forEach((item) => {
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
          <div class="card-header">
            <div class="avatar">${(item.username || item.service || 'U').slice(0, 1).toUpperCase()}</div>
            <div class="account-info">
              <div class="account-username">${item.username || 'Sem Usuário'}</div>
              <div class="account-service">${item.service} ${item.totp_code ? '🛡 2FA Ativo' : ''}</div>
            </div>
          </div>
          <button class="action-btn autofill-btn">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
            </svg>
            Preencher no Site Agora
          </button>
          <div class="btn-row">
            <button class="secondary-btn copy-pass-btn">📋 Copiar Senha</button>
            ${item.totp_code ? `<button class="secondary-btn copy-totp-btn">🛡 2FA: ${item.totp_code}</button>` : ''}
          </div>
        `;

        card.querySelector('.autofill-btn').addEventListener('click', () => {
          chrome.tabs.sendMessage(tab.id, {
            action: "autofill",
            username: item.username,
            password: item.password,
            totp_code: item.totp_code
          }, () => {
            showToast("✔ Preenchido com sucesso!");
          });
        });

        card.querySelector('.copy-pass-btn').addEventListener('click', () => {
          navigator.clipboard.writeText(item.password || '');
          showToast("📋 Senha copiada!");
        });

        if (item.totp_code) {
          card.querySelector('.copy-totp-btn').addEventListener('click', () => {
            navigator.clipboard.writeText(item.totp_code || '');
            showToast("🛡 Código 2FA copiado!");
          });
        }

        contentArea.appendChild(card);
      });
    } else if (data && data.status === 'error' && data.message && data.message.includes('locked')) {
      statusBadge.className = 'status-badge locked';
      statusText.textContent = 'Cofre Bloqueado';

      contentArea.innerHTML = `
        <div class="locked-state">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
          </svg>
          <p>Cofre Bloqueado no aplicativo.<br>Desbloqueie o LockPy Vault Desktop para sincronização automática.</p>
        </div>
      `;
    } else {
      statusBadge.className = 'status-badge';
      statusText.textContent = 'Desbloqueado & Sincronizado';

      contentArea.innerHTML = `
        <div class="empty-state">
          Nenhuma credencial cadastrada para <b>${domain}</b>.
        </div>
      `;
    }
  } catch (err) {
    statusBadge.className = 'status-badge locked';
    statusText.textContent = 'App Desconectado';

    contentArea.innerHTML = `
      <div class="locked-state">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M18.36 6.64a9 9 0 1 1-12.73 0"></path>
          <line x1="12" y1="2" x2="12" y2="12"></line>
        </svg>
        <p>Inicie o aplicativo LockPy Vault Desktop para ativar a sincronização automática de senhas.</p>
      </div>
    `;
  }
});
