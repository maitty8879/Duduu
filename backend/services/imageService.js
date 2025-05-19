const axios = require('axios');
const config = require('../config');
const cozeService = require('./cozeService');
const { OpenAI } = require('openai');
const mockCozeService = require('./mockCozeService'); // 引入模拟服务作为备用

/**
 * 使用Coze工作流生成图片
 * @param {string} prompt - 图片生成提示词
 * @param {boolean} useStream - 是否使用流式API (默认: false)
 * @returns {Promise<Object>} - 返回生成的图片URL和内容
 */
async function generateImage(prompt, useStream = false) {
    try {
        console.log(`使用Coze工作流生成图片，提示词: ${prompt}`);
        
        // 调用Coze工作流服务
        let result;
        try {
            result = await cozeService.runWorkflow(prompt, useStream);
        } catch (apiError) {
            console.error('Coze API调用失败，尝试使用模拟服务:', apiError.message);
            // API调用失败，尝试使用模拟服务
            result = await mockCozeService.runWorkflow(prompt, useStream);
        }
        
        // 从结果中提取图片URL
        if (!result.imageUrl) {
            console.warn('未从响应中提取到图片URL，尝试模拟服务');
            // 没有找到图片URL，使用模拟服务
            result = await mockCozeService.runWorkflow(prompt, useStream);
            
            if (!result.imageUrl) {
                throw new Error('即使使用模拟服务也未能获取到图片URL');
            }
        }
        
        return {
            url: result.imageUrl,
            content: result.content,
            tags: result.tags || []
        };
    } catch (error) {
        console.error('生成图片失败:', error);
        
        // 如果出错，返回一个默认的模拟图片
        return {
            url: "https://via.placeholder.com/600x400.png?text=Error:+Image+Generation+Failed",
            content: JSON.stringify({ error: error.message }),
            tags: ['错误', '生成失败', 'error']
        };
    }
}

/**
 * 使用流式API生成图片并通过事件发送进度更新
 * @param {string} prompt - 图片生成提示词
 * @param {Function} eventCallback - 事件回调函数，用于发送进度更新
 * @returns {Promise<Object>} - 返回生成的图片URL和内容
 */
function generateImageWithStream(prompt, eventCallback) {
    return new Promise((resolve, reject) => {
        console.log(`使用流式API生成图片，提示词: ${prompt}`);
        
        try {
            // 监听delta事件，发送进度更新
            cozeService.on('delta', (content) => {
                eventCallback('delta', { content });
            });
            
            // 监听图片URL事件
            cozeService.on('image', (imageUrl) => {
                eventCallback('image', { imageUrl });
            });
            
            // 监听标签事件
            cozeService.on('tags', (tags) => {
                eventCallback('tags', { tags });
            });
            
            // 监听完成事件
            cozeService.on('complete', (result) => {
                eventCallback('complete', result);
                resolve({
                    url: result.imageUrl,
                    content: result.content,
                    tags: result.tags || []
                });
            });
            
            // 开始执行工作流
            cozeService.runWorkflow(prompt, true).catch(err => {
                console.error('生成图片流式API失败:', err);
                
                // 发送错误事件
                eventCallback('error', { error: err.message });
                
                // 即使错误也要返回一些东西，而不是直接拒绝Promise
                const defaultResult = {
                    url: "https://via.placeholder.com/600x400.png?text=Error:+Image+Generation+Failed",
                    content: JSON.stringify({ error: err.message }),
                    tags: ['错误', '生成失败', 'error']
                };
                
                // 发送一个"完成"事件，以便客户端知道处理已完成
                eventCallback('complete', {
                    content: defaultResult.content,
                    imageUrl: defaultResult.url,
                    tags: defaultResult.tags
                });
                
                resolve(defaultResult);
            });
        } catch (error) {
            console.error('生成图片流式API失败:', error);
            
            // 发送错误事件
            eventCallback('error', { error: error.message });
            
            // 即使错误也要返回一些东西，而不是直接拒绝Promise
            const defaultResult = {
                url: "https://via.placeholder.com/600x400.png?text=Error:+Image+Generation+Failed",
                content: JSON.stringify({ error: error.message }),
                tags: ['错误', '生成失败', 'error']
            };
            
            // 发送一个"完成"事件，以便客户端知道处理已完成
            eventCallback('complete', {
                content: defaultResult.content,
                imageUrl: defaultResult.url,
                tags: defaultResult.tags
            });
            
            resolve(defaultResult);
        }
    });
}

/**
 * 生成标签
 * @param {string} prompt - 提示词
 * @param {Object} imageResult - 图片生成结果
 * @returns {Promise<Array<string>>} - 返回生成的标签数组
 */
async function generateTags(prompt, imageResult) {
    // 如果图片结果中已经包含标签，直接返回
    if (imageResult && imageResult.tags && imageResult.tags.length > 0) {
        return imageResult.tags;
    }
    
    try {
        // 检查是否有OpenAI API密钥
        if (!config.OPENAI_API_KEY) {
            console.log('未配置OpenAI API密钥，返回基本标签');
            return generateBasicTags(prompt);
        }
        
        // 初始化OpenAI客户端
        const openai = new OpenAI({ apiKey: config.OPENAI_API_KEY });

        const completion = await openai.chat.completions.create({
            model: "gpt-3.5-turbo", // 使用更经济的模型
            messages: [
                {
                    role: "system",
                    content: "你是一个专业的图片标签生成助手。请根据提示词，生成5-8个相关的标签。标签应该简洁、准确，并包含风格、主题、元素等信息。返回JSON格式的标签数组。"
                },
                {
                    role: "user",
                    content: `请为以下提示词生成标签：${prompt}`
                }
            ],
            temperature: 0.7,
            max_tokens: 150,
            response_format: { type: "json_object" }
        });

        // 处理返回的标签
        const responseContent = completion.choices[0].message.content;
        try {
            const jsonResponse = JSON.parse(responseContent);
            if (jsonResponse.tags && Array.isArray(jsonResponse.tags)) {
                return jsonResponse.tags;
            }
        } catch (err) {
            console.error('解析标签JSON失败:', err);
        }
        
        // 如果JSON解析失败，尝试正则提取
        const tagsText = responseContent;
        const tags = tagsText
            .split(/,|\n/)
            .map(tag => tag.trim().replace(/^["'\s\-•]+|["'\s\-•]+$/g, ''))
            .filter(tag => tag.length > 0 && tag !== "tags" && !tag.includes(':'));

        return tags;
    } catch (error) {
        console.error('生成标签失败:', error);
        return generateBasicTags(prompt);
    }
}

/**
 * 生成基本标签（当API调用失败时的后备方案）
 * @param {string} prompt - 提示词
 * @returns {Array<string>} - 返回基本标签数组
 */
function generateBasicTags(prompt) {
    const basicTags = ['AI生成'];
    
    // 从提示词中提取可能的标签
    const words = prompt.split(/\s+/);
    for (let i = 0; i < Math.min(words.length, 5); i++) {
        if (words[i].length > 2) {
            basicTags.push(words[i]);
        }
    }
    
    return basicTags;
}

module.exports = {
    generateImage,
    generateImageWithStream,
    generateTags
}; 