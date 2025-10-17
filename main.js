import LevelEngine from "./levels/levelEngine.js";

const STORAGE_KEYS = {
  highest: "hm_highestLevel",
  hasKey: "hm_hasKey",
  coins: "hm_coinCount",
  hintUnlocks: "hm_hintUnlocks",
};

const PROGRESS_VERSION_KEY = "hm_progressVersion";
const PROGRESS_VERSION = 2;

const TOTAL_LEVELS = 5;
const HASH_PREFIX = "#/level-";

const levels = [
  {
    id: 1,
    slug: "level-1",
    name: "Level 1 - The Path Not Taken",
    hint:
      "Change the URL hash from #/level-1 to #/level-2 manually. Try location.hash = '#/level-2'.",
    initialStatus:
      "The door is up there with no obvious path. Maybe the browser has other routes?",
    basicHint: "The address bar might be more helpful than the platforms.",
    hintCost: 1,
    playerStart: { x: 40, y: 280 },
    platforms: [
      { x: 0, y: 320, width: 640, height: 40 },
      // { x: 120, y: 260, width: 120, height: 20 }, // Hidden platform
      { x: 300, y: 220, width: 140, height: 20 },
      { x: 480, y: 180, width: 110, height: 20 },
    ],
    coins: [{ x: 180, y: 288, size: 18 }],
    door: {
      x: 540,
      y: 132,
      lockedText: "You cannot reach the door from here...",
    },
  },
  {
    id: 2,
    slug: "level-2",
    name: "Level 2 - The Broken Button",
    hint:
      "Inspect the disabled button and remove its disabled attribute so you can click Next Level.",
    initialStatus: "This control panel looks busted. Maybe you can fix it.",
    basicHint: "Broken controls can often be fixed in the Elements panel.",
    hintCost: 3,
    playerStart: { x: 60, y: 280 },
    platforms: [
      { x: 0, y: 320, width: 640, height: 40 },
      { x: 200, y: 260, width: 220, height: 20 },
      { x: 480, y: 220, width: 120, height: 20 },
    ],
    coins: [
      { x: 260, y: 232, size: 18 },
      { x: 520, y: 192, size: 18 },
    ],
    setup(engine) {
      const panel = document.createElement("div");
      panel.className = "button-panel";
      panel.style.left = "220px";
      panel.style.top = "200px";
      panel.style.width = "180px";
      panel.innerHTML =
        "<strong>Next Level</strong><div class=\"feedback\">Button offline.</div>";

      const button = document.createElement("button");
      button.className = "hack-button";
      button.type = "button";
      button.disabled = true;
      button.textContent = "Next Level";
      button.addEventListener("click", () => {
        engine.callbacks.onStatus("Hey, that worked!");
        engine.triggerLevelComplete();
      });

      panel.appendChild(button);
      engine.addSpecialElement(panel);
    },
  },
  {
    id: 3,
    slug: "level-3",
    name: "Level 3 - The Impossible Jump",
    hint:
      "Run player.setJumpHeight(11) in the console. The player API is exposed as window.player.",
    initialStatus:
      "Even full speed is not enough. Maybe rewrite the rules of physics?",
    basicHint: "Maybe there's a debug hook that tweaks your jump height.",
    hintCost: 5,
    playerStart: { x: 80, y: 280 },
    platforms: [
      { x: 0, y: 320, width: 640, height: 40 },
      // { x: 180, y: 240, width: 120, height: 20 },
      { x: 360, y: 200, width: 100, height: 20 },
    ],
    coins: [
      { x: 140, y: 292, size: 18 },
      { x: 280, y: 292, size: 18 },
      { x: 420, y: 292, size: 18 },
    ],
    door: {
      x: 520,
      y: 120,
      lockedText: "You need more height to reach this door.",
    },
    setup(engine) {
      engine.exposePlayerHack();
      engine.callbacks.onStatus(
        "Someone left debugging hooks around here..."
      );
    },
  },
  {
    id: 4,
    slug: "level-4",
    name: "Level 4 - The Digital Key",
    hint:
      "localStorage.setItem('hm_hasKey', 'true') should forge the missing key.",
    initialStatus: "Keycard reader offline. Local storage might help.",
    basicHint: "Try peeking at the browser's storage to forge a keycard.",
    hintCost: 7,
    playerStart: { x: 90, y: 280 },
    platforms: [
      { x: 0, y: 320, width: 640, height: 40 },
      { x: 240, y: 260, width: 140, height: 20 },
      { x: 420, y: 240, width: 140, height: 20 },
    ],
    coins: [
      { x: 260, y: 292, size: 18 },
      { x: 460, y: 292, size: 18 },
    ],
    door: {
      x: 540,
      y: 192,
      isLocked: true,
      lockedText: "Door access denied. Missing key: hm_hasKey.",
      unlockedText: "Door unlocked. Proceed quickly!",
    },
    isDoorLocked(engine) {
      const namespacedKey = localStorage.getItem(STORAGE_KEYS.hasKey);
      const legacyKey = localStorage.getItem("hasKey");
      const locked = !(namespacedKey === "true" || legacyKey === "true");
      engine.setDoorLocked(locked);
      return locked;
    },
    onDoorLocked(engine) {
      engine.setDoorLocked(true);
      engine.callbacks.onStatus("Door status: LOCKED (hm_hasKey required).");
    },
    setup(engine) {
      const info = document.createElement("div");
      info.className = "button-panel";
      info.style.left = "260px";
      info.style.top = "180px";
      info.style.width = "200px";
      info.textContent = "Keycard reader waiting for hm_hasKey === 'true'.";
      engine.addSpecialElement(info);
      engine.setDoorLocked(true);
    },
  },
  {
    id: 5,
    slug: "level-5",
    name: "Level 5 - The Source Code Secret",
    hint:
      "View the page source and find the hidden password comment. Enter it to pass.",
    initialStatus: "Final firewall detected. Password required.",
    basicHint: "Comments in the page source can hide suspicious secrets.",
    hintCost: 10,
    playerStart: { x: 60, y: 280 },
    platforms: [
      { x: 0, y: 320, width: 640, height: 40 },
      { x: 200, y: 260, width: 160, height: 20 },
    ],
    coins: [
      { x: 220, y: 292, size: 18 },
      { x: 360, y: 292, size: 18 },
    ],
    setup(engine) {
      const gate = document.createElement("div");
      gate.className = "password-gate";

      const title = document.createElement("div");
      title.innerHTML = "<strong>Final Gate</strong>";

      const prompt = document.createElement("div");
      prompt.textContent = "Password:";

      const input = document.createElement("input");
      input.type = "text";
      input.autocomplete = "off";
      input.spellcheck = false;
      input.placeholder = "Enter password";

      const button = document.createElement("button");
      button.type = "button";
      button.textContent = "Unlock";

      const feedback = document.createElement("div");
      feedback.className = "feedback";
      feedback.textContent = "Hint: the answer is hidden in the source.";

      const submit = () => {
        const attempt = input.value.trim();
        if (attempt === "6hadowHac7er") {
          feedback.textContent = "Access granted. Proceed!";
          engine.triggerLevelComplete();
        } else {
          feedback.textContent = "Access denied.";
        }
      };

      button.addEventListener("click", submit);
      input.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          submit();
        }
      });

      gate.appendChild(title);
      gate.appendChild(prompt);
      gate.appendChild(input);
      gate.appendChild(button);
      gate.appendChild(feedback);

      engine.addSpecialElement(gate);
      setTimeout(() => input.focus(), 300);
    },
  },
];

const levelById = new Map(levels.map((level) => [level.id, level]));

const refs = {
  gameArea: document.getElementById("game-area"),
  levelLabel: document.getElementById("level-label"),
  statusMessage: document.getElementById("status-message"),
  hintToggle: document.getElementById("hint-toggle"),
  hintContent: document.getElementById("hint-content"),
  basicHintToggle: document.getElementById("basic-hint-toggle"),
  basicHintContent: document.getElementById("basic-hint-content"),
  basicHintCard: document.getElementById("basic-hint-card"),
  advancedHintCard: document.getElementById("advanced-hint-card"),
  coinCounter: document.getElementById("coin-counter"),
};

resetPersistentState();
migrateProgressIfNeeded();

const engine = new LevelEngine(refs.gameArea, {
  onLevelComplete: handleLevelComplete,
  onLevelStart: handleLevelStart,
  onStatus: setStatusMessage,
  onCoinCollected: handleCoinCollected,
  onLevelReset: handleLevelReset,
});
let highestUnlocked = ensureHighestUnlocked();
let currentLevel = null;
let coinCount = loadCoinCount();
let unlockedHints = loadUnlockedHints();

updateCoinUI();

function resetPersistentState() {
  localStorage.removeItem(STORAGE_KEYS.highest);
  localStorage.removeItem(STORAGE_KEYS.hasKey);
  localStorage.removeItem(STORAGE_KEYS.coins);
  localStorage.removeItem(STORAGE_KEYS.hintUnlocks);
  localStorage.removeItem("hasKey");
  localStorage.removeItem(PROGRESS_VERSION_KEY);
  if (window.location.hash !== `${HASH_PREFIX}1`) {
    window.location.hash = `${HASH_PREFIX}1`;
  }
}

function migrateProgressIfNeeded() {
  const storedVersion = Number.parseInt(
    localStorage.getItem(PROGRESS_VERSION_KEY) ?? "0",
    10
  );
  if (Number.isFinite(storedVersion) && storedVersion >= PROGRESS_VERSION) {
    return;
  }

  const highestRaw = localStorage.getItem(STORAGE_KEYS.highest);
  if (highestRaw !== null) {
    const numericValue = Number.parseInt(highestRaw, 10);
    if (Number.isFinite(numericValue)) {
      const migrated =
        numericValue >= TOTAL_LEVELS
          ? TOTAL_LEVELS
          : Math.max(1, Math.min(numericValue - 1, TOTAL_LEVELS));
      localStorage.setItem(STORAGE_KEYS.highest, String(migrated));
    } else {
      localStorage.setItem(STORAGE_KEYS.highest, "1");
    }
  } else {
    localStorage.setItem(STORAGE_KEYS.highest, "1");
  }

  localStorage.setItem(PROGRESS_VERSION_KEY, String(PROGRESS_VERSION));
}

function ensureHighestUnlocked() {
  const stored = localStorage.getItem(STORAGE_KEYS.highest);
  const parsed = Number.parseInt(stored ?? "1", 10);
  if (Number.isFinite(parsed) && parsed >= 1) {
    return Math.min(parsed, TOTAL_LEVELS);
  }
  localStorage.setItem(STORAGE_KEYS.highest, "1");
  return 1;
}

function setHighestUnlocked(value) {
  const numericValue = Number.parseInt(String(value), 10);
  const normalized = Number.isFinite(numericValue) ? numericValue : 1;
  const clamped = Math.max(1, Math.min(normalized, TOTAL_LEVELS));
  highestUnlocked = clamped;
  localStorage.setItem(STORAGE_KEYS.highest, String(clamped));
  localStorage.setItem(PROGRESS_VERSION_KEY, String(PROGRESS_VERSION));
}

function loadCoinCount() {
  const stored = localStorage.getItem(STORAGE_KEYS.coins);
  const parsed = Number.parseInt(stored ?? "0", 10);
  if (Number.isFinite(parsed) && parsed >= 0) {
    return parsed;
  }
  localStorage.setItem(STORAGE_KEYS.coins, "0");
  return 0;
}

function setCoinCount(value) {
  const clamped = Math.max(0, Math.min(Number.isFinite(value) ? value : 0, 999));
  coinCount = Math.trunc(clamped);
  localStorage.setItem(STORAGE_KEYS.coins, String(coinCount));
  updateCoinUI();
}

function updateCoinUI() {
  if (refs.coinCounter) {
    refs.coinCounter.textContent = `Coins: ${coinCount}`;
  }
}

function loadUnlockedHints() {
  const raw = localStorage.getItem(STORAGE_KEYS.hintUnlocks);
  if (!raw) {
    return new Set();
  }
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return new Set(
        parsed
          .map((value) => Number.parseInt(value, 10))
          .filter((num) => Number.isFinite(num) && num >= 1 && num <= TOTAL_LEVELS)
      );
    }
  } catch (error) {
    console.warn("Unable to parse stored hint unlocks:", error);
  }
  return new Set();
}

function persistUnlockedHints() {
  localStorage.setItem(
    STORAGE_KEYS.hintUnlocks,
    JSON.stringify(Array.from(unlockedHints))
  );
}

function isHintUnlocked(levelId) {
  return unlockedHints.has(levelId);
}

function unlockHintForLevel(levelId) {
  if (!unlockedHints.has(levelId)) {
    unlockedHints.add(levelId);
    persistUnlockedHints();
  }
}

function resetUnlockedHints() {
  unlockedHints = new Set();
  persistUnlockedHints();
}

function setBasicHintUI(level) {
  if (!refs.basicHintContent || !refs.basicHintToggle) {
    return;
  }
  const hintText =
    level?.basicHint ?? "Keep experimenting with every tool you have.";
  refs.basicHintContent.textContent = hintText;
  refs.basicHintContent.hidden = true;
  refs.basicHintToggle.disabled = false;
  refs.basicHintToggle.textContent = "Show Quick Hint";
  refs.basicHintCard?.classList.remove("locked");
}

function updateAdvancedHintUI(level) {
  if (!level || !refs.hintContent || !refs.hintToggle) {
    return;
  }

  const cost = Math.max(0, Number(level.hintCost ?? 0));

  if (cost === 0 && !isHintUnlocked(level.id)) {
    unlockHintForLevel(level.id);
  }

  const unlocked = isHintUnlocked(level.id);

  if (unlocked) {
    refs.advancedHintCard?.classList.remove("locked");
    refs.hintContent.textContent = level.hint;
    refs.hintContent.hidden = true;
    refs.hintToggle.disabled = false;
    refs.hintToggle.textContent = "Show Hacker's Hint";
    return;
  }

  refs.advancedHintCard?.classList.add("locked");
  refs.hintContent.hidden = true;
  refs.hintContent.textContent = level.hint;
  const canAfford = coinCount >= cost;
  const coinWord = cost === 1 ? "coin" : "coins";
  refs.hintToggle.disabled = !canAfford;
  refs.hintToggle.textContent = canAfford
    ? `Unlock Hint (-${cost} ${coinWord})`
    : `Need ${cost} ${coinWord}`;
}

function setStatusMessage(message = "") {
  refs.statusMessage.textContent = message;
}

function setHint(level) {
  setBasicHintUI(level);
  updateAdvancedHintUI(level);
}

if (refs.basicHintToggle && refs.basicHintContent) {
  refs.basicHintToggle.addEventListener("click", () => {
    const isHidden = refs.basicHintContent.hidden;
    refs.basicHintContent.hidden = !isHidden;
    refs.basicHintToggle.textContent = isHidden
      ? "Hide Quick Hint"
      : "Show Quick Hint";
  });
}

if (refs.hintToggle && refs.hintContent) {
  refs.hintToggle.addEventListener("click", () => {
    if (!currentLevel) {
      return;
    }

    const cost = Math.max(0, Number(currentLevel.hintCost ?? 0));

    if (!isHintUnlocked(currentLevel.id)) {
      if (coinCount >= cost) {
        setCoinCount(coinCount - cost);
        unlockHintForLevel(currentLevel.id);
        updateAdvancedHintUI(currentLevel);
        refs.hintContent.hidden = false;
        refs.hintToggle.textContent = "Hide Hacker's Hint";
        setStatusMessage("Hint unlocked! Spend coins wisely.");
      } else {
        setStatusMessage("You need more coins to unlock this hint.");
      }
      return;
    }

    const isHidden = refs.hintContent.hidden;
    refs.hintContent.hidden = !isHidden;
    refs.hintToggle.textContent = isHidden
      ? "Hide Hacker's Hint"
      : "Show Hacker's Hint";
  });
}

function parseHash() {
  const hash = window.location.hash || "";
  if (hash.startsWith(HASH_PREFIX)) {
    const maybeId = Number.parseInt(hash.slice(HASH_PREFIX.length), 10);
    if (Number.isFinite(maybeId)) {
      return { type: "level", id: maybeId };
    }
  }
  if (hash === "#/win") {
    return { type: "win" };
  }
  return { type: "level", id: 1 };
}

function clampLevelId(targetId) {
  const storedHighest = ensureHighestUnlocked();
  highestUnlocked = storedHighest;

  const currentId = currentLevel ? currentLevel.id : 1;
  const maxFromProgress = Math.min(TOTAL_LEVELS, storedHighest + 1);
  const maxAllowed = Math.max(1, maxFromProgress, currentId);

  if (targetId <= maxAllowed) {
    return targetId;
  }

  return maxAllowed;
}

function handleRouteChange() {
  const parsed = parseHash();
  if (parsed.type === "win") {
    showWinScreen();
    return;
  }

  let targetId = parsed.id;
  targetId = Math.max(1, Math.min(targetId, TOTAL_LEVELS));
  targetId = clampLevelId(targetId);

  const level = levelById.get(targetId) ?? levelById.get(1);
  if (!level) {
    return;
  }

  if (!window.location.hash.startsWith(`${HASH_PREFIX}${targetId}`)) {
    window.location.hash = `${HASH_PREFIX}${targetId}`;
    return;
  }

  currentLevel = level;
  refs.levelLabel.textContent = level.name;
  setHint(level);
  setStatusMessage(level.initialStatus || "");
  refs.gameArea.focus?.();

  engine.loadLevel(level);
}

function handleLevelStart(level, options = {}) {
  if (!options.preserveStatus && level.initialStatus) {
    setStatusMessage(level.initialStatus);
  }
  updateAdvancedHintUI(level);
  if (level.id === 4) {
    const locked = level.isDoorLocked(engine);
    engine.setDoorLocked(locked);
  }
}

function handleLevelComplete(level) {
  if (level.id < TOTAL_LEVELS) {
    const nextId = level.id + 1;
    const completed = Math.max(highestUnlocked, level.id);
    setHighestUnlocked(completed);
    window.location.hash = `${HASH_PREFIX}${nextId}`;
    return;
  }

  setHighestUnlocked(Math.max(highestUnlocked, level.id));
  if (window.location.hash !== "#/win") {
    window.location.hash = "#/win";
  } else {
    showWinScreen();
  }
}

function handleCoinCollected(_coin, _level) {
  setCoinCount(coinCount + 1);
  setStatusMessage("Coin collected! Spend it to unlock a hint.");
  if (currentLevel) {
    updateAdvancedHintUI(currentLevel);
  }
}

function resetCoinsAndHints() {
  setCoinCount(0);
  resetUnlockedHints();
  if (currentLevel) {
    setBasicHintUI(currentLevel);
    updateAdvancedHintUI(currentLevel);
    if (refs.basicHintContent) {
      refs.basicHintContent.hidden = true;
    }
    if (refs.basicHintToggle) {
      refs.basicHintToggle.textContent = "Show Quick Hint";
    }
    if (refs.hintContent) {
      refs.hintContent.hidden = true;
    }
    if (refs.hintToggle) {
      const cost = Math.max(0, Number(currentLevel.hintCost ?? 0));
      const coinWord = cost === 1 ? "coin" : "coins";
      refs.hintToggle.textContent =
        coinCount >= cost
          ? `Unlock Hint (-${cost} ${coinWord})`
          : `Need ${cost} ${coinWord}`;
    }
  }
}

function handleLevelReset() {
  resetCoinsAndHints();
  if (currentLevel) {
    setStatusMessage(currentLevel.initialStatus || "");
  }
}

function showWinScreen() {
  currentLevel = null;
  engine.stop();
  refs.gameArea.innerHTML = "";
  const win = document.createElement("div");
  win.className = "win-screen";

  const heading = document.createElement("h2");
  heading.textContent = "You Win!";

  const copy = document.createElement("p");
  copy.textContent =
    "You glitched your way through every layer. Ready to rerun the exploits?";

  const button = document.createElement("button");
  button.type = "button";
  button.textContent = "Play Again";
  button.addEventListener("click", () => {
    localStorage.removeItem("hasKey");
    localStorage.removeItem(STORAGE_KEYS.hasKey);
    setHighestUnlocked(1);
    window.location.hash = `${HASH_PREFIX}1`;
  });

  win.appendChild(heading);
  win.appendChild(copy);
  win.appendChild(button);

  refs.gameArea.appendChild(win);
  setStatusMessage("Victory unlocked. Replay to share the hacks!");
  refs.hintContent.hidden = true;
  refs.hintToggle.textContent = "Show Hacker's Hint";
}

window.addEventListener("hashchange", handleRouteChange);
window.addEventListener("DOMContentLoaded", () => {
  if (!window.location.hash) {
    window.location.hash = `${HASH_PREFIX}1`;
  }
  handleRouteChange();
});
