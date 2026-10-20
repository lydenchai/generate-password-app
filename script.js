// Character sets
const CHARSETS = {
  uppercase: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  lowercase: "abcdefghijklmnopqrstuvwxyz",
  numbers: "0123456789",
  symbols: "!@#$%^&*?",
};

const AMBIGUOUS_CHARS = new Set(["i", "l", "1", "I", "L", "o", "0", "O"]);

// State
let recentPasswords = [];
let toastTimer = null;

// DOM Elements
const usernameInput = document.getElementById("username-input");
const websiteInput = document.getElementById("website-input");
const clearUsernameBtn = document.getElementById("clear-username-btn");
const clearWebsiteBtn = document.getElementById("clear-website-btn");
const passwordInput = document.getElementById("password");
const lengthInput = document.getElementById("password-length");
const lengthSlider = document.getElementById("length-slider");
const uppercaseCb = document.getElementById("uppercase");
const lowercaseCb = document.getElementById("lowercase");
const numbersCb = document.getElementById("numbers");
const symbolsCb = document.getElementById("symbols");
const excludeSimilarCb = document.getElementById("exclude-similar");
const copyIconBtn = document.getElementById("copy-icon-btn");
const copyBtn = document.getElementById("copy-btn");
const strengthLabel = document.getElementById("strength-label");
const presetButtons = document.querySelectorAll(".preset-btn");
const toast = document.getElementById("toast");
const toastText = document.getElementById("toast-text");
const historyPanel = document.getElementById("history-panel");
const historyList = document.getElementById("history-list");
const historyCount = document.getElementById("history-count");
const themeToggle = document.getElementById("theme-toggle");

const bars = [
  document.getElementById("bar-1"),
  document.getElementById("bar-2"),
  document.getElementById("bar-3"),
  document.getElementById("bar-4"),
];

/**
 * Format credentials for copying
 */
function formatCredentials(pw, username, website) {
  const u = (username || "").trim();
  const w = (website || "").trim();
  if (!u && !w) return pw;

  const parts = [];
  if (u) parts.push(`User Name: ${u}`);
  parts.push(`Password: ${pw}`);
  if (w) parts.push(`Website: ${w}`);
  return parts.join("\n");
}

/**
 * Escape HTML special chars to prevent injection in history view
 */
function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * CSPRNG random integer in range [0, max)
 */
function secureRandomInt(max) {
  if (max <= 0) return 0;
  const array = new Uint32Array(1);
  window.crypto.getRandomValues(array);
  return array[0] % max;
}

/**
 * Filter ambiguous characters
 */
function filterCharacters(chars, excludeSimilar) {
  if (!excludeSimilar) return chars;
  return chars
    .split("")
    .filter((c) => !AMBIGUOUS_CHARS.has(c))
    .join("");
}

/**
 * Generate password
 */
function generatePassword() {
  let length = parseInt(lengthInput.value, 10);
  if (isNaN(length) || length < 4) {
    length = 16;
    lengthInput.value = 16;
    lengthSlider.value = 16;
  } else if (length > 64) {
    length = 64;
    lengthInput.value = 64;
    lengthSlider.value = 64;
  }

  const useUpper = uppercaseCb.checked;
  const useLower = lowercaseCb.checked;
  const useNumbers = numbersCb.checked;
  const useSymbols = symbolsCb.checked;
  const excludeSimilar = excludeSimilarCb.checked;

  if (!useUpper && !useLower && !useNumbers && !useSymbols) {
    showToast("Select at least one character type");
    passwordInput.value = "";
    updateStrength("", 0);
    return;
  }

  const selectedSets = [];
  if (useUpper) selectedSets.push(filterCharacters(CHARSETS.uppercase, excludeSimilar));
  if (useLower) selectedSets.push(filterCharacters(CHARSETS.lowercase, excludeSimilar));
  if (useNumbers) selectedSets.push(filterCharacters(CHARSETS.numbers, excludeSimilar));
  if (useSymbols) selectedSets.push(filterCharacters(CHARSETS.symbols, excludeSimilar));

  const allChars = selectedSets.join("");
  if (allChars.length === 0) {
    showToast("All characters excluded");
    return;
  }

  const resultChars = [];

  // Guarantee 1 char from each selected category
  selectedSets.forEach((set) => {
    if (set.length > 0 && resultChars.length < length) {
      resultChars.push(set[secureRandomInt(set.length)]);
    }
  });

  // Fill remainder
  while (resultChars.length < length) {
    resultChars.push(allChars[secureRandomInt(allChars.length)]);
  }

  // Fisher-Yates shuffle
  for (let i = resultChars.length - 1; i > 0; i--) {
    const j = secureRandomInt(i + 1);
    [resultChars[i], resultChars[j]] = [resultChars[j], resultChars[i]];
  }

  const password = resultChars.join("");
  passwordInput.value = password;

  updateStrength(password, allChars.length);
  addToHistory(password);
}

/**
 * Strength evaluation
 */
function updateStrength(password, poolSize) {
  if (!password || poolSize === 0) {
    bars.forEach((b) => (b.style.backgroundColor = "var(--bar-empty)"));
    strengthLabel.textContent = "Strength: None";
    return;
  }

  const entropy = Math.round(password.length * Math.log2(poolSize));
  let level = 1;
  let label = "Very Weak";
  let colorVar = "var(--bar-weak)";

  if (entropy < 28) {
    level = 1;
    label = "Very Weak";
    colorVar = "var(--bar-weak)";
  } else if (entropy < 45) {
    level = 2;
    label = "Weak";
    colorVar = "var(--bar-fair)";
  } else if (entropy < 65) {
    level = 3;
    label = "Moderate";
    colorVar = "var(--bar-good)";
  } else {
    level = 4;
    label = "Strong";
    colorVar = "var(--bar-strong)";
  }

  strengthLabel.textContent = `Strength: ${label}`;

  bars.forEach((bar, idx) => {
    bar.style.backgroundColor = idx < level ? colorVar : "var(--bar-empty)";
  });
}

/**
 * Copy to clipboard
 */
async function copyToClipboard(customText) {
  const currentPassword = passwordInput.value;
  if (!currentPassword && !customText) {
    showToast("Generate a password first");
    return;
  }

  let textToCopy = "";
  let isCredential = false;

  if (typeof customText === "string") {
    textToCopy = customText;
    isCredential = customText.includes("\n");
  } else {
    const username = usernameInput ? usernameInput.value.trim() : "";
    const website = websiteInput ? websiteInput.value.trim() : "";
    textToCopy = formatCredentials(currentPassword, username, website);
    isCredential = Boolean(username || website);
  }

  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(textToCopy);
    } else {
      const textarea = document.createElement("textarea");
      textarea.value = textToCopy;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }

    copyIconBtn.classList.add("copied");
    if (copyBtn) copyBtn.textContent = "Copied!";
    showToast(isCredential ? "Credentials copied to clipboard" : "Password copied to clipboard");

    setTimeout(() => {
      copyIconBtn.classList.remove("copied");
      if (copyBtn) copyBtn.textContent = "Copy";
    }, 1800);
  } catch (err) {
    showToast("Failed to copy");
  }
}

/**
 * Toast helper
 */
function showToast(msg) {
  if (toastTimer) clearTimeout(toastTimer);
  toastText.textContent = msg;
  toast.classList.add("show");
  toastTimer = setTimeout(() => {
    toast.classList.remove("show");
  }, 2200);
}

/**
 * Presets & Length sync
 */
function setLength(val) {
  const num = Math.min(64, Math.max(4, parseInt(val, 10) || 16));
  lengthInput.value = num;
  lengthSlider.value = num;

  presetButtons.forEach((btn) => {
    if (parseInt(btn.dataset.len, 10) === num) {
      btn.classList.add("active");
    } else {
      btn.classList.remove("active");
    }
  });

  generatePassword();
}

/**
 * History
 */
function addToHistory(pw) {
  if (!pw) return;
  const username = usernameInput ? usernameInput.value.trim() : "";
  const website = websiteInput ? websiteInput.value.trim() : "";

  // Check if identical to most recent entry
  if (
    recentPasswords.length > 0 &&
    typeof recentPasswords[0] === "object" &&
    recentPasswords[0].password === pw &&
    recentPasswords[0].username === username &&
    recentPasswords[0].website === website
  ) {
    return;
  }

  recentPasswords.unshift({ password: pw, username, website });
  if (recentPasswords.length > 5) recentPasswords.pop();
  renderHistory();
}

function copyHistoryItem(index) {
  const item = recentPasswords[index];
  if (!item) return;
  if (typeof item === "string") {
    copyToClipboard(item);
  } else {
    const formatted = formatCredentials(item.password, item.username, item.website);
    copyToClipboard(formatted);
  }
}

function renderHistory() {
  historyCount.textContent = recentPasswords.length;
  if (recentPasswords.length === 0) {
    historyList.innerHTML = '<li class="history-empty">No passwords saved yet</li>';
    return;
  }

  historyList.innerHTML = recentPasswords
    .map((item, index) => {
      const pw = typeof item === "string" ? item : item.password;
      const username = typeof item === "object" ? item.username : "";
      const website = typeof item === "object" ? item.website : "";
      const metaParts = [];
      if (username) metaParts.push(escapeHtml(username));
      if (website) metaParts.push(escapeHtml(website));
      const metaStr = metaParts.join(" • ");

      return `
      <li class="history-item">
        <div class="history-item-details">
          <span class="history-item-pw">${escapeHtml(pw)}</span>
          ${metaStr ? `<span class="history-item-meta">${metaStr}</span>` : ""}
        </div>
        <button type="button" class="history-copy" onclick="copyHistoryItem(${index})" title="Copy credential">Copy</button>
      </li>
    `;
    })
    .join("");
}

function toggleHistory() {
  historyPanel.classList.toggle("hidden");
}

function clearHistory() {
  recentPasswords = [];
  renderHistory();
  showToast("History cleared");
}

/**
 * Reset defaults
 */
function resetDefaults() {
  if (usernameInput) usernameInput.value = "";
  if (websiteInput) websiteInput.value = "";
  if (clearUsernameBtn) clearUsernameBtn.classList.add("hidden");
  if (clearWebsiteBtn) clearWebsiteBtn.classList.add("hidden");
  uppercaseCb.checked = true;
  lowercaseCb.checked = true;
  numbersCb.checked = true;
  symbolsCb.checked = true;
  excludeSimilarCb.checked = false;
  setLength(16);
  showToast("Reset to defaults");
}

/**
 * Theme toggle
 */
function initTheme() {
  const saved = localStorage.getItem("pw-theme");
  if (saved === "dark") {
    document.documentElement.setAttribute("data-theme", "dark");
  } else if (!saved && window.matchMedia("(prefers-color-scheme: dark)").matches) {
    document.documentElement.setAttribute("data-theme", "dark");
  }

  themeToggle.addEventListener("click", () => {
    const isDark = document.documentElement.getAttribute("data-theme") === "dark";
    if (isDark) {
      document.documentElement.removeAttribute("data-theme");
      localStorage.setItem("pw-theme", "light");
    } else {
      document.documentElement.setAttribute("data-theme", "dark");
      localStorage.setItem("pw-theme", "dark");
    }
  });
}

// Event Listeners
lengthSlider.addEventListener("input", (e) => {
  setLength(e.target.value);
});

lengthInput.addEventListener("input", (e) => {
  const val = parseInt(e.target.value, 10);
  if (!isNaN(val) && val >= 4 && val <= 64) {
    setLength(val);
  }
});

lengthInput.addEventListener("blur", (e) => {
  setLength(e.target.value);
});

presetButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    setLength(btn.dataset.len);
  });
});

[uppercaseCb, lowercaseCb, numbersCb, symbolsCb, excludeSimilarCb].forEach((cb) => {
  cb.addEventListener("change", generatePassword);
});

document.addEventListener("keydown", (e) => {
  if (e.target.tagName === "INPUT" && e.target.type !== "checkbox" && e.target.type !== "range") {
    return;
  }
  if (e.code === "Space" || e.key === "r" || e.key === "R") {
    e.preventDefault();
    generatePassword();
  }
});

[usernameInput, websiteInput].forEach((input) => {
  if (!input) return;
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      generatePassword();
    }
  });
});

function toggleClearBtn(input, btn) {
  if (!input || !btn) return;
  if (input.value.trim().length > 0) {
    btn.classList.remove("hidden");
  } else {
    btn.classList.add("hidden");
  }
}

if (usernameInput && clearUsernameBtn) {
  usernameInput.addEventListener("input", () => toggleClearBtn(usernameInput, clearUsernameBtn));
  clearUsernameBtn.addEventListener("click", () => {
    usernameInput.value = "";
    toggleClearBtn(usernameInput, clearUsernameBtn);
    usernameInput.focus();
  });
}

if (websiteInput && clearWebsiteBtn) {
  websiteInput.addEventListener("input", () => toggleClearBtn(websiteInput, clearWebsiteBtn));
  clearWebsiteBtn.addEventListener("click", () => {
    websiteInput.value = "";
    toggleClearBtn(websiteInput, clearWebsiteBtn);
    websiteInput.focus();
  });
}

// Initialization
document.addEventListener("DOMContentLoaded", () => {
  initTheme();
  setLength(16);
  toggleClearBtn(usernameInput, clearUsernameBtn);
  toggleClearBtn(websiteInput, clearWebsiteBtn);
});
