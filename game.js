const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
canvas.width = 900;
canvas.height = 700;

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
    baseSpawnRate: 400 // 基础生成速度
};

// 玩家角色（在底部）
const player = {
    x: canvas.width / 2,
    y: canvas.height - 120,
    width: 50,
    height: 60,
    count: 1, // 玩家数量（像数字门游戏）
    weapon: {
        type: 'rifle',
        fireRate: 50,
        lastFire: 0,
        damage: 50, // 超强火力！从25大幅提升到50
        bulletCount: 1 // 每次发射子弹数量
    }
};

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

const enemyImages = [
    'https://lh3.googleusercontent.com/aida-public/AB6AXuAP3gybmjJX2gwL6rmIztwjGaIcwFaIcE9FyjIYcYVL_o1lH4uoeyoOnFkIRpwaOi64iaPsU-mizOAHCgsiLpBcNY6TNuwTavIyZVHnD_oVsExRL1-V27M2ozAkhJKyyvcuhfzfMH8TU_Al_2WZwytrbMkloga_oL52L0J_857QGHziil7b3zd4dEVQOgS5cglzNh0X8KrwMmcUr-Z3NIOEIdEiivZ8OXGw-3qfh8PzG23bQwLljFr-yuFGyAmavKmT7Mn49uOpa8O1',
    'https://lh3.googleusercontent.com/aida-public/AB6AXuD1UdcHQJJlFnz04j4NWwYyWxfHLcGiYRxIfJ4z0Ps6EvZL4V-c_VnCIQt1WprHFOX7yLN0neCe45URrEtkZUT_3uf-mupzUAsF9Z369wo4IpsoyMDZ3cInLIkJjHyGIjH87RoFLc-_c3s_nzX8dGmTo1f_B-JR_q2w_SeWqBdw8YLSKl3obebgPwD5kpob27NRK1fWB5oiazl9s-eutkkDw7J3ThPjfP5KAQA7VWx0DayKe0V6HaBCD9CHeCTtF_e1YlnEhypFhSJh',
    'https://lh3.googleusercontent.com/aida-public/AB6AXuCAaD3h-U4iwpbFnRmdBwOefEJDHdSDOIKiAkBabjhwIn9vpmwURWlG1LJX_rxKKtq2ssXCoMSHn95shhaDBa-yJyKQvdlNhRlgAVGVxTswssVU0QPW4TOZATjwCE4FZZjm-fTsxKHArg-Ed5F60t7uiG3JLmxo-HTnI3A2kQAHHDLj6U-E-tKXpIjfKkmGXW4XgKfsyQLyUxGen7aZpLQeu0vrYcabmV2wUBlk6NIkCvoT-nHmx2Q1PS1HZdSXtI1-hdB_mINzEGT9'
];

// 预加载图片
const imageCache = {};
function preloadImages() {
    enemyImages.forEach(src => {
        const img = new Image();
        img.src = src;
        imageCache[src] = img;
    });
}
preloadImages();

// 绘制透视道路
function drawRoad() {
    // 背景渐变
    const bgGradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    bgGradient.addColorStop(0, '#1a1a3e');
    bgGradient.addColorStop(1, '#0c0c1f');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 绘制透视道路
    const roadWidth = 300;
    const vanishingPointY = 50;

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

// 绘制玩家角色
function drawPlayer() {
    // 根据数量绘制多个小人
    const spacing = 15;
    const startX = player.x - (player.count - 1) * spacing / 2;

    for (let i = 0; i < Math.min(player.count, 10); i++) {
        const px = startX + i * spacing;

        ctx.save();
        ctx.translate(px, player.y);

        // 阴影
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.beginPath();
        ctx.ellipse(0, 30, 12, 4, 0, 0, Math.PI * 2);
        ctx.fill();

        // 身体（机器人风格）- 缩小版
        const bodyGradient = ctx.createLinearGradient(-10, -20, 10, 20);
        bodyGradient.addColorStop(0, '#00e3fd');
        bodyGradient.addColorStop(0.5, '#00d4ec');
        bodyGradient.addColorStop(1, '#0088aa');

        // 头部
        ctx.fillStyle = bodyGradient;
        ctx.fillRect(-8, -20, 16, 12);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(-8, -20, 16, 12);

        // 眼睛发光
        ctx.fillStyle = '#8eff71';
        ctx.fillRect(-5, -16, 3, 3);
        ctx.fillRect(2, -16, 3, 3);

        // 躯干
        ctx.fillStyle = bodyGradient;
        ctx.fillRect(-10, -6, 20, 15);
        ctx.strokeStyle = '#ffffff';
        ctx.strokeRect(-10, -6, 20, 15);

        // 手臂
        ctx.fillStyle = '#0088aa';
        ctx.fillRect(-12, -4, 3, 8);
        ctx.fillRect(9, -4, 3, 8);

        // 腿
        ctx.fillRect(-8, 9, 5, 8);
        ctx.fillRect(3, 9, 5, 8);

        // 只给中间的绘制武器
        if (i === Math.floor(player.count / 2)) {
            ctx.fillStyle = weaponTypes[player.weapon.type].color;
            ctx.shadowBlur = 10;
            ctx.shadowColor = weaponTypes[player.weapon.type].color;
            ctx.fillRect(8, -10, 15, 4);
            ctx.fillRect(20, -11, 5, 6);

            // 枪口发光
            ctx.fillStyle = '#ffeb3b';
            ctx.beginPath();
            ctx.arc(25, -8, 2, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }

    // 如果数量超过10，显示数字
    if (player.count > 10) {
        ctx.save();
        ctx.fillStyle = '#8eff71';
        ctx.font = 'bold 20px "Plus Jakarta Sans"';
        ctx.textAlign = 'center';
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#8eff71';
        ctx.fillText('x' + player.count, player.x, player.y - 40);
        ctx.restore();
    }
}

class Enemy {
    constructor(wave, customLaneOffset = null) {
        this.z = 0; // 深度，0是远处，1是近处
        this.laneOffset = customLaneOffset !== null ? customLaneOffset : (Math.random() - 0.5) * 100; // 左右偏移
        this.hp = 10 + wave * 5; // 再次降低！从15+wave*5改到10+wave*5，第一波只有10HP
        this.maxHp = this.hp;
        this.speed = 0.0015 + wave * 0.0001;
        this.imageSrc = enemyImages[Math.floor(Math.random() * enemyImages.length)];
        this.image = imageCache[this.imageSrc];
        this.baseSize = 40;
    }

    getScreenPosition() {
        // 根据深度计算屏幕位置（透视投影）
        const vanishingY = 50;
        const roadWidth = 300;

        const y = vanishingY + (canvas.height - vanishingY - 100) * this.z;
        const scale = 0.3 + this.z * 0.7; // 近大远小
        const xSpread = 50 + (roadWidth - 50) * this.z;
        const x = canvas.width / 2 + this.laneOffset * scale;

        return { x, y, scale };
    }

    draw() {
        const pos = this.getScreenPosition();
        const size = this.baseSize * pos.scale;

        if (this.image && this.image.complete) {
            ctx.save();

            ctx.shadowBlur = 15 * pos.scale;
            ctx.shadowColor = 'rgba(255, 72, 96, 0.6)';

            ctx.drawImage(this.image, pos.x - size/2, pos.y - size/2, size, size);

            ctx.restore();
        }

        // HP条
        const hpPercent = this.hp / this.maxHp;
        const barWidth = 50 * pos.scale;
        const barHeight = 4 * pos.scale;
        const barX = pos.x - barWidth/2;
        const barY = pos.y - size/2 - 15 * pos.scale;

        ctx.fillStyle = '#8eff71';
        ctx.fillRect(barX, barY, barWidth * hpPercent, barHeight);

        ctx.strokeStyle = 'rgba(142, 255, 113, 0.3)';
        ctx.lineWidth = 1;
        ctx.strokeRect(barX, barY, barWidth, barHeight);

        // HP数字
        if (pos.scale > 0.5) {
            ctx.fillStyle = '#ffffff';
            ctx.font = `bold ${14 * pos.scale}px "Plus Jakarta Sans"`;
            ctx.textAlign = 'center';
            ctx.fillText(Math.ceil(this.hp), pos.x, pos.y);
        }
    }

    update() {
        this.z += this.speed;
        return this.z >= 1; // 到达终点
    }
}

// 武器掉落
class WeaponDrop {
    constructor() {
        this.z = 0;
        this.laneOffset = (Math.random() - 0.5) * 100;
        this.speed = 0.0015; // 从0.003改到0.0015，和怪物速度一致
        const weaponKeys = Object.keys(weaponTypes).filter(k => k !== 'rifle');
        this.weaponType = weaponKeys[Math.floor(Math.random() * weaponKeys.length)];
        this.collected = false;
    }

    getScreenPosition() {
        const vanishingY = 50;
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
            if (dist < 50) {
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

                // 设置持续时间
                if (weapon.duration > 0) {
                    setTimeout(() => {
                        if (player.weapon.type === this.weaponType) {
                            player.weapon.type = 'rifle';
                            player.weapon.fireRate = weaponTypes.rifle.fireRate;
                            player.weapon.damage = weaponTypes.rifle.damage;
                            player.weapon.bulletCount = weaponTypes.rifle.bulletCount;
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
        this.speed = 0.0015; // 从0.003改到0.0015
        this.number = -5 - Math.floor(Math.random() * 10); // 初始负数
        this.hit = false;
    }

    getScreenPosition() {
        const vanishingY = 50;
        const y = vanishingY + (canvas.height - vanishingY - 100) * this.z;
        const scale = 0.3 + this.z * 0.7;
        const x = canvas.width / 2 + this.laneOffset * scale;
        return { x, y, scale };
    }

    draw() {
        if (this.hit) return;

        const pos = this.getScreenPosition();
        const width = 80 * pos.scale;
        const height = 100 * pos.scale;

        ctx.save();

        // 门框
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

        ctx.restore();
    }

    onHit() {
        this.number++; // 每次被击中数字+1
    }

    update() {
        this.z += this.speed;

        // 检测是否到达玩家
        if (this.z > 0.9 && !this.hit) {
            this.hit = true;
            // 改变玩家数量
            const oldCount = player.count;
            player.count = Math.max(1, this.number);

            // 如果玩家数量增加了，增加怪物生成速度
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
        this.speed = 0.02;
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
        ctx.shadowColor = weaponTypes[player.weapon.type].color;

        ctx.fillStyle = weaponTypes[player.weapon.type].color;
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    update() {
        this.progress += this.speed;

        if (this.progress >= 1) {
            // 检测击中数字门
            game.numberGates.forEach(gate => {
                if (!gate.hit && gate.z > 0.3 && gate.z < 0.9) {
                    const gatePos = gate.getScreenPosition();
                    const bulletX = player.x + (gatePos.x - player.x + this.spread) * this.progress;
                    const bulletY = player.y - 20 + (gatePos.y - (player.y - 20)) * this.progress;
                    const dist = Math.hypot(bulletX - gatePos.x, bulletY - gatePos.y);
                    if (dist < 40 * gatePos.scale) {
                        gate.onHit();
                    }
                }
            });

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
        // 射击最近的敌人
        const nearestEnemy = targets[0];

        // 记录当前伤害值
        const currentDamage = player.weapon.damage;

        // 根据武器类型发射多颗子弹
        for (let i = 0; i < player.weapon.bulletCount; i++) {
            const spread = (i - (player.weapon.bulletCount - 1) / 2) * 20;
            game.bullets.push(new Bullet(nearestEnemy, spread, currentDamage));
        }
        player.weapon.lastFire = time;
    }
}

// UI事件
document.getElementById('start-wave').addEventListener('click', () => {
    if (game.waveActive) return;
    game.waveActive = true;
    spawnWave();
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

        // 随机生成数字门
        if (Math.random() < 0.15) {
            game.numberGates.push(new NumberGate());
        }
    }, spawnRate);
}

function spawnWave() {
    const powerLevel = getPlayerPowerLevel();

    // 根据实力调整怪物数量（实力越高，怪物越多）
    // 第一波数量减少，从30改到20
    totalToSpawn = Math.floor((20 + game.wave * 8) * powerLevel);
    alreadySpawned = 0;

    // 根据实力调整生成速度
    const spawnRate = Math.max(100, game.baseSpawnRate / powerLevel);

    continueSpawning(spawnRate);
}

function updateUI() {
    document.getElementById('gold').textContent = game.gold;
    document.getElementById('lives').textContent = game.lives;
    document.getElementById('wave').textContent = game.wave;
    updateDamageDisplay();
}

function updateDamageDisplay() {
    const damageDisplay = document.getElementById('damage-display');
    if (damageDisplay) {
        damageDisplay.textContent = player.weapon.damage;
    }
}

function gameLoop(time) {
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

    // 绘制和更新敌人（远到近排序）
    game.enemies.sort((a, b) => a.z - b.z);

    game.enemies = game.enemies.filter(e => {
        if (e.hp <= 0) {
            game.gold += 10;
            game.score += 100;
            updateUI();
            return false;
        }
        if (e.update()) {
            game.lives--;
            updateUI();
            if (game.lives <= 0) {
                alert('游戏结束！得分: ' + game.score);
                location.reload();
            }
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

    drawPlayer();
    autoFire(time);

    // 显示当前武器
    ctx.save();
    ctx.fillStyle = weaponTypes[player.weapon.type].color;
    ctx.font = 'bold 16px "Plus Jakarta Sans"';
    ctx.textAlign = 'left';
    ctx.shadowBlur = 10;
    ctx.shadowColor = weaponTypes[player.weapon.type].color;
    ctx.fillText('武器: ' + weaponTypes[player.weapon.type].name, 20, canvas.height - 20);

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

    // 实时更新右侧面板的攻击力显示
    updateDamageDisplay();

    if (game.waveActive && game.enemies.length === 0 && alreadySpawned >= totalToSpawn) {
        game.waveActive = false;
        game.wave++;
        updateUI();
    }

    requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);
