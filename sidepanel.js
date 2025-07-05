// 善思 Blinko 侧边栏功能脚本 (Side Panel版本)

// 全局变量
let currentTab = null;
let currentPageInfo = null;
let currentTags = [];
let selectedText = '';
let selectedSummary = '';

// 侧边栏管理类
class BlinkoSidePanel {
  constructor() {
    this.initialized = false;
  }

  // 初始化侧边栏
  async init() {
    if (this.initialized) return;

    try {
      // 检查扩展上下文
      if (!chrome.runtime?.id) {
        console.log('扩展上下文失效，等待重新加载...');
        this.showStatus('⚠️ 扩展正在重新加载，请稍候...', 'warning');
        return;
      }

      // 绑定事件监听器
      this.bindEventListeners();

      // 获取当前活动标签页
      await this.getCurrentTab();

      // 初始化界面数据
      await this.initializeInterface();

      this.initialized = true;
      console.log('Blinko Side Panel初始化完成');
    } catch (error) {
      console.error('Side Panel初始化失败:', error);
      if (error.message.includes('Extension context invalidated')) {
        this.showStatus('⚠️ 扩展正在重新加载，请刷新页面', 'warning');
      } else {
        this.showStatus('❌ 初始化失败: ' + error.message, 'error');
      }
    }
  }

  // 获取当前活动标签页
  async getCurrentTab() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      currentTab = tab;
      return tab;
    } catch (error) {
      console.error('获取当前标签页失败:', error);
      return null;
    }
  }

  // 绑定事件监听器
  bindEventListeners() {
    // 配置按钮
    document.getElementById('configBtn').addEventListener('click', () => {
      chrome.runtime.openOptionsPage();
    });

    // 测试Blinko连接按钮
    document.getElementById('testBlinkoBtn').addEventListener('click', () => this.testBlinkoConnection());

    // 测试AI连接按钮
    document.getElementById('testAIBtn').addEventListener('click', () => this.testAIConnection());

    // AI生成摘要按钮
    document.getElementById('aiGenerateBtn').addEventListener('click', () => this.generateAISummary());

    // 选中内容相关按钮
    document.getElementById('selectedAiBtn').addEventListener('click', () => this.generateSelectedTextSummary());
    document.getElementById('refreshSelectedBtn').addEventListener('click', () => this.refreshSelectedText());
    document.getElementById('clearSelectedBtn').addEventListener('click', async () => await this.clearSelectedContent());
    document.getElementById('moveToSummaryBtn').addEventListener('click', () => this.moveSelectedSummary('summary'));
    document.getElementById('moveToThoughtsBtn').addEventListener('click', () => this.moveSelectedSummary('thoughts'));
    document.getElementById('editSummaryBtn').addEventListener('click', () => this.toggleSelectedSummaryEdit());

    // 提交按钮
    document.getElementById('submitBtn').addEventListener('click', () => this.submitToFlomo());

    // 标签输入
    const tagInput = document.getElementById('tagInput');
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

    // 监听来自background的消息
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      this.handleMessage(request, sender, sendResponse);
    });

  // 定期检查选中文本更新（更频繁）
  setInterval(() => {
    this.checkStoredSelectedText();
  }, 500); // 改为500ms检查一次

  // 监听storage变化
  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local' && changes.currentSelectedText) {
      console.log('检测到选中文本storage变化');
      this.checkStoredSelectedText();
    }
  });
}

  // 处理消息
  handleMessage(request, sender, sendResponse) {
    switch (request.action) {
      case 'updatePageInfo':
        this.updatePageInfo(request.data);
        break;
      case 'updateSelectedText':
        this.updateSelectedText(request.text);
        break;
      case 'refreshData':
        this.refreshPageData();
        break;
      case 'selectedTextChanged':
        this.updateSelectedText(request.text);
        break;
    }
  }

  // 初始化界面数据
  async initializeInterface() {
    try {
      if (!currentTab) {
        await this.getCurrentTab();
      }

      if (currentTab) {
        // 显示基本页面信息
        document.getElementById('pageTitle').textContent = currentTab.title || '未知页面';
        document.getElementById('pageUrl').textContent = currentTab.url || '';

        this.showStatus('🔍 正在分析页面内容...', 'info');

        // 请求页面信息
        await this.requestPageInfo();

        // 检查是否有存储的选中文本
        await this.checkStoredSelectedText();

        this.showStatus('✅ 页面分析完成', 'success');
      }
    } catch (error) {
      console.error('初始化失败:', error);
      this.showStatus('⚠️ 页面分析失败，但仍可手动输入', 'warning');
    }
  }

  // 请求页面信息
  async requestPageInfo() {
    if (!currentTab) {
      console.log('没有当前标签页，跳过页面信息请求');
      return;
    }

    console.log('请求页面信息，标签页ID:', currentTab.id);

    try {
      // 请求页面标题和URL
      console.log('发送getPageInfo消息...');
      const response = await chrome.tabs.sendMessage(currentTab.id, {
        action: 'getPageInfo'
      });

      console.log('getPageInfo响应:', response);
      if (response) {
        this.updatePageInfo(response);
      }

      // 请求选中文本
      console.log('发送getSelectedText消息...');
      const selectedResponse = await chrome.tabs.sendMessage(currentTab.id, {
        action: 'getSelectedText'
      });

      console.log('getSelectedText响应:', selectedResponse);
      if (selectedResponse && selectedResponse.text) {
        this.updateSelectedText(selectedResponse.text);
      }
    } catch (error) {
      console.error('请求页面信息失败:', error);
    }
  }

  // 更新页面信息
  updatePageInfo(data) {
    if (data.title) {
      document.getElementById('pageTitle').textContent = data.title;
    }
    if (data.url) {
      document.getElementById('pageUrl').textContent = data.url;
    }
  }

  // 更新选中文本（增强版）
  updateSelectedText(text) {
    console.log('Side Panel更新选中文本:', text ? `"${text.substring(0, 50)}..."` : '无选中');

    if (text && text.trim() && text !== selectedText) {
      selectedText = text.trim();
      document.getElementById('selectedContent').value = selectedText;
      document.getElementById('selectedSection').style.display = 'block';

      // 清除之前的总结
      selectedSummary = '';
      document.getElementById('selectedSummaryContent').value = '';
      document.getElementById('selectedSummaryContainer').style.display = 'none';

      console.log('选中文本已更新，长度:', selectedText.length);
    } else if (!text || !text.trim()) {
      document.getElementById('selectedSection').style.display = 'none';
      selectedText = '';
      selectedSummary = '';
      console.log('选中文本已清空');
    }
  }

  // 检查存储的选中文本
  async checkStoredSelectedText() {
    try {
      const result = await chrome.storage.local.get(['currentSelectedText', 'selectedTextTabId']);
      if (result.currentSelectedText && result.selectedTextTabId === currentTab?.id) {
        console.log('发现存储的选中文本:', result.currentSelectedText.substring(0, 50) + '...');
        this.updateSelectedText(result.currentSelectedText);
      }
    } catch (error) {
      console.error('检查存储的选中文本失败:', error);
    }
  }

  // 手动刷新选中文本
  async refreshSelectedText() {
    try {
      console.log('手动刷新选中文本');
      this.showStatus('🔄 正在检查选中文本...', 'info');

      // 先检查存储的文本
      await this.checkStoredSelectedText();

      // 然后请求当前页面的选中文本
      if (currentTab) {
        const response = await chrome.tabs.sendMessage(currentTab.id, {
          action: 'getSelectedText'
        });

        if (response && response.text) {
          console.log('获取到当前选中文本:', response.text.substring(0, 50) + '...');
          this.updateSelectedText(response.text);
          this.showStatus('✅ 选中文本已更新', 'success');
        } else {
          this.showStatus('ℹ️ 当前页面没有选中文本', 'info');
        }
      }
    } catch (error) {
      console.error('刷新选中文本失败:', error);
      this.showStatus('⚠️ 刷新失败，请重新选中文本', 'warning');
    }
  }

  // 刷新页面数据
  async refreshPageData() {
    await this.getCurrentTab();
    await this.requestPageInfo();
  }

  // 生成AI摘要（修复版）
  async generateAISummary() {
    const btn = document.getElementById('aiGenerateBtn');
    const loading = document.getElementById('aiLoading');
    const text = document.getElementById('aiGenerateText');

    try {
      btn.disabled = true;
      loading.style.display = 'inline-block';
      text.textContent = '生成中...';

      console.log('开始生成页面AI摘要');
      this.showStatus('🤖 正在生成页面AI摘要...', 'info');

      // 获取页面内容
      let pageContent = '';
      try {
        const contentResponse = await chrome.tabs.sendMessage(currentTab.id, {
          action: 'getPageContent'
        });
        pageContent = contentResponse?.content || '';
      } catch (error) {
        console.warn('获取页面内容失败，使用标题:', error);
        pageContent = currentTab?.title || '';
      }

      // 发送消息到background script
      const response = await chrome.runtime.sendMessage({
        action: 'generateAISummary',
        content: pageContent,
        title: currentTab?.title,
        url: currentTab?.url,
        tabId: currentTab?.id
      });

      console.log('页面AI摘要响应:', response);

      if (response && response.success) {
        document.getElementById('summaryContent').value = response.summary;

        // 添加AI建议的标签
        if (response.tags && response.tags.length > 0) {
          console.log('AI建议的标签:', response.tags);
          console.log('当前标签列表:', currentTags);
          response.tags.forEach(tag => {
            // 移除#号前缀，因为addTag会处理格式
            const cleanTag = tag.replace(/^#/, '');
            console.log('处理标签:', tag, '→', cleanTag);
            if (cleanTag && !currentTags.includes(cleanTag)) {
              console.log('添加新标签:', cleanTag);
              this.addTag(cleanTag);
            } else {
              console.log('跳过标签（已存在或为空）:', cleanTag);
            }
          });
          console.log('标签添加完成，最终标签列表:', currentTags);
        } else {
          console.log('AI响应中没有标签信息');
        }

        this.showStatus('✅ AI摘要生成成功，已添加建议标签', 'success');
      } else {
        const errorMsg = response?.error || '未知错误';
        console.error('AI摘要生成失败:', errorMsg);
        this.showStatus('❌ AI摘要生成失败: ' + errorMsg, 'error');
      }
    } catch (error) {
      console.error('AI摘要生成失败:', error);
      this.showStatus('❌ AI摘要生成失败: ' + error.message, 'error');
    } finally {
      btn.disabled = false;
      loading.style.display = 'none';
      text.textContent = 'AI总结';
    }
  }

  // 生成选中文本摘要（修复版）
  async generateSelectedTextSummary() {
    if (!selectedText) {
      this.showStatus('❌ 请先选中文本', 'error');
      return;
    }

    const btn = document.getElementById('selectedAiBtn');
    const loading = document.getElementById('selectedAiLoading');
    const text = document.getElementById('selectedAiText');

    try {
      btn.disabled = true;
      loading.style.display = 'inline-block';
      text.textContent = '生成中...';

      console.log('开始生成选中文本AI总结，文本长度:', selectedText.length);
      this.showStatus('🤖 正在生成选中文本AI总结...', 'info');

      // 使用统一的generateAISummary action，通过isSelection参数区分
      const response = await chrome.runtime.sendMessage({
        action: 'generateAISummary',
        content: selectedText,
        title: currentTab?.title,
        url: currentTab?.url,
        tabId: currentTab?.id,
        isSelection: true // 标识这是选中文本总结
      });

      console.log('选中文本AI总结响应:', response);

      if (response && response.success) {
        selectedSummary = response.summary;
        document.getElementById('selectedSummaryContent').value = selectedSummary;
        document.getElementById('selectedSummaryContainer').style.display = 'block';

        // 添加AI建议的标签
        if (response.tags && response.tags.length > 0) {
          console.log('选中文本AI建议的标签:', response.tags);
          console.log('当前标签列表:', currentTags);
          response.tags.forEach(tag => {
            // 移除#号前缀，因为addTag会处理格式
            const cleanTag = tag.replace(/^#/, '');
            console.log('处理选中文本标签:', tag, '→', cleanTag);
            if (cleanTag && !currentTags.includes(cleanTag)) {
              console.log('添加选中文本新标签:', cleanTag);
              this.addTag(cleanTag);
            } else {
              console.log('跳过选中文本标签（已存在或为空）:', cleanTag);
            }
          });
          console.log('选中文本标签添加完成，最终标签列表:', currentTags);
        } else {
          console.log('选中文本AI响应中没有标签信息');
        }

        this.showStatus('✅ 选中内容AI总结成功，已添加建议标签', 'success');
      } else {
        const errorMsg = response?.error || '未知错误';
        console.error('AI总结失败:', errorMsg);
        this.showStatus('❌ AI总结失败: ' + errorMsg, 'error');
      }
    } catch (error) {
      console.error('选中文本AI总结失败:', error);

      // 检查是否是扩展上下文失效
      if (error.message && error.message.includes('Extension context invalidated')) {
        this.showStatus('❌ 扩展需要重新加载，请刷新页面后重试', 'error');
      } else if (error.message && error.message.includes('Could not establish connection')) {
        this.showStatus('❌ 扩展连接失败，请重新加载扩展', 'error');
      } else {
        this.showStatus('❌ 选中文本AI总结失败: ' + error.message, 'error');
      }
    } finally {
      btn.disabled = false;
      loading.style.display = 'none';
      text.textContent = 'AI总结';
    }
  }

  // 清除选中内容
  async clearSelectedContent() {
    try {
      // 清除内存变量
      selectedText = '';
      selectedSummary = '';

      // 清除界面显示
      document.getElementById('selectedContent').value = '';
      document.getElementById('selectedSummaryContent').value = '';
      document.getElementById('selectedSection').style.display = 'none';
      document.getElementById('selectedSummaryContainer').style.display = 'none';

      // 清除storage缓存
      await chrome.storage.local.remove(['currentSelectedText', 'selectedTextTabId', 'selectedTextTimestamp']);

      console.log('选中内容已完全清除（包括缓存）');
      this.showStatus('✅ 已清除选中内容', 'success');
    } catch (error) {
      console.error('清除选中内容失败:', error);
      this.showStatus('❌ 清除失败: ' + error.message, 'error');
    }
  }

  // 移动选中内容摘要
  moveSelectedSummary(target) {
    if (!selectedSummary) {
      this.showStatus('❌ 没有可移动的摘要内容', 'error');
      return;
    }

    const targetElement = target === 'summary' 
      ? document.getElementById('summaryContent')
      : document.getElementById('thoughtsContent');
    
    const currentValue = targetElement.value;
    const newValue = currentValue ? `${currentValue}\n\n${selectedSummary}` : selectedSummary;
    targetElement.value = newValue;
    
    this.showStatus(`✅ 已移动到${target === 'summary' ? '原文摘要' : '个人想法'}`, 'success');
  }

  // 切换选中摘要编辑状态
  toggleSelectedSummaryEdit() {
    const textarea = document.getElementById('selectedSummaryContent');
    const btn = document.getElementById('editSummaryBtn');
    
    if (textarea.readOnly) {
      textarea.readOnly = false;
      textarea.focus();
      btn.textContent = '💾';
      btn.title = '保存编辑';
    } else {
      textarea.readOnly = true;
      selectedSummary = textarea.value;
      btn.textContent = '✏️';
      btn.title = '编辑总结';
      this.showStatus('✅ 摘要已保存', 'success');
    }
  }

  // 添加标签
  addTag(tagText) {
    if (!tagText || currentTags.includes(tagText)) return;
    
    currentTags.push(tagText);
    this.updateTagsDisplay();
  }

  // 移除标签
  removeTag(tagText) {
    const index = currentTags.indexOf(tagText);
    if (index > -1) {
      currentTags.splice(index, 1);
      this.updateTagsDisplay();
    }
  }

  // 更新标签显示
  updateTagsDisplay() {
    const container = document.getElementById('tagsContainer');
    container.innerHTML = '';

    currentTags.forEach(tag => {
      const tagElement = document.createElement('div');
      tagElement.className = 'tag';

      // 创建标签文本
      const tagText = document.createElement('span');
      tagText.textContent = tag;
      tagElement.appendChild(tagText);

      // 创建删除按钮
      const removeBtn = document.createElement('button');
      removeBtn.className = 'tag-remove';
      removeBtn.innerHTML = '×';
      removeBtn.addEventListener('click', () => this.removeTag(tag));
      tagElement.appendChild(removeBtn);

      container.appendChild(tagElement);
    });

    // 添加新标签按钮
    const addButton = document.createElement('div');
    addButton.className = 'tag add-tag';
    addButton.innerHTML = '<span>+ 添加标签</span>';
    addButton.addEventListener('click', () => {
      const input = document.getElementById('tagInput');
      input.style.display = 'inline-block';
      input.focus();
    });
    container.appendChild(addButton);
  }

  // 提交到Flomo
  async submitToFlomo() {
    const btn = document.getElementById('submitBtn');
    
    try {
      btn.disabled = true;
      btn.innerHTML = '<span class="loading-spinner"></span><span>提交中...</span>';
      
      const data = {
        title: document.getElementById('pageTitle').textContent,
        url: document.getElementById('pageUrl').textContent,
        summary: document.getElementById('summaryContent').value,
        thoughts: document.getElementById('thoughtsContent').value,
        selectedText: selectedText,
        selectedSummary: selectedSummary,
        tags: currentTags
      };
      
      const response = await chrome.runtime.sendMessage({
        action: 'submitToFlomo',
        data: data
      });
      
      if (response.success) {
        this.showStatus('✅ 提交成功！', 'success');
        // 清空表单
        document.getElementById('summaryContent').value = '';
        document.getElementById('thoughtsContent').value = '';
        await this.clearSelectedContent();
        currentTags = [];
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

  // 测试Blinko连接
  async testBlinkoConnection() {
    const btn = document.getElementById('testBlinkoBtn');

    try {
      btn.disabled = true;
      btn.textContent = '🔄';
      this.showStatus('🔗 正在测试Blinko连接...', 'info');

      const response = await chrome.runtime.sendMessage({
        action: 'testBlinkoConnection'
      });

      if (response.success) {
        this.showStatus('✅ Blinko连接测试成功', 'success');
      } else {
        this.showStatus('❌ Blinko连接测试失败: ' + response.error, 'error');
      }
    } catch (error) {
      console.error('Blinko连接测试失败:', error);
      this.showStatus('❌ Blinko连接测试失败: ' + error.message, 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = '🔗';
    }
  }

  // 测试AI连接
  async testAIConnection() {
    const btn = document.getElementById('testAIBtn');

    try {
      btn.disabled = true;
      btn.textContent = '🔄';
      this.showStatus('🧠 正在测试AI连接...', 'info');

      const response = await chrome.runtime.sendMessage({
        action: 'testAIConnection'
      });

      if (response.success) {
        this.showStatus(`✅ AI连接测试成功 (${response.result?.model || '未知模型'})`, 'success');
      } else {
        this.showStatus('❌ AI连接测试失败: ' + response.error, 'error');
      }
    } catch (error) {
      console.error('AI连接测试失败:', error);
      this.showStatus('❌ AI连接测试失败: ' + error.message, 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = '🧠';
    }
  }

  // 显示状态信息
  showStatus(message, type = 'info') {
    const statusElement = document.getElementById('statusMessage');
    statusElement.textContent = message;
    statusElement.className = `status-message status-${type}`;

    // 3秒后清除状态
    setTimeout(() => {
      statusElement.textContent = '';
      statusElement.className = 'status-message';
    }, 3000);
  }
}

// 创建全局侧边栏实例
let sidePanelInstance = null;

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', async () => {
  console.log('SidePanel DOM加载完成，开始初始化...');
  try {
    sidePanelInstance = new BlinkoSidePanel();
    await sidePanelInstance.init();
    console.log('SidePanel初始化成功');



  } catch (error) {
    console.error('SidePanel初始化失败:', error);
  }
});

// 导出实例
window.sidePanelInstance = sidePanelInstance;
