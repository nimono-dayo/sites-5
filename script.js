// ゲーム状態管理
class FallingRectangleGame {
  constructor() {
    this.score = 0;
    this.stage = 1;
    this.stars = 0;
    this.gameStarted = false;
    this.gameOver = false;
    this.rectangles = [];
    this.columns = 4;
    this.dropSpeed = 2;
    this.spawnRate = 0.03; // 生成確率
    this.lastTime = 0;
    this.starTimer = 0;
    this.isEndlessMode = false;
    
    // DOM要素の参照
    this.gameArea = document.getElementById('gameArea');
    this.scoreElement = document.getElementById('score');
    this.stageElement = document.getElementById('stage');
    this.startScreen = document.getElementById('startScreen');
    this.gameOverScreen = document.getElementById('gameOverScreen');
    this.finalScoreElement = document.getElementById('finalScore');
    this.finalStageElement = document.getElementById('finalStage');
    
    this.init();
  }

  init() {
    // イベントリスナーの設定
    document.getElementById('startBtn').addEventListener('click', () => this.startGame());
    document.getElementById('restartBtn').addEventListener('click', () => this.restartGame());
    
    // ゲームエリアでのクリック/タップ検出
    this.gameArea.addEventListener('click', (e) => this.handleClick(e));
    this.gameArea.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.handleClick(e.touches[0]);
    }, { passive: false });
    
    // ゲームループの開始
    this.gameLoop();
  }

  startGame() {
    this.startScreen.classList.add('hidden');
    this.gameStarted = true;
    this.gameOver = false;
    this.lastTime = performance.now();
    // UI一貫性のために星表示を更新
    this.updateStars();
  }

  restartGame() {
    // ゲーム状態をリセット
    this.score = 0;
    this.stage = 1;
    this.stars = 0;
    this.gameStarted = false;
    this.gameOver = false;
    this.rectangles = [];
    this.dropSpeed = 2;
    this.spawnRate = 0.03;
    this.starTimer = 0;
    this.isEndlessMode = false;
    
    // UI更新
    this.updateUI();
    this.updateStars();
    this.clearRectangles();
    
    // 画面切り替え
    this.gameOverScreen.classList.add('hidden');
    this.startScreen.classList.remove('hidden');
  }

  handleClick(event) {
    if (!this.gameStarted || this.gameOver) return;
    
    const rect = this.gameArea.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    let hitRectangle = false;
    
    // 長方形がクリックされたかチェック
    for (let i = this.rectangles.length - 1; i >= 0; i--) {
      const rectangle = this.rectangles[i];
      const rectElement = rectangle.element;
      const rectBounds = rectElement.getBoundingClientRect();
      const gameAreaBounds = this.gameArea.getBoundingClientRect();
      
      const rectX = rectBounds.left - gameAreaBounds.left;
      const rectY = rectBounds.top - gameAreaBounds.top;
      const rectWidth = rectBounds.width;
      const rectHeight = rectBounds.height;
      
      if (x >= rectX && x <= rectX + rectWidth && 
          y >= rectY && y <= rectY + rectHeight) {
        // 長方形をクリック
        hitRectangle = true;
        this.catchRectangle(i);
        break;
      }
    }
    
    // 長方形以外をクリックした場合はゲームオーバー
    if (!hitRectangle) {
      this.endGame();
    }
  }

  catchRectangle(index) {
    const rectangle = this.rectangles[index];
    rectangle.element.classList.add('clicked');
    
    // スコア加算
    this.score += 10;
    
    // 長方形を配列から即座削除（インデックスズレ防止）
    this.rectangles.splice(index, 1);
    
    // DOMからの削除はアニメーション後に実行
    setTimeout(() => {
      if (rectangle.element.parentNode) {
        rectangle.element.parentNode.removeChild(rectangle.element);
      }
    }, 200);
    
    this.updateUI();
  }

  spawnRectangle() {
    if (Math.random() < this.spawnRate) {
      const column = Math.floor(Math.random() * this.columns);
      const columnElement = document.getElementById(`column${column + 1}`);
      
      const rectangle = document.createElement('div');
      rectangle.className = 'rectangle';
      rectangle.style.top = '-60px';
      
      columnElement.appendChild(rectangle);
      
      this.rectangles.push({
        element: rectangle,
        column: column,
        y: -60
      });
      
    }
  }

  updateRectangles(deltaTime) {
    for (let i = this.rectangles.length - 1; i >= 0; i--) {
      const rectangle = this.rectangles[i];
      rectangle.y += this.dropSpeed * deltaTime * 0.1;
      rectangle.element.style.top = rectangle.y + 'px';
      
      // 画面下に完全に出た場合（長方形が全て見えなくなった場合）
      const gameAreaHeight = this.gameArea.offsetHeight;
      if (rectangle.y >= gameAreaHeight) {
        this.endGame();
        return;
      }
    }
  }

  updateStars() {
    for (let i = 1; i <= 3; i++) {
      const star = document.getElementById(`star${i}`);
      if (i <= this.stars) {
        star.classList.add('earned');
      } else {
        star.classList.remove('earned');
      }
    }
  }

  updateUI() {
    this.scoreElement.textContent = this.score;
    this.stageElement.textContent = this.stage;
  }

  checkStageProgression() {
    // スコアベースでステージ進行（100点ごと）
    const newStage = Math.floor(this.score / 100) + 1;
    
    if (newStage > this.stage) {
      this.stage = newStage;
      
      // 50ステージまでは速度と生成率を上げる
      if (this.stage <= 50) {
        this.dropSpeed += 0.3;
        this.spawnRate += 0.003;
      }
      
      // エンドレスモード（★3個取得後）では速度をどんどん上げる
      if (this.isEndlessMode) {
        this.dropSpeed += 0.5;
        this.spawnRate += 0.005;
      }
      
      // ステージ表示を更新
      this.updateUI();
    }
  }

  updateStarProgress(deltaTime) {
    this.starTimer += deltaTime;
    
    // 10秒ごとに★を獲得（最大3個まで）
    // 長いフレームに対応するためwhileループを使用
    while (this.starTimer >= 10000 && this.stars < 3) {
      this.stars++;
      this.starTimer -= 10000; // 余った時間を保持
      this.updateStars();
      
      // ★3個でエンドレスモード開始
      if (this.stars === 3) {
        this.isEndlessMode = true;
      }
    }
  }

  endGame() {
    this.gameOver = true;
    this.gameStarted = false;
    
    // 最終スコアとステージを表示
    this.finalScoreElement.textContent = this.score;
    this.finalStageElement.textContent = this.stage;
    
    // ゲームオーバー画面を表示
    this.gameOverScreen.classList.remove('hidden');
    
    // 全ての長方形を削除
    this.clearRectangles();
  }

  clearRectangles() {
    this.rectangles.forEach(rectangle => {
      if (rectangle.element.parentNode) {
        rectangle.element.parentNode.removeChild(rectangle.element);
      }
    });
    this.rectangles = [];
  }

  gameLoop(currentTime = performance.now()) {
    if (this.gameStarted && !this.gameOver) {
      const deltaTime = currentTime - this.lastTime;
      
      // 長方形の生成
      this.spawnRectangle();
      
      // 長方形の更新
      this.updateRectangles(deltaTime);
      
      // ステージ進行チェック
      this.checkStageProgression();
      
      // ★進行チェック
      this.updateStarProgress(deltaTime);
      
      this.lastTime = currentTime;
    }
    
    requestAnimationFrame((time) => this.gameLoop(time));
  }
}

// ゲーム開始
document.addEventListener('DOMContentLoaded', () => {
  new FallingRectangleGame();
});
