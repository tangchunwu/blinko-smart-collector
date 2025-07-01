// 全局变量
let currentTab = null;
let currentPageInfo = null;
let currentTags = [];

document.addEventListener('DOMContentLoaded', async () => {
  // 获取当前页面信息
  currentTab = (await chrome.tabs.query({ active: true, currentWindow: true }))[0];

  // 初始化界面
  await initializeInterface();

  // 绑定事件监听器
  bindEventListeners();

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
    showStatus('🔍 正在分析页面内容...', 'info');
    const [result] = await chrome.scripting.executeScript({
      target: { tabId: currentTab.id },
      function: extractPageDetails
    });

    if (result.result) {
      currentPageInfo = result.result;

      // 生成智能标签
      const classification = await classifyContent(currentPageInfo, currentTab.url);
      currentTags = classification.tags || [];

      // 更新界面
      updateTagsDisplay();
      showStatus('✅ 页面分析完成', 'success');
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

    showStatus('🤖 正在生成AI摘要...', 'info');

    // 调用background脚本生成摘要
    const response = await chrome.runtime.sendMessage({
      action: 'generateAISummaryOnly',
      tab: currentTab,
      pageInfo: currentPageInfo
    });

    if (response && response.summary) {
      summaryContent.value = response.summary;
      showStatus('✅ AI摘要生成完成', 'success');
    } else {
      throw new Error('AI摘要生成失败');
    }
  } catch (error) {
    console.error('AI摘要生成失败:', error);
    showStatus('❌ AI摘要生成失败：' + error.message, 'error');
  } finally {
    // 恢复按钮状态
    aiLoading.classList.add('hidden');
    aiGenerateText.textContent = 'AI总结';
    aiGenerateBtn.disabled = false;
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
  const settings = await chrome.storage.sync.get(['blinkoUrl', 'blinkoToken']);

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

// 页面详细信息提取函数（在页面上下文中执行）
function extractPageDetails() {
  const title = document.title;
  const description = document.querySelector('meta[name="description"]')?.content ||
                     document.querySelector('meta[property="og:description"]')?.content || '';
  const keywords = document.querySelector('meta[name="keywords"]')?.content || '';
  const author = document.querySelector('meta[name="author"]')?.content ||
                document.querySelector('[rel="author"]')?.textContent || '';

  // 提取主要内容
  const contentSelectors = [
    'article', '[role="main"]', '.content', '.post-content',
    '.entry-content', '.article-content', '.post-body', 'main'
  ];

  let contentElement = null;
  for (const selector of contentSelectors) {
    contentElement = document.querySelector(selector);
    if (contentElement) break;
  }

  if (!contentElement) contentElement = document.body;

  // 清理内容
  const clonedContent = contentElement.cloneNode(true);
  const unwantedElements = clonedContent.querySelectorAll(
    'script, style, nav, header, footer, .ad, .advertisement, .sidebar, .menu'
  );
  unwantedElements.forEach(el => el.remove());

  const textContent = clonedContent.innerText || clonedContent.textContent;
  const wordCount = textContent.length;

  // 提取关键词
  const text = textContent.toLowerCase();
  const commonWords = ['的', '了', '在', '是', '我', '有', '和', '就', '不', '人', '都', '一', '个', '上', '也', '很', '到', '说', '要', '去', '你', '会', '着', 'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'this', 'that', 'these', 'those'];

  const words = text.match(/[\u4e00-\u9fa5]+|[a-zA-Z]+/g) || [];
  const wordFreq = {};

  words.forEach(word => {
    if (word.length > 1 && !commonWords.includes(word)) {
      wordFreq[word] = (wordFreq[word] || 0) + 1;
    }
  });

  const topKeywords = Object.entries(wordFreq)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 10)
    .map(([word]) => word);

  return {
    title,
    description,
    keywords: keywords.split(',').map(k => k.trim()).filter(k => k),
    author,
    wordCount,
    extractedKeywords: topKeywords,
    domain: window.location.hostname,
    pathname: window.location.pathname
  };
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