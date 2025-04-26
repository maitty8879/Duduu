const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const bcrypt = require('bcrypt');
const path = require('path');

const app = express();
const PORT = 3000;

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../')));

// 连接到数据库
const db = new sqlite3.Database('./db/duduu.db', (err) => {
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

// 启动服务器
app.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
});
