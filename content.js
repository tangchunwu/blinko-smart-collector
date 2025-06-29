// 页面内容脚本 - 处理页面级交互和快捷键反馈
(function() {
  'use strict';
  
  // 监听来自background的消息
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    switch (request.action) {
      case 'getSelectedText':
        sendResponse({ text: window.getSelection().toString() });
        break;
      case 'showPageNotification':
        showPageNotification(request.message, request.type);
        break;
      case 'highlightCollectedText':
        highlightCollectedText();
        break;
    }
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
      background: type === 'success' ? '#d4edda' : type === 'error' ? '#f8d7da' : '#fff3cd',
      color: type === 'success' ? '#155724' : type === 'error' ? '#721c24' : '#856404',
      padding: '12px 20px',
      borderRadius: '8px',
      border: `1px solid ${type === 'success' ? '#c3e6cb' : type === 'error' ? '#f5c6cb' : '#ffeaa7'}`,
      fontSize: '14px',
      fontWeight: '500',
      zIndex: '10000',
      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
      maxWidth: '300px',
      wordWrap: 'break-word',
      animation: 'blinkoSlideIn 0.3s ease-out'
    };
    
    Object.assign(notification.style, styles);
    
    // 添加动画样式
    if (!document.querySelector('#blinko-notification-styles')) {
      const styleSheet = document.createElement('style');
      styleSheet.id = 'blinko-notification-styles';
      styleSheet.textContent = `
        @keyframes blinkoSlideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes blinkoSlideOut {
          from { transform: translateX(0); opacity: 1; }
          to { transform: translateX(100%); opacity: 0; }
        }
      `;
      document.head.appendChild(styleSheet);
    }
    
    document.body.appendChild(notification);
    
    // 3秒后自动消失
    setTimeout(() => {
      notification.style.animation = 'blinkoSlideOut 0.3s ease-in';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.remove();
        }
      }, 300);
    }, 3000);
    
    // 点击关闭
    notification.addEventListener('click', () => {
      notification.style.animation = 'blinkoSlideOut 0.3s ease-in';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.remove();
        }
      }, 300);
    });
  }
  
  // 高亮显示刚收集的文本
  function highlightCollectedText() {
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const span = document.createElement('span');
      span.className = 'blinko-collected-highlight';
      span.style.cssText = `
        background: linear-gradient(90deg, #ffeb3b, #ffc107);
        padding: 2px 4px;
        border-radius: 3px;
        animation: blinkoHighlight 2s ease-out;
      `;
      
      // 添加高亮动画
      if (!document.querySelector('#blinko-highlight-styles')) {
        const styleSheet = document.createElement('style');
        styleSheet.id = 'blinko-highlight-styles';
        styleSheet.textContent = `
          @keyframes blinkoHighlight {
            0% { background: #ffeb3b; transform: scale(1.05); }
            50% { background: #ffc107; }
            100% { background: transparent; transform: scale(1); }
          }
        `;
        document.head.appendChild(styleSheet);
      }
      
      try {
        range.surroundContents(span);
        
        // 2秒后移除高亮
        setTimeout(() => {
          const parent = span.parentNode;
          if (parent) {
            parent.replaceChild(document.createTextNode(span.textContent), span);
            parent.normalize();
          }
        }, 2000);
      } catch (e) {
        // 如果无法包围内容，则跳过高亮
      }
    }
  }
  
  // 监听键盘事件，用于快捷键反馈
  document.addEventListener('keydown', function(e) {
    // 检查是否是Blinko快捷键
    const isCtrlOrCmd = e.ctrlKey || e.metaKey;
    const isShift = e.shiftKey;
    
    if (isCtrlOrCmd && isShift) {
      switch (e.key.toLowerCase()) {
        case 's':
          e.preventDefault();
          showPageNotification('🚀 正在收集当前页面...', 'info');
          break;
        case 'a':
          e.preventDefault();
          showPageNotification('🤖 正在AI总结文章...', 'info');
          break;
        case 'c':
          e.preventDefault();
          const selectedText = window.getSelection().toString();
          if (selectedText) {
            showPageNotification('✂️ 正在收集选中文本...', 'info');
            highlightCollectedText();
          } else {
            showPageNotification('❌ 请先选中要收集的文本', 'error');
          }
          break;
      }
    }
  });
  
  // 监听选择变化，为快捷键收集做准备
  let lastSelection = '';
  document.addEventListener('selectionchange', function() {
    const currentSelection = window.getSelection().toString();
    if (currentSelection !== lastSelection) {
      lastSelection = currentSelection;
      // 可以在这里添加选择文本的预处理逻辑
    }
  });
  
  // 页面加载完成后的初始化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializePage);
  } else {
    initializePage();
  }
  
  function initializePage() {
    // 可以在这里添加页面初始化逻辑
    // 比如检测页面类型，为智能分类做准备
    const pageType = detectPageType();
    if (pageType) {
      // 向background发送页面类型信息
      chrome.runtime.sendMessage({
        action: 'updatePageType',
        pageType: pageType
      });
    }
  }
  
  // 检测页面类型
  function detectPageType() {
    const url = window.location.href;
    const title = document.title;
    const meta = document.querySelector('meta[name="description"]');
    const description = meta ? meta.content : '';
    
    // 基于URL和内容的简单页面类型检测
    if (url.includes('github.com')) return 'github';
    if (url.includes('stackoverflow.com')) return 'stackoverflow';
    if (url.includes('medium.com') || url.includes('dev.to')) return 'blog';
    if (document.querySelector('article')) return 'article';
    if (title.includes('documentation') || title.includes('docs')) return 'documentation';
    
    return null;
  }
  
})();