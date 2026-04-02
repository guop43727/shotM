const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
canvas.width = 900;
canvas.height = 700;

// 游戏常量
const GAME_CONSTANTS = {
    VANISHING_POINT_Y: 50,
    ROAD_WIDTH: 300,
    PLAYER_SPACING: 22,
    ENEMY_BASE_HP: 10,
    ENEMY_HP_PER_WAVE: 5,
    ENEMY_BASE_SPEED: 0.0015,
    ENEMY_SPEED_PER_WAVE: 0.0001,
    BULLET_SPEED: 0.02,
    DROP_SPEED: 0.0015,
    GATE_SPEED: 0.0015,
    COLLISION_DISTANCE: 50,
    GATE_HIT_THRESHOLD: 40,
    GOLD_PER_KILL: 10,
    SCORE_PER_KILL: 100,
    DOM_UPDATE_THROTTLE: 100
};

// 音效系统（Web Audio API）
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playSound(type) {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    const now = audioCtx.currentTime;
    if (type === 'shoot') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(200, now + 0.08);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
        osc.start(now); osc.stop(now + 0.08);
    } else if (type === 'kill') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.exponentialRampToValueAtTime(80, now + 0.15);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        osc.start(now); osc.stop(now + 0.15);
    } else if (type === 'waveclear') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.setValueAtTime(550, now + 0.1);
        osc.frequency.setValueAtTime(660, now + 0.2);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
        osc.start(now); osc.stop(now + 0.4);
    } else if (type === 'gameover') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.exponentialRampToValueAtTime(55, now + 0.8);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
        osc.start(now); osc.stop(now + 0.8);
    } else if (type === 'gate') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.exponentialRampToValueAtTime(1200, now + 0.1);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        osc.start(now); osc.stop(now + 0.1);
    }
}

const game = {
    gold: 100,
    lives: 10,
    wave: 1,
    selectedDefender: null,
    defenders: [],
    enemies: [],
    bullets: [],
    waveActive: false,
    score: 0,
    weaponDrops: [], // 武器掉落
    numberGates: [], // 数字门
    spawnInterval: null, // 生成间隔的引用
    baseSpawnRate: 400, // 基础生成速度
    waveKills: 0, // 本波击杀数
    waveGoldEarned: 0 // 本波获得金币
};

// 玩家角色（在底部）
const player = {
    x: canvas.width / 2,
    y: canvas.height - 120,
    width: 50,
    height: 60,
    count: 1, // 玩家数量（像数字门游戏）
    speed: 5, // [REQ-PLAYER-001/002, DD-005] px/帧，60fps 下约 300px/s
    weapon: {
        id: 'rifle',  // BLOCK-NEW-03 fix: Add id field for weaponManager.addWeapon() auto-equip logic
        type: 'rifle',
        fireRate: 50,
        lastFire: 0,
        damage: 50, // 超强火力！从25大幅提升到50
        bulletCount: 1 // 每次发射子弹数量
    }
};

// 键盘状态对象 — 模块级变量 [REQ-PLAYER-001~003, DD-001, DD-006]
// keydown 设为 true，keyup 设为 false；逐帧轮询，消除 OS 按键重复延迟
const keys = { ArrowLeft: false, ArrowRight: false };

const defenderTypes = {
    shooter: {
        cost: 50,
        damage: 10,
        range: 150,
        fireRate: 1000,
        color: '#8eff71',
        glow: 'rgba(142, 255, 113, 0.5)'
    },
    sniper: {
        cost: 80,
        damage: 30,
        range: 250,
        fireRate: 2000,
        color: '#00d4ec',
        glow: 'rgba(0, 212, 236, 0.5)'
    },
    cannon: {
        cost: 120,
        damage: 50,
        range: 180,
        fireRate: 1500,
        color: '#ff7948',
        glow: 'rgba(255, 121, 72, 0.5)'
    }
};

// 武器类型
const weaponTypes = {
    rifle: {
        name: '步枪',
        fireRate: 50,
        damage: 50, // 超强伤害！
        bulletCount: 1,
        color: '#ff7948',
        duration: 0 // 永久
    },
    machinegun: {
        name: '机枪',
        fireRate: 30,
        damage: 60, // 从30提升到60
        bulletCount: 1,
        color: '#ffeb3b',
        duration: 10000
    },
    shotgun: {
        name: '霰弹枪',
        fireRate: 150,
        damage: 30, // 从15提升到30（5发共150伤害！）
        bulletCount: 5,
        color: '#ff4848',
        duration: 8000
    },
    laser: {
        name: '激光炮',
        fireRate: 20,
        damage: 80, // 从40提升到80
        bulletCount: 1,
        color: '#00e3fd',
        duration: 12000
    }
};

// 绘制透视道路
function drawRoad() {
    // 背景渐变
    const bgGradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    bgGradient.addColorStop(0, '#1a1a3e');
    bgGradient.addColorStop(1, '#0c0c1f');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 绘制透视道路
    const roadWidth = GAME_CONSTANTS.ROAD_WIDTH;
    const vanishingPointY = GAME_CONSTANTS.VANISHING_POINT_Y;

    // 道路主体
    const roadGradient = ctx.createLinearGradient(0, vanishingPointY, 0, canvas.height);
    roadGradient.addColorStop(0, '#2a2a3e');
    roadGradient.addColorStop(0.5, '#3a3a4e');
    roadGradient.addColorStop(1, '#2a2a3e');

    ctx.fillStyle = roadGradient;
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2 - 50, vanishingPointY);
    ctx.lineTo(canvas.width / 2 + 50, vanishingPointY);
    ctx.lineTo(canvas.width / 2 + roadWidth, canvas.height);
    ctx.lineTo(canvas.width / 2 - roadWidth, canvas.height);
    ctx.closePath();
    ctx.fill();

    // 道路边线
    ctx.strokeStyle = '#8eff71';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2 - 50, vanishingPointY);
    ctx.lineTo(canvas.width / 2 - roadWidth, canvas.height);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(canvas.width / 2 + 50, vanishingPointY);
    ctx.lineTo(canvas.width / 2 + roadWidth, canvas.height);
    ctx.stroke();

    // 中线虚线
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 10]);
    for (let i = 0; i < 10; i++) {
        const y = vanishingPointY + (canvas.height - vanishingPointY) * (i / 10);
        const width = 50 + (roadWidth - 50) * (i / 10);
        ctx.beginPath();
        ctx.moveTo(canvas.width / 2, y);
        ctx.lineTo(canvas.width / 2, y + 20);
        ctx.stroke();
    }
    ctx.setLineDash([]);
}

// 绘制玩家角色（2.5D 等距赛博朋克风格）
function drawPlayer() {
    const spacing = GAME_CONSTANTS.PLAYER_SPACING;
    const count = Math.min(player.count, 10);
    const startX = player.x - (count - 1) * spacing / 2;

    for (let i = 0; i < count; i++) {
        const px = startX + i * spacing;
        const isCenter = (i === Math.floor(count / 2));
        drawCyberSoldier(px, player.y, isCenter);
    }

    if (player.count > 10) {
        ctx.save();
        ctx.fillStyle = '#8eff71';
        ctx.font = 'bold 18px "Plus Jakarta Sans"';
        ctx.textAlign = 'center';
        ctx.shadowBlur = 12;
        ctx.shadowColor = '#8eff71';
        ctx.fillText('×' + player.count, player.x, player.y - 52);
        ctx.restore();
    }
}

function drawCyberSoldier(cx, cy, hasGun) {
    ctx.save();
    ctx.translate(cx, cy);

    // --- 地面阴影 ---
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.ellipse(0, 32, 14, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // 颜色主题
    const neon = '#00e3fd';
    const dark = '#003a4a';
    const mid  = '#005f7a';
    const light = '#7ff8ff';
    const accent = '#8eff71';

    // ===== 腿（2.5D：左腿稍偏左后，右腿偏右前）=====
    // 右腿（前）
    _drawBox(ctx, 2, 10, 7, 14, mid, dark, neon, 3);
    // 左腿（后，稍暗）
    _drawBox(ctx, -9, 10, 7, 14, dark, '#001f28', mid, 3);

    // ===== 躯干 =====
    _drawBox(ctx, -11, -8, 22, 18, mid, dark, neon, 5);

    // 胸甲高光
    ctx.fillStyle = 'rgba(127,248,255,0.15)';
    ctx.beginPath();
    ctx.moveTo(-9, -6);
    ctx.lineTo(9, -6);
    ctx.lineTo(7, 2);
    ctx.lineTo(-7, 2);
    ctx.closePath();
    ctx.fill();

    // 胸口能量核心
    ctx.fillStyle = accent;
    ctx.shadowBlur = 8;
    ctx.shadowColor = accent;
    ctx.beginPath();
    ctx.arc(0, -1, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // ===== 手臂 =====
    // 左臂（后）
    _drawBox(ctx, -16, -6, 5, 12, dark, '#001f28', mid, 2);
    // 右臂（前）
    _drawBox(ctx, 11, -6, 5, 12, mid, dark, neon, 2);

    // ===== 头部 =====
    _drawBox(ctx, -9, -22, 18, 14, mid, dark, neon, 4);

    // 头盔顶部斜面（2.5D 感）
    ctx.fillStyle = light;
    ctx.beginPath();
    ctx.moveTo(-9, -22);
    ctx.lineTo(9, -22);
    ctx.lineTo(11, -24);
    ctx.lineTo(-7, -24);
    ctx.closePath();
    ctx.fill();

    // 护目镜（双眼发光）
    ctx.fillStyle = accent;
    ctx.shadowBlur = 10;
    ctx.shadowColor = accent;
    ctx.fillRect(-7, -18, 5, 4);
    ctx.fillRect(2, -18, 5, 4);
    ctx.shadowBlur = 0;

    // 护目镜反光
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.fillRect(-6, -18, 2, 1);
    ctx.fillRect(3, -18, 2, 1);

    // 天线
    ctx.strokeStyle = neon;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(5, -22);
    ctx.lineTo(7, -28);
    ctx.stroke();
    ctx.fillStyle = neon;
    ctx.beginPath();
    ctx.arc(7, -29, 2, 0, Math.PI * 2);
    ctx.fill();

    // ===== 武器（仅中间角色）=====
    if (hasGun) {
        const wColor = player.weapon.color || weaponTypes[player.weapon.type]?.color || '#ff7948';
        ctx.save();
        ctx.translate(11, -8);

        // 枪身（2.5D 厚度）
        ctx.fillStyle = '#222';
        ctx.fillRect(0, 1, 22, 5);   // 底面
        ctx.fillStyle = wColor;
        ctx.shadowBlur = 12;
        ctx.shadowColor = wColor;
        ctx.fillRect(0, -3, 22, 5);  // 正面
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.fillRect(0, -3, 22, 1);  // 高光

        // 枪管
        ctx.fillStyle = '#111';
        ctx.fillRect(20, 0, 8, 2);
        ctx.fillStyle = wColor;
        ctx.fillRect(20, -1, 8, 2);

        // 枪口火焰（动态）
        const t = cachedTime / 80;
        if (Math.sin(t) > 0.3) {
            ctx.fillStyle = '#ffeb3b';
            ctx.shadowBlur = 15;
            ctx.shadowColor = '#ffeb3b';
            ctx.beginPath();
            ctx.arc(29, 0, 3 + Math.sin(t) * 1.5, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.shadowBlur = 0;
        ctx.restore();
    }

    ctx.restore();
}

// 辅助：绘制带 2.5D 厚度的方块（正面 + 右侧面 + 顶面）
function _drawBox(ctx, x, y, w, h, faceColor, sideColor, edgeColor, depth) {
    // 右侧面
    ctx.fillStyle = sideColor;
    ctx.beginPath();
    ctx.moveTo(x + w, y);
    ctx.lineTo(x + w + depth, y - depth);
    ctx.lineTo(x + w + depth, y + h - depth);
    ctx.lineTo(x + w, y + h);
    ctx.closePath();
    ctx.fill();

    // 顶面
    ctx.fillStyle = edgeColor;
    ctx.globalAlpha = 0.4;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + w, y);
    ctx.lineTo(x + w + depth, y - depth);
    ctx.lineTo(x + depth, y - depth);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;

    // 正面
    ctx.fillStyle = faceColor;
    ctx.fillRect(x, y, w, h);

    // 边框
    ctx.strokeStyle = edgeColor;
    ctx.lineWidth = 0.8;
    ctx.strokeRect(x, y, w, h);
}

class Enemy {
    constructor(wave, customLaneOffset = null) {
        this.z = 0;
        this.laneOffset = customLaneOffset !== null ? customLaneOffset : (Math.random() - 0.5) * 100;
        this.hp = GAME_CONSTANTS.ENEMY_BASE_HP + wave * GAME_CONSTANTS.ENEMY_HP_PER_WAVE;
        this.maxHp = this.hp;
        this.speed = GAME_CONSTANTS.ENEMY_BASE_SPEED + wave * GAME_CONSTANTS.ENEMY_SPEED_PER_WAVE;
        this.baseSize = 40;
        // 根据波次决定敌人类型：1-3波小兵，4-7波重甲，8+波精英
        this.type = wave <= 3 ? 'grunt' : wave <= 7 ? 'heavy' : 'elite';
        // 行走动画相关
        this.walkPhase = Math.random() * Math.PI * 2; // 随机初始相位，避免所有敌人同步
    }

    getScreenPosition() {
        // 根据深度计算屏幕位置（透视投影）
        const vanishingY = GAME_CONSTANTS.VANISHING_POINT_Y;
        const roadWidth = GAME_CONSTANTS.ROAD_WIDTH;

        const y = vanishingY + (canvas.height - vanishingY - 100) * this.z;
        const scale = 0.3 + this.z * 0.7; // 近大远小
        const xSpread = 50 + (roadWidth - 50) * this.z;
        const x = canvas.width / 2 + this.laneOffset * scale;

        return { x, y, scale };
    }

    draw() {
        const pos = this.getScreenPosition();
        const s = pos.scale; // 缩放系数

        // 行走动画：腿部摆动
        const walkCycle = Math.sin(cachedTime * 0.008 + this.walkPhase);
        const bodyBob = Math.abs(Math.sin(cachedTime * 0.008 + this.walkPhase)) * 1.5 * s;

        ctx.save();
        ctx.translate(pos.x, pos.y - bodyBob);

        // 根据类型选配色
        const colors = {
            grunt: { face: '#8b0000', side: '#4a0000', edge: '#ff4060', eye: '#ff4060', depth: 2 },
            heavy: { face: '#1a1a4e', side: '#0d0d2b', edge: '#4040ff', eye: '#00aaff', depth: 3 },
            elite: { face: '#2d0050', side: '#1a0030', edge: '#cc00ff', eye: '#ff00ff', depth: 3 }
        };
        const c = colors[this.type];

        // ===== 腿（行走动画）=====
        const legSwing = walkCycle * 4 * s;
        // 右腿
        _drawBox(ctx, 1*s, 10*s, 6*s, 12*s, c.face, c.side, c.edge, c.depth*s);
        ctx.save();
        ctx.translate(4*s, 10*s);
        ctx.rotate(legSwing * 0.05);
        ctx.translate(-4*s, -10*s);
        _drawBox(ctx, 1*s, 10*s, 6*s, 12*s, c.face, c.side, c.edge, c.depth*s);
        ctx.restore();

        // 左腿（反相）
        _drawBox(ctx, -7*s, 10*s, 6*s, 12*s, c.side, '#000', c.face, c.depth*s);
        ctx.save();
        ctx.translate(-4*s, 10*s);
        ctx.rotate(-legSwing * 0.05);
        ctx.translate(4*s, -10*s);
        _drawBox(ctx, -7*s, 10*s, 6*s, 12*s, c.side, '#000', c.face, c.depth*s);
        ctx.restore();

        // ===== 躯干 =====
        _drawBox(ctx, -10*s, -8*s, 20*s, 18*s, c.face, c.side, c.edge, c.depth*s);

        // 胸口能量核心（脉冲）
        const pulse = 0.7 + Math.sin(cachedTime * 0.005 + this.walkPhase) * 0.3;
        ctx.fillStyle = c.eye;
        ctx.globalAlpha = pulse;
        ctx.shadowBlur = 8 * s;
        ctx.shadowColor = c.eye;
        ctx.beginPath();
        ctx.arc(0, -1*s, 3*s, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;

        // ===== 手臂（随行走轻微摆动）=====
        const armSwing = walkCycle * 3 * s;
        // 左臂（后）
        _drawBox(ctx, -15*s, (-6 + armSwing)*s, 5*s, 11*s, c.side, '#000', c.face, c.depth*s);
        // 右臂（前）
        _drawBox(ctx, 10*s, (-6 - armSwing)*s, 5*s, 11*s, c.face, c.side, c.edge, c.depth*s);

        // ===== 头部 =====
        _drawBox(ctx, -8*s, -22*s, 16*s, 14*s, c.face, c.side, c.edge, c.depth*s);

        // 头盔顶部斜面
        ctx.fillStyle = c.edge;
        ctx.globalAlpha = 0.5;
        ctx.beginPath();
        ctx.moveTo(-8*s, -22*s);
        ctx.lineTo(8*s, -22*s);
        ctx.lineTo((8+c.depth)*s, (-22-c.depth)*s);
        ctx.lineTo((-8+c.depth)*s, (-22-c.depth)*s);
        ctx.closePath();
        ctx.fill();
        ctx.globalAlpha = 1;

        // 眼睛（发光）
        ctx.fillStyle = c.eye;
        ctx.shadowBlur = 10 * s;
        ctx.shadowColor = c.eye;
        ctx.fillRect(-6*s, -18*s, 4*s, 3*s);
        ctx.fillRect(2*s, -18*s, 4*s, 3*s);
        ctx.shadowBlur = 0;

        // 精英类型额外：肩甲
        if (this.type === 'elite') {
            _drawBox(ctx, -14*s, -10*s, 5*s, 6*s, c.face, c.side, c.edge, c.depth*s);
            _drawBox(ctx, 9*s, -10*s, 5*s, 6*s, c.face, c.side, c.edge, c.depth*s);
        }

        ctx.restore();

        // HP条
        const hpPercent = this.hp / this.maxHp;
        const barWidth = 50 * s;
        const barHeight = 4 * s;
        const barX = pos.x - barWidth / 2;
        const barY = pos.y - 30 * s - bodyBob;

        ctx.fillStyle = '#333';
        ctx.fillRect(barX, barY, barWidth, barHeight);
        ctx.fillStyle = hpPercent > 0.5 ? '#8eff71' : hpPercent > 0.25 ? '#ffeb3b' : '#ff4060';
        ctx.fillRect(barX, barY, barWidth * hpPercent, barHeight);
        ctx.strokeStyle = 'rgba(255,255,255,0.2)';
        ctx.lineWidth = 1;
        ctx.strokeRect(barX, barY, barWidth, barHeight);

        // HP数字
        if (s > 0.5) {
            ctx.fillStyle = '#ffffff';
            ctx.font = `bold ${12 * s}px "Plus Jakarta Sans"`;
            ctx.textAlign = 'center';
            ctx.fillText(Math.ceil(this.hp), pos.x, pos.y + 2*s - bodyBob);
        }
    }

    update() {
        this.z += this.speed;
        return this.z >= 1;
    }
}

// 武器掉落
class WeaponDrop {
    constructor() {
        this.z = 0;
        this.laneOffset = (Math.random() - 0.5) * 100;
        this.speed = GAME_CONSTANTS.DROP_SPEED;
        const weaponKeys = Object.keys(weaponTypes).filter(k => k !== 'rifle');
        this.weaponType = weaponKeys[Math.floor(Math.random() * weaponKeys.length)];
        this.collected = false;
    }

    getScreenPosition() {
        const vanishingY = GAME_CONSTANTS.VANISHING_POINT_Y;
        const y = vanishingY + (canvas.height - vanishingY - 100) * this.z;
        const scale = 0.3 + this.z * 0.7;
        const x = canvas.width / 2 + this.laneOffset * scale;
        return { x, y, scale };
    }

    draw() {
        if (this.collected) return;

        const pos = this.getScreenPosition();
        const size = 40 * pos.scale;

        ctx.save();
        ctx.shadowBlur = 20 * pos.scale;
        ctx.shadowColor = weaponTypes[this.weaponType].color;

        // 武器箱
        const boxGradient = ctx.createLinearGradient(
            pos.x - size/2, pos.y - size/2,
            pos.x + size/2, pos.y + size/2
        );
        boxGradient.addColorStop(0, weaponTypes[this.weaponType].color);
        boxGradient.addColorStop(1, '#1a1a2e');

        ctx.fillStyle = boxGradient;
        ctx.fillRect(pos.x - size/2, pos.y - size/2, size, size);

        ctx.strokeStyle = weaponTypes[this.weaponType].color;
        ctx.lineWidth = 3 * pos.scale;
        ctx.strokeRect(pos.x - size/2, pos.y - size/2, size, size);

        // 武器图标（简化的枪）
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(pos.x - size/4, pos.y - size/8, size/2, size/4);

        // 名称
        if (pos.scale > 0.5) {
            ctx.fillStyle = '#ffffff';
            ctx.font = `bold ${12 * pos.scale}px "Plus Jakarta Sans"`;
            ctx.textAlign = 'center';
            ctx.fillText(weaponTypes[this.weaponType].name, pos.x, pos.y + size/2 + 20);
        }

        ctx.restore();
    }

    update() {
        this.z += this.speed;

        // 检测碰撞
        if (this.z > 0.8 && !this.collected) {
            const pos = this.getScreenPosition();
            const dist = Math.hypot(pos.x - player.x, pos.y - player.y);
            if (dist < GAME_CONSTANTS.COLLISION_DISTANCE) {
                this.collected = true;
                // 切换武器
                const weapon = weaponTypes[this.weaponType];
                player.weapon.type = this.weaponType;
                player.weapon.fireRate = weapon.fireRate;
                player.weapon.damage = weapon.damage;
                player.weapon.bulletCount = weapon.bulletCount;
                updateDamageDisplay();

                // 获得超级武器后，增加怪物生成速度！
                adjustDifficulty();

                // 设置持续时间（取消之前的定时器，避免旧武器的定时器影响新武器）
                if (player.weapon._timer) {
                    clearTimeout(player.weapon._timer);
                    player.weapon._timer = null;
                }
                if (weapon.duration > 0) {
                    const equippedType = this.weaponType;
                    player.weapon._timer = setTimeout(() => {
                        if (player.weapon.type === equippedType) {
                            player.weapon.type = 'rifle';
                            player.weapon.fireRate = weaponTypes.rifle.fireRate;
                            player.weapon.damage = weaponTypes.rifle.damage;
                            player.weapon.bulletCount = weaponTypes.rifle.bulletCount;
                            player.weapon._timer = null;
                            updateDamageDisplay();
                            // 武器失效后，恢复正常难度
                            adjustDifficulty();
                        }
                    }, weapon.duration);
                }

                return true;
            }
        }

        return this.z >= 1;
    }
}

// 数字门
class NumberGate {
    constructor() {
        this.z = 0;
        this.laneOffset = (Math.random() - 0.5) * 80;
        this.speed = GAME_CONSTANTS.GATE_SPEED;
        // 50%正数(+1到+5)，50%负数(-1到-3)
        if (Math.random() < 0.5) {
            this.number = 1 + Math.floor(Math.random() * 5);
        } else {
            this.number = -1 - Math.floor(Math.random() * 3);
        }
        this.hit = false;
        this.hitCount = 0; // 被击中次数，每10次数字+1
    }

    getScreenPosition() {
        const vanishingY = GAME_CONSTANTS.VANISHING_POINT_Y;
        const y = vanishingY + (canvas.height - vanishingY - 100) * this.z;
        const scale = 0.3 + this.z * 0.7;
        const x = canvas.width / 2 + this.laneOffset * scale;
        return { x, y, scale };
    }

    draw() {
        if (this.hit) return;

        const pos = this.getScreenPosition();
        // 宽度随数字绝对值增大：基础80，每+1增加15px
        const baseWidth = 80 + Math.abs(this.number) * 15;
        const width = baseWidth * pos.scale;
        const height = 100 * pos.scale;

        ctx.save();

        const gateColor = this.number >= 0 ? '#8eff71' : '#ff7351';
        ctx.strokeStyle = gateColor;
        ctx.lineWidth = 4 * pos.scale;
        ctx.shadowBlur = 15 * pos.scale;
        ctx.shadowColor = gateColor;

        // 左柱
        ctx.strokeRect(pos.x - width/2, pos.y - height/2, 10 * pos.scale, height);
        // 右柱
        ctx.strokeRect(pos.x + width/2 - 10 * pos.scale, pos.y - height/2, 10 * pos.scale, height);
        // 顶部
        ctx.strokeRect(pos.x - width/2, pos.y - height/2, width, 10 * pos.scale);

        // 数字
        ctx.fillStyle = gateColor;
        ctx.font = `bold ${40 * pos.scale}px "Plus Jakarta Sans"`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.number >= 0 ? `+${this.number}` : this.number, pos.x, pos.y);

        // 击中进度条（显示距离下次升级还差几次）
        if (this.hitCount > 0 && this.number > 0) {
            const progress = (this.hitCount % 10) / 10;
            const barWidth = width * 0.8;
            ctx.fillStyle = 'rgba(142,255,113,0.3)';
            ctx.fillRect(pos.x - barWidth/2, pos.y + height/2 - 8 * pos.scale, barWidth, 5 * pos.scale);
            ctx.fillStyle = '#8eff71';
            ctx.fillRect(pos.x - barWidth/2, pos.y + height/2 - 8 * pos.scale, barWidth * progress, 5 * pos.scale);
        }

        ctx.restore();
    }

    onHit() {
        this.hitCount++;
        // 每击中10次，数字+1（正数门变得更有价值）
        if (this.hitCount % 10 === 0) {
            this.number++;
        }
    }

    update() {
        this.z += this.speed;

        if (this.z > 0.9 && !this.hit) {
            this.hit = true;
            playSound('gate');
            const oldCount = player.count;
            player.count = Math.max(1, player.count + this.number);

            if (player.count > oldCount) {
                adjustDifficulty();
            }

            return true;
        }

        return this.z >= 1;
    }
}

class Bullet {
    constructor(targetEnemy, spread = 0, damage = null) {
        this.x = player.x;
        this.y = player.y - 20;
        this.target = targetEnemy;
        this.speed = GAME_CONSTANTS.BULLET_SPEED;
        this.progress = 0;
        this.spread = spread; // 散射偏移
        this.damage = damage !== null ? damage : player.weapon.damage; // 创建时就记录伤害值
    }

    draw() {
        if (this.progress >= 1) return;

        const startPos = { x: player.x, y: player.y - 20 };
        let endPos;

        if (this.target && this.target.getScreenPosition) {
            endPos = this.target.getScreenPosition();
        } else {
            endPos = { x: this.x, y: 0 };
        }

        const x = startPos.x + (endPos.x - startPos.x + this.spread) * this.progress;
        const y = startPos.y + (endPos.y - startPos.y) * this.progress;

        ctx.save();
        ctx.shadowBlur = 10;
        ctx.shadowColor = player.weapon.color || weaponTypes[player.weapon.type]?.color || '#ff7948';

        ctx.fillStyle = player.weapon.color || weaponTypes[player.weapon.type]?.color || '#ff7948';
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    update() {
        this.progress += this.speed;

        // 每帧检测击中数字门（仅当子弹目标不是敌人时才触发门）
        // 避免打怪物的子弹误触发门，导致玩家数量被意外改变
        if (!this._gateHitDone && !(this.target instanceof Enemy)) {
            let targetPos;
            if (this.target && this.target.getScreenPosition) {
                targetPos = this.target.getScreenPosition();
            } else {
                targetPos = { x: this.x, y: 0 };
            }
            const bulletX = player.x + (targetPos.x - player.x + this.spread) * this.progress;
            const bulletY = player.y - 20 + (targetPos.y - (player.y - 20)) * this.progress;

            game.numberGates.forEach(gate => {
                if (!gate.hit && gate.z > 0.3 && gate.z < 0.9) {
                    const gatePos = gate.getScreenPosition();
                    const dist = Math.hypot(bulletX - gatePos.x, bulletY - gatePos.y);
                    if (dist < GAME_CONSTANTS.GATE_HIT_THRESHOLD * gatePos.scale) {
                        gate.onHit();
                        this._gateHitDone = true; // 每颗子弹只命中一次
                    }
                }
            });
        }

        if (this.progress >= 1) {
            // 击中敌人 - 使用子弹自己的伤害值
            if (this.target && this.target.hp !== undefined && this.target.hp > 0) {
                this.target.hp -= this.damage;
            }
            return true;
        }

        return false;
    }
}

// 自动射击
function autoFire(time) {
    if (time - player.weapon.lastFire < player.weapon.fireRate) return;

    // 找到可射击范围内的所有敌人
    const targets = game.enemies
        .filter(e => e.z > 0.2 && e.hp > 0)
        .sort((a, b) => b.z - a.z); // 从近到远排序

    if (targets.length > 0) {
        // 同时射击多个最近的敌人（数量 = player.count，最多5个）
        const maxTargets = Math.min(targets.length, Math.max(1, Math.floor(player.count)));
        const currentDamage = player.weapon.damage;

        for (let t = 0; t < maxTargets; t++) {
            const targetEnemy = targets[t];
            for (let i = 0; i < player.weapon.bulletCount; i++) {
                const spread = (i - (player.weapon.bulletCount - 1) / 2) * 20;
                game.bullets.push(new Bullet(targetEnemy, spread, currentDamage));
            }
        }
        playSound('shoot');
        player.weapon.lastFire = time;
    }
}

// UI事件
// BLOCK-002: Wave-start weapon selection (L0 AC-003 Scenario 5)
document.getElementById('start-wave').addEventListener('click', () => {
    if (game.waveActive) return;
    // Show weapon selection modal before starting wave
    if (typeof weaponWaveSelect !== 'undefined') {
        weaponWaveSelect.show();
    } else {
        // Fallback: start wave directly if weaponWaveSelect not loaded
        game.waveActive = true;
        spawnWave();
    }
});

// 攻击力调整按钮
document.getElementById('damage-decrease').addEventListener('click', () => {
    player.weapon.damage = Math.max(10, player.weapon.damage - 10);
    weaponTypes.rifle.damage = player.weapon.damage;
    updateDamageDisplay();
});

document.getElementById('damage-increase').addEventListener('click', () => {
    player.weapon.damage += 10;
    weaponTypes.rifle.damage = player.weapon.damage;
    updateDamageDisplay();
});

document.getElementById('damage-max').addEventListener('click', () => {
    player.weapon.damage = 999;
    weaponTypes.rifle.damage = player.weapon.damage;
    updateDamageDisplay();
});

// 计算玩家实力系数
function getPlayerPowerLevel() {
    let powerLevel = 1;

    // 武器加成
    if (player.weapon.type === 'machinegun') powerLevel += 1;
    else if (player.weapon.type === 'shotgun') powerLevel += 1.5;
    else if (player.weapon.type === 'laser') powerLevel += 2;

    // 玩家数量加成
    powerLevel += Math.min(player.count / 5, 3); // 最多3倍加成

    return powerLevel;
}

// 动态调整难度
function adjustDifficulty() {
    if (!game.waveActive) return;

    const powerLevel = getPlayerPowerLevel();

    // 根据实力调整生成速度（实力越高，生成越快）
    const newSpawnRate = Math.max(100, game.baseSpawnRate / powerLevel);

    // 如果正在生成中，重启生成器
    if (game.spawnInterval) {
        clearInterval(game.spawnInterval);
        continueSpawning(newSpawnRate);
    }
}

let totalToSpawn = 0;
let alreadySpawned = 0;

function continueSpawning(spawnRate) {
    game.spawnInterval = setInterval(() => {
        if (alreadySpawned >= totalToSpawn) {
            clearInterval(game.spawnInterval);
            game.spawnInterval = null;
            return;
        }

        // 密集生成，一次生成3-5个排成一排
        const batchSize = 3 + Math.floor(Math.random() * 3);
        const baseLaneOffset = (Math.random() - 0.5) * 80;

        for (let i = 0; i < batchSize; i++) {
            const laneOffset = baseLaneOffset + (Math.random() - 0.5) * 30;
            game.enemies.push(new Enemy(game.wave, laneOffset));
            alreadySpawned++;
            if (alreadySpawned >= totalToSpawn) break;
        }

        // 随机生成武器掉落
        if (Math.random() < 0.08) {
            game.weaponDrops.push(new WeaponDrop());
        }

        // 随机生成数字门（降低频率，保持稀缺感）
        if (Math.random() < 0.04) {
            game.numberGates.push(new NumberGate());
        }
    }, spawnRate);
}

function spawnWave() {
    const powerLevel = getPlayerPowerLevel();

    // 根据实力调整怪物数量（实力越高，怪物越多）
    totalToSpawn = Math.floor((8 + game.wave * 4) * powerLevel);
    alreadySpawned = 0;

    // 根据实力调整生成速度
    const spawnRate = Math.max(100, game.baseSpawnRate / powerLevel);

    continueSpawning(spawnRate);
}

function updateUI() {
    document.getElementById('gold').textContent = game.gold;
    document.getElementById('lives').textContent = game.lives;
    document.getElementById('wave').textContent = game.wave;
    // 等级 = 波次，进度条 = 当前波次/20
    const levelEl = document.getElementById('player-level');
    if (levelEl) levelEl.textContent = game.wave;
    const progressEl = document.querySelector('.level-progress');
    if (progressEl) progressEl.style.width = (game.wave / 20 * 100) + '%';
    updateDamageDisplay();
}

function updateDamageDisplay() {
    const damageDisplay = document.getElementById('damage-display');
    if (damageDisplay) {
        damageDisplay.textContent = player.weapon.damage;
    }
}

let gameOverFlag = false;
let gamePaused = false;
let cachedTime = 0;

function triggerGameOver() {
    gameOverFlag = true;
    playSound('gameover');
    saveHighScore();
    setTimeout(() => {
        document.getElementById('final-score').textContent = game.score;
        document.getElementById('final-wave').textContent = game.wave;
        document.getElementById('final-kills').textContent = Math.floor(game.score / 100);
        document.getElementById('gameover-modal').style.display = 'flex';
    }, 50);
}

// 暂停/恢复游戏
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !gameOverFlag) {
        gamePaused = !gamePaused;
        const pauseOverlay = document.getElementById('pause-overlay') || createPauseOverlay();
        pauseOverlay.style.display = gamePaused ? 'flex' : 'none';
    }
});

// 方向键状态监听 — 独立注册（职责单一，与 Escape 监听并列）[REQ-PLAYER-001~003, DD-006]
document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') {
        keys.ArrowLeft = true;  // REQ-PLAYER-001：按下左键
    }
    if (e.key === 'ArrowRight') {
        keys.ArrowRight = true; // REQ-PLAYER-002：按下右键
    }
});

document.addEventListener('keyup', (e) => {
    if (e.key === 'ArrowLeft') {
        keys.ArrowLeft = false;  // REQ-PLAYER-003：松开左键立即停止
    }
    if (e.key === 'ArrowRight') {
        keys.ArrowRight = false; // REQ-PLAYER-003：松开右键立即停止
    }
});

function createPauseOverlay() {
    const overlay = document.createElement('div');
    overlay.id = 'pause-overlay';
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.8);display:none;justify-content:center;align-items:center;z-index:9999;';
    overlay.innerHTML = '<div style="color:#8eff71;font-size:48px;font-family:Plus Jakarta Sans,sans-serif;text-shadow:0 0 20px #8eff71;">暂停 - 按ESC继续</div>';
    document.body.appendChild(overlay);
    return overlay;
}

let lastDamageUpdate = 0;
let enemiesSorted = false;

// 玩家位置更新函数 [REQ-PLAYER-001~007, DD-001~007]
// 在 gameLoop 每帧调用，位于 drawPlayer() 之前（REQ-PLAYER-007）
function updatePlayerPosition() {
    // ── 守卫条件：游戏暂停时不移动（REQ-PLAYER-005） ──────────────
    if (gamePaused) {
        return;
    }

    // ── 守卫条件：游戏结束时不移动（REQ-PLAYER-006，双重保护） ────
    if (gameOverFlag) {
        return;
    }

    // ── 守卫条件：弹窗期间禁止移动（decision.md 决策 4，DD-004）───
    if (!game.waveActive) {
        return;
    }

    // ── NaN 防御：player.x 异常时重置（BS-009，DD-007）─────────────
    // 必须在双键检测之前执行，确保任何执行路径下 NaN 都能被捕获（FIX: FND-CODE-001）
    if (isNaN(player.x)) {
        player.x = canvas.width / 2; // 重置为初始值 450
        return;
    }

    // ── 双键同时按住：速度抵消，不移动（BS-007，DD-003） ─────────
    if (keys.ArrowLeft && keys.ArrowRight) {
        return;
    }

    // ── 速度值（含防御性默认值，BS-008） ─────────────────────────
    const speed = player.speed ?? 5;

    // ── 位置计算（REQ-PLAYER-001 左移，REQ-PLAYER-002 右移） ─────
    let newX = player.x;
    if (keys.ArrowLeft) {
        newX = player.x - speed;     // REQ-PLAYER-001
    } else if (keys.ArrowRight) {
        newX = player.x + speed;     // REQ-PLAYER-002
    }

    // ── 边界钳制（REQ-PLAYER-004，DD-002） ───────────────────────
    // 边界由 GAME_CONSTANTS.ROAD_WIDTH 推导，不硬编码 150/750
    const leftBound = canvas.width / 2 - GAME_CONSTANTS.ROAD_WIDTH;  // = 150
    const rightBound = canvas.width / 2 + GAME_CONSTANTS.ROAD_WIDTH;  // = 750
    player.x = Math.max(leftBound, Math.min(rightBound, newX));
}

function gameLoop(time) {
    if (gameOverFlag) return;

    // 暂停时只渲染画面，不更新逻辑
    if (gamePaused) {
        requestAnimationFrame(gameLoop);
        return;
    }

    cachedTime = Date.now();
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    drawRoad();

    // 绘制和更新武器掉落
    game.weaponDrops = game.weaponDrops.filter(w => {
        const removed = w.update();
        if (!removed) w.draw();
        return !removed;
    });

    // 绘制和更新数字门
    game.numberGates = game.numberGates.filter(g => {
        const removed = g.update();
        if (!removed) g.draw();
        return !removed;
    });

    // 绘制和更新敌人（仅在敌人数组变化时排序）
    if (!enemiesSorted) {
        game.enemies.sort((a, b) => a.z - b.z);
        enemiesSorted = true;
    }

    game.enemies = game.enemies.filter(e => {
        if (e.hp <= 0) {
            game.gold += GAME_CONSTANTS.GOLD_PER_KILL;
            game.score += GAME_CONSTANTS.SCORE_PER_KILL;
            game.waveKills++;
            game.waveGoldEarned += GAME_CONSTANTS.GOLD_PER_KILL;
            playSound('kill');
            updateUI();
            const dropPos = e.getScreenPosition();
            weaponDropIntegration.createDrop(dropPos.x, e.z);
            enemiesSorted = false;
            return false;
        }
        if (e.update()) {
            game.lives--;
            updateUI();
            if (game.lives <= 0) {
                triggerGameOver();
            }
            enemiesSorted = false;
            return false;
        }
        e.draw();
        return true;
    });

    // 更新子弹
    game.bullets = game.bullets.filter(b => {
        const hit = b.update();
        if (!hit) b.draw();
        return !hit;
    });

    updatePlayerPosition(); // [REQ-PLAYER-007] 在 drawPlayer() 之前更新位置，确保渲染与位置同步
    drawPlayer();
    autoFire(time);

    // 显示当前武器
    ctx.save();
    ctx.fillStyle = player.weapon.color || weaponTypes[player.weapon.type]?.color || '#ff7948';
    ctx.font = 'bold 16px "Plus Jakarta Sans"';
    ctx.textAlign = 'left';
    ctx.shadowBlur = 10;
    ctx.shadowColor = player.weapon.color || weaponTypes[player.weapon.type]?.color || '#ff7948';
    ctx.fillText('武器: ' + (player.weapon.name || weaponTypes[player.weapon.type]?.name || player.weapon.type), 20, canvas.height - 20);

    // 显示攻击力
    ctx.fillStyle = '#ff7948';
    ctx.shadowColor = '#ff7948';
    ctx.fillText('攻击: ' + player.weapon.damage, 20, canvas.height - 45);

    // 显示玩家数量
    ctx.fillStyle = '#8eff71';
    ctx.shadowColor = '#8eff71';
    ctx.fillText('数量: x' + player.count, 20, canvas.height - 70);

    // 显示实力等级
    const powerLevel = getPlayerPowerLevel();
    const powerColor = powerLevel > 3 ? '#ff4848' : powerLevel > 2 ? '#ffeb3b' : '#8eff71';
    ctx.fillStyle = powerColor;
    ctx.shadowColor = powerColor;
    ctx.fillText('火力: ' + powerLevel.toFixed(1) + 'x', 20, canvas.height - 95);

    ctx.restore();

    // 节流更新右侧面板
    if (time - lastDamageUpdate > GAME_CONSTANTS.DOM_UPDATE_THROTTLE) {
        updateDamageDisplay();
        lastDamageUpdate = time;
    }

    // 检测武器掉落拾取
    weaponDropIntegration.checkCollection();

    // 更新和渲染合成动画
    weaponMergeAnimation.update();
    weaponMergeAnimation.render(ctx);

    if (game.waveActive && game.enemies.length === 0 && alreadySpawned >= totalToSpawn) {
        game.waveActive = false;
        playSound('waveclear');
        // 显示波次结算界面
        document.getElementById('cleared-wave').textContent = game.wave;
        document.getElementById('wave-kills').textContent = game.waveKills;
        document.getElementById('wave-gold').textContent = game.waveGoldEarned;
        document.getElementById('wave-score').textContent = game.score;
        document.getElementById('waveclear-modal').style.display = 'flex';
    }

    requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);

// 存档系统
function saveHighScore() {
    const best = parseInt(localStorage.getItem('shotm_best_score') || '0');
    if (game.score > best) {
        localStorage.setItem('shotm_best_score', game.score);
    }
}

function loadHighScore() {
    const best = localStorage.getItem('shotm_best_score');
    const el = document.getElementById('best-score');
    if (el && best) el.textContent = best;
}

loadHighScore();

// 下一波按钮
document.getElementById('next-wave-btn').addEventListener('click', () => {
    document.getElementById('waveclear-modal').style.display = 'none';
    game.wave++;
    game.waveKills = 0;
    game.waveGoldEarned = 0;
    updateUI();
    if (typeof weaponWaveSelect !== 'undefined') {
        weaponWaveSelect.show();
    } else {
        game.waveActive = true;
        spawnWave();
    }
});
