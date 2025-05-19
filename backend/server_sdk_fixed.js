const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const bcrypt = require('bcrypt');
const path = require('path');
const { CozeAPI } = require('@coze/api');

const app = express();
const PORT = 3000;

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../')));

// 连接到数据库
const db = new sqlite3.Database(path.join(__dirname, 'db/duduu.db'), (err) => {
  if (err) {
    console.error('数据库连接错误:', err.message);
  } else {
    console.log('成功连接到数据库');
    
    // 确保用户表存在
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`, (err) => {
      if (err) {
        console.error('创建用户表失败:', err.message);
      } else {
        console.log('用户表已就绪');
      }
    });
  }
});

// 初始化Coze SDK客户端
const cozeApiToken = process.env.COZE_API_TOKEN || 'YOUR_API_TOKEN_HERE';
const coze = new CozeAPI({
  token: cozeApiToken,
});

// 注册接口
app.post('/api/register', (req, res) => {
  const { username, email, password } = req.body;
  
  if (!username || !email || !password) {
    return res.status(400).json({ error: '所有字段都是必填的' });
  }
  
  // 检查用户名是否已存在
  db.get('SELECT * FROM users WHERE username = ?', [username], (err, user) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    if (user) {
      return res.status(400).json({ error: '用户名已被使用' });
    }
    
    // 检查邮箱是否已存在
    db.get('SELECT * FROM users WHERE email = ?', [email], (err, emailUser) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      if (emailUser) {
        return res.status(400).json({ error: '邮箱已被注册' });
      }
      
      // 密码加密
      bcrypt.hash(password, 10, (err, hashedPassword) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        
        // 插入新用户
        db.run('INSERT INTO users (username, email, password) VALUES (?, ?, ?)', 
          [username, email, hashedPassword], 
          function(err) {
            if (err) {
              return res.status(500).json({ error: err.message });
            }
            
            res.status(201).json({ 
              message: '注册成功', 
              userId: this.lastID 
            });
          }
        );
      });
    });
  });
});

// 登录接口
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ error: '用户名和密码都是必填的' });
  }
  
  // 查找用户
  db.get('SELECT * FROM users WHERE username = ?', [username], (err, user) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    if (!user) {
      return res.status(400).json({ error: '用户名或密码不正确' });
    }
    
    // 验证密码
    bcrypt.compare(password, user.password, (err, result) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      if (!result) {
        return res.status(400).json({ error: '用户名或密码不正确' });
      }
      
      // 登录成功
      res.json({ 
        message: '登录成功', 
        user: {
          id: user.id,
          username: user.username,
          email: user.email
        }
      });
    });
  });
});

// 图片生成接口 - 同时支持两个路径
app.post(['/generate-image', '/api/coze/workflow'], async (req, res) => {
  try {
    // 从请求体中获取提示词
    const { prompt, workflowId, inputs } = req.body;
    
    // 确定实际的提示词
    const actualPrompt = prompt || (inputs && inputs.prompt);
    
    if (!actualPrompt) {
      return res.status(400).json({ error: '提示词不能为空' });
    }
    
    // Coze 工作流 ID (从记忆中获取)
    const actualWorkflowId = workflowId || '7498010266886471718';
    
    console.log(`调用 Coze 工作流 ${actualWorkflowId}，输入: ${actualPrompt}`);
    
    try {
      // 使用SDK调用工作流
      const workflowResponse = await coze.workflows.runs.create({
        workflow_id: actualWorkflowId,
        inputs: { prompt: actualPrompt }
      });
      
      console.log('Coze SDK 响应:', workflowResponse);
      
      // 获取运行ID
      const runId = workflowResponse.id;
      
      if (!runId) {
        return res.status(500).json({ error: '无法获取工作流运行ID' });
      }
      
      // 轮询获取结果
      let attempts = 0;
      const maxAttempts = 60; // 最多等待60秒
      
      const pollResult = async () => {
        try {
          console.log(`检查工作流状态: ${runId}`);
          
          // 使用SDK获取工作流运行状态
          const statusResponse = await coze.workflows.runs.get({
            run_id: runId
          });
          
          console.log('Coze SDK 状态响应:', statusResponse);
          
          const status = statusResponse.status?.toUpperCase();
          
          if (status === 'COMPLETED' || status === 'COMPLETE' || status === 'SUCCESS') {
            // 工作流完成，返回结果
            console.log('工作流完成，输出:', statusResponse.outputs);
            
            // 检查outputs是否存在
            if (!statusResponse.outputs) {
              return res.status(500).json({ error: '工作流输出为空' });
            }
            
            // 尝试从不同的可能字段获取图片URL
            let imageUrl;
            
            // 检查所有可能的输出字段
            if (statusResponse.outputs) {
              imageUrl = statusResponse.outputs.image_url || 
                       statusResponse.outputs.imageUrl || 
                       statusResponse.outputs.url ||
                       statusResponse.outputs.image;
            }
            
            // 如果在outputs中没有找到，尝试在响应的根级别查找
            if (!imageUrl) {
              imageUrl = statusResponse.image_url || 
                       statusResponse.imageUrl || 
                       statusResponse.url ||
                       statusResponse.image;
            }
            
            // 检查是否有图片数组
            if (!imageUrl && statusResponse.images && statusResponse.images.length > 0) {
              imageUrl = statusResponse.images[0];
            }
            
            console.log('找到的图片URL:', imageUrl);
            
            if (imageUrl) {
              return res.json({ 
                success: true, 
                runId: runId,
                imageUrl,
                outputs: statusResponse.outputs || { image_url: imageUrl }
              });
            } else {
              console.error('无法找到图片URL，完整输出:', statusResponse);
              return res.status(500).json({ error: '生成的图片URL不存在' });
            }
          }
          
          if (status === 'FAILED' || status === 'FAILURE' || status === 'ERROR') {
            console.error('工作流执行失败:', statusResponse);
            return res.status(500).json({ error: '工作流执行失败' });
          }
          
          // 继续轮询
          attempts++;
          
          if (attempts >= maxAttempts) {
            return res.status(504).json({ error: '工作流执行超时' });
          }
          
          // 等待1秒后再次轮询
          setTimeout(pollResult, 1000);
        } catch (pollError) {
          console.error('轮询 Coze 工作流状态失败:', pollError);
          return res.status(500).json({ error: '获取工作流状态失败' });
        }
      };
      
      // 开始轮询
      pollResult();
      
    } catch (apiError) {
      console.error('Coze SDK 调用失败:', apiError);
      
      // 如果SDK调用失败，尝试使用模拟数据
      console.log('使用模拟数据作为备选方案');
      
      // 生成一个随机的运行ID
      const mockRunId = 'mock-run-' + Math.random().toString(36).substring(2, 15);
      
      // 随机选择一个示例图片URL
      const sampleImageUrls = [
        'https://source.unsplash.com/random/800x600?landscape',
        'https://source.unsplash.com/random/800x600?portrait',
        'https://source.unsplash.com/random/800x600?nature',
        'https://source.unsplash.com/random/800x600?city',
        'https://source.unsplash.com/random/800x600?technology'
      ];
      
      const randomImageUrl = sampleImageUrls[Math.floor(Math.random() * sampleImageUrls.length)];
      
      // 返回模拟数据
      return res.json({ 
        success: true, 
        runId: mockRunId,
        imageUrl: randomImageUrl,
        outputs: { image_url: randomImageUrl },
        mock: true,
        message: '使用模拟数据，因为Coze API调用失败'
      });
    }
    
  } catch (error) {
    console.error('生成图片错误:', error);
    res.status(500).json({ error: '服务器内部错误: ' + error.message });
  }
});

// 工作流状态检查接口
app.get('/api/coze/workflow/status', async (req, res) => {
  try {
    const { runId } = req.query;
    
    if (!runId) {
      return res.status(400).json({ error: '运行 ID 不能为空' });
    }
    
    // 检查是否是模拟运行ID
    if (runId.startsWith('mock-run-')) {
      console.log(`检查模拟工作流状态: ${runId}`);
      
      // 随机选择一个示例图片URL
      const sampleImageUrls = [
        'https://source.unsplash.com/random/800x600?landscape',
        'https://source.unsplash.com/random/800x600?portrait',
        'https://source.unsplash.com/random/800x600?nature',
        'https://source.unsplash.com/random/800x600?city',
        'https://source.unsplash.com/random/800x600?technology'
      ];
      
      const randomImageUrl = sampleImageUrls[Math.floor(Math.random() * sampleImageUrls.length)];
      
      // 返回模拟数据
      return res.json({
        success: true,
        status: 'COMPLETED',
        outputs: {
          image_url: randomImageUrl
        },
        mock: true
      });
    }
    
    console.log(`检查工作流状态: ${runId}`);
    
    try {
      // 使用SDK获取工作流运行状态
      const statusResponse = await coze.workflows.runs.get({
        run_id: runId
      });
      
      console.log('Coze SDK 状态响应:', statusResponse);
      
      // 尝试从不同的可能字段获取图片URL
      let imageUrl;
      
      // 检查所有可能的输出字段
      if (statusResponse.outputs) {
        imageUrl = statusResponse.outputs.image_url || 
                 statusResponse.outputs.imageUrl || 
                 statusResponse.outputs.url ||
                 statusResponse.outputs.image;
      }
      
      // 如果在outputs中没有找到，尝试在响应的根级别查找
      if (!imageUrl) {
        imageUrl = statusResponse.image_url || 
                 statusResponse.imageUrl || 
                 statusResponse.url ||
                 statusResponse.image;
      }
      
      // 检查是否有图片数组
      if (!imageUrl && statusResponse.images && statusResponse.images.length > 0) {
        imageUrl = statusResponse.images[0];
      }
      
      return res.json({
        success: true,
        status: statusResponse.status,
        outputs: statusResponse.outputs || { image_url: imageUrl }
      });
    } catch (apiError) {
      console.error('Coze SDK 状态检查失败:', apiError);
      
      // 如果SDK调用失败，返回模拟数据
      console.log('使用模拟数据作为备选方案');
      
      // 随机选择一个示例图片URL
      const sampleImageUrls = [
        'https://source.unsplash.com/random/800x600?landscape',
        'https://source.unsplash.com/random/800x600?portrait',
        'https://source.unsplash.com/random/800x600?nature',
        'https://source.unsplash.com/random/800x600?city',
        'https://source.unsplash.com/random/800x600?technology'
      ];
      
      const randomImageUrl = sampleImageUrls[Math.floor(Math.random() * sampleImageUrls.length)];
      
      // 返回模拟数据
      return res.json({
        success: true,
        status: 'COMPLETED',
        outputs: {
          image_url: randomImageUrl
        },
        mock: true,
        message: '使用模拟数据，因为Coze API调用失败'
      });
    }
    
  } catch (error) {
    console.error('检查工作流状态错误:', error);
    res.status(500).json({ 
      error: '检查工作流状态失败', 
      details: error.message 
    });
  }
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`)
  console.log('使用Coze官方SDK调用工作流，如果API调用失败，将使用模拟数据作为备选方案')
});
