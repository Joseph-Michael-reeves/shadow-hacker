export default class SpriteAnimator {
  constructor(opts) {
    const {
      imageSrc,
      cols,
      rows,
      frameW,
      frameH,
      scale = 4,
      fps = 12,
    } = opts;
    Object.assign(this, {
      cols,
      rows,
      frameW,
      frameH,
      scale,
      defaultFps: fps,
      ctx: null,
      x: 0,
      y: 0,
      elapsed: 0,
      currentFrame: 0,
      currentRow: 0,
      startCol: 0,
      frameCount: cols,
      pingPong: false,
      reverse: false,
      frameDir: 1,
      frameDuration: 1 / fps,
    });
    this.imageLoaded = false;
    this.image = new Image();
    this.image.addEventListener("load", () => {
      if (!this.frameW) {
        this.frameW = Math.floor(this.image.naturalWidth / this.cols);
      }
      if (!this.frameH) {
        this.frameH = Math.floor(this.image.naturalHeight / this.rows);
      }
      this.imageLoaded = true;
    });
    this.image.src = imageSrc;
  }

  attach(ctx) {
    this.ctx = ctx;
    if (ctx) {
      ctx.imageSmoothingEnabled = false;
    }
    return this;
  }

  playRow(rowIndex, opts = {}) {
    const {
      startCol = 0,
      frames = this.cols,
      fps = this.defaultFps,
      pingPong = false,
      reverse = false,
    } = opts;
    this.currentRow = Math.max(0, Math.min(rowIndex, this.rows - 1));
    this.startCol = Math.max(0, Math.min(startCol, this.cols - 1));
    this.frameCount = Math.max(
      1,
      Math.min(frames, this.cols - this.startCol)
    );
    this.pingPong = pingPong && this.frameCount > 1;
    this.reverse = reverse && !this.pingPong;
    this.frameDir = this.reverse ? -1 : 1;
    this.frameDuration = 1 / (fps || this.defaultFps || 12);
    this.currentFrame = this.reverse ? this.frameCount - 1 : 0;
    this.elapsed = 0;
    return this;
  }

  setPosition(x, y) {
    this.x = x;
    this.y = y;
    return this;
  }

  update(dt) {
    if (!this.imageLoaded || this.frameCount <= 0) {
      return;
    }
    this.elapsed += dt;
    while (this.elapsed >= this.frameDuration) {
      this.elapsed -= this.frameDuration;
      if (this.pingPong) {
        this.currentFrame += this.frameDir;
        if (this.currentFrame >= this.frameCount - 1) {
          this.currentFrame = this.frameCount - 1;
          this.frameDir = -1;
        } else if (this.currentFrame <= 0) {
          this.currentFrame = 0;
          this.frameDir = 1;
        }
      } else if (this.reverse) {
        this.currentFrame =
          (this.currentFrame - 1 + this.frameCount) % this.frameCount;
      } else {
        this.currentFrame = (this.currentFrame + 1) % this.frameCount;
      }
    }
  }

  draw() {
    if (!this.ctx || !this.imageLoaded) {
      return;
    }
    const w = this.frameW;
    const h = this.frameH;
    const col = Math.min(this.cols - 1, this.startCol + this.currentFrame);
    const sx = col * w;
    const sy = this.currentRow * h;
    this.ctx.drawImage(
      this.image,
      sx,
      sy,
      w,
      h,
      this.x,
      this.y,
      w * this.scale,
      h * this.scale
    );
  }
}
