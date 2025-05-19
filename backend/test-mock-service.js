const mockCozeService = require('./services/mockCozeService');

async function testMockService() {
    console.log('开始测试模拟Coze服务...');
    
    const prompt = "一只可爱的猫咪，坐在窗台上看着窗外的雨";
    console.log('提示词:', prompt);

    // 1. 测试流式响应
    console.log('\n测试流式响应:');
    
    // 注册事件处理器
    mockCozeService.on('delta', (content) => {
        console.log('收到内容:', content);
    });
    
    mockCozeService.on('image', (imageUrl) => {
        console.log('收到图片URL:', imageUrl);
    });
    
    mockCozeService.on('tags', (tags) => {
        console.log('收到标签:', tags);
    });
    
    mockCozeService.on('complete', (result) => {
        console.log('完成:', result);
        
        // 移除所有监听器
        mockCozeService.removeAllListeners();
        
        // 继续测试非流式响应
        testNonStreamMock();
    });
    
    try {
        // 开始调用
        console.log('开始调用流式 API...');
        await mockCozeService.runWorkflow(prompt, true);
    } catch (error) {
        console.log('流式测试失败:', error.message);
        testNonStreamMock();
    }
}

async function testNonStreamMock() {
    console.log('\n测试非流式响应:');
    
    const prompt = "一只可爱的猫咪，坐在窗台上看着窗外的雨";
    
    try {
        console.log('开始调用非流式 API...');
        const result = await mockCozeService.runWorkflow(prompt, false);
        console.log('非流式测试结果:', result);
        
        if (result.imageUrl) {
            console.log('测试成功! 图片URL:', result.imageUrl);
        } else {
            console.log('未获取到图片URL');
        }
    } catch (error) {
        console.log('非流式测试失败:', error.message);
    }
    
    console.log('测试完成');
    process.exit(0);
}

// 启动测试
testMockService(); 