/**
 * Player Movement Tests
 * L2 Trace: PLAYER-test-detail.md
 * Coverage: TC-001 ~ TC-CONSTRAINT-001 (18 test cases)
 *
 * Strategy: vm.runInContext with selective const/let → var transformation
 * exposes game state (player, keys, gamePaused, gameOverFlag, game, canvas)
 * on the vm sandbox so tests can mutate them between calls.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

// ─── Test Context Factory ─────────────────────────────────────────────────────

function createGameContext() {
    const mockCanvas = {
        width: 900,
        height: 700,
        getContext: () => ({
            clearRect: () => {}, fillRect: () => {}, strokeRect: () => {},
            beginPath: () => {}, arc: () => {}, fill: () => {}, stroke: () => {},
            moveTo: () => {}, lineTo: () => {}, closePath: () => {},
            save: () => {}, restore: () => {}, translate: () => {},
            rotate: () => {}, scale: () => {}, drawImage: () => {},
            createLinearGradient: () => ({ addColorStop: () => {} }),
            createRadialGradient: () => ({ addColorStop: () => {} }),
            measureText: () => ({ width: 0 }),
            fillText: () => {}, strokeText: () => {}, clip: () => {},
            setTransform: () => {}, resetTransform: () => {},
            shadowBlur: 0, shadowColor: '', fillStyle: '', strokeStyle: '',
            lineWidth: 1, font: '', textAlign: '', textBaseline: '',
            globalAlpha: 1, globalCompositeOperation: ''
        })
    };

    const mockElement = () => ({
        innerHTML: '', textContent: '', style: {},
        classList: { add: () => {}, remove: () => {}, contains: () => false },
        addEventListener: () => {}, removeEventListener: () => {},
        appendChild: () => {}
    });

    const MockAudioCtx = function () {
        return {
            createOscillator: () => ({
                connect: () => {}, start: () => {}, stop: () => {},
                frequency: { setValueAtTime: () => {}, exponentialRampToValueAtTime: () => {} },
                type: 'sine'
            }),
            createGain: () => ({
                connect: () => {},
                gain: { setValueAtTime: () => {}, exponentialRampToValueAtTime: () => {} }
            }),
            currentTime: 0, destination: {}, state: 'running', resume: () => {}
        };
    };

    const sandbox = {
        document: {
            getElementById: (id) => id === 'game-canvas' ? mockCanvas : mockElement(),
            createElement: () => mockElement(),
            body: mockElement(),
            addEventListener: () => {},
            removeEventListener: () => {}
        },
        window: { AudioContext: MockAudioCtx },
        AudioContext: MockAudioCtx,
        webkitAudioContext: MockAudioCtx,
        localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
        sessionStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
        requestAnimationFrame: () => {},
        cancelAnimationFrame: () => {},
        performance: { now: () => Date.now() },
        console: { log: () => {}, warn: () => {}, error: () => {} },
        setTimeout: () => {}, clearTimeout: () => {},
        setInterval: () => {}, clearInterval: () => {},
        Math, Date, Array, Object, String, Number, Boolean, Promise,
        parseInt, parseFloat, isNaN, isFinite, Infinity, NaN, JSON,
        Error, TypeError, RangeError
    };

    vm.createContext(sandbox);

    // Transform key top-level const/let to var so they become sandbox properties
    // (const/let in vm scripts are lexically scoped and not on the sandbox).
    let gameCode = fs.readFileSync(path.join(__dirname, '..', 'game.js'), 'utf8');
    gameCode = gameCode.replace(
        /^const (canvas|GAME_CONSTANTS|game|player|keys)\s*=/gm,
        'var $1 ='
    );
    gameCode = gameCode.replace(
        /^let (gamePaused|gameOverFlag)\s*=/gm,
        'var $1 ='
    );

    vm.runInContext(gameCode, sandbox, { filename: 'game.js' });

    return sandbox;
}

// ─── Shared setup helpers ──────────────────────────────────────────────────────

function setNormalState(ctx, overrides = {}) {
    ctx.gamePaused = false;
    ctx.gameOverFlag = false;
    ctx.game.waveActive = true;
    ctx.player.speed = 5;
    Object.assign(ctx.keys, { ArrowLeft: false, ArrowRight: false });
    Object.assign(ctx, overrides);
}

// ─── describe: 正常路径 ────────────────────────────────────────────────────────

describe('updatePlayerPosition() — 正常路径', () => {
    let ctx;
    beforeEach(() => { ctx = createGameContext(); });

    test('TC-001: 按住ArrowLeft键1帧，player.x从450变为445', () => {
        ctx.player.x = 450;
        setNormalState(ctx, { 'keys.ArrowLeft': undefined });
        ctx.keys.ArrowLeft = true;

        ctx.updatePlayerPosition();

        expect(ctx.player.x).toBe(445);
    });

    test('TC-002: player.x=152，按ArrowLeft，钳制后为150', () => {
        ctx.player.x = 152;
        setNormalState(ctx);
        ctx.keys.ArrowLeft = true;

        ctx.updatePlayerPosition(); // newX=147, clamped to 150

        expect(ctx.player.x).toBe(150);
    });

    test('TC-003: 按住ArrowRight键1帧，player.x从450变为455', () => {
        ctx.player.x = 450;
        setNormalState(ctx);
        ctx.keys.ArrowRight = true;

        ctx.updatePlayerPosition();

        expect(ctx.player.x).toBe(455);
    });

    test('TC-004: player.x=748，按ArrowRight，钳制后为750', () => {
        ctx.player.x = 748;
        setNormalState(ctx);
        ctx.keys.ArrowRight = true;

        ctx.updatePlayerPosition(); // newX=753, clamped to 750

        expect(ctx.player.x).toBe(750);
    });
});

// ─── describe: 边界钳制 ────────────────────────────────────────────────────────

describe('updatePlayerPosition() — 边界钳制', () => {
    let ctx;
    beforeEach(() => { ctx = createGameContext(); setNormalState(ctx); });

    test('TC-005: player.x=150，按ArrowLeft连续3帧，player.x保持150', () => {
        ctx.player.x = 150;
        ctx.keys.ArrowLeft = true;

        ctx.updatePlayerPosition();
        ctx.updatePlayerPosition();
        ctx.updatePlayerPosition();

        expect(ctx.player.x).toBe(150);
    });

    test('TC-006: player.x=750，按ArrowRight连续3帧，player.x保持750', () => {
        ctx.player.x = 750;
        ctx.keys.ArrowRight = true;

        ctx.updatePlayerPosition();
        ctx.updatePlayerPosition();
        ctx.updatePlayerPosition();

        expect(ctx.player.x).toBe(750);
    });

    test('TC-EDGE-001: player.x=152，speed=5，按ArrowLeft，newX=147被钳制为150', () => {
        ctx.player.x = 152;
        ctx.keys.ArrowLeft = true;

        ctx.updatePlayerPosition();

        expect(ctx.player.x).toBe(150);
        expect(ctx.player.x).not.toBe(147);
    });

    test('TC-EDGE-002: player.x=748，speed=5，按ArrowRight，newX=753被钳制为750', () => {
        ctx.player.x = 748;
        ctx.keys.ArrowRight = true;

        ctx.updatePlayerPosition();

        expect(ctx.player.x).toBe(750);
        expect(ctx.player.x).not.toBe(753);
    });
});

// ─── describe: 守卫条件 ────────────────────────────────────────────────────────

describe('updatePlayerPosition() — 守卫条件', () => {
    let ctx;
    beforeEach(() => { ctx = createGameContext(); ctx.player.speed = 5; });

    test('TC-007: gamePaused=true，按ArrowLeft 5帧，player.x保持450', () => {
        ctx.player.x = 450;
        ctx.gamePaused = true;
        ctx.gameOverFlag = false;
        ctx.game.waveActive = true;
        ctx.keys.ArrowLeft = true;

        for (let i = 0; i < 5; i++) ctx.updatePlayerPosition();

        expect(ctx.player.x).toBe(450);
    });

    test('TC-010: gameOverFlag=true，按ArrowRight，player.x保持450', () => {
        ctx.player.x = 450;
        ctx.gamePaused = false;
        ctx.gameOverFlag = true;
        ctx.game.waveActive = false;
        ctx.keys.ArrowRight = true;

        ctx.updatePlayerPosition();

        expect(ctx.player.x).toBe(450);
    });

    test('TC-012: ArrowLeft和ArrowRight同时按住，player.x保持不变', () => {
        ctx.player.x = 450;
        ctx.gamePaused = false;
        ctx.gameOverFlag = false;
        ctx.game.waveActive = true;
        ctx.keys.ArrowLeft = true;
        ctx.keys.ArrowRight = true;

        ctx.updatePlayerPosition();

        expect(ctx.player.x).toBe(450);
    });
});

// ─── describe: 松键停止 ────────────────────────────────────────────────────────

describe('keys 状态 — 松键停止', () => {
    let ctx;
    beforeEach(() => { ctx = createGameContext(); setNormalState(ctx); });

    test('TC-008: ArrowLeft松开后，连续3帧 player.x不继续左移', () => {
        ctx.player.x = 430;
        ctx.keys.ArrowLeft = false;

        ctx.updatePlayerPosition();
        ctx.updatePlayerPosition();
        ctx.updatePlayerPosition();

        expect(ctx.player.x).toBe(430);
    });

    test('TC-009: ArrowRight松开后，连续3帧 player.x不继续右移', () => {
        ctx.player.x = 470;
        ctx.keys.ArrowRight = false;

        ctx.updatePlayerPosition();
        ctx.updatePlayerPosition();
        ctx.updatePlayerPosition();

        expect(ctx.player.x).toBe(470);
    });
});

// ─── describe: 防御性处理 ──────────────────────────────────────────────────────

describe('updatePlayerPosition() — 防御性处理', () => {
    let ctx;
    beforeEach(() => { ctx = createGameContext(); setNormalState(ctx); });

    test('TC-EDGE-003: player.speed=undefined，按ArrowLeft，使用默认speed=5，player.x不为NaN', () => {
        ctx.player.x = 450;
        ctx.player.speed = undefined; // ?? fallback to 5
        ctx.keys.ArrowLeft = true;

        ctx.updatePlayerPosition();

        expect(isNaN(ctx.player.x)).toBe(false);
        expect(ctx.player.x).toBe(445); // fallback speed=5
    });

    test('TC-EDGE-004: player.x=NaN，调用后重置为450（canvas.width/2）', () => {
        ctx.player.x = NaN;
        ctx.keys.ArrowLeft = true;

        ctx.updatePlayerPosition();

        expect(isNaN(ctx.player.x)).toBe(false);
        expect(ctx.player.x).toBe(450); // canvas.width/2 = 900/2
    });

    test('TC-EDGE-005: keydown事件1帧内触发5次，player.x只移动1次speed', () => {
        ctx.player.x = 450;

        // OS key-repeat fires keydown 5× — each sets keys.ArrowLeft=true (idempotent)
        for (let i = 0; i < 5; i++) ctx.keys.ArrowLeft = true;

        // Single frame: updatePlayerPosition called once
        ctx.updatePlayerPosition();

        // Should move only 5px (one speed unit), not 25px (5×speed)
        expect(ctx.player.x).toBe(445);
    });
});

// ─── describe: 集成 — gameLoop 调用顺序 ──────────────────────────────────────

describe('集成 — gameLoop 调用顺序', () => {
    let ctx;
    beforeEach(() => { ctx = createGameContext(); setNormalState(ctx); });

    test('TC-011: updatePlayerPosition先于autoFire执行，子弹.x等于更新后的player.x', () => {
        ctx.player.x = 450;
        ctx.player.weapon.lastFire = 0;
        ctx.player.weapon.fireRate = 50;
        ctx.keys.ArrowRight = true;

        // Provide a valid enemy to trigger autoFire bullet creation
        ctx.game.enemies = [{ z: 0.8, hp: 100 }];
        ctx.game.bullets = [];

        const time = 1000; // >> lastFire(0) + fireRate(50), so shot fires

        // Simulate gameLoop call order: updatePlayerPosition → autoFire
        ctx.updatePlayerPosition(); // player.x: 450 → 455
        ctx.autoFire(time);         // Bullet constructor: this.x = player.x = 455

        expect(ctx.player.x).toBe(455);
        expect(ctx.game.bullets.length).toBeGreaterThanOrEqual(1);
        expect(ctx.game.bullets[0].x).toBe(455); // REQ-PLAYER-008
    });

    test('TC-EDGE-006: 暂停->取消暂停->继续移动（状态流转）', () => {
        ctx.player.x = 450;
        ctx.gamePaused = true;
        ctx.keys.ArrowLeft = true;

        // Phase 1: paused — no movement
        ctx.updatePlayerPosition();
        ctx.updatePlayerPosition();
        expect(ctx.player.x).toBe(450);

        // Phase 2: unpause — movement resumes
        ctx.gamePaused = false;
        ctx.updatePlayerPosition();
        expect(ctx.player.x).toBe(445);
    });
});

// ─── describe: 性能 ────────────────────────────────────────────────────────────

describe('性能', () => {
    test('TC-PERF-001: updatePlayerPosition()连续执行100帧，平均耗时<=1ms', () => {
        const ctx = createGameContext();
        ctx.player.x = 450;
        ctx.player.speed = 5;
        ctx.gamePaused = false;
        ctx.gameOverFlag = false;
        ctx.game.waveActive = true;
        ctx.keys.ArrowLeft = true;
        ctx.keys.ArrowRight = false;

        let totalTime = 0;
        const sampleCount = 100;

        for (let i = 0; i < sampleCount; i++) {
            const t0 = Date.now();
            ctx.updatePlayerPosition();
            totalTime += Date.now() - t0;
            if (ctx.player.x <= 150) ctx.player.x = 450; // reset to avoid boundary locking
        }

        const avgTime = totalTime / sampleCount;
        expect(avgTime).toBeLessThanOrEqual(1.0);
    });
});

// ─── describe: 约束 ────────────────────────────────────────────────────────────

describe('约束', () => {
    test('TC-CONSTRAINT-001: weapon*.js 不包含 mobile-warrior-system 专属代码', () => {
        const root = path.join(__dirname, '..');

        const gameJs = fs.readFileSync(path.join(root, 'game.js'), 'utf8');
        const weaponMgr = fs.readFileSync(path.join(root, 'weaponManager.js'), 'utf8');
        const weaponUI = fs.readFileSync(path.join(root, 'weaponUI.js'), 'utf8');
        const weaponWave = fs.readFileSync(path.join(root, 'weaponWaveSelect.js'), 'utf8');

        // Confirm mobile-warrior-system code is in game.js
        expect(gameJs).toContain('updatePlayerPosition');
        expect(gameJs).toContain('ArrowLeft');
        expect(gameJs).toContain('player.speed ?? 5');

        // Confirm weapon files were NOT touched by mobile-warrior-system
        expect(weaponMgr).not.toContain('updatePlayerPosition');
        expect(weaponUI).not.toContain('updatePlayerPosition');
        expect(weaponWave).not.toContain('updatePlayerPosition');

        // Weapon files must still exist (not deleted)
        expect(fs.existsSync(path.join(root, 'weaponManager.js'))).toBe(true);
        expect(fs.existsSync(path.join(root, 'weaponUI.js'))).toBe(true);
        expect(fs.existsSync(path.join(root, 'weaponWaveSelect.js'))).toBe(true);
    });
});
