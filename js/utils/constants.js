/**
 * 项目通用常量定义
 */

// 智能分类规则配置
export const CLASSIFICATION_RULES = {
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

// 默认用户配置
export const DEFAULT_CONFIG = {
       blinkoUrl: 'https://ccnu.me/api/v1/note/upsert',
       blinkoToken: '',
       aiApiKey: '',
       aiProvider: 'openai',
       aiBaseUrl: 'https://api.openai.com/v1',
       aiModel: 'gpt-3.5-turbo',
       aiCustomModel: '',
       aiTemperature: 0.7,
       aiMaxTokens: 1000,
       aiTopP: 1.0,
       aiTimeout: 60,
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
       autoExtractKeywords: true,
       theme: 'default',
       popupPosition: 'default',
       enableSelectedTextFeature: true,
       voiceProvider: 'browser',
       sonioxApiKey: ''
};

// 预定义的提示词模板
export const PROMPT_TEMPLATES = {
       default: '你是一个专业的文章总结助手。请用中文总结文章的核心要点，包括：1）主要观点；2）关键信息；3）实用建议。保持简洁明了，突出价值。',
       notebook: '你是一位资深的专业编辑、知识管理专家与认知结构设计师。你不仅擅长忠实总结内容，还非常擅长将信息转化为可长期复用、可直接行动的个人笔记。用户的目标是：在未来不重新阅读原文的前提下，仅通过这份笔记，就能迅速恢复核心观点、判断逻辑，并直接用于思考或实践。请输出两部分：【🧠 原文摘要】使用列表格式，覆盖核心问题、主要观点、关键结论，不出现主观措辞；【🧩 可复用笔记】包含：1️⃣一句话价值定位 2️⃣核心判断模型/思维公式 3️⃣可直接套用的使用原则（2-4条，用【可直接用】标注）4️⃣适用边界提醒 5️⃣关键提醒（用💡标注）。写作风格：克制、清晰、偏理性，以未来快速扫一眼就能继续思考为目标。',
       technical: '你是一个技术文档总结专家。请重点关注：1）技术要点和实现方法；2）关键代码和配置；3）最佳实践和注意事项。用简洁的技术语言总结。',
       academic: '你是一个学术论文总结专家。请重点提取：1）研究问题和方法；2）主要发现和结论；3）理论贡献和实际意义。保持学术严谨性。',
       news: '你是一个新闻资讯总结专家。请重点关注：1）事件要点和时间线；2）影响分析和相关方；3）发展趋势和后续关注点。保持客观中立。',
       custom: ''
};

// AI服务商对应的模型选项
export const AI_MODELS = {
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

// 鼓励语数组
export const ENCOURAGEMENT_MESSAGES = [
       '写的好棒呀！✨',
       '这文采真不错！👏',
       '思路很清晰呢！💡',
       '继续加油！🚀',
       '想法很独特！🌟',
       '表达很到位！👍',
       '真有见地！💎',
       '观点很新颖！🎯',
       '写得太好了！🔥',
       '灵感满满！💫',
       '思维活跃！🧠',
       '文笔超赞！📝'
];
