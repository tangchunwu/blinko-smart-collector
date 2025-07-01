
// Blinko智能收集器 - 增强版Popup脚本
// 支持内容编辑、标签管理、个人想法等功能

class BlinkoCollector {
  constructor() {
    this.currentTab = null;
    this.pageInfo = {};
    this.tags = [];
    this.aiContent = '';
    this.isGeneratingAI = false;
    
    this.init();
  }

  async init() {
    await this.loadPageInfo();
    this.bindEvents();
    await this.loadSavedContent();
    this.initializeTags();
  }

  // 加载页面信息
  async loadPageInfo() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      this.currentTab = tab;
      this.pageInfo = {
        title: tab.title,
        url: tab.url,
        domain: new URL(tab.url).hostname
      };

      // 更新UI显示
      document.getElementById('pageTitle').textContent = this.pageInfo.title;
      document.getElementById('pageUrl').textContent = this.pageInfo.url;
      
      // 自动提取页面摘要
      await this.extractPageSummary();
      
    } catch (error) {
      console.error('加载页面信息失败:', error);
      this.showStatus('❌ 获取页面信息失败', 'error');
    }
  }

  // 提取页面摘要
  async extractPageSummary() {
    try {
      const [result] = await chrome.scripting.executeScript({
        target: { tabId: this.currentTab.id },
        function: this.extractPageContent
      });

      if (result.result) {
        const summary = this.formatPageSummary(result.result);
        document.getElementById('summaryContent').value = summary;
      }
    } catch (error) {
      console.error('提取页面内容失败:', error);
    }
  }

  // 在页面上下文中执行的内容提取函数
  extractPageContent() {
    // 尝试多种选择器来获取主要内容
    const selectors = [
      'article',
      '[role="main"]',
      '.content',
      '.post-content',
      '.entry-content',
      '.article-content',
      'main'
    ];
    
    let content = '';
    let title = document.title;
    
    // 获取描述
    const description = document.querySelector('meta[name="description"]')?.content || 
                       document.querySelector('meta[property="og:description"]')?.content || '';
    
    // 尝试获取主要内容
    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element) {
        // 清理内容
        const cloned = element.cloneNode(true);
        const unwanted = cloned.querySelectorAll('script, style, nav, header, footer, .ad, .advertisement, .sidebar');
        unwanted.forEach(el => el.remove());
        
        content = cloned.innerText || cloned.textContent;
        break;
      }
    }
    
    // 如果没有找到主要内容，使用body
    if (!content) {
      content = document.body.innerText || document.body.textContent;
    }
    
    // 清理和截取内容
    content = content.replace(/\s+/g, ' ').trim();
    if (content.length > 500) {
      content = content.substring(0, 500) + '...';
    }
    
    return {
      title,
      description,
      content,
      url: window.location.href
    };
  }

  // 格式化页面摘要
  formatPageSummary(pageData) {
    let summary = `📄 ${pageData.title}\n\n`;
    
    if (pageData.description) {
      summary += `📝 描述：${pageData.description}\n\n`;
    }
    
    if (pageData.content) {
      summary += `📖 内容摘要：\n${pageData.content}\n\n`;
    }
    
    summary += `🔗 链接：${pageData.url}\n`;
    summary += `📅 收集时间：${new Date().toLocaleString()}`;
    
    return summary;
  }

  // 绑定事件监听器
  bindEvents() {
    // 标签页切换
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => this.switchTab(e.target.dataset.tab));
    });

    // 生成AI总结
    document.getElementById('generateAiBtn').addEventListener('click', () => this.generateAISummary());

    // 标签输入
    document.getElementById('tagInput').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.addTag(e.target.value.trim());
        e.target.value = '';
      }
    });

    // 操作按钮
    document.getElementById('previewBtn').addEventListener('click', () => this.previewContent());
    document.getElementById('saveBtn').addEventListener('click', () => this.saveContent());
    document.getElementById('settingsBtn').addEventListener('click', () => this.openSettings());

    // 内容自动保存
    ['summaryContent', 'aiContent', 'thoughtsContent'].forEach(id => {
      const element = document.getElementById(id);
      element.addEventListener('input', () => this.autoSave());
    });

    // AI内容编辑权限
    document.getElementById('aiContent').addEventListener('focus', () => {
      if (this.aiContent) {
        document.getElementById('aiContent').removeAttribute('readonly');
      }
    });
  }

  // 切换标签页
  switchTab(tabName) {
    // 更新标签按钮状态
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

    // 切换内容区域
    document.querySelectorAll('.content-section').forEach(section => {
      section.classList.remove('active');
    });
    document.getElementById(`${tabName}Section`).classList.add('active');
  }

  // 生成AI总结
  async generateAISummary() {
    if (this.isGeneratingAI) return;
    
    this.isGeneratingAI = true;
    const btn = document.getElementById('generateAiBtn');
    const originalText = btn.innerHTML;
    
    try {
      btn.innerHTML = '<span class="loading"></span> 生成中...';
      btn.disabled = true;
      
      this.showStatus('🤖 正在生成AI总结...', 'info');

      // 发送消息给background script
      const response = await chrome.runtime.sendMessage({
        action: 'generateAISummary',
        tab: this.currentTab,
        content: document.getElementById('summaryContent').value
      });

      if (response && response.success) {
        this.aiContent = response.summary;
        document.getElementById('aiContent').value = this.aiContent;
        document.getElementById('aiContent').removeAttribute('readonly');
        
        // 自动切换到AI总结标签
        this.switchTab('ai');
        
        this.showStatus('✅ AI总结生成成功', 'success');
        
        // 自动生成智能标签
        await this.generateSmartTags();
        
      } else {
        throw new Error(response?.error || '生成失败');
      }
      
    } catch (error) {
      console.error('AI总结生成失败:', error);
      this.showStatus('❌ AI总结生成失败：' + error.message, 'error');
    } finally {
      btn.innerHTML = originalText;
      btn.disabled = false;
      this.isGeneratingAI = false;
    }
  }

  // 生成智能标签
  async generateSmartTags() {
    try {
      const content = document.getElementById('summaryContent').value + '\n' + this.aiContent;
      
      // 发送消息给background script进行智能分类
      const response = await chrome.runtime.sendMessage({
        action: 'generateSmartTags',
        content: content,
        url: this.pageInfo.url,
        title: this.pageInfo.title
      });

      if (response && response.tags) {
        // 合并新标签，避免重复
        const newTags = response.tags.filter(tag => !this.tags.includes(tag));
        this.tags = [...this.tags, ...newTags];
        this.renderTags();
      }
      
    } catch (error) {
      console.error('智能标签生成失败:', error);
    }
  }

  // 添加标签
  addTag(tagText) {
    if (!tagText || this.tags.includes(tagText)) return;
    
    this.tags.push(tagText);
    this.renderTags();
    this.autoSave();
  }

  // 删除标签
  removeTag(tagText) {
    this.tags = this.tags.filter(tag => tag !== tagText);
    this.renderTags();
    this.autoSave();
  }

  // 渲染标签
  renderTags() {
    const container = document.getElementById('tagsContainer');
    container.innerHTML = '';
    
    this.tags.forEach(tag => {
      const tagElement = document.createElement('div');
      tagElement.className = 'tag scale-in';
      tagElement.innerHTML = `
        <span>${tag}</span>
        <button class="tag-remove" onclick="collector.removeTag('${tag}')" title="删除标签">×</button>
      `;
      container.appendChild(tagElement);
    });
  }

  // 初始化标签
  initializeTags() {
    // 添加一些基础标签
    const domain = this.pageInfo.domain;
    const domainTag = '#' + domain.replace(/\./g, '_');
    
    this.tags = [
      '#网页收集',
      domainTag,
      '#' + new Date().getFullYear() + '年' + (new Date().getMonth() + 1) + '月'
    ];
    
    this.renderTags();
  }

  // 预览内容
  previewContent() {
    const content = this.buildFinalContent();
    
    // 创建预览窗口
    const previewWindow = window.open('', '_blank', 'width=600,height=800');
    previewWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>内容预览 - Blinko收集器</title>
        <style>
          body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            max-width: 800px; 
            margin: 40px auto; 
            padding: 20px;
            line-height: 1.6;
            color: #333;
          }
          .header { 
            border-bottom: 2px solid #667eea; 
            padding-bottom: 20px; 
            margin-bottom: 30px;
          }
          .title { 
            font-size: 24px; 
            font-weight: bold; 
            color: #2c3e50;
            margin-bottom: 10px;
          }
          .meta { 
            color: #666; 
            font-size: 14px;
          }
          .content { 
            white-space: pre-wrap; 
            background: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            border-left: 4px solid #667eea;
          }
          .tags {
            margin-top: 20px;
            padding-top: 20px;
            border-top: 1px solid #eee;
          }
          .tag {
            display: inline-block;
            background: linear-gradient(45deg, #667eea, #764ba2);
            color: white;
            padding: 4px 8px;
            border-radius: 12px;
            font-size: 12px;
            margin: 2px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title">${this.pageInfo.title}</div>
          <div class="meta">来源：${this.pageInfo.url}</div>
          <div class="meta">收集时间：${new Date().toLocaleString()}</div>
        </div>
        <div class="content">${content.replace(/\n/g, '<br>')}</div>
        <div class="tags">
          ${this.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
        </div>
      </body>
      </html>
    `);
    previewWindow.document.close();
  }

  // 构建最终内容
  buildFinalContent() {
    let content = '';
    
    // 添加标题
    content += `📄 **${this.pageInfo.title}**\n\n`;
    
    // 添加原文摘要（如果有内容）
    const summaryContent = document.getElementById('summaryContent').value.trim();
    if (summaryContent) {
      content += `📝 **原文摘要：**\n${summaryContent}\n\n`;
    }
    
    // 添加AI总结（如果有内容）
    const aiContent = document.getElementById('aiContent').value.trim();
    if (aiContent) {
      content += `🤖 **AI总结：**\n${aiContent}\n\n`;
    }
    
    // 添加个人想法（如果有内容）
    const thoughtsContent = document.getElementById('thoughtsContent').value.trim();
    if (thoughtsContent) {
      content += `💭 **个人想法：**\n${thoughtsContent}\n\n`;
    }
    
    // 添加标签
    if (this.tags.length > 0) {
      content += `🏷️ **标签：** ${this.tags.join(' ')}\n\n`;
    }
    
    // 添加元信息
    content += `🔗 **链接：** ${this.pageInfo.url}\n`;
    content += `📅 **收集时间：** ${new Date().toLocaleString()}\n`;
    
    return content;
  }

  // 保存内容到Blinko
  async saveContent() {
    try {
      this.showStatus('💾 正在保存到Blinko...', 'info');
      
      const content = this.buildFinalContent();
      
      const response = await chrome.runtime.sendMessage({
        action: 'saveToBlinko',
        content: content
      });

      if (response && response.success) {
        this.showStatus('✅ 已成功保存到Blinko', 'success');
        
        // 清除自动保存的内容
        this.clearAutoSave();
        
        // 3秒后关闭popup
        setTimeout(() => {
          window.close();
        }, 2000);
        
      } else {
        throw new Error(response?.error || '保存失败');
      }
      
    } catch (error) {
      console.error('保存失败:', error);
      this.showStatus('❌ 保存失败：' + error.message, 'error');
    }
  }

  // 自动保存到本地存储
  autoSave() {
    const data = {
      summary: document.getElementById('summaryContent').value,
      ai: document.getElementById('aiContent').value,
      thoughts: document.getElementById('thoughtsContent').value,
      tags: this.tags,
      timestamp: Date.now(),
      url: this.pageInfo.url
    };
    
    localStorage.setItem(`blinko_draft_${this.pageInfo.domain}`, JSON.stringify(data));
  }

  // 加载保存的内容
  async loadSavedContent() {
    try {
      const saved = localStorage.getItem(`blinko_draft_${this.pageInfo.domain}`);
      if (saved) {
        const data = JSON.parse(saved);
        
        // 检查是否是同一个URL的草稿，且时间不超过24小时
        if (data.url === this.pageInfo.url && (Date.now() - data.timestamp) < 24 * 60 * 60 * 1000) {
          if (data.thoughts) {
            document.getElementById('thoughtsContent').value = data.thoughts;
          }
          if (data.tags && data.tags.length > 0) {
            this.tags = [...new Set([...this.tags, ...data.tags])];
            this.renderTags();
          }
          
          this.showStatus('📝 已恢复上次编辑的内容', 'info');
        }
      }
    } catch (error) {
      console.error('加载保存内容失败:', error);
    }
  }

  // 清除自动保存
  clearAutoSave() {
    localStorage.removeItem(`blinko_draft_${this.pageInfo.domain}`);
  }

  // 打开设置页面
  openSettings() {
    chrome.runtime.openOptionsPage();
  }

  // 显示状态信息
  showStatus(message, type) {
    const statusDiv = document.getElementById('status');
    statusDiv.textContent = message;
    statusDiv.className = `status ${type}`;
    statusDiv.style.display = 'block';
    
    // 添加动画效果
    statusDiv.classList.add('fade-in');
    
    if (type === 'success' || type === 'info') {
      setTimeout(() => {
        statusDiv.style.display = 'none';
        statusDiv.classList.remove('fade-in');
      }, 3000);
    }
  }
}

// 全局实例
let collector;

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
  collector = new BlinkoCollector();
});

// 监听来自background的消息
chrome.runtime.onMessage.addListener((message) => {
  if (message.action === 'updatePopupStatus') {
    collector.showStatus(message.message, message.type);
  }
});


