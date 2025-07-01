# 善思 Blinko 智能收集器 - 安装指南

## 📦 快速安装

### 方法一：从GitHub下载（推荐）

1. **下载项目**
   ```bash
   git clone https://github.com/tangchunwu/blinko-smart-collector.git
   cd blinko-smart-collector
   ```

2. **在Chrome中安装**
   - 打开Chrome浏览器
   - 访问 `chrome://extensions/`
   - 开启右上角的"开发者模式"
   - 点击"加载已解压的扩展程序"
   - 选择项目文件夹

3. **验证安装**
   - 在扩展栏中找到"善思 Blinko智能收集器"图标
   - 点击图标，应该能看到新的界面

### 方法二：下载ZIP文件

1. 访问 [GitHub Release页面](https://github.com/tangchunwu/blinko-smart-collector/releases)
2. 下载最新版本的ZIP文件
3. 解压到本地文件夹
4. 按照方法一的步骤2-3进行安装

## ⚙️ 配置设置

### 1. 基础配置

安装完成后，首次使用需要配置：

1. **点击扩展图标**
2. **点击右上角的设置按钮（⚙️）**
3. **配置Blinko API**：
   - API地址：`https://your-blinko-domain.com/api/v1/note/upsert`
   - Token：从Blinko设置中获取
4. **点击"测试Blinko连接"**确保配置正确

### 2. AI服务配置（可选）

如果需要使用AI摘要功能：

1. **选择AI服务商**（OpenAI、Claude、DeepSeek等）
2. **填入API密钥**
3. **选择合适的模型**
4. **点击"测试AI连接"**

### 3. 智能分类配置

- 启用智能分类功能
- 调整分类置信度阈值
- 配置自动标签生成

## 🚀 开始使用

### 基本操作流程

1. **打开任意网页**
2. **点击扩展图标**
3. **查看自动识别的页面信息**
4. **点击"AI总结"生成摘要**（可编辑）
5. **在"个人想法"区域添加思考**
6. **管理智能生成的标签**
7. **点击"提交到Blinko"保存**

### 快捷键操作

- `Ctrl+Shift+S` (Mac: `Cmd+Shift+S`) - 快速收集当前页面
- `Ctrl+Shift+A` (Mac: `Cmd+Shift+A`) - AI总结当前文章
- `Ctrl+Shift+C` (Mac: `Cmd+Shift+C`) - 收集选中文本
- `Ctrl+Shift+O` (Mac: `Cmd+Shift+O`) - 打开配置页面

## 🧪 功能测试

项目包含了测试页面，可以用来验证功能：

1. **打开测试页面**：在浏览器中打开项目中的 `test.html` 文件
2. **测试各项功能**：
   - 页面信息识别
   - AI摘要生成
   - 个人想法记录
   - 标签管理
   - 内容提交

## ❓ 常见问题

### Q: 扩展安装后图标不显示？
A: 检查是否开启了开发者模式，并确保选择了正确的文件夹。

### Q: 无法连接到Blinko？
A: 检查API地址格式是否正确，Token是否有效。系统会自动尝试修正常见的地址格式问题。

### Q: AI摘要功能不工作？
A: 确保已配置AI服务的API密钥，并且网络连接正常。

### Q: 快捷键不生效？
A: 在 `chrome://extensions/shortcuts` 页面检查快捷键设置，可能与其他扩展冲突。

## 🔧 故障排除

### 1. 检查控制台错误
- 按F12打开开发者工具
- 查看Console标签页的错误信息

### 2. 重新加载扩展
- 在 `chrome://extensions/` 页面
- 点击扩展的"重新加载"按钮

### 3. 清除配置
- 在配置页面点击"重置配置"
- 重新进行配置

## 📞 获取帮助

如果遇到问题，可以通过以下方式获取帮助：

- **GitHub Issues**: [提交问题](https://github.com/tangchunwu/blinko-smart-collector/issues)
- **邮件联系**: [2024123408s@mails.ccnu.edu.cn](mailto:2024123408s@mails.ccnu.edu.cn)
- **项目主页**: [https://github.com/tangchunwu/blinko-smart-collector](https://github.com/tangchunwu/blinko-smart-collector)

---

**善思 Blinko 智能收集器** - 让知识收集更智能，让思考记录更简单。
