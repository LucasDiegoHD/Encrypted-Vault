// LockPy Vault Content Script - Professional Fluid Profile Popup Engine
(function () {
  const LOCAL_DAEMON_URL = "http://127.0.0.1:54321";
  let activeInput = null;
  let matchesMenu = null;
  let hasAutoFilledUsername = false;
  let hasAutoFilledPassword = false;
  let hasAutoFilledTotp = false;
  let cachedMatches = [];
  let selectedAccountProfile = null;

  function setNativeValue(element, value) {
    if (!element || !value) return;
    element.focus();
    const valueSetter = Object.getOwnPropertyDescriptor(element, 'value')?.set;
    const prototype = Object.getPrototypeOf(element);
    const prototypeValueSetter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;

    if (prototypeValueSetter && valueSetter !== prototypeValueSetter) {
      prototypeValueSetter.call(element, value);
    } else if (valueSetter) {
      valueSetter.call(element, value);
    } else {
      element.value = value;
    }
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
    element.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'a' }));
    element.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true, key: 'a' }));
  }

  function isElementHidden(el) {
    if (!el) return true;
    if (el.type === 'hidden') return true;
    try {
      const style = window.getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return true;
    } catch (e) {}
    return false;
  }

  function isSearchOrNonAuthInput(el) {
    if (!el) return true;
    if (el.tagName === 'TEXTAREA') return true;
    if (el.getAttribute('data-lockpy-ignore') === 'true') return true;

    const type = (el.type || '').toLowerCase();
    if (['search', 'hidden', 'file', 'checkbox', 'radio', 'button', 'submit', 'number', 'tel', 'date', 'color', 'range'].includes(type)) {
      return true;
    }

    if (el.getAttribute('role') === 'search') return true;

    const nameOrId = ((el.name || '') + ' ' + (el.id || '')).toLowerCase();
    const explicitExclusions = ['q', 'search', 'query', 'filter', 'commit', 'branch', 'promo', 'coupon', 'cvv'];
    if (explicitExclusions.some(kw => nameOrId === kw || nameOrId.split(/[\s_\-]/).includes(kw))) {
      return true;
    }

    return false;
  }

  function isAuthenticatableUsernameInput(el) {
    if (!el || isElementHidden(el) || el.type === 'password' || isSearchOrNonAuthInput(el)) {
      return false;
    }

    const type = (el.type || '').toLowerCase();
    const name = (el.name || '').toLowerCase();
    const id = (el.id || '').toLowerCase();
    const placeholder = (el.placeholder || '').toLowerCase();
    const ariaLabel = (el.getAttribute('aria-label') || '').toLowerCase();
    const autocomplete = (el.getAttribute('autocomplete') || '').toLowerCase();

    if (type === 'email' || autocomplete.includes('username') || autocomplete.includes('email')) {
      return true;
    }

    const authKeywords = ['email', 'e-mail', 'user', 'username', 'login', 'account', 'identifier', 'cpf', 'conta', 'usuario', 'usuário'];
    const fieldText = `${name} ${id} ${placeholder} ${ariaLabel}`;
    if (authKeywords.some(kw => fieldText.includes(kw))) {
      return true;
    }

    if (type === 'text' || type === 'email' || !type) {
      return true;
    }

    return false;
  }

  function findVisibleUsernameField() {
    const inputs = Array.from(document.querySelectorAll('input'));
    for (const el of inputs) {
      if (isAuthenticatableUsernameInput(el)) {
        return el;
      }
    }
    return null;
  }

  function findVisibleTotpField() {
    const totpSelectors = [
      'input[autocomplete="one-time-code"]',
      'input[name="totpPin"]',
      'input[name="totp"]',
      'input[name="otp"]',
      'input[name*="code"]',
      'input[name*="2fa"]',
      'input[name*="token"]',
      'input[id*="totp"]',
      'input[id*="otp"]'
    ];

    for (const selector of totpSelectors) {
      const el = document.querySelector(selector);
      if (el && !isElementHidden(el) && !isSearchOrNonAuthInput(el)) {
        return el;
      }
    }
    return null;
  }

  function fillCredentialsForInput(targetInput, username, password, totp_code) {
    let filledAny = false;
    const isPasswordField = targetInput && (targetInput.type === 'password' || targetInput.name?.toLowerCase().includes('pass'));
    const isTotpField = targetInput && (targetInput.name?.toLowerCase().includes('code') || targetInput.name?.toLowerCase().includes('totp') || targetInput.name?.toLowerCase().includes('otp'));

    if (isTotpField && totp_code) {
      setNativeValue(targetInput, totp_code);
      filledAny = true;
    } else if (isPasswordField) {
      if (password) {
        setNativeValue(targetInput, password);
        filledAny = true;
      }

      const usernameInput = findVisibleUsernameField();
      if (usernameInput && username) {
        setNativeValue(usernameInput, username);
      }
    } else {
      const currentTarget = targetInput || findVisibleUsernameField();
      if (currentTarget && username) {
        setNativeValue(currentTarget, username);
        filledAny = true;
      }

      const passwordInput = document.querySelector('input[type="password"]');
      if (passwordInput && !isElementHidden(passwordInput) && password) {
        setNativeValue(passwordInput, password);
      }
    }

    return filledAny;
  }

  async function performZeroClickAutofill(targetInput) {
    const domain = window.location.hostname.replace(/^www\./, '');
    const currentUrl = window.location.href;

    try {
      const response = await fetch(
        `${LOCAL_DAEMON_URL}/get-credentials?domain=${encodeURIComponent(domain)}&url=${encodeURIComponent(currentUrl)}`
      );
      const data = await response.json();

      if (data && data.status === 'ok' && (data.credentials || (data.matches && data.matches.length > 0))) {
        cachedMatches = (data.matches && data.matches.length > 0) ? data.matches : [data.credentials];

        if (selectedAccountProfile) {
          const exists = cachedMatches.some(m => m.service === selectedAccountProfile.service);
          if (!exists) {
            selectedAccountProfile = null;
          }
        }

        const activeCreds = selectedAccountProfile || cachedMatches[0];
        const usernameInput = targetInput || findVisibleUsernameField();
        const passwordInput = document.querySelector('input[type="password"]');
        const totpInput = findVisibleTotpField();
        const isPasswordVisible = passwordInput && !isElementHidden(passwordInput);

        // Step 1: Pre-fill Username/Email
        if (usernameInput && usernameInput.dataset.lockpyUserEdited === 'true') {
          // User manually edited, skip
        } else if (!hasAutoFilledUsername && usernameInput && activeCreds.username && usernameInput.value !== activeCreds.username) {
          setNativeValue(usernameInput, activeCreds.username);
          hasAutoFilledUsername = true;
        }

        // Step 2: Pre-fill Password
        if (passwordInput && passwordInput.dataset.lockpyUserEdited === 'true') {
          // User manually edited, skip
        } else if (isPasswordVisible && activeCreds.password && passwordInput.value !== activeCreds.password) {
          setNativeValue(passwordInput, activeCreds.password);
          hasAutoFilledPassword = true;
        }

        // Step 3: Pre-fill 2FA TOTP Code
        if (!hasAutoFilledTotp && totpInput && activeCreds.totp_code && totpInput.value !== activeCreds.totp_code) {
          setNativeValue(totpInput, activeCreds.totp_code);
          hasAutoFilledTotp = true;
        }

        // Render fluid profile popup if input is focused
        if (targetInput && cachedMatches.length > 0) {
          renderMatchesMenu(targetInput, cachedMatches);
        }
      } else {
        cachedMatches = [];
        selectedAccountProfile = null;
        hideMatchesMenu();
      }
    } catch (err) {
      // Quiet fallback
    }
  }

  function scheduleZeroClickAutofill() {
    performZeroClickAutofill();

    const intervals = [100, 300, 700, 1200, 2000, 3500];
    intervals.forEach(ms => {
      setTimeout(() => {
        performZeroClickAutofill();
      }, ms);
    });
  }

  // Gorgeous Fluid Account Profile Selector Popup
  function renderMatchesMenu(inputEl, matches) {
    if (matchesMenu) matchesMenu.remove();
    if (!inputEl || !matches || matches.length === 0) return;

    matchesMenu = document.createElement('div');
    matchesMenu.id = 'lockpy-matches-menu';
    matchesMenu.style.cssText = `
      position: fixed;
      z-index: 2147483647;
      background: rgba(9, 13, 22, 0.95);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border: 1px solid rgba(56, 189, 248, 0.35);
      border-radius: 18px;
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.8), 0 0 20px rgba(56, 189, 248, 0.15);
      padding: 12px;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      min-width: 270px;
      max-width: 330px;
      transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    `;

    const header = document.createElement('div');
    header.style.cssText = 'display: flex; align-items: center; justify-content: space-between; padding: 2px 4px 10px 4px; border-bottom: 1px solid rgba(255,255,255,0.08); margin-bottom: 8px;';
    header.innerHTML = `
      <div style="display: flex; align-items: center; gap: 8px;">
        <div style="width: 24px; height: 24px; border-radius: 8px; background: linear-gradient(135deg, rgba(56, 189, 248, 0.25), rgba(99, 102, 241, 0.25)); border: 1px solid rgba(56, 189, 248, 0.4); display: flex; align-items: center; justify-content: center; color: #38bdf8;">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
          </svg>
        </div>
        <div style="display: flex; flex-direction: column;">
          <span style="font-size: 11px; font-weight: 800; color: #f8fafc; letter-spacing: -0.2px;">Encrypted Vault • Selecione a conta</span>
          <span style="font-size: 9px; color: #38bdf8; font-weight: 600;">Sincronizado com App</span>
        </div>
      </div>
      <button id="lockpy-close-menu" style="background: transparent; border: none; padding: 4px; border-radius: 6px; cursor: pointer; color: #64748b; display: flex; align-items: center; justify-content: center;">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
    `;
    matchesMenu.appendChild(header);

    const closeBtn = header.querySelector('#lockpy-close-menu');
    closeBtn.addEventListener('click', () => {
      hideMatchesMenu();
    });

    matches.forEach((item) => {
      const isFilled = hasAutoFilledUsername || selectedAccountProfile === item;
      const row = document.createElement('div');
      row.style.cssText = `
        padding: 9px 12px;
        border-radius: 12px;
        cursor: pointer;
        transition: all 0.15s ease;
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 4px;
        background: ${isFilled ? 'rgba(16, 185, 129, 0.12)' : 'rgba(15, 23, 42, 0.4)'};
        border: 1px solid ${isFilled ? 'rgba(16, 185, 129, 0.3)' : 'rgba(255, 255, 255, 0.04)'};
      `;

      row.innerHTML = `
        <div style="width: 32px; height: 32px; border-radius: 10px; background: rgba(56, 189, 248, 0.15); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.3); display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 13px;">
          ${(item.username || item.service || 'U').slice(0, 1).toUpperCase()}
        </div>
        <div style="flex: 1; overflow: hidden;">
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 4px;">
            <span style="font-size: 12px; font-weight: 700; color: #f1f5f9; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${item.username || 'Sem usuário'}</span>
            ${isFilled ? '<span style="font-size: 9px; color: #10b981; font-weight: 700; background: rgba(16,185,129,0.15); padding: 2px 6px; border-radius: 6px;">✔ Preenchido</span>' : ''}
          </div>
          <div style="font-size: 10px; color: #94a3b8; font-weight: 500;">${item.service} ${item.totp_code ? '⚡ 2FA Ativo' : ''}</div>
        </div>
      `;

      row.addEventListener('mouseenter', () => {
        row.style.background = 'rgba(56, 189, 248, 0.18)';
        row.style.borderColor = 'rgba(56, 189, 248, 0.4)';
        row.style.transform = 'translateX(2px)';
      });
      row.addEventListener('mouseleave', () => {
        row.style.background = isFilled ? 'rgba(16, 185, 129, 0.12)' : 'rgba(15, 23, 42, 0.4)';
        row.style.borderColor = isFilled ? 'rgba(16, 185, 129, 0.3)' : 'rgba(255, 255, 255, 0.04)';
        row.style.transform = 'none';
      });

      row.addEventListener('mousedown', (e) => {
        e.preventDefault();
        e.stopPropagation();

        selectedAccountProfile = item;
        if (inputEl) delete inputEl.dataset.lockpyUserEdited;

        fillCredentialsForInput(inputEl, item.username, item.password, item.totp_code);
        hideMatchesMenu();
      });

      matchesMenu.appendChild(row);
    });

    const rect = inputEl.getBoundingClientRect();
    matchesMenu.style.top = `${Math.min(window.innerHeight - 200, rect.bottom + 6)}px`;
    matchesMenu.style.left = `${Math.max(8, rect.left)}px`;

    document.body.appendChild(matchesMenu);
  }

  function hideMatchesMenu() {
    if (matchesMenu) {
      matchesMenu.remove();
      matchesMenu = null;
    }
  }

  document.addEventListener('input', (e) => {
    const target = e.target;
    if (target && target.tagName === 'INPUT') {
      target.dataset.lockpyUserEdited = 'true';
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' || e.key === 'Tab') {
      hideMatchesMenu();
    }
  });

  const observer = new MutationObserver(() => {
    performZeroClickAutofill();
  });

  function initZeroClickEngine() {
    if (document.body) {
      observer.observe(document.body, { childList: true, subtree: true });
      scheduleZeroClickAutofill();
    } else {
      document.addEventListener('DOMContentLoaded', () => {
        if (document.body) {
          observer.observe(document.body, { childList: true, subtree: true });
          scheduleZeroClickAutofill();
        }
      });
    }
  }

  initZeroClickEngine();

  document.addEventListener('focusin', (e) => {
    const target = e.target;
    if (
      target &&
      target.tagName === 'INPUT' &&
      !isSearchOrNonAuthInput(target) &&
      (target.type === 'password' || isAuthenticatableUsernameInput(target))
    ) {
      activeInput = target;
      performZeroClickAutofill(target);
    }
  });

  document.addEventListener('click', (e) => {
    const target = e.target;
    if (
      target &&
      target.tagName === 'INPUT' &&
      !isSearchOrNonAuthInput(target) &&
      (target.type === 'password' || isAuthenticatableUsernameInput(target))
    ) {
      activeInput = target;
      performZeroClickAutofill(target);
    } else {
      if (matchesMenu && !matchesMenu.contains(e.target) && e.target !== activeInput) {
        hideMatchesMenu();
      }
    }
  });

  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "autofill") {
      const activeCreds = selectedAccountProfile || { username: request.username, password: request.password, totp_code: request.totp_code };
      if (activeInput) delete activeInput.dataset.lockpyUserEdited;
      const success = fillCredentialsForInput(activeInput, activeCreds.username, activeCreds.password, activeCreds.totp_code);
      sendResponse({ status: success ? "ok" : "error" });
    }
  });
})();
