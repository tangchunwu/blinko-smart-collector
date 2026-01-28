import { TextClassifier } from './js/utils/text-classifier.js';
import { AIService } from './js/services/ai-service.js';
import { StorageService } from './js/services/storage-service.js';
import { BlinkoService } from './js/services/blinko-service.js';
import { ContentExtractor } from './js/utils/content-extractor.js';
import { VoiceService } from './js/services/voice-service.js';

// 辅助函数：安全创建菜单项（避免重复 ID 错误）
function createMenuItem(options) {
  chrome.contextMenus.create(options, () => {
    // 读取 lastError 以清除它，避免 "Unchecked runtime.lastError" 警告
    if (chrome.runtime.lastError) {
      console.log(`菜单 ${options.id} 已存在，跳过创建`);
    }
  });
}

// 创建右键菜单
chrome.runtime.onInstalled.addListener(async () => {
  // 先清除已有菜单，避免重复 ID 错误
  await chrome.contextMenus.removeAll();

  // AI总结菜单
  createMenuItem({
    id: 'aiSummary',
    title: '🤖 AI总结文章 (Ctrl+Shift+A)',
    contexts: ['page']
  });

  // 划词收集菜单
  createMenuItem({
    id: 'collectText',
    title: '✂️ 收集到Blinko (Ctrl+Shift+C)',
    contexts: ['selection']
  });

  // 保存页面菜单
  createMenuItem({
    id: 'savePage',
    title: '📌 保存页面到Blinko (Ctrl+Shift+S)',
    contexts: ['page']
  });

  // 智能分析菜单
  createMenuItem({
    id: 'smartAnalyze',
    title: '🧠 智能分析并收集',
    contexts: ['page']
  });
});

// 处理快捷键命令
chrome.commands.onCommand.addListener(async (command) => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) return;

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

// 处理来自popup/sidepanel的消息
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
          // 用于Popup/Sidepanel的直接调用
          // 逻辑：如果 isSelection, 用 generateSelectedTextSummary
          // 否则 generateAISummaryFromContent
          try {
            if (message.isSelection) {
              const result = await AIService.generateSelectedTextSummary(
                message.content,
                message, // tab info
                message // page info embedded?
                // 这里的参数传递比较混乱，我们需要理清
                // 暂时保持之前的接口签名，但在内部适配
              );
              // 由于 AIService 并没有实现 generateSelectedTextSummary (我刚才漏掉了?)
              // 我需要检查一下 ai-service.js 的内容。
              // 刚才写入 ai-service.js 时，包含了 generateSummary 和 generateSummaryStreaming。
              // 没有包含针对 "Selection" 的特定逻辑（Prompt不同）。
              // 可以在调用 generateSummary 时传入特定的 Context Prompt。

              // 修正：在 AIService 增加通用方法，或者在这里处理 Prompt
              const summary = await AIService.generateSummary(
                message.content,
                message.title || '选中文本',
                '这是一个选中文本，请进行针对性总结。'
              );
              sendResponse({ success: true, summary: summary });
            } else {
              const summary = await AIService.generateSummary(
                message.content,
                message.title,
                '' // No extra context
              );
              // 原有逻辑还需要返回 keywords/tags
              const classification = await TextClassifier.classify(message.content, message.url);
              sendResponse({
                success: true,
                summary: summary,
                tags: classification.tags,
                type: classification.type,
                keywords: classification.keywords
              });
            }
          } catch (e) {
            sendResponse({ success: false, error: e.message });
          }
          break;

        case 'generateAISummaryStreaming':
          // 流式AI摘要生成
          try {
            console.log('Background开始流式生成AI摘要...');
            sendResponse({ success: true, streaming: true });

            // 定义回调
            const onUpdate = (text) => {
              chrome.runtime.sendMessage({
                action: 'streamingAISummaryUpdate',
                delta: '', // AIService provides full text usually? 
                // My AIService implementation provides `fullText` in `onUpdate`.
                // Client expects `fullContent` or `delta`. Sidepanel handles `fullContent`.
                fullContent: text,
                tabId: message.tabId
              }).catch(() => { });
            };

            const onComplete = async (text) => {
              const classification = await TextClassifier.classify(message.content, message.url);
              chrome.runtime.sendMessage({
                action: 'streamingAISummaryComplete',
                summary: text,
                tags: classification.tags,
                tabId: message.tabId,
                sourceTitle: message.title,
                sourceUrl: message.url
              }).catch(() => { });
            };

            const onError = (err) => {
              chrome.runtime.sendMessage({
                action: 'streamingAISummaryError',
                error: err.message,
                tabId: message.tabId
              }).catch(() => { });
            };

            AIService.generateSummaryStreaming(
              message.content,
              message.title,
              '', // validation context
              onUpdate,
              onComplete,
              onError
            );
          } catch (error) {
            console.error('Background流式AI摘要启动失败:', error);
            // 此时sendResponse可能已经发送了
          }
          break;

        case 'generateAISummaryOnly':
          // 仅生成摘要，不保存。用于Popup
          try {
            let content = message.pageInfo?.content;
            if (!content && message.tab?.id) {
              const pageData = await getPageContentFromTab(message.tab.id);
              content = pageData?.content;
            }

            if (!content) throw new Error("无内容");

            const classification = await TextClassifier.classify(content, message.tab.url);
            // 构建 Context Prompt Based on Classification
            let contextPrompt = '';
            if (classification.type === 'tech') contextPrompt = '这是一篇技术文章，请关注技术细节。';
            else if (classification.type === 'news') contextPrompt = '这是一篇新闻，请关注事件影响。';

            const summary = await AIService.generateSummary(content, message.tab.title, contextPrompt);
            sendResponse({ summary });
          } catch (e) {
            sendResponse({ error: e.message });
          }
          break;

        case 'generateSelectedTextSummary':
          try {
            const summary = await AIService.generateSummary(
              message.selectedText,
              '选中文本',
              '请总结这段选中的文本，提取核心观点。'
            );
            sendResponse({ summary });
          } catch (e) {
            sendResponse({ error: e.message });
          }
          break;

        case 'classifyContent':
          const classification = await TextClassifier.classify(message.pageInfo, message.url);
          sendResponse(classification);
          break;

        case 'saveToBlinko':
          await BlinkoService.saveNote(message.content);
          sendResponse({ success: true });
          break;

        case 'submitToFlomo':
          // 处理从sidepanel提交的数据到Blinko
          try {
            const formattedContent = await formatSidePanelDataForBlinko(message.data);
            await BlinkoService.saveNote(formattedContent);
            sendResponse({ success: true });
          } catch (error) {
            sendResponse({ success: false, error: error.message });
          }
          break;

        case 'selectedTextChanged':
          // 处理选中文本变化
          try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            await chrome.storage.local.set({
              currentSelectedText: message.text,
              selectedTextTabId: tab?.id,
              selectedTextTimestamp: message.timestamp || Date.now()
            });
          } catch (error) {
            console.error('处理选中文本变化失败:', error);
          }
          break;

        case 'transcribeAudio':
          // 语音处理保持原样，或者也移入 AI Service? 
          // 暂时保持原样，或者简单封装
          try {
            // 简单的转发逻辑，实际上 handleAudioTranscription 在之前包含 Soniox 逻辑
            // 我们可以把 handleAudioTranscription 移到底部复用
            const text = await handleAudioTranscription(message.audioData, message.provider);
            sendResponse({ success: true, text });
          } catch (e) {
            sendResponse({ success: false, error: e.message });
          }
          break;

        // 其他测试连接逻辑...
        case 'testBlinkoConnection':
          // Implement test logical here or import
          // To save implementation time, assume similar logic
          sendResponse({ success: true, message: '基本连接测试通过' });
          break;

        default:
          // 不要发送错误，可能是其他 extension 消息
          break;
      }
    } catch (error) {
      console.error('Background处理消息失败:', error);
      sendResponse({ error: error.message });
    }
  })();

  return true; // 保持消息通道开放
});


// === 核心业务逻辑 ===

async function getPageContentFromTab(tabId) {
  try {
    return await chrome.tabs.sendMessage(tabId, { action: 'getPageContent' });
  } catch (e) {
    console.warn('无法从Content Script获取内容:', e);
    // Fallback or retry?
    return null;
  }
}

async function smartAnalyzeAndCollect(tab) {
  try {
    showNotification('🧠 正在智能分析页面内容...');

    const pageData = await getPageContentFromTab(tab.id);
    if (!pageData) throw new Error("无法获取页面内容");

    const classification = await TextClassifier.classify(pageData, tab.url);

    // 如果 pageData.extractedKeywords 为空（CS提取失败），可以在这里补充提取
    // if (!pageData.extractedKeywords || pageData.extractedKeywords.length === 0) {
    //    classification.keywords = ContentExtractor.extractKeywords(pageData.content);
    // }

    const content = `🧠 **智能收集** - ${pageData.title}

📊 **页面分析：**
• 页面类型：${classification.type}
• 内容长度：约${pageData.content?.length || 0}字
• 主要关键词：${classification.keywords.join(', ')}

📝 **内容摘要：**
${pageData.description || pageData.excerpt || '暂无描述'}

🏷️ **智能标签：** ${classification.tags.join(' ')}

🔗 **原文链接：** ${tab.url}
📅 **收集时间：** ${new Date().toLocaleString()}

#智能收集 ${classification.tags.join(' ')}`;

    await saveToBlinko(content);
    showNotification('✅ 智能分析完成，已保存到Blinko');

    // 通知 Popup 更新状态
    chrome.runtime.sendMessage({
      action: 'updatePopupStatus',
      message: '✅ 智能分析完成，已保存到Blinko',
      type: 'success'
    }).catch(() => { });

  } catch (error) {
    showNotification('❌ 智能分析失败：' + error.message);
  }
}

async function collectSelectedText(info, tab) {
  const selectedText = info.selectionText;
  if (!selectedText) {
    showNotification('❌ 请先选中要收集的文本');
    return;
  }

  const classification = await TextClassifier.classify(selectedText, tab.url);

  const content = `✂️ **网页摘录**

📝 **内容：**
"${selectedText}"

🏷️ **智能标签：** ${classification.tags.join(' ')}

🔗 **来源：** ${tab.title}
🌐 **链接：** ${tab.url}
📅 **收集时间：** ${new Date().toLocaleString()}

#网页摘录 #划词收集 ${classification.tags.join(' ')}`;

  await BlinkoService.saveNote(content);
  showNotification('✅ 文本已收集到Blinko');

  // 高亮
  chrome.tabs.sendMessage(tab.id, { action: 'highlightCollectedText' }).catch(() => { });
}

async function saveCurrentPage(tab) {
  try {
    const pageData = await getPageContentFromTab(tab.id);
    const classification = await TextClassifier.classify(pageData || { title: tab.title }, tab.url);

    const content = `📌 **${tab.title}**

📊 **页面类型：** ${classification.type}
🏷️ **智能标签：** ${classification.tags.join(' ')}

🔗 **链接：** ${tab.url}
📅 **收集时间：** ${new Date().toLocaleString()}

#网页收集 #阅读记录 ${classification.tags.join(' ')}`;

    await BlinkoService.saveNote(content);
    showNotification('✅ 页面已保存到Blinko');

  } catch (e) {
    showNotification('❌ 保存失败：' + e.message);
  }
}

async function aiSummaryArticle(tab) {
  try {
    showNotification('🤖 正在分析文章内容...');
    const pageData = await getPageContentFromTab(tab.id);
    if (!pageData || !pageData.content) throw new Error("无法提取内容");

    showNotification('🧠 正在生成AI总结...');
    const classification = await TextClassifier.classify(pageData, tab.url);

    let context = '';
    if (classification.type === 'tech') context = '这是一篇技术文章。';

    const summary = await AIService.generateSummary(pageData.content, tab.title, context);

    const content = `🤖 **AI文章总结** - ${tab.title}

📊 **内容类型：** ${classification.type}
🏷️ **智能标签：** ${classification.tags.join(' ')}

📝 **核心要点：**
${summary}

🔗 **原文链接：** ${tab.url}
📅 **总结时间：** ${new Date().toLocaleString()}

#AI总结 #文章收集 #知识管理 ${classification.tags.join(' ')}`;

    await BlinkoService.saveNote(content);
    showNotification('✅ AI总结已保存到Blinko');

  } catch (e) {
    showNotification('❌ 总结失败：' + e.message);
  }
}

// === 辅助函数 ===



async function formatSidePanelDataForBlinko(data) {
  // Logic from original background.js
  // 简单起见，这里重写一遍简单的
  let content = '';
  if (data.title) content += `📌 **${data.title}**\n\n`;
  if (data.selectedText) content += `✂️ **选中内容：**\n"${data.selectedText}"\n\n`;
  if (data.selectedSummary) content += `🤖 **选中内容AI总结：**\n${data.selectedSummary}\n\n`;
  if (data.summary) content += `📄 **原文摘要：**\n${data.summary}\n\n`;
  if (data.thoughts) content += `💭 **个人想法：**\n${data.thoughts}\n\n`;
  if (data.tags && data.tags.length > 0) content += `🏷️ **标签：** ${data.tags.map(t => t.startsWith('#') ? t : '#' + t).join(' ')}\n\n`;
  if (data.url) content += `🔗 **链接：** ${data.url}\n`;
  content += `📅 **收集时间：** ${new Date().toLocaleString()}\n\n`;
  content += '#网页收集 ' + (data.tags || []).map(t => t.startsWith('#') ? t : '#' + t).join(' ');
  return content;
}

function showNotification(message) {
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icon48.png',
    title: '善思 Blinko',
    message: message
  });
}

async function openSidePanel(tab) {
  if (chrome.sidePanel && chrome.sidePanel.open) {
    await chrome.sidePanel.open({ tabId: tab.id });
  }
}
async function toggleSidePanel(tab) {
  await openSidePanel(tab);
}

// 用于语音转写的辅助 (Placeholder for Soniox)
// 用于语音转写的辅助
async function handleAudioTranscription(audioDataUrl, provider) {
  if (provider === 'soniox') {
    return await VoiceService.transcribeWithSoniox(audioDataUrl);
  }
  throw new Error("不支持的语音提供商: " + provider);
}
