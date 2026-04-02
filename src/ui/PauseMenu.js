// src/ui/PauseMenu.js
// REQ-UI-003: 暂停菜单（ESC 键触发）
// REQ-UI-002: 赛博朋克霓虹风格保持不变

/**
 * PauseMenu — 暂停菜单控制器
 *
 * 职责：监听 ESC 键，切换暂停状态，显示/隐藏暂停覆盖层。
 * 本项目使用 HTML Overlay 方式（非 Phaser Scene），
 * 暂停覆盖层由 DOM 元素实现，赛博朋克样式由 style.css 保证。
 */
export class PauseMenu {
    /**
     * @param {object} gameState - 游戏全局状态对象（game），
     *   需包含字段: gamePaused (boolean)
     * @param {Function} onPause - 暂停回调函数
     * @param {Function} onResume - 恢复回调函数
     */
    constructor(gameState, onPause, onResume) {
        // REQ-UI-003: 持有 gameState 引用用于读写暂停状态
        this._gameState = gameState;
        this._onPause = onPause;
        this._onResume = onResume;

        // 暂停覆盖层 DOM 元素引用
        this._overlay = null;

        // REQ-UI-003: 绑定 ESC 键事件
        this._handleKeyDown = this._handleKeyDown.bind(this);
        document.addEventListener('keydown', this._handleKeyDown);
    }

    /**
     * REQ-UI-003: ESC 键事件处理
     */
    _handleKeyDown(e) {
        if (e.key === 'Escape') {
            this.toggle();
        }
    }

    /**
     * REQ-UI-003: 切换暂停状态
     */
    toggle() {
        if (this._gameState.gamePaused) {
            this.resume();
        } else {
            this.pause();
        }
    }

    /**
     * REQ-UI-003: 暂停游戏
     */
    pause() {
        this._gameState.gamePaused = true;
        this._showOverlay();
        if (this._onPause) {
            this._onPause();
        }
    }

    /**
     * REQ-UI-003: 恢复游戏
     */
    resume() {
        this._gameState.gamePaused = false;
        this._hideOverlay();
        if (this._onResume) {
            this._onResume();
        }
    }

    /**
     * REQ-UI-003: 显示暂停覆盖层
     */
    _showOverlay() {
        if (this._overlay) return;

        // REQ-UI-002: 创建赛博朋克风格暂停覆盖层
        this._overlay = document.createElement('div');
        this._overlay.className = 'pause-overlay';
        this._overlay.innerHTML = `
            <div class="pause-content">
                <h2 class="neon-text">PAUSED</h2>
                <p>Press ESC to resume</p>
            </div>
        `;
        document.body.appendChild(this._overlay);
    }

    /**
     * REQ-UI-003: 隐藏暂停覆盖层
     */
    _hideOverlay() {
        if (this._overlay) {
            this._overlay.remove();
            this._overlay = null;
        }
    }

    /**
     * 清理资源
     */
    destroy() {
        document.removeEventListener('keydown', this._handleKeyDown);
        this._hideOverlay();
    }
}
