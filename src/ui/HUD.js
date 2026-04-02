// src/ui/HUD.js
// REQ-UI-001: 游戏 HUD 显示金币/生命/波次/分数
// REQ-UI-002: 赛博朋克霓虹风格保持不变
// REQ-UI-005: UI 响应式布局（适配不同屏幕）

/**
 * HUD — 游戏抬头显示器
 *
 * 职责：将金币/生命/波次/分数从 HTML DOM 元素中读取并保持同步。
 * 本项目使用 HTML Overlay 方式（非 Phaser DOM Element），
 * 因为项目基于原生 Canvas + HTML，而非 Phaser 引擎。
 * 赛博朋克样式由 style.css 中的 CSS 变量和 .neon-* 类保证。
 */
export class HUD {
    /**
     * @param {object} gameState - 游戏全局状态对象（game），
     *   需包含字段: gold, lives, wave, score
     */
    constructor(gameState) {
        // REQ-UI-001: 持有 gameState 引用用于读取数据
        this._gameState = gameState;

        // DOM 元素引用缓存，避免每帧 querySelector
        this._elements = {
            gold: document.getElementById('gold'),
            lives: document.getElementById('lives'),
            wave: document.getElementById('wave'),
            score: document.getElementById('score'),
            playerLevel: document.getElementById('player-level')
        };

        // 上一次渲染的值，用于脏检查避免不必要的 DOM 写入
        this._lastValues = {
            gold: null,
            lives: null,
            wave: null,
            score: null
        };

        // REQ-UI-001: 初始渲染
        this.update();
    }

    /**
     * REQ-UI-001: 更新 HUD 显示（脏检查优化）
     */
    update() {
        const { gold, lives, wave, score } = this._gameState;

        if (this._lastValues.gold !== gold && this._elements.gold) {
            this._elements.gold.textContent = gold;
            this._lastValues.gold = gold;
        }

        if (this._lastValues.lives !== lives && this._elements.lives) {
            this._elements.lives.textContent = lives;
            this._lastValues.lives = lives;
        }

        if (this._lastValues.wave !== wave) {
            if (this._elements.wave) {
                this._elements.wave.textContent = wave;
            }
            if (this._elements.playerLevel) {
                this._elements.playerLevel.textContent = wave;
            }
            this._lastValues.wave = wave;
        }

        if (this._lastValues.score !== score && this._elements.score) {
            this._elements.score.textContent = score;
            this._lastValues.score = score;
        }
    }
}
