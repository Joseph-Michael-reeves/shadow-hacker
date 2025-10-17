const GRAVITY = 0.36;
const MAX_FALL_SPEED = 10;

const DEFAULTS = {
  moveSpeed: 3.0,
  jumpStrength: 8.5,
  renderScale: 1.5,
};

const isTypingTarget = (target) => {
  if (!target) {
    return false;
  }
  const tag = target.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    target.isContentEditable
  );
};

const rectsOverlap = (a, b) => {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
};

class LevelEngine {
  constructor(gameArea, callbacks = {}) {
    this.gameArea = gameArea;
    this.callbacks = {
      onLevelComplete: () => {},
      onLevelStart: () => {},
      onStatus: () => {},
      onCoinCollected: () => {},
      onLevelReset: () => {},
      ...callbacks,
    };

    const visualWidth = Math.round(32 * DEFAULTS.renderScale);
    const visualHeight = Math.round(32 * DEFAULTS.renderScale);
    const hitboxWidth = 28;
    const hitboxHeight = 39;
    this.playerSize = {
      width: hitboxWidth,
      height: hitboxHeight,
    };
    this.visualSize = { width: visualWidth, height: visualHeight };
    this.hitboxOffset = {
      x: Math.max(0, (visualWidth - hitboxWidth) / 2),
      y: Math.max(0, visualHeight - hitboxHeight),
    };
    this.level = null;
    this.platforms = [];
    this.platformEls = [];
    this.door = null;
    this.specialElements = [];
    this.coins = [];
    this.exposedGlobals = new Set();

    this.moveSpeed = DEFAULTS.moveSpeed;
    this.baseJumpStrength = DEFAULTS.jumpStrength;
    this.jumpStrength = this.baseJumpStrength;
    this.gravity = GRAVITY;

    this.input = {
      left: false,
      right: false,
    };
    this.jumpQueued = false;

    this.player = {
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      onGround: false,
    };

    this.loopHandle = null;
    this.lastTimestamp = null;
    this.levelCompleted = false;
    this.lastFacing = 1;
    this.spriteAnim = {
      rowIndex: 3,
      startCol: 0,
      frameCount: 7,
      fps: 10,
      timer: 0,
      frameIndex: 0,
      playing: false,
      direction: 1,
      frameWidth: 32,
      frameHeight: 32,
      sheetWidth: 256,
      sheetHeight: 288,
      mode: "idle",
      loop: true,
      frames: null,
      renderScale: DEFAULTS.renderScale,
      overrideMode: null,
    };

    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleKeyUp = this.handleKeyUp.bind(this);

    window.addEventListener("keydown", this.handleKeyDown);
    window.addEventListener("keyup", this.handleKeyUp);
  }

  destroy() {
    window.removeEventListener("keydown", this.handleKeyDown);
    window.removeEventListener("keyup", this.handleKeyUp);
    this.stop();
    this.clearLevel();
    this.revokeGlobalHacks();
  }

  handleKeyDown(event) {
    if (isTypingTarget(event.target)) {
      return;
    }

    switch (event.key) {
      case "ArrowLeft":
      case "a":
      case "A":
        this.input.left = true;
        event.preventDefault();
        break;
      case "ArrowRight":
      case "d":
      case "D":
        this.input.right = true;
        event.preventDefault();
        break;
      case "ArrowUp":
      case "w":
      case "W":
      case " ":
        this.jumpQueued = true;
        event.preventDefault();
        break;
      case "ArrowDown":
      case "s":
      case "S":
        event.preventDefault();
        break;
      case "j":
      case "J":
        event.preventDefault();
        this.triggerSpecialAnimation();
        break;
      case "r":
      case "R":
        event.preventDefault();
        this.callbacks.onLevelReset(this.level);
        this.resetLevel();
        break;
      default:
        break;
    }
  }

  handleKeyUp(event) {
    switch (event.key) {
      case "ArrowLeft":
      case "a":
      case "A":
        this.input.left = false;
        event.preventDefault();
        break;
      case "ArrowRight":
      case "d":
      case "D":
        this.input.right = false;
        event.preventDefault();
        break;
      case "ArrowUp":
      case "w":
      case "W":
      case " ":
        this.jumpQueued = false;
        event.preventDefault();
        break;
      default:
        break;
    }
  }

  resetLevel() {
    if (!this.level) {
      return;
    }
    this.resetSpriteAnimation();
    this.loadLevel(this.level, { preserveStatus: true });
  }

  clearLevel() {
    this.stop();
    this.level = null;
    this.platforms = [];
    this.platformEls = [];
    this.coins.forEach((coin) => {
      if (coin.element && coin.element.parentElement) {
        coin.element.parentElement.removeChild(coin.element);
      }
    });
    this.coins = [];
    this.specialElements.forEach((el) => {
      if (el.parentElement) {
        el.parentElement.removeChild(el);
      }
    });
    this.specialElements = [];

    if (this.door && this.door.element.parentElement) {
      this.door.element.parentElement.removeChild(this.door.element);
    }
    this.door = null;

    if (this.playerElement && this.playerElement.parentElement) {
      this.playerElement.parentElement.removeChild(this.playerElement);
    }
    this.playerElement = null;
  }

  loadLevel(level, options = {}) {
    this.stop();
    this.revokeGlobalHacks();

    this.level = level;
    this.levelCompleted = false;
    this.gameArea.innerHTML = "";
    this.platforms = [];
    this.platformEls = [];
    this.specialElements = [];
    this.coins = [];
    this.door = null;
    this.resetSpriteAnimation();

    this.gravity = level.gravity ?? GRAVITY;
    this.moveSpeed = level.moveSpeed ?? DEFAULTS.moveSpeed;
    this.baseJumpStrength = level.jumpStrength ?? DEFAULTS.jumpStrength;
    this.jumpStrength = this.baseJumpStrength;

    this.player = {
      x: level.playerStart?.x ?? 40,
      y: level.playerStart?.y ?? 40,
      vx: 0,
      vy: 0,
      onGround: false,
    };

    this.playerElement = document.createElement("div");
    this.playerElement.className = "player";
    this.playerElement.style.transformOrigin = "top left";
    this.gameArea.appendChild(this.playerElement);

    (level.platforms || []).forEach((platform) => this.addPlatform(platform));

    if (level.bannerText) {
      const banner = document.createElement("div");
      banner.className = "goal-banner";
      banner.textContent = level.bannerText;
      this.gameArea.appendChild(banner);
      this.specialElements.push(banner);
    }

    if (level.door) {
      this.addDoor(level.door);
    }

    if (typeof level.setup === "function") {
      level.setup(this);
    }

    (level.coins || []).forEach((coin) => this.addCoin(coin));

    this.updatePlayerElement();

    this.callbacks.onLevelStart(level, options);

    if (!options.preserveStatus && level.initialStatus) {
      this.callbacks.onStatus(level.initialStatus);
    }

    this.lastTimestamp = performance.now();
    this.loopHandle = requestAnimationFrame((timestamp) =>
      this.tick(timestamp)
    );
  }

  addPlatform(platform) {
    const data = {
      x: platform.x,
      y: platform.y,
      width: platform.width,
      height: platform.height,
    };

    this.platforms.push(data);
    const element = document.createElement("div");
    element.className = "platform";
    element.style.left = `${data.x}px`;
    element.style.top = `${data.y}px`;
    element.style.width = `${data.width}px`;
    element.style.height = `${data.height}px`;
    this.gameArea.appendChild(element);
    this.platformEls.push(element);
  }

  addDoor(doorConfig) {
    const element = document.createElement("div");
    element.className = "door";
    element.style.left = `${doorConfig.x}px`;
    element.style.top = `${doorConfig.y}px`;

    this.gameArea.appendChild(element);
    this.door = {
      element,
      x: doorConfig.x,
      y: doorConfig.y,
      width: doorConfig.width ?? 32,
      height: doorConfig.height ?? 48,
      isLocked: doorConfig.isLocked ?? false,
      unlockedText: doorConfig.unlockedText ?? null,
      lockedText: doorConfig.lockedText ?? null,
    };

    if (this.door.isLocked) {
      element.classList.add("locked");
    }
  }

  setDoorLocked(isLocked) {
    if (!this.door) {
      return;
    }
    this.door.isLocked = isLocked;
    if (isLocked) {
      this.door.element.classList.add("locked");
      if (this.door.lockedText) {
        this.callbacks.onStatus(this.door.lockedText);
      }
    } else {
      this.door.element.classList.remove("locked");
      if (this.door.unlockedText) {
        this.callbacks.onStatus(this.door.unlockedText);
      }
    }
  }

  exposePlayerHack() {
    // Expose a controlled global helper so devtools users can tweak jump height.
    const api = {
      setJumpHeight: (jumpValue) => {
        const parsed = Number(jumpValue);
        if (!Number.isFinite(parsed)) {
          console.warn("Jump height must be a number.");
          return;
        }
        this.setJumpStrength(parsed);
        console.info(`Jump height set to ${parsed}.`);
      },
    };
    Object.defineProperty(window, "player", {
      configurable: true,
      enumerable: false,
      value: api,
    });
    this.exposedGlobals.add("player");
  }

  revokeGlobalHacks() {
    if (this.exposedGlobals.has("player")) {
      try {
        delete window.player;
      } catch (error) {
        window.player = undefined;
      }
      this.exposedGlobals.delete("player");
    }
  }

  addSpecialElement(element) {
    this.gameArea.appendChild(element);
    this.specialElements.push(element);
  }

  tick(timestamp) {
    if (!this.level) {
      return;
    }
    const delta = Math.min(32, timestamp - this.lastTimestamp || 16);
    this.lastTimestamp = timestamp;

    this.updatePlayer(delta);
    this.loopHandle = requestAnimationFrame((ts) => this.tick(ts));
  }

  stop() {
    if (this.loopHandle) {
      cancelAnimationFrame(this.loopHandle);
      this.loopHandle = null;
    }
  }

  updatePlayer(deltaMs) {
    const deltaSeconds = deltaMs / 1000;
    const horizontalInput =
      (this.input.right ? 1 : 0) - (this.input.left ? 1 : 0);
    this.player.vx = horizontalInput * this.moveSpeed;

    if (horizontalInput > 0) {
      this.lastFacing = 1;
    } else if (horizontalInput < 0) {
      this.lastFacing = -1;
    }

    if (this.jumpQueued && this.player.onGround) {
      this.player.vy = -this.jumpStrength;
      this.player.onGround = false;
      this.jumpQueued = false;
    }

    this.player.vy += this.gravity;
    if (this.player.vy > MAX_FALL_SPEED) {
      this.player.vy = MAX_FALL_SPEED;
    }

    this.resolveHorizontalMovement();
    this.resolveVerticalMovement();

    this.updateSpriteAnimation(deltaSeconds, horizontalInput);
    this.updatePlayerElement();
    this.checkDoorCollision();
    this.checkCoinCollection();
  }

  resolveHorizontalMovement() {
    let newX = this.player.x + this.player.vx;
    newX = Math.max(0, Math.min(newX, this.gameArea.clientWidth - this.playerSize.width));

    let playerRect = this.getPlayerRect(newX, this.player.y);
    for (const platform of this.platforms) {
      if (!rectsOverlap(playerRect, platform)) {
        continue;
      }
      if (this.player.vx > 0) {
        newX = platform.x - this.playerSize.width;
      } else if (this.player.vx < 0) {
        newX = platform.x + platform.width;
      }
      playerRect = this.getPlayerRect(newX, this.player.y);
    }

    this.player.x = newX;
  }

  resolveVerticalMovement() {
    let newY = this.player.y + this.player.vy;
    const floor = this.gameArea.clientHeight - this.playerSize.height;
    newY = Math.max(0, Math.min(newY, floor));

    let playerRect = this.getPlayerRect(this.player.x, newY);
    let landed = false;

    for (const platform of this.platforms) {
      if (!rectsOverlap(playerRect, platform)) {
        continue;
      }

      if (this.player.vy > 0) {
        newY = platform.y - this.playerSize.height;
        this.player.vy = 0;
        landed = true;
      } else if (this.player.vy < 0) {
        newY = platform.y + platform.height;
        this.player.vy = 0;
      }
      playerRect = this.getPlayerRect(this.player.x, newY);
    }

    this.player.y = newY;
    this.player.onGround = landed || newY >= floor;
    if (this.player.onGround && this.player.vy > 0) {
      this.player.vy = 0;
    }
  }

  checkDoorCollision() {
    if (!this.door || this.levelCompleted) {
      return;
    }
    const doorRect = {
      x: this.door.x,
      y: this.door.y,
      width: this.door.width,
      height: this.door.height,
    };
    const playerRect = this.getPlayerRect(this.player.x, this.player.y);

    if (!rectsOverlap(playerRect, doorRect)) {
      return;
    }

    const isLocked =
      typeof this.level.isDoorLocked === "function"
        ? this.level.isDoorLocked(this)
        : this.door.isLocked;

    if (isLocked) {
      if (this.level.onDoorLocked) {
        this.level.onDoorLocked(this);
      } else if (this.door.lockedText) {
        this.callbacks.onStatus(this.door.lockedText);
      }
      return;
    }

    this.triggerLevelComplete();
  }

  triggerLevelComplete() {
    if (this.levelCompleted) {
      return;
    }
    this.levelCompleted = true;
    this.callbacks.onLevelComplete(this.level);
  }

  getPlayerRect(x, y) {
    return {
      x,
      y,
      width: this.playerSize.width,
      height: this.playerSize.height,
    };
  }

  updatePlayerElement() {
    if (!this.playerElement) {
      return;
    }
    const anim = this.spriteAnim;
    const frameWidth = anim.frameWidth;
    const frameHeight = anim.frameHeight;
    const scale = anim.renderScale || this.playerSize.width / frameWidth || 1;
    const visualWidth = frameWidth * scale;
    const offsetX = this.hitboxOffset?.x ?? 0;
    const offsetY = this.hitboxOffset?.y ?? 0;
    const baseX = this.player.x - offsetX;
    const baseY = this.player.y - offsetY;
    const translateX =
      anim.direction === -1 ? baseX + visualWidth : baseX;
    const scaleX = anim.direction === -1 ? -1 : 1;
    this.playerElement.style.transform = `translate(${translateX}px, ${baseY}px) scaleX(${scaleX})`;
    const frameIndex = Math.min(
      (anim.frames ? anim.frames.length : anim.frameCount) - 1,
      anim.frameIndex
    );
    let sx;
    let sy;
    if (anim.frames && anim.frames.length > 0) {
      const frame = anim.frames[frameIndex];
      sx = (frame.col ?? 0) * frameWidth;
      sy = (frame.row ?? 0) * frameHeight;
    } else {
      sx = (anim.startCol + frameIndex) * frameWidth;
      sy = anim.rowIndex * frameHeight;
    }
    const sheetWidth = (anim.sheetWidth || frameWidth * 8) * scale;
    const sheetHeight = (anim.sheetHeight || frameHeight * 9) * scale;
    const destWidth = visualWidth;
    const destHeight = frameHeight * scale;
    this.playerElement.style.width = `${destWidth}px`;
    this.playerElement.style.height = `${destHeight}px`;
    this.playerElement.style.backgroundSize = `${sheetWidth}px ${sheetHeight}px`;
    this.playerElement.style.backgroundPosition = `-${sx * scale}px -${sy * scale}px`;
    this.playerElement.style.setProperty("--hitbox-width", `${this.playerSize.width}px`);
    this.playerElement.style.setProperty("--hitbox-height", `${this.playerSize.height}px`);
  }

  setJumpStrength(value) {
    const clamped = Math.max(4, Math.min(Number(value), 60));
    this.jumpStrength = clamped;
  }

  updateSpriteAnimation(deltaSeconds, horizontalInput) {
    const anim = this.spriteAnim;
    this.updateAnimationMode(horizontalInput);

    if (!anim.playing) {
      return;
    }

    anim.frameDuration = 1 / (anim.fps || 10);
    anim.timer += deltaSeconds;
    while (anim.timer >= anim.frameDuration) {
      anim.timer -= anim.frameDuration;
      anim.frameIndex += 1;
      const totalFrames = anim.frames ? anim.frames.length : anim.frameCount;
      if (totalFrames <= 0) {
        anim.frameIndex = 0;
        anim.playing = false;
        break;
      }
      if (anim.frameIndex >= totalFrames) {
        if (anim.loop) {
          anim.frameIndex = 0;
        } else {
          anim.frameIndex = totalFrames - 1;
          anim.playing = false;
          break;
        }
      }
    }

    if (!anim.playing && anim.mode === "special") {
      anim.overrideMode = "specialHold";
      this.applyAnimationSequence("specialHold", this.lastFacing);
      return;
    }
  }

  resetSpriteAnimation() {
    Object.assign(this.spriteAnim, {
      timer: 0,
      frameIndex: 0,
      playing: false,
      direction: 1,
      mode: "idle",
      frames: null,
      overrideMode: null,
    });
  }

  updateAnimationMode(horizontalInput) {
    const anim = this.spriteAnim;
    if (
      anim.overrideMode === "specialHold" &&
      (horizontalInput !== 0 || !this.player.onGround)
    ) {
      anim.overrideMode = null;
    }

    let desiredMode;
    if (anim.overrideMode) {
      desiredMode = anim.overrideMode;
    } else if (!this.player.onGround) {
      desiredMode = this.player.vy <= 0 ? "jumpUp" : "fallDown";
    } else if (horizontalInput !== 0) {
      desiredMode = "walk";
    } else {
      desiredMode = "idle";
    }

    if (desiredMode !== anim.mode) {
      this.applyAnimationSequence(desiredMode, horizontalInput);
    }

    if (!anim.overrideMode && anim.mode === "walk") {
      this.lastFacing = anim.direction;
    }

    if (anim.mode === "walk") {
      anim.direction = horizontalInput < 0 ? -1 : 1;
      anim.playing = true;
    } else if (anim.mode === "idle") {
      anim.direction = anim.direction || 1;
      anim.playing = false;
      anim.frameIndex = 0;
    } else {
      anim.playing = true;
    }
  }

  triggerSpecialAnimation() {
    const anim = this.spriteAnim;
    if (anim.overrideMode === "special" || anim.mode === "special") {
      return;
    }
    anim.overrideMode = "special";
    this.applyAnimationSequence("special", this.lastFacing);
  }

  applyAnimationSequence(mode, horizontalInput) {
    const anim = this.spriteAnim;
    anim.mode = mode;
    anim.timer = 0;
    anim.frameIndex = 0;
    anim.loop = true;
    anim.frames = null;

    if (mode === "walk") {
      anim.frames = null;
      anim.rowIndex = 3;
      anim.startCol = 0;
      anim.frameCount = 7;
      anim.fps = 10;
      anim.direction = horizontalInput < 0 ? -1 : 1;
      this.lastFacing = anim.direction;
    } else if (mode === "jumpUp") {
      anim.frames = [
        { row: 5, col: 0 },
        { row: 5, col: 0 },
        { row: 5, col: 1 },
        { row: 5, col: 1 },
        { row: 5, col: 2 },
        { row: 5, col: 3 },
      ];
      anim.frameCount = anim.frames.length;
      anim.rowIndex = anim.frames[0].row;
      anim.startCol = anim.frames[0].col;
      anim.fps = 9;
      anim.loop = false;
      anim.direction = this.lastFacing;
    } else if (mode === "fallDown") {
      anim.frames = [
        { row: 5, col: 4 },
        { row: 5, col: 4 },
        { row: 5, col: 5 },
        { row: 5, col: 6 },
        { row: 5, col: 7 },
        { row: 5, col: 7 },
      ];
      anim.frameCount = anim.frames.length;
      anim.rowIndex = anim.frames[0].row;
      anim.startCol = anim.frames[0].col;
      anim.fps = 9;
      anim.loop = false;
      anim.direction = this.lastFacing;
    } else if (mode === "special") {
      anim.rowIndex = 7;
      anim.startCol = 0;
      anim.frameCount = 8;
      anim.fps = 12;
      anim.loop = false;
      anim.frames = null;
      anim.direction = this.lastFacing;
    } else if (mode === "specialHold") {
      anim.frames = [
        { row: 7, col: 5 },
        { row: 7, col: 6 },
        { row: 7, col: 7 },
      ];
      anim.frameCount = anim.frames.length;
      anim.rowIndex = anim.frames[0].row;
      anim.startCol = anim.frames[0].col;
      anim.fps = 1.5;
      anim.loop = true;
      anim.direction = this.lastFacing;
    } else {
      anim.frames = [
        { row: 1, col: 0 },
        { row: 1, col: 1 },
      ];
      anim.frameCount = anim.frames.length;
      anim.rowIndex = anim.frames[0].row;
      anim.startCol = anim.frames[0].col;
      anim.fps = 4;
      anim.loop = true;
      anim.direction = this.lastFacing;
    }
  }

  addCoin(config) {
    const size = config.size ?? 18;
    const data = {
      x: config.x,
      y: config.y,
      width: size,
      height: size,
      collected: false,
    };
    const element = document.createElement("div");
    element.className = "coin";
    element.style.left = `${data.x}px`;
    element.style.top = `${data.y}px`;
    element.style.width = `${data.width}px`;
    element.style.height = `${data.height}px`;
    this.gameArea.appendChild(element);
    data.element = element;
    this.coins.push(data);
  }

  checkCoinCollection() {
    if (!this.coins.length) {
      return;
    }
    const playerRect = this.getPlayerRect(this.player.x, this.player.y);
    for (const coin of this.coins) {
      if (coin.collected) {
        continue;
      }
      const coinRect = {
        x: coin.x,
        y: coin.y,
        width: coin.width,
        height: coin.height,
      };
      if (rectsOverlap(playerRect, coinRect)) {
        coin.collected = true;
        if (coin.element && coin.element.parentElement) {
          coin.element.parentElement.removeChild(coin.element);
        }
        this.callbacks.onCoinCollected(coin, this.level);
      }
    }
  }
}

export default LevelEngine;
