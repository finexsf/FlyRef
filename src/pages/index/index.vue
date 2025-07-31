<template>
  <view class="container">
    <!-- 头部区域 -->
    <view class="header">
      <!-- 学院图标 -->
      <view class="college-logo">
        <image src="/static/xueyuan.png" mode="aspectFit"></image>
      </view>
      <!-- robocon 图标组 -->
      <view class="robocon-icons">
        <image class="robocon-icon" src="/static/robocon.jpg" mode="aspectFit"></image>
        <image class="robocon-icon" src="/static/2025robocon.jpg" mode="aspectFit"></image>
      </view>
      <view class="logo">
        <image src="/static/logo.png" mode="aspectFit"></image>
      </view>
      <view class="settings">
        <button class="sound-toggle-btn" :class="{ active: soundEnabled }" @click="toggleSound">
          <text class="icon">{{ soundEnabled ? '🔊' : '🔇' }}</text>
        </button>
        <button class="control-btn restart-btn" @click="forceRestart">
          <text class="icon">🔄</text> 强制重启
        </button>
        <button class="control-btn team-name-btn" @click="showTeamNameDialog">
          <text class="icon">✏️</text> 队伍名称
        </button>
      </view>
    </view>

    <!-- 计时器区域 -->
    <view class="timer-section">
      <view class="phase-text" :class="phaseClass">{{ phaseText }}</view>
      <!-- 模式选择按钮 -->
      <view class="mode-selection">
        <button class="mode-btn group" :class="{ active: currentMode === '小组循环赛' }" @click="setGameMode('小组循环赛')">
          小组循环赛
        </button>
        <button class="mode-btn elimination" :class="{ active: currentMode === '淘汰赛' }" @click="setGameMode('淘汰赛')">
          淘汰赛
        </button>
      </view>
      <view class="main-timer">{{ formatTime(mainDisplayTime) }}</view>
      <!-- 控球变更倒计时显示区域，样式更突出 -->
      <view
        v-if="currentPhase === 'possession'"
        class="possession-timer-highlight"
      >
        控球变更 {{ formatTime(possessionTime) }}
      </view>
      <view class="control-buttons">
        <button class="control-btn" @click="nextPhase">下一个</button>
        <button class="control-btn start-btn" @click="startGame">开始</button>
        <button class="control-btn pause-btn" @click="pauseGame">暂停</button>
        <button class="control-btn reset-btn" @click="resetGame">重置</button>
        <button class="control-btn foul-pause-btn" @click="foulPause">犯规暂停</button>
      </view>
    </view>

    <!-- 游戏区域 - 水平布局 -->
    <view class="game-area">
      <!-- 蓝队区域 -->
      <view class="team-section team-blue" :class="{ active: isTeamActive('blue') }">
        <view class="team-name">{{ teamNames.blue }}</view>
        <view class="team-score">{{ scores.blue }}</view>
        <view class="timer-display">{{ blueTimer }}</view>
        
        <button class="control-btn" @click="startTeamRound('blue')">现在开始</button>
        <button class="control-btn possession-change-btn" @click="startPossessionChange('blue')">控球变更</button>
        
        <!-- 蓝队得分面板 -->
        <view class="score-panel score-panel-blue">
          <view class="panel-header">蓝队得分</view>
          <view class="score-buttons">
            <button class="score-btn dunk-btn" @click="addScore('blue', 7)">
              🏀 扣篮 (7分)
            </button>
            <button class="score-btn three-pointer-btn" @click="addScore('blue', 3)">
              🎯 三分球
            </button>
            <button class="score-btn two-pointer-btn" @click="addScore('blue', 2)">
              ⭕ 二分球
            </button>
            <button class="score-btn dribble-btn" :class="{ disabled: dribbleCount.blue >= 2 }" @click="addDribbleScore('blue')">
              🏃 运球 (1分)
              <text class="dribble-counter">{{ dribbleCount.blue }}/2</text>
            </button>
          </view>
        </view>
        
        <!-- 蓝队历史记录 -->
        <view class="history-section">
          <view class="history-header">
            <text>行为</text>
            <text>时间</text>
          </view>
          <scroll-view class="history-content" scroll-y>
            <view v-for="(entry, index) in history.blue" :key="index" class="history-entry">
              <text>{{ entry.action }}</text>
              <text>{{ entry.time }}</text>
            </view>
          </scroll-view>
        </view>
      </view>

      <!-- 蓝队犯规面板 -->
      <view class="foul-panel foul-panel-blue">
        <view class="foul-panel-title">犯规面板</view>
        <view class="foul-section">
          <view class="foul-section-title">攻方犯规</view>
          <button class="foul-btn blue-foul" @click="recordFoul('blue', '蓝方犯规')">
            🚩 蓝方犯规
          </button>
          <button class="foul-btn possession-change-btn" @click="startPossessionChange('blue')">
            🔄 控球变更
          </button>
        </view>
        <view class="divider"></view>
        <view class="foul-section">
          <view class="foul-section-title">守方犯规</view>
          <button class="foul-btn penalty-btn" @click="recordFoul('blue', '罚球')">攻方罚球</button>
          <button class="foul-btn ban-btn" @click="startBanTimer('blue', 15)">禁赛15s</button>
          <button class="foul-btn ban-btn" @click="startBanTimer('blue', 30)">禁赛30s</button>
          <view class="ban-timer-display">{{ banTimers.blue.remain.toFixed(2) }}</view>
        </view>
        <!-- 蓝队犯规历史 -->
        <view class="foul-history-section">
          <view class="history-header">
            <text>行为</text>
            <text>犯规时间</text>
          </view>
          <scroll-view class="foul-history-content" scroll-y>
            <view v-for="(entry, index) in foulHistory.blue" :key="index" class="history-entry">
              <text>{{ entry.action }}</text>
              <text>{{ entry.time }}</text>
            </view>
          </scroll-view>
        </view>
      </view>

      <!-- 红队犯规面板 -->
      <view class="foul-panel foul-panel-red">
        <view class="foul-panel-title">犯规面板</view>
        <view class="foul-section">
          <view class="foul-section-title">攻方犯规</view>
          <button class="foul-btn red-foul" @click="recordFoul('red', '红方犯规')">
            🚩 红方犯规
          </button>
          <button class="foul-btn possession-change-btn" @click="startPossessionChange('red')">
            🔄 控球变更
          </button>
        </view>
        <view class="divider"></view>
        <view class="foul-section">
          <view class="foul-section-title">守方犯规</view>
          <button class="foul-btn penalty-btn" @click="recordFoul('red', '罚球')">攻方罚球</button>
          <button class="foul-btn ban-btn" @click="startBanTimer('red', 15)">禁赛15s</button>
          <button class="foul-btn ban-btn" @click="startBanTimer('red', 30)">禁赛30s</button>
          <view class="ban-timer-display">{{ banTimers.red.remain.toFixed(2) }}</view>
        </view>
        <!-- 红队犯规历史 -->
        <view class="foul-history-section">
          <view class="history-header">
            <text>行为</text>
            <text>犯规时间</text>
          </view>
          <scroll-view class="foul-history-content" scroll-y>
            <view v-for="(entry, index) in foulHistory.red" :key="index" class="history-entry">
              <text>{{ entry.action }}</text>
              <text>{{ entry.time }}</text>
            </view>
          </scroll-view>
        </view>
      </view>

      <!-- 红队区域 -->
      <view class="team-section team-red" :class="{ active: isTeamActive('red') }">
        <view class="team-name">{{ teamNames.red }}</view>
        <view class="team-score">{{ scores.red }}</view>
        <view class="timer-display">{{ redTimer }}</view>
        
        <button class="control-btn" @click="startTeamRound('red')">现在开始</button>
        <button class="control-btn possession-change-btn" @click="startPossessionChange('red')">控球变更</button>
        
        <!-- 红队得分面板 -->
        <view class="score-panel score-panel-red">
          <view class="panel-header">红队得分</view>
          <view class="score-buttons">
            <button class="score-btn dunk-btn" @click="addScore('red', 7)">
              🏀 扣篮 (7分)
            </button>
            <button class="score-btn three-pointer-btn" @click="addScore('red', 3)">
              🎯 三分球
            </button>
            <button class="score-btn two-pointer-btn" @click="addScore('red', 2)">
              ⭕ 二分球
            </button>
            <button class="score-btn dribble-btn" :class="{ disabled: dribbleCount.red >= 2 }" @click="addDribbleScore('red')">
              🏃 运球 (1分)
              <text class="dribble-counter">{{ dribbleCount.red }}/2</text>
            </button>
          </view>
        </view>
        
        <!-- 红队历史记录 -->
        <view class="history-section">
          <view class="history-header">
            <text>行为</text>
            <text>时间</text>
          </view>
          <scroll-view class="history-content" scroll-y>
            <view v-for="(entry, index) in history.red" :key="index" class="history-entry">
              <text>{{ entry.action }}</text>
              <text>{{ entry.time }}</text>
            </view>
          </scroll-view>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
export default {
  data() {
    return {
      // 游戏模式
      gameModes: {
        '小组循环赛': 160,
        '淘汰赛': 240
      },
      currentMode: '小组循环赛',
      gameTime: 160,
      
      // 时间相关
      setupTime: 60,
      shotClock: 20,
      possessionTime: 5,
      currentPhase: 'setup', // setup, playing, possession
      currentPossession: 'red',
      isRunning: false,
      lastUpdate: null,
      
      // 分数相关
      scores: {
        blue: 0,
        red: 0
      },
      teamNames: {
        blue: 'Blue',
        red: 'Red'
      },
      roundScores: {
        red: { 2: 0, 3: 0, 7: 0 },
        blue: { 2: 0, 3: 0, 7: 0 }
      },
      
      // 运球计数
      dribbleCount: {
        red: 0,
        blue: 0
      },
      
      // 犯规相关
      foulHistory: {
        blue: [],
        red: []
      },
      banTimers: {
        blue: { running: false, remain: 0, paused: false },
        red: { running: false, remain: 0, paused: false }
      },
      
      // 历史记录
      history: {
        blue: [],
        red: []
      },
      
      // 声音设置
      soundEnabled: true,
      
      // 控球变更
      nextPossession: null,
      isPossessionChanging: false,
      possessionChangeCountdown: 10,
      
      // 罚球状态
      penaltyActive: false,
      penaltyTeam: null,
      
      // 犯规暂停
      foulPauseActive: false,
      
      // 定时器
      gameTimer: null,
      banTimerBlue: null,
      banTimerRed: null,
      possessionTimer: null,

      // 新增：用于倒计时音效防抖
      lastCountdownSecond: null,

      // 新增：罚球得分阶段标志
      penaltyScoringActive: false,
      penaltyScoringTeam: null
    }
  },
  
  computed: {
    mainDisplayTime() {
      if (this.currentPhase === 'setup') {
        return this.setupTime;
      }
      return this.gameTime;
    },
    
    phaseText() {
      if (this.currentPhase === 'setup') {
        return `${this.currentMode} - 准备时间`;
      } else if (this.currentPhase === 'playing') {
        return this.currentPossession === 'red' ? '红队回合' : '蓝队回合';
      } else if (this.currentPhase === 'possession') {
        return `下一回合：${this.nextPossession === 'red' ? '红队' : '蓝队'}`;
      }
      return '';
    },
    
    phaseClass() {
      if (this.currentPhase === 'setup') return 'setup';
      if (this.currentPhase === 'playing') return this.currentPossession;
      return this.nextPossession;
    },
    
    blueTimer() {
      if (this.currentPhase === 'playing' && this.currentPossession === 'blue') {
        return this.shotClock.toFixed(2);
      }
      return '20.00';
    },
    
    redTimer() {
      if (this.currentPhase === 'playing' && this.currentPossession === 'red') {
        return this.shotClock.toFixed(2);
      }
      return '20.00';
    }
  },
  
  onLoad() {
    this.initGame();
  },
  
  onUnload() {
    this.clearAllTimers();
  },
  
  methods: {
    initGame() {
      this.updateDisplay();
      this.startGameTimer();
    },

    // 新增：完整重置所有状态
    resetAll() {
      this.clearAllTimers();
      // 恢复所有数据为初始值
      this.currentMode = '小组循环赛'; // 移除此行，避免覆盖当前模式
      this.gameTime = this.gameModes[this.currentMode];
      this.setupTime = 60;
      this.shotClock = 20;
      this.possessionTime = 5;
      this.currentPhase = 'setup';
      this.currentPossession = 'red';
      this.isRunning = false;
      this.lastUpdate = null;
      this.scores = { blue: 0, red: 0 };
      this.teamNames = { blue: 'Blue', red: 'Red' };
      this.roundScores = {
        red: { 2: 0, 3: 0, 7: 0 },
        blue: { 2: 0, 3: 0, 7: 0 }
      };
      this.dribbleCount = { red: 0, blue: 0 };
      this.foulHistory = { blue: [], red: [] };
      this.banTimers = {
        blue: { running: false, remain: 0, paused: false, timer: null },
        red: { running: false, remain: 0, paused: false, timer: null }
      };
      this.history = { blue: [], red: [] };
      this.soundEnabled = true;
      this.nextPossession = null;
      this.isPossessionChanging = false;
      this.possessionChangeCountdown = 10;
      this.penaltyActive = false;
      this.penaltyTeam = null;
      this.foulPauseActive = false;
      this.gameTimer = null;
      this.banTimerBlue = null;
      this.banTimerRed = null;
      this.possessionTimer = null;
      this.lastCountdownSecond = null;
      this.penaltyScoringActive = false;
      this.penaltyScoringTeam = null;
      // 重新启动主定时器
      this.initGame();
    },

    resetGame() {
      this.clearAllTimers();
      // 恢复所有数据为初始值，但保留当前模式
      this.gameTime = this.gameModes[this.currentMode];
      this.setupTime = 60;
      this.shotClock = 20;
      this.possessionTime = 5;
      this.currentPhase = 'setup';
      this.currentPossession = 'red';
      this.isRunning = false;
      this.lastUpdate = null;
      this.scores = { blue: 0, red: 0 };
      this.roundScores = {
        red: { 2: 0, 3: 0, 7: 0 },
        blue: { 2: 0, 3: 0, 7: 0 }
      };
      this.dribbleCount = { red: 0, blue: 0 };
      this.foulHistory = { blue: [], red: [] };
      this.banTimers = {
        blue: { running: false, remain: 0, paused: false, timer: null },
        red: { running: false, remain: 0, paused: false, timer: null }
      };
      this.history = { blue: [], red: [] };
      this.soundEnabled = true;
      this.nextPossession = null;
      this.isPossessionChanging = false;
      this.possessionChangeCountdown = 10;
      this.penaltyActive = false;
      this.penaltyTeam = null;
      this.foulPauseActive = false;
      this.gameTimer = null;
      this.banTimerBlue = null;
      this.banTimerRed = null;
      this.possessionTimer = null;
      this.lastCountdownSecond = null;
      this.penaltyScoringActive = false;
      this.penaltyScoringTeam = null;
      // 重新启动主定时器
      this.initGame();
    },

    forceRestart() {
      this.resetAll();
      uni.showToast({
        title: '系统已重启！',
        icon: 'success'
      });
    },

    startGameTimer() {
      this.gameTimer = setInterval(() => {
        if (this.isRunning) {
          const now = Date.now();
          const elapsed = (now - (this.lastUpdate || now)) / 1000;
          this.lastUpdate = now;
          
          this.updateGameTime(elapsed);
        }
      }, 50);
    },
    
    updateGameTime(elapsed) {
      switch(this.currentPhase) {
        case 'setup':
          this.setupTime = Math.max(0, this.setupTime - elapsed);
          if (this.setupTime <= 0) {
            this.currentPhase = 'playing';
            this.currentPossession = 'red';
            this.shotClock = 20;
            this.lastUpdate = Date.now();
            this.playSound('start');
          }
          break;
          
        case 'possession':
          this.possessionTime = Math.max(0, this.possessionTime - elapsed);
          // 控球变更期间禁赛倒计时暂停
          ['blue', 'red'].forEach(team => {
            if (this.banTimers[team].running) {
              this.banTimers[team].paused = true;
            }
          });
          if (this.possessionTime <= 0) {
            this.currentPhase = 'playing';
            this.shotClock = 20;
            if (this.nextPossession) {
              this.currentPossession = this.nextPossession;
              this.nextPossession = null;
            }
            this.resetDribbleCount();
            this.playSound('start');
            this.isPossessionChanging = false;
            // 控球变更结束，恢复禁赛倒计时（如果比赛在运行）
            ['blue', 'red'].forEach(team => {
              if (this.banTimers[team].running) {
                this.banTimers[team].paused = !this.isRunning;
              }
            });
          }
          // 控球变更阶段不减少 gameTime 和 shotClock
          break;
          
        case 'playing':
          this.gameTime = Math.max(0, this.gameTime - elapsed);
          this.shotClock = Math.max(0, this.shotClock - elapsed);

          // 修正倒计时音效播放逻辑
          const currentSecond = Math.floor(this.shotClock + 0.99);
          if (
            [3, 2, 1, 0].includes(currentSecond) &&
            this.lastCountdownSecond !== currentSecond
          ) {
            this.lastCountdownSecond = currentSecond;
            this.playSound(`countdown${currentSecond}`);
          }
          if (currentSecond > 3) {
            this.lastCountdownSecond = null;
          }

          if (this.shotClock <= 0) {
            this.currentPhase = 'possession';
            this.possessionTime = 10;
            if (!this.nextPossession) {
              this.nextPossession = this.currentPossession === 'red' ? 'blue' : 'red';
            }
          }

          if (this.gameTime <= 0) {
            this.endGame();
          }
          break;
      }
      
      this.updateDisplay();
    },
    
    updateDisplay() {
      // 更新显示逻辑已在computed中处理
    },
    
    formatTime(time) {
      if (typeof time !== 'number' || isNaN(time)) {
        time = 0;
      }
      const minutes = Math.floor(time / 60);
      const seconds = Math.floor(time % 60);
      const milliseconds = Math.floor((time % 1) * 1000);
      return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(milliseconds).padStart(3, '0')}`;
    },
    
    isTeamActive(team) {
      if (this.currentPhase === 'playing') {
        return this.currentPossession === team;
      } else if (this.currentPhase === 'possession') {
        return this.nextPossession === team;
      }
      return false;
    },
    
    // 游戏控制方法
    nextPhase() {
      if (this.currentPhase === 'setup') {
        this.setupTime = 0;
        this.currentPhase = 'possession';
        this.possessionTime = 10;
        if (!this.nextPossession) {
          this.nextPossession = 'red';
        }
        this.currentPossession = this.nextPossession;
        if (!this.isRunning) {
          this.startGame();
        }
      }
    },
    
    startGame() {
      if (!this.isRunning) {
        this.isRunning = true;
        this.lastUpdate = Date.now();
        // 比赛恢复，禁赛倒计时也恢复（如果不是控球变更阶段）
        if (this.currentPhase !== 'possession') {
          ['blue', 'red'].forEach(team => {
            if (this.banTimers[team].running) {
              this.banTimers[team].paused = false;
            }
          });
        }
      }
    },
    
    pauseGame() {
      this.isRunning = false;
      // 比赛暂停，禁赛倒计时也暂停
      ['blue', 'red'].forEach(team => {
        if (this.banTimers[team].running) {
          this.banTimers[team].paused = true;
        }
      });
    },
    
    foulPause() {
      this.isRunning = false;
      this.foulPauseActive = true;
      // 犯规暂停，禁赛倒计时也暂停
      ['blue', 'red'].forEach(team => {
        if (this.banTimers[team].running) {
          this.banTimers[team].paused = true;
        }
      });
    },
    
    // 得分方法
    addScore(team, points) {
      // 新增：罚球得分阶段允许三分/二分/扣篮得分
      if (
        this.penaltyScoringActive &&
        this.penaltyScoringTeam === team &&
        (points === 2 || points === 3 || points === 7)
      ) {
        this.scores[team] += points;
        this.roundScores[team][points] = (this.roundScores[team][points] || 0) + 1;
        let actionText;
        if (points === 3) actionText = "罚球命中(三分)";
        else if (points === 2) actionText = "罚球命中(二分)";
        else if (points === 7) actionText = "罚球命中(扣篮)";
        else actionText = `罚球命中(${points}分)`;
        this.addToHistory(team, {
          action: actionText,
          time: this.formatTime(this.gameTime)
        });
        // 不切换回合，不重置运球，不进入控球变更
        return;
      }
      if (this.currentPhase === 'playing' && this.isRunning && team === this.currentPossession) {
        this.scores[team] += points;
        this.roundScores[team][points] = (this.roundScores[team][points] || 0) + 1;
        let actionText;
        switch(points) {
          case 7: actionText = "扣篮"; break;
          case 3: actionText = "三分球"; break;
          case 2: actionText = "二分球"; break;
          default: actionText = `得${points}分`;
        }
        this.addToHistory(team, {
          action: actionText,
          time: this.formatTime(this.gameTime)
        });
        this.currentPhase = 'possession';
        this.possessionTime = 10;
        if (!this.nextPossession) {
          this.nextPossession = team === 'red' ? 'blue' : 'red';
        }
        this.resetDribbleCount();
        this.isRunning = false;
        // 新增：得分后禁赛倒计时也暂停
        ['blue', 'red'].forEach(t => {
          if (this.banTimers[t].running) {
            this.banTimers[t].paused = true;
          }
        });
        this.playSound('start');
        // 新增：若处于罚球得分阶段，结束罚球得分阶段
        if (this.penaltyScoringActive) {
          this.penaltyScoringActive = false;
          this.penaltyScoringTeam = null;
        }
      }
    },
    
    addDribbleScore(team) {
      if (this.currentPhase === 'playing' && this.isRunning && team === this.currentPossession && this.dribbleCount[team] < 2) {
        this.dribbleCount[team]++;
        this.scores[team] += 1;
        this.roundScores[team][1] = (this.roundScores[team][1] || 0) + 1;
        
        this.addToHistory(team, {
          action: "运球得分",
          time: this.formatTime(this.gameTime)
        });
      }
    },
    
    // 队伍回合控制
    startTeamRound(team) {
      if (this.penaltyActive) {
        if (this.penaltyTeam === team) {
          this.currentPhase = 'playing';
          this.currentPossession = team;
          this.nextPossession = null;
          if (!this.isRunning) {
            this.startGame();
          }
        } else {
          this.currentPhase = 'playing';
          this.currentPossession = team;
          this.nextPossession = null;
          this.shotClock = 20;
          this.lastUpdate = Date.now();
          if (!this.isRunning) {
            this.startGame();
          }
        }
        this.penaltyActive = false;
        this.penaltyTeam = null;
        // 新增：结束罚球得分阶段
        this.penaltyScoringActive = false;
        this.penaltyScoringTeam = null;
        return;
      }
      
      if (this.currentPhase === 'playing' || this.currentPhase === 'possession') {
        const needReset = this.currentPossession !== team;
        
        this.currentPhase = 'playing';
        this.currentPossession = team;
        this.nextPossession = null;
        
        if (needReset) {
          this.shotClock = 20;
          this.lastUpdate = Date.now();
        }
        
        if (!this.isRunning) {
          this.startGame();
        }
      }
    },
    
    // 控球变更，所有按钮都调用此方法
    startPossessionChange(triggerTeam) {
      // 修正：得分后（即currentPhase为'possession'且isRunning为false）也允许再次触发控球变更
      if (this.isPossessionChanging) return;
      // 如果当前已在控球变更阶段但未开始倒计时（即因得分后自动进入possession但未倒计时），允许再次触发
      if (this.currentPhase === 'possession' && this.isRunning === false) {
        // 重新开始控球变更倒计时
        this.isPossessionChanging = true;
        this.isRunning = false;
        this.currentPhase = 'possession';
        this.possessionTime = 10;
        this.nextPossession = triggerTeam === 'red' ? 'blue' : 'red';
        // 暂停所有禁赛倒计时
        ['blue', 'red'].forEach(team => {
          if (this.banTimers[team].running) {
            this.banTimers[team].paused = true;
          }
        });
        if (this.possessionTimer) clearInterval(this.possessionTimer);
        this.possessionTimer = setInterval(() => {
          if (this.possessionTime > 0) {
            this.possessionTime = Math.max(0, this.possessionTime - 0.05);
          }
          if (this.possessionTime <= 0) {
            clearInterval(this.possessionTimer);
            this.isPossessionChanging = false;
            this.currentPhase = 'playing';
            this.currentPossession = this.nextPossession;
            this.nextPossession = null;
            this.shotClock = 20;
            this.resetDribbleCount();
            // 恢复禁赛倒计时
            ['blue', 'red'].forEach(team => {
              if (this.banTimers[team].running) {
                this.banTimers[team].paused = false;
              }
            });
            this.isRunning = true;
            this.lastUpdate = Date.now();
          }
        }, 50);
        this.updateDisplay();
        return;
      }
      // 原有逻辑
      if (this.currentPhase === 'possession') return;

      // 进入控球变更阶段
      this.isPossessionChanging = true;
      this.isRunning = false // 控球变更期间比赛时钟暂停
      this.currentPhase = 'possession';
      this.possessionTime = 10;
      this.nextPossession = triggerTeam === 'red' ? 'blue' : 'red';

      // 暂停所有禁赛倒计时
      ['blue', 'red'].forEach(team => {
        if (this.banTimers[team].running) {
          this.banTimers[team].paused = true;
        }
      });

      // 启动控球变更倒计时（独立于主时钟）
      if (this.possessionTimer) clearInterval(this.possessionTimer);
      this.possessionTimer = setInterval(() => {
        if (this.possessionTime > 0) {
          this.possessionTime = Math.max(0, this.possessionTime - 0.05);
        }
        if (this.possessionTime <= 0) {
          clearInterval(this.possessionTimer);
          this.isPossessionChanging = false;
          this.currentPhase = 'playing';
          this.currentPossession = this.nextPossession;
          this.nextPossession = null;
          this.shotClock = 20;
          this.resetDribbleCount();
          // 恢复禁赛倒计时
          ['blue', 'red'].forEach(team => {
            if (this.banTimers[team].running) {
              this.banTimers[team].paused = false;
            }
          });
          this.isRunning = true;
          this.lastUpdate = Date.now();
        }
      }, 50);

      // 立即刷新显示
      this.updateDisplay();
    },
    
    // 犯规相关
    recordFoul(team, foulType) {
      this.isRunning = false;

      // 新增：犯规时禁赛倒计时也暂停
      ['blue', 'red'].forEach(t => {
        if (this.banTimers[t].running) {
          this.banTimers[t].paused = true;
        }
      });

      this.foulHistory[team].push({
        action: foulType,
        time: this.formatTime(this.gameTime)
      });

      if (foulType === '罚球') {
        this.penaltyActive = true;
        this.penaltyTeam = team;
        // 新增：允许罚球得分
        this.penaltyScoringActive = true;
        this.penaltyScoringTeam = team;
      }

      this.foulPauseActive = false;
    },
    
    startBanTimer(team, seconds) {
      if (this.banTimers[team].timer) {
        clearInterval(this.banTimers[team].timer);
      }

      // 新增：记录禁赛行为到犯规历史
      let actionText = seconds === 15 ? '禁赛15s' : (seconds === 30 ? '禁赛30s' : `禁赛${seconds}s`);
      this.foulHistory[team].push({
        action: actionText,
        time: this.formatTime(this.gameTime)
      });

      this.banTimers[team].running = true;
      this.banTimers[team].remain = seconds;
      // 控球变更阶段或比赛暂停时暂停禁赛倒计时
      this.banTimers[team].paused = !this.isRunning || this.currentPhase === 'possession';

      this.banTimers[team].timer = setInterval(() => {
        if (this.banTimers[team].paused) return;
        
        this.banTimers[team].remain -= 0.02;
        if (this.banTimers[team].remain <= 0) {
          clearInterval(this.banTimers[team].timer);
          this.banTimers[team].running = false;
          this.banTimers[team].timer = null;
          this.banTimers[team].remain = 0; // 修正：归零
          this.playSound('banEnd');
        }
      }, 20);
    },
    
    // 历史记录
    addToHistory(team, entry) {
      this.history[team].push(entry);
    },
    
    clearHistory() {
      this.history.blue = [];
      this.history.red = [];
    },
    
    clearFoulHistory() {
      this.foulHistory.blue = [];
      this.foulHistory.red = [];
    },
    
    clearBanTimers() {
      ['blue', 'red'].forEach(team => {
        if (this.banTimers[team].timer) {
          clearInterval(this.banTimers[team].timer);
        }
        this.banTimers[team] = { running: false, remain: 0, paused: false, timer: null };
      });
    },
    
    resetDribbleCount() {
      this.dribbleCount.red = 0;
      this.dribbleCount.blue = 0;
    },
    
    // 游戏模式
    setGameMode(mode) {
      if (this.currentMode !== mode) {
        this.isRunning = false;
        this.currentMode = mode;
        this.gameTime = this.gameModes[mode];
        this.resetGame();
      }
    },
    
    // 设置相关
    toggleSound() {
      this.soundEnabled = !this.soundEnabled;
    },
    
    forceRestart() {
      this.resetAll();
      uni.showToast({
        title: '系统已重启！',
        icon: 'success'
      });
    },
    
    showTeamNameDialog() {
      uni.showModal({
        title: '队伍名称设置',
        content: '请输入队伍名称',
        editable: true,
        placeholderText: '蓝队名称,红队名称',
        success: (res) => {
          if (res.confirm && res.content) {
            const names = res.content.split(',');
            if (names.length >= 2) {
              this.teamNames.blue = names[0].trim();
              this.teamNames.red = names[1].trim();
            }
          }
        }
      });
    },
    
    // 声音播放
    playSound(type) {
      if (!this.soundEnabled) return;

      // 修正：倒计时音效直接播放对应音频文件，避免拖延和重叠
      if (type.startsWith('countdown')) {
        let sec = type.replace('countdown', '');
        if (['3', '2', '1', '0'].includes(sec)) {
          const audio = uni.createInnerAudioContext ? uni.createInnerAudioContext() : new Audio();
          audio.src = `/static/${sec}.mp3`; // 修正此处路径
          audio.play();
          // 自动销毁
          audio.onEnded && audio.onEnded(() => { audio.destroy && audio.destroy(); });
          audio.onError && audio.onError(() => { audio.destroy && audio.destroy(); });
          return;
        }
      }

      // 其他音效仍走原有逻辑
      if (this.$audio && typeof this.$audio.play === 'function') {
        this.$audio.play(type);
      }
    },
    
    // 游戏结束
    endGame() {
      this.isRunning = false;
      this.currentPhase = 'setup';
      uni.showModal({
        title: '比赛结束',
        content: '比赛时间已到！',
        showCancel: false
      });
    },
    
    // 清理定时器
    clearAllTimers() {
      if (this.gameTimer) clearInterval(this.gameTimer);
      if (this.possessionTimer) clearInterval(this.possessionTimer);
      this.clearBanTimers();
    }
  }
}
</script>

<style>
/* 根样式 */
page {
  background-color: #4a5568;
  color: white;
  font-family: Arial, sans-serif;
  width: 100vw;
  height: 100vh;
  overflow-x: hidden;
}

.container {
  background-color: #4a5568;
  color: white;
  font-family: Arial, sans-serif;
  padding: 8px;
  width: 100vw;
  height: 100vh;
  overflow-x: hidden;
  overflow-y: auto;
}

/* 头部区域 */
.header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 10px;
  width: 100%;
  flex-wrap: nowrap;
  position: relative; /* 使college-logo绝对定位于header内 */
}

.logo {
  height: 54px;
  display: flex;
  align-items: center;
  margin-top: 5px;
}

.logo image {
  height: 100%;
  width: auto;
}

.settings {
  display: flex;
  gap: 10px;
  margin-top: 5px;
  flex-wrap: nowrap;
  align-items: center;
}

.sound-toggle-btn, .control-btn {
  padding: 8px 15px;
  border-radius: 5px;
  border: none;
  font-weight: bold;
  transition: all 0.2s;
  background-color: #718096;
  color: white;
  /* 新增：高度与“强制重启”按钮一致 */
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.sound-toggle-btn.active {
  background-color: #48bb78;
}

.restart-btn {
  background-color: #e53e3e !important;
  color: #fff !important;
  border: none !important;
}

.team-name-btn {
  background-color: #4a5568;
}

/* 学院图标样式 */
.college-logo {
  position: absolute;
  top: 8px;
  left: 8px;
  width: 48px;
  height: 48px;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
}
.college-logo image {
  width: 100%;
  height: 100%;
  display: block;
}

/* robocon 图标容器和样式（无红框，放大，紧挨学院图标） */
.robocon-icons {
  position: absolute;
  top: 8px;
  left: 64px; /* 紧挨学院图标右侧，间隔约8px */
  display: flex;
  flex-direction: row;
  gap: 12px;
  z-index: 10;
  height: 48px;
  align-items: center;
}
.robocon-icon {
  width: 48px;
  height: 48px;
  border-radius: 10px;
  /* 去掉红框 */
  border: none;
  background: #fff;
  object-fit: contain;
  box-sizing: border-box;
  /* 可选：加阴影让图标更突出 */
  box-shadow: 0 2px 8px rgba(0,0,0,0.10);
}

/* 游戏模式选择 */
.mode-selection {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px; /* 与控制按钮间隔一致 */
  margin: 0 auto 8px auto;
  padding: 0;
  flex-wrap: nowrap;
}

.mode-btn {
  padding: 7px 22px;
  border: none;
  border-radius: 5px 5px 0 0;
  font-size: 16px;
  font-weight: bold;
  color: white;
  transition: all 0.2s;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  margin: 0;
}

.mode-btn.group {
  background-color: #4299e1;
}

.mode-btn.elimination {
  background-color: #ed8936;
}

.mode-btn.active {
  box-shadow: 0 0 15px #fff, 0 0 20px #fff;
  border: 2px solid white;
  font-weight: bolder;
  z-index: 1;
}

/* 计时器区域 */
.timer-section {
  text-align: center;
  margin-bottom: 15px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 10px;
  padding: 10px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.phase-text {
  font-size: 24px;
  margin-bottom: 5px;
  font-weight: bold;
  text-shadow: 1px 1px 3px rgba(0, 0, 0, 0.5);
  padding: 5px 20px;
  border-radius: 5px;
}

.phase-text.setup {
  background-color: rgba(72, 187, 120, 0.8);
}

.phase-text.red {
  background-color: rgba(245, 101, 101, 0.8);
}

.phase-text.blue {
  background-color: rgba(11, 197, 234, 0.8);
}

.main-timer {
  font-size: 46px;
  margin-bottom: 10px;
  background: rgba(0, 0, 0, 0.6);
  border-radius: 8px;
  padding: 5px 15px;
  display: inline-block;
  box-shadow: inset 0 0 10px rgba(0, 0, 0, 0.5);
  color: #4fd1ea;
  letter-spacing: 2px;
  text-shadow: 0 0 10px rgba(79, 209, 234, 0.5);
}

.control-buttons {
  display: flex;
  justify-content: center;
  gap: 8px;
  margin-bottom: 10px;
  flex-wrap: nowrap;
  overflow-x: auto;
}

.control-btn {
  padding: 8px 15px;
  border-radius: 5px;
  border: none;
  font-weight: bold;
  transition: all 0.2s;
  background-color: #718096;
  color: white;
  margin: 2px;
  white-space: nowrap;
  min-width: fit-content;
}

.start-btn {
  background-color: #48bb78;
}

.pause-btn {
  background-color: #f6ad55;
}

.reset-btn {
  background-color: #e53e3e;
}

.foul-pause-btn {
  background-color: #2d3748;
}

/* 控球变更倒计时样式 */
.possession-timer {
  text-align: center;
  font-size: 28px;
  color: #4299e1;
  font-weight: bold;
  margin: 8px 0 4px 0;
  background: rgba(66, 153, 225, 0.12);
  border-radius: 6px;
  padding: 4px 0;
  letter-spacing: 2px;
  text-shadow: 0 0 8px #fff, 0 0 4px #4299e1;
}

/* 控球变更倒计时样式 */
.possession-timer-highlight {
  text-align: center;
  font-size: 30px;
  font-weight: bold;
  color: #fff;
  margin: 10px 0 10px 0;
  letter-spacing: 2px;
  background: none;
  border-radius: 8px;
  padding: 0;
  line-height: 1.2;
}

/* 游戏区域 - 水平布局 */
.game-area {
  display: flex;
  justify-content: flex-start;
  align-items: flex-start;
  margin-bottom: 0;
  flex-wrap: nowrap;
  width: 100%;
  min-width: 0; /* 修正：允许自适应，避免内容被裁剪 */
  overflow-x: auto;
  box-sizing: border-box;
}

/* 防止子元素被压缩，保证横向排列 */
.team-section,
.foul-panel,
.court-area {
  flex-shrink: 0;
}

/* 队伍区域 */
.team-section {
  width: 280px;
  min-width: 280px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  border-radius: 10px;
  margin: 4px;
  height: fit-content;
}

.team-blue {
  background-color: #0bc5ea;
}

.team-red {
  background-color: #f56565;
}

@keyframes blink {
  0% { opacity: 1; }
  50% { opacity: 0.7; }
  100% { opacity: 1; }
}

.team-name {
  font-size: 28px;
  margin-bottom: 10px;
  font-weight: bold;
}

.team-score {
  font-size: 54px;
  margin-bottom: 10px;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
}

.timer-display {
  background-color: white;
  color: black;
  padding: 5px 15px;
  border-radius: 5px;
  margin-bottom: 5px;
  font-size: 22px;
  font-weight: bold;
  box-shadow: inset 0 0 5px rgba(0, 0, 0, 0.2);
}

.team-section .control-btn {
  margin: 3px 0;
  width: 90%;
}

.possession-change-btn {
  background-color: #4299e1;
  margin-bottom: 8px;
}

/* 得分面板 */
.score-panel {
  width: 100%;
  background-color: rgba(0, 0, 0, 0.3);
  border-radius: 8px;
  padding: 8px;
  margin-top: 10px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
  box-sizing: border-box;
}

.score-panel-red {
  background: linear-gradient(135deg, rgba(245, 101, 101, 0.8), rgba(229, 62, 62, 0.6));
}

.score-panel-blue {
  background: linear-gradient(135deg, rgba(66, 153, 225, 0.8), rgba(49, 130, 206, 0.6));
}

.panel-header {
  text-align: center;
  font-weight: bold;
  padding: 5px;
  border-radius: 4px;
  margin-bottom: 8px;
  font-size: 16px;
  background-color: rgba(255, 255, 255, 0.2);
  color: white;
}

.score-buttons {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  width: 100%;
  box-sizing: border-box;
}

.score-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 0;
  height: 54px;
  border: none;
  border-radius: 10px;
  font-weight: bold;
  font-size: 18px;
  color: #2d3748;
  background: #fff;
  box-shadow: none;
  margin: 0;
  transition: background 0.2s;
  position: relative;
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
}

.score-btn .icon,
.score-btn text.icon {
  font-size: 26px;
  margin-bottom: 2px;
  display: block;
  text-align: center;
}

.score-btn.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.dunk-btn {
  background: #ffe0e0;
  grid-column: 1 / -1;
}

.three-pointer-btn {
  background: #c6e6fa;
}

.two-pointer-btn {
  background: #e2e8f0;
}

.dribble-btn {
  background: #ffeabf;
  grid-column: 1 / -1;
  position: relative;
}

.dribble-counter {
  position: absolute;
  right: 10px;
  /* 原为 top: 8px;，改为上下居中 */
  top: 50%;
  transform: translateY(-50%);
  background: #e2d6c2;
  color: #444;
  border-radius: 12px;
  padding: 2px 10px;
  font-size: 16px;
  font-weight: bold;
  min-width: 32px;
  text-align: center;
  box-shadow: none;
}

/* 历史记录 */
.history-section {
  width: 100%;
  height: 180px;
  margin-top: 10px;
}

.history-header {
  display: flex;
  justify-content: center;
  padding: 0 10px 5px 10px;
  border-bottom: 1px solid #ccc;
  font-weight: bold;
}

.history-header text {
  flex: 1;
  text-align: center;
}

.history-content {
  height: calc(100% - 30px);
}

.history-entry {
  display: flex;
  justify-content: center;
  padding: 5px 10px;
}

.history-entry text {
  flex: 1;
  text-align: center;
}

/* 犯规面板 */
.foul-panel {
  width: 220px;
  min-width: 220px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  border-radius: 8px;
  margin: 8px 4px 0 0;
  padding: 8px;
  height: fit-content;
}

.foul-panel-blue {
  background: rgba(11, 197, 234, 0.15);
}

.foul-panel-red {
  background: rgba(245, 101, 101, 0.15);
}

.foul-panel-title {
  font-size: 20px;
  font-weight: bold;
  margin-bottom: 6px;
  white-space: nowrap;
}

.foul-panel-blue .foul-panel-title {
  color: #0bc5ea;
}

.foul-panel-red .foul-panel-title {
  color: #f56565;
}

.foul-section {
  width: 100%;
  margin-bottom: 8px;
  /* 新增以下两行，使禁赛倒计时等内容居中 */
  display: flex;
  flex-direction: column;
  align-items: center;
}

.foul-section-title {
  font-weight: bold;
  margin-bottom: 4px;
}

.foul-panel-blue .foul-section-title {
  color: #0bc5ea;
}

.foul-panel-red .foul-section-title {
  color: #f56565;
}

.foul-btn {
  width: 90%;
  margin-bottom: 4px;
  white-space: nowrap;
  padding: 4px 10px;
  font-size: 14px;
  border: 2px solid;
  border-radius: 5px;
  background: white;
  font-weight: bold;
}

.blue-foul {
  color: #0bc5ea;
  border-color: #0bc5ea;
}

.red-foul {
  color: #f56565;
  border-color: #f56565;
}

.penalty-btn {
  color: #0bc5ea;
  border-color: #0bc5ea;
}

.foul-panel-red .penalty-btn {
  color: #f56565;
  border-color: #f56565;
}

.ban-btn {
  color: #0bc5ea;
  border-color: #0bc5ea;
}

.foul-panel-red .ban-btn {
  color: #f56565;
  border-color: #f56565;
}

.possession-change-btn {
  background: #4299e1;
  color: white;
  border: none;
}

.foul-panel-red .possession-change-btn {
  background: #f56565;
}

.divider {
  width: 90%;
  height: 1px;
  background: #fff;
  margin: 4px 0 8px 0;
}

.ban-timer-display {
  background: white;
  border: 2px solid;
  border-radius: 5px;
  display: inline-block;
  margin-bottom: 4px;
  font-size: 14px;
  font-weight: bold;
  box-shadow: inset 0 0 5px rgba(0, 0, 0, 0.2);
  text-align: center;
  width: 90%;
  height: 32px;
  line-height: 32px;
  padding: 0;
  /* 保证自身居中 */
  margin-left: auto;
  margin-right: auto;
}

.foul-panel-blue .ban-timer-display {
  color: #0bc5ea;
  border-color: #0bc5ea;
}

.foul-panel-red .ban-timer-display {
  color: #f56565;
  border-color: #f56565;
}

.foul-history-section {
  width: 100%;
  margin-top: 8px;
}

.foul-history-content {
  height: 100px;
}

/* 球场区域 */
.court-area {
  /* flex: 1;  移除，避免拉伸 */
  margin: 0 20px;
  position: relative;
  min-width: 600px; /* 适当加宽，保证图片显示 */
  max-width: 800px;
  width: 700px;      /* 固定宽度，适配场地图片比例 */
  height: 420px;     /* 固定高度，适配场地图片比例 */
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center; /* 新增：垂直居中 */
  box-sizing: border-box;
  background: rgba(0,0,0,0.08); /* 可选：微弱背景 */
}

.phase-timer {
  text-align: center;
  font-size: 32px;
  color: white;
  font-weight: bold;
  text-shadow: 1px 1px 3px rgba(0, 0, 0, 0.3);
  padding: 5px 15px;
  position: absolute;
  width: 100%;
  top: -15px;
  background-color: rgba(66, 153, 225, 0.8);
  border-radius: 5px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  animation: pulse 1s infinite alternate;
}

@keyframes pulse {
  from { opacity: 0.8; }
  to { opacity: 1; }
}

.court-container {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  margin-top: 0; /* 移除原有 margin-top */
}

.court-image {
  max-width: 100%;
  max-height: 100%;
  width: auto;
  height: auto;
  display: block;
  background: none;
  border-radius: 10px;
  border: 2px solid #4a5568;
  box-shadow: 0 6px 12px rgba(0, 0, 0, 0.2);
  /* 移除原有的 padding/background-size 等 */
}

/* 横屏模式下的特殊优化 */
@media screen and (orientation: landscape) {
  .container {
    padding: 4px;
  }
  
  .header {
    margin-bottom: 5px;
  }
  
  .timer-section {
    margin-bottom: 10px;
    padding: 8px;
  }
  
  .team-section {
    padding: 8px;
    margin: 2px;
  }
  
  .foul-panel {
    padding: 6px;
    margin: 4px 2px 0 0;
  }
  
  .court-area {
    margin: 0 10px;
  }
  
  .score-btn {
    height: 45px;
    font-size: 11px;
  }
  
  .history-section {
    height: 100px;
  }
  
  .foul-history-content {
    height: 60px;
  }
  
  .team-name {
    font-size: 20px;
  }
  
  .team-score {
    font-size: 42px;
  }
  
  .timer-display {
    font-size: 18px;
  }
  
  .main-timer {
    font-size: 36px;
  }
  
  .phase-text {
    font-size: 18px;
  }
  
  .team-name {
    font-size: 20px;
  }
  
  .team-score {
    font-size: 42px;
  }
  
  .timer-display {
    font-size: 18px;
  }
  
  .main-timer {
    font-size: 36px;
  }
  
  .phase-text {
    font-size: 18px;
  }
  
  .control-btn {
    padding: 6px 12px;
    font-size: 14px;
  }
  
  .mode-btn {
    padding: 6px 12px;
    font-size: 14px;
  }
  
  .foul-btn {
    padding: 3px 8px;
    font-size: 12px;
  }
  
  .ban-timer-display {
    height: 28px;
    line-height: 28px;
    font-size: 12px;

  font-size: 12px;
  }
}
</style>
