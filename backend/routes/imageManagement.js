const express = require('express');
const router = express.Router();
const { generateImage, generateImageWithStream, generateTags } = require('../services/imageService');
const { saveImageData, updateImageData, getImageById, getImageList, getHotTags, searchTags } = require('../services/databaseService');

// 中间件：验证API请求
const validateRequest = (req, res, next) => {
    const { prompt } = req.body;
    
    if (!prompt) {
        return res.status(400).json({
            success: false,
            error: '提示词不能为空'
        });
    }
    
    next();
};

// 生成图片API（非流式）
router.post('/generate', validateRequest, async (req, res) => {
    try {
        const { prompt } = req.body;
        console.log(`处理图片生成请求，提示词: ${prompt}`);
        
        // 生成图片
        const imageResult = await generateImage(prompt, false);
        
        // 如果图片结果中没有标签，则生成标签
        if (!imageResult.tags || imageResult.tags.length === 0) {
            imageResult.tags = await generateTags(prompt, imageResult);
        }
        
        res.json({
            success: true,
            data: imageResult
        });
    } catch (error) {
        console.error('图片生成失败:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// 流式生成图片API
router.post('/generate-stream', validateRequest, (req, res) => {
    const { prompt } = req.body;
    console.log(`处理流式图片生成请求，提示词: ${prompt}`);
    
    // 设置SSE头
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    
    // 发送SSE事件的函数
    const sendEvent = (eventType, data) => {
        res.write(`event: ${eventType}\n`);
        res.write(`data: ${JSON.stringify(data)}\n\n`);
    };
    
    // 发送初始事件
    sendEvent('start', { message: '开始生成图片...' });
    
    // 启动流式生成
    generateImageWithStream(prompt, (eventType, eventData) => {
        // 将每个事件发送给客户端
        sendEvent(eventType, eventData);
        
        // 如果是完成事件，关闭连接
        if (eventType === 'complete') {
            res.end();
        }
    }).catch(error => {
        console.error('流式图片生成失败:', error);
        sendEvent('error', { error: error.message });
        res.end();
    });
});

// 保存图片数据
router.post('/save', async (req, res) => {
    try {
        const { prompt, imageUrl, title, description, tags, creator, status } = req.body;
        
        if (!prompt || !imageUrl) {
            return res.status(400).json({
                success: false,
                error: '提示词和图片URL是必需的'
            });
        }
        
        // 保存图片数据
        const imageData = {
            prompt,
            imageUrl,
            title,
            description,
            tags: Array.isArray(tags) ? tags : [],
            creator,
            status: status || 'pending'
        };
        
        const savedData = await saveImageData(imageData);
        
        res.json({
            success: true,
            message: '图片数据保存成功',
            data: savedData
        });
    } catch (error) {
        console.error('保存图片数据失败:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// 获取图片详情
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        if (!id) {
            return res.status(400).json({
                success: false,
                error: '图片ID是必需的'
            });
        }
        
        const imageData = await getImageById(parseInt(id));
        
        res.json({
            success: true,
            data: imageData
        });
    } catch (error) {
        console.error('获取图片详情失败:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// 更新图片数据
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { prompt, title, description, tags, status } = req.body;
        
        if (!id) {
            return res.status(400).json({
                success: false,
                error: '图片ID是必需的'
            });
        }
        
        // 更新图片数据
        const updateData = {};
        
        if (prompt !== undefined) updateData.prompt = prompt;
        if (title !== undefined) updateData.title = title;
        if (description !== undefined) updateData.description = description;
        if (tags !== undefined) updateData.tags = tags;
        if (status !== undefined) updateData.status = status;
        
        const updatedData = await updateImageData(parseInt(id), updateData);
        
        res.json({
            success: true,
            message: '图片数据更新成功',
            data: updatedData
        });
    } catch (error) {
        console.error('更新图片数据失败:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// 获取图片列表
router.get('/', async (req, res) => {
    try {
        const { page = 1, pageSize = 20, status, tags } = req.query;
        
        // 转换标签参数
        let tagArray = [];
        if (tags) {
            tagArray = Array.isArray(tags) ? tags : tags.split(',');
        }
        
        // 获取图片列表
        const result = await getImageList(
            parseInt(page),
            parseInt(pageSize),
            status,
            tagArray
        );
        
        res.json({
            success: true,
            ...result
        });
    } catch (error) {
        console.error('获取图片列表失败:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// 获取热门标签
router.get('/tags/hot', async (req, res) => {
    try {
        const { limit = 20 } = req.query;
        
        const tags = await getHotTags(parseInt(limit));
        
        res.json({
            success: true,
            data: tags
        });
    } catch (error) {
        console.error('获取热门标签失败:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// 搜索标签
router.get('/tags/search', async (req, res) => {
    try {
        const { keyword, limit = 20 } = req.query;
        
        if (!keyword) {
            return res.status(400).json({
                success: false,
                error: '搜索关键词是必需的'
            });
        }
        
        const tags = await searchTags(keyword, parseInt(limit));
        
        res.json({
            success: true,
            data: tags
        });
    } catch (error) {
        console.error('搜索标签失败:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// 发布图片（更新状态为已发布）
router.post('/:id/publish', async (req, res) => {
    try {
        const { id } = req.params;
        
        if (!id) {
            return res.status(400).json({
                success: false,
                error: '图片ID是必需的'
            });
        }
        
        // 更新图片状态为已发布
        const updatedData = await updateImageData(parseInt(id), {
            status: 'published'
        });
        
        res.json({
            success: true,
            message: '图片发布成功',
            data: updatedData
        });
    } catch (error) {
        console.error('发布图片失败:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router; 