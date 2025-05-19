const { generateImage } = require('./services/imageService');

async function testCozeApp() {
    console.log('开始测试 Coze 应用...');
    
    const prompt = "一只可爱的猫咪，坐在窗台上看着窗外的雨";
    console.log('提示词:', prompt);

    try {
        const imageUrl = await generateImage(prompt);
        console.log('生成成功!');
        console.log('图片URL:', imageUrl);
    } catch (error) {
        console.log('测试失败:', error.message);
    }
}

testCozeApp(); 