const EventEmitter = require('events');

/**
 * 模拟Coze工作流服务类
 * 用于在无法访问实际Coze API时模拟其功能
 */
class MockCozeWorkflowService extends EventEmitter {
  constructor() {
    super();
  }

  /**
   * 模拟执行Coze工作流
   * @param {string} prompt - 用户输入的提示词
   * @param {boolean} stream - 是否使用流式返回
   * @returns {Promise} - 返回工作流执行结果
   */
  async runWorkflow(prompt, stream = true) {
    console.log(`[模拟]执行Coze工作流，提示词: ${prompt}, 流模式: ${stream}`);
    
    // 根据提示词生成模拟图片URL
    const imageUrl = this.generateMockImageUrl(prompt);
    
    // 根据提示词生成模拟标签
    const tags = this.generateMockTags(prompt);
    
    // 构建模拟内容
    const content = JSON.stringify({
      message: "模拟Coze工作流结果",
      image_url: imageUrl,
      tags: tags
    });
    
    if (stream) {
      return this.mockStreamResponse(prompt, imageUrl, tags, content);
    } else {
      // 模拟延迟
      await new Promise(resolve => setTimeout(resolve, 1000));
      return {
        content,
        imageUrl,
        tags
      };
    }
  }

  /**
   * 模拟流式响应
   * @param {string} prompt - 提示词
   * @param {string} imageUrl - 图片URL
   * @param {Array<string>} tags - 标签数组
   * @param {string} finalContent - 完整内容
   * @returns {Promise} - 处理完成的Promise
   */
  mockStreamResponse(prompt, imageUrl, tags, finalContent) {
    return new Promise((resolve) => {
      // 模拟延迟
      setTimeout(() => {
        // 模拟第一次增量更新
        this.emit('delta', '正在处理您的请求...');
      }, 300);
      
      setTimeout(() => {
        // 模拟第二次增量更新
        this.emit('delta', '正在生成图片...');
      }, 600);
      
      setTimeout(() => {
        // 模拟图片URL返回
        this.emit('image', imageUrl);
        this.emit('delta', `已生成图片: ${imageUrl}`);
      }, 1000);
      
      setTimeout(() => {
        // 模拟标签返回
        this.emit('tags', tags);
        this.emit('delta', `生成的标签: ${tags.join(', ')}`);
      }, 1500);
      
      setTimeout(() => {
        // 模拟完成事件
        this.emit('complete', {
          content: finalContent,
          imageUrl,
          tags
        });
        
        resolve({
          content: finalContent,
          imageUrl,
          tags
        });
      }, 2000);
    });
  }

  /**
   * 生成模拟图片URL
   * @param {string} prompt - 提示词
   * @returns {string} - 模拟图片URL
   */
  generateMockImageUrl(prompt) {
    // 使用placeholder.com或其他占位图服务
    const sanitizedPrompt = encodeURIComponent(prompt.slice(0, 50));
    const placeholder = `https://via.placeholder.com/600x400.png?text=${sanitizedPrompt}`;
    
    // 为了更真实，也可以提供几个预设的图片URL随机选择
    const mockImages = [
      "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba",
      "https://images.unsplash.com/photo-1526336024174-e58f5cdd8e13",
      "https://images.unsplash.com/photo-1494256997604-768d1f608cac",
      "https://images.unsplash.com/photo-1533743983669-94fa5c4338ec",
      "https://images.unsplash.com/photo-1478098711619-5ab0b478d6e6"
    ];
    
    if (prompt.includes('猫咪') || prompt.includes('cat')) {
      return mockImages[Math.floor(Math.random() * mockImages.length)];
    }
    
    return placeholder;
  }

  /**
   * 生成模拟标签
   * @param {string} prompt - 提示词
   * @returns {Array<string>} - 模拟标签数组
   */
  generateMockTags(prompt) {
    // 根据提示词中的关键词生成标签
    const tags = ['AI生成'];
    
    // 常见标签集合
    const commonTags = {
      '猫': ['猫咪', '宠物', '可爱', 'cat', '萌宠'],
      '雨': ['雨天', '雨景', '天气', '下雨', 'rainy'],
      '窗台': ['窗口', '窗边', '室内', '家居'],
      '可爱': ['萌', '治愈', '温馨', 'cute'],
      '动物': ['生物', '自然', '生命', 'animal'],
      '风景': ['景色', '视图', '自然', 'landscape'],
      '人物': ['人像', '肖像', '面孔', 'portrait'],
      '建筑': ['建筑物', '结构', '城市', 'architecture']
    };
    
    // 从提示词中查找关键词并添加相关标签
    Object.keys(commonTags).forEach(keyword => {
      if (prompt.includes(keyword)) {
        // 随机选择2-3个相关标签
        const relatedTags = commonTags[keyword];
        const selectedTags = relatedTags.sort(() => 0.5 - Math.random()).slice(0, 2);
        tags.push(...selectedTags);
      }
    });
    
    // 将提示词自身作为标签
    const words = prompt.split(/[\s,，、]/);
    for (const word of words) {
      if (word.length >= 2 && !tags.includes(word)) {
        tags.push(word);
      }
      
      if (tags.length >= 8) {
        break;
      }
    }
    
    return [...new Set(tags)]; // 去重
  }
}

// 导出服务实例
module.exports = new MockCozeWorkflowService(); 