const cozeService = require('./services/cozeService');

// 测试参数
const prompt = '一只可爱的猫咪，坐在窗台上看着窗外的雨';
const useStream = true;

console.log(`开始测试Coze工作流，提示词: ${prompt}, 流模式: ${useStream}`);

async function testCozeWorkflow() {
    try {
        // 注册事件监听器
        if (useStream) {
            console.log('使用流式API测试:');
            
            // 监听delta事件
            cozeService.on('delta', (content) => {
                console.log('Delta事件:', content);
            });
            
            // 监听图片URL事件
            cozeService.on('image', (imageUrl) => {
                console.log('图片URL事件:', imageUrl);
            });
            
            // 监听标签事件
            cozeService.on('tags', (tags) => {
                console.log('标签事件:', tags);
            });
            
            // 监听完成事件
            cozeService.on('complete', (result) => {
                console.log('完成事件:', result);
                console.log('\n测试完成');
            });
            
            // 启动工作流
            await cozeService.runWorkflow(prompt, true);
        } else {
            console.log('使用非流式API测试:');
            
            // 执行工作流
            const result = await cozeService.runWorkflow(prompt, false);
            console.log('工作流执行结果:', result);
            console.log('\n测试完成');
        }
    } catch (error) {
        console.error('测试失败:', error);
    }
}

// 执行测试
testCozeWorkflow(); 