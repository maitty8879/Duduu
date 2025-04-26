// 认证相关的JavaScript代码
document.addEventListener('DOMContentLoaded', function() {
    // 检查用户是否已登录
    const user = JSON.parse(localStorage.getItem('duduu_user'));
    if (user) {
        updateUIForLoggedInUser(user);
    }
    
    // 登录表单提交
    const loginForm = document.querySelector('#loginForm .login-submit-btn');
    console.log('登录按钮元素:', loginForm);
    if (loginForm) {
        loginForm.addEventListener('click', function(e) {
            console.log('点击登录按钮');
            e.preventDefault();
            
            const username = document.getElementById('loginUsername').value;
            const password = document.getElementById('loginPassword').value;
            
            if (!username || !password) {
                alert('请填写所有必填字段');
                return;
            }
            
            console.log('发送登录请求:', { username, password });
            fetch('http://localhost:3000/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            })
            .then(response => response.json())
            .then(data => {
                if (data.error) {
                    alert(data.error);
                } else {
                    alert(data.message);
                    // 保存用户信息到本地存储
                    localStorage.setItem('duduu_user', JSON.stringify(data.user));
                    // 关闭登录弹窗
                    document.getElementById('loginModal').classList.remove('open');
                    document.body.style.overflow = '';
                    // 更新UI显示已登录状态
                    updateUIForLoggedInUser(data.user);
                }
            })
            .catch(error => {
                console.error('登录请求失败:', error);
                alert('登录失败，请稍后重试');
            });
        });
    }
    
    // 注册表单提交
    const registerForm = document.querySelector('#registerForm .login-submit-btn');
    if (registerForm) {
        registerForm.addEventListener('click', function(e) {
            e.preventDefault();
            
            const username = document.getElementById('registerUsername').value;
            const email = document.getElementById('registerEmail').value;
            const password = document.getElementById('registerPassword').value;
            const confirmPassword = document.getElementById('confirmPassword').value;
            
            if (!username || !email || !password || !confirmPassword) {
                alert('请填写所有必填字段');
                return;
            }
            
            if (password !== confirmPassword) {
                alert('两次输入的密码不一致');
                return;
            }
            
            fetch('http://localhost:3000/api/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, email, password })
            })
            .then(response => response.json())
            .then(data => {
                if (data.error) {
                    alert(data.error);
                } else {
                    alert(data.message);
                    // 自动切换到登录标签
                    document.querySelector('.login-tab[data-tab="login"]').click();
                }
            })
            .catch(error => {
                console.error('注册请求失败:', error);
                alert('注册失败，请稍后重试');
            });
        });
    }
});

// 更新UI显示已登录状态
function updateUIForLoggedInUser(user) {
    const loginBtn = document.getElementById('loginBtn');
    if (!loginBtn) return;
    
    loginBtn.innerHTML = `<i class="ri-user-line"></i> ${user.username}`;
    loginBtn.classList.add('logged-in');
    
    // 移除原有的点击事件
    const oldLoginBtn = loginBtn.cloneNode(true);
    loginBtn.parentNode.replaceChild(oldLoginBtn, loginBtn);
    
    // 添加用户菜单
    let userMenu = document.querySelector('.user-menu');
    if (!userMenu) {
        userMenu = document.createElement('div');
        userMenu.className = 'user-menu';
        userMenu.innerHTML = `
            <div class="user-menu-item" id="logoutBtn">退出登录</div>
        `;
        document.body.appendChild(userMenu);
    }
    
    // 点击用户名显示菜单
    oldLoginBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        userMenu.classList.toggle('show');
        
        // 定位菜单
        const rect = oldLoginBtn.getBoundingClientRect();
        userMenu.style.top = (rect.bottom + 5) + 'px';
        userMenu.style.right = (window.innerWidth - rect.right) + 'px';
    });
    
    // 退出登录
    document.getElementById('logoutBtn').addEventListener('click', function() {
        localStorage.removeItem('duduu_user');
        window.location.reload();
    });
    
    // 点击其他地方关闭用户菜单
    document.addEventListener('click', function() {
        userMenu.classList.remove('show');
    });
}

// 添加用户菜单样式
function addUserMenuStyles() {
    const style = document.createElement('style');
    style.textContent = `
        .user-menu {
            position: fixed;
            background-color: #1e1e1e;
            border-radius: 5px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
            padding: 5px 0;
            display: none;
            z-index: 1000;
        }
        
        .user-menu.show {
            display: block;
            animation: menuFadeIn 0.2s ease;
        }
        
        @keyframes menuFadeIn {
            from { opacity: 0; transform: translateY(-10px); }
            to { opacity: 1; transform: translateY(0); }
        }
        
        .user-menu-item {
            padding: 8px 15px;
            cursor: pointer;
            color: #ddd;
            transition: background-color 0.2s;
            white-space: nowrap;
        }
        
        .user-menu-item:hover {
            background-color: rgba(255, 255, 255, 0.1);
            color: #fff;
        }
        
        .login-btn.logged-in {
            background-color: #2c2c2c;
        }
    `;
    document.head.appendChild(style);
}

// 添加用户菜单样式
addUserMenuStyles();
