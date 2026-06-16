(function () {
  "use strict";

  const DAILY_QUOTA = 100;
  const STORAGE_KEY = "breakingfree_mock_state";

  const state = loadState();

  const pages = document.querySelectorAll(".page");
  const stepIndicators = document.querySelectorAll(".step-indicator");

  function loadState() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (_) { /* ignore */ }
    return {
      walletAddress: null,
      email: null,
      displayName: null,
      quotaUsed: 0,
      currentPage: 1,
      activity: [],
    };
  }

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function truncateAddress(address) {
    if (!address || address.length < 10) return address || "—";
    return address.slice(0, 6) + "…" + address.slice(-4);
  }

  function generateMockAddress() {
    const hex = Array.from({ length: 40 }, () =>
      Math.floor(Math.random() * 16).toString(16)
    ).join("");
    return "0x" + hex;
  }

  function navigateTo(pageNum) {
    state.currentPage = pageNum;
    saveState();

    pages.forEach((page) => {
      page.classList.toggle("page--active", Number(page.dataset.page) === pageNum);
    });

    stepIndicators.forEach((step) => {
      const stepNum = Number(step.dataset.step);
      step.classList.remove("step-indicator--active", "step-indicator--done");
      if (stepNum === pageNum) {
        step.classList.add("step-indicator--active");
      } else if (stepNum < pageNum) {
        step.classList.add("step-indicator--done");
      }
    });
  }

  function showError(el, message) {
    el.textContent = message;
    el.classList.remove("hidden");
  }

  function hideError(el) {
    el.textContent = "";
    el.classList.add("hidden");
  }

  // ── Wallet page ──
  const btnConnect = document.getElementById("btn-connect-wallet");
  const btnWalletContinue = document.getElementById("btn-wallet-continue");
  const walletStatus = document.getElementById("wallet-status");
  const walletStatusText = document.getElementById("wallet-status-text");
  const walletAddressDisplay = document.getElementById("wallet-address-display");
  const walletAddressValue = document.getElementById("wallet-address-value");

  function renderWalletPage() {
    if (state.walletAddress) {
      walletStatus.classList.remove("wallet-status--disconnected");
      walletStatus.classList.add("wallet-status--connected");
      walletStatusText.textContent = "Connected";
      walletAddressDisplay.classList.remove("hidden");
      walletAddressValue.textContent = state.walletAddress;
      btnConnect.textContent = "Wallet connected";
      btnConnect.disabled = true;
      btnWalletContinue.classList.remove("hidden");
    } else {
      walletStatus.classList.add("wallet-status--disconnected");
      walletStatus.classList.remove("wallet-status--connected");
      walletStatusText.textContent = "Not connected";
      walletAddressDisplay.classList.add("hidden");
      btnConnect.textContent = "Connect Polygon Wallet";
      btnConnect.disabled = false;
      btnWalletContinue.classList.add("hidden");
    }
  }

  btnConnect.addEventListener("click", () => {
    btnConnect.disabled = true;
    btnConnect.textContent = "Connecting…";

    setTimeout(() => {
      state.walletAddress = generateMockAddress();
      saveState();
      renderWalletPage();
    }, 800);
  });

  btnWalletContinue.addEventListener("click", () => navigateTo(2));

  // ── Email page ──
  const emailForm = document.getElementById("email-form");
  const emailFormError = document.getElementById("email-form-error");
  const emailWalletPreview = document.getElementById("email-wallet-preview");

  emailForm.addEventListener("submit", (e) => {
    e.preventDefault();
    hideError(emailFormError);

    const email = document.getElementById("email").value.trim();
    const displayName = document.getElementById("display-name").value.trim();
    const password = document.getElementById("password").value;
    const confirmPassword = document.getElementById("confirm-password").value;

    if (!email || !displayName || !password) {
      showError(emailFormError, "Please fill in all fields.");
      return;
    }

    if (password.length < 8) {
      showError(emailFormError, "Password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      showError(emailFormError, "Passwords do not match.");
      return;
    }

    state.email = email;
    state.displayName = displayName;
    saveState();
    renderSetupPage();
    navigateTo(3);
  });

  function renderSetupPage() {
    document.getElementById("setup-display-name").textContent = state.displayName || "User";
    document.getElementById("setup-wallet").textContent = truncateAddress(state.walletAddress);
    document.getElementById("setup-email").textContent = state.email || "—";
  }

  // ── Dashboard ──
  const messageForm = document.getElementById("message-form");
  const messageFormError = document.getElementById("message-form-error");
  const messageFormSuccess = document.getElementById("message-form-success");
  const activityList = document.getElementById("activity-list");
  const messageBody = document.getElementById("message-body");
  const charCount = document.getElementById("char-count");
  const btnSendMessage = document.getElementById("btn-send-message");

  messageBody.addEventListener("input", () => {
    charCount.textContent = messageBody.value.length;
  });

  function renderQuota() {
    const used = state.quotaUsed;
    const remaining = Math.max(0, DAILY_QUOTA - used);
    const pct = Math.min(100, (used / DAILY_QUOTA) * 100);

    document.getElementById("quota-used").textContent = used;
    document.getElementById("quota-remaining").textContent = remaining;
    document.getElementById("quota-total").textContent = DAILY_QUOTA;

    const barFill = document.getElementById("quota-bar-fill");
    barFill.style.width = pct + "%";

    const bar = barFill.parentElement;
    bar.setAttribute("aria-valuenow", used);
    bar.setAttribute("aria-valuemax", DAILY_QUOTA);

    btnSendMessage.disabled = remaining <= 0;
    if (remaining <= 0) {
      btnSendMessage.textContent = "Daily quota reached";
    } else {
      btnSendMessage.textContent = "Send message";
    }
  }

  function renderActivity() {
    if (!state.activity.length) {
      activityList.innerHTML = '<li class="activity-list__empty">No messages sent yet.</li>';
      return;
    }

    activityList.innerHTML = state.activity
      .slice()
      .reverse()
      .map(
        (item) => `
        <li class="activity-item">
          <div>
            <div class="activity-item__to">To: <strong>${escapeHtml(item.recipientId)}</strong></div>
            <div class="activity-item__preview">${escapeHtml(item.preview)}</div>
          </div>
          <span class="activity-item__time">${escapeHtml(item.time)}</span>
        </li>`
      )
      .join("");
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  function renderDashboard() {
    document.getElementById("dash-display-name").textContent = state.displayName || "User";
    document.getElementById("dash-wallet").textContent = truncateAddress(state.walletAddress);
    renderQuota();
    renderActivity();
  }

  messageForm.addEventListener("submit", (e) => {
    e.preventDefault();
    hideError(messageFormError);
    messageFormSuccess.classList.add("hidden");

    const recipientId = document.getElementById("recipient-id").value.trim();
    const message = messageBody.value.trim();

    if (!recipientId || !message) {
      showError(messageFormError, "Please enter a recipient ID and message.");
      return;
    }

    if (state.quotaUsed >= DAILY_QUOTA) {
      showError(messageFormError, "You have reached your daily quota.");
      return;
    }

    state.quotaUsed += 1;
    state.activity.push({
      recipientId,
      preview: message.length > 60 ? message.slice(0, 60) + "…" : message,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    });
    saveState();

    messageForm.reset();
    charCount.textContent = "0";
    messageFormSuccess.textContent = `Message sent to ${recipientId}.`;
    messageFormSuccess.classList.remove("hidden");

    renderQuota();
    renderActivity();
  });

  // ── Navigation buttons ──
  document.querySelectorAll("[data-nav]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const target = Number(btn.dataset.nav);
      if (target === 2 && !state.walletAddress) return;
      if (target === 4) renderDashboard();
      navigateTo(target);
    });
  });

  // ── Disconnect / reset ──
  document.getElementById("btn-disconnect").addEventListener("click", () => {
    if (!confirm("Disconnect and reset all mock data?")) return;
    localStorage.removeItem(STORAGE_KEY);
    location.reload();
  });

  // ── Init ──
  emailWalletPreview.textContent = truncateAddress(state.walletAddress);

  if (state.walletAddress) renderWalletPage();
  if (state.email && state.displayName) renderSetupPage();

  let startPage = state.currentPage || 1;
  if (startPage > 1 && !state.walletAddress) startPage = 1;
  if (startPage > 2 && !state.email) startPage = 2;
  if (startPage === 4) renderDashboard();

  navigateTo(startPage);
})();
