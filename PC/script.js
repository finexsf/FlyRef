class RefereeSystem {
    constructor() {
        this.gameModes = {
            '小组循环赛': 160,
            '淘汰赛': 240
        };
        
        // 设置默认为小组循环赛
        this.gameTime = this.gameModes['小组循环赛'];
        this.defaultSetupTime = 60;
        this.setupTime = this.defaultSetupTime;
        this.shotClock = 20;
        this.possessionTime = 5;
        
        this.scores = {
            blue: 0,
            red: 0
        };
        this.teamNames = {
            blue: 'Blue',
            red: 'Red'
        };
        this.currentPhase = 'setup';
        this.currentPossession = 'red';
        this.isRunning = false;
        this.last_update = null;
        this.roundStartTime = 0;
        this.roundScores = {
            red: { 2: 0, 3: 0, 7: 0 },
            blue: { 2: 0, 3: 0, 7: 0 }
        };
        this.nextPossession = null;
        this.nextPossessionRequested = null;
        this.setupPossessionTime = 5;  // 准备阶段结束后的占有时间
        this.roundPossessionTime = 10;  // 回合之间的占有时间

        // 修改音频元素引用
        this.roundStartSound = document.getElementById('roundStartSound');
        this.countdown3Sound = document.getElementById('countdown3Sound');
        this.countdown2Sound = document.getElementById('countdown2Sound');
        this.countdown1Sound = document.getElementById('countdown1Sound');
        this.countdown0Sound = document.getElementById('countdown0Sound');
        this.banEndSound = document.getElementById('banEndSound'); // 新增禁赛结束音效
        this.lastPlayedSecond = null;  // 记录上次播放的秒数

        // 简化为单一声音设置
        this.soundEnabled = true;

        this.currentMode = '小组循环赛';  // 添加当前模式变量

        // 添加犯规记录
        this.fouls = {
            blue: 0,
            red: 0
        };

        this.currentFoulTeam = null; // 记录当前选择犯规的队伍

        this.isInPossessionChange = false; // 标记是否处于控球变更倒计时
        
        // 设置固定的控球变更时间为10秒（移除原有的分别设置）
        this.possessionChangeTime = 10;
        
        // 移除不同阶段的占有时间区分，统一使用10秒

        // 新增：犯规历史记录
        this.foulHistory = {
            blue: [],
            red: []
        };
        // 控球变更倒计时相关
        this.isPossessionChanging = false;
        this.possessionChangeCountdown = 10;
        this.possessionChangeTimer = null;

        // 新增：禁赛倒计时管理
        this.banTimers = {
            blue: { running: false, remain: 0, paused: false, timer: null },
            red: { running: false, remain: 0, paused: false, timer: null }
        };

        // 初始化显示
        this.updateDisplay();
        this.bindControls();
        this.formatTime = this.formatTime.bind(this);
        
        // 添加运球得分次数限制 - 在构造函数中初始化
        this.dribbleCount = {
            red: 0,
            blue: 0
        };

        this.foulPauseActive = false; // 新增：标记是否已点击犯规暂停

        // 新增：罚球状态标志
        this.penaltyActive = false;
        this.penaltyTeam = null;
    }

    bindControls() {
        // 绑定声音总开关按钮
        const soundToggleBtn = document.querySelector('.sound-toggle-btn');
        if (soundToggleBtn) {
            soundToggleBtn.addEventListener('click', () => {
                this.soundEnabled = !this.soundEnabled;
                soundToggleBtn.classList.toggle('active');
                const icon = soundToggleBtn.querySelector('i');
                icon.className = this.soundEnabled ? 'fas fa-volume-up' : 'fas fa-volume-mute';
            });
        }

        // 强制重启按钮
        const forceRestartButton = document.querySelector('.settings .control-btn:nth-child(2)');
        forceRestartButton.addEventListener('click', () => {
            this.forceRestart();
        });

        // 队伍名称按钮
        const teamNameButton = document.querySelector('.settings .control-btn:nth-child(3)');
        teamNameButton.addEventListener('click', () => {
            this.showTeamNameDialog();
        });
        
        // 绑定游戏模式按钮
        const groupModeBtn = document.querySelector('.mode-btn.group');
        const eliminationModeBtn = document.querySelector('.mode-btn.elimination');
        
        groupModeBtn.addEventListener('click', () => {
            this.setGameMode('小组循环赛', groupModeBtn, eliminationModeBtn);
        });
        
        eliminationModeBtn.addEventListener('click', () => {
            this.setGameMode('淘汰赛', eliminationModeBtn, groupModeBtn);
        });
        
        // 按钮点击前统一判断是否处于控球变更倒计时
        const blockIfPossessionChanging = () => this.isPossessionChanging;

        // 下一个按钮（跳过准备阶段）
        const skipButton = document.querySelector('.control-buttons button:nth-child(1)');
        skipButton.addEventListener('click', () => {
            if (blockIfPossessionChanging()) return;
            if (this.currentPhase === 'setup') {
                this.setupTime = 0;
                this.currentPhase = 'possession';
                this.possessionTime = this.possessionChangeTime; // 使用统一的10秒
                // 如果没有预设的下一回合，默认设置为红队
                if (!this.nextPossession) {
                    this.nextPossession = 'red';
                }
                // 确保当前回合和下一回合显示一致
                this.currentPossession = this.nextPossession;
                
                if (!this.isRunning) {
                    this.start();
                }
                this.updateDisplay();
            }
        });

        // 开始按钮
        const startButton = document.querySelector('.control-buttons button:nth-child(2)');
        startButton.addEventListener('click', () => {
            if (blockIfPossessionChanging()) return;
            if (!this.isRunning) {
                this.start();
            }
        });

        // 暂停按钮
        const pauseButton = document.querySelector('.control-buttons button:nth-child(3)');
        pauseButton.addEventListener('click', () => {
            if (blockIfPossessionChanging()) return;
            if (this.isRunning) {
                this.isRunning = false;
                // 比赛时钟暂停，禁赛倒计时也暂停
                this.banTimers.blue.paused = true;
                this.banTimers.red.paused = true;
            } else if (this.currentPhase !== 'setup') {
                this.isRunning = true;
                // 比赛时钟恢复，禁赛倒计时也恢复
                this.banTimers.blue.paused = false;
                this.banTimers.red.paused = false;
                this.last_update = Date.now()
                this.updateTimer();
            }
        });

        // 重置按钮
        const resetButton = document.querySelector('.control-buttons button:nth-child(4)');
        resetButton.addEventListener('click', () => {
            if (blockIfPossessionChanging()) return;
            this.reset();
        });

        // 犯规暂停按钮事件绑定
        const foulPauseBtn = document.querySelector('.control-buttons .control-btn:nth-child(5)');
        if (foulPauseBtn) {
            foulPauseBtn.addEventListener('click', () => {
                if (blockIfPossessionChanging()) return;
                this.isRunning = false;
                this.foulPauseActive = true; // 标记已点击犯规暂停
            });
        }

        // 得分按钮事件绑定
        document.querySelectorAll('.score-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                if (blockIfPossessionChanging()) return;
                const team = btn.getAttribute('data-team');
                const points = parseInt(btn.getAttribute('data-points'));
                
                // 检查是否是当前队伍的回合
                if (this.currentPhase !== 'playing' || team !== this.currentPossession) {
                    return;
                }
                
                // 处理运球得分特殊情况
                if (points === 1) { // 运球得分
                    if (this.dribbleCount[team] < 2) {
                        this.addDribbleScore(team);
                        this.updateDribbleCounter(team);
                    }
                } else {
                    // 其他得分类型
                    this.addScore(team, points);
                }
            });
        });
        
        // 左侧（蓝队）按钮
        const blueStartButton = document.querySelector('.team-blue .control-btn');
        if (blueStartButton) {
            blueStartButton.addEventListener('click', () => {
                if (blockIfPossessionChanging()) return;
                // 新增：罚球状态处理
                if (this.penaltyActive) {
                    if (this.penaltyTeam === 'blue') {
                        // 蓝队罚球，继续蓝队剩余倒计时
                        this.currentPhase = 'playing';
                        this.currentPossession = 'blue';
                        this.nextPossession = null;
                        // 不重置shotClock
                        if (!this.isRunning) {
                            this.isRunning = true;
                            this.last_update = Date.now();
                            this.updateTimer();
                        }
                        this.updateDisplay();
                    } else {
                        // 红队罚球，切换到蓝队并重置shotClock
                        this.currentPhase = 'playing';
                        this.currentPossession = 'blue';
                        this.nextPossession = null;
                        this.shotClock = 20;
                        this.roundStartTime = Date.now();
                        if (!this.isRunning) {
                            this.isRunning = true;
                            this.last_update = Date.now();
                            this.updateTimer();
                        }
                        this.updateDisplay();
                    }
                    // 清除罚球状态
                    this.penaltyActive = false;
                    this.penaltyTeam = null;
                    return;
                }
                if (this.currentPhase === 'playing' || this.currentPhase === 'possession') {
                    // 如果当前不是蓝队回合，则重置计时器
                    const needReset = this.currentPossession !== 'blue';
                    
                    this.currentPhase = 'playing';
                    this.currentPossession = 'blue';
                    this.nextPossession = null;  // 清除预设的下一回合
                    
                    // 如果是从其他队伍切换过来，重置计时器
                    if (needReset) {
                        this.shotClock = 20;
                        this.roundStartTime = Date.now();
                    }
                    
                    // 如果游戏暂停，则重新开始
                    if (!this.isRunning) {
                        this.isRunning = true;
                        this.last_update = Date.now();
                        this.updateTimer();
                    }
                    
                    this.updateDisplay();
                }
            });
        }

        // 右侧（红队）按钮
        const redStartButton = document.querySelector('.team-red .control-btn');
        if (redStartButton) {
            redStartButton.addEventListener('click', () => {
                if (blockIfPossessionChanging()) return;
                // 新增：罚球状态处理
                if (this.penaltyActive) {
                    if (this.penaltyTeam === 'red') {
                        // 红队罚球，继续红队剩余倒计时
                        this.currentPhase = 'playing';
                        this.currentPossession = 'red';
                        this.nextPossession = null;
                        // 不重置shotClock
                        if (!this.isRunning) {
                            this.isRunning = true;
                            this.last_update = Date.now();
                            this.updateTimer();
                        }
                        this.updateDisplay();
                    } else {
                        // 蓝队罚球，切换到红队并重置shotClock
                        this.currentPhase = 'playing';
                        this.currentPossession = 'red';
                        this.nextPossession = null;
                        this.shotClock = 20;
                        this.roundStartTime = Date.now();
                        if (!this.isRunning) {
                            this.isRunning = true;
                            this.last_update = Date.now();
                            this.updateTimer();
                        }
                        this.updateDisplay();
                    }
                    // 清除罚球状态
                    this.penaltyActive = false;
                    this.penaltyTeam = null;
                    return;
                }
                if (this.currentPhase === 'playing' || this.currentPhase === 'possession') {
                    // 如果当前不是红队回合，则重置计时器
                    const needReset = this.currentPossession !== 'red';
                    
                    this.currentPhase = 'playing';
                    this.currentPossession = 'red';
                    this.nextPossession = null;  // 清除预设的下一回合
                    
                    // 如果是从其他队伍切换过来，重置计时器
                    if (needReset) {
                        this.shotClock = 20;
                        this.roundStartTime = Date.now();
                    }
                    
                    // 如果游戏暂停，则重新开始
                    if (!this.isRunning) {
                        this.isRunning = true;
                        this.last_update = Date.now();
                        this.updateTimer();
                    }
                    
                    this.updateDisplay();
                }
            });
        }

        // 犯规面板按钮事件绑定
        document.querySelectorAll('.offense-foul-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                if (blockIfPossessionChanging()) return;
                // 移除点击犯规暂停限制
                const team = btn.getAttribute('data-team');
                this.recordFoulPanel(team, '攻方犯规');
                this.foulPauseActive = false;
            });
        });
        document.querySelectorAll('.defense-foul-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                if (blockIfPossessionChanging()) return;
                // 移除点击犯规暂停限制
                const team = btn.getAttribute('data-team');
                this.recordFoulPanel(team, '守方犯规');
                this.foulPauseActive = false;
            });
        });
        document.querySelectorAll('.possession-change-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                if (blockIfPossessionChanging()) return;
                // 移除点击犯规暂停限制
                const team = btn.getAttribute('data-team');
                this.startPossessionChange(team);
                this.foulPauseActive = false;
            });
        });

        document.querySelectorAll('.blue-foul').forEach(btn => {
            btn.addEventListener('click', () => {
                if (blockIfPossessionChanging()) return;
                // 新增：点击时暂停比赛时钟
                this.isRunning = false;
                const action = btn.getAttribute('data-action') || '蓝方犯规';
                this.recordFoulPanel('blue', action);
                this.foulPauseActive = false;
            });
        });
        document.querySelectorAll('.red-foul').forEach(btn => {
            btn.addEventListener('click', () => {
                if (blockIfPossessionChanging()) return;
                // 新增：点击时暂停比赛时钟和禁赛倒计时
                this.isRunning = false;
                this.banTimers.red.paused = true;
                this.banTimers.blue.paused = true;
                const action = btn.getAttribute('data-action') || '红方犯规';
                this.recordFoulPanel('red', action);
                this.foulPauseActive = false;
            });
        });

        document.querySelectorAll('.blue-penalty-btn, .blue-ban15-btn, .blue-ban30-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                if (blockIfPossessionChanging()) return;
                // 移除点击犯规暂停限制
                const action = btn.getAttribute('data-action');
                this.recordFoulPanel('blue', action);
                // 新增：如果是罚球，设置罚球状态并暂停比赛时钟
                if (action === '罚球') {
                    this.penaltyActive = true;
                    this.penaltyTeam = 'blue';
                    this.isRunning = false;
                } else if (action === '禁赛15s') {
                    this.startBanTimer('blue', 15); // 立即开始15秒倒计时
                } else if (action === '禁赛30s') {
                    this.startBanTimer('blue', 30); // 立即开始30秒倒计时
                }
                this.foulPauseActive = false;
            });
        });
        document.querySelectorAll('.red-penalty-btn, .red-ban15-btn, .red-ban30-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                if (blockIfPossessionChanging()) return;
                // 移除点击犯规暂停限制
                const action = btn.getAttribute('data-action');
                this.recordFoulPanel('red', action);
                // 新增：如果是罚球，设置罚球状态并暂停比赛时钟
                if (action === '罚球') {
                    this.penaltyActive = true;
                    this.penaltyTeam = 'red';
                    this.isRunning = false;
                } else if (action === '禁赛15s') {
                    this.startBanTimer('red', 15); // 立即开始15秒倒计时
                } else if (action === '禁赛30s') {
                    this.startBanTimer('red', 30); // 立即开始30秒倒计时
                }
                this.foulPauseActive = false;
            });
        });
        
        // 队伍面板下控球变更按钮事件绑定
        document.querySelectorAll('.team-section.team-blue .possession-change-trigger').forEach(btn => {
            btn.addEventListener('click', () => {
                if (blockIfPossessionChanging()) return;
                this.startPossessionChange('blue');
            });
        });
        document.querySelectorAll('.team-section.team-red .possession-change-trigger').forEach(btn => {
            btn.addEventListener('click', () => {
                if (blockIfPossessionChanging()) return;
                this.startPossessionChange('red');
            });
        });
    }
    
    // 设置游戏模式
    setGameMode(mode, activeBtn, inactiveBtn) {
        // 如果不是同一个模式，才执行重置
        if (this.currentMode !== mode) {
            // 停止所有计时器
            this.isRunning = false;
            
            // 更新模式
            this.currentMode = mode;
            this.gameTime = this.gameModes[mode];
            
            // 重置所有状态
            this.setupTime = this.defaultSetupTime;
            this.possessionTime = 5;
            this.shotClock = 20;
            this.scores = { blue: 0, red: 0 };
            this.currentPhase = 'setup';
            this.currentPossession = 'red';
            this.roundScores = {
                red: { 2: 0, 3: 0, 7: 0 },
                blue: { 2: 0, 3: 0, 7: 0 }
            };
            this.nextPossession = null;
            this.nextPossessionRequested = null;

            // 清空历史记录
            document.querySelectorAll('.history-section .history-content').forEach(div => {
                div.innerHTML = '';
            });

            this.foulHistory = { blue: [], red: [] };
            this.updateFoulHistory('blue');
            this.updateFoulHistory('red');
        } else {
            // 如果是相同模式，只更新模式数据
            this.currentMode = mode;
            this.gameTime = this.gameModes[mode];
        }
        
        // 更新按钮状态 - 使用高亮效果
        activeBtn.classList.add('active');
        inactiveBtn.classList.remove('active');
        
        // 更新显示
        this.updateDisplay();
    }

    // 显示队伍名称对话框
    showTeamNameDialog() {
        // 创建设置对话框
        const dialog = document.createElement('div');
        dialog.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: white;
            padding: 20px;
            border-radius: 10px;
            z-index: 1000;
            min-width: 300px;
            box-shadow: 0 0 10px rgba(0,0,0,0.5);
        `;

        // 添加队伍名称设置
        const nameSection = document.createElement('div');
        nameSection.innerHTML = `
            <h3 style="color: black;">队伍名称</h3>
            <div style="margin: 10px 0;">
                <label style="color: black;">蓝队名称：</label>
                <input type="text" id="blueTeamName" value="${this.teamNames.blue}" style="padding: 5px;">
            </div>
            <div style="margin: 10px 0;">
                <label style="color: black;">红队名称：</label>
                <input type="text" id="redTeamName" value="${this.teamNames.red}" style="padding: 5px;">
            </div>
        `;

        // 添加按钮
        const buttonSection = document.createElement('div');
        buttonSection.style.cssText = 'margin-top: 20px; text-align: right;';
        buttonSection.innerHTML = `
            <button style="margin: 0 5px; padding: 5px 15px; border: 1px solid #ccc; border-radius: 5px; background: #f8f9fa;">取消</button>
            <button style="margin: 0 5px; padding: 5px 15px; background: #48bb78; color: white; border: none; border-radius: 5px;">确认</button>
        `;

        // 添加到对话框
        dialog.appendChild(nameSection);
        dialog.appendChild(buttonSection);

        // 添加遮罩层
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.5);
            z-index: 999;
        `;

        // 添加到页面
        document.body.appendChild(overlay);
        document.body.appendChild(dialog);

        // 处理按钮点击
        const [cancelBtn, confirmBtn] = buttonSection.querySelectorAll('button');
        
        cancelBtn.onclick = () => {
            document.body.removeChild(overlay);
            document.body.removeChild(dialog);
        };

        confirmBtn.onclick = () => {
            // 更新队伍名称
            this.teamNames.blue = dialog.querySelector('#blueTeamName').value;
            this.teamNames.red = dialog.querySelector('#redTeamName').value;

            // 更新显示
            this.updateTeamNames();
            this.updateDisplay();

            // 关闭对话框
            document.body.removeChild(overlay);
            document.body.removeChild(dialog);
        };

        // 点击遮罩层关闭对话框
        overlay.onclick = () => {
            document.body.removeChild(overlay);
            document.body.removeChild(dialog);
        };
    }

    updateTeamNames() {
        // 更新队伍名称显示
        document.querySelector('.team-blue .team-name').textContent = this.teamNames.blue;
        document.querySelector('.team-red .team-name').textContent = this.teamNames.red;
    }

    start() {
        console.log('Starting game...');
        if (!this.isRunning) {
            this.isRunning = true;
            // 比赛时钟恢复，禁赛倒计时也恢复
            this.banTimers.blue.paused = false;
            this.banTimers.red.paused = false;
            this.last_update = Date.now();
            this.updateTimer();
        }
    }

    pause() {
        this.isRunning = false;
        // 比赛时钟暂停，禁赛倒计时也暂停
        this.banTimers.blue.paused = true;
        this.banTimers.red.paused = true;
    }

    reset() {
        this.isRunning = false;
        this.setupTime = this.defaultSetupTime;
        this.gameTime = this.gameModes[Object.keys(this.gameModes)[0]];
        this.possessionTime = 5;
        this.scores = { blue: 0, red: 0 };
        this.currentPhase = 'setup';
        this.currentPossession = 'red';
        this.roundScores = {
            red: { 2: 0, 3: 0, 7: 0 },
            blue: { 2: 0, 3: 0, 7: 0 }
        };
        this.nextPossession = null;
        this.nextPossessionRequested = null;
        
        // 添加清空历史记录的代码
        document.querySelectorAll('.history-section .history-content').forEach(div => {
            div.innerHTML = '';
        });
        
        // 重置运球计数
        this.dribbleCount = {
            red: 0,
            blue: 0
        };
        this.updateDribbleCounter('red');
        this.updateDribbleCounter('blue');
        
        this.foulHistory = { blue: [], red: [] };
        this.updateFoulHistory('blue');
        this.updateFoulHistory('red');

        // 清除禁赛倒计时
        ['blue', 'red'].forEach(team => {
            if (this.banTimers[team].timer) clearInterval(this.banTimers[team].timer);
            this.banTimers[team] = { running: false, remain: 0, paused: false, timer: null };
            this.updateBanTimerDisplay(team);
        });
        
        this.updateDisplay();
    }

    addScore(team, points) {
        // 只有在比赛阶段且游戏正在运行时才能加分
        if (this.currentPhase === 'playing' && this.isRunning) {
            // 更新总分
            this.scores[team] += points;
            
            // 更新得分次数
            this.roundScores[team][points] = (this.roundScores[team][points] || 0) + 1;
            
            // 计算本回合用时
            const roundTime = 20 - this.shotClock;
            
            // 添加到历史记录
            let actionText;
            switch(points) {
                case 7: actionText = "扣篮"; break;
                case 3: actionText = "三分球"; break;
                case 2: actionText = "二分球"; break;
                default: actionText = `得${points}分`;
            }
            
            // 修改这里：使用相同的时间格式
            const historyEntry = {
                action: actionText,
                time: this.formatTime(this.gameTime)  // 改为与犯规记录相同的时间格式
            };
            this.addToHistory(team, historyEntry);
            
            // 切换到控球变更时间，并根据当前回合设置下一回合
            this.currentPhase = 'possession';
            this.possessionTime = this.possessionChangeTime;  // 使用统一的10秒
            
            // 如果没有预设下一回合，则切换到另一队
            if (!this.nextPossession) {
                this.nextPossession = this.currentPossession === 'red' ? 'blue' : 'red';
            }
            
            // 重置运球计数
            this.dribbleCount.red = 0;
            this.dribbleCount.blue = 0;
            this.updateDribbleCounter('red');
            this.updateDribbleCounter('blue');
            
            this.updateDisplay();

            this.playSound(this.roundStartSound);  // 得分后回合结束音
            this.lastPlayedSecond = null;  // 重置倒计声音状态
            
            // 暂停比赛
            this.isRunning = false;
        }
    }

    addDribbleScore(team) {
        // 只有在比赛阶段且游戏正在运行时才能加分
        if (this.currentPhase === 'playing' && this.isRunning) {
            // 检查运球次数限制
            if (this.dribbleCount[team] >= 2) {
                return; // 已达到限制，不能再运球得分
            }
            
            // 增加运球计数
            this.dribbleCount[team]++;
            
            // 更新总分
            this.scores[team] += 1;
            
            // 更新得分次数 - 修复这里的逻辑
            if (!this.roundScores[team][1]) {
                this.roundScores[team][1] = 0;
            }
            this.roundScores[team][1]++;
            
            // 添加到历史记录
            const historyEntry = {
                action: `运球得分`,
                time: this.formatTime(this.gameTime)  // 改为与犯规记录相同的时间格式
            };
            this.addToHistory(team, historyEntry);
            
            // 更新显示
            this.updateDisplay();
        }
    }

    updateDribbleCounter(team) {
        const counter = document.querySelector(`.score-panel-${team} .dribble-counter`);
        if (counter) {
            const count = this.dribbleCount[team] || 0;
            counter.textContent = `${count}/2`;
            
            // 如果达到限制，禁用按钮
            const dribbleBtn = document.querySelector(`.score-panel-${team} .dribble-btn`);
            if (dribbleBtn) {
                if (count >= 2) {
                    dribbleBtn.style.opacity = '0.5';
                    dribbleBtn.style.cursor = 'not-allowed';
                } else {
                    dribbleBtn.style.opacity = '1';
                    dribbleBtn.style.cursor = 'pointer';
                }
            }
        }
    }

    switchPossession() {
        this.currentPhase = 'possession';
        this.currentPossession = this.currentPossession === 'red' ? 'blue' : 'red';
        this.possessionTime = this.roundPossessionTime; // 使用统一的10秒
        
        // 更新显示当前回合
        const possessionText = this.currentPossession === 'red' ? '红队回合' : '蓝队合';
        document.querySelector('.phase-text').textContent = possessionText;
    }

    updateTimer() {
        // 控球变更阶段（possession）或控球变更倒计时(isPossessionChanging)时，禁赛倒计时暂停
        if (this.currentPhase === 'possession' || this.isPossessionChanging || this.isInPossessionChange) {
            this.banTimers.blue.paused = true;
            this.banTimers.red.paused = true;
        } else if (this.isRunning) {
            // 比赛阶段恢复禁赛倒计时
            this.banTimers.blue.paused = false;
            this.banTimers.red.paused = false;
        }

        if (this.isPossessionChanging || this.isInPossessionChange) return;

        if (this.isRunning) {
            const now = Date.now();
            const elapsed = (now - this.last_update) / 1000;
            this.last_update = now;

            switch(this.currentPhase) {
                case 'setup':
                    this.setupTime = Math.max(0, this.setupTime - elapsed);
                    if (this.setupTime <= 0) {
                        // 直接进入红队20秒进攻时间，不进入控球变更阶段
                        this.currentPhase = 'playing';
                        this.currentPossession = 'red';
                        this.shotClock = 20;
                        this.roundStartTime = Date.now();
                        this.lastPlayedSecond = null;
                        // 禁赛倒计时恢复
                        this.banTimers.blue.paused = false;
                        this.banTimers.red.paused = false;
                        this.playSound(this.roundStartSound);  // 回合开始音
                    }
                    break;

                case 'possession':
                    this.possessionTime = Math.max(0, this.possessionTime - elapsed);
                    if (this.possessionTime <= 0) {
                        this.currentPhase = 'playing';
                        this.shotClock = 20;
                        // 禁赛倒计时恢复
                        this.banTimers.blue.paused = false;
                        this.banTimers.red.paused = false;
                        if (this.nextPossession) {
                            this.currentPossession = this.nextPossession;
                            this.nextPossession = null;
                        }
                        
                        // 重置运球计数
                        this.dribbleCount.red = 0;
                        this.dribbleCount.blue = 0;
                        this.updateDribbleCounter('red');
                        this.updateDribbleCounter('blue');
                        
                        this.playSound(this.roundStartSound);  // 回合开始音
                    }
                    break;

                case 'playing':
                    this.gameTime = Math.max(0, this.gameTime - elapsed);
                    this.shotClock = Math.max(0, this.shotClock - elapsed);
                    
                    // 修改倒计时声音的触发逻辑
                    const currentSecond = Math.floor(this.shotClock + 0.99);  // 向上取整，但提前一点触发
                    if (currentSecond <= 3 && currentSecond !== this.lastPlayedSecond) {
                        this.lastPlayedSecond = currentSecond;
                        switch(currentSecond) {
                            case 3:
                                if (this.shotClock <= 3.99) this.playSound(this.countdown3Sound);
                                break;
                            case 2:
                                if (this.shotClock <= 2.99) this.playSound(this.countdown2Sound);
                                break;
                            case 1:
                                if (this.shotClock <= 1.99) this.playSound(this.countdown1Sound);
                                break;
                            case 0:
                                if (this.shotClock <= 0.99) this.playSound(this.countdown0Sound);
                                break;
                        }
                    }
                    
                    if (this.shotClock <= 0) {
                        this.currentPhase = 'possession';
                        this.possessionTime = this.possessionChangeTime; // 使用统一的10秒
                        if (!this.nextPossession) {
                            this.nextPossession = this.currentPossession === 'red' ? 'blue' : 'red';
                        }
                        this.lastPlayedSecond = null;  // 重置倒计时声音状态
                    }
                    if (this.gameTime <= 0) {
                        this.endGame();
                        return;
                    }
                    break;
            }

            this.updateDisplay();
            requestAnimationFrame(() => this.updateTimer());
        }
    }

    startPossessionChangeCountdown() {
        this.possessionChangeTime = 10.0;
        this.updatePossessionChangeDisplay();
        if (this.possessionChangeTimer) clearInterval(this.possessionChangeTimer);

        this.possessionChangeTimer = setInterval(() => {
            this.possessionChangeTime -= 0.02;
            if (this.possessionChangeTime < 0) this.possessionChangeTime = 0;
            this.updatePossessionChangeDisplay();
            if (this.possessionChangeTime <= 0) {
                clearInterval(this.possessionChangeTimer);
                this.isInPossessionChange = false;
                // 切换到下一回合（进入possession阶段，10秒倒计时后自动切换）
                this.currentPhase = 'possession';
                this.possessionTime = this.roundPossessionTime;
                if (!this.nextPossession) {
                    this.nextPossession = this.currentPossession === 'red' ? 'blue' : 'red';
                }
                this.currentPossession = this.nextPossession;
                this.nextPossession = null;
                this.updateDisplay();
                this.isRunning = true;
                this.last_update = Date.now();
                this.updateTimer();
            }
        }, 20);
    }

    updatePossessionChangeDisplay() {
        document.querySelector('.main-timer').textContent =
            this.formatTime(this.possessionChangeTime !== undefined ? this.possessionChangeTime : 10.0);
        document.querySelector('.phase-text').textContent = '控球变更，10秒倒计时';
    }

    // 新增：控球变更倒计时显示
    updatePossessionChangePanelDisplay() {
        // 控球变更倒计时显示在 phase-timer，不覆盖主计时器
        const phaseTimerElement = document.querySelector('.phase-timer');
        if (phaseTimerElement) {
            phaseTimerElement.textContent = `控球变更 ${this.formatTime(this.possessionChangeCountdown !== undefined ? this.possessionChangeCountdown : 10.0)}`;
            phaseTimerElement.style.display = 'block';
        }
        // phase-text不变，主计时器不变
    }

    updateDisplay() {
        // 更新主计时器显示（准备时间/比赛时）
        let mainDisplayTime;
        let phaseText;

        if (this.currentPhase === 'setup') {
            mainDisplayTime = this.setupTime;
            phaseText = `${this.currentMode} - 准备时间`;  // 显示当前模式和准备时间
            document.querySelector('.phase-text').className = 'phase-text setup';
        } else {
            mainDisplayTime = this.gameTime;
            if (this.currentPhase === 'playing') {
                phaseText = this.currentPossession === 'red' ? '红队回合' : '蓝队回合';
                document.querySelector('.phase-text').className = 'phase-text ' + this.currentPossession;
            } else if (this.currentPhase === 'possession') {
                phaseText = `下一回合：${this.nextPossession === 'red' ? '红队' : '蓝队'}`;
                document.querySelector('.phase-text').className = 'phase-text ' + this.nextPossession;
            }
        }

        document.querySelector('.main-timer').textContent = this.formatTime(mainDisplayTime);
        document.querySelector('.phase-text').textContent = phaseText;

        // 仅在控球变更阶段显示控球变更时间
        const phaseTimerElement = document.querySelector('.phase-timer');
        if (phaseTimerElement) {
            if (this.currentPhase === 'possession') {
                phaseTimerElement.textContent = `控球变更 ${this.formatTime(this.possessionTime)}`;
                phaseTimerElement.style.display = 'block';
            } else {
                // 在其他阶段不显示控球变更时间
                phaseTimerElement.style.display = 'none';
            }
        }

        // 更新两侧20秒计时器
        const blueTimer = document.querySelector('.team-blue .timer-display');
        const redTimer = document.querySelector('.team-red .timer-display');
        
        if (this.currentPhase === 'playing') {
            if (this.currentPossession === 'blue') {
                blueTimer.textContent = this.shotClock.toFixed(2);
                redTimer.textContent = "20.00";
            } else {
                redTimer.textContent = this.shotClock.toFixed(2);
                blueTimer.textContent = "20.00";
            }
        } else {
            blueTimer.textContent = "20.00";
            redTimer.textContent = "20.00";
        }

        // 更新得分显示
        document.querySelector('.team-blue .team-score').textContent = this.scores.blue;
        document.querySelector('.team-red .team-score').textContent = this.scores.red;

        // 更新得分按钮显示（显示得分次数）
        this.updateScoreButtons();

        // 更新队伍区域的闪烁效果
        const blueSection = document.querySelector('.team-blue');
        const redSection = document.querySelector('.team-red');
        
        // 移除所有活动状态
        blueSection.classList.remove('active');
        redSection.classList.remove('active');
        
        // 根据当前回合或下一回合添加闪烁效果
        if (this.currentPhase === 'playing') {
            // 比赛阶段，当前回合方闪烁
            if (this.currentPossession === 'blue') {
                blueSection.classList.add('active');
            } else {
                redSection.classList.add('active');
            }
        } else if (this.currentPhase === 'possession') {
            // 占有时间阶段，下一回合方闪烁
            if (this.nextPossession === 'blue') {
                blueSection.classList.add('active');
            } else if (this.nextPossession === 'red') {
                redSection.classList.add('active');
            }
        }

        // 更新犯规按钮状态 - 修改选择器
        const blueFoulBtn = document.querySelector('.team-blue .blue-foul');
        const redFoulBtn = document.querySelector('.team-red .red-foul');

        if (blueFoulBtn) {
            if (this.currentPhase === 'playing') {  // 只要在比赛进行时就可用
                blueFoulBtn.style.opacity = '1';
                blueFoulBtn.style.cursor = 'pointer';
            } else {
                blueFoulBtn.style.opacity = '0.5';
                blueFoulBtn.style.cursor = 'not-allowed';
            }
        }

        if (redFoulBtn) {
            if (this.currentPhase === 'playing') {  // 只要在比赛进行时就可用
                redFoulBtn.style.opacity = '1';
                redFoulBtn.style.cursor = 'pointer';
            } else {
                redFoulBtn.style.opacity = '0.5';
                redFoulBtn.style.cursor = 'not-allowed';
            }
        }
        
        // 更新游戏模式按钮
        const groupModeBtn = document.querySelector('.mode-btn.group');
        const eliminationModeBtn = document.querySelector('.mode-btn.elimination');
        
        if (this.currentMode === '小组循环赛') {
            groupModeBtn.classList.add('active');
            eliminationModeBtn.classList.remove('active');
        } else {
            eliminationModeBtn.classList.add('active');
            groupModeBtn.classList.remove('active');
        }
        
        // 更新声音按钮状态
        const soundToggleBtn = document.querySelector('.sound-toggle-btn');
        if (soundToggleBtn) {
            soundToggleBtn.classList.toggle('active', this.soundEnabled);
            const icon = soundToggleBtn.querySelector('i');
            icon.className = this.soundEnabled ? 'fas fa-volume-up' : 'fas fa-volume-mute';
        }
    }
    
    updateScoreButtons() {
        // 更新红队得分按钮显示
        document.querySelectorAll('.score-area-left .score-box').forEach(box => {
            const points = parseInt(box.querySelector('.score-display').getAttribute('data-points'));
            box.querySelector('.score-display').textContent = this.roundScores.red[points];
        });

        // 更新蓝队得分按钮显示
        document.querySelectorAll('.score-area-right .score-box').forEach(box => {
            const points = parseInt(box.querySelector('.score-display').getAttribute('data-points'));
            box.querySelector('.score-display').textContent = this.roundScores.blue[points];
        });
    }

    // 新增：记录犯规到犯规面板
    recordFoulPanel(team, foulType) {
        // 记录行为和时间
        const entry = {
            action: foulType,
            time: this.formatTime(this.gameTime)
        };
        this.foulHistory[team].push(entry);
        this.updateFoulHistory(team);
    }

    // 新增：更新犯规历史面板
    updateFoulHistory(team) {
        const container = document.querySelector(`.foul-panel-${team} .foul-history-content`);
        if (container) {
            container.innerHTML = '';
            this.foulHistory[team].forEach((entry) => {
                const div = document.createElement('div');
                div.style.display = 'flex';
                div.style.justifyContent = 'space-between';
                div.style.alignItems = 'center';
                div.style.lineHeight = '1.8';
                div.style.padding = '4px 0';
                div.style.whiteSpace = 'nowrap'; // 保证一行不换行
                div.innerHTML = `<span style="flex:1;text-align:center;">${entry.action}</span><span style="flex:1;text-align:center;">${entry.time}秒</span>`;
                container.appendChild(div);
            });
            container.scrollTop = container.scrollHeight;
        }
    }

    // 新增：控球变更倒计时逻辑
    startPossessionChange(triggerTeam) {
        if (this.isPossessionChanging) return;
        this.isPossessionChanging = true;
        this.isRunning = false; // 暂停比赛时钟
        // 控球变更期间禁赛倒计时也暂停
        this.banTimers.blue.paused = true;
        this.banTimers.red.paused = true;

        // 控球变更期间允许点击红方/蓝方犯规按钮，其余禁用
        document.querySelectorAll('.score-btn, .foul-btn:not(.blue-foul):not(.red-foul), .control-buttons button, .team-section .control-btn').forEach(btn => {
            btn.disabled = true;
            btn.style.pointerEvents = 'none';
            btn.style.opacity = '0.5';
        });
        document.querySelectorAll('.blue-foul, .red-foul').forEach(btn => {
            btn.disabled = false;
            btn.style.pointerEvents = '';
            btn.style.opacity = '1';
        });

        // 只允许红方/蓝方犯规按钮在控球变更期间生效，且点击时记录行为和时间
        // 先移除之前的事件，防止重复绑定
        document.querySelectorAll('.blue-foul').forEach(btn => {
            btn.onclick = null;
            btn.addEventListener('click', () => {
                if (!this.isPossessionChanging) return;
                this.isRunning = false;
                const action = btn.getAttribute('data-action') || '蓝方犯规';
                this.recordFoulPanel('blue', action);
                this.foulPauseActive = false;
            });
        });
        document.querySelectorAll('.red-foul').forEach(btn => {
            btn.onclick = null;
            btn.addEventListener('click', () => {
                if (!this.isPossessionChanging) return;
                this.isRunning = false;
                const action = btn.getAttribute('data-action') || '红方犯规';
                this.recordFoulPanel('red', action);
                this.foulPauseActive = false;
            });
        });

        this.possessionChangeCountdown = 10;
        this.updatePossessionChangePanelDisplay();

        if (this.possessionChangeTimer) clearInterval(this.possessionChangeTimer);
        this.possessionChangeTimer = setInterval(() => {
            this.possessionChangeCountdown -= 0.02;
            if (this.possessionChangeCountdown < 0) this.possessionChangeCountdown = 0;
            this.updatePossessionChangePanelDisplay();
            if (this.possessionChangeCountdown <= 0) {
                clearInterval(this.possessionChangeTimer);
                this.isPossessionChanging = false;
                // 控球变更结束，恢复所有按钮
                document.querySelectorAll('.score-btn, .foul-btn, .control-buttons button, .team-section .control-btn').forEach(btn => {
                    btn.disabled = false;
                    btn.style.pointerEvents = '';
                    btn.style.opacity = '';
                });
                // 恢复红方/蓝方犯规按钮的原有事件绑定
                this.bindControls();
                // 控球变更结束，比赛时钟恢复，禁赛倒计时也恢复
                this.banTimers.blue.paused = false;
                this.banTimers.red.paused = false;
                // 切换进攻方
                this.currentPhase = 'playing';
                this.currentPossession = triggerTeam === 'red' ? 'blue' : 'red';
                this.shotClock = 20;
                this.roundStartTime = Date.now();
                this.lastPlayedSecond = null;
                // 重置运球计数
                this.dribbleCount.red = 0;
                this.dribbleCount.blue = 0;
                this.updateDribbleCounter('red');
                this.updateDribbleCounter('blue');
                this.updateDisplay();
                this.isRunning = true;
                this.last_update = Date.now();
                this.updateTimer();
            }
        }, 20);
    }

    // 新增：控球变更倒计时显示
    updatePossessionChangePanelDisplay() {
        // 控球变更倒计时显示在 phase-timer，不覆盖主计时器
        const phaseTimerElement = document.querySelector('.phase-timer');
        if (phaseTimerElement) {
            phaseTimerElement.textContent = `控球变更 ${this.formatTime(this.possessionChangeCountdown !== undefined ? this.possessionChangeCountdown : 10.0)}`;
            phaseTimerElement.style.display = 'block';
        }
        // phase-text不变，主计时器不变
    }

    startBanTimer(team, seconds) {
        // 清除已有倒计时
        if (this.banTimers[team].timer) clearInterval(this.banTimers[team].timer);
        this.banTimers[team].running = true;
        this.banTimers[team].remain = seconds;
        // 初始化时根据比赛时钟状态设置暂停
        this.banTimers[team].paused = !this.isRunning || this.isInPossessionChange || this.isPossessionChanging;
        this.updateBanTimerDisplay(team);

        // 定时器
        this.banTimers[team].timer = setInterval(() => {
            // 只要paused为true就不计时
            if (this.banTimers[team].paused) return;
            this.banTimers[team].remain -= 0.02;
            if (this.banTimers[team].remain < 0) this.banTimers[team].remain = 0;
            this.updateBanTimerDisplay(team);
            if (this.banTimers[team].remain <= 0) {
                clearInterval(this.banTimers[team].timer);
                this.banTimers[team].running = false;
                this.banTimers[team].timer = null;
                this.playSound(this.banEndSound); // 改为播放4.mp3
                this.updateBanTimerDisplay(team);
            }
        }, 20);
    }

    updateBanTimerDisplay(team) {
        const el = document.querySelector(`.ban-timer-display[data-team="${team}"]`);
        if (!el) return;
        if (this.banTimers[team].running && this.banTimers[team].remain > 0) {
            el.textContent = this.banTimers[team].remain.toFixed(2);
        } else {
            el.textContent = "0.00";
        }
    }

    addToHistory(team, entry) {
        const historyDiv = document.querySelector(`.team-${team} .history-section .history-content`);
        const newEntry = document.createElement('div');
        newEntry.style.display = 'flex';
        newEntry.style.justifyContent = 'space-between';
        newEntry.innerHTML = `
            <span>${entry.action}</span>
            <span>${entry.time}秒</span>
        `;
        historyDiv.appendChild(newEntry);
    }
    
    formatTime(time) {
        // 确保 time 是有效数字
        if (typeof time !== 'number' || isNaN(time)) {
            time = 0;
        }
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        const milliseconds = Math.floor((time % 1) * 1000);
        return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(milliseconds).padStart(3, '0')}`;
    }

    endGame() {
        this.isRunning = false;
        this.currentPhase = 'setup';
        alert('比赛结束！');
    }

    startRound() {
        if (this.currentPhase === 'possession') {
            this.currentPhase = 'playing';
            this.shotClock = 20;
            this.roundStartTime = Date.now();
            this.lastPlayedSecond = null;  // 重置倒计时声音状态
            this.playSound(this.roundStartSound);  // 回合开始音
            this.updateDisplay();
        }
    }

    setNextPossession(team) {
        if (this.currentPhase === 'possession') {
            this.currentPossession = team;
            this.updateDisplay();
        }
    }

    // 修改强制重启方法
    forceRestart() {
        // 停止所有计时器
        this.isRunning = false;
        
        // 重置所有状态
        this.setupTime = this.defaultSetupTime;
        this.currentMode = '小组循环赛';  // 重置为默认模式
        this.gameTime = this.gameModes['小组循环赛'];
        this.possessionTime = 5;
        this.shotClock = 20;
        this.scores = { blue: 0, red: 0 };
        this.currentPhase = 'setup';
        this.currentPossession = 'red';
        this.roundScores = {
            red: { 2: 0, 3: 0, 7: 0 },
            blue: { 2: 0, 3: 0, 7: 0 }
        };
        this.nextPossession = null;
        this.nextPossessionRequested = null;
        this.soundEnabled = true;

        // 清空历史记录
        document.querySelectorAll('.history-section .history-content').forEach(div => {
            div.innerHTML = '';
        });

        this.foulHistory = { blue: [], red: [] };
        this.updateFoulHistory('blue');
        this.updateFoulHistory('red');
        
        // 清除禁赛倒计时
        ['blue', 'red'].forEach(team => {
            if (this.banTimers[team].timer) clearInterval(this.banTimers[team].timer);
            this.banTimers[team] = { running: false, remain: 0, paused: false, timer: null };
            this.updateBanTimerDisplay(team);
        });
        // 更新显示
        this.updateDisplay();
        
        // 显示重启提示
        alert('系统已重启！');
    }

    // 修改播放声音的方法
    playSound(sound) {
        // 如果声音总开关关闭，则不播放任何声音
        if (!this.soundEnabled) return;
        
        sound.currentTime = 0;  // 重置音频到开始
        sound.play();
    }

    // 修改记录犯规的方法
    recordFoul(team) {
        // 暂停比赛
        this.isRunning = false;
        
        // 添加到历史记录
        const historyEntry = {
            action: '犯规',
            time: this.formatTime(this.gameTime)
        };
        
        // 添加到对应队伍的历史记录中
        const historyDiv = document.querySelector(`.team-${team} .history-section .history-content`);
        if (historyDiv) {
            const newEntry = document.createElement('div');
            newEntry.style.display = 'flex';
            newEntry.style.justifyContent = 'space-between';
            newEntry.innerHTML = `
                <span>${historyEntry.action}</span>
                <span>${historyEntry.time}</span>
            `;
            historyDiv.appendChild(newEntry);
            
            // 自动滚动到最新记录
            historyDiv.scrollTop = historyDiv.scrollHeight;
        }

        // 切换到控球变更阶段
        this.currentPhase = 'possession';
        this.possessionTime = this.possessionChangeTime; // 使用统一的10秒
        
        // 如果没有预设下一回合，则切换到另一队
        if (!this.nextPossession) {
            this.nextPossession = team === 'red' ? 'blue' : 'red';
        }
        
        this.updateDisplay();
        this.playSound(this.roundStartSound);
        this.lastPlayedSecond = null;
    }
}

// 等待 DOM 加载完成后再初始化
document.addEventListener('DOMContentLoaded', () => {
    console.log('Initializing referee system...');
    window.referee = new RefereeSystem();
});