// Blinko抽屉式侧边栏脚本
class BlinkoDrawer {
  constructor() {
    this.pageInfo = {};
    this.config = {};
    this.init();
  }

  async init() {
    try {
      // 调试信息
      this.logDebugInfo();

      // 绑定事件
      this.bindEvents();

      // 获取页面信息
      await this.loadPageInfo();

      // 加载配置
      await this.loadConfig();

      console.log('Blinko抽屉初始化完成');
    } catch (error) {
      console.error('抽屉初始化失败:', error);
    }
  }

  logDebugInfo() {
    const drawer = document.getElementById('blinkoDrawer');
    if (drawer) {
      const rect = drawer.getBoundingClientRect();
      console.log('抽屉调试信息:', {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
        documentHeight: document.documentElement.clientHeight,
        drawerRect: {
          width: rect.width,
          height: rect.height,
          top: rect.top,
          bottom: rect.bottom
        },
        computedStyle: window.getComputedStyle(drawer)
      });
    }
  }

  bindEvents() {
    // 关闭按钮
    const closeBtn = document.getElementById('closeDrawer');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.closeDrawer());
    }

    // 提交按钮
    const submitBtn = document.getElementById('submitBtn');
    if (submitBtn) {
      submitBtn.addEventListener('click', () => this.submitToBlinko());
    }

    // 监听来自父页面的消息
    window.addEventListener('message', (event) => {
      if (event.data && event.data.action === 'updatePageInfo') {
        this.updatePageInfo(event.data.pageInfo);
      }
    });
  }

  async loadPageInfo() {
    try {
      // 通过postMessage获取页面信息
      if (window.parent !== window) {
        window.parent.postMessage({ action: 'getPageInfo' }, '*');
      } else {
        // 直接获取页面信息
        this.updatePageInfo({
          title: document.title || '未知页面',
          url: window.location.href
        });
      }
    } catch (error) {
      console.error('获取页面信息失败:', error);
    }
  }

  async loadConfig() {
    try {
      // 通过postMessage获取配置
      if (window.parent !== window) {
        window.parent.postMessage({ action: 'getConfig' }, '*');
      }
    } catch (error) {
      console.error('加载配置失败:', error);
    }
  }

  updatePageInfo(info) {
    this.pageInfo = info;
    
    const titleElement = document.getElementById('pageTitle');
    const urlElement = document.getElementById('pageUrl');
    
    if (titleElement) {
      titleElement.textContent = info.title;
    }
    
    if (urlElement) {
      urlElement.textContent = info.url;
    }
  }

  closeDrawer() {
    // 通知父页面关闭抽屉
    if (window.parent !== window) {
      window.parent.postMessage({ action: 'closeDrawer' }, '*');
    }
  }

  async submitToBlinko() {
    try {
      this.showStatus('正在提交到Blinko...', 'loading');
      
      // 获取用户输入
      const summaryInput = document.getElementById('summaryInput');
      const thoughtsInput = document.getElementById('thoughtsInput');
      
      const summary = summaryInput ? summaryInput.value.trim() : '';
      const thoughts = thoughtsInput ? thoughtsInput.value.trim() : '';
      
      if (!summary && !thoughts) {
        this.showStatus('请至少填写摘要或感想', 'error');
        return;
      }
      
      // 构建提交内容
      const content = this.buildContent(summary, thoughts);
      
      // 通过postMessage发送到background script
      if (window.parent !== window) {
        window.parent.postMessage({
          action: 'submitToBlinko',
          data: {
            content: content,
            pageInfo: this.pageInfo
          }
        }, '*');
      }
      
    } catch (error) {
      console.error('提交失败:', error);
      this.showStatus('提交失败: ' + error.message, 'error');
    }
  }

  buildContent(summary, thoughts) {
    let content = '';
    
    // 添加页面信息
    content += `# ${this.pageInfo.title}\n\n`;
    content += `🔗 ${this.pageInfo.url}\n\n`;
    
    // 添加摘要
    if (summary) {
      content += `## 📄 内容摘要\n${summary}\n\n`;
    }
    
    // 添加感想
    if (thoughts) {
      content += `## 💭 个人感想\n${thoughts}\n\n`;
    }
    
    // 添加时间戳
    content += `---\n📅 收集时间: ${new Date().toLocaleString()}\n`;
    
    return content;
  }

  showStatus(message, type = 'info') {
    const statusElement = document.getElementById('statusMessage');
    if (statusElement) {
      statusElement.textContent = message;
      statusElement.className = `status-message ${type}`;
      
      // 3秒后清除状态
      if (type !== 'loading') {
        setTimeout(() => {
          statusElement.textContent = '';
          statusElement.className = 'status-message';
        }, 3000);
      }
    }
  }

  // 处理提交结果
  handleSubmitResult(success, message) {
    if (success) {
      this.showStatus('✅ ' + message, 'success');
      
      // 清空输入框
      const summaryInput = document.getElementById('summaryInput');
      const thoughtsInput = document.getElementById('thoughtsInput');
      
      if (summaryInput) summaryInput.value = '';
      if (thoughtsInput) thoughtsInput.value = '';
      
      // 2秒后自动关闭
      setTimeout(() => {
        this.closeDrawer();
      }, 2000);
      
    } else {
      this.showStatus('❌ ' + message, 'error');
    }
  }
}

// 初始化抽屉
let drawer;

function initDrawer() {
  if (document.getElementById('blinkoDrawer')) {
    drawer = new BlinkoDrawer();
  } else {
    // 如果元素还没有加载，等待一下再试
    setTimeout(initDrawer, 100);
  }
}

// 监听来自父页面的消息
window.addEventListener('message', (event) => {
  if (event.data && event.data.action === 'submitResult' && drawer) {
    drawer.handleSubmitResult(event.data.success, event.data.message);
  }
});

// 立即尝试初始化，或者等待DOM加载
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initDrawer);
} else {
  initDrawer();
}
