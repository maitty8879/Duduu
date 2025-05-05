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
const client = new CozeAPI({
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
      // 使用SDK调用工作流 - 根据官方示例
      const workflow = await client.workflows.runs.create({
        workflow_id: actualWorkflowId,
        parameters: { prompt: actualPrompt },
        is_async: true, // 异步执行工作流
      });
      
      console.log('工作流启动成功:', workflow);
      
      // 获取执行ID
      const executeId = workflow.execute_id;
      
      if (!executeId) {
        return res.status(500).json({ error: '无法获取工作流执行ID' });
      }
      
      // 轮询获取结果
      let attempts = 0;
      const maxAttempts = 60; // 最多等待60秒
      
      const pollResult = async () => {
        try {
          console.log(`检查工作流状态: ${actualWorkflowId}, 执行ID: ${executeId}`);
          
          // 使用SDK获取工作流运行历史
          const history = await client.workflows.runs.history(
            actualWorkflowId,
            executeId
          );
          
          console.log('工作流历史:', history);
          
          if (!history || history.length === 0) {
            attempts++;
            if (attempts >= maxAttempts) {
              return res.status(504).json({ error: '工作流执行超时' });
            }
            setTimeout(pollResult, 1000);
            return;
          }
          
          const latestRun = history[0];
          const status = latestRun.execute_status;
          
          if (status !== 'Running') {
            // 工作流完成，获取结果
            console.log('工作流完成，获取结果');
            
            // 获取工作流运行详情
            const runDetail = await client.workflows.runs.get({
              workflow_id: actualWorkflowId,
              execute_id: executeId
            });
            
            console.log('工作流运行详情:', runDetail);
            
            // 尝试从不同的可能字段获取图片URL
            let imageUrl;
            
            // 检查所有可能的输出字段
            if (runDetail.outputs) {
              imageUrl = runDetail.outputs.image_url || 
                       runDetail.outputs.imageUrl || 
                       runDetail.outputs.url ||
                       runDetail.outputs.image;
            }
            
            // 如果在outputs中没有找到，尝试在响应的根级别查找
            if (!imageUrl) {
              imageUrl = runDetail.image_url || 
                       runDetail.imageUrl || 
                       runDetail.url ||
                       runDetail.image;
            }
            
            console.log('找到的图片URL:', imageUrl);
            
            if (imageUrl) {
              return res.json({ 
                success: true, 
                executeId: executeId,
                imageUrl,
                outputs: runDetail.outputs || { image_url: imageUrl }
              });
            } else {
              console.error('无法找到图片URL，完整输出:', runDetail);
              
              // 如果找不到图片URL，使用模拟数据
              useMockData(res);
            }
          } else {
            // 继续轮询
            attempts++;
            
            if (attempts >= maxAttempts) {
              return res.status(504).json({ error: '工作流执行超时' });
            }
            
            // 等待1秒后再次轮询
            setTimeout(pollResult, 1000);
          }
        } catch (pollError) {
          console.error('轮询工作流状态失败:', pollError);
          
          // 如果轮询失败，使用模拟数据
          useMockData(res);
        }
      };
      
      // 开始轮询
      pollResult();
      
    } catch (apiError) {
      console.error('Coze SDK 调用失败:', apiError);
      
      // 如果SDK调用失败，使用模拟数据
      useMockData(res);
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
    if (runId.startsWith('mock-')) {
      console.log(`检查模拟工作流状态: ${runId}`);
      
      // 返回模拟数据
      useMockData(res);
      return;
    }
    
    // 工作流ID和执行ID
    const workflowId = '7498010266886471718'; // 默认工作流ID
    const executeId = runId;
    
    console.log(`检查工作流状态: ${workflowId}, 执行ID: ${executeId}`);
    
    try {
      // 获取工作流运行历史
      const history = await client.workflows.runs.history(
        workflowId,
        executeId
      );
      
      console.log('工作流历史:', history);
      
      if (!history || history.length === 0) {
        return res.status(404).json({ error: '找不到工作流运行记录' });
      }
      
      const latestRun = history[0];
      const status = latestRun.execute_status;
      
      if (status !== 'Running') {
        // 工作流完成，获取结果
        console.log('工作流完成，获取结果');
        
        // 获取工作流运行详情
        const runDetail = await client.workflows.runs.get({
          workflow_id: workflowId,
          execute_id: executeId
        });
        
        console.log('工作流运行详情:', runDetail);
        
        // 尝试从不同的可能字段获取图片URL
        let imageUrl;
        
        // 检查所有可能的输出字段
        if (runDetail.outputs) {
          imageUrl = runDetail.outputs.image_url || 
                   runDetail.outputs.imageUrl || 
                   runDetail.outputs.url ||
                   runDetail.outputs.image;
        }
        
        // 如果在outputs中没有找到，尝试在响应的根级别查找
        if (!imageUrl) {
          imageUrl = runDetail.image_url || 
                   runDetail.imageUrl || 
                   runDetail.url ||
                   runDetail.image;
        }
        
        console.log('找到的图片URL:', imageUrl);
        
        if (imageUrl) {
          return res.json({ 
            success: true, 
            status: status,
            imageUrl,
            outputs: runDetail.outputs || { image_url: imageUrl }
          });
        } else {
          console.error('无法找到图片URL，完整输出:', runDetail);
          
          // 如果找不到图片URL，使用模拟数据
          useMockData(res);
        }
      } else {
        // 工作流仍在运行
        return res.json({
          success: true,
          status: 'RUNNING',
          message: '工作流正在运行中'
        });
      }
    } catch (apiError) {
      console.error('Coze SDK 状态检查失败:', apiError);
      
      // 如果SDK调用失败，使用模拟数据
      useMockData(res);
    }
    
  } catch (error) {
    console.error('检查工作流状态错误:', error);
    res.status(500).json({ 
      error: '检查工作流状态失败', 
      details: error.message 
    });
  }
});

// 使用模拟数据的辅助函数
function useMockData(res) {
  console.log('使用模拟数据作为备选方案');
  
  // 生成一个随机的运行ID
  const mockRunId = 'mock-' + Math.random().toString(36).substring(2, 15);
  
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
    executeId: mockRunId,
    imageUrl: randomImageUrl,
    outputs: { image_url: randomImageUrl },
    mock: true,
    message: '使用模拟数据，因为Coze API调用失败'
  });
}

// 启动服务器
app.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`)
  console.log('使用Coze官方SDK调用工作流，如果API调用失败，将使用模拟数据作为备选方案')
});
