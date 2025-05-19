const express = require('express');
const router = express.Router();
const cozeV3Service = require('../services/cozeV3Service');

// 验证请求中间件
const validateRequest = (req, res, next) => {
    // 获取请求内容 - 兼容GET和POST
    let content, userId;
    
    if (req.method === 'POST') {
        // 从POST正文获取
        content = req.body.content;
        userId = req.body.userId;
    } else if (req.method === 'GET') {
        // 从URL查询参数获取
        try {
            if (req.query.data) {
                // 如果提供了data参数，解析JSON
                const data = JSON.parse(decodeURIComponent(req.query.data));
                content = data.content;
                userId = data.userId;
            } else {
                // 直接从查询字符串获取
                content = req.query.content;
                userId = req.query.userId;
            }
        } catch (error) {
            return res.status(400).json({
                success: false,
                error: '无效的查询参数格式'
            });
        }
    }
    
    if (!content) {
        return res.status(400).json({
            success: false,
            error: '聊天内容不能为空'
        });
    }
    
    // 将解析出的参数保存到请求对象
    req.chatParams = {
        content,
        userId: userId || `user_${Date.now()}`
    };
    
    next();
};

// 常规聊天API（非流式）
router.post('/send', validateRequest, async (req, res) => {
    try {
        const { content, userId } = req.chatParams;
        console.log(`处理常规聊天请求，内容: ${content}, 用户ID: ${userId}`);
        
        // 调用Coze API
        const result = await cozeV3Service.chat(content, userId, false);
        
        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        console.error('聊天请求失败:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// 流式聊天API - 同时支持GET和POST
router.route('/stream')
    .get(validateRequest, handleStreamRequest)
    .post(validateRequest, handleStreamRequest);

// 处理流式请求
function handleStreamRequest(req, res) {
    const { content, userId } = req.chatParams;
    console.log(`处理流式聊天请求，内容: ${content}, 用户ID: ${userId}`);
    
    // 设置SSE头
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no' // 禁用Nginx缓冲
    });
    
    // 发送SSE事件的函数
    const sendEvent = (eventType, data) => {
        res.write(`event: ${eventType}\n`);
        res.write(`data: ${JSON.stringify(data)}\n\n`);
    };
    
    // 检查请求是否来自EventSource连接
    const isEventSourceRequest = req.method === 'GET';
    
    // 如果是GET请求（EventSource建立的连接），等待POST请求来触发实际处理
    if (isEventSourceRequest) {
        // 发送初始事件
        sendEvent('start', { message: '等待触发...' });
        
        // 存储事件响应处理器，以便POST请求可以触发它
        req.app.locals.eventSources = req.app.locals.eventSources || {};
        req.app.locals.eventSources[userId] = {
            send: sendEvent,
            response: res
        };
        
        // 设置连接关闭时的清理
        req.on('close', () => {
            if (req.app.locals.eventSources && req.app.locals.eventSources[userId]) {
                delete req.app.locals.eventSources[userId];
            }
        });
        
        // 对于GET请求，这里不会调用cozeV3Service.chat，而是等待POST请求触发
    } 
    // 如果是POST请求，查找对应的EventSource连接并开始处理
    else {
        // 检查是否有对应的EventSource连接
        const eventSource = req.app.locals.eventSources && req.app.locals.eventSources[userId];
        
        // 如果没有找到对应的EventSource连接，直接处理
        if (!eventSource) {
            // 发送初始事件
            sendEvent('start', { message: '开始聊天...' });
            
            // 设置事件监听器和处理流程
            setupChatEventHandlers(content, userId, sendEvent, res);
            
            return;
        }
        
        // 有对应的EventSource连接，使用它的发送函数
        const { send, response } = eventSource;
        
        // 发送初始事件
        send('start', { message: '开始聊天...' });
        
        // 设置事件监听器和处理流程
        setupChatEventHandlers(content, userId, send, response);
        
        // 对POST请求返回成功响应
        res.json({ success: true, message: '聊天流程已启动' });
    }
}

// 设置聊天事件处理
function setupChatEventHandlers(content, userId, sendEvent, res) {
    // 创建事件处理器
    const handlers = {
        delta: (data) => {
            // 检查是否为结构化数据对象
            if (data && typeof data === 'object' && 'content' in data) {
                // 发送结构化数据
                sendEvent('delta', data);
            } else {
                // 向后兼容，处理旧格式
                sendEvent('delta', { content: data });
            }
        },
        image: (imageUrl) => {
            sendEvent('image', { imageUrl });
        },
        tags: (tags) => {
            sendEvent('tags', { tags });
        },
        done: () => {
            sendEvent('done', { message: '聊天流结束' });
        },
        complete: (result) => {
            // 增强完成事件的输出，包含更多的结构化信息
            const enhancedResult = {
                ...result,
                finalContent: result.content,
                extractedData: {
                    imageUrl: result.imageUrl,
                    tags: result.tags,
                },
                status: result.messageComplete ? 'complete' : 'partial'
            };
            
            sendEvent('complete', enhancedResult);
            
            // 移除所有事件监听器
            Object.keys(handlers).forEach(event => {
                cozeV3Service.removeListener(event, handlers[event]);
            });
            
            // 关闭连接
            res.end();
        }
    };
    
    // 注册事件监听器
    Object.keys(handlers).forEach(event => {
        cozeV3Service.on(event, handlers[event]);
    });
    
    // 处理错误的函数
    const handleError = (error) => {
        console.error('流式聊天失败:', error);
        sendEvent('error', { error: error.message });
        
        // 移除所有事件监听器
        Object.keys(handlers).forEach(event => {
            cozeV3Service.removeListener(event, handlers[event]);
        });
        
        // 关闭连接
        res.end();
    };
    
    // 启动聊天
    cozeV3Service.chat(content, userId, true).catch(handleError);
}

module.exports = router; 