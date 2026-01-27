import { CLASSIFICATION_RULES } from './constants.js';

/**
 * 文本分类服务
 */
export const TextClassifier = {
       /**
        * 智能分类内容
        * @param {Object|string} pageInfo 页面信息对象或描述字符串
        * @param {string} url 页面URL
        * @returns {Object} 分类结果
        */
       async classify(pageInfo, url) {
              const domain = new URL(url).hostname;

              // 处理不同类型的输入
              let title = '';
              let description = '';
              let extractedKeywords = [];

              if (typeof pageInfo === 'string') {
                     // 如果pageInfo是字符串，说明是从sidepanel传来的内容
                     description = pageInfo;
              } else if (pageInfo && typeof pageInfo === 'object') {
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
};
