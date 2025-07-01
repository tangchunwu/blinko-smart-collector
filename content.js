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
      case 'toggleSidebar':
      case 'toggleDrawer':
        toggleDrawer();
        break;
      case 'showDrawer':
        showDrawer();
        break;
      case 'hideDrawer':
        hideDrawer();
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

  // ==================== 抽屉式侧边栏功能 ====================

  // 全局变量
  let drawerInjected = false;
  let drawerVisible = false;

  // 清理已存在的抽屉
  function cleanupExistingDrawer() {
    const existingContainer = document.getElementById('blinko-drawer-container');
    const existingStyles = document.getElementById('blinko-drawer-styles');

    if (existingContainer) {
      existingContainer.remove();
    }
    if (existingStyles) {
      existingStyles.remove();
    }

    drawerInjected = false;
    drawerVisible = false;
  }

  // 页面加载时清理可能存在的抽屉
  cleanupExistingDrawer();

  // 注入抽屉
  async function injectDrawer() {
    if (drawerInjected) return;

    try {
      // 获取HTML内容（添加时间戳防止缓存）
      const timestamp = Date.now();
      const drawerUrl = chrome.runtime.getURL('sidebar.html') + '?v=' + timestamp;
      const response = await fetch(drawerUrl);
      const htmlContent = await response.text();

      // 获取CSS内容（添加时间戳防止缓存）
      const cssUrl = chrome.runtime.getURL('sidebar.css') + '?v=' + timestamp;
      const cssResponse = await fetch(cssUrl);
      const cssContent = await cssResponse.text();

      // 创建抽屉容器
      const drawerContainer = document.createElement('div');
      drawerContainer.id = 'blinko-drawer-container';

      // 计算实际可用高度
      const viewportHeight = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);

      // 设置容器基本属性（避免内联样式）
      drawerContainer.className = 'blinko-drawer-container';
      drawerContainer.setAttribute('data-height', viewportHeight);

      // 注入CSS样式
      const style = document.createElement('style');
      style.id = 'blinko-drawer-styles';
      style.textContent = cssContent;
      document.head.appendChild(style);

      // 解析HTML并注入内容
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlContent, 'text/html');
      const drawerContent = doc.body.innerHTML;
      drawerContainer.innerHTML = drawerContent;

      document.body.appendChild(drawerContainer);

      // 加载JavaScript功能（添加时间戳防止缓存）
      const jsUrl = chrome.runtime.getURL('sidebar.js') + '?v=' + Date.now();
      const script = document.createElement('script');
      script.src = jsUrl;
      script.onload = () => {
        console.log('Sidebar.js 加载成功');
      };
      script.onerror = (error) => {
        console.error('Sidebar.js 加载失败:', error);
      };
      document.head.appendChild(script);

      drawerInjected = true;
      console.log('Blinko抽屉已注入');
      console.log('视口高度:', viewportHeight);
      console.log('用户代理:', navigator.userAgent);

      // 调试容器样式
      setTimeout(() => {
        const container = document.getElementById('blinko-drawer-container');
        const drawer = document.getElementById('blinkoDrawer');
        if (container && drawer) {
          console.log('容器样式调试:', {
            containerRect: container.getBoundingClientRect(),
            drawerRect: drawer.getBoundingClientRect(),
            containerComputedStyle: {
              width: window.getComputedStyle(container).width,
              height: window.getComputedStyle(container).height,
              position: window.getComputedStyle(container).position,
              right: window.getComputedStyle(container).right
            },
            drawerComputedStyle: {
              width: window.getComputedStyle(drawer).width,
              height: window.getComputedStyle(drawer).height,
              display: window.getComputedStyle(drawer).display
            }
          });
        }
      }, 500);

      // 监听窗口大小变化
      const resizeHandler = () => {
        const newHeight = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);
        drawerContainer.style.height = `${newHeight}px`;
      };
      window.addEventListener('resize', resizeHandler);

      // 设置页面信息
      setTimeout(() => {
        sendPageInfoToDrawer();
      }, 100);

    } catch (error) {
      console.error('注入抽屉失败:', error);
    }
  }

  // 发送页面信息到抽屉
  function sendPageInfoToDrawer() {
    const container = document.getElementById('blinko-drawer-container');
    if (container) {
      const iframe = container.querySelector('iframe');
      if (iframe) {
        iframe.contentWindow.postMessage({
          action: 'updatePageInfo',
          pageInfo: {
            title: document.title,
            url: window.location.href
          }
        }, '*');
      } else {
        // 直接发送消息到抽屉窗口
        window.postMessage({
          action: 'updatePageInfo',
          pageInfo: {
            title: document.title,
            url: window.location.href
          }
        }, '*');
      }
    }
  }

  // 显示抽屉
  async function showDrawer() {
    if (!drawerInjected) {
      await injectDrawer();
    }

    const container = document.getElementById('blinko-drawer-container');
    if (container) {
      container.classList.add('open');
      drawerVisible = true;

      // 发送页面信息
      setTimeout(() => {
        sendPageInfoToDrawer();
      }, 100);
    }
  }

  // 隐藏抽屉
  function hideDrawer() {
    const container = document.getElementById('blinko-drawer-container');
    if (container) {
      container.classList.remove('open');
      drawerVisible = false;
    }
  }

  // 切换抽屉
  async function toggleDrawer() {
    if (!drawerVisible) {
      await showDrawer();
    } else {
      hideDrawer();
    }
  }

  // 监听快捷键
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && e.key === 'B') {
      e.preventDefault();
      toggleDrawer();
    }
  });

  // 监听来自抽屉的消息
  window.addEventListener('message', (event) => {
    if (event.data && event.data.action) {
      switch (event.data.action) {
        case 'closeDrawer':
          hideDrawer();
          break;
        case 'getPageInfo':
          sendPageInfoToDrawer();
          break;
        case 'submitToBlinko':
          handleSubmitToBlinko(event.data.data);
          break;
      }
    }
  });

  // 处理提交到Blinko
  async function handleSubmitToBlinko(data) {
    try {
      // 发送到background script
      const response = await chrome.runtime.sendMessage({
        action: 'saveToBlinko',
        data: data
      });

      // 发送结果回抽屉
      window.postMessage({
        action: 'submitResult',
        success: response.success,
        message: response.message
      }, '*');

    } catch (error) {
      console.error('提交失败:', error);
      window.postMessage({
        action: 'submitResult',
        success: false,
        message: '提交失败: ' + error.message
      }, '*');
    }
  }

  // 不自动注入抽屉，只在用户主动调用时注入

})();