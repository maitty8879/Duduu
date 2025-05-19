const cozeV3Service = require('./services/cozeV3Service');

// 测试参数
const content = '生成一幅猫咪的图片';
const userId = 'test_user_' + Date.now();
const useStream = true;

console.log(`开始测试Coze V3聊天，内容: ${content}, 用户ID: ${userId}, 流模式: ${useStream}`);

async function testCozeV3Chat() {
    try {
        // 注册事件监听器
        if (useStream) {
            console.log('使用流式API测试:');
            
            // 监听delta事件
            cozeV3Service.on('delta', (content) => {
                console.log('Delta事件:', content);
            });
            
            // 监听图片URL事件
            cozeV3Service.on('image', (imageUrl) => {
                console.log('图片URL事件:', imageUrl);
            });
            
            // 监听标签事件
            cozeV3Service.on('tags', (tags) => {
                console.log('标签事件:', tags);
            });
            
            // 监听done事件
            cozeV3Service.on('done', () => {
                console.log('收到[DONE]事件');
            });
            
            // 监听完成事件
            cozeV3Service.on('complete', (result) => {
                console.log('完成事件:', result);
                console.log('\n测试完成');
            });
            
            // 启动聊天
            await cozeV3Service.chat(content, userId, true);
        } else {
            console.log('使用非流式API测试:');
            
            // 执行聊天
            const result = await cozeV3Service.chat(content, userId, false);
            console.log('聊天执行结果:', result);
            console.log('\n测试完成');
        }
    } catch (error) {
        console.error('测试失败:', error);
    }
}

// 执行测试
testCozeV3Chat(); 