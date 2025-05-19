const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const path = require('path');
const OpenApi = require('@volcengine/openapi');

// 加载环境变量
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// 创建Express应用
const app = express();
const PORT = process.env.PORT || 3001;

// 启用CORS和JSON解析
app.use(cors());
app.use(express.json());

// 添加根路由，返回欢迎信息
app.get('/', (req, res) => {
  res.json({ message: '欢迎访问嘟嘟的提示库API！' });
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
    const { workflowId, inputs } = req.body;
    
    if (!workflowId) {
      return res.status(400).json({ error: '工作流ID不能为空' });
    }
    
    console.log(`调用Coze工作流，ID: ${workflowId}，输入:`, inputs);
    
    // 这里应该是调用Coze API的代码
    // 由于Coze API可能需要一些时间来处理，我们使用轮询方式
    
    // 模拟初始响应
    const initialResponse = {
      id: 'task-' + Date.now(),
      status: 'processing',
      message: '正在处理中...'
    };
    
    // 发送初始响应
    res.json(initialResponse);
    
    // 轮询结果的函数
    const pollResult = async () => {
      try {
        // 模拟API调用延迟
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // 模拟Coze API的响应
        const mockResponse = {
          success: true,
          data: {
            text: '这是Coze工作流的响应',
            images: [
              {
                url: 'https://via.placeholder.com/512x512.png?text=Generated+Image'
              }
            ],
            tags: ['AI', '生成', '测试']
          }
        };
        
        console.log('Coze工作流响应:', mockResponse);
        
        // 在实际应用中，您应该将结果存储在数据库中或通过WebSocket发送给客户端
        // 这里我们只是记录结果
      } catch (pollError) {
        console.error('轮询Coze工作流结果失败:', pollError);
      }
    };
    
    // 开始轮询
    pollResult();
    
  } catch (error) {
    console.error('调用Coze工作流失败:', error);
    res.status(500).json({
      success: false,
      message: '调用Coze工作流时发生错误',
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
    const useTestMode = process.env.USE_TEST_MODE === 'true' || true;
    
    if (useTestMode) {
      // 测试模式：返回测试图片
      console.log('测试模式: 返回测试图片URL');
      
      // 返回一些测试图片URL
      const testImages = [
        'https://via.placeholder.com/512x512.png?text=Test+Image+1',
        'https://via.placeholder.com/512x512.png?text=Test+Image+2',
        'https://via.placeholder.com/512x512.png?text=Test+Image+3',
        'https://via.placeholder.com/512x512.png?text=Test+Image+4',
        'https://via.placeholder.com/512x512.png?text=Test+Image+5'
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
      const mockImageUrl = 'https://via.placeholder.com/512x512.png?text=API+Error';
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

// 启动服务器
app.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
});
