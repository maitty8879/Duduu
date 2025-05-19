const axios = require('axios');
const config = require('../config');
const EventEmitter = require('events');
const mockCozeService = require('./mockCozeService');

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
    this.debug = config.DEBUG;
    this.allowMockService = config.ALLOW_MOCK_SERVICE;
  }

  /**
   * 执行Coze应用
   * @param {string} prompt - 用户输入的提示词
   * @param {boolean} stream - 是否使用流式返回
   * @returns {Promise} - 返回应用执行结果
   */
  async runApplication(prompt, stream = true) {
    try {
      if (this.debug) {
        console.log(`执行Coze IDE项目，提示词: ${prompt}, 流模式: ${stream}`);
      }
      
      // 针对IDE项目的请求参数格式
      const requestBody = {
        id: this.projectId, // 使用ID参数
        space_id: this.spaceId,
        input: { // 使用input而不是inputs
          prompt: prompt
        },
        stream: stream
      };

      if (this.debug) {
        console.log('Coze IDE项目请求体:', JSON.stringify(requestBody, null, 2));
      }

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
            if (this.debug) {
              console.log(`尝试API路径: ${apiPath}, 请求体:`, JSON.stringify(reqBody));
            }
            
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
            
            if (this.debug) {
              console.log(`成功找到工作的API路径: ${apiPath}`);
            }
            
            // 如果调用成功，跳出循环
            break;
          } catch (err) {
            if (this.debug) {
              console.log(`API路径 ${apiPath} 失败:`, err.message);
            }
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
        
        // 如果允许使用模拟服务，则回退到模拟服务
        if (this.allowMockService) {
          console.log('回退到模拟服务...');
          return mockCozeService.runWorkflow(prompt, stream);
        }
        
        throw error || new Error('所有API请求尝试均失败');
      }
      
      // 处理响应
      if (stream) {
        return this.handleStreamResponse(response.data);
      } else {
        if (this.debug) {
          console.log('Coze IDE项目响应:', response.data);
        }
        return this.processResponse(response.data);
      }
    } catch (error) {
      console.error('执行Coze应用失败:', error);
      
      // 如果允许使用模拟服务，则回退到模拟服务
      if (this.allowMockService) {
        console.log('执行失败，回退到模拟服务...');
        return mockCozeService.runWorkflow(prompt, stream);
      }
      
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

        if (this.debug) {
          console.log('流数据块:', data);
        }

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
              
              // 处理特殊的完成标记
              if (jsonStr === '[DONE]') {
                this.emit('done');
                continue;
              }
              
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
              
              // 处理其他可能的事件格式
              if (eventData.choices && eventData.choices.length > 0) {
                const delta = eventData.choices[0].delta;
                if (delta && delta.content) {
                  finalContent += delta.content;
                  
                  // 尝试从content中提取图片URL和标签信息
                  this.extractImageAndTags(delta.content, (extractedImageUrl, extractedTags) => {
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
                  this.emit('delta', delta.content);
                }
              }
            } catch (err) {
              console.error('解析SSE数据失败:', err, line);
            }
          }
        }
      });

      stream.on('end', () => {
        if (this.debug) {
          console.log('Coze工作流流式响应结束');
        }
        
        // 最后一次检查，如果还没有图片URL和标签，尝试从完整内容中提取
        if (finalContent && (!imageUrl || tags.length === 0)) {
          this.extractImageAndTags(finalContent, (extractedImageUrl, extractedTags) => {
            if (extractedImageUrl && !imageUrl) {
              imageUrl = extractedImageUrl;
              this.emit('image', imageUrl);
            }
            
            if (extractedTags.length > 0 && tags.length === 0) {
              tags = extractedTags;
              this.emit('tags', tags);
            }
          });
        }
        
        // 如果仍然没有图片URL，尝试从模拟服务获取
        if (!imageUrl && this.allowMockService) {
          console.log('未能从API响应中提取图片URL，使用模拟图片');
          const mockResult = mockCozeService.generateMockImageUrl(finalContent);
          imageUrl = mockResult;
          this.emit('image', imageUrl);
        }
        
        // 如果仍然没有标签，尝试从模拟服务获取
        if (tags.length === 0 && this.allowMockService) {
          console.log('未能从API响应中提取标签，使用模拟标签');
          const mockTags = mockCozeService.generateMockTags(finalContent);
          tags = mockTags;
          this.emit('tags', tags);
        }
        
        // 发送完成事件
        const result = { content: finalContent, imageUrl, tags };
        this.emit('complete', result);
        
        resolve(result);
      });

      stream.on('error', (err) => {
        console.error('Coze工作流流式响应错误:', err);
        
        // 如果出错但允许使用模拟服务，尝试使用模拟服务
        if (this.allowMockService) {
          console.log('流式响应出错，回退到模拟服务');
          mockCozeService.runWorkflow(finalContent || '图片生成失败', true)
            .then(mockResult => {
              this.emit('complete', mockResult);
              resolve(mockResult);
            })
            .catch(mockErr => {
              reject(mockErr);
            });
        } else {
          reject(err);
        }
      });
    });
  }

  /**
   * 处理非流式响应数据
   * @param {Object} response - API响应数据
   * @returns {Object} - 处理后的结果
   */
  processResponse(response) {
    // 首先尝试解析常见的成功响应格式
    if (response.code === 0 || response.status === 'success' || response.status === 'completed') {
      if (this.debug) {
        console.log('工作流执行成功!');
      }
      
      // 从不同的响应格式中尝试提取输出
      const output = response.data?.output || 
                    response.data?.content || 
                    response.result?.content || 
                    response.content || 
                    JSON.stringify(response);
      
      let imageUrl = null;
      let tags = [];
      
      // 首先尝试直接从响应中提取图片URL
      imageUrl = response.data?.image_url || 
                response.data?.imageUrl || 
                response.image_url || 
                response.imageUrl;
                
      // 尝试从标签中提取
      if (response.data?.tags && Array.isArray(response.data.tags)) {
        tags = response.data.tags;
      } else if (response.tags && Array.isArray(response.tags)) {
        tags = response.tags;
      }
                
      // 如果直接提取失败，尝试从输出内容中提取
      if (!imageUrl || tags.length === 0) {
        this.extractImageAndTags(output, (extractedImageUrl, extractedTags) => {
          if (!imageUrl) imageUrl = extractedImageUrl;
          if (tags.length === 0) tags = extractedTags;
        });
      }
      
      // 如果仍然没有找到图片URL且允许使用模拟服务
      if (!imageUrl && this.allowMockService) {
        console.log('未能从API响应中提取图片URL，使用模拟图片');
        imageUrl = mockCozeService.generateMockImageUrl(output);
      }
      
      // 如果仍然没有找到标签且允许使用模拟服务
      if (tags.length === 0 && this.allowMockService) {
        console.log('未能从API响应中提取标签，使用模拟标签');
        tags = mockCozeService.generateMockTags(output);
      }
      
      return {
        success: true,
        content: output,
        imageUrl,
        tags
      };
    } else {
      // 处理失败响应
      const errorMessage = response.message || response.msg || response.error || 'Unknown error';
      
      if (this.allowMockService) {
        console.log(`工作流执行失败: ${errorMessage}，使用模拟服务`);
        return mockCozeService.runWorkflow('图片生成失败', false);
      }
      
      throw new Error(`工作流执行失败: ${errorMessage}`);
    }
  }

  /**
   * 从内容中提取图片URL和标签
   * @param {string} content - 内容字符串
   * @param {Function} callback - 回调函数(imageUrl, tags)
   */
  extractImageAndTags(content, callback) {
    // 首先尝试解析可能的JSON结构
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
        
        if (imageUrl || tags.length > 0) {
          callback(imageUrl, tags);
          return;
        }
      }
    } catch (err) {
      // JSON解析失败，使用正则表达式提取
      if (this.debug) {
        console.log('JSON解析失败，使用正则提取:', err.message);
      }
    }
    
    // 使用正则表达式提取图片URL
    const imageUrlRegex = /(https?:\/\/[^\s]+\.(jpg|jpeg|png|gif|webp))/i;
    const imageUrlMatch = content.match(imageUrlRegex);
    const imageUrl = imageUrlMatch ? imageUrlMatch[0] : null;
    
    // 尝试提取标签（假设标签以#开头或在特定格式中）
    let tags = [];
    
    // 尝试提取井号标签
    const hashTagsRegex = /#([^\s#]+)/g;
    const hashTagMatches = content.matchAll(hashTagsRegex);
    const hashTags = Array.from(hashTagMatches, m => m[1]);
    
    // 尝试提取关键词标签（在关键词、标签、tags等关键词后面的词语）
    const keywordTagsRegex = /(?:关键[词字]|标签|tags|keywords|key words)[：:]\s*([\w\s,，、]+)/i;
    const keywordMatch = content.match(keywordTagsRegex);
    let keywordTags = [];
    if (keywordMatch && keywordMatch[1]) {
      keywordTags = keywordMatch[1].split(/[,，、\s]+/).filter(tag => tag.trim());
    }
    
    // 合并所有提取到的标签
    tags = [...hashTags, ...keywordTags];
    
    // 如果没有提取到标签，尝试从内容中提取一些关键词作为标签
    if (tags.length === 0) {
      const words = content.split(/\s+/);
      for (const word of words) {
        if (word.length >= 2 && !tags.includes(word) && tags.length < 5) {
          tags.push(word);
        }
      }
    }
    
    callback(imageUrl, tags);
  }
}

// 导出服务实例
module.exports = new CozeWorkflowService(); 