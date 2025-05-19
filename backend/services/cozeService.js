const axios = require('axios');
const config = require('../config');
const EventEmitter = require('events');

/**
 * Coze工作流和应用服务类
 * 处理与Coze API的交互和结果处理
 */
class CozeWorkflowService extends EventEmitter {
  constructor() {
    super();
    this.apiKey = config.COZE_API_KEY;
    this.workflowId = config.COZE_WORKFLOW_ID || "7504135123563233292"; // 默认工作流ID，同时也是项目ID
    this.spaceId = config.COZE_SPACE_ID || "7460521430900490277"; // 默认空间ID
    this.applicationId = config.COZE_APPLICATION_ID || "7504135123563233292"; // 应用ID
    this.projectId = config.COZE_PROJECT_ID || "7504135123563233292"; // 项目ID
  }

  /**
   * 执行Coze应用
   * @param {string} prompt - 用户输入的提示词
   * @param {boolean} stream - 是否使用流式返回
   * @returns {Promise} - 返回应用执行结果
   */
  async runApplication(prompt, stream = true) {
    try {
      console.log(`执行Coze IDE项目，提示词: ${prompt}, 流模式: ${stream}`);
      
      // 针对IDE项目的请求参数格式
      const requestBody = {
        id: this.projectId, // 使用ID参数
        space_id: this.spaceId,
        input: { // 使用input而不是inputs
          prompt: prompt
        },
        stream: stream
      };

      console.log('Coze IDE项目请求体:', JSON.stringify(requestBody, null, 2));

      // 尝试多种API路径
      const apiPaths = [
        // 尝试项目IDE路径
        'https://api.coze.cn/open_api/v2/project-ide/run',
        // 尝试IDE路径
        'https://api.coze.cn/open_api/v2/ide/run',
        // 尝试项目路径
        'https://api.coze.cn/open_api/v2/project/run',
        // 尝试应用路径
        'https://api.coze.cn/open_api/v2/application/run'
      ];
      
      // 尝试多种请求体格式
      const requestBodies = [
        // 格式1: id
        {
          id: this.projectId,
          space_id: this.spaceId,
          input: { prompt }
        },
        // 格式2: project_id
        {
          project_id: this.projectId,
          space_id: this.spaceId,
          inputs: { prompt }
        },
        // 格式3: application_id
        {
          application_id: this.applicationId,
          space_id: this.spaceId,
          inputs: { prompt }
        },
        // 格式4: project_ide_id
        {
          project_ide_id: this.projectId, 
          space_id: this.spaceId,
          input: { prompt }
        }
      ];

      let error = null;
      let response = null;
      
      // 尝试所有API路径和请求体格式组合
      for (const apiPath of apiPaths) {
        for (const reqBody of requestBodies) {
          try {
            console.log(`尝试API路径: ${apiPath}, 请求体:`, JSON.stringify(reqBody));
            
            response = await axios({
              method: 'post',
              url: apiPath,
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`,
                'Accept': 'application/json'
              },
              data: { ...reqBody, stream },
              responseType: stream ? 'stream' : 'json',
              timeout: 10000 // 10秒超时
            });
            
            console.log(`成功找到工作的API路径: ${apiPath}`);
            
            // 如果调用成功，跳出循环
            break;
          } catch (err) {
            console.log(`API路径 ${apiPath} 失败:`, err.message);
            error = err;
            // 继续尝试下一个组合
          }
        }
        
        // 如果已经成功获取响应，跳出循环
        if (response) break;
      }
      
      // 如果所有组合都失败了
      if (!response) {
        console.error('所有API路径尝试都失败了');
        throw error || new Error('所有API请求尝试均失败');
      }
      
      // 处理响应
      if (stream) {
        return this.handleStreamResponse(response.data);
      } else {
        console.log('Coze IDE项目响应:', response.data);
        return this.processResponse(response.data);
      }
    } catch (error) {
      console.error('执行Coze应用失败:', error);
      throw new Error(`执行Coze应用失败: ${error.message}`);
    }
  }

  /**
   * 执行Coze工作流 - 兼容旧版API
   * @param {string} prompt - 用户输入的提示词
   * @param {boolean} stream - 是否使用流式返回
   * @returns {Promise} - 返回工作流执行结果
   */
  async runWorkflow(prompt, stream = true) {
    // 现在调用应用API而不是工作流API
    return this.runApplication(prompt, stream);
  }

  /**
   * 处理流式响应数据
   * @param {Stream} stream - 流式响应数据
   * @returns {Promise} - 处理完成的Promise
   */
  handleStreamResponse(stream) {
    return new Promise((resolve, reject) => {
      let buffer = '';
      let imageUrl = null;
      let tags = [];
      let finalContent = '';

      stream.on('data', (chunk) => {
        // 将Buffer转换为字符串并添加到buffer
        const data = chunk.toString();
        buffer += data;

        // 尝试解析SSE数据
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // 保留最后一行，可能是不完整的

        for (const line of lines) {
          if (line.trim() === '') continue;
          
          // 检查是否是SSE数据行
          if (line.startsWith('data:')) {
            try {
              // 提取JSON数据
              const jsonStr = line.slice(5).trim();
              const eventData = JSON.parse(jsonStr);
              
              // 检查是否是conversation.message.delta事件
              if (eventData.event === 'conversation.message.delta') {
                // 提取content内容
                const content = eventData.data?.message?.content || '';
                finalContent += content;
                
                // 尝试从content中提取图片URL和标签信息
                this.extractImageAndTags(content, (extractedImageUrl, extractedTags) => {
                  if (extractedImageUrl && !imageUrl) {
                    imageUrl = extractedImageUrl;
                    this.emit('image', imageUrl);
                  }
                  
                  if (extractedTags.length > 0) {
                    tags = [...tags, ...extractedTags];
                    this.emit('tags', tags);
                  }
                });
                
                // 发送delta事件
                this.emit('delta', content);
              }
              
              // 检查是否是conversation.complete事件
              if (eventData.event === 'conversation.complete') {
                this.emit('complete', { content: finalContent, imageUrl, tags });
              }
            } catch (err) {
              console.error('解析SSE数据失败:', err, line);
            }
          }
        }
      });

      stream.on('end', () => {
        console.log('Coze工作流流式响应结束');
        resolve({ content: finalContent, imageUrl, tags });
      });

      stream.on('error', (err) => {
        console.error('Coze工作流流式响应错误:', err);
        reject(err);
      });
    });
  }

  /**
   * 处理非流式响应数据
   * @param {Object} response - API响应数据
   * @returns {Object} - 处理后的结果
   */
  processResponse(response) {
    if (response.code === 0) {
      console.log('工作流执行成功!');
      
      // 从响应中提取数据（根据实际响应格式调整）
      const output = response.data?.output || '';
      let imageUrl = null;
      let tags = [];
      
      // 尝试从输出中提取图片URL和标签
      this.extractImageAndTags(output, (extractedImageUrl, extractedTags) => {
        imageUrl = extractedImageUrl;
        tags = extractedTags;
      });
      
      return {
        success: true,
        content: output,
        imageUrl,
        tags
      };
    } else {
      throw new Error(`工作流执行失败: ${response.message}`);
    }
  }

  /**
   * 从内容中提取图片URL和标签
   * @param {string} content - 内容字符串
   * @param {Function} callback - 回调函数(imageUrl, tags)
   */
  extractImageAndTags(content, callback) {
    // 尝试解析可能的JSON结构
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const jsonStr = jsonMatch[0];
        const data = JSON.parse(jsonStr);
        
        // 提取图片URL
        const imageUrl = data.image_url || data.imageUrl || data.url || null;
        
        // 提取标签
        let tags = [];
        if (data.tags && Array.isArray(data.tags)) {
          tags = data.tags;
        } else if (typeof data.tags === 'string') {
          tags = data.tags.split(',').map(tag => tag.trim());
        }
        
        callback(imageUrl, tags);
        return;
      }
    } catch (err) {
      // JSON解析失败，使用正则表达式提取
      console.log('JSON解析失败，使用正则提取:', err.message);
    }
    
    // 使用正则表达式提取图片URL
    const imageUrlRegex = /(https?:\/\/[^\s]+\.(jpg|jpeg|png|gif|webp))/i;
    const imageUrlMatch = content.match(imageUrlRegex);
    const imageUrl = imageUrlMatch ? imageUrlMatch[0] : null;
    
    // 尝试提取标签（假设标签以#开头或在特定格式中）
    const tagsRegex = /#([^\s#]+)/g;
    const tagsMatches = content.matchAll(tagsRegex);
    const tags = Array.from(tagsMatches, m => m[1]);
    
    callback(imageUrl, tags);
  }
}

// 导出服务实例
module.exports = new CozeWorkflowService(); 