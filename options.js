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
  
  // 主要操作按钮
  document.getElementById('saveBtn').addEventListener('click', saveSettings);
  document.getElementById('exportBtn').addEventListener('click', exportSettings);
  document.getElementById('importBtn').addEventListener('click', importSettings);
  document.getElementById('resetBtn').addEventListener('click', resetSettings);

  // 新增功能按钮
  document.getElementById('resetSelectedTextFeature').addEventListener('click', resetSelectedTextFeature);
  
  // AI服务商变更
  document.getElementById('aiProvider').addEventListener('change', updateAIProviderSettings);
  
  // 提示词模板变更
  document.getElementById('promptTemplate').addEventListener('change', updatePromptTemplate);
  
  // 滑块事件
  const confidenceSlider = document.getElementById('confidenceThreshold');
  const confidenceValue = document.getElementById('confidenceValue');
  confidenceSlider.addEventListener('input', function() {
    confidenceValue.textContent = this.value + '%';
  });

  const temperatureSlider = document.getElementById('aiTemperature');
  const temperatureValue = document.getElementById('temperatureValue');
  temperatureSlider.addEventListener('input', function() {
    temperatureValue.textContent = this.value;
  });

  const topPSlider = document.getElementById('aiTopP');
  const topPValue = document.getElementById('topPValue');
  topPSlider.addEventListener('input', function() {
    topPValue.textContent = this.value;
  });
  
  // 折叠区域事件
  document.getElementById('advancedToggle').addEventListener('click', function() {
    toggleCollapsible('advancedContent', this);
  });
  
  document.getElementById('promptToggle').addEventListener('click', function() {
    toggleCollapsible('promptContent', this);
  });
  
  console.log('事件监听器绑定完成');
}

// 默认配置 - 修正API地址为复数形式
const DEFAULT_CONFIG = {
  blinkoUrl: 'https://ccnu.me/api/v1/note/upsert',  // 修正：根据用户反馈使用单数形式
  blinkoToken: '',
  aiApiKey: '',
  aiProvider: 'openai',
  aiBaseUrl: 'https://api.openai.com/v1',
  aiModel: 'gpt-3.5-turbo',
  aiCustomModel: '',  // 新增：自定义模型名称
  aiTemperature: 0.7,
  aiMaxTokens: 1000,
  aiTopP: 1.0,
  aiTimeout: 30,
  aiStreamMode: false,
  aiSystemPrompt: '你是一个专业的文章总结助手。请用中文总结文章的核心要点，包括：1）主要观点；2）关键信息；3）实用建议。保持简洁明了，突出价值。',
  promptTemplate: 'default',
  summaryLength: 'medium',
  enableSmartClassify: true,
  autoTags: true,
  domainTags: true,
  timeTags: true,
  confidenceThreshold: 30,
  showShortcutsInMenu: true,
  notifyShortcuts: true,
  offlineCache: true,
  includeTime: true,
  autoExtractKeywords: true
};

// 预定义的提示词模板
const PROMPT_TEMPLATES = {
  default: '你是一个专业的文章总结助手。请用中文总结文章的核心要点，包括：1）主要观点；2）关键信息；3）实用建议。保持简洁明了，突出价值。',
  technical: '你是一个技术文档总结专家。请重点关注：1）技术要点和实现方法；2）关键代码和配置；3）最佳实践和注意事项。用简洁的技术语言总结。',
  academic: '你是一个学术论文总结专家。请重点提取：1）研究问题和方法；2）主要发现和结论；3）理论贡献和实际意义。保持学术严谨性。',
  news: '你是一个新闻资讯总结专家。请重点关注：1）事件要点和时间线；2）影响分析和相关方；3）发展趋势和后续关注点。保持客观中立。',
  custom: ''
};

// AI服务商对应的模型选项 - 新增硅基流动
const AI_MODELS = {
  openai: [
    { value: 'gpt-3.5-turbo', text: 'GPT-3.5 Turbo' },
    { value: 'gpt-4', text: 'GPT-4' },
    { value: 'gpt-4-turbo', text: 'GPT-4 Turbo' },
    { value: 'gpt-4o', text: 'GPT-4o' },
    { value: 'gpt-4o-mini', text: 'GPT-4o Mini' }
  ],
  claude: [
    { value: 'claude-3-sonnet-20240229', text: 'Claude 3 Sonnet' },
    { value: 'claude-3-opus-20240229', text: 'Claude 3 Opus' },
    { value: 'claude-3-haiku-20240307', text: 'Claude 3 Haiku' },
    { value: 'claude-3-5-sonnet-20241022', text: 'Claude 3.5 Sonnet' }
  ],
  deepseek: [
    { value: 'deepseek-chat', text: 'DeepSeek Chat' },
    { value: 'deepseek-coder', text: 'DeepSeek Coder' }
  ],
  qwen: [
    { value: 'qwen-turbo', text: '通义千问 Turbo' },
    { value: 'qwen-plus', text: '通义千问 Plus' },
    { value: 'qwen-max', text: '通义千问 Max' }
  ],
  siliconflow: [
    { value: 'Qwen/Qwen2.5-7B-Instruct', text: 'Qwen2.5-7B-Instruct' },
    { value: 'Qwen/Qwen2.5-14B-Instruct', text: 'Qwen2.5-14B-Instruct' },
    { value: 'Qwen/Qwen2.5-32B-Instruct', text: 'Qwen2.5-32B-Instruct' },
    { value: 'Qwen/Qwen2.5-72B-Instruct', text: 'Qwen2.5-72B-Instruct' },
    { value: 'deepseek-ai/DeepSeek-V2.5', text: 'DeepSeek-V2.5' },
    { value: 'THUDM/glm-4-9b-chat', text: 'GLM-4-9B-Chat' },
    { value: 'meta-llama/Meta-Llama-3.1-8B-Instruct', text: 'Llama-3.1-8B-Instruct' },
    { value: 'meta-llama/Meta-Llama-3.1-70B-Instruct', text: 'Llama-3.1-70B-Instruct' },
    { value: 'custom', text: '其他模型...' }
  ],
  custom: [
    { value: 'custom', text: '自定义模型' }
  ]
};

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
  
  const settings = await chrome.storage.sync.get([
    'blinkoUrl', 'blinkoToken', 'aiApiKey', 'aiProvider', 'aiBaseUrl', 'aiModel', 'aiCustomModel',
    'aiTemperature', 'aiMaxTokens', 'aiTopP', 'aiTimeout', 'aiStreamMode',
    'aiSystemPrompt', 'promptTemplate', 'summaryLength',
    'enableSmartClassify', 'autoTags', 'domainTags', 'timeTags',
    'confidenceThreshold', 'showShortcutsInMenu', 'notifyShortcuts',
    'offlineCache', 'includeTime', 'autoExtractKeywords',
    'popupPosition', 'enableSelectedTextFeature'
  ]);
  
  // 如果是首次使用，应用默认配置
  const isFirstTime = !settings.blinkoUrl;
  if (isFirstTime) {
    await chrome.storage.sync.set(DEFAULT_CONFIG);
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
  document.getElementById('popupPosition').value = settings.popupPosition || 'default';
  document.getElementById('enableSelectedTextFeature').checked = settings.enableSelectedTextFeature !== false;

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
  modelSelect.addEventListener('change', function() {
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
  
  // 如果选择了自定义模型，使用自定义模型名称
  if ((provider === 'custom' || selectedModel === 'custom') && customModel) {
    return customModel;
  }
  
  return selectedModel;
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
    popupPosition: document.getElementById('popupPosition').value,
    enableSelectedTextFeature: document.getElementById('enableSelectedTextFeature').checked
  };
  
  try {
    await chrome.storage.sync.set(settings);
    showStatus('✅ 设置已保存', 'success');
    console.log('设置保存成功');
  } catch (error) {
    showStatus('❌ 保存失败：' + error.message, 'error');
    console.error('设置保存失败:', error);
  }
}

// 智能Token格式处理
function formatAuthorizationToken(token) {
  if (!token) return '';
  
  // 移除可能的空格
  token = token.trim();
  
  // 如果已经包含Bearer前缀，直接返回
  if (token.toLowerCase().startsWith('bearer ')) {
    return token;
  }
  
  // 否则添加Bearer前缀
  return `Bearer ${token}`;
}

// 生成可能的API地址变体
function generateApiUrlVariants(baseUrl) {
  const variants = [baseUrl];
  
  // 如果包含 /note/，尝试 /notes/
  if (baseUrl.includes('/note/')) {
    variants.push(baseUrl.replace('/note/', '/notes/'));
  }
  
  // 如果包含 /notes/，尝试 /note/
  if (baseUrl.includes('/notes/')) {
    variants.push(baseUrl.replace('/notes/', '/note/'));
  }
  
  // 移除重复项
  return [...new Set(variants)];
}

// 测试Blinko连接（增强版 - 修复API路径问题）
async function testBlinkoConnection() {
  console.log('开始测试Blinko连接');
  
  const url = document.getElementById('blinkoUrl').value.trim();
  const token = document.getElementById('blinkoToken').value.trim();
  
  if (!url || !token) {
    showStatus('❌ 请填写完整的Blinko配置', 'error');
    return;
  }
  
  showStatus('🔍 正在测试Blinko连接...', 'warning');
  
  // 准备测试数据
  const testContent = {
    content: '🔧 Blinko扩展连接测试 - ' + new Date().toLocaleString(),
    type: 0
  };
  
  console.log('测试请求信息:');
  console.log('原始URL:', url);
  console.log('Token (前10字符):', token.substring(0, 10) + '...');
  console.log('请求体:', testContent);
  
  try {
    // 生成URL变体（处理单复数问题）
    const urlVariants = generateApiUrlVariants(url);
    console.log('尝试的URL变体:', urlVariants);
    
    // 准备Token格式
    const tokenFormats = [
      formatAuthorizationToken(token),  // 智能格式化
      token,  // 原始token
      `Bearer ${token}`,  // 强制添加Bearer
    ];
    
    let lastError = null;
    let success = false;
    let successUrl = null;
    let successToken = null;
    
    // 尝试所有URL和Token格式的组合
    for (let urlIndex = 0; urlIndex < urlVariants.length && !success; urlIndex++) {
      const currentUrl = urlVariants[urlIndex];
      console.log(`\n=== 尝试URL ${urlIndex + 1}: ${currentUrl} ===`);
      
      for (let tokenIndex = 0; tokenIndex < tokenFormats.length && !success; tokenIndex++) {
        const currentToken = tokenFormats[tokenIndex];
        console.log(`尝试Token格式 ${tokenIndex + 1}:`, currentToken.substring(0, 20) + '...');
        
        try {
          const response = await fetch(currentUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': currentToken
            },
            body: JSON.stringify(testContent)
          });
          
          console.log('响应状态:', response.status);
          console.log('响应头:', Object.fromEntries(response.headers.entries()));
          
          if (response.ok) {
            const responseData = await response.text();
            console.log('响应内容:', responseData);
            showStatus('✅ Blinko连接测试成功！', 'success');
            success = true;
            successUrl = currentUrl;
            successToken = currentToken;
            
            // 如果成功的URL与原始URL不同，提示用户更新
            if (currentUrl !== url) {
              showStatus(`✅ 连接成功！建议更新API地址为: ${currentUrl}`, 'success');
              console.log('建议更新API地址:', url, '->', currentUrl);
              
              // 自动更新输入框中的URL
              document.getElementById('blinkoUrl').value = currentUrl;
            }
            break;
          } else {
            const errorText = await response.text();
            console.log('错误响应内容:', errorText);
            lastError = `HTTP ${response.status}: ${errorText}`;
            
            // 如果是401错误，继续尝试其他格式
            if (response.status === 401) {
              console.log('401错误，尝试下一种格式...');
              continue;
            } else {
              // 其他错误，尝试下一个URL
              console.log(`${response.status}错误，尝试下一个URL...`);
              break;
            }
          }
        } catch (fetchError) {
          console.error(`URL ${urlIndex + 1} Token格式 ${tokenIndex + 1} 测试失败:`, fetchError);
          lastError = fetchError.message;
        }
      }
    }
    
    if (!success) {
      // 所有组合都失败了
      showStatus(`❌ Blinko连接失败: ${lastError}`, 'error');
      
      // 提供详细的排查建议
      const suggestions = [
        '🔍 排查建议：',
        '1. 检查Token是否正确（从Blinko设置中重新复制）',
        '2. 确认API地址是否正确（已自动尝试单复数变体）',
        '3. 检查Token是否已过期',
        '4. 确认Blinko服务是否正常运行',
        '5. 检查网络连接是否正常',
        '6. 尝试在浏览器中直接访问Blinko服务'
      ];
      
      console.log(suggestions.join('\n'));
      showStatus('❌ 连接失败，请检查控制台获取详细信息', 'error');
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

// 重置选中文本功能
async function resetSelectedTextFeature() {
  console.log('开始重置选中文本功能');

  try {
    // 重置相关设置
    await chrome.storage.sync.set({
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
    const settings = await chrome.storage.sync.get();
    
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
  
  input.onchange = async function(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    try {
      const text = await file.text();
      const importedSettings = JSON.parse(text);
      
      // 合并配置（保留现有的敏感信息）
      const currentSettings = await chrome.storage.sync.get();
      const mergedSettings = { ...importedSettings, ...currentSettings };
      
      await chrome.storage.sync.set(mergedSettings);
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
      await chrome.storage.sync.clear();
      await chrome.storage.sync.set(DEFAULT_CONFIG);
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