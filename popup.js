document.addEventListener('DOMContentLoaded', async () => {
  // 获取当前页面信息
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  document.getElementById('pageTitle').textContent = tab.title;
  document.getElementById('pageUrl').textContent = tab.url;

  // 保存当前页面
  document.getElementById('savePageBtn').addEventListener('click', async () => {
    try {
      showStatus('📌 正在保存页面...', 'info');
      await chrome.runtime.sendMessage({
        action: 'saveCurrentPage',
        tab: tab
      });
      showStatus('✅ 页面已保存到Blinko', 'success');
    } catch (error) {
      showStatus('❌ 保存失败：' + error.message, 'error');
    }
  });

  // AI总结文章
  document.getElementById('aiSummaryBtn').addEventListener('click', async () => {
    try {
      showStatus('🤖 正在分析文章内容...', 'info');
      await chrome.runtime.sendMessage({
        action: 'aiSummaryArticle',
        tab: tab
      });
      showStatus('🧠 正在生成AI总结...', 'info');
    } catch (error) {
      showStatus('❌ 总结失败：' + error.message, 'error');
    }
  });

  // 智能分析收集
  document.getElementById('smartAnalyzeBtn').addEventListener('click', async () => {
    try {
      showStatus('🧠 正在智能分析...', 'info');
      await chrome.runtime.sendMessage({
        action: 'smartAnalyzeAndCollect',
        tab: tab
      });
    } catch (error) {
      showStatus('❌ 分析失败：' + error.message, 'error');
    }
  });

  // 打开配置页面
  document.getElementById('configBtn').addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });

  // 监听来自background的消息
  chrome.runtime.onMessage.addListener((message) => {
    if (message.action === 'updatePopupStatus') {
      showStatus(message.message, message.type);
    }
  });

  // 检查配置状态
  checkConfigurationStatus();
});

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