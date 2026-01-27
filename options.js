import { StorageService } from './js/services/storage-service.js';
import { BlinkoService } from './js/services/blinko-service.js';
import { DEFAULT_CONFIG, PROMPT_TEMPLATES, AI_MODELS } from './js/utils/constants.js';

// 配置页面的JavaScript逻辑
document.addEventListener('DOMContentLoaded', async () => {
  console.log('配置页面加载完成');

  // 加载当前配置
  await loadSettings();

  // 绑定所有事件监听器
  bindEventListeners();

  console.log('所有事件监听器已绑定');
});

// 绑定事件监听器
function bindEventListeners() {
  // 测试按钮
  document.getElementById('testBlinkoBtn').addEventListener('click', testBlinkoConnection);
  document.getElementById('testAIBtn').addEventListener('click', testAIConnection);
  document.getElementById('checkModelsBtn').addEventListener('click', checkAvailableModels);

  // 主要操作按钮
  document.getElementById('saveBtn').addEventListener('click', saveSettings);
  document.getElementById('exportBtn').addEventListener('click', exportSettings);
  document.getElementById('importBtn').addEventListener('click', importSettings);
  document.getElementById('importBtn').addEventListener('click', importSettings);
  document.getElementById('resetBtn').addEventListener('click', resetSettings);

  // 备用模型按钮
  document.getElementById('addToBackupsBtn').addEventListener('click', addCurrentToBackups);

  // 新增功能按钮
  document.getElementById('resetSelectedTextFeature').addEventListener('click', resetSelectedTextFeature);

  // AI服务商变更
  document.getElementById('aiProvider').addEventListener('change', updateAIProviderSettings);

  // 提示词模板变更
  document.getElementById('promptTemplate').addEventListener('change', updatePromptTemplate);

  // 滑块事件
  const confidenceSlider = document.getElementById('confidenceThreshold');
  const confidenceValue = document.getElementById('confidenceValue');
  confidenceSlider.addEventListener('input', function () {
    confidenceValue.textContent = this.value + '%';
  });

  const temperatureSlider = document.getElementById('aiTemperature');
  const temperatureValue = document.getElementById('temperatureValue');
  temperatureSlider.addEventListener('input', function () {
    temperatureValue.textContent = this.value;
  });

  const topPSlider = document.getElementById('aiTopP');
  const topPValue = document.getElementById('topPValue');
  topPSlider.addEventListener('input', function () {
    topPValue.textContent = this.value;
  });

  // 折叠区域事件
  document.getElementById('advancedToggle').addEventListener('click', function () {
    toggleCollapsible('advancedContent', this);
  });

  document.getElementById('promptToggle').addEventListener('click', function () {
    toggleCollapsible('promptContent', this);
  });

  // 语音输入提供商变更
  document.getElementById('voiceProvider').addEventListener('change', function () {
    const sonioxConfig = document.getElementById('sonioxConfig');
    sonioxConfig.style.display = this.value === 'soniox' ? 'block' : 'none';
  });

  console.log('事件监听器绑定完成');
}

// 默认配置 - 修正API地址为复数形式
// 默认配置 (imported from constants.js)

// 预定义的提示词模板
// 预定义的提示词模板 (imported from constants.js)

// AI服务商对应的模型选项 - 新增硅基流动
// AI服务商对应的模型选项 (imported from constants.js)

// 切换折叠内容
function toggleCollapsible(contentId, toggleElement) {
  console.log('切换折叠区域:', contentId);

  const content = document.getElementById(contentId);
  const icon = toggleElement.querySelector('.toggle-icon');

  if (!content || !icon) {
    console.error('找不到折叠元素:', contentId);
    return;
  }

  const isExpanded = content.classList.contains('expanded');

  if (isExpanded) {
    content.classList.remove('expanded');
    icon.textContent = '▼';
    icon.classList.remove('rotated');
    console.log('折叠区域已收起:', contentId);
  } else {
    content.classList.add('expanded');
    icon.textContent = '▲';
    icon.classList.add('rotated');
    console.log('折叠区域已展开:', contentId);
  }
}

// 加载设置
async function loadSettings() {
  console.log('开始加载设置');

  const settings = await StorageService.getSync([
    'blinkoUrl', 'blinkoToken', 'aiApiKey', 'aiProvider', 'aiBaseUrl', 'aiModel', 'aiCustomModel',
    'aiTemperature', 'aiMaxTokens', 'aiTopP', 'aiTimeout', 'aiStreamMode',
    'backupAiConfigs', // 新增：备用配置列表
    'aiSystemPrompt', 'promptTemplate', 'summaryLength',
    'enableSmartClassify', 'autoTags', 'domainTags', 'timeTags',
    'confidenceThreshold', 'showShortcutsInMenu', 'notifyShortcuts',
    'offlineCache', 'includeTime', 'autoExtractKeywords',
    'confidenceThreshold', 'showShortcutsInMenu', 'notifyShortcuts',
    'offlineCache', 'includeTime', 'autoExtractKeywords',
    'popupPosition', 'enableSelectedTextFeature',
    'voiceProvider', 'sonioxApiKey'
  ]);

  // 如果是首次使用，应用默认配置
  const isFirstTime = !settings.blinkoUrl;
  if (isFirstTime) {
    await StorageService.setSync(DEFAULT_CONFIG);
    showStatus('✅ 已应用默认配置，请填入你的Blinko Token', 'warning');
    console.log('应用默认配置');
  }

  // 填充表单（使用保存的设置或默认配置）
  document.getElementById('blinkoUrl').value = settings.blinkoUrl || DEFAULT_CONFIG.blinkoUrl;
  document.getElementById('blinkoToken').value = settings.blinkoToken || '';
  document.getElementById('aiApiKey').value = settings.aiApiKey || DEFAULT_CONFIG.aiApiKey;
  document.getElementById('aiProvider').value = settings.aiProvider || DEFAULT_CONFIG.aiProvider;
  document.getElementById('aiBaseUrl').value = settings.aiBaseUrl || DEFAULT_CONFIG.aiBaseUrl;
  document.getElementById('aiModel').value = settings.aiModel || DEFAULT_CONFIG.aiModel;
  document.getElementById('aiCustomModel').value = settings.aiCustomModel || DEFAULT_CONFIG.aiCustomModel;

  // 渲染备用模型列表
  renderBackupList(settings.backupAiConfigs || []);

  // AI高级参数
  document.getElementById('aiTemperature').value = settings.aiTemperature || DEFAULT_CONFIG.aiTemperature;
  document.getElementById('temperatureValue').textContent = settings.aiTemperature || DEFAULT_CONFIG.aiTemperature;
  document.getElementById('aiMaxTokens').value = settings.aiMaxTokens || DEFAULT_CONFIG.aiMaxTokens;
  document.getElementById('aiTopP').value = settings.aiTopP || DEFAULT_CONFIG.aiTopP;
  document.getElementById('topPValue').textContent = settings.aiTopP || DEFAULT_CONFIG.aiTopP;
  document.getElementById('aiTimeout').value = settings.aiTimeout || DEFAULT_CONFIG.aiTimeout;
  document.getElementById('aiStreamMode').checked = settings.aiStreamMode || DEFAULT_CONFIG.aiStreamMode;

  // 提示词配置
  document.getElementById('aiSystemPrompt').value = settings.aiSystemPrompt || DEFAULT_CONFIG.aiSystemPrompt;
  document.getElementById('promptTemplate').value = settings.promptTemplate || DEFAULT_CONFIG.promptTemplate;
  document.getElementById('summaryLength').value = settings.summaryLength || DEFAULT_CONFIG.summaryLength;

  document.getElementById('enableSmartClassify').checked = settings.enableSmartClassify !== false;
  document.getElementById('autoTags').checked = settings.autoTags !== false;
  document.getElementById('domainTags').checked = settings.domainTags !== false;
  document.getElementById('timeTags').checked = settings.timeTags !== false;

  const threshold = settings.confidenceThreshold || DEFAULT_CONFIG.confidenceThreshold;
  document.getElementById('confidenceThreshold').value = threshold;
  document.getElementById('confidenceValue').textContent = threshold + '%';

  document.getElementById('showShortcutsInMenu').checked = settings.showShortcutsInMenu !== false;
  document.getElementById('notifyShortcuts').checked = settings.notifyShortcuts !== false;

  document.getElementById('offlineCache').checked = settings.offlineCache !== false;
  document.getElementById('includeTime').checked = settings.includeTime !== false;
  document.getElementById('autoExtractKeywords').checked = settings.autoExtractKeywords !== false;

  // 界面设置
  document.getElementById('theme').value = settings.theme || 'default';
  document.getElementById('popupPosition').value = settings.popupPosition || 'default';
  document.getElementById('popupPosition').value = settings.popupPosition || 'default';
  document.getElementById('enableSelectedTextFeature').checked = settings.enableSelectedTextFeature !== false;

  // 语音设置
  document.getElementById('voiceProvider').value = settings.voiceProvider || 'browser';
  document.getElementById('sonioxApiKey').value = settings.sonioxApiKey || '';
  // 触发一次change以更新UI
  document.getElementById('voiceProvider').dispatchEvent(new Event('change'));

  // 更新AI服务商相关设置
  updateAIProviderSettings();

  console.log('设置加载完成');
}

// 更新AI服务商设置 - 增强版，支持自定义模型
function updateAIProviderSettings() {
  console.log('更新AI服务商设置');

  const provider = document.getElementById('aiProvider').value;
  const modelSelect = document.getElementById('aiModel');
  const customModelInput = document.getElementById('aiCustomModel');
  const customModelGroup = document.getElementById('customModelGroup');
  const baseUrlInput = document.getElementById('aiBaseUrl');

  // 清空现有选项
  modelSelect.innerHTML = '';

  // 添加对应的模型选项
  const models = AI_MODELS[provider] || AI_MODELS.custom;
  models.forEach(model => {
    const option = document.createElement('option');
    option.value = model.value;
    option.textContent = model.text;
    modelSelect.appendChild(option);
  });

  // 设置默认API地址
  const defaultUrls = {
    openai: 'https://api.openai.com/v1',
    claude: 'https://api.anthropic.com',
    deepseek: 'https://api.deepseek.com/v1',
    qwen: 'https://dashscope.aliyuncs.com/api/v1',
    siliconflow: 'https://api.siliconflow.cn/v1',
    custom: ''
  };

  if (!baseUrlInput.value || baseUrlInput.value === baseUrlInput.placeholder) {
    baseUrlInput.value = defaultUrls[provider] || '';
  }
  baseUrlInput.placeholder = defaultUrls[provider] || '请输入自定义API地址';

  // 处理自定义模型输入框的显示/隐藏
  const shouldShowCustomInput = provider === 'custom' ||
    (provider === 'siliconflow' && modelSelect.value === 'custom');

  if (shouldShowCustomInput) {
    customModelGroup.style.display = 'block';
    customModelInput.required = true;
  } else {
    customModelGroup.style.display = 'none';
    customModelInput.required = false;
  }

  // 监听模型选择变化（特别是硅基流动的"其他模型"选项）
  modelSelect.addEventListener('change', function () {
    const shouldShowCustomInput = provider === 'custom' ||
      (provider === 'siliconflow' && this.value === 'custom');

    if (shouldShowCustomInput) {
      customModelGroup.style.display = 'block';
      customModelInput.required = true;
      customModelInput.focus();
    } else {
      customModelGroup.style.display = 'none';
      customModelInput.required = false;
    }
  });

  // 如果已有选择的值（可能是刚才检测到的），保持选择
  if (modelSelect.getAttribute('data-initial-value')) {
    const initialValue = modelSelect.getAttribute('data-initial-value');
    // 检查该值是否在选项中
    if ([...modelSelect.options].some(opt => opt.value === initialValue)) {
      modelSelect.value = initialValue;
    }
    modelSelect.removeAttribute('data-initial-value');
  }

  // 触发一次change事件以更新UI状态
  modelSelect.dispatchEvent(new Event('change'));

  console.log('AI服务商设置更新完成:', provider);
}

// 更新提示词模板
function updatePromptTemplate() {
  console.log('更新提示词模板');

  const template = document.getElementById('promptTemplate').value;
  const promptTextarea = document.getElementById('aiSystemPrompt');

  if (template !== 'custom' && PROMPT_TEMPLATES[template]) {
    promptTextarea.value = PROMPT_TEMPLATES[template];
  }

  // 如果选择自定义，清空内容让用户自己填写
  if (template === 'custom') {
    promptTextarea.value = '';
    promptTextarea.placeholder = '请输入自定义的系统提示词...';
  }

  console.log('提示词模板更新完成:', template);
}

// 获取实际使用的模型名称
function getActualModelName() {
  const provider = document.getElementById('aiProvider').value;
  const selectedModel = document.getElementById('aiModel').value;
  const customModel = document.getElementById('aiCustomModel').value.trim();

  // 修正逻辑：只有当明确选择了'custom'选项（手动输入模式）时，才使用自定义输入框的值
  // 如果用户在自定义提供商下选择了检测到的模型，直接使用该模型ID
  if (selectedModel === 'custom' && customModel) {
    return customModel;
  }

  return selectedModel;
}

// 渲染备用模型列表
function renderBackupList(backupConfigs) {
  const container = document.getElementById('backupListContainer');
  const list = document.getElementById('backupList');

  if (!backupConfigs || backupConfigs.length === 0) {
    container.style.display = 'none';
    return;
  }

  container.style.display = 'block';
  list.innerHTML = '';

  backupConfigs.forEach((config, index) => {
    const item = document.createElement('div');
    item.style.cssText = 'background: #f8f9fa; padding: 10px; border-radius: 8px; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center; border: 1px solid #e1e8ed;';

    // 获取显示名称
    let modelName = config.aiModel;
    if (config.aiModel === 'custom' && config.aiCustomModel) {
      modelName = config.aiCustomModel;
    }

    const info = document.createElement('div');
    info.style.cssText = 'flex: 1;';
    info.innerHTML = `
      <div style="font-weight: 600; color: #2c3e50;">${config.aiProvider.toUpperCase()} - ${modelName}</div>
      <div style="font-size: 12px; color: #666; margin-top: 2px;">${config.aiBaseUrl}</div>
    `;

    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = '删除';
    deleteBtn.className = 'btn btn-danger';
    deleteBtn.style.cssText = 'padding: 5px 10px; font-size: 12px; margin: 0;';
    deleteBtn.onclick = async () => {
      if (confirm('确定要删除这个备用模型吗？')) {
        await removeBackup(index);
      }
    };

    item.appendChild(info);
    item.appendChild(deleteBtn);
    list.appendChild(item);
  });
}

// 添加当前配置到备用列表
async function addCurrentToBackups() {
  const settings = {
    aiProvider: document.getElementById('aiProvider').value,
    aiBaseUrl: document.getElementById('aiBaseUrl').value.trim(),
    aiApiKey: document.getElementById('aiApiKey').value.trim(),
    aiModel: document.getElementById('aiModel').value,
    aiCustomModel: document.getElementById('aiCustomModel').value.trim(),
    // 高级参数也是必要的，因为不同模型可能参数不同
    aiTemperature: parseFloat(document.getElementById('aiTemperature').value),
    aiMaxTokens: parseInt(document.getElementById('aiMaxTokens').value),
    aiTopP: parseFloat(document.getElementById('aiTopP').value),
  };

  if (!settings.aiApiKey) {
    showStatus('❌ 请先填写API Key', 'error');
    return;
  }

  try {
    const currentSettings = await StorageService.getSync(['backupAiConfigs']);
    const backups = currentSettings.backupAiConfigs || [];

    // 查重：简单的查重逻辑 (Provider + Model + BaseURL)
    const isDuplicate = backups.some(b =>
      b.aiProvider === settings.aiProvider &&
      b.aiModel === settings.aiModel &&
      b.aiCustomModel === settings.aiCustomModel &&
      b.aiBaseUrl === settings.aiBaseUrl
    );

    if (isDuplicate) {
      showStatus('⚠️ 该配置已存在于备用列表中', 'warning');
      return;
    }

    backups.push(settings);

    await StorageService.setSync({ backupAiConfigs: backups });
    renderBackupList(backups);
    showStatus('✅ 已添加到备用列表，别忘了点击底部"保存所有配置"', 'success');
  } catch (error) {
    showStatus('❌ 添加失败: ' + error.message, 'error');
  }
}

// 删除备用模型
async function removeBackup(index) {
  try {
    const currentSettings = await StorageService.getSync(['backupAiConfigs']);
    const backups = currentSettings.backupAiConfigs || [];

    if (index >= 0 && index < backups.length) {
      backups.splice(index, 1);
      await StorageService.setSync({ backupAiConfigs: backups });
      renderBackupList(backups);
      showStatus('✅ 已删除备用模型', 'success');
    }
  } catch (error) {
    showStatus('❌ 删除失败: ' + error.message, 'error');
  }
}

// 保存设置 - 增强版，支持自定义模型
async function saveSettings() {
  console.log('开始保存设置');

  const settings = {
    blinkoUrl: document.getElementById('blinkoUrl').value.trim(),
    blinkoToken: document.getElementById('blinkoToken').value.trim(),
    aiApiKey: document.getElementById('aiApiKey').value.trim(),
    aiProvider: document.getElementById('aiProvider').value,
    aiBaseUrl: document.getElementById('aiBaseUrl').value.trim(),
    aiModel: document.getElementById('aiModel').value,
    aiCustomModel: document.getElementById('aiCustomModel').value.trim(),

    // AI高级参数
    aiTemperature: parseFloat(document.getElementById('aiTemperature').value),
    aiMaxTokens: parseInt(document.getElementById('aiMaxTokens').value),
    aiTopP: parseFloat(document.getElementById('aiTopP').value),
    aiTimeout: parseInt(document.getElementById('aiTimeout').value),
    aiStreamMode: document.getElementById('aiStreamMode').checked,

    // 提示词配置
    aiSystemPrompt: document.getElementById('aiSystemPrompt').value.trim(),
    promptTemplate: document.getElementById('promptTemplate').value,
    summaryLength: document.getElementById('summaryLength').value,

    enableSmartClassify: document.getElementById('enableSmartClassify').checked,
    autoTags: document.getElementById('autoTags').checked,
    domainTags: document.getElementById('domainTags').checked,
    timeTags: document.getElementById('timeTags').checked,

    confidenceThreshold: parseInt(document.getElementById('confidenceThreshold').value),

    showShortcutsInMenu: document.getElementById('showShortcutsInMenu').checked,
    notifyShortcuts: document.getElementById('notifyShortcuts').checked,

    offlineCache: document.getElementById('offlineCache').checked,
    includeTime: document.getElementById('includeTime').checked,
    autoExtractKeywords: document.getElementById('autoExtractKeywords').checked,

    // 界面设置
    theme: document.getElementById('theme').value,
    popupPosition: document.getElementById('popupPosition').value,
    enableSelectedTextFeature: document.getElementById('enableSelectedTextFeature').checked,

    // 语音设置
    voiceProvider: document.getElementById('voiceProvider').value,
    sonioxApiKey: document.getElementById('sonioxApiKey').value.trim()
  };

  try {
    await StorageService.setSync(settings);
    showStatus('✅ 设置已保存', 'success');
    console.log('设置保存成功');
  } catch (error) {
    showStatus('❌ 保存失败：' + error.message, 'error');
    console.error('设置保存失败:', error);
  }
}

// 测试Blinko连接（使用 BlinkoService）
async function testBlinkoConnection() {
  console.log('开始测试Blinko连接');

  const urlInput = document.getElementById('blinkoUrl');
  const token = document.getElementById('blinkoToken').value.trim();
  const url = urlInput.value.trim();

  if (!url || !token) {
    showStatus('❌ 请填写完整的Blinko配置', 'error');
    return;
  }

  showStatus('🔍 正在测试Blinko连接...', 'warning');

  try {
    const result = await BlinkoService.testConnection(url, token);

    if (result.success) {
      showStatus('✅ Blinko连接测试成功！', 'success');

      // 如果 Service 建议了新的 URL（修正了单复数），自动更新 UI
      if (result.url && result.url !== url) {
        showStatus(`✅ 连接成功！已自动修正API地址`, 'success');
        urlInput.value = result.url;
      }
    } else {
      showStatus(`❌ Blinko连接失败: ${result.error}`, 'error');

      // 提供排查建议
      console.log('连接测试失败详情:', result);
      console.log('建议检查：Token是否正确？API地址是否可访问？网络是否正常？');
    }
  } catch (error) {
    console.error('Blinko连接测试异常:', error);
    showStatus('❌ 连接异常: ' + error.message, 'error');
  }
}

// 测试AI连接 - 增强版，支持自定义模型
async function testAIConnection() {
  console.log('开始测试AI连接');

  const apiKey = document.getElementById('aiApiKey').value.trim();
  const provider = document.getElementById('aiProvider').value;
  const baseUrl = document.getElementById('aiBaseUrl').value.trim();
  const model = getActualModelName();  // 使用实际模型名称
  const temperature = parseFloat(document.getElementById('aiTemperature').value);
  const maxTokens = parseInt(document.getElementById('aiMaxTokens').value);

  if (!apiKey) {
    showStatus('❌ 请填写AI API密钥', 'error');
    return;
  }

  if (!baseUrl) {
    showStatus('❌ 请填写API基础地址', 'error');
    return;
  }

  if (!model) {
    showStatus('❌ 请选择或输入模型名称', 'error');
    return;
  }

  showStatus('🔍 正在测试AI连接...', 'warning');

  console.log('测试AI连接参数:');
  console.log('Provider:', provider);
  console.log('Base URL:', baseUrl);
  console.log('Model:', model);
  console.log('API Key (前10字符):', apiKey.substring(0, 10) + '...');

  try {
    const endpoint = baseUrl.endsWith('/') ? baseUrl + 'chat/completions' : baseUrl + '/chat/completions';

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model,
        messages: [{ role: 'user', content: '测试连接' }],
        max_tokens: Math.min(maxTokens, 50),
        temperature: temperature
      })
    });

    if (response.ok) {
      const data = await response.json();
      showStatus('✅ AI服务连接测试成功', 'success');
      console.log('AI连接测试成功，响应:', data);
    } else {
      const errorText = await response.text();
      showStatus(`❌ AI服务连接失败: ${response.status} - ${errorText}`, 'error');
      console.error('AI连接失败:', response.status, errorText);
    }
  } catch (error) {
    showStatus('❌ AI服务连接错误: ' + error.message, 'error');
    console.error('AI连接错误:', error);
  }
}

// 检测可用模型
async function checkAvailableModels() {
  console.log('开始检测可用模型');

  const apiKey = document.getElementById('aiApiKey').value.trim();
  const provider = document.getElementById('aiProvider').value;
  const baseUrl = document.getElementById('aiBaseUrl').value.trim();
  const modelSelect = document.getElementById('aiModel');

  if (!baseUrl) {
    showStatus('❌ 请填写API基础地址', 'error');
    return;
  }

  showStatus('🔍 正在检测可用模型...', 'warning');

  try {
    // 构建模型列表API地址
    // 通常是 /models 或 /v1/models
    let modelsEndpoint = baseUrl;
    if (modelsEndpoint.endsWith('/chat/completions')) {
      modelsEndpoint = modelsEndpoint.replace('/chat/completions', '/models');
    } else if (modelsEndpoint.endsWith('/')) {
      modelsEndpoint += 'models';
    } else {
      modelsEndpoint += '/models';
    }

    console.log('检测模型 Endpoint:', modelsEndpoint);

    const headers = {
      'Content-Type': 'application/json'
    };

    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    const response = await fetch(modelsEndpoint, {
      method: 'GET',
      headers: headers
    });

    if (!response.ok) {
      // 尝试另一种常见的路径格式 (例如去掉 /v1)
      if (modelsEndpoint.includes('/v1/models')) {
        const altEndpoint = modelsEndpoint.replace('/v1/models', '/models');
        console.log('尝试替代 Endpoint:', altEndpoint);
        const altResponse = await fetch(altEndpoint, {
          method: 'GET',
          headers: headers
        });
        if (altResponse.ok) {
          const data = await altResponse.json();
          populateModelList(data, provider, modelSelect);
          return;
        }
      }
      throw new Error(`无法获取模型列表: ${response.status}`);
    }

    const data = await response.json();
    populateModelList(data, provider, modelSelect);

  } catch (error) {
    console.error('检测模型失败:', error);
    showStatus('❌ 检测失败: ' + error.message, 'error');

    // 如果是Ollama，给个特别提示
    if (baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1')) {
      showStatus('❌ 检测失败: 请确保本地服务(如Ollama)已启动并允许跨域请求', 'error');
    }
  }
}

// 填充模型列表
function populateModelList(data, provider, modelSelect) {
  let models = [];

  // 解析不同格式的返回数据
  if (Array.isArray(data)) {
    models = data;
  } else if (data.data && Array.isArray(data.data)) {
    models = data.data; // OpenAI 格式
  } else if (data.models && Array.isArray(data.models)) {
    models = data.models; // Ollama 可能的格式
  }

  console.log('检测到的模型:', models);

  if (models.length === 0) {
    showStatus('⚠️ 未检测到任何模型', 'warning');
    return;
  }

  // 清空现有选项，但保留"自定义/手动输入"选项（如果是Custom模式）
  modelSelect.innerHTML = '';

  // 添加检测到的模型
  models.forEach(model => {
    const id = model.id || model.name; // 适应不同字段
    const option = document.createElement('option');
    option.value = id;
    option.textContent = id;
    modelSelect.appendChild(option);
  });

  // 如果处于Custom模式，添加"手动输入"选项
  // if (provider === 'custom' || provider === 'siliconflow') {
  const manualOption = document.createElement('option');
  manualOption.value = 'custom';
  manualOption.textContent = '✏️ 手动输入...';
  modelSelect.appendChild(manualOption);
  // }

  // 自动选择第一个模型
  if (models.length > 0) {
    // 优先选择之前选中的模型
    const savedModel = document.getElementById('aiModel').getAttribute('data-initial-value'); // 这里其实拿不到
    // 简单策略：选第一个
    modelSelect.value = models[0].id || models[0].name;
  }

  // 触发change事件以更新UI（隐藏/显示自定义输入框）
  modelSelect.dispatchEvent(new Event('change'));

  showStatus(`✅ 成功检测到 ${models.length} 个模型`, 'success');
}

// 重置选中文本功能
async function resetSelectedTextFeature() {
  console.log('开始重置选中文本功能');

  try {
    // 重置相关设置
    await StorageService.setSync({
      enableSelectedTextFeature: true,
      popupPosition: 'default'
    });

    // 重新加载设置
    await loadSettings();

    showStatus('✅ 选中文本功能已重置', 'success');
    console.log('选中文本功能重置成功');
  } catch (error) {
    showStatus('❌ 重置失败：' + error.message, 'error');
    console.error('选中文本功能重置失败:', error);
  }
}

// 导出设置
async function exportSettings() {
  console.log('开始导出设置');

  try {
    const settings = await StorageService.getSync();

    // 移除敏感信息
    const exportData = { ...settings };
    delete exportData.blinkoToken;
    delete exportData.aiApiKey;

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'blinko-extension-config.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showStatus('✅ 配置已导出（已移除敏感信息）', 'success');
    console.log('配置导出成功');
  } catch (error) {
    showStatus('❌ 导出失败：' + error.message, 'error');
    console.error('配置导出失败:', error);
  }
}

// 导入设置
function importSettings() {
  console.log('开始导入设置');

  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';

  input.onchange = async function (event) {
    const file = event.target.files[0];
    if (!file) return;

    try {
      const text = await file.text();
      const importedSettings = JSON.parse(text);

      // 合并配置（保留现有的敏感信息）
      const currentSettings = await StorageService.getSync();
      const mergedSettings = { ...importedSettings, ...currentSettings };

      await StorageService.setSync(mergedSettings);
      await loadSettings();

      showStatus('✅ 配置导入成功', 'success');
      console.log('配置导入成功');
    } catch (error) {
      showStatus('❌ 配置文件格式错误：' + error.message, 'error');
      console.error('配置导入失败:', error);
    }
  };

  input.click();
}

// 重置设置
async function resetSettings() {
  console.log('开始重置设置');

  if (confirm('确定要重置所有设置吗？这将恢复到默认配置。')) {
    try {
      await StorageService.clearSync();
      await StorageService.setSync(DEFAULT_CONFIG);
      await loadSettings();
      showStatus('🔄 设置已重置为默认配置', 'warning');
      console.log('设置重置成功');
    } catch (error) {
      showStatus('❌ 重置失败：' + error.message, 'error');
      console.error('设置重置失败:', error);
    }
  }
}

// 显示状态信息
function showStatus(message, type) {
  const statusDiv = document.getElementById('status');
  statusDiv.textContent = message;
  statusDiv.className = `status ${type}`;

  console.log('状态更新:', message, type);

  if (type === 'success') {
    setTimeout(() => {
      statusDiv.textContent = '';
      statusDiv.className = '';
    }, 3000);
  }
}