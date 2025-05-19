const cozeService = require('./services/cozeService');

async function testCozeIDE() {
    console.log('开始测试 Coze IDE 项目集成...');
    
    const prompt = "一只可爱的猫咪，坐在窗台上看着窗外的雨";
    console.log('提示词:', prompt);

    try {
        // 1. 使用事件监听器处理流式响应
        console.log('测试流式响应:');
        
        // 注册事件处理器
        cozeService.on('delta', (content) => {
            console.log('收到内容:', content);
        });
        
        cozeService.on('image', (imageUrl) => {
            console.log('收到图片URL:', imageUrl);
        });
        
        cozeService.on('tags', (tags) => {
            console.log('收到标签:', tags);
        });
        
        cozeService.on('complete', (result) => {
            console.log('完成:', result);
            
            // 移除所有监听器
            cozeService.removeAllListeners();
            
            // 继续测试非流式响应
            testNonStream();
        });
        
        // 开始调用
        console.log('开始调用流式 API...');
        await cozeService.runWorkflow(prompt, true);
    } catch (error) {
        console.log('流式测试失败:', error.message);
        
        // 如果流式测试失败，尝试非流式测试
        testNonStream();
    }
}

async function testNonStream() {
    console.log('\n测试非流式响应:');
    
    const prompt = "一只可爱的猫咪，坐在窗台上看着窗外的雨";
    
    try {
        console.log('开始调用非流式 API...');
        const result = await cozeService.runWorkflow(prompt, false);
        console.log('非流式测试结果:', result);
        
        if (result.imageUrl) {
            console.log('测试成功! 图片URL:', result.imageUrl);
        } else {
            console.log('未获取到图片URL，但 API 调用成功');
        }
    } catch (error) {
        console.log('非流式测试失败:', error.message);
    }
    
    console.log('测试完成');
    process.exit(0);
}

// 启动测试
testCozeIDE(); 