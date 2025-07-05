# 贡献指南

感谢您对善思 Blinko 智能收集器项目的关注！我们欢迎各种形式的贡献。

## 🤝 如何贡献

### 报告问题

如果您发现了bug或有功能建议：

1. 在 [Issues](https://github.com/tangchunwu/blinko-smart-collector/issues) 页面搜索是否已有相关问题
2. 如果没有，请创建新的Issue
3. 详细描述问题或建议，包括：
   - 问题的具体表现
   - 重现步骤
   - 期望的行为
   - 浏览器版本和操作系统
   - 相关的错误信息或截图

### 提交代码

1. **Fork项目**
   ```bash
   git clone https://github.com/tangchunwu/blinko-smart-collector.git
   cd blinko-smart-collector
   ```

2. **创建功能分支**
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **进行开发**
   - 遵循现有的代码风格
   - 添加必要的注释
   - 确保代码质量

4. **测试更改**
   - 在Chrome中加载扩展
   - 测试新功能或修复
   - 使用test.html页面进行功能验证

5. **提交更改**
   ```bash
   git add .
   git commit -m "feat: 添加新功能描述"
   git push origin feature/your-feature-name
   ```

6. **创建Pull Request**
   - 在GitHub上创建PR
   - 详细描述更改内容
   - 关联相关的Issue

## 📝 代码规范

### JavaScript规范

- 使用ES6+语法
- 使用2空格缩进
- 使用分号结尾
- 使用驼峰命名法
- 添加适当的注释

```javascript
// 好的示例
async function generateAISummary() {
  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    return await response.json();
  } catch (error) {
    console.error('AI摘要生成失败:', error);
    throw error;
  }
}
```

### HTML/CSS规范

- 使用语义化HTML标签
- CSS类名使用kebab-case
- 保持代码整洁和可读性

```html
<!-- 好的示例 -->
<div class="summary-section">
  <div class="section-header">
    <span class="section-title">原文摘要</span>
  </div>
</div>
```

### 提交信息规范

使用约定式提交格式：

- `feat:` 新功能
- `fix:` 修复bug
- `docs:` 文档更新
- `style:` 代码格式调整
- `refactor:` 代码重构
- `test:` 测试相关
- `chore:` 构建过程或辅助工具的变动

示例：
```
feat: 添加可编辑的AI摘要功能
fix: 修复标签删除时的显示问题
docs: 更新安装指南
```

## 🧪 测试指南

### 功能测试

1. **基础功能测试**
   - 页面信息识别
   - AI摘要生成
   - 个人想法记录
   - 标签管理
   - 内容提交

2. **兼容性测试**
   - 不同网站的内容提取
   - 各种AI服务的连接
   - 快捷键功能

3. **错误处理测试**
   - 网络连接失败
   - API配置错误
   - 无效的页面内容

### 测试环境

- Chrome 88+
- 不同操作系统（Windows、macOS、Linux）
- 各种类型的网页内容

## 🎯 开发重点

当前项目的开发重点：

1. **用户体验优化**
   - 界面响应速度
   - 操作流程简化
   - 错误提示改进

2. **功能扩展**
   - 更多AI服务支持
   - 高级内容处理
   - 批量操作功能

3. **稳定性提升**
   - 错误处理完善
   - 兼容性改进
   - 性能优化

## 📚 开发资源

### 相关文档

- [Chrome Extension API](https://developer.chrome.com/docs/extensions/)
- [Manifest V3](https://developer.chrome.com/docs/extensions/mv3/)
- [Blinko API文档](https://github.com/blinko-space/blinko)

### 项目结构

```
├── manifest.json      # 扩展配置
├── popup.html         # 主界面
├── popup.js          # 主界面逻辑
├── background.js     # 后台服务
├── content.js        # 内容脚本
├── options.html      # 配置页面
├── options.js        # 配置逻辑
└── test.html         # 测试页面
```

## 💬 交流讨论

- **GitHub Discussions**: [项目讨论区](https://github.com/tangchunwu/blinko-smart-collector/discussions)
- **Issues**: [问题反馈](https://github.com/tangchunwu/blinko-smart-collector/issues)
- **Email**: [2024123408s@mails.ccnu.edu.cn](mailto:2024123408s@mails.ccnu.edu.cn)

## 🙏 致谢

感谢所有为项目做出贡献的开发者！

---

再次感谢您的贡献！让我们一起让善思 Blinko 智能收集器变得更好。
