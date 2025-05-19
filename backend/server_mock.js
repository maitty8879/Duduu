const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3000;

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../')));

// 模拟图片生成接口 - 同时支持两个路径
app.post(['/generate-image', '/api/coze/workflow'], async (req, res) => {
  try {
    // 从请求体中获取提示词
    const { prompt, workflowId, inputs } = req.body;
    
    // 确定实际的提示词
    const actualPrompt = prompt || (inputs && inputs.prompt);
    
    if (!actualPrompt) {
      return res.status(400).json({ error: '提示词不能为空' });
    }
    
    console.log(`模拟调用 Coze 工作流，输入: ${actualPrompt}`);
    
    // 生成一个随机的运行ID
    const runId = 'mock-run-' + Math.random().toString(36).substring(2, 15);
    
    // 返回成功响应，包含运行ID
    return res.json({
      success: true,
      runId: runId,
      message: '工作流已启动，请使用状态API检查结果'
    });
    
  } catch (error) {
    console.error('生成图片错误:', error);
    res.status(500).json({ error: '服务器内部错误: ' + error.message });
  }
});

// 模拟工作流状态检查接口
app.get('/api/coze/workflow/status', async (req, res) => {
  try {
    const { runId } = req.query;
    
    if (!runId) {
      return res.status(400).json({ error: '运行 ID 不能为空' });
    }
    
    console.log(`模拟检查工作流状态: ${runId}`);
    
    // 随机选择一个示例图片URL
    const sampleImageUrls = [
      'https://source.unsplash.com/random/800x600?landscape',
      'https://source.unsplash.com/random/800x600?portrait',
      'https://source.unsplash.com/random/800x600?nature',
      'https://source.unsplash.com/random/800x600?city',
      'https://source.unsplash.com/random/800x600?technology'
    ];
    
    const randomImageUrl = sampleImageUrls[Math.floor(Math.random() * sampleImageUrls.length)];
    
    // 返回成功响应，包含模拟的图片URL
    return res.json({
      success: true,
      status: 'COMPLETED',
      outputs: {
        image_url: randomImageUrl
      }
    });
    
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
  console.log(`模拟服务器运行在 http://localhost:${PORT}`)
  console.log('这是一个模拟服务器，用于测试前端功能，不会真正调用Coze API')
  console.log('点击"生成同款"按钮将返回随机的示例图片')
});
