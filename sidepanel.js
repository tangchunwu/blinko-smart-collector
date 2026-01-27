import { MarkdownParser } from './js/utils/markdown-parser.js';
import { StorageService } from './js/services/storage-service.js';
import { BlinkoService } from './js/services/blinko-service.js';

// 善思 Blinko 侧边栏功能脚本 (Side Panel版本)

// 全局变量
let currentTab = null;
let currentPageInfo = null;
let currentTags = [];
let selectedText = '';
let selectedSummary = '';

// 鼓励语数组 (moved to constants? or keep here if UI specific)
// Let's keep UI specific constants here for now to minimize changes, or import from constants if they were there.
// They were exported as ENCOURAGEMENT_MESSAGES. Let's use that.
import { ENCOURAGEMENT_MESSAGES } from './js/utils/constants.js';

let encouragementTimer = null;
let lastInputTime = 0;

// (MarkdownParser definition removed)

// 侧边栏管理类
class BlinkoSidePanel {
  constructor() {
    this.initialized = false;
    this.isAIGenerating = false;
    this.aiAbortController = null;
  }

  // 初始化侧边栏
  async init() {
    if (this.initialized) return;

    try {
      // 检查扩展上下文
      if (!chrome.runtime?.id) {
        console.log('扩展上下文失效，等待重新加载...');
        this.showStatus('⚠️ 扩展正在重新加载，请稍候...', 'warning');
        return;
      }

      // 绑定事件监听器
      this.bindEventListeners();

      // 获取当前活动标签页
      await this.getCurrentTab();

      // 加载主题
      await this.loadTheme();

      // 加载草稿 (自动恢复未提交的内容)
      await this.loadDraft();

      // 初始化界面数据
      await this.initializeInterface();

      this.initialized = true;
      console.log('Blinko Side Panel初始化完成');
    } catch (error) {
      console.error('Side Panel初始化失败:', error);
      if (error.message.includes('Extension context invalidated')) {
        this.showStatus('⚠️ 扩展正在重新加载，请刷新页面', 'warning');
      } else {
        this.showStatus('❌ 初始化失败: ' + error.message, 'error');
      }
    }
  }

  // 获取当前活动标签页
  async getCurrentTab() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      currentTab = tab;
      return tab;
    } catch (error) {
      console.error('获取当前标签页失败:', error);
      return null;
    }
  }

  // 加载并应用主题
  async loadTheme() {
    try {
      const settings = await StorageService.getSync(['theme']);
      const theme = settings.theme || 'default';

      // 移除所有主题类
      document.body.classList.remove('theme-christmas', 'theme-newyear', 'theme-spring');

      // 应用选中的主题
      if (theme !== 'default') {
        document.body.classList.add(`theme-${theme}`);
        console.log('已应用主题:', theme);
      }
    } catch (error) {
      console.error('加载主题失败:', error);
    }
  }

  // ========== 草稿箱功能 ==========

  // 防抖保存草稿 (避免频繁写入存储)
  saveDraftDebounced() {
    if (this.draftTimer) {
      clearTimeout(this.draftTimer);
    }
    this.draftTimer = setTimeout(() => this.saveDraft(), 1000);
  }

  // 保存草稿到本地存储
  async saveDraft() {
    try {
      const draft = {
        summary: document.getElementById('summaryContent').value,
        thoughts: document.getElementById('thoughtsContent').value,
        tags: currentTags,
        url: currentTab?.url || '',
        savedAt: Date.now()
      };

      // 只有有内容时才保存
      if (draft.summary || draft.thoughts || draft.tags.length > 0) {
        await StorageService.setLocal({ blinkoSidepanelDraft: draft });
        console.log('草稿已保存:', new Date().toLocaleTimeString());
      }
    } catch (error) {
      console.error('保存草稿失败:', error);
    }
  }

  // 加载草稿
  async loadDraft() {
    try {
      const result = await StorageService.getLocal('blinkoSidepanelDraft');
      const draft = result.blinkoSidepanelDraft;

      if (draft && (draft.summary || draft.thoughts)) {
        // 检查草稿是否过期 (24小时)
        const isExpired = Date.now() - draft.savedAt > 24 * 60 * 60 * 1000;
        if (isExpired) {
          await this.clearDraft();
          return;
        }

        // 恢复草稿内容
        if (draft.summary) {
          document.getElementById('summaryContent').value = draft.summary;
        }
        if (draft.thoughts) {
          document.getElementById('thoughtsContent').value = draft.thoughts;
        }
        if (draft.tags && draft.tags.length > 0) {
          currentTags = draft.tags;
          this.updateTagsDisplay();
        }

        console.log('已恢复草稿 (保存于', new Date(draft.savedAt).toLocaleString(), ')');
        this.showStatus('📝 已恢复未提交的草稿', 'info');
      }
    } catch (error) {
      console.error('加载草稿失败:', error);
    }
  }

  // 清除草稿
  async clearDraft() {
    try {
      await StorageService.removeLocal('blinkoSidepanelDraft');
      console.log('草稿已清除');
    } catch (error) {
      console.error('清除草稿失败:', error);
    }
  }

  // 绑定事件监听器
  bindEventListeners() {
    // 配置按钮
    document.getElementById('configBtn').addEventListener('click', () => {
      chrome.runtime.openOptionsPage();
    });

    // 测试Blinko连接按钮
    document.getElementById('testBlinkoBtn').addEventListener('click', () => this.testBlinkoConnection());

    // 测试AI连接按钮
    document.getElementById('testAIBtn').addEventListener('click', () => this.testAIConnection());

    // AI生成摘要按钮
    document.getElementById('aiGenerateBtn').addEventListener('click', () => this.generateAISummary());

    // 选中内容相关按钮
    document.getElementById('selectedAiBtn').addEventListener('click', () => this.generateSelectedTextSummary());
    document.getElementById('refreshSelectedBtn').addEventListener('click', () => this.refreshSelectedText());
    document.getElementById('clearSelectedBtn').addEventListener('click', async () => await this.clearSelectedContent());
    document.getElementById('moveToSummaryBtn').addEventListener('click', () => this.moveSelectedSummary('summary'));
    document.getElementById('moveToThoughtsBtn').addEventListener('click', () => this.moveSelectedSummary('thoughts'));
    document.getElementById('editSummaryBtn').addEventListener('click', () => this.toggleSelectedSummaryEdit());

    // 提交按钮（支持取消AI生成）
    document.getElementById('submitBtn').addEventListener('click', () => {
      if (this.isAIGenerating) {
        this.cancelAIGeneration();
      } else {
        this.submitToFlomo();
      }
    });

    // 标签输入
    const tagInput = document.getElementById('tagInput');
    tagInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.addTag(tagInput.value.trim());
        tagInput.value = '';
      }
    });

    tagInput.addEventListener('blur', () => {
      if (tagInput.value.trim()) {
        this.addTag(tagInput.value.trim());
        tagInput.value = '';
      }
    });

    // 个人想法输入事件监听 - 显示鼓励语 & 自动保存草稿
    const thoughtsContent = document.getElementById('thoughtsContent');
    thoughtsContent.addEventListener('input', () => {
      this.handleThoughtsInput();
      this.saveDraftDebounced();
      this.updateSubmitButtonState();
    });

    // 摘要输入事件监听 - 自动保存草稿 & 更新预览
    const summaryContent = document.getElementById('summaryContent');
    summaryContent.addEventListener('input', () => {
      this.saveDraftDebounced();
      this.updateSummaryPreview();
      this.updateSubmitButtonState();
    });

    // 切换摘要编辑/预览
    document.getElementById('toggleSummaryEdit').addEventListener('click', () => {
      this.toggleSummaryEditMode();
    });

    // 语音输入按钮
    const voiceBtn = document.getElementById('voiceInputBtn');
    if (voiceBtn) {
      voiceBtn.addEventListener('click', () => this.toggleVoiceInput());
    }

    // 监听来自background的消息
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      this.handleMessage(request, sender, sendResponse);
    });

    // 定期检查选中文本更新（更频繁）
    setInterval(() => {
      this.checkStoredSelectedText();
    }, 500); // 改为500ms检查一次

    // 监听storage变化
    chrome.storage.onChanged.addListener((changes, namespace) => {
      if (namespace === 'local' && changes.currentSelectedText) {
        console.log('检测到选中文本storage变化');
        this.checkStoredSelectedText();
      }
    });
  }

  // 处理消息
  handleMessage(request, sender, sendResponse) {
    switch (request.action) {
      case 'updatePageInfo':
        this.updatePageInfo(request.data);
        break;
      case 'updateSelectedText':
        this.updateSelectedText(request.text);
        break;
      case 'refreshData':
        this.refreshPageData();
        break;
      case 'selectedTextChanged':
        this.updateSelectedText(request.text);
        break;
      // 流式AI摘要更新
      case 'streamingAISummaryUpdate':
        if (request.tabId === currentTab?.id || !request.tabId) {
          this.setSummaryContent(request.fullContent);
        }
        break;
      // 流式AI摘要完成
      case 'streamingAISummaryComplete':
        if (request.tabId === currentTab?.id || !request.tabId) {
          // 添加页面引用到摘要末尾
          let finalSummary = request.summary;
          if (request.sourceTitle && request.sourceUrl) {
            finalSummary += `\n\n---\n📎 来源: [${request.sourceTitle}](${request.sourceUrl})`;
          }
          this.setSummaryContent(finalSummary);

          // 恢复按钮状态
          const btn = document.getElementById('aiGenerateBtn');
          const loading = document.getElementById('aiLoading');
          const text = document.getElementById('aiGenerateText');
          btn.disabled = false;
          btn.classList.remove('loading');
          loading.style.display = 'none';
          text.textContent = 'AI总结';

          // 添加AI建议的标签
          if (request.tags && request.tags.length > 0) {
            request.tags.forEach(tag => {
              const cleanTag = tag.replace(/^#/, '');
              if (cleanTag && !currentTags.includes(cleanTag)) {
                this.addTag(cleanTag);
              }
            });
          }
          this.setAIGeneratingState(false);
          this.showStatus('✅ AI摘要生成成功，已添加建议标签', 'success');
        }
        break;
      // 流式AI摘要错误
      case 'streamingAISummaryError':
        if (request.tabId === currentTab?.id || !request.tabId) {
          const btn = document.getElementById('aiGenerateBtn');
          const loading = document.getElementById('aiLoading');
          const text = document.getElementById('aiGenerateText');
          btn.disabled = false;
          btn.classList.remove('loading');
          loading.style.display = 'none';
          text.textContent = 'AI总结';
          this.setAIGeneratingState(false);
          this.showStatus('❌ AI摘要生成失败: ' + request.error, 'error');
        }
        break;
    }
  }

  // 处理个人想法输入
  handleThoughtsInput() {
    const thoughtsContent = document.getElementById('thoughtsContent');
    const content = thoughtsContent.value;

    // 只在有一定内容后才显示鼓励语
    if (content.length < 5) return;

    const now = Date.now();

    // 清除之前的定时器
    if (encouragementTimer) {
      clearTimeout(encouragementTimer);
    }

    // 随机延迟显示鼓励语（输入停止后 500ms-1500ms）
    const randomDelay = 500 + Math.random() * 1000;

    // 控制显示频率，至少间隔2秒 (原5秒)
    if (now - lastInputTime < 2000) {
      return;
    }

    encouragementTimer = setTimeout(() => {
      // 100% 显示鼓励语
      this.showEncouragement();
      lastInputTime = Date.now();
    }, randomDelay);
  }

  // 显示鼓励语 (直接替换提示文本)
  showEncouragement() {
    const hintElement = document.getElementById('thoughtsHint');
    if (!hintElement) return;

    // 随机选择一条鼓励语
    const message = ENCOURAGEMENT_MESSAGES[Math.floor(Math.random() * ENCOURAGEMENT_MESSAGES.length)];

    // 更新文本并添加高亮样式
    hintElement.textContent = message;
    hintElement.classList.add('encouraging');

    // 3秒后恢复默认文本
    setTimeout(() => {
      hintElement.classList.remove('encouraging');
      // 等待过渡动画结束后恢复文本
      setTimeout(() => {
        hintElement.textContent = '开始写下你的思考...';
      }, 300);
    }, 3000);
  }

  // ========== 摘要Markdown预览功能 ==========

  // 更新摘要预览
  updateSummaryPreview() {
    const textarea = document.getElementById('summaryContent');
    const preview = document.getElementById('summaryPreview');
    if (!textarea || !preview) return;

    const markdown = textarea.value;
    const html = MarkdownParser.parse(markdown);
    preview.innerHTML = html;
  }

  // 切换摘要编辑/预览模式
  toggleSummaryEditMode() {
    const textarea = document.getElementById('summaryContent');
    const preview = document.getElementById('summaryPreview');
    const toggleBtn = document.getElementById('toggleSummaryEdit');

    if (!textarea || !preview) return;

    const isEditing = textarea.style.display !== 'none';

    if (isEditing) {
      // 切换到预览模式
      this.updateSummaryPreview();
      textarea.style.display = 'none';
      preview.style.display = 'block';
      toggleBtn.title = '编辑模式';
      // 更新图标为预览图标
      toggleBtn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
          <circle cx="12" cy="12" r="3" />
        </svg>`;
    } else {
      // 切换到编辑模式
      textarea.style.display = 'block';
      preview.style.display = 'none';
      textarea.focus();
      toggleBtn.title = '预览模式';
      // 更新图标为编辑图标
      toggleBtn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
        </svg>`;
    }
  }

  // 设置摘要内容并渲染
  setSummaryContent(content) {
    const textarea = document.getElementById('summaryContent');
    const preview = document.getElementById('summaryPreview');

    if (textarea) {
      textarea.value = content;
    }

    // 自动渲染预览
    if (preview) {
      const html = MarkdownParser.parse(content);
      preview.innerHTML = html;
    }
  }

  // ========== AI生成状态控制 ==========

  // 设置AI生成中状态
  setAIGeneratingState(isGenerating) {
    this.isAIGenerating = isGenerating;
    const submitBtn = document.getElementById('submitBtn');
    const label = submitBtn.querySelector('.label');

    if (isGenerating) {
      submitBtn.classList.add('ai-generating');
      submitBtn.disabled = false;
      label.textContent = '点击取消 AI 总结';
    } else {
      submitBtn.classList.remove('ai-generating');
      label.textContent = '提交到 Blinko';
      // 重新判断按钮是否应该禁用
      this.updateSubmitButtonState();
    }
  }

  // 取消AI生成
  cancelAIGeneration() {
    if (this.aiAbortController) {
      this.aiAbortController.abort();
      this.aiAbortController = null;
    }

    // 发送取消消息给background
    chrome.runtime.sendMessage({ action: 'cancelAIGeneration' });

    this.setAIGeneratingState(false);
    this.showStatus('⏹️ AI 总结已取消', 'info');

    // 恢复AI按钮状态
    const aiBtn = document.getElementById('aiGenerateBtn');
    const loading = document.getElementById('aiLoading');
    const text = document.getElementById('aiGenerateText');
    if (aiBtn) {
      aiBtn.disabled = false;
      aiBtn.classList.remove('loading');
    }
    if (loading) loading.style.display = 'none';
    if (text) text.textContent = 'AI总结';

    // 选中文本AI按钮
    const selectedAiBtn = document.getElementById('selectedAiBtn');
    const selectedAiLoading = document.getElementById('selectedAiLoading');
    const selectedAiText = document.getElementById('selectedAiText');
    if (selectedAiBtn) {
      selectedAiBtn.disabled = false;
      selectedAiBtn.classList.remove('loading');
    }
    if (selectedAiLoading) selectedAiLoading.style.display = 'none';
    if (selectedAiText) selectedAiText.textContent = 'AI总结';
  }

  // 更新提交按钮状态
  updateSubmitButtonState() {
    const submitBtn = document.getElementById('submitBtn');
    const summaryContent = document.getElementById('summaryContent');
    const thoughtsContent = document.getElementById('thoughtsContent');

    // 如果有摘要或想法内容，启用按钮
    const hasContent = (summaryContent && summaryContent.value.trim()) ||
      (thoughtsContent && thoughtsContent.value.trim());
    submitBtn.disabled = !hasContent;
  }

  // ========== 语音输入功能 ==========

  // 切换语音输入
  async toggleVoiceInput() {
    const btn = document.getElementById('voiceInputBtn');

    // 获取当前的语音提供商设置
    const settings = await StorageService.getSync(['voiceProvider']);
    const provider = settings.voiceProvider || 'browser';

    if (provider === 'browser') {
      this.toggleBrowserVoiceInput(btn);
    } else {
      this.toggleApiVoiceInput(btn, provider);
    }
  }

  // 浏览器原生语音输入
  async toggleBrowserVoiceInput(btn) {
    // 检查浏览器支持
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      this.showStatus('❌ 您的浏览器不支持语音输入', 'error');
      return;
    }

    // 如果正在录音，停止
    if (this.recognition && this.isRecording) {
      this.recognition.stop();
      return;
    }

    // 先请求麦克风权限（显式授权）
    try {
      this.showStatus('🎤 正在请求麦克风权限...', 'info');
      await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log('麦克风权限已获取');
    } catch (error) {
      console.error('麦克风权限请求失败:', error);
      this.handleMicError(error);
      return;
    }

    // 初始化语音识别
    this.recognition = new SpeechRecognition();
    this.recognition.continuous = true; // 持续识别
    this.recognition.interimResults = true; // 显示临时结果
    this.recognition.lang = 'zh-CN'; // 中文

    this.recognition.onstart = () => {
      this.isRecording = true;
      btn.classList.add('recording');
      this.showStatus('🎤 正在录音...说完点击停止', 'info');
      console.log('语音识别已启动');
    };

    this.recognition.onresult = (event) => {
      const textarea = document.getElementById('thoughtsContent');
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      if (finalTranscript) {
        // 追加最终结果到输入框
        const currentValue = textarea.value;
        // 如果当前有内容且不以空格结尾，添加空格
        const separator = (currentValue && !currentValue.endsWith('\n') && !currentValue.endsWith(' ')) ? ' ' : '';
        textarea.value = currentValue + separator + finalTranscript;
        this.saveDraftDebounced();
        this.handleThoughtsInput(); // 触发输入事件处理
      }
    };

    this.recognition.onerror = (event) => {
      console.error('语音识别错误:', event.error);
      this.showStatus('❌ 语音识别错误: ' + event.error, 'error');
      this.stopRecording();
    };

    this.recognition.onend = () => {
      this.stopRecording();
      console.log('语音识别已结束');
    };

    // 开始录音
    try {
      this.recognition.start();
    } catch (error) {
      console.error('无法启动语音识别:', error);
    }
  }

  // API语音输入 (Soniox等)
  async toggleApiVoiceInput(btn, provider) {
    // 如果正在录音，停止并处理
    if (this.mediaRecorder && this.isRecording) {
      this.mediaRecorder.stop();
      return;
    }

    // 开始录音
    try {
      this.showStatus('🎤 正在请求麦克风权限...', 'info');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      this.audioChunks = [];
      this.mediaRecorder = new MediaRecorder(stream);

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.onstop = async () => {
        this.isRecording = false;
        btn.classList.remove('recording');

        // 停止所有轨道
        stream.getTracks().forEach(track => track.stop());

        if (this.audioChunks.length === 0) {
          this.showStatus('⚠️ 未检测到语音数据', 'warning');
          return;
        }

        const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' }); // Chrome 录音默认 webm
        await this.sendAudioToTranscribe(audioBlob, provider);
      };

      this.mediaRecorder.start();
      this.isRecording = true;
      btn.classList.add('recording');
      this.showStatus('🎤 正在录音...再次点击结束并识别', 'info');

    } catch (error) {
      console.error('API录音启动失败:', error);
      this.handleMicError(error);
    }
  }

  // 发送音频进行识别
  async sendAudioToTranscribe(audioBlob, provider) {
    this.showStatus('🔄 正在识别语音...', 'info');
    const textarea = document.getElementById('thoughtsContent');

    // 将Blob转换为Base64，因为sendMessage不能直接发送Blob (sometimes tricky across contexts)
    // Actually standard API allows sending Blobs now, but Base64 is safer for older interactions.
    // Let's try sending Blob directly first? No, chrome.runtime.sendMessage needs JSON serializable usually EXCEPT for internal structured clones.
    // But standard way is FileReader.

    const reader = new FileReader();
    reader.readAsDataURL(audioBlob);
    reader.onloadend = () => {
      const base64Audio = reader.result;

      chrome.runtime.sendMessage({
        action: 'transcribeAudio',
        audioData: base64Audio, // Data URL
        provider: provider
      }, (response) => {
        if (chrome.runtime.lastError) {
          this.showStatus('❌ 识别请求失败: ' + chrome.runtime.lastError.message, 'error');
          return;
        }

        if (response && response.success) {
          const currentValue = textarea.value;
          const separator = (currentValue && !currentValue.endsWith('\n') && !currentValue.endsWith(' ')) ? ' ' : '';
          textarea.value = currentValue + separator + response.text;
          this.saveDraftDebounced();
          this.handleThoughtsInput();
          this.showStatus('✅ 识别完成', 'success');
        } else {
          this.showStatus('❌ 识别失败: ' + (response?.error || '未知错误'), 'error');
        }
      });
    };
  }

  handleMicError(error) {
    if (error.name === 'NotAllowedError') {
      this.showStatus('❌ 麦克风权限被拒绝，请在浏览器设置中允许', 'error');
    } else if (error.name === 'NotFoundError') {
      this.showStatus('❌ 未检测到麦克风设备', 'error');
    } else {
      this.showStatus('❌ 无法访问麦克风: ' + error.message, 'error');
    }
  }
  // 停止录音
  stopRecording() {
    const btn = document.getElementById('voiceInputBtn');
    this.isRecording = false;
    btn.classList.remove('recording');
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch (e) { /* ignore */ }
    }
    this.showStatus('✅ 语音输入完成', 'success');
  }

  // 初始化界面数据
  async initializeInterface() {
    try {
      if (!currentTab) {
        await this.getCurrentTab();
      }

      if (currentTab) {
        // 显示基本页面信息
        document.getElementById('pageTitle').textContent = currentTab.title || '未知页面';
        document.getElementById('pageUrl').textContent = currentTab.url || '';

        this.showStatus('🔍 正在分析页面内容...', 'info');

        // 请求页面信息
        await this.requestPageInfo();

        // 检查是否有存储的选中文本
        await this.checkStoredSelectedText();

        this.showStatus('✅ 页面分析完成', 'success');
      }
    } catch (error) {
      console.error('初始化失败:', error);
      this.showStatus('⚠️ 页面分析失败，但仍可手动输入', 'warning');
    }
  }

  // 请求页面信息
  async requestPageInfo() {
    if (!currentTab) {
      console.log('没有当前标签页，跳过页面信息请求');
      return;
    }

    console.log('请求页面信息，标签页ID:', currentTab.id);

    try {
      // 请求页面标题和URL
      console.log('发送getPageInfo消息...');
      const response = await chrome.tabs.sendMessage(currentTab.id, {
        action: 'getPageInfo'
      });

      console.log('getPageInfo响应:', response);
      if (response) {
        this.updatePageInfo(response);
      }

      // 请求选中文本
      console.log('发送getSelectedText消息...');
      const selectedResponse = await chrome.tabs.sendMessage(currentTab.id, {
        action: 'getSelectedText'
      });

      console.log('getSelectedText响应:', selectedResponse);
      if (selectedResponse && selectedResponse.text) {
        this.updateSelectedText(selectedResponse.text);
      }
    } catch (error) {
      console.error('请求页面信息失败:', error);
    }
  }

  // 更新页面信息
  updatePageInfo(data) {
    if (data.title) {
      document.getElementById('pageTitle').textContent = data.title;
    }
    if (data.url) {
      document.getElementById('pageUrl').textContent = data.url;
    }
  }

  // 更新选中文本（增强版）
  updateSelectedText(text) {
    console.log('Side Panel更新选中文本:', text ? `"${text.substring(0, 50)}..."` : '无选中');

    if (text && text.trim() && text !== selectedText) {
      selectedText = text.trim();
      document.getElementById('selectedContent').value = selectedText;
      document.getElementById('selectedSection').style.display = 'block';

      // 清除之前的总结
      selectedSummary = '';
      document.getElementById('selectedSummaryContent').value = '';
      document.getElementById('selectedSummaryContainer').style.display = 'none';

      // 显示字数统计
      const charCount = selectedText.length;
      const wordInfo = charCount < 100 ? '(较短)' : charCount < 500 ? '' : '(较长)';
      this.showStatus(`📝 已选中 ${charCount} 字 ${wordInfo}`, 'info');

      console.log('选中文本已更新，长度:', selectedText.length);
    } else if (!text || !text.trim()) {
      document.getElementById('selectedSection').style.display = 'none';
      selectedText = '';
      selectedSummary = '';
      console.log('选中文本已清空');
    }
  }

  // 检查存储的选中文本
  async checkStoredSelectedText() {
    try {
      const result = await StorageService.getLocal(['currentSelectedText', 'selectedTextTabId']);
      if (result.currentSelectedText && result.selectedTextTabId === currentTab?.id) {
        console.log('发现存储的选中文本:', result.currentSelectedText.substring(0, 50) + '...');
        this.updateSelectedText(result.currentSelectedText);
      }
    } catch (error) {
      console.error('检查存储的选中文本失败:', error);
    }
  }

  // 手动刷新选中文本
  async refreshSelectedText() {
    try {
      console.log('手动刷新选中文本');
      this.showStatus('🔄 正在检查选中文本...', 'info');

      // 先检查存储的文本
      await this.checkStoredSelectedText();

      // 然后请求当前页面的选中文本
      if (currentTab) {
        const response = await chrome.tabs.sendMessage(currentTab.id, {
          action: 'getSelectedText'
        });

        if (response && response.text) {
          console.log('获取到当前选中文本:', response.text.substring(0, 50) + '...');
          this.updateSelectedText(response.text);
          this.showStatus('✅ 选中文本已更新', 'success');
        } else {
          this.showStatus('ℹ️ 当前页面没有选中文本', 'info');
        }
      }
    } catch (error) {
      console.error('刷新选中文本失败:', error);
      this.showStatus('⚠️ 刷新失败，请重新选中文本', 'warning');
    }
  }

  // 刷新页面数据
  async refreshPageData() {
    await this.getCurrentTab();
    await this.requestPageInfo();
  }

  // 生成AI摘要（流式版本）
  async generateAISummary() {
    const btn = document.getElementById('aiGenerateBtn');
    const loading = document.getElementById('aiLoading');
    const text = document.getElementById('aiGenerateText');

    try {
      btn.disabled = true;
      btn.classList.add('loading');
      loading.style.display = 'inline-block';
      text.textContent = '生成中...';

      // 设置提交按钮AI生成状态
      this.setAIGeneratingState(true);

      console.log('开始流式生成页面AI摘要');
      this.showStatus('🤖 正在生成页面AI摘要...', 'info');

      // 获取页面内容
      let pageContent = '';
      try {
        const contentResponse = await chrome.tabs.sendMessage(currentTab.id, {
          action: 'getPageContent'
        });
        pageContent = contentResponse?.content || '';
      } catch (error) {
        console.warn('获取页面内容失败，使用标题:', error);
        pageContent = currentTab?.title || '';
      }

      // 发送流式请求到background script
      const response = await chrome.runtime.sendMessage({
        action: 'generateAISummaryStreaming',
        content: pageContent,
        title: currentTab?.title,
        url: currentTab?.url,
        tabId: currentTab?.id
      });

      console.log('流式AI摘要请求已发送:', response);

      // 如果不是流式响应，按原来方式处理
      if (response && response.success && !response.streaming) {
        this.setSummaryContent(response.summary);
        if (response.tags && response.tags.length > 0) {
          response.tags.forEach(tag => {
            const cleanTag = tag.replace(/^#/, '');
            if (cleanTag && !currentTags.includes(cleanTag)) {
              this.addTag(cleanTag);
            }
          });
        }
        btn.disabled = false;
        btn.classList.remove('loading');
        loading.style.display = 'none';
        text.textContent = 'AI总结';
        this.setAIGeneratingState(false);
        this.showStatus('✅ AI摘要生成成功，已添加建议标签', 'success');
      } else if (response && !response.success) {
        throw new Error(response.error || '未知错误');
      }
      // 如果是流式响应 (response.streaming = true)，UI 更新由 handleMessage 处理

    } catch (error) {
      console.error('AI摘要生成失败:', error);
      this.showStatus('❌ AI摘要生成失败: ' + error.message, 'error');
      btn.disabled = false;
      btn.classList.remove('loading');
      loading.style.display = 'none';
      text.textContent = 'AI总结';
      this.setAIGeneratingState(false);
    }
  }

  // 生成选中文本摘要（修复版）
  async generateSelectedTextSummary() {
    if (!selectedText) {
      this.showStatus('❌ 请先选中文本', 'error');
      return;
    }

    const btn = document.getElementById('selectedAiBtn');
    const loading = document.getElementById('selectedAiLoading');
    const text = document.getElementById('selectedAiText');

    try {
      btn.disabled = true;
      btn.classList.add('loading');
      loading.style.display = 'inline-block';
      text.textContent = '生成中...';

      // 设置提交按钮AI生成状态
      this.setAIGeneratingState(true);

      console.log('开始生成选中文本AI总结，文本长度:', selectedText.length);
      this.showStatus('🤖 正在生成选中文本AI总结...', 'info');

      // 使用统一的generateAISummary action，通过isSelection参数区分
      const response = await chrome.runtime.sendMessage({
        action: 'generateAISummary',
        content: selectedText,
        title: currentTab?.title,
        url: currentTab?.url,
        tabId: currentTab?.id,
        isSelection: true // 标识这是选中文本总结
      });

      console.log('选中文本AI总结响应:', response);

      if (response && response.success) {
        selectedSummary = response.summary;
        document.getElementById('selectedSummaryContent').value = selectedSummary;
        document.getElementById('selectedSummaryContainer').style.display = 'block';

        // 添加AI建议的标签
        if (response.tags && response.tags.length > 0) {
          console.log('选中文本AI建议的标签:', response.tags);
          console.log('当前标签列表:', currentTags);
          response.tags.forEach(tag => {
            // 移除#号前缀，因为addTag会处理格式
            const cleanTag = tag.replace(/^#/, '');
            console.log('处理选中文本标签:', tag, '→', cleanTag);
            if (cleanTag && !currentTags.includes(cleanTag)) {
              console.log('添加选中文本新标签:', cleanTag);
              this.addTag(cleanTag);
            } else {
              console.log('跳过选中文本标签（已存在或为空）:', cleanTag);
            }
          });
          console.log('选中文本标签添加完成，最终标签列表:', currentTags);
        } else {
          console.log('选中文本AI响应中没有标签信息');
        }

        this.showStatus('✅ 选中内容AI总结成功，已添加建议标签', 'success');
      } else {
        const errorMsg = response?.error || '未知错误';
        console.error('AI总结失败:', errorMsg);
        this.showStatus('❌ AI总结失败: ' + errorMsg, 'error');
      }
    } catch (error) {
      console.error('选中文本AI总结失败:', error);

      // 检查是否是扩展上下文失效
      if (error.message && error.message.includes('Extension context invalidated')) {
        this.showStatus('❌ 扩展需要重新加载，请刷新页面后重试', 'error');
      } else if (error.message && error.message.includes('Could not establish connection')) {
        this.showStatus('❌ 扩展连接失败，请重新加载扩展', 'error');
      } else {
        this.showStatus('❌ 选中文本AI总结失败: ' + error.message, 'error');
      }
    } finally {
      btn.disabled = false;
      btn.classList.remove('loading');
      loading.style.display = 'none';
      text.textContent = 'AI总结';
      this.setAIGeneratingState(false);
    }
  }

  // 清除选中内容
  async clearSelectedContent() {
    try {
      // 清除内存变量
      selectedText = '';
      selectedSummary = '';

      // 清除界面显示
      document.getElementById('selectedContent').value = '';
      document.getElementById('selectedSummaryContent').value = '';
      document.getElementById('selectedSection').style.display = 'none';
      document.getElementById('selectedSummaryContainer').style.display = 'none';

      // 清除storage缓存
      await StorageService.removeLocal(['currentSelectedText', 'selectedTextTabId', 'selectedTextTimestamp']);

      console.log('选中内容已完全清除（包括缓存）');
      this.showStatus('✅ 已清除选中内容', 'success');
    } catch (error) {
      console.error('清除选中内容失败:', error);
      this.showStatus('❌ 清除失败: ' + error.message, 'error');
    }
  }

  // 移动选中内容摘要
  moveSelectedSummary(target) {
    if (!selectedSummary) {
      this.showStatus('❌ 没有可移动的摘要内容', 'error');
      return;
    }

    const targetElement = target === 'summary'
      ? document.getElementById('summaryContent')
      : document.getElementById('thoughtsContent');

    const currentValue = targetElement.value;
    const newValue = currentValue ? `${currentValue}\n\n${selectedSummary}` : selectedSummary;
    targetElement.value = newValue;

    this.showStatus(`✅ 已移动到${target === 'summary' ? '原文摘要' : '个人想法'}`, 'success');
  }

  // 切换选中摘要编辑状态
  toggleSelectedSummaryEdit() {
    const textarea = document.getElementById('selectedSummaryContent');
    const btn = document.getElementById('editSummaryBtn');

    if (textarea.readOnly) {
      textarea.readOnly = false;
      textarea.focus();
      btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>';
      btn.title = '保存编辑';
    } else {
      textarea.readOnly = true;
      selectedSummary = textarea.value;
      btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>';
      btn.title = '编辑总结';
      this.showStatus('✅ 摘要已保存', 'success');
    }
  }

  // 添加标签
  addTag(tagText) {
    if (!tagText || currentTags.includes(tagText)) return;

    currentTags.push(tagText);
    this.updateTagsDisplay();
    this.saveDraftDebounced();
    this.updateSubmitButtonState();
  }

  // 移除标签
  removeTag(tagText) {
    const index = currentTags.indexOf(tagText);
    if (index > -1) {
      currentTags.splice(index, 1);
      this.updateTagsDisplay();
      this.saveDraftDebounced();
      this.updateSubmitButtonState();
    }
  }

  // 更新标签显示
  updateTagsDisplay() {
    const container = document.getElementById('tagsContainer');
    container.innerHTML = '';

    currentTags.forEach(tag => {
      const tagElement = document.createElement('div');
      tagElement.className = 'tag';

      // 创建标签文本
      const tagText = document.createElement('span');
      tagText.textContent = tag;
      tagElement.appendChild(tagText);

      // 创建删除按钮
      const removeBtn = document.createElement('button');
      removeBtn.className = 'tag-remove';
      removeBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>';
      removeBtn.addEventListener('click', () => this.removeTag(tag));
      tagElement.appendChild(removeBtn);

      container.appendChild(tagElement);
    });

    // 输入框总是可见的，不需要额外的添加按钮
  }

  // 提交到Flomo
  async submitToFlomo() {
    const btn = document.getElementById('submitBtn');
    // 保存原始内容以便恢复
    const originalContent = `
      <span class="icon">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" class="submit-icon" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 7-7 7 7"/><path d="M12 19V5"/></svg>
      </span>
      <span class="label">提交到 Blinko</span>`;

    try {
      btn.disabled = true;
      btn.innerHTML = '<span class="loading-spinner"></span><span class="label">提交中...</span>';

      const data = {
        title: document.getElementById('pageTitle').textContent,
        url: document.getElementById('pageUrl').textContent,
        summary: document.getElementById('summaryContent').value,
        thoughts: document.getElementById('thoughtsContent').value,
        selectedText: selectedText,
        selectedSummary: selectedSummary,
        tags: currentTags
      };

      // 格式化数据 (复用 background.js 的逻辑，这里稍微简化)
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

      // 直接调用 Service (Sidepanel 允许)
      await BlinkoService.saveNote(content);

      this.showStatus('✅ 提交成功！', 'success');
      // 清空表单
      document.getElementById('summaryContent').value = '';
      document.getElementById('thoughtsContent').value = '';
      await this.clearSelectedContent();
      currentTags = [];
      this.updateTagsDisplay();
      // 清除草稿
      await this.clearDraft();

    } catch (error) {
      console.error('提交失败:', error);
      this.showStatus('❌ 提交失败: ' + error.message, 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = originalContent;
    }
  }

  // 测试Blinko连接
  async testBlinkoConnection() {
    const btn = document.getElementById('testBlinkoBtn');
    const originalHtml = btn.innerHTML;

    try {
      btn.disabled = true;
      btn.innerHTML = '<span class="loading-spinner" style="width: 14px; height: 14px; border-width: 2px;"></span>';
      this.showStatus('🔗 正在测试Blinko连接...', 'info');

      // 获取当前配置的 URL 和 Token
      const settings = await StorageService.getSync(['blinkoUrl', 'blinkoToken']);

      const result = await BlinkoService.testConnection(settings.blinkoUrl, settings.blinkoToken);

      if (result.success) {
        this.showStatus('✅ Blinko连接测试成功', 'success');

        // 如果 URL 建议更新，自动保存
        if (result.url && result.url !== settings.blinkoUrl) {
          await StorageService.setSync({ blinkoUrl: result.url });
          this.showStatus('✅ 已自动修正 API 地址', 'success');
        }
      } else {
        this.showStatus('❌ Blinko连接测试失败: ' + result.error, 'error');
      }
    } catch (error) {
      console.error('Blinko连接测试失败:', error);
      this.showStatus('❌ Blinko连接测试失败: ' + error.message, 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = originalHtml;
    }
  }

  // 测试AI连接
  async testAIConnection() {
    const btn = document.getElementById('testAIBtn');
    const originalHtml = btn.innerHTML;

    try {
      btn.disabled = true;
      btn.innerHTML = '<span class="loading-spinner" style="width: 14px; height: 14px; border-width: 2px;"></span>';
      this.showStatus('🧠 正在测试AI连接...', 'info');

      const response = await chrome.runtime.sendMessage({
        action: 'testAIConnection'
      });

      if (response.success) {
        this.showStatus(`✅ AI连接测试成功 (${response.result?.model || '未知模型'})`, 'success');
      } else {
        this.showStatus('❌ AI连接测试失败: ' + response.error, 'error');
      }
    } catch (error) {
      console.error('AI连接测试失败:', error);
      this.showStatus('❌ AI连接测试失败: ' + error.message, 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = originalHtml;
    }
  }

  // 显示状态信息
  showStatus(message, type = 'info') {
    const statusElement = document.getElementById('statusMessage');
    statusElement.textContent = message;
    statusElement.className = `status-message status-${type}`;

    // 3秒后清除状态
    setTimeout(() => {
      statusElement.textContent = '';
      statusElement.className = 'status-message';
    }, 3000);
  }
}

// 创建全局侧边栏实例
let sidePanelInstance = null;

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', async () => {
  console.log('SidePanel DOM加载完成，开始初始化...');
  try {
    sidePanelInstance = new BlinkoSidePanel();
    await sidePanelInstance.init();
    console.log('SidePanel初始化成功');



  } catch (error) {
    console.error('SidePanel初始化失败:', error);
  }
});

// 导出实例
window.sidePanelInstance = sidePanelInstance;
