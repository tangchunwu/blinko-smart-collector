// 页面内容脚本 - 处理页面级交互和信息收集 (Side Panel版本)
(async function () {
  'use strict';

  // 动态导入 ContentExtractor
  const src = chrome.runtime.getURL('js/utils/content-extractor.js');
  const { ContentExtractor } = await import(src);

  // 监听来自background和sidepanel的消息
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    // 异步处理消息，返回 true 保持通道开放
    (async () => {
      try {
        switch (request.action) {
          case 'getPageInfo':
            const metadata = ContentExtractor.extractMetadata();
            sendResponse(metadata);
            break;

          case 'getFullPageText':
            // 获取完整页面文本，用于回退
            sendResponse({
              content: document.body.innerText || '',
              title: document.title,
              url: window.location.href
            });
            break;

          case 'getSelectedText':
            sendResponse({ text: window.getSelection().toString() });
            break;

          case 'showPageNotification':
            showPageNotification(request.message, request.type);
            sendResponse({ success: true });
            break;

          case 'highlightCollectedText':
            highlightCollectedText();
            sendResponse({ success: true });
            break;

          case 'getPageContent':
            try {
              const fullInfo = ContentExtractor.extractAll();
              console.log('ContentExtractor 提取完成:', {
                title: fullInfo.title,
                contentLength: fullInfo.content?.length,
                keywords: fullInfo.extractedKeywords?.length
              });

              sendResponse({
                content: fullInfo.content,
                title: fullInfo.title,
                url: fullInfo.url,
                excerpt: fullInfo.excerpt,
                isReadability: fullInfo.isReadability || true,
                description: fullInfo.description,
                keywords: fullInfo.keywords,
                author: fullInfo.author,
                wordCount: fullInfo.wordCount,
                extractedKeywords: fullInfo.extractedKeywords
              });
            } catch (error) {
              console.error('ContentExtractor 提取失败:', error);
              // 回退到简单提取
              sendResponse({
                content: document.body.innerText || '',
                title: document.title,
                url: window.location.href,
                isReadability: false,
                error: error.message
              });
            }
            break;
        }
      } catch (error) {
        console.error('消息处理错误:', error);
        // 如果还没有发送响应，发送错误
        try {
          sendResponse({ error: error.message });
        } catch (e) { /* ignore */ }
      }
    })();
    return true; // 保持异步响应通道
  });

  // 在页面上显示临时通知
  function showPageNotification(message, type = 'success') {
    // 移除现有通知
    const existingNotification = document.querySelector('.blinko-page-notification');
    if (existingNotification) {
      existingNotification.remove();
    }

    // 创建通知元素
    const notification = document.createElement('div');
    notification.className = 'blinko-page-notification';
    notification.textContent = message;

    // 样式
    const styles = {
      position: 'fixed',
      top: '20px',
      right: '20px',
      background: type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : '#17a2b8',
      color: 'white',
      padding: '12px 20px',
      borderRadius: '8px',
      fontSize: '14px',
      fontWeight: '500',
      zIndex: '999999',
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      animation: 'slideInRight 0.3s ease-out',
      maxWidth: '300px',
      wordWrap: 'break-word'
    };

    Object.assign(notification.style, styles);

    // 添加动画样式
    if (!document.querySelector('#blinko-notification-styles')) {
      const style = document.createElement('style');
      style.id = 'blinko-notification-styles';
      style.textContent = `
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOutRight {
          from { transform: translateX(0); opacity: 1; }
          to { transform: translateX(100%); opacity: 0; }
        }
      `;
      document.head.appendChild(style);
    }

    // 添加到页面
    document.body.appendChild(notification);

    // 3秒后移除
    setTimeout(() => {
      if (notification.parentNode) {
        notification.style.animation = 'slideOutRight 0.3s ease-in';
        setTimeout(() => {
          if (notification.parentNode) {
            notification.remove();
          }
        }, 300);
      }
    }, 3000);
  }

  // 高亮收集的文本
  function highlightCollectedText() {
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const span = document.createElement('span');
      span.style.backgroundColor = '#fff3cd';
      span.style.border = '1px solid #ffeaa7';
      span.style.borderRadius = '3px';
      span.style.padding = '1px 2px';
      span.style.animation = 'blinko-highlight-flash 2s ease-out';

      try {
        range.surroundContents(span);

        // 添加闪烁动画
        if (!document.querySelector('#blinko-highlight-styles')) {
          const style = document.createElement('style');
          style.id = 'blinko-highlight-styles';
          style.textContent = `
            @keyframes blinko-highlight-flash {
              0% { background-color: #28a745; }
              50% { background-color: #fff3cd; }
              100% { background-color: #fff3cd; }
            }
          `;
          document.head.appendChild(style);
        }

        // 2秒后移除高亮
        setTimeout(() => {
          if (span.parentNode) {
            const parent = span.parentNode;
            parent.insertBefore(document.createTextNode(span.textContent), span);
            parent.removeChild(span);
          }
        }, 2000);
      } catch (error) {
        console.log('高亮文本失败:', error);
      }
    }
  }

  // 页面加载完成后的初始化
  function initializePage() {
    // 检测页面类型，为智能分类做准备
    const pageType = ContentExtractor.detectPageType();
    if (pageType) {
      // 向background发送页面类型信息
      chrome.runtime.sendMessage({
        action: 'updatePageType',
        pageType: pageType
      });
    }
  }

  // 页面加载完成后初始化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializePage);
  } else {
    initializePage();
  }

  // 监听选中文本变化（增强版）
  let lastSelectedText = '';
  let selectionTimeout = null;

  function handleSelectionChange() {
    // 防抖处理，避免频繁触发
    if (selectionTimeout) {
      clearTimeout(selectionTimeout);
    }

    selectionTimeout = setTimeout(() => {
      const selectedText = window.getSelection().toString().trim();

      // 只有当选中文本发生变化时才发送消息
      if (selectedText !== lastSelectedText) {
        lastSelectedText = selectedText;

        // 通知side panel有新的选中文本
        try {
          chrome.runtime.sendMessage({
            action: 'selectedTextChanged',
            text: selectedText,
            timestamp: Date.now()
          });
        } catch (error) {
          if (error.message && error.message.includes('Extension context invalidated')) {
            console.log('扩展上下文失效，等待重新加载...');
            return;
          }
          // 忽略其他错误
        }
      }
    }, 300); // 300ms防抖延迟
  }

  // 绑定选中文本变化事件
  document.addEventListener('selectionchange', handleSelectionChange);

  // 也监听鼠标释放事件，确保选中文本被检测到
  document.addEventListener('mouseup', () => {
    setTimeout(handleSelectionChange, 100);
  });

  console.log('Blinko Content Script (Side Panel版本) 已加载');
})();
