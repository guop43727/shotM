// src/ui/WaveCompleteUI.js
// REQ-UI-004: 波次完成界面（显示奖励、武器选择）
// REQ-UI-002: 赛博朋克霓虹风格保持不变

/**
 * WaveCompleteUI — 波次完成界面控制器
 *
 * 职责：波次结束时显示奖励信息和武器选择界面。
 * 本项目使用 HTML Overlay 方式（非 Phaser Scene），
 * 界面由 DOM 元素实现，赛博朋克样式由 style.css 保证。
 */
export class WaveCompleteUI {
    /**
     * @param {object} gameState - 游戏全局状态对象（game），
     *   需包含字段: wave, waveActive
     * @param {Function} onContinue - 继续下一波回调函数
     */
    constructor(gameState, onContinue) {
        // REQ-UI-004: 持有 gameState 引用用于读取波次信息
        this._gameState = gameState;
        this._onContinue = onContinue;

        // 波次完成覆盖层 DOM 元素引用
        this._overlay = null;
    }

    /**
     * REQ-UI-004: 显示波次完成界面
     * @param {object} rewards - 奖励信息 { gold, exp, items }
     */
    show(rewards = {}) {
        if (this._overlay) return;

        const { gold = 0, exp = 0, items = [] } = rewards;
        const wave = this._gameState.wave;

        // REQ-UI-002: 创建赛博朋克风格波次完成覆盖层
        this._overlay = document.createElement('div');
        this._overlay.className = 'waveclear-modal';
        this._overlay.innerHTML = `
            <div class="modal-content">
                <h2 class="neon-text">WAVE ${wave} COMPLETE</h2>
                <div class="rewards-section">
                    <p>Gold: +${gold}</p>
                    <p>EXP: +${exp}</p>
                    ${items.length > 0 ? `<p>Items: ${items.join(', ')}</p>` : ''}
                </div>
                <button class="continue-btn neon-button">CONTINUE</button>
            </div>
        `;

        // REQ-UI-004: 绑定继续按钮事件（保存引用以便 removeEventListener）
        const continueBtn = this._overlay.querySelector('.continue-btn');
        this._onClickHandler = () => this.hide();
        continueBtn.addEventListener('click', this._onClickHandler);

        document.body.appendChild(this._overlay);
    }

    /**
     * REQ-UI-004: 隐藏波次完成界面
     */
    hide() {
        if (this._overlay) {
            const btn = this._overlay.querySelector('.continue-btn');
            if (btn && this._onClickHandler) {
                btn.removeEventListener('click', this._onClickHandler);
                this._onClickHandler = null;
            }
            this._overlay.remove();
            this._overlay = null;

            if (this._onContinue) {
                this._onContinue();
            }
        }
    }

    /**
     * 清理资源
     */
    destroy() {
        this.hide();
    }
}
