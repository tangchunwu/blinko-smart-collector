// Blinko侧边栏功能脚本
class BlinkoSidebar {
  constructor() {
    this.isVisible = false;
    this.currentTab = null;
    this.tags = [];
    this.init();
  }

  async init() {
    // 获取当前页面信息
    await this.loadPageInfo();
    
    // 绑定事件监听器
    this.bindEvents();
    
    // 加载保存的内容
    this.loadSavedContent();
    
    // 检查配置状态
    this.checkConfiguration();
  }

  async loadPageInfo() {
    try {
      // 获取页面标题和URL
      const title = document.title || '未知页面';
      const url = window.location.href;
      
      // 更新侧边栏显示
      const titleElement = document.getElementById('sidebarPageTitle');
      const urlElement = document.getElementById('sidebarPageUrl');
      
      if (titleElement) titleElement.textContent = title;
      if (urlElement) urlElement.textContent = url;
      
      this.currentTab = { title, url };
    } catch (error) {
      console.error('加载页面信息失败:', error);
    }
  }

  bindEvents() {
    // 关闭侧边栏
    const closeBtn = document.getElementById('closeSidebar');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.hideSidebar());
    }

    // 切换侧边栏
    const toggleBtn = document.getElementById('sidebarToggle');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => this.toggleSidebar());
    }

    // 快速收集
    const quickCollectBtn = document.getElementById('quickCollectBtn');
    if (quickCollectBtn) {
      quickCollectBtn.addEventListener('click', () => this.quickCollect());
    }

    // AI总结
    const aiSummaryBtn = document.getElementById('aiSummaryBtn');
    if (aiSummaryBtn) {
      aiSummaryBtn.addEventListener('click', () => this.generateAISummary());
    }

    // 生成AI总结
    const generateAiBtn = document.getElementById('generateAiSummary');
    if (generateAiBtn) {
      generateAiBtn.addEventListener('click', () => this.generateAISummary());
    }

    // 生成智能标签
    const generateTagsBtn = document.getElementById('generateTags');
    if (generateTagsBtn) {
      generateTagsBtn.addEventListener('click', () => this.generateSmartTags());
    }

    // 刷新内容
    const refreshBtn = document.getElementById('refreshContent');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => this.refreshPageContent());
    }

    // 预览
    const previewBtn = document.getElementById('previewBtn');
    if (previewBtn) {
      previewBtn.addEventListener('click', () => this.previewContent());
    }

    // 保存到Blinko
    const saveBtn = document.getElementById('saveToBlinkoBtn');
    if (saveBtn) {
      saveBtn.addEventListener('click', () => this.saveToBlinko());
    }

    // 标签输入
    const tagInput = document.getElementById('tagInput');
    if (tagInput) {
      tagInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          this.addTag(e.target.value.trim());
          e.target.value = '';
        }
      });
    }

    // 键盘快捷键
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'B') {
        e.preventDefault();
        this.toggleSidebar();
      }
    });

    // 自动保存内容
    this.bindAutoSave();
  }

  bindAutoSave() {
    const textareas = ['originalContent', 'personalThoughts'];
    textareas.forEach(id => {
      const element = document.getElementById(id);
      if (element) {
        element.addEventListener('input', () => {
          this.saveContentToLocal();
        });
      }
    });
  }

  showSidebar() {
    // 侧边栏显示由content.js控制
    this.isVisible = true;
    const toggle = document.getElementById('sidebarToggle');
    if (toggle) {
      toggle.classList.add('hidden');
    }
  }

  hideSidebar() {
    // 侧边栏隐藏由content.js控制
    this.isVisible = false;
    const toggle = document.getElementById('sidebarToggle');
    if (toggle) {
      toggle.classList.remove('hidden');
    }

    // 通知父页面隐藏侧边栏
    if (window.parent !== window) {
      window.parent.postMessage({ action: 'hideSidebar' }, '*');
    }
  }

  toggleSidebar() {
    // 通知父页面切换侧边栏
    if (window.parent !== window) {
      window.parent.postMessage({ action: 'toggleSidebar' }, '*');
    } else {
      // 如果不在iframe中，直接切换
      if (this.isVisible) {
        this.hideSidebar();
      } else {
        this.showSidebar();
      }
    }
  }

  async quickCollect() {
    try {
      this.showStatus('📝 正在快速收集...', 'info');
      
      // 获取页面内容
      const content = this.extractPageContent();
      
      // 填充到原文摘要区域
      const originalContent = document.getElementById('originalContent');
      if (originalContent) {
        originalContent.value = content;
      }
      
      this.showStatus('✅ 内容已提取到原文摘要', 'success');
    } catch (error) {
      console.error('快速收集失败:', error);
      this.showStatus('❌ 快速收集失败', 'error');
    }
  }

  async generateAISummary() {
    try {
      this.showStatus('🤖 正在生成AI总结...', 'info');
      
      const originalContent = document.getElementById('originalContent');
      const aiSummaryContent = document.getElementById('aiSummaryContent');
      
      if (!originalContent || !originalContent.value.trim()) {
        this.showStatus('⚠️ 请先添加原文内容', 'error');
        return;
      }

      // 发送消息到background script
      const response = await this.sendMessage({
        action: 'generateAISummary',
        content: originalContent.value,
        tab: this.currentTab
      });

      if (response && response.success) {
        if (aiSummaryContent) {
          aiSummaryContent.value = response.summary;
          aiSummaryContent.removeAttribute('readonly');
        }
        this.showStatus('✅ AI总结生成成功', 'success');
      } else {
        this.showStatus('❌ AI总结生成失败: ' + (response?.error || '未知错误'), 'error');
      }
    } catch (error) {
      console.error('AI总结生成失败:', error);
      this.showStatus('❌ AI总结生成失败', 'error');
    }
  }

  async generateSmartTags() {
    try {
      this.showStatus('🏷️ 正在生成智能标签...', 'info');
      
      const originalContent = document.getElementById('originalContent');
      
      if (!originalContent || !originalContent.value.trim()) {
        this.showStatus('⚠️ 请先添加原文内容', 'error');
        return;
      }

      // 发送消息到background script
      const response = await this.sendMessage({
        action: 'generateSmartTags',
        content: originalContent.value,
        url: this.currentTab?.url,
        title: this.currentTab?.title
      });

      if (response && response.success) {
        // 添加生成的标签
        if (response.tags && Array.isArray(response.tags)) {
          response.tags.forEach(tag => this.addTag(tag));
        }
        this.showStatus('✅ 智能标签生成成功', 'success');
      } else {
        this.showStatus('❌ 智能标签生成失败: ' + (response?.error || '未知错误'), 'error');
      }
    } catch (error) {
      console.error('智能标签生成失败:', error);
      this.showStatus('❌ 智能标签生成失败', 'error');
    }
  }

  refreshPageContent() {
    this.loadPageInfo();
    this.showStatus('🔄 页面信息已刷新', 'info');
  }

  previewContent() {
    const content = this.collectAllContent();
    
    // 创建预览窗口
    const previewWindow = window.open('', '_blank', 'width=600,height=800');
    previewWindow.document.write(`
      <html>
        <head>
          <title>Blinko内容预览</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 20px; line-height: 1.6; }
            .section { margin-bottom: 20px; }
            .section-title { font-weight: bold; color: #374151; margin-bottom: 8px; }
            .content { background: #f9fafb; padding: 12px; border-radius: 6px; white-space: pre-wrap; }
            .tags { display: flex; flex-wrap: wrap; gap: 6px; }
            .tag { background: #e0e7ff; color: #3730a3; padding: 4px 8px; border-radius: 12px; font-size: 12px; }
          </style>
        </head>
        <body>
          <h1>📄 内容预览</h1>
          <div class="section">
            <div class="section-title">页面信息</div>
            <div class="content">${content.pageInfo}</div>
          </div>
          <div class="section">
            <div class="section-title">原文摘要</div>
            <div class="content">${content.original || '暂无内容'}</div>
          </div>
          <div class="section">
            <div class="section-title">AI总结</div>
            <div class="content">${content.aiSummary || '暂无内容'}</div>
          </div>
          <div class="section">
            <div class="section-title">个人想法</div>
            <div class="content">${content.thoughts || '暂无内容'}</div>
          </div>
          <div class="section">
            <div class="section-title">标签</div>
            <div class="tags">${content.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}</div>
          </div>
        </body>
      </html>
    `);
    previewWindow.document.close();
  }

  async saveToBlinko() {
    try {
      this.showStatus('💾 正在保存到Blinko...', 'info');
      
      const content = this.collectAllContent();
      const finalContent = this.formatContentForBlinko(content);
      
      // 发送消息到background script
      const response = await this.sendMessage({
        action: 'saveToBlinko',
        content: finalContent
      });

      if (response && response.success) {
        this.showStatus('✅ 已成功保存到Blinko', 'success');
        // 清空内容（可选）
        // this.clearAllContent();
      } else {
        this.showStatus('❌ 保存失败: ' + (response?.error || '未知错误'), 'error');
      }
    } catch (error) {
      console.error('保存到Blinko失败:', error);
      this.showStatus('❌ 保存失败', 'error');
    }
  }

  extractPageContent() {
    // 简单的页面内容提取
    const title = document.title;
    const url = window.location.href;
    const selectedText = window.getSelection().toString();
    
    if (selectedText) {
      return `${title}\n${url}\n\n选中内容：\n${selectedText}`;
    }
    
    // 尝试提取主要内容
    const contentSelectors = [
      'article',
      '[role="main"]',
      '.content',
      '.post-content',
      '.entry-content',
      'main'
    ];
    
    let content = '';
    for (const selector of contentSelectors) {
      const element = document.querySelector(selector);
      if (element) {
        content = element.innerText.substring(0, 1000);
        break;
      }
    }
    
    return `${title}\n${url}\n\n${content || '无法提取页面内容'}`;
  }

  collectAllContent() {
    const originalContent = document.getElementById('originalContent')?.value || '';
    const aiSummaryContent = document.getElementById('aiSummaryContent')?.value || '';
    const personalThoughts = document.getElementById('personalThoughts')?.value || '';
    
    return {
      pageInfo: `${this.currentTab?.title || ''}\n${this.currentTab?.url || ''}`,
      original: originalContent,
      aiSummary: aiSummaryContent,
      thoughts: personalThoughts,
      tags: this.tags
    };
  }

  formatContentForBlinko(content) {
    let formatted = '';
    
    if (content.original) {
      formatted += `📄 原文摘要\n${content.original}\n\n`;
    }
    
    if (content.aiSummary) {
      formatted += `🤖 AI总结\n${content.aiSummary}\n\n`;
    }
    
    if (content.thoughts) {
      formatted += `💭 个人想法\n${content.thoughts}\n\n`;
    }
    
    if (content.tags.length > 0) {
      formatted += `🏷️ 标签\n${content.tags.join(' ')}\n\n`;
    }
    
    formatted += `🔗 来源\n${content.pageInfo}`;
    
    return formatted;
  }

  addTag(tagText) {
    if (!tagText || this.tags.includes(tagText)) return;
    
    this.tags.push(tagText);
    this.renderTags();
    this.saveContentToLocal();
  }

  removeTag(tagText) {
    this.tags = this.tags.filter(tag => tag !== tagText);
    this.renderTags();
    this.saveContentToLocal();
  }

  renderTags() {
    const container = document.getElementById('tagsContainer');
    if (!container) return;
    
    container.innerHTML = this.tags.map(tag => `
      <span class="tag">
        ${tag}
        <button class="tag-remove" onclick="sidebar.removeTag('${tag}')">×</button>
      </span>
    `).join('');
  }

  showStatus(message, type = 'info') {
    const statusElement = document.getElementById('sidebarStatus');
    if (!statusElement) return;
    
    statusElement.textContent = message;
    statusElement.className = `status-message ${type}`;
    
    // 自动隐藏成功消息
    if (type === 'success') {
      setTimeout(() => {
        statusElement.textContent = '';
        statusElement.className = 'status-message';
      }, 3000);
    }
  }

  async sendMessage(message) {
    return new Promise((resolve) => {
      if (typeof chrome !== 'undefined' && chrome.runtime) {
        chrome.runtime.sendMessage(message, resolve);
      } else {
        console.warn('Chrome runtime not available');
        resolve({ success: false, error: 'Chrome runtime not available' });
      }
    });
  }

  saveContentToLocal() {
    const content = this.collectAllContent();
    localStorage.setItem('blinko-sidebar-content', JSON.stringify(content));
  }

  loadSavedContent() {
    try {
      const saved = localStorage.getItem('blinko-sidebar-content');
      if (saved) {
        const content = JSON.parse(saved);
        
        // 恢复内容
        const originalContent = document.getElementById('originalContent');
        const personalThoughts = document.getElementById('personalThoughts');
        
        if (originalContent && content.original) {
          originalContent.value = content.original;
        }
        
        if (personalThoughts && content.thoughts) {
          personalThoughts.value = content.thoughts;
        }
        
        // 恢复标签
        if (content.tags && Array.isArray(content.tags)) {
          this.tags = content.tags;
          this.renderTags();
        }
      }
    } catch (error) {
      console.error('加载保存内容失败:', error);
    }
  }

  async checkConfiguration() {
    try {
      const response = await this.sendMessage({ action: 'checkConfiguration' });
      
      if (response && !response.configured) {
        this.showStatus('⚠️ 请先配置Blinko API', 'error');
      }
    } catch (error) {
      console.error('检查配置失败:', error);
    }
  }
}

// 初始化侧边栏
let sidebar;

// 等待DOM加载完成后初始化
function initSidebar() {
  if (document.getElementById('blinkoSidebar')) {
    sidebar = new BlinkoSidebar();
  } else {
    // 如果元素还没有加载，等待一下再试
    setTimeout(initSidebar, 100);
  }
}

// 立即尝试初始化，或者等待DOM加载
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initSidebar);
} else {
  initSidebar();
}
