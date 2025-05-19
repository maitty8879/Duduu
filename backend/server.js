const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const path = require('path');
const OpenApi = require('@volcengine/openapi');
const dotenv = require('dotenv');
const imageManagementRoutes = require('./routes/imageManagement');
const cozeChatRoutes = require('./routes/cozeChat');

// 加载环境变量
dotenv.config({ path: path.join(__dirname, '../.env') });

// 创建Express应用
const app = express();
const PORT = process.env.PORT || 3001;

// 启用CORS和JSON解析
app.use(cors());
app.use(express.json());

// 提供静态文件服务
app.use(express.static(path.join(__dirname, '..')));

// 添加根路由，提供前端HTML页面
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'index.html'));
});

// 提供Coze API测试页面
app.get('/coze-test', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'coze-chat-test.html'));
});

// 提供Coze API重定向页面
app.get('/coze-redirect', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'coze-redirect.html'));
});

// 连接到SQLite数据库
let db;
(async () => {
  db = await open({
    filename: path.join(__dirname, 'database.sqlite'),
    driver: sqlite3.Database
  });
  
  // 创建users表（如果不存在）
  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE,
      password TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  console.log('数据库连接成功');
})();

// 用户注册API
app.post('/api/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: '用户名和密码不能为空' });
    }
    
    // 检查用户名是否已存在
    const existingUser = await db.get('SELECT * FROM users WHERE username = ?', username);
    if (existingUser) {
      return res.status(400).json({ error: '用户名已存在' });
    }
    
    // 加密密码
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // 插入新用户
    await db.run(
      'INSERT INTO users (username, password) VALUES (?, ?)',
      [username, hashedPassword]
    );
    
    res.status(201).json({ message: '注册成功' });
  } catch (error) {
    console.error('注册失败:', error);
    res.status(500).json({ error: '注册失败' });
  }
});

// 用户登录API
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: '用户名和密码不能为空' });
    }
    
    // 查找用户
    const user = await db.get('SELECT * FROM users WHERE username = ?', username);
    if (!user) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }
    
    // 验证密码
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }
    
    // 生成JWT令牌
    const token = jwt.sign(
      { id: user.id, username: user.username },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '1d' }
    );
    
    res.json({
      message: '登录成功',
      token,
      user: {
        id: user.id,
        username: user.username
      }
    });
  } catch (error) {
    console.error('登录失败:', error);
    res.status(500).json({ error: '登录失败' });
  }
});

// 验证JWT中间件
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: '未提供身份验证令牌' });
  }
  
  jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
    if (err) {
      return res.status(403).json({ error: '令牌无效或已过期' });
    }
    
    req.user = user;
    next();
  });
};

// 获取当前用户信息API
app.get('/api/me', authenticateToken, (req, res) => {
  res.json({
    user: {
      id: req.user.id,
      username: req.user.username
    }
  });
});

// Coze工作流API
app.post('/api/coze/workflow', async (req, res) => {
  try {
    const { prompt, useStream } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ error: '提示词不能为空' });
    }
    
    console.log(`调用Coze IDE项目工作流，提示词: ${prompt}, 流模式: ${useStream || false}`);
    
    // 如果请求流式输出
    if (useStream) {
      // 设置SSE头
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
    
      // 导入Coze服务
      const cozeService = require('./services/cozeService');
      
      // 发送初始事件
      res.write(`event: start\n`);
      res.write(`data: ${JSON.stringify({message: '开始生成图片...'})}\n\n`);
        
      // 监听delta事件
      cozeService.on('delta', (content) => {
        res.write(`event: delta\n`);
        res.write(`data: ${JSON.stringify({content})}\n\n`);
      });
      
      // 监听image事件
      cozeService.on('image', (imageUrl) => {
        res.write(`event: image\n`);
        res.write(`data: ${JSON.stringify({imageUrl})}\n\n`);
      });
      
      // 监听tags事件
      cozeService.on('tags', (tags) => {
        res.write(`event: tags\n`);
        res.write(`data: ${JSON.stringify({tags})}\n\n`);
      });
      
      // 监听complete事件
      cozeService.on('complete', (result) => {
        console.log('完成事件触发，返回结果:', JSON.stringify(result, null, 2));
        res.write(`event: complete\n`);
        res.write(`data: ${JSON.stringify(result)}\n\n`);
        
        // 移除所有事件监听器
        cozeService.removeAllListeners();
        
        // 关闭连接
        res.end();
      });
      
      // 开始执行工作流
      cozeService.runWorkflow(prompt, true).catch(error => {
        console.error('流式API调用失败:', error);
        
        // 发送错误事件
        res.write(`event: error\n`);
        res.write(`data: ${JSON.stringify({error: error.message})}\n\n`);
        
        // 移除所有事件监听器
        cozeService.removeAllListeners();
        
        // 关闭连接
        res.end();
      });
    } else {
      // 非流式输出
      try {
        // 导入服务
        const { generateImage } = require('./services/imageService');
        
        // 调用generateImage函数生成图像
        const result = await generateImage(prompt, false);
        
        // 返回生成结果
        res.json({
          success: true,
          data: result
        });
      } catch (error) {
        console.error('非流式API调用失败:', error);
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    }
  } catch (error) {
    console.error('工作流API异常:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 添加专门用于生成图片的API端点，供Laravel后台调用
app.post('/api/generate-image', async (req, res) => {
  try {
    const { prompt } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ error: '提示词不能为空' });
    }
    
    console.log(`生成图片API被调用，提示词: ${prompt}`);
    
    // 从环境变量读取密钥
    const accessKeyId = process.env.VOLC_ACCESS_KEY;
    const secretAccessKey = process.env.VOLC_SECRET_KEY;

    if (!accessKeyId || !secretAccessKey) {
      throw new Error('未设置火山引擎密钥环境变量 VOLC_ACCESS_KEY 或 VOLC_SECRET_KEY');
    }
    
    console.log('环境变量列表:', Object.keys(process.env));
    console.log('检查是否有VOLC_ACCESS_KEY:', process.env.VOLC_ACCESS_KEY ? '是' : '否');
    console.log('检查是否有VOLC_SECRET_KEY:', process.env.VOLC_SECRET_KEY ? '是' : '否');
    console.log('使用火山引擎密钥:', { accessKeyId: accessKeyId.substring(0, 5) + '...' });
    
    // 是否使用测试模式（不调用真实API）
    const useTestMode = process.env.USE_TEST_MODE === 'true' || false;
    
    if (useTestMode) {
      // 测试模式：返回测试图片
      console.log('测试模式: 返回测试图片URL');
      
      // 返回一些测试图片URL
      const testImages = [
        'https://picsum.photos/seed/1/512/512',
        'https://picsum.photos/seed/2/512/512',
        'https://picsum.photos/seed/3/512/512',
        'https://picsum.photos/seed/4/512/512',
        'https://picsum.photos/seed/5/512/512'
      ];
      
      // 随机选择一个测试图片
      const randomIndex = Math.floor(Math.random() * testImages.length);
      const imageUrl = testImages[randomIndex];
      
      // 生成一些测试标签
      const tags = [
        'AI生成', 
        '测试图片', 
        prompt.split(' ')[0], 
        prompt.split(' ')[1] || ''
      ].filter(tag => tag);
      
      console.log('返回测试图片URL:', imageUrl);
      
      // 返回测试图片和标签
      return res.json({
        success: true,
        imageUrl,
        tags
      });
    }
    
    // 真实模式：调用火山引擎即梦AI API
    try {
      console.log('准备调用火山引擎即梦AI API');
      
      // 创建火山引擎OpenAPI客户端
      const client = new OpenApi({
        accessKeyId: accessKeyId,
        secretKey: secretAccessKey,
        // 火山引擎服务区域
        region: 'cn-north-1',
        // 服务名称
        service: 'aigc',
        // API版本
        apiVersion: '2023-06-01'
      });
      
      // 即梦AI图像生成API的请求参数
      const requestData = {
        req_key: 'txt2img',
        prompt: prompt,
        width: 512,
        height: 512,
        n: 1,  // 生成图片数量
        steps: 30,  // 推理步数
        sampler_index: 'Euler a',  // 采样器
        cfg_scale: 7,  // 提示词相关性
        seed: -1,  // 随机种子
        negative_prompt: 'low quality, worst quality, blurry'  // 负面提示词
      };
      
      console.log('API请求参数:', requestData);
      
      // 调用火山引擎即梦AI API
      const response = await client.json('POST', '/v2/aigc/image/txt2img', {
        body: requestData
      });
      
      console.log('火山引擎即梦AI响应:', response);
      
      // 从响应中提取图片URL
      // 注意：根据实际响应格式调整这里的路径
      const imageUrl = response?.Data?.image_url || response?.image_url;
      
      if (!imageUrl) {
        throw new Error('API响应中没有找到图片URL');
      }
      
      // 生成标签
      const tags = response?.Data?.tags || [
        'AI生成', 
        '即梦AI', 
        prompt.split(' ')[0], 
        prompt.split(' ')[1] || ''
      ].filter(tag => tag);
      
      // 返回成功结果
      return res.json({
        success: true,
        imageUrl,
        tags
      });
    } catch (volcError) {
      console.error('火山引擎 API 调用失败:', volcError);
      
      // 如果真实API调用失败，使用模拟数据作为后备
      console.log('使用模拟数据作为后备');
      const mockImageUrl = 'https://picsum.photos/seed/error/512/512';
      const mockTags = ['AI生成', '提示词库', prompt.substring(0, 10)];
      
      return res.json({
        success: true,
        imageUrl: mockImageUrl,
        tags: mockTags,
        error: volcError.message || '调用火山引擎API失败'
      });
    }
  } catch (error) {
    console.error('生成图片失败:', error);
    return res.status(500).json({ error: '生成图片失败: ' + error.message });
  }
});

// 发布机器人API
app.post('/api/publish-bot', authenticateToken, async (req, res) => {
  try {
    const { botId, version } = req.body;
    
    if (!botId) {
      return res.status(400).json({ error: '机器人ID不能为空' });
    }
    
    console.log(`发布机器人，ID: ${botId}，版本: ${version || '最新'}`);
    
    // 这里应该是调用发布机器人的API
    // 模拟API调用
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    res.json({
      success: true,
      message: '机器人发布成功',
      data: {
        botId,
        version: version || '1.0',
        publishedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('发布机器人失败:', error);
    res.status(500).json({
      success: false,
      message: '发布机器人时发生错误',
      error: error.message
    });
  }
});

// 路由
app.use('/api/images', imageManagementRoutes);
app.use('/api/coze/chat', cozeChatRoutes);

// 错误处理中间件
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        success: false,
        error: 'Internal Server Error'
    });
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
});
