// 简单的测试服务器，用于提供测试图片URL
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 3002;

// 启用CORS
app.use(cors());
app.use(express.json());

// 测试图片API
app.post('/api/test-image', (req, res) => {
  const { prompt } = req.body;
  
  console.log(`收到测试图片请求，提示词: ${prompt || '无'}`);
  
  // 返回一些可靠的测试图片URL
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
    prompt ? prompt.split(' ')[0] : 'default', 
    prompt && prompt.split(' ')[1] ? prompt.split(' ')[1] : ''
  ].filter(tag => tag);
  
  console.log('返回测试图片URL:', imageUrl);
  
  // 返回测试图片和标签
  return res.json({
    success: true,
    imageUrl,
    tags
  });
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`测试图片服务器运行在 http://localhost:${PORT}`);
});
