import { StorageService } from './js/services/storage-service.js';

// 全局变量
let currentTab = null;
let currentPageInfo = null;
let currentTags = [];
let selectedText = '';
let selectedSummary = '';

document.addEventListener('DOMContentLoaded', async () => {
  // 获取当前页面信息
  currentTab = (await chrome.tabs.query({ active: true, currentWindow: true }))[0];
  console.log('扩展初始化 - 当前标签页:', currentTab);

  // 初始化界面
  await initializeInterface();

  // 绑定事件监听器
  bindEventListeners();

  // 应用布局设置
  await applyLayoutSettings();

  // 检查配置状态
  checkConfigurationStatus();
});

// 初始化界面
async function initializeInterface() {
  try {
    // 显示基本页面信息
    document.getElementById('pageTitle').textContent = currentTab.title;
    document.getElementById('pageUrl').textContent = currentTab.url;

    // 获取页面详细信息
    // 获取页面详细信息
    showStatus('🔍 正在分析页面内容...', 'info');

    try {
      // 发送消息给 content script 获取页面内容
      const response = await chrome.tabs.sendMessage(currentTab.id, {
        action: 'getPageContent'
      });

      if (response && (response.content || response.title)) {
        currentPageInfo = response;
        console.log('页面信息提取成功:', currentPageInfo);

        // 生成智能标签
        const classification = await classifyContent(currentPageInfo, currentTab.url);
        currentTags = classification.tags || [];

        // 更新界面
        updateTagsDisplay();

        // 检测选中文本
        await checkSelectedText();

        showStatus('✅ 页面分析完成', 'success');
      } else {
        console.warn('页面信息提取失败或页面未加载完成');
        showStatus('⚠️ 无法提取页面内容，请刷新重试', 'warning');
      }
    } catch (msgError) {
      console.error('消息通信失败:', msgError);
      // 如果无法连接 content script (可能是在不想注入的页面或者 content script 崩溃)
      showStatus('⚠️ 无法连接到页面，请刷新页面后重试', 'warning');
    }
  } catch (error) {
    console.error('初始化失败:', error);
    showStatus('⚠️ 页面分析失败，但仍可手动输入', 'warning');
  }
}

// 绑定事件监听器
function bindEventListeners() {
  // AI生成摘要按钮
  document.getElementById('aiGenerateBtn').addEventListener('click', generateAISummary);

  // 选中内容相关按钮
  document.getElementById('selectedAiGenerateBtn').addEventListener('click', generateSelectedTextSummary);
  document.getElementById('clearSelectedBtn').addEventListener('click', clearSelectedContent);
  document.getElementById('moveToSummaryBtn').addEventListener('click', () => moveSelectedSummary('summary'));
  document.getElementById('moveToThoughtsBtn').addEventListener('click', () => moveSelectedSummary('thoughts'));
  document.getElementById('editSummaryBtn').addEventListener('click', toggleSelectedSummaryEdit);

  // 提交按钮
  document.getElementById('submitBtn').addEventListener('click', submitToFlomo);

  // 配置按钮
  document.getElementById('configBtn').addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });

  // 标签输入
  const tagInput = document.getElementById('tagInput');
  tagInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      addTag(tagInput.value.trim());
      tagInput.value = '';
      tagInput.style.display = 'none';
    }
  });

  tagInput.addEventListener('blur', () => {
    if (tagInput.value.trim()) {
      addTag(tagInput.value.trim());
      tagInput.value = '';
    }
    tagInput.style.display = 'none';
  });

  // 点击标签区域添加新标签
  document.getElementById('tagsContainer').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) {
      showTagInput();
    }
  });

  // 监听来自background的消息
  chrome.runtime.onMessage.addListener((message) => {
    if (message.action === 'updatePopupStatus') {
      showStatus(message.message, message.type);
    }
  });
}

// 生成AI摘要
async function generateAISummary() {
  const aiGenerateBtn = document.getElementById('aiGenerateBtn');
  const aiLoading = document.getElementById('aiLoading');
  const aiGenerateText = document.getElementById('aiGenerateText');
  const summaryContent = document.getElementById('summaryContent');

  try {
    // 显示加载状态
    aiLoading.classList.remove('hidden');
    aiGenerateText.textContent = '生成中...';
    aiGenerateBtn.disabled = true;

    // 首先检查AI配置
    const settings = await StorageService.getAISettings();
    console.log('AI配置检查:', { hasApiKey: !!settings.aiApiKey, provider: settings.aiProvider, baseUrl: settings.aiBaseUrl });

    if (!settings.aiApiKey) {
      throw new Error('请先在设置中配置AI API密钥');
    }

    showStatus('🤖 正在生成AI摘要...', 'info');
    console.log('开始生成AI摘要，当前页面:', currentTab?.title);
    console.log('页面信息:', currentPageInfo);

    // 调用background脚本生成摘要
    console.log('发送消息到background脚本...');
    const response = await new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({
        action: 'generateAISummaryOnly',
        tab: currentTab,
        pageInfo: currentPageInfo
      }, (response) => {
        if (chrome.runtime.lastError) {
          console.error('Chrome runtime错误:', chrome.runtime.lastError);
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(response);
        }
      });
    });

    console.log('AI摘要响应:', response);

    if (response && response.summary) {
      summaryContent.value = response.summary;
      showStatus('✅ AI摘要生成完成', 'success');
      console.log('AI摘要生成成功');
    } else if (response && response.error) {
      throw new Error(response.error);
    } else {
      // 提供降级选项
      summaryContent.placeholder = 'AI摘要生成失败，您可以手动输入摘要内容...';
      showStatus('⚠️ AI摘要生成失败，请手动输入或检查AI配置', 'warning');
      console.warn('AI摘要响应无效:', response);
    }
  } catch (error) {
    console.error('AI摘要生成失败:', error);

    // 根据错误类型提供不同的提示
    let errorMessage = error.message;
    if (error.message.includes('API密钥')) {
      errorMessage = '请先配置AI服务。点击右上角设置按钮进行配置。';
    } else if (error.message.includes('网络') || error.message.includes('超时')) {
      errorMessage = '网络连接失败，请检查网络或稍后重试。';
    } else if (error.message.includes('无法提取')) {
      errorMessage = '无法提取页面内容，请手动输入摘要。';
    }

    summaryContent.placeholder = '您可以手动输入摘要内容...';
    showStatus('❌ ' + errorMessage, 'error');
  } finally {
    // 恢复按钮状态
    aiLoading.classList.add('hidden');
    aiGenerateText.textContent = 'AI总结';
    aiGenerateBtn.disabled = false;
  }
}

// 应用布局设置
async function applyLayoutSettings() {
  try {
    const settings = await StorageService.getSync(['popupPosition']);
    if (settings.popupPosition === 'right') {
      document.body.classList.add('right-position');
    }
  } catch (error) {
    console.error('应用布局设置失败:', error);
  }
}

// 检测选中文本
async function checkSelectedText() {
  try {
    // 检查功能是否启用
    const settings = await StorageService.getSync(['enableSelectedTextFeature']);
    if (settings.enableSelectedTextFeature === false) {
      document.getElementById('selectedContentSection').style.display = 'none';
      return;
    }

    const response = await chrome.tabs.sendMessage(currentTab.id, {
      action: 'getSelectedText'
    });

    selectedText = response?.text?.trim() || '';
    console.log('检测到选中文本:', selectedText);

    if (selectedText) {
      // 显示选中内容区域
      document.getElementById('selectedContentSection').style.display = 'block';
      document.getElementById('selectedContent').value = selectedText;
      document.getElementById('selectedContent').placeholder = '已检测到选中文本，可以进行AI总结';
    } else {
      // 隐藏选中内容区域
      document.getElementById('selectedContentSection').style.display = 'none';
    }
  } catch (error) {
    console.error('检测选中文本失败:', error);
    document.getElementById('selectedContentSection').style.display = 'none';
  }
}

// 生成选中文本AI总结
async function generateSelectedTextSummary() {
  const selectedAiGenerateBtn = document.getElementById('selectedAiGenerateBtn');
  const selectedAiLoading = document.getElementById('selectedAiLoading');
  const selectedAiGenerateText = document.getElementById('selectedAiGenerateText');
  const selectedSummaryContainer = document.getElementById('selectedSummaryContainer');
  const selectedSummaryContent = document.getElementById('selectedSummaryContent');

  try {
    // 获取当前选中的文本
    const currentSelectedText = document.getElementById('selectedContent').value.trim();
    if (!currentSelectedText) {
      showStatus('❌ 没有选中文本可以总结', 'error');
      return;
    }

    // 显示加载状态
    selectedAiLoading.classList.remove('hidden');
    selectedAiGenerateText.textContent = '生成中...';
    selectedAiGenerateBtn.disabled = true;

    showStatus('🤖 正在生成选中文本AI总结...', 'info');
    console.log('开始生成选中文本AI总结，文本长度:', currentSelectedText.length);

    // 调用background脚本生成摘要
    console.log('发送消息到background脚本...');
    const response = await new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({
        action: 'generateSelectedTextSummary',
        selectedText: currentSelectedText,
        tab: currentTab,
        pageInfo: currentPageInfo
      }, (response) => {
        if (chrome.runtime.lastError) {
          console.error('Chrome runtime错误:', chrome.runtime.lastError);
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(response);
        }
      });
    });

    console.log('选中文本AI总结响应:', response);

    if (response && response.summary) {
      selectedSummary = response.summary;
      selectedSummaryContent.value = selectedSummary;
      selectedSummaryContainer.style.display = 'block';
      showStatus('✅ 选中文本AI总结生成完成', 'success');
      console.log('选中文本AI总结生成成功');
    } else if (response && response.error) {
      throw new Error(response.error);
    } else {
      selectedSummaryContent.placeholder = '选中文本AI总结生成失败，您可以手动输入总结内容...';
      showStatus('⚠️ 选中文本AI总结生成失败，请手动输入或检查AI配置', 'warning');
      console.warn('选中文本AI总结响应无效:', response);
    }
  } catch (error) {
    console.error('选中文本AI总结生成失败:', error);

    // 根据错误类型提供不同的提示
    let errorMessage = error.message;
    if (error.message.includes('API密钥')) {
      errorMessage = '请先配置AI服务。点击右上角设置按钮进行配置。';
    } else if (error.message.includes('网络') || error.message.includes('超时')) {
      errorMessage = '网络连接失败，请检查网络或稍后重试。';
    }

    selectedSummaryContent.placeholder = '您可以手动输入总结内容...';
    showStatus('❌ ' + errorMessage, 'error');
  } finally {
    // 恢复按钮状态
    selectedAiLoading.classList.add('hidden');
    selectedAiGenerateText.textContent = 'AI总结';
    selectedAiGenerateBtn.disabled = false;
  }
}

// 清除选中内容
function clearSelectedContent() {
  selectedText = '';
  selectedSummary = '';
  document.getElementById('selectedContent').value = '';
  document.getElementById('selectedSummaryContent').value = '';
  document.getElementById('selectedSummaryContainer').style.display = 'none';
  document.getElementById('selectedContentSection').style.display = 'none';
  showStatus('✅ 已清除选中内容', 'success');
}

// 移动选中文本总结到其他区域
function moveSelectedSummary(target) {
  const summaryText = document.getElementById('selectedSummaryContent').value.trim();
  if (!summaryText) {
    showStatus('❌ 没有总结内容可以移动', 'error');
    return;
  }

  if (target === 'summary') {
    const summaryContent = document.getElementById('summaryContent');
    const currentContent = summaryContent.value.trim();
    summaryContent.value = currentContent ? currentContent + '\n\n' + summaryText : summaryText;
    showStatus('✅ 总结已移动到原文摘要区域', 'success');
  } else if (target === 'thoughts') {
    const thoughtsContent = document.getElementById('thoughtsContent');
    const currentContent = thoughtsContent.value.trim();
    thoughtsContent.value = currentContent ? currentContent + '\n\n' + summaryText : summaryText;
    showStatus('✅ 总结已移动到个人想法区域', 'success');
  }
}

// 切换选中文本总结的编辑状态
function toggleSelectedSummaryEdit() {
  const selectedSummaryContent = document.getElementById('selectedSummaryContent');
  const editBtn = document.getElementById('editSummaryBtn');

  if (selectedSummaryContent.readOnly) {
    selectedSummaryContent.readOnly = false;
    selectedSummaryContent.focus();
    editBtn.textContent = '💾';
    editBtn.title = '保存编辑';
    showStatus('📝 现在可以编辑总结内容', 'info');
  } else {
    selectedSummaryContent.readOnly = true;
    editBtn.textContent = '✏️';
    editBtn.title = '编辑总结';
    selectedSummary = selectedSummaryContent.value;
    showStatus('✅ 总结编辑已保存', 'success');
  }
}

// 提交到Flomo
async function submitToFlomo() {
  const submitBtn = document.getElementById('submitBtn');
  const summaryContent = document.getElementById('summaryContent').value.trim();
  const thoughtsContent = document.getElementById('thoughtsContent').value.trim();

  if (!summaryContent && !thoughtsContent) {
    showStatus('❌ 请至少填写摘要或个人想法', 'error');
    return;
  }

  try {
    submitBtn.disabled = true;
    showStatus('📤 正在提交到Blinko...', 'info');

    // 构建内容
    let content = `📝 **${currentTab.title}**\n\n`;

    if (summaryContent) {
      content += `📄 **原文摘要：**\n${summaryContent}\n\n`;
    }

    if (thoughtsContent) {
      content += `💭 **个人想法：**\n${thoughtsContent}\n\n`;
    }

    // 添加标签
    if (currentTags.length > 0) {
      content += `🏷️ **标签：** ${currentTags.join(' ')}\n\n`;
    }

    // 添加链接和时间
    content += `🔗 **链接：** ${currentTab.url}\n`;
    content += `📅 **收集时间：** ${new Date().toLocaleString()}\n\n`;
    content += `#网页收集 #智能笔记 ${currentTags.join(' ')}`;

    // 发送到background保存
    await chrome.runtime.sendMessage({
      action: 'saveToBlinko',
      content: content
    });

    showStatus('✅ 已成功提交到Blinko', 'success');

    // 延迟关闭popup
    setTimeout(() => {
      window.close();
    }, 1500);

  } catch (error) {
    console.error('提交失败:', error);
    showStatus('❌ 提交失败：' + error.message, 'error');
  } finally {
    submitBtn.disabled = false;
  }
}

// 更新标签显示
function updateTagsDisplay() {
  const tagsContainer = document.getElementById('tagsContainer');
  tagsContainer.innerHTML = '';

  currentTags.forEach(tag => {
    const tagElement = createTagElement(tag);
    tagsContainer.appendChild(tagElement);
  });

  // 添加"+"按钮
  const addButton = document.createElement('div');
  addButton.className = 'tag';
  addButton.style.cursor = 'pointer';
  addButton.innerHTML = '<span>+</span>';
  addButton.addEventListener('click', showTagInput);
  tagsContainer.appendChild(addButton);
}

// 创建标签元素
function createTagElement(tagText) {
  const tag = document.createElement('div');
  tag.className = 'tag';

  const text = document.createElement('span');
  text.textContent = tagText;
  tag.appendChild(text);

  const removeBtn = document.createElement('button');
  removeBtn.className = 'tag-remove';
  removeBtn.innerHTML = '×';
  removeBtn.addEventListener('click', () => removeTag(tagText));
  tag.appendChild(removeBtn);

  return tag;
}

// 显示标签输入框
function showTagInput() {
  const tagInput = document.getElementById('tagInput');
  tagInput.style.display = 'inline-block';
  tagInput.focus();
}

// 添加标签
function addTag(tagText) {
  if (tagText && !currentTags.includes(tagText)) {
    // 确保标签以#开头
    if (!tagText.startsWith('#')) {
      tagText = '#' + tagText;
    }
    currentTags.push(tagText);
    updateTagsDisplay();
  }
}

// 移除标签
function removeTag(tagText) {
  const index = currentTags.indexOf(tagText);
  if (index > -1) {
    currentTags.splice(index, 1);
    updateTagsDisplay();
  }
}

// 检查配置状态
async function checkConfigurationStatus() {
  const settings = await StorageService.getSync(['blinkoUrl', 'blinkoToken']);

  if (!settings.blinkoUrl || !settings.blinkoToken) {
    showStatus('⚠️ 请先配置 Blinko API', 'warning');
  } else {
    showStatus('✅ 配置完成，可以开始使用', 'success');
  }
}

// 显示状态信息
function showStatus(message, type) {
  const statusDiv = document.getElementById('status');
  statusDiv.innerHTML = message;
  statusDiv.className = `status ${type}`;

  if (type === 'success') {
    setTimeout(() => {
      statusDiv.textContent = '';
      statusDiv.className = '';
    }, 3000);
  }
}



// 智能分类内容
async function classifyContent(pageInfo, url) {
  // 发送到background进行分类
  try {
    const response = await chrome.runtime.sendMessage({
      action: 'classifyContent',
      pageInfo: pageInfo,
      url: url
    });
    return response || { tags: ['#网页收集'], type: '网页' };
  } catch (error) {
    console.error('分类失败:', error);
    return { tags: ['#网页收集'], type: '网页' };
  }
}