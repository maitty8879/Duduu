const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const bcrypt = require('bcrypt');
const path = require('path');
const axios = require('axios');

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
    
    // 调用 Coze API
    try {
      // API密钥 - 不要在公开文件中分享
      const cozeApiToken = process.env.COZE_API_TOKEN || 'YOUR_API_TOKEN_HERE';
      // 使用中国区域的API基础URL
      const cozeApiBase = 'https://api.coze.cn';
      
      // 发送请求到 Coze API
      console.log(`调用 Coze API: ${cozeApiBase}/open-api/v2/workflow-runs`);
      const response = await axios.post(
        `${cozeApiBase}/open-api/v2/workflow-runs`,
        { 
          workflow_id: actualWorkflowId,
          inputs: { prompt: actualPrompt } 
        },
        {
          headers: {
            'Authorization': `Pat ${cozeApiToken}`, // 使用Pat前缀而不是Bearer
            'Content-Type': 'application/json'
          }
        }
      );
      
      console.log('Coze API 响应:', response.data);
      
      // 检查是否有错误响应
      if (response.data.code && response.data.msg) {
        return res.status(500).json({ error: `Coze API错误: ${response.data.msg}` });
      }
      
      // 获取运行 ID
      const runId = response.data.id || response.data.run_id || response.data.workflow_run_id;
      console.log('获取到运行 ID:', runId);
      
      if (!runId) {
        return res.status(500).json({ error: '无法获取工作流运行ID' });
      }
      
      // 轮询获取结果
      let attempts = 0;
      const maxAttempts = 60; // 最多等待60秒
      
      const pollResult = async () => {
        try {
          console.log(`检查工作流状态: ${cozeApiBase}/open-api/v2/workflow-runs/${runId}`);
          const statusResponse = await axios.get(
            `${cozeApiBase}/open-api/v2/workflow-runs/${runId}`,
            {
              headers: {
                'Authorization': `Pat ${cozeApiToken}`, // 使用Pat前缀而不是Bearer
                'Content-Type': 'application/json'
              }
            }
          );
          
          console.log('Coze API 状态响应:', statusResponse.data);
          
          // 检查是否有错误响应
          if (statusResponse.data.code && statusResponse.data.msg) {
            return res.status(500).json({ error: `Coze API状态错误: ${statusResponse.data.msg}` });
          }
          
          const status = statusResponse.data.status?.toUpperCase();
          
          if (status === 'COMPLETED' || status === 'COMPLETE' || status === 'SUCCESS') {
            // 工作流完成，返回结果
            console.log('工作流完成，输出:', statusResponse.data.outputs);
            
            // 检查outputs是否存在
            if (!statusResponse.data.outputs) {
              return res.status(500).json({ error: '工作流输出为空' });
            }
            
            // 尝试从不同的可能字段获取图片URL
            let imageUrl;
            
            // 检查所有可能的输出字段
            if (statusResponse.data.outputs) {
              imageUrl = statusResponse.data.outputs.image_url || 
                       statusResponse.data.outputs.imageUrl || 
                       statusResponse.data.outputs.url ||
                       statusResponse.data.outputs.image;
            }
            
            // 如果在outputs中没有找到，尝试在响应的根级别查找
            if (!imageUrl) {
              imageUrl = statusResponse.data.image_url || 
                       statusResponse.data.imageUrl || 
                       statusResponse.data.url ||
                       statusResponse.data.image;
            }
            
            // 检查是否有图片数组
            if (!imageUrl && statusResponse.data.images && statusResponse.data.images.length > 0) {
              imageUrl = statusResponse.data.images[0];
            }
            
            console.log('找到的图片URL:', imageUrl);
            
            if (imageUrl) {
              return res.json({ 
                success: true, 
                runId: runId,
                imageUrl,
                outputs: statusResponse.data.outputs || { image_url: imageUrl }
              });
            } else {
              console.error('无法找到图片URL，完整输出:', statusResponse.data);
              return res.status(500).json({ error: '生成的图片URL不存在' });
            }
          }
          
          if (status === 'FAILED' || status === 'FAILURE' || status === 'ERROR') {
            console.error('工作流执行失败:', statusResponse.data);
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
          console.error('轮询 Coze 工作流状态失败:', pollError.response?.data || pollError.message);
          return res.status(500).json({ error: '获取工作流状态失败' });
        }
      };
      
      // 开始轮询
      pollResult();
      
    } catch (apiError) {
      console.error('Coze API 调用失败:', apiError.response?.data || apiError.message);
      return res.status(500).json({ error: '调用 Coze API 失败: ' + (apiError.response?.data?.msg || apiError.message) });
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
    
    // API密钥 - 不要在公开文件中分享
    const cozeApiToken = process.env.COZE_API_TOKEN || 'YOUR_API_TOKEN_HERE';
    // 使用中国区域的API基础URL
    const cozeApiBase = 'https://api.coze.cn';
    
    console.log(`检查工作流状态: ${cozeApiBase}/open-api/v2/workflow-runs/${runId}`);
    const statusResponse = await axios.get(
      `${cozeApiBase}/open-api/v2/workflow-runs/${runId}`,
      {
        headers: {
          'Authorization': `Pat ${cozeApiToken}`, // 使用Pat前缀而不是Bearer
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('Coze API 状态响应:', statusResponse.data);
    
    // 检查是否有错误响应
    if (statusResponse.data.code && statusResponse.data.msg) {
      return res.status(500).json({ error: `Coze API状态错误: ${statusResponse.data.msg}` });
    }
    
    // 尝试从不同的可能字段获取图片URL
    let imageUrl;
    
    // 检查所有可能的输出字段
    if (statusResponse.data.outputs) {
      imageUrl = statusResponse.data.outputs.image_url || 
               statusResponse.data.outputs.imageUrl || 
               statusResponse.data.outputs.url ||
               statusResponse.data.outputs.image;
    }
    
    // 如果在outputs中没有找到，尝试在响应的根级别查找
    if (!imageUrl) {
      imageUrl = statusResponse.data.image_url || 
               statusResponse.data.imageUrl || 
               statusResponse.data.url ||
               statusResponse.data.image;
    }
    
    // 检查是否有图片数组
    if (!imageUrl && statusResponse.data.images && statusResponse.data.images.length > 0) {
      imageUrl = statusResponse.data.images[0];
    }
    
    return res.json({
      success: true,
      status: statusResponse.data.status,
      outputs: statusResponse.data.outputs || { image_url: imageUrl }
    });
    
  } catch (error) {
    console.error('检查工作流状态错误:', error.response?.data || error.message);
    res.status(500).json({ 
      error: '检查工作流状态失败', 
      details: error.response?.data?.message || error.message 
    });
  }
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`)
});
