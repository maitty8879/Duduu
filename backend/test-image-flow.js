const { generateImage, generateTags } = require('./services/imageService');
const { saveImageData, getImageById, getImageList } = require('./services/databaseService');

// 初始化数据库
require('./services/databaseService').initDatabase();

// 测试参数
const prompt = '一只可爱的猫咪，坐在窗台上看着窗外的雨';

// 测试完整流程
async function testImageFlow() {
    try {
        console.log('===== 开始测试图片管理流程 =====');
        
        // 1. 生成图片
        console.log('\n1. 生成图片:');
        console.log(`提示词: ${prompt}`);
        const imageResult = await generateImage(prompt, false);
        console.log('图片生成结果:', imageResult);
        
        // 2. 如果没有标签，生成标签
        console.log('\n2. 生成标签:');
        let tags = imageResult.tags;
        if (!tags || tags.length === 0) {
            console.log('图片结果中没有标签，使用AI生成标签');
            tags = await generateTags(prompt, imageResult);
        }
        console.log('标签:', tags);
        
        // 3. 保存图片数据
        console.log('\n3. 保存图片数据:');
        const imageData = {
            prompt,
            imageUrl: imageResult.url,
            title: '测试图片 - ' + new Date().toLocaleString(),
            description: `这是一张由提示词"${prompt}"生成的测试图片`,
            tags,
            creator: 'test-user',
            status: 'pending'
        };
        
        console.log('要保存的数据:', imageData);
        const savedImage = await saveImageData(imageData);
        console.log('保存结果:', savedImage);
        
        // 4. 获取图片详情
        console.log('\n4. 获取图片详情:');
        const imageDetail = await getImageById(savedImage.id);
        console.log('图片详情:', imageDetail);
        
        // 5. 获取图片列表
        console.log('\n5. 获取图片列表:');
        const imageList = await getImageList(1, 10);
        console.log(`共找到 ${imageList.pagination.total} 张图片`);
        console.log('图片列表 (前2条):', imageList.data.slice(0, 2));
        
        console.log('\n===== 测试完成 =====');
    } catch (error) {
        console.error('测试失败:', error);
    }
}

// 执行测试
testImageFlow(); 