// 善思 Blinko 侧边栏功能脚本

// 全局变量
let sidebarCurrentTab = null;
let sidebarCurrentPageInfo = null;
let sidebarCurrentTags = [];
let sidebarSelectedText = '';
let sidebarSelectedSummary = '';

// 侧边栏管理类
class BlinkoSidebar {
  constructor() {
    this.isVisible = false;
    this.container = null;
    this.overlay = null;
    this.initialized = false;
  }

  // 初始化侧边栏
  async init() {
    if (this.initialized) return;
    
    try {
      // 创建侧边栏HTML结构
      this.createSidebarHTML();
      
      // 绑定事件监听器
      this.bindEventListeners();
      
      // 初始化界面数据
      await this.initializeInterface();
      
      this.initialized = true;
      console.log('Blinko侧边栏初始化完成');
    } catch (error) {
      console.error('侧边栏初始化失败:', error);
    }
  }

  // 创建侧边栏HTML结构
  createSidebarHTML() {
    // 创建遮罩层
    this.overlay = document.createElement('div');
    this.overlay.className = 'blinko-sidebar-overlay';
    this.overlay.addEventListener('click', () => this.hide());

    // 创建侧边栏容器
    this.container = document.createElement('div');
    this.container.className = 'blinko-sidebar-container';
    
    // 侧边栏内容
    this.container.innerHTML = `
      <div class="blinko-sidebar-content">
        <!-- 头部 -->
        <div class="blinko-sidebar-header">
          <span class="blinko-sidebar-header-icon">🤖</span>
          <h1 class="blinko-sidebar-header-title">善思 blinko</h1>
          <button class="blinko-sidebar-settings-btn" id="blinkoSidebarConfigBtn" title="配置设置">⚙️</button>
          <button class="blinko-sidebar-close" id="blinkoSidebarCloseBtn" title="关闭">✕</button>
        </div>

        <!-- 链接信息区域 -->
        <div class="blinko-sidebar-link-section">
          <div class="blinko-sidebar-link-header">
            <span>🔗</span>
            <span>标题和链接</span>
          </div>
          <div id="blinkoSidebarPageTitle" class="blinko-sidebar-page-title-display">加载中...</div>
          <div id="blinkoSidebarPageUrl" class="blinko-sidebar-page-url-display"></div>
        </div>

        <!-- 选中内容区域 -->
        <div class="blinko-sidebar-selected-content-section" id="blinkoSidebarSelectedContentSection" style="display: none;">
          <div class="blinko-sidebar-section-header">
            <div class="blinko-sidebar-section-title">
              <span>✂️</span>
              <span>选中内容</span>
            </div>
            <div class="blinko-sidebar-section-actions">
              <button class="blinko-sidebar-ai-generate-btn blinko-sidebar-small" id="blinkoSidebarSelectedAiGenerateBtn">
                <span class="blinko-sidebar-loading blinko-sidebar-hidden" id="blinkoSidebarSelectedAiLoading"></span>
                <span id="blinkoSidebarSelectedAiGenerateText">AI总结</span>
              </button>
              <button class="blinko-sidebar-action-btn blinko-sidebar-small" id="blinkoSidebarClearSelectedBtn" title="清除选中内容">✕</button>
            </div>
          </div>
          <div class="blinko-sidebar-selected-content-container">
            <textarea
              id="blinkoSidebarSelectedContent"
              class="blinko-sidebar-selected-content"
              placeholder="当前页面没有选中文本..."
              rows="4"
              readonly
            ></textarea>
            <div class="blinko-sidebar-selected-summary-container" id="blinkoSidebarSelectedSummaryContainer" style="display: none;">
              <div class="blinko-sidebar-selected-summary-header">
                <span>🤖 AI总结结果</span>
                <div class="blinko-sidebar-summary-actions">
                  <button class="blinko-sidebar-action-btn blinko-sidebar-mini" id="blinkoSidebarMoveToSummaryBtn" title="移动到原文摘要">📄</button>
                  <button class="blinko-sidebar-action-btn blinko-sidebar-mini" id="blinkoSidebarMoveToThoughtsBtn" title="移动到个人想法">💭</button>
                  <button class="blinko-sidebar-action-btn blinko-sidebar-mini" id="blinkoSidebarEditSummaryBtn" title="编辑总结">✏️</button>
                </div>
              </div>
              <textarea
                id="blinkoSidebarSelectedSummaryContent"
                class="blinko-sidebar-selected-summary-content"
                placeholder="AI总结将显示在这里..."
                rows="5"
                readonly
              ></textarea>
            </div>
          </div>
        </div>

        <!-- 原文摘要区域 -->
        <div class="blinko-sidebar-summary-section">
          <div class="blinko-sidebar-section-header">
            <div class="blinko-sidebar-section-title">
              <span>📄</span>
              <span>原文摘要</span>
            </div>
            <button class="blinko-sidebar-ai-generate-btn" id="blinkoSidebarAiGenerateBtn">
              <span class="blinko-sidebar-loading blinko-sidebar-hidden" id="blinkoSidebarAiLoading"></span>
              <span id="blinkoSidebarAiGenerateText">AI总结</span>
            </button>
          </div>
          <textarea
            id="blinkoSidebarSummaryContent"
            class="blinko-sidebar-summary-content"
            placeholder="粘贴原文摘要..."
            rows="4"
          ></textarea>
        </div>

        <!-- 个人想法区域 -->
        <div class="blinko-sidebar-thoughts-section">
          <div class="blinko-sidebar-section-title">
            <span>💭</span>
            <span>个人想法</span>
          </div>
          <textarea
            id="blinkoSidebarThoughtsContent"
            class="blinko-sidebar-thoughts-content"
            placeholder="输入你的想法..."
            rows="3"
          ></textarea>
        </div>

        <!-- 标签区域 -->
        <div class="blinko-sidebar-tags-section">
          <div class="blinko-sidebar-section-title">
            <span>🏷️</span>
            <span>标签</span>
          </div>
          <div id="blinkoSidebarTagsContainer" class="blinko-sidebar-tags-container">
            <!-- 标签将在这里动态生成 -->
          </div>
          <input
            type="text"
            id="blinkoSidebarTagInput"
            class="blinko-sidebar-tag-input"
            placeholder="添加标签..."
            style="display: none;"
          >
        </div>

        <!-- 底部操作区域 -->
        <div class="blinko-sidebar-actions-section">
          <button id="blinkoSidebarSubmitBtn" class="blinko-sidebar-submit-btn">
            <span>🤖</span>
            <span>提交到 Blinko</span>
          </button>
          <div id="blinkoSidebarStatus" class="blinko-sidebar-status"></div>
        </div>
      </div>
    `;

    // 添加到页面
    document.body.appendChild(this.overlay);
    document.body.appendChild(this.container);
  }

  // 绑定事件监听器
  bindEventListeners() {
    // 关闭按钮
    document.getElementById('blinkoSidebarCloseBtn').addEventListener('click', () => this.hide());
    
    // 配置按钮
    document.getElementById('blinkoSidebarConfigBtn').addEventListener('click', () => {
      chrome.runtime.sendMessage({ action: 'openOptions' });
    });

    // AI生成摘要按钮
    document.getElementById('blinkoSidebarAiGenerateBtn').addEventListener('click', () => this.generateAISummary());

    // 选中内容相关按钮
    document.getElementById('blinkoSidebarSelectedAiGenerateBtn').addEventListener('click', () => this.generateSelectedTextSummary());
    document.getElementById('blinkoSidebarClearSelectedBtn').addEventListener('click', () => this.clearSelectedContent());
    document.getElementById('blinkoSidebarMoveToSummaryBtn').addEventListener('click', () => this.moveSelectedSummary('summary'));
    document.getElementById('blinkoSidebarMoveToThoughtsBtn').addEventListener('click', () => this.moveSelectedSummary('thoughts'));
    document.getElementById('blinkoSidebarEditSummaryBtn').addEventListener('click', () => this.toggleSelectedSummaryEdit());

    // 提交按钮
    document.getElementById('blinkoSidebarSubmitBtn').addEventListener('click', () => this.submitToFlomo());

    // 标签输入
    const tagInput = document.getElementById('blinkoSidebarTagInput');
    tagInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.addTag(tagInput.value.trim());
        tagInput.value = '';
        tagInput.style.display = 'none';
      }
    });

    tagInput.addEventListener('blur', () => {
      if (tagInput.value.trim()) {
        this.addTag(tagInput.value.trim());
        tagInput.value = '';
      }
      tagInput.style.display = 'none';
    });

    // ESC键关闭
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isVisible) {
        this.hide();
      }
    });
  }

  // 显示侧边栏
  async show() {
    if (!this.initialized) {
      await this.init();
    }
    
    this.overlay.classList.add('blinko-sidebar-show');
    this.container.classList.add('blinko-sidebar-show');
    this.isVisible = true;
    
    // 刷新页面信息
    await this.refreshPageInfo();
  }

  // 隐藏侧边栏
  hide() {
    this.overlay.classList.remove('blinko-sidebar-show');
    this.container.classList.remove('blinko-sidebar-show');
    this.isVisible = false;
  }

  // 切换显示状态
  async toggle() {
    if (this.isVisible) {
      this.hide();
    } else {
      await this.show();
    }
  }

  // 刷新页面信息
  async refreshPageInfo() {
    try {
      // 更新页面基本信息
      document.getElementById('blinkoSidebarPageTitle').textContent = document.title;
      document.getElementById('blinkoSidebarPageUrl').textContent = window.location.href;

      // 检查选中文本
      await this.checkSelectedText();

      this.showStatus('✅ 页面信息已更新', 'success');
    } catch (error) {
      console.error('刷新页面信息失败:', error);
      this.showStatus('⚠️ 页面信息更新失败', 'warning');
    }
  }

  // 初始化界面数据
  async initializeInterface() {
    try {
      // 显示基本页面信息
      document.getElementById('blinkoSidebarPageTitle').textContent = document.title;
      document.getElementById('blinkoSidebarPageUrl').textContent = window.location.href;

      this.showStatus('🔍 正在分析页面内容...', 'info');

      // 检测选中文本
      await this.checkSelectedText();

      this.showStatus('✅ 页面分析完成', 'success');
    } catch (error) {
      console.error('初始化失败:', error);
      this.showStatus('⚠️ 页面分析失败，但仍可手动输入', 'warning');
    }
  }

  // 检查选中文本
  async checkSelectedText() {
    const selection = window.getSelection();
    const selectedText = selection.toString().trim();

    if (selectedText && selectedText !== sidebarSelectedText) {
      sidebarSelectedText = selectedText;
      document.getElementById('blinkoSidebarSelectedContent').value = selectedText;
      document.getElementById('blinkoSidebarSelectedContentSection').style.display = 'block';
    } else if (!selectedText) {
      document.getElementById('blinkoSidebarSelectedContentSection').style.display = 'none';
      sidebarSelectedText = '';
    }
  }

  // 生成AI摘要
  async generateAISummary() {
    const btn = document.getElementById('blinkoSidebarAiGenerateBtn');
    const loading = document.getElementById('blinkoSidebarAiLoading');
    const text = document.getElementById('blinkoSidebarAiGenerateText');

    try {
      btn.disabled = true;
      loading.classList.remove('blinko-sidebar-hidden');
      text.textContent = '生成中...';

      // 发送消息到background script
      const response = await chrome.runtime.sendMessage({
        action: 'generateAISummary',
        content: document.body.innerText,
        url: window.location.href,
        title: document.title
      });

      if (response.success) {
        document.getElementById('blinkoSidebarSummaryContent').value = response.summary;
        this.showStatus('✅ AI摘要生成成功', 'success');
      } else {
        this.showStatus('❌ AI摘要生成失败: ' + response.error, 'error');
      }
    } catch (error) {
      console.error('AI摘要生成失败:', error);
      this.showStatus('❌ AI摘要生成失败', 'error');
    } finally {
      btn.disabled = false;
      loading.classList.add('blinko-sidebar-hidden');
      text.textContent = 'AI总结';
    }
  }

  // 生成选中文本摘要
  async generateSelectedTextSummary() {
    if (!sidebarSelectedText) {
      this.showStatus('❌ 请先选中文本', 'error');
      return;
    }

    const btn = document.getElementById('blinkoSidebarSelectedAiGenerateBtn');
    const loading = document.getElementById('blinkoSidebarSelectedAiLoading');
    const text = document.getElementById('blinkoSidebarSelectedAiGenerateText');

    try {
      btn.disabled = true;
      loading.classList.remove('blinko-sidebar-hidden');
      text.textContent = '生成中...';

      const response = await chrome.runtime.sendMessage({
        action: 'generateAISummary',
        content: sidebarSelectedText,
        url: window.location.href,
        title: document.title,
        isSelection: true
      });

      if (response.success) {
        sidebarSelectedSummary = response.summary;
        document.getElementById('blinkoSidebarSelectedSummaryContent').value = sidebarSelectedSummary;
        document.getElementById('blinkoSidebarSelectedSummaryContainer').style.display = 'block';
        this.showStatus('✅ 选中内容AI总结成功', 'success');
      } else {
        this.showStatus('❌ AI总结失败: ' + response.error, 'error');
      }
    } catch (error) {
      console.error('选中文本AI总结失败:', error);
      this.showStatus('❌ AI总结失败', 'error');
    } finally {
      btn.disabled = false;
      loading.classList.add('blinko-sidebar-hidden');
      text.textContent = 'AI总结';
    }
  }

  // 清除选中内容
  clearSelectedContent() {
    sidebarSelectedText = '';
    sidebarSelectedSummary = '';
    document.getElementById('blinkoSidebarSelectedContent').value = '';
    document.getElementById('blinkoSidebarSelectedSummaryContent').value = '';
    document.getElementById('blinkoSidebarSelectedContentSection').style.display = 'none';
    document.getElementById('blinkoSidebarSelectedSummaryContainer').style.display = 'none';
    this.showStatus('✅ 已清除选中内容', 'success');
  }

  // 移动选中内容摘要
  moveSelectedSummary(target) {
    if (!sidebarSelectedSummary) {
      this.showStatus('❌ 没有可移动的摘要内容', 'error');
      return;
    }

    const targetElement = target === 'summary'
      ? document.getElementById('blinkoSidebarSummaryContent')
      : document.getElementById('blinkoSidebarThoughtsContent');

    const currentValue = targetElement.value;
    const newValue = currentValue ? `${currentValue}\n\n${sidebarSelectedSummary}` : sidebarSelectedSummary;
    targetElement.value = newValue;

    this.showStatus(`✅ 已移动到${target === 'summary' ? '原文摘要' : '个人想法'}`, 'success');
  }

  // 切换选中摘要编辑状态
  toggleSelectedSummaryEdit() {
    const textarea = document.getElementById('blinkoSidebarSelectedSummaryContent');
    const btn = document.getElementById('blinkoSidebarEditSummaryBtn');

    if (textarea.readOnly) {
      textarea.readOnly = false;
      textarea.focus();
      btn.textContent = '💾';
      btn.title = '保存编辑';
    } else {
      textarea.readOnly = true;
      sidebarSelectedSummary = textarea.value;
      btn.textContent = '✏️';
      btn.title = '编辑总结';
      this.showStatus('✅ 摘要已保存', 'success');
    }
  }

  // 添加标签
  addTag(tagText) {
    if (!tagText || sidebarCurrentTags.includes(tagText)) return;

    sidebarCurrentTags.push(tagText);
    this.updateTagsDisplay();
  }

  // 移除标签
  removeTag(tagText) {
    const index = sidebarCurrentTags.indexOf(tagText);
    if (index > -1) {
      sidebarCurrentTags.splice(index, 1);
      this.updateTagsDisplay();
    }
  }

  // 更新标签显示
  updateTagsDisplay() {
    const container = document.getElementById('blinkoSidebarTagsContainer');
    container.innerHTML = '';

    sidebarCurrentTags.forEach(tag => {
      const tagElement = document.createElement('div');
      tagElement.className = 'blinko-sidebar-tag';
      tagElement.innerHTML = `
        <span>${tag}</span>
        <button class="blinko-sidebar-tag-remove" onclick="blinkoSidebarInstance.removeTag('${tag}')">×</button>
      `;
      container.appendChild(tagElement);
    });

    // 添加新标签按钮
    const addButton = document.createElement('div');
    addButton.className = 'blinko-sidebar-tag';
    addButton.style.cursor = 'pointer';
    addButton.innerHTML = '<span>+ 添加标签</span>';
    addButton.addEventListener('click', () => {
      const input = document.getElementById('blinkoSidebarTagInput');
      input.style.display = 'inline-block';
      input.focus();
    });
    container.appendChild(addButton);
  }

  // 提交到Flomo
  async submitToFlomo() {
    const btn = document.getElementById('blinkoSidebarSubmitBtn');

    try {
      btn.disabled = true;
      btn.innerHTML = '<span class="blinko-sidebar-loading"></span><span>提交中...</span>';

      const data = {
        title: document.getElementById('blinkoSidebarPageTitle').textContent,
        url: document.getElementById('blinkoSidebarPageUrl').textContent,
        summary: document.getElementById('blinkoSidebarSummaryContent').value,
        thoughts: document.getElementById('blinkoSidebarThoughtsContent').value,
        selectedText: sidebarSelectedText,
        selectedSummary: sidebarSelectedSummary,
        tags: sidebarCurrentTags
      };

      const response = await chrome.runtime.sendMessage({
        action: 'submitToFlomo',
        data: data
      });

      if (response.success) {
        this.showStatus('✅ 提交成功！', 'success');
        // 清空表单
        document.getElementById('blinkoSidebarSummaryContent').value = '';
        document.getElementById('blinkoSidebarThoughtsContent').value = '';
        this.clearSelectedContent();
        sidebarCurrentTags = [];
        this.updateTagsDisplay();
      } else {
        this.showStatus('❌ 提交失败: ' + response.error, 'error');
      }
    } catch (error) {
      console.error('提交失败:', error);
      this.showStatus('❌ 提交失败', 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<span>🤖</span><span>提交到 Blinko</span>';
    }
  }

  // 显示状态信息
  showStatus(message, type = 'info') {
    const statusElement = document.getElementById('blinkoSidebarStatus');
    statusElement.textContent = message;
    statusElement.className = `blinko-sidebar-status blinko-sidebar-${type}`;

    // 3秒后清除状态
    setTimeout(() => {
      statusElement.textContent = '';
      statusElement.className = 'blinko-sidebar-status';
    }, 3000);
  }
}

// 创建全局侧边栏实例
let blinkoSidebarInstance = null;

// 初始化侧边栏
function initBlinkoSidebar() {
  if (!blinkoSidebarInstance) {
    blinkoSidebarInstance = new BlinkoSidebar();
  }
  return blinkoSidebarInstance;
}

// 页面加载完成后自动初始化并显示
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.blinkoSidebarInstance = initBlinkoSidebar();
    // 延迟显示侧边栏，确保页面完全加载
    setTimeout(() => {
      window.blinkoSidebarInstance.show();
    }, 1000);
  });
} else {
  window.blinkoSidebarInstance = initBlinkoSidebar();
  // 延迟显示侧边栏，确保页面完全加载
  setTimeout(() => {
    window.blinkoSidebarInstance.show();
  }, 1000);
}

// 导出给content script使用
window.initBlinkoSidebar = initBlinkoSidebar;
