# 镜头页面产品需求文档（PRD）

## 1. 产品概述

### 1.1 产品背景

随着AI绘画和图像创作的普及，用户对于高质量提示词（Prompt）和参考图片的需求日益增长。本产品旨在提供一个集图片展示、提示词分享和社区互动于一体的平台，帮助创作者获取灵感并提高创作效率。

### 1.2 产品定位

面向AI绘画爱好者、设计师和内容创作者的灵感与资源共享平台。

### 1.3 目标用户

- AI绘画爱好者
- 专业设计师
- 内容创作者
- 对视觉艺术感兴趣的普通用户

## 2. 功能需求

### 2.1 首页瀑布流展示

#### 2.1.1 图片瀑布流

- **功能描述**：首页采用瀑布流布局展示图片，根据屏幕宽度自适应调整列数。
- **技术要求**：
  - 图片懒加载，提高页面加载速度
  - 自适应不同尺寸的图片
  - 无限滚动加载更多内容
  - 图片加载时显示占位符

#### 2.1.2 图片卡片

- **功能描述**：每个图片卡片包含以下元素：
  - 缩略图
  - 标签信息（最多显示3个）
  - 复制提示词按钮（悬浮显示）
- **交互要求**：
  - 鼠标悬浮时显示复制提示词按钮
  - 点击图片打开详情弹层
  - 点击标签进行对应标签筛选

### 2.2 标签筛选器

- **功能描述**：页面顶部提供标签筛选功能，用户可以通过选择标签筛选相关图片。
- **技术要求**：
  - 支持多选标签（与逻辑）
  - 标签分类展示
  - 支持搜索标签
  - 显示热门标签
  - 记住用户的筛选条件（本地存储）

### 2.3 图片详情弹层

- **功能描述**：点击图片后弹出详情层，展示原图及详细信息。
- **内容包括**：
  - 原图（支持放大查看）
  - 完整提示词文本
  - 上传者信息
  - 复制提示词按钮
  - 图片标签
  - 分享功能
- **交互要求**：
  - 支持键盘方向键浏览上一张/下一张
  - ESC键关闭弹层
  - 点击空白区域关闭弹层
  - 复制成功后有反馈提示

### 2.4 图片上传功能

- **功能描述**：通过右下角浮动按钮打开上传面板，用户可上传图片并填写相关信息。
- **上传流程**：
  - 点击右下角"+"按钮
  - 从右侧滑出上传面板
  - 上传图片（支持拖拽上传）
  - 填写提示词
  - 选择/添加标签
  - 填写上传者信息
  - 提交
- **技术要求**：
  - 支持图片预览
  - 图片格式限制（JPG, PNG, WEBP等）
  - 图片大小限制（建议不超过10MB）
  - 图片尺寸建议
  - 上传进度显示

## 3. 用户流程

### 3.1 浏览流程

1. 用户进入首页，查看瀑布流图片
2. 可选择顶部标签进行筛选
3. 点击感兴趣的图片，查看详情
4. 可复制提示词或继续浏览其他图片

### 3.2 上传流程

1. 点击右下角"+"按钮
2. 在上传面板中上传图片
3. 填写提示词和选择标签
4. 填写上传者信息
5. 提交上传
6. 显示上传成功提示

## 4. 界面设计

### 4.1 首页布局

- 顶部：导航栏、标签筛选器
- 中间：图片瀑布流
- 右下角：上传按钮（固定悬浮）

### 4.2 图片卡片设计

- 圆角设计
- 阴影效果
- 标签显示在左下角
- 复制按钮悬浮在右下角

### 4.3 详情弹层设计

- 居中显示
- 半透明背景遮罩
- 图片占据主要视觉空间
- 信息区域在图片下方

### 4.4 上传面板设计

- 从右侧滑入
- 分步骤引导填写
- 清晰的提交按钮

## 5. 技术要求

### 5.1 前端技术栈

- React/Next.js
- TypeScript
- TailwindCSS
- 状态管理：React Context或Redux

### 5.2 性能要求

- 首屏加载时间<2秒
- 图片懒加载
- 合理的缓存策略
- 响应式设计，适配移动端和桌面端

### 5.3 兼容性要求

- 支持主流浏览器的最新两个版本
- 移动端适配

## 6. 未来规划

### 6.1 功能扩展

- 用户账户系统
- 收藏功能
- 评论系统
- AI提示词优化建议
- 多语言支持

### 6.2 商业化可能

- 优质提示词付费下载
- 定制提示词服务
- 广告投放

## 7. 项目时间线

- 需求确认：1周
- 设计阶段：2周
- 开发阶段：4周
- 测试阶段：1周
- 上线准备：1周

总计：约9周

## 8. 风险评估

- 内容审核机制缺失可能导致不适当内容上传
- 版权问题需要明确用户上传内容的版权归属
- 服务器成本随用户增长而增加
- 用户活跃度维持需要持续的内容更新

## 9. 成功指标

- 月活跃用户数
- 图片上传数量
- 提示词复制次数
- 用户停留时间
- 回访率

## 10. 图片后台管理系统

### 10.1 系统概述

图片后台管理系统是一个专为管理员设计的工具，用于管理图片生成、审核和发布流程。系统将集成Coze API，实现图片自动生成、标签提取和前端展示的全流程管理。

### 10.2 核心功能

#### 10.2.1 提示词输入与Coze API调用

- **功能描述**：通过输入提示词，调用Coze工作流生成图片。
- **技术要求**：
  - 提供提示词输入界面
  - 将用户输入的提示词作为input字段传入Coze API
  - 支持多种图片生成参数设置（可选）
  - 显示API调用状态和进度

#### 10.2.2 结果提取与结构化处理

- **功能描述**：从Coze API返回的数据中提取所需信息。
- **技术要求**：
  - 监听并提取event:conversation.message.delta中的content内容
  - 解析返回的JSON格式数据
  - 提取生成的图片URL和相关信息
  - 在前端直接展示提取的内容

#### 10.2.3 自动标签生成

- **功能描述**：使用大模型根据提示词自动生成匹配的标签。
- **技术要求**：
  - 分析提示词内容生成相关标签
  - 支持手动编辑和调整自动生成的标签
  - 标签数量控制在5-10个之间
  - 保存标签与图片的关联关系

#### 10.2.4 图片发布与前端展示

- **功能描述**：将生成的图片、提示词和标签同步到前端网站的图片瀑布流。
- **技术要求**：
  - 提供图片预览功能
  - 支持编辑图片信息（标题、描述等）
  - 可选择发布状态（公开、私有等）
  - 发布后自动更新前端数据源

### 10.3 用户流程

1. 管理员登录后台系统
2. 输入提示词并提交
3. 系统调用Coze API生成图片
4. 系统自动提取API返回结果
5. 系统自动生成相关标签
6. 管理员预览生成的图片和信息
7. 管理员编辑和确认信息
8. 提交发布，数据同步至前端瀑布流

### 10.4 界面设计

- **提示词输入区域**：
  - 文本输入框
  - 提交按钮
  - 高级选项（可折叠）

- **图片预览区域**：
  - 图片展示
  - 缩放控制
  - 保存/下载按钮

- **信息编辑区域**：
  - 标题输入
  - 提示词显示（可编辑）
  - 标签编辑（添加/删除）
  - 状态选择

- **操作区域**：
  - 保存草稿
  - 发布按钮
  - 取消按钮

### 10.5 技术要求

- **后端技术**：
  - Node.js/Express
  - Coze API集成
  - 大模型API集成
  - 数据库存储（SQLite/MongoDB）

- **前端技术**：
  - React/Vue.js
  - 响应式设计
  - 实时状态更新
  - 表单验证

- **安全要求**：
  - API密钥安全存储
  - 管理员权限控制
  - 输入验证和过滤
  - 防止CSRF攻击

### 10.6 未来扩展

- 批量图片生成功能
- 图片编辑和优化功能
- AI提示词推荐功能
- 生成历史记录和数据分析
- 多语言支持