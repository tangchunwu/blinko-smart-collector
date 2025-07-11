// 智能分类规则配置
const CLASSIFICATION_RULES = {
  // 技术开发类
  tech: {
    domains: ['github.com', 'stackoverflow.com', 'dev.to', 'medium.com', 'csdn.net', 'juejin.cn', 'segmentfault.com'],
    keywords: ['javascript', 'python', 'react', 'vue', 'node', '前端', '后端', '算法', '数据结构', 'api'],
    tags: ['#技术', '#编程', '#开发']
  },
  // 学习教育类
  education: {
    domains: ['coursera.org', 'edx.org', 'udemy.com', 'bilibili.com', 'youtube.com', 'zhihu.com'],
    keywords: ['教程', '学习', '课程', '教育', '培训', '知识', '技能'],
    tags: ['#学习', '#教育', '#知识']
  },
  // 新闻资讯类
  news: {
    domains: ['news.ycombinator.com', 'techcrunch.com', '36kr.com', 'ithome.com', 'cnbeta.com'],
    keywords: ['新闻', '资讯', '趋势', '报告', '分析'],
    tags: ['#新闻', '#资讯', '#趋势']
  },
  // 工具效率类
  tools: {
    domains: ['producthunt.com', 'tools.com', 'extensions.com'],
    keywords: ['工具', '效率', '插件', '扩展', '自动化', '生产力'],
    tags: ['#工具', '#效率', '#生产力']
  },
  // 设计创意类
  design: {
    domains: ['dribbble.com', 'behance.net', 'figma.com', 'canva.com'],
    keywords: ['设计', '创意', 'ui', 'ux', '视觉', '美术'],
    tags: ['#设计', '#创意', '#视觉']
  },
  // 商业财经类
  business: {
    domains: ['forbes.com', 'bloomberg.com', 'wsj.com', 'ft.com'],
    keywords: ['商业', '财经', '投资', '创业', '管理', '营销'],
    tags: ['#商业', '#财经', '#投资']
  }
};

// 创建右键菜单
chrome.runtime.onInstalled.addListener(() => {
  // AI总结菜单
  chrome.contextMenus.create({
    id: 'aiSummary',
    title: '🤖 AI总结文章 (Ctrl+Shift+A)',
    contexts: ['page']
  });

  // 划词收集菜单
  chrome.contextMenus.create({
    id: 'collectText',
    title: '✂️ 收集到Blinko (Ctrl+Shift+C)',
    contexts: ['selection']
  });

  // 保存页面菜单
  chrome.contextMenus.create({
    id: 'savePage',
    title: '📌 保存页面到Blinko (Ctrl+Shift+S)',
    contexts: ['page']
  });

  // 智能分析菜单
  chrome.contextMenus.create({
    id: 'smartAnalyze',
    title: '🧠 智能分析并收集',
    contexts: ['page']
  });
});

// 处理快捷键命令
chrome.commands.onCommand.addListener(async (command) => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  switch (command) {
    case 'open-config':
      chrome.runtime.openOptionsPage();
      break;
    case 'toggle-sidebar':
      await toggleSidePanel(tab);
      break;
  }
});

// 处理扩展图标点击
chrome.action.onClicked.addListener(async (tab) => {
  await openSidePanel(tab);
});

// 处理右键菜单点击
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  switch (info.menuItemId) {
    case 'collectText':
      await collectSelectedText(info, tab);
      break;
    case 'savePage':
      await saveCurrentPage(tab);
      break;
    case 'aiSummary':
      await aiSummaryArticle(tab);
      break;
    case 'smartAnalyze':
      await smartAnalyzeAndCollect(tab);
      break;
  }
});

// 处理来自popup的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    try {
      console.log('Background收到消息:', message.action);

      switch (message.action) {
        case 'saveCurrentPage':
          await saveCurrentPage(message.tab);
          sendResponse({ success: true });
          break;
        case 'aiSummaryArticle':
          await aiSummaryArticle(message.tab);
          sendResponse({ success: true });
          break;
        case 'smartAnalyzeAndCollect':
          await smartAnalyzeAndCollect(message.tab);
          sendResponse({ success: true });
          break;
        case 'generateAISummary':
          try {
            console.log('Background开始生成AI摘要...', message.isSelection ? '(选中文本)' : '(全文)');

            // 根据isSelection参数决定处理方式
            let result;
            if (message.isSelection) {
              // 选中文本总结
              result = await generateSelectedTextSummary(message.content, message, {
                title: message.title,
                url: message.url
              });
            } else {
              // 全文总结
              result = await generateAISummaryFromContent(message.content, message.title, message.url);
            }

            console.log('Background AI摘要生成完成，长度:', result?.summary?.length);
            sendResponse({
              success: true,
              summary: result.summary,
              tags: result.tags,
              type: result.type,
              keywords: result.keywords
            });
          } catch (error) {
            console.error('Background AI摘要生成失败:', error);
            sendResponse({ success: false, error: error.message });
          }
          break;
        case 'generateAISummaryOnly':
          try {
            console.log('Background开始生成AI摘要...');
            const summary = await generateAISummaryOnly(message.tab, message.pageInfo);
            console.log('Background AI摘要生成完成，长度:', summary?.length);
            sendResponse({ summary: summary });
          } catch (error) {
            console.error('Background AI摘要生成失败:', error);
            sendResponse({ error: error.message });
          }
          break;
        case 'generateSelectedTextSummary':
          try {
            console.log('Background开始生成选中文本AI总结...');
            const result = await generateSelectedTextSummary(message.selectedText, message.tab, message.pageInfo);
            console.log('Background选中文本AI总结生成完成，长度:', result?.summary?.length);
            sendResponse({
              success: true,
              summary: result.summary,
              tags: result.tags,
              type: result.type,
              keywords: result.keywords
            });
          } catch (error) {
            console.error('Background选中文本AI总结生成失败:', error);
            sendResponse({ success: false, error: error.message });
          }
          break;
        case 'classifyContent':
          const classification = await classifyContent(message.pageInfo, message.url);
          sendResponse(classification);
          break;
        case 'saveToBlinko':
          await saveToBlinko(message.content);
          sendResponse({ success: true });
          break;
        case 'submitToFlomo':
          // 处理从sidepanel提交的数据到Blinko
          try {
            console.log('Background收到submitToFlomo请求:', message.data);
            const formattedContent = await formatSidePanelDataForBlinko(message.data);
            await saveToBlinko(formattedContent);
            sendResponse({ success: true });
          } catch (error) {
            console.error('Background submitToFlomo失败:', error);
            sendResponse({ success: false, error: error.message });
          }
          break;
        case 'selectedTextChanged':
          // 处理选中文本变化
          try {
            console.log('Background收到选中文本变化:', message.text ? `"${message.text.substring(0, 50)}..."` : '无选中');

            // 获取当前活动标签页
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

            // 保存选中文本到storage，供sidepanel使用
            await chrome.storage.local.set({
              currentSelectedText: message.text,
              selectedTextTabId: tab?.id,
              selectedTextTimestamp: message.timestamp || Date.now()
            });

            console.log('选中文本已保存到storage');
          } catch (error) {
            console.error('处理选中文本变化失败:', error);
          }
          break;
        case 'testBlinkoConnection':
          try {
            console.log('测试Blinko连接...');
            await testBlinkoConnection();
            sendResponse({ success: true, message: 'Blinko连接测试成功' });
          } catch (error) {
            console.error('Blinko连接测试失败:', error);
            sendResponse({ success: false, error: error.message });
          }
          break;
        case 'testAIConnection':
          try {
            console.log('测试AI连接...');
            const result = await testAIConnection();
            sendResponse({ success: true, message: 'AI连接测试成功', result: result });
          } catch (error) {
            console.error('AI连接测试失败:', error);
            sendResponse({ success: false, error: error.message });
          }
          break;
        default:
          sendResponse({ error: 'Unknown action: ' + message.action });
      }
    } catch (error) {
      console.error('Background处理消息失败:', error);
      sendResponse({ error: error.message });
    }
  })();

  return true; // 保持消息通道开放以支持异步响应
});

// 智能分析并收集
async function smartAnalyzeAndCollect(tab) {
  try {
    showNotification('🧠 正在智能分析页面内容...');
    
    // 获取页面详细信息
    const [result] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: extractPageDetails
    });
    
    if (result.result) {
      const pageInfo = result.result;
      const classification = await classifyContent(pageInfo, tab.url);
      
      const content = `🧠 **智能收集** - ${pageInfo.title}

📊 **页面分析：**
• 页面类型：${classification.type}
• 内容长度：约${pageInfo.wordCount}字
• 主要关键词：${classification.keywords.join(', ')}

📝 **内容摘要：**
${pageInfo.description || '暂无描述'}

🏷️ **智能标签：** ${classification.tags.join(' ')}

🔗 **原文链接：** ${tab.url}
📅 **收集时间：** ${new Date().toLocaleString()}

#智能收集 ${classification.tags.join(' ')}`;

      await saveToBlinko(content);
      showNotification('✅ 智能分析完成，已保存到Blinko');
      
      // 发送成功消息到popup
      chrome.runtime.sendMessage({
        action: 'updatePopupStatus',
        message: '✅ 智能分析完成，已保存到Blinko',
        type: 'success'
      });
    }
  } catch (error) {
    showNotification('❌ 智能分析失败：' + error.message);
    throw error;
  }
}

// 提取页面详细信息
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
  const domain = new URL(url).hostname;

  // 处理不同类型的输入
  let title = '';
  let description = '';
  let extractedKeywords = [];

  if (typeof pageInfo === 'string') {
    // 如果pageInfo是字符串，说明是从sidepanel传来的内容
    description = pageInfo;
    title = '';
    extractedKeywords = [];
  } else if (pageInfo && typeof pageInfo === 'object') {
    // 如果pageInfo是对象，使用其属性
    title = pageInfo.title || '';
    description = pageInfo.description || '';
    extractedKeywords = pageInfo.extractedKeywords || [];
  }

  const allText = (title + ' ' + description + ' ' + extractedKeywords.join(' ')).toLowerCase();
  
  let classification = {
    type: '未分类',
    tags: ['#网页收集'],
    keywords: extractedKeywords.slice(0, 5),
    confidence: 0
  };
  
  // 检查域名匹配
  for (const [categoryName, rules] of Object.entries(CLASSIFICATION_RULES)) {
    let score = 0;
    
    // 域名匹配 (权重: 40%)
    if (rules.domains.some(d => domain.includes(d))) {
      score += 40;
    }
    
    // 关键词匹配 (权重: 60%)
    const matchingKeywords = rules.keywords.filter(keyword => 
      allText.includes(keyword.toLowerCase())
    );
    score += (matchingKeywords.length / rules.keywords.length) * 60;
    
    if (score > classification.confidence) {
      classification = {
        type: categoryName,
        tags: [...rules.tags, '#网页收集'],
        keywords: [...new Set([...matchingKeywords, ...extractedKeywords])].slice(0, 5),
        confidence: score
      };
    }
  }
  
  // 添加域名标签
  const domainTag = '#' + domain.replace(/\./g, '_').replace(/[^a-zA-Z0-9_\u4e00-\u9fa5]/g, '');
  if (!classification.tags.includes(domainTag)) {
    classification.tags.push(domainTag);
  }
  
  // 添加时间标签
  const now = new Date();
  const timeTag = '#' + now.getFullYear() + '年' + (now.getMonth() + 1) + '月';
  classification.tags.push(timeTag);
  
  return classification;
}

// 收集选中文本（支持快捷键）
async function collectSelectedText(info, tab) {
  let selectedText = '';
  
  if (info && info.selectionText) {
    selectedText = info.selectionText;
  } else {
    // 快捷键调用时获取选中文本
    try {
      const [result] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        function: () => window.getSelection().toString()
      });
      selectedText = result.result;
    } catch (error) {
      showNotification('❌ 未选中文本或获取失败');
      return;
    }
  }
  
  if (!selectedText) {
    showNotification('❌ 请先选中要收集的文本');
    return;
  }
  
  // 智能分析选中文本
  const classification = await classifyContent({
    title: tab.title,
    description: selectedText.slice(0, 200),
    extractedKeywords: extractKeywordsFromText(selectedText),
    domain: new URL(tab.url).hostname
  }, tab.url);
  
  const content = `✂️ **网页摘录**

📝 **内容：**
"${selectedText}"

🏷️ **智能标签：** ${classification.tags.join(' ')}

🔗 **来源：** ${tab.title}
🌐 **链接：** ${tab.url}
📅 **收集时间：** ${new Date().toLocaleString()}

#网页摘录 #划词收集 ${classification.tags.join(' ')}`;

  await saveToBlinko(content);
  showNotification('✅ 文本已收集到Blinko');
  
  // 通知content script高亮收集的文本
  chrome.tabs.sendMessage(tab.id, {
    action: 'highlightCollectedText'
  });
}

// 从文本中提取关键词
function extractKeywordsFromText(text) {
  const commonWords = ['的', '了', '在', '是', '我', '有', '和', '就', '不', '人', '都', '一', '个', '上', '也', '很', '到', '说', '要', '去', '你', '会', '着', 'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'];
  const words = text.toLowerCase().match(/[\u4e00-\u9fa5]+|[a-zA-Z]+/g) || [];
  const wordFreq = {};
  
  words.forEach(word => {
    if (word.length > 1 && !commonWords.includes(word)) {
      wordFreq[word] = (wordFreq[word] || 0) + 1;
    }
  });
  
  return Object.entries(wordFreq)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5)
    .map(([word]) => word);
}

// 保存当前页面（增强版）
async function saveCurrentPage(tab) {
  try {
    // 获取页面信息进行智能分类
    const [result] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: extractPageDetails
    });
    
    let classification = { tags: ['#网页收集'], type: '网页' };
    if (result.result) {
      classification = await classifyContent(result.result, tab.url);
    }
    
    const content = `📌 **${tab.title}**

📊 **页面类型：** ${classification.type}
🏷️ **智能标签：** ${classification.tags.join(' ')}

🔗 **链接：** ${tab.url}
📅 **收集时间：** ${new Date().toLocaleString()}

#网页收集 #阅读记录 ${classification.tags.join(' ')}`;

    await saveToBlinko(content);
    showNotification('✅ 页面已保存到Blinko');
    
    // 发送成功消息到popup
    chrome.runtime.sendMessage({
      action: 'updatePopupStatus',
      message: '✅ 页面已保存到Blinko',
      type: 'success'
    });
  } catch (error) {
    showNotification('❌ 保存失败：' + error.message);
    throw error;
  }
}

// AI总结文章（增强版）
async function aiSummaryArticle(tab) {
  try {
    showNotification('🤖 正在分析文章内容...');
    
    const [result] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: extractArticleContent
    });
    
    if (result.result) {
      showNotification('🧠 正在生成AI总结...');
      
      // 获取页面详细信息用于智能分类
      const [pageResult] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        function: extractPageDetails
      });
      
      let classification = { tags: ['#AI总结'], type: '文章' };
      if (pageResult.result) {
        classification = await classifyContent(pageResult.result, tab.url);
      }
      
      const summary = await generateAISummary(result.result, tab.title, tab.url, classification);
      await saveToBlinko(summary);
      showNotification('✅ AI总结已保存到Blinko');
      
      // 发送成功消息到popup
      chrome.runtime.sendMessage({
        action: 'updatePopupStatus',
        message: '✅ AI总结已保存到Blinko',
        type: 'success'
      });
    } else {
      showNotification('❌ 无法提取文章内容');
      throw new Error('无法提取文章内容');
    }
  } catch (error) {
    showNotification('❌ 总结失败：' + error.message);
    throw error;
  }
}

// 提取文章内容函数（在页面上下文中执行）
function extractArticleContent() {
  const selectors = [
    'article',
    '[role="main"]',
    '.content',
    '.post-content',
    '.entry-content',
    '.article-content',
    '.post-body',
    'main'
  ];
  
  let article = null;
  for (const selector of selectors) {
    article = document.querySelector(selector);
    if (article) break;
  }
  
  if (!article) article = document.body;
  
  // 移除脚本和样式标签
  const scripts = article.querySelectorAll('script, style, nav, header, footer, .ad, .advertisement');
  scripts.forEach(el => el.remove());
  
  const text = article.innerText || article.textContent;
  return text.replace(/\s+/g, ' ').trim().slice(0, 8000);
}

// 获取实际使用的模型名称
async function getActualModelName(settings) {
  const provider = settings.aiProvider || 'openai';
  const selectedModel = settings.aiModel || 'gpt-3.5-turbo';
  const customModel = settings.aiCustomModel || '';
  
  // 如果选择了自定义模型，使用自定义模型名称
  if ((provider === 'custom' || selectedModel === 'custom') && customModel) {
    return customModel;
  }
  
  return selectedModel;
}

// 生成AI总结（增强版 - 支持硅基流动和自定义模型）
async function generateAISummary(content, title, url, classification) {
  const settings = await chrome.storage.sync.get([
    'aiApiKey', 'aiProvider', 'aiBaseUrl', 'aiModel', 'aiCustomModel', 'aiTemperature', 
    'aiMaxTokens', 'aiTopP', 'aiTimeout', 'aiSystemPrompt', 'summaryLength'
  ]);
  
  if (!settings.aiApiKey) {
    throw new Error('请先配置AI API密钥');
  }

  const baseUrl = settings.aiBaseUrl || 'https://api.openai.com/v1';
  const model = await getActualModelName(settings);
  const temperature = settings.aiTemperature || 0.7;
  const maxTokens = settings.aiMaxTokens || 1000;
  const topP = settings.aiTopP || 1.0;
  const timeout = (settings.aiTimeout || 30) * 1000;
  
  console.log('AI总结参数:', {
    provider: settings.aiProvider,
    model: model,
    baseUrl: baseUrl,
    temperature: temperature,
    maxTokens: maxTokens
  });
  
  // 根据分类调整提示词
  let systemPrompt = settings.aiSystemPrompt || '你是一个专业的文章总结助手。请用中文总结文章的核心要点，包括：1）主要观点；2）关键信息；3）实用建议。保持简洁明了，突出价值。';
  
  if (classification.type === 'tech') {
    systemPrompt += '这是一篇技术文章，请重点关注技术要点、实现方法和最佳实践。';
  } else if (classification.type === 'education') {
    systemPrompt += '这是一篇学习资料，请重点提取知识点、学习方法和要点总结。';
  } else if (classification.type === 'news') {
    systemPrompt += '这是一篇新闻资讯，请重点关注事件要点、影响分析和发展趋势。';
  }

  // 根据总结长度调整maxTokens
  const lengthSettings = {
    short: Math.min(maxTokens, 300),
    medium: Math.min(maxTokens, 600),
    long: Math.min(maxTokens, 1000),
    adaptive: maxTokens
  };
  const adjustedMaxTokens = lengthSettings[settings.summaryLength] || maxTokens;
  
  const endpoint = baseUrl.endsWith('/') ? baseUrl + 'chat/completions' : baseUrl + '/chat/completions';
  
  // 创建带超时的fetch请求
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${settings.aiApiKey}`
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `请总结以下文章：\n\n标题：${title}\n\n内容：${content}` }
        ],
        max_tokens: adjustedMaxTokens,
        temperature: temperature,
        top_p: topP
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`AI服务调用失败: ${response.status} - ${error}`);
    }

    const data = await response.json();
    const summary = data.choices[0].message.content;

    return `🤖 **AI文章总结** - ${title}

📊 **内容类型：** ${classification.type}
🏷️ **智能标签：** ${classification.tags.join(' ')}

📝 **核心要点：**
${summary}

🔗 **原文链接：** ${url}
📅 **总结时间：** ${new Date().toLocaleString()}

#AI总结 #文章收集 #知识管理 ${classification.tags.join(' ')}`;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('AI请求超时，请检查网络连接或增加超时时间');
    }
    throw error;
  }
}

// 保存到Blinko
async function saveToBlinko(content) {
  const settings = await chrome.storage.sync.get(['blinkoUrl', 'blinkoToken']);
  
  if (!settings.blinkoUrl || !settings.blinkoToken) {
    throw new Error('请先配置Blinko API');
  }

  const response = await fetch(settings.blinkoUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${settings.blinkoToken}`
    },
    body: JSON.stringify({
      content: content,
      type: 0
    })
  });

  if (!response.ok) {
    throw new Error(`保存失败: ${response.status}`);
  }
}

// 从内容生成AI摘要（用于sidepanel）
async function generateAISummaryFromContent(content, title, url) {
  try {
    console.log('从内容生成AI摘要，内容长度:', content?.length, '标题:', title);

    if (!content || content.trim().length === 0) {
      throw new Error('页面内容为空，无法生成摘要');
    }

    // 检查AI配置
    const settings = await chrome.storage.sync.get(['aiApiKey', 'aiProvider', 'aiBaseUrl']);
    console.log('AI配置检查:', {
      hasApiKey: !!settings.aiApiKey,
      provider: settings.aiProvider,
      baseUrl: settings.aiBaseUrl
    });

    if (!settings.aiApiKey) {
      throw new Error('请先在配置页面设置AI API密钥');
    }

    // 使用现有的generateAISummary函数，但需要先进行内容分类
    const classification = await classifyContent(content, url);
    console.log('内容分类完成:', classification);

    const summary = await generateAISummary(content, title, url, classification);
    console.log('AI摘要生成完成，长度:', summary?.length);

    // 返回摘要和标签信息
    return {
      summary: summary,
      tags: classification.tags || [],
      type: classification.type || '未分类',
      keywords: classification.keywords || []
    };
  } catch (error) {
    console.error('从内容生成AI摘要失败:', error);
    throw error;
  }
}

// 仅生成AI摘要（不保存）
async function generateAISummaryOnly(tab, pageInfo) {
  try {
    console.log('开始生成AI摘要，tab:', tab?.title, 'pageInfo:', !!pageInfo);

    // 如果没有页面信息，先提取
    if (!pageInfo) {
      console.log('提取页面详细信息...');
      const [result] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        function: extractPageDetails
      });
      pageInfo = result.result;
      console.log('页面信息提取结果:', pageInfo);
    }

    if (!pageInfo) {
      throw new Error('无法提取页面基本信息，请确保页面已完全加载');
    }

    // 提取文章内容
    console.log('提取文章内容...');
    const [contentResult] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: extractArticleContent
    });

    console.log('文章内容提取结果长度:', contentResult?.result?.length);

    if (!contentResult.result || contentResult.result.length < 50) {
      throw new Error('页面内容太少或无法提取有效内容，请尝试手动输入摘要');
    }

    const settings = await chrome.storage.sync.get([
      'aiApiKey', 'aiProvider', 'aiBaseUrl', 'aiModel', 'aiCustomModel', 'aiTemperature',
      'aiMaxTokens', 'aiTopP', 'aiTimeout', 'aiSystemPrompt', 'summaryLength'
    ]);

    console.log('AI配置:', {
      hasApiKey: !!settings.aiApiKey,
      provider: settings.aiProvider,
      baseUrl: settings.aiBaseUrl,
      model: settings.aiModel
    });

    if (!settings.aiApiKey) {
      throw new Error('请先在设置中配置AI API密钥');
    }

    const baseUrl = settings.aiBaseUrl || 'https://api.openai.com/v1';
    const model = await getActualModelName(settings);
    const temperature = settings.aiTemperature || 0.7;
    const maxTokens = settings.aiMaxTokens || 1000;
    const topP = settings.aiTopP || 1.0;
    const timeout = (settings.aiTimeout || 30) * 1000;

    // 智能分类以优化提示词
    const classification = await classifyContent(pageInfo, tab.url);

    let systemPrompt = settings.aiSystemPrompt || '你是一个专业的文章总结助手。请用中文总结文章的核心要点，包括：1）主要观点；2）关键信息；3）实用建议。保持简洁明了，突出价值。';

    if (classification.type === 'tech') {
      systemPrompt += '这是一篇技术文章，请重点关注技术要点、实现方法和最佳实践。';
    } else if (classification.type === 'education') {
      systemPrompt += '这是一篇学习资料，请重点提取知识点、学习方法和要点总结。';
    } else if (classification.type === 'news') {
      systemPrompt += '这是一篇新闻资讯，请重点关注事件要点、影响分析和发展趋势。';
    }

    // 根据总结长度调整maxTokens
    const lengthSettings = {
      short: Math.min(maxTokens, 300),
      medium: Math.min(maxTokens, 600),
      long: Math.min(maxTokens, 1000),
      adaptive: maxTokens
    };
    const adjustedMaxTokens = lengthSettings[settings.summaryLength] || maxTokens;

    const endpoint = baseUrl.endsWith('/') ? baseUrl + 'chat/completions' : baseUrl + '/chat/completions';

    console.log('AI请求配置:', {
      endpoint: endpoint,
      model: model,
      maxTokens: adjustedMaxTokens,
      contentLength: contentResult.result.length
    });

    // 创建带超时的fetch请求
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const requestBody = {
        model: model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `请总结以下文章：\n\n标题：${tab.title}\n\n内容：${contentResult.result}` }
        ],
        max_tokens: adjustedMaxTokens,
        temperature: temperature,
        top_p: topP
      };

      console.log('发送AI请求...');
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${settings.aiApiKey}`
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      console.log('AI响应状态:', response.status);

      if (!response.ok) {
        const error = await response.text();
        console.error('AI服务错误响应:', error);

        if (response.status === 401) {
          throw new Error('AI API密钥无效，请检查配置');
        } else if (response.status === 429) {
          throw new Error('AI服务请求过于频繁，请稍后重试');
        } else if (response.status >= 500) {
          throw new Error('AI服务暂时不可用，请稍后重试');
        } else {
          throw new Error(`AI服务调用失败: ${response.status} - ${error}`);
        }
      }

      const data = await response.json();
      console.log('AI响应数据:', data);

      if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        throw new Error('AI服务返回数据格式异常');
      }

      const summary = data.choices[0].message.content;
      console.log('AI摘要生成成功，长度:', summary?.length);
      return summary;

    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error('AI请求超时，请检查网络连接或增加超时时间');
      }
      throw error;
    }
  } catch (error) {
    console.error('AI摘要生成失败:', error);
    throw error;
  }
}

// 生成选中文本AI总结
async function generateSelectedTextSummary(selectedText, tab, pageInfo) {
  try {
    console.log('开始生成选中文本AI总结，文本长度:', selectedText?.length);

    if (!selectedText || selectedText.trim().length < 10) {
      throw new Error('选中文本太短，无法生成有效总结');
    }

    const settings = await chrome.storage.sync.get([
      'aiApiKey', 'aiProvider', 'aiBaseUrl', 'aiModel', 'aiCustomModel', 'aiTemperature',
      'aiMaxTokens', 'aiTopP', 'aiTimeout', 'aiSystemPrompt', 'summaryLength'
    ]);

    console.log('AI配置:', {
      hasApiKey: !!settings.aiApiKey,
      provider: settings.aiProvider,
      baseUrl: settings.aiBaseUrl,
      model: settings.aiModel
    });

    if (!settings.aiApiKey) {
      throw new Error('请先在设置中配置AI API密钥');
    }

    const baseUrl = settings.aiBaseUrl || 'https://api.openai.com/v1';
    const model = await getActualModelName(settings);
    const temperature = settings.aiTemperature || 0.7;
    const maxTokens = settings.aiMaxTokens || 1000;
    const topP = settings.aiTopP || 1.0;
    const timeout = (settings.aiTimeout || 30) * 1000;

    // 针对选中文本优化的系统提示词
    let systemPrompt = '你是一个专业的文本总结助手。请用中文总结用户选中的文本内容，包括：1）核心观点；2）关键信息；3）重要细节。保持简洁明了，突出重点。';

    // 根据文本长度调整总结策略
    if (selectedText.length < 200) {
      systemPrompt += '这是一段较短的文本，请提供精炼的要点总结。';
    } else if (selectedText.length > 1000) {
      systemPrompt += '这是一段较长的文本，请分层次总结主要内容和关键信息。';
    }

    // 根据总结长度调整maxTokens
    const lengthSettings = {
      short: Math.min(maxTokens, 200),
      medium: Math.min(maxTokens, 400),
      long: Math.min(maxTokens, 600),
      adaptive: Math.min(maxTokens, Math.max(200, selectedText.length / 4))
    };
    const adjustedMaxTokens = lengthSettings[settings.summaryLength] || lengthSettings.adaptive;

    const endpoint = baseUrl.endsWith('/') ? baseUrl + 'chat/completions' : baseUrl + '/chat/completions';

    console.log('选中文本AI请求配置:', {
      endpoint: endpoint,
      model: model,
      maxTokens: adjustedMaxTokens,
      selectedTextLength: selectedText.length
    });

    // 创建带超时的fetch请求
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const requestBody = {
        model: model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `请总结以下选中的文本内容：\n\n${selectedText}` }
        ],
        max_tokens: adjustedMaxTokens,
        temperature: temperature,
        top_p: topP
      };

      console.log('发送选中文本AI请求...');
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${settings.aiApiKey}`
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      console.log('选中文本AI响应状态:', response.status);

      if (!response.ok) {
        const error = await response.text();
        console.error('选中文本AI服务错误响应:', error);

        if (response.status === 401) {
          throw new Error('AI API密钥无效，请检查配置');
        } else if (response.status === 429) {
          throw new Error('AI服务请求过于频繁，请稍后重试');
        } else if (response.status >= 500) {
          throw new Error('AI服务暂时不可用，请稍后重试');
        } else {
          throw new Error(`AI服务调用失败: ${response.status} - ${error}`);
        }
      }

      const data = await response.json();
      console.log('选中文本AI响应数据:', data);

      if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        throw new Error('AI服务返回数据格式异常');
      }

      const summary = data.choices[0].message.content;
      console.log('选中文本AI总结生成成功，长度:', summary?.length);

      // 为选中文本生成简单的标签
      const classification = await classifyContent(selectedText, tab?.url || '');

      return {
        summary: summary,
        tags: classification.tags || ['#选中文本', '#AI总结'],
        type: classification.type || '文本摘录',
        keywords: classification.keywords || []
      };

    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error('AI请求超时，请检查网络连接或增加超时时间');
      }
      throw error;
    }
  } catch (error) {
    console.error('选中文本AI总结生成失败:', error);
    throw error;
  }
}

// 格式化sidepanel数据为Blinko格式
async function formatSidePanelDataForBlinko(data) {
  console.log('格式化sidepanel数据:', data);

  let content = '';

  // 添加标题和链接
  if (data.title) {
    content += `📌 **${data.title}**\n\n`;
  }

  // 添加选中内容
  if (data.selectedText) {
    content += `✂️ **选中内容：**\n"${data.selectedText}"\n\n`;
  }

  // 添加选中内容的AI总结
  if (data.selectedSummary) {
    content += `🤖 **选中内容AI总结：**\n${data.selectedSummary}\n\n`;
  }

  // 添加原文摘要
  if (data.summary) {
    content += `📄 **原文摘要：**\n${data.summary}\n\n`;
  }

  // 添加个人想法
  if (data.thoughts) {
    content += `💭 **个人想法：**\n${data.thoughts}\n\n`;
  }

  // 添加标签
  if (data.tags && data.tags.length > 0) {
    content += `🏷️ **标签：** ${data.tags.map(tag => '#' + tag).join(' ')}\n\n`;
  }

  // 添加链接和时间
  if (data.url) {
    content += `🔗 **链接：** ${data.url}\n`;
  }
  content += `📅 **收集时间：** ${new Date().toLocaleString()}\n\n`;

  // 添加默认标签
  content += '#网页收集 #侧边栏收集';
  if (data.tags && data.tags.length > 0) {
    content += ' ' + data.tags.map(tag => '#' + tag).join(' ');
  }

  console.log('格式化后的内容长度:', content.length);
  return content;
}

// 打开Side Panel
async function openSidePanel(tab) {
  try {
    await chrome.sidePanel.open({ tabId: tab.id });
    console.log('Side Panel已打开');
  } catch (error) {
    console.error('打开Side Panel失败:', error);
  }
}

// 切换Side Panel显示
async function toggleSidePanel(tab) {
  try {
    // Chrome Side Panel API没有直接的toggle方法
    // 我们通过检查当前状态来决定操作
    await chrome.sidePanel.open({ tabId: tab.id });
    console.log('Side Panel已打开');
  } catch (error) {
    console.error('切换Side Panel失败:', error);
  }
}

// 测试Blinko连接
async function testBlinkoConnection() {
  const settings = await chrome.storage.sync.get(['blinkoUrl', 'blinkoToken']);

  if (!settings.blinkoUrl || !settings.blinkoToken) {
    throw new Error('请先配置Blinko API地址和Token');
  }

  console.log('测试Blinko连接，URL:', settings.blinkoUrl);

  // 发送测试内容
  const testContent = `🧪 **Blinko连接测试**\n\n这是一条测试消息，用于验证Blinko API连接是否正常。\n\n📅 **测试时间：** ${new Date().toLocaleString()}\n\n#连接测试`;

  const response = await fetch(settings.blinkoUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${settings.blinkoToken}`
    },
    body: JSON.stringify({
      content: testContent,
      type: 0
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Blinko API调用失败: ${response.status} - ${errorText}`);
  }

  console.log('Blinko连接测试成功');
  return { status: response.status, message: 'Blinko连接正常' };
}

// 测试AI连接
async function testAIConnection() {
  const settings = await chrome.storage.sync.get([
    'aiApiKey', 'aiProvider', 'aiBaseUrl', 'aiModel', 'aiCustomModel'
  ]);

  if (!settings.aiApiKey) {
    throw new Error('请先配置AI API密钥');
  }

  const baseUrl = settings.aiBaseUrl || 'https://api.openai.com/v1';
  const model = await getActualModelName(settings);

  console.log('测试AI连接，URL:', baseUrl, 'Model:', model);

  const endpoint = baseUrl.endsWith('/') ? baseUrl + 'chat/completions' : baseUrl + '/chat/completions';

  // 发送简单的测试请求
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${settings.aiApiKey}`
    },
    body: JSON.stringify({
      model: model,
      messages: [
        { role: 'user', content: '请回复"连接测试成功"' }
      ],
      max_tokens: 50,
      temperature: 0.1
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    if (response.status === 401) {
      throw new Error('AI API密钥无效，请检查配置');
    } else if (response.status === 429) {
      throw new Error('AI服务请求过于频繁，请稍后重试');
    } else if (response.status >= 500) {
      throw new Error('AI服务暂时不可用，请稍后重试');
    } else {
      throw new Error(`AI API调用失败: ${response.status} - ${errorText}`);
    }
  }

  const data = await response.json();

  if (!data.choices || !data.choices[0] || !data.choices[0].message) {
    throw new Error('AI服务返回数据格式异常');
  }

  const testResult = data.choices[0].message.content;
  console.log('AI连接测试成功，响应:', testResult);

  return {
    status: response.status,
    message: 'AI连接正常',
    model: model,
    testResponse: testResult
  };
}

// 显示通知
function showNotification(message) {
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icon48.png',
    title: '善思 Blinko智能收集器',
    message: message
  });
}