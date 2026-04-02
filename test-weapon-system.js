// 武器系统自测脚本
console.log('=== 武器系统自测开始 ===\n');

// 测试1: 初始化
console.log('测试1: 初始化武器管理器');
const manager = new WeaponManager();
console.log('✓ WeaponManager 创建成功');
console.log('初始库存:', manager.getInventory());

// 测试2: 添加武器
console.log('\n测试2: 添加武器');
manager.addWeapon('rifle');
manager.addWeapon('rifle');
console.log('添加2把步枪后:', manager.getInventory());

// 测试3: 合成武器 (3:1)
console.log('\n测试3: 合成武器');
const result = manager.mergeWeapons('rifle');
console.log('合成结果:', result);
console.log('合成后库存:', manager.getInventory());

// 测试4: 获取进化树
console.log('\n测试4: 获取进化树');
const tree = manager.getEvolutionTree();
console.log('进化树节点数:', tree.length);
console.log('步枪路径:', tree.filter(n => n.id.includes('rifle')).map(n => n.id));

// 测试5: localStorage持久化
console.log('\n测试5: 持久化测试');
manager.saveInventory();
const newManager = new WeaponManager();
console.log('重新加载后库存:', newManager.getInventory());

console.log('\n=== 自测完成 ===');
