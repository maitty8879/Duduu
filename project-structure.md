# Duduu 项目结构与开发指南

## 目录结构

```
├── components/                 # UI组件
│   ├── layout/                # 布局组件
│   │   ├── Header.tsx         # 顶部导航和标签筛选器
│   │   ├── Footer.tsx         # 页脚组件
│   │   └── Layout.tsx         # 主布局组件
│   ├── ui/                    # 基础UI组件
│   │   ├── Button.tsx         # 按钮组件
│   │   ├── Card.tsx           # 卡片组件
│   │   ├── Modal.tsx          # 模态框组件
│   │   └── Tag.tsx            # 标签组件
│   ├── gallery/               # 图库相关组件
│   │   ├── ImageCard.tsx      # 图片卡片组件
│   │   ├── ImageDetail.tsx    # 图片详情组件
│   │   ├── ImageGrid.tsx      # 图片瀑布流组件
│   │   └── TagFilter.tsx      # 标签筛选组件
│   └── upload/                # 上传相关组件
│       ├── UploadButton.tsx   # 上传按钮组件
│       ├── UploadForm.tsx     # 上传表单组件
│       └── UploadPanel.tsx    # 上传面板组件
├── pages/                     # 页面组件
│   ├── _app.tsx               # 应用入口
│   ├── _document.tsx          # 文档设置
│   ├── index.tsx              # 首页
│   └── api/                   # API路由
│       ├── images/            # 图片相关API
│       └── tags/              # 标签相关API
├── public/                    # 静态资源
│   ├── images/                # 图片资源
│   └── favicon.ico            # 网站图标
├── styles/                    # 全局样式
│   └── globals.css            # 全局CSS
├── types/                     # TypeScript类型定义
│   ├── image.ts               # 图片相关类型
│   └── tag.ts                 # 标签相关类型
├── utils/                     # 工具函数
│   ├── api.ts                 # API请求函数
│   └── helpers.ts             # 辅助函数
├── hooks/                     # 自定义Hooks
│   ├── useImages.ts           # 图片数据Hook
│   └── useTags.ts             # 标签数据Hook
├── context/                   # React Context
│   └── AppContext.tsx         # 应用全局状态
├── .gitignore                 # Git忽略文件
├── next.config.js             # Next.js配置
├── package.json               # 项目依赖
├── tsconfig.json              # TypeScript配置
├── tailwind.config.js         # Tailwind配置
├── postcss.config.js          # PostCSS配置
├── README.md                  # 项目说明
└── PRD.md                     # 产品需求文档
```

## 开发指南

### 技术选型说明

1. **Next.js**: 提供服务端渲染和静态生成能力，优化首屏加载速度和SEO表现
2. **TypeScript**: 提供类型安全，减少运行时错误
3. **TailwindCSS**: 原子化CSS框架，提高开发效率
4. **Shadcn UI**: 基于Radix UI的组件库，提供高可访问性的UI组件
5. **React Context**: 轻量级状态管理解决方案，适合中小型应用

### 组件设计原则

1. **组件职责单一**: 每个组件只负责一个功能点
2. **组件可复用**: 设计时考虑组件的复用性
3. **组件可测试**: 组件设计便于单元测试
4. **组件可访问性**: 符合WCAG标准，支持键盘操作和屏幕阅读器

### 数据流设计

1. **全局状态**: 使用React Context管理全局状态
2. **组件状态**: 使用useState管理组件内部状态
3. **服务端数据**: 使用SWR或React Query管理服务端数据

### 性能优化策略

1. **图片优化**: 使用Next.js的Image组件进行图片优化
2. **代码分割**: 使用动态导入减小初始加载体积
3. **懒加载**: 组件和图片使用懒加载
4. **缓存策略**: 合理使用浏览器缓存和SWR缓存

### 开发流程

1. **需求分析**: 根据PRD文档分析需求
2. **组件设计**: 设计组件结构和接口
3. **开发实现**: 按照组件设计进行开发
4. **测试验证**: 进行单元测试和集成测试
5. **代码审查**: 进行代码审查和优化
6. **部署上线**: 部署到生产环境

### 代码规范

1. **命名规范**: 使用有意义的命名，组件使用PascalCase，函数使用camelCase
2. **注释规范**: 关键逻辑和复杂算法需要添加注释
3. **代码格式**: 使用ESLint和Prettier保持代码风格一致
4. **提交规范**: 使用Conventional Commits规范提交信息

### 推荐的开发工具

1. **VS Code**: 推荐的代码编辑器
2. **ESLint**: 代码质量检查工具
3. **Prettier**: 代码格式化工具
4. **Husky**: Git钩子工具，用于提交前检查
5. **Storybook**: 组件开发和文档工具

## 开发重点与难点

1. **瀑布流布局**: 实现响应式的瀑布流布局，需要考虑不同尺寸图片的展示
2. **图片懒加载**: 优化首屏加载速度，提升用户体验
3. **标签筛选**: 实现多标签组合筛选，需要考虑筛选逻辑和性能
4. **上传功能**: 实现拖拽上传和图片预览，需要考虑文件处理和上传进度
5. **详情弹层**: 实现图片详情弹层，需要考虑图片查看和信息展示

## 后续优化方向

1. **性能优化**: 进一步优化首屏加载速度和交互响应速度
2. **用户体验**: 优化交互细节，提升用户体验
3. **功能扩展**: 根据用户反馈，扩展更多功能
4. **国际化**: 支持多语言
5. **无障碍优化**: 进一步优化无障碍体验

## 参考资源

1. [Next.js文档](https://nextjs.org/docs)
2. [TailwindCSS文档](https://tailwindcss.com/docs)
3. [Shadcn UI文档](https://ui.shadcn.com)
4. [React文档](https://reactjs.org/docs)
5. [TypeScript文档](https://www.typescriptlang.org/docs)