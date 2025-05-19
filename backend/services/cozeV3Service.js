const axios = require('axios');
const config = require('../config');
const EventEmitter = require('events');

/**
 * Coze V3 API服务类
 * 处理与Coze API v3的交互和结果处理
 */
class CozeV3Service extends EventEmitter {
  constructor() {
    super();
    this.apiKey = config.COZE_API_KEY;
    this.botId = config.COZE_BOT_ID;
  }

  /**
   * 执行Coze聊天
   * @param {string} content - 用户输入的内容
   * @param {string} userId - 用户ID
   * @param {boolean} stream - 是否使用流式返回
   * @returns {Promise} - 返回聊天结果
   */
  async chat(content, userId = "user_" + Date.now(), stream = true) {
    try {
      console.log(`执行Coze聊天，内容: ${content}, 用户ID: ${userId}, 流模式: ${stream}`);
      
      // 准备请求参数
      const requestBody = {
        bot_id: this.botId,
        user_id: userId,
        stream: stream,
        auto_save_history: true,
        additional_messages: [
          {
            role: "user",
            content: content,
            content_type: "text"
          }
        ]
      };

      console.log('Coze聊天请求体:', JSON.stringify(requestBody, null, 2));

      // 发送API请求
      const response = await axios({
        method: 'post',
        url: 'https://api.coze.cn/v3/chat',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        data: requestBody,
        // 如果是流模式，设置响应类型为stream
        responseType: stream ? 'stream' : 'json'
      });

      // 处理流式响应
      if (stream) {
        return this.handleStreamResponse(response.data);
      } else {
        // 处理非流式响应
        console.log('Coze聊天响应:', response.data);
        return this.processResponse(response.data);
      }
    } catch (error) {
      console.error('执行Coze聊天失败:', error);
      throw new Error(`执行Coze聊天失败: ${error.message}`);
    }
  }

  /**
   * 处理流式响应数据
   * @param {Stream} stream - 流式响应数据
   * @returns {Promise} - 处理完成的Promise
   */
  handleStreamResponse(stream) {
    return new Promise((resolve, reject) => {
      let buffer = '';
      let finalResponse = '';
      let imageUrl = null;
      let tags = [];
      let messageComplete = false;

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
              
              // 处理心跳消息
              if (jsonStr === '[DONE]') {
                this.emit('done');
                messageComplete = true;
                continue;
              }
              
              const eventData = JSON.parse(jsonStr);
              
              // 检查是否是conversation.message.delta事件
              if (eventData.event === 'conversation.message.delta') {
                // 提取content内容
                const content = eventData.data?.message?.content || '';
                finalResponse += content;
                
                // 发送delta事件，包含更多结构化信息
                this.emit('delta', {
                  content,
                  eventType: 'conversation.message.delta',
                  raw: eventData
                });
                
                // 尝试从内容中提取图片URL和标签
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
              } 
              // 提取delta内容 (标准OpenAI格式)
              else if (eventData.choices && eventData.choices.length > 0) {
                const delta = eventData.choices[0].delta;
                if (delta && delta.content) {
                  finalResponse += delta.content;
                  
                  // 发送delta事件
                  this.emit('delta', {
                    content: delta.content,
                    eventType: 'openai.delta',
                    raw: eventData
                  });
                  
                  // 尝试从内容中提取图片URL和标签
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
                }
              }
            } catch (err) {
              console.error('解析SSE数据失败:', err, line);
            }
          }
        }
      });

      stream.on('end', () => {
        console.log('Coze聊天流式响应结束');
        
        // 解析完整响应中的内容，提取可能的图片和标签
        if (finalResponse && (!imageUrl || tags.length === 0)) {
          this.extractImageAndTags(finalResponse, (extractedImageUrl, extractedTags) => {
            if (extractedImageUrl && !imageUrl) {
              imageUrl = extractedImageUrl;
              this.emit('image', imageUrl);
            }
            
            if (extractedTags.length > 0 && tags.length === 0) {
              tags = extractedTags;
              this.emit('tags', tags);
            }
            
            // 发送完成事件
            const result = {
              content: finalResponse,
              imageUrl,
              tags,
              messageComplete
            };
            
            this.emit('complete', result);
            resolve(result);
          });
        } else {
          // 直接发送完成事件
          const result = {
            content: finalResponse,
            imageUrl,
            tags,
            messageComplete
          };
          
          this.emit('complete', result);
          resolve(result);
        }
      });

      stream.on('error', (err) => {
        console.error('Coze聊天流式响应错误:', err);
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
    let content = '';
    let imageUrl = null;
    let tags = [];
    
    // 从响应中提取内容
    if (response.choices && response.choices.length > 0) {
      const message = response.choices[0].message;
      if (message && message.content) {
        content = message.content;
        
        // 尝试从内容中提取图片URL和标签
        this.extractImageAndTags(content, (extractedImageUrl, extractedTags) => {
          imageUrl = extractedImageUrl;
          tags = extractedTags;
        });
      }
    }
    
    return {
      success: true,
      content,
      imageUrl,
      tags
    };
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
    const imageUrlRegex = /(https?:\/\/[^\s"]+\.(jpg|jpeg|png|gif|webp))/i;
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
module.exports = new CozeV3Service(); 