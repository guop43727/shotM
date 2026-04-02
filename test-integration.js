// E2E Test for Weapon Integration
// Run in browser console after loading index.html

console.log('=== 武器集成 E2E 测试 ===\n');

// Test 1: 武器掉落和拾取
console.log('测试1: 武器掉落');
weaponDropIntegration.createDrop(450, 350);
console.log('✓ 创建掉落成功');

// Test 2: 波次选择
console.log('\n测试2: 波次选择');
weaponManager.addWeapon('machinegun');
weaponWaveSelect.show();
console.log('✓ 显示波次选择界面');

// Test 3: 合成动画
console.log('\n测试3: 合成动画');
weaponMergeAnimation.playMergeEffect('rifle+');
console.log('✓ 播放合成动画');

console.log('\n=== E2E 测试完成 ===');
