/**
 * 页面内容提取工具
 * 运行在页面上下文中 (Content Script)
 */

export const ContentExtractor = {
       /**
        * 提取页面所有详情（元数据+正文+关键词）
        */
       extractAll() {
              const metadata = this.extractMetadata();
              const article = this.extractArticleContent();
              const keywords = this.extractKeywords(article.content || document.body.innerText);

              // 合并结果
              return {
                     ...metadata,
                     content: article.content,
                     excerpt: article.excerpt,
                     wordCount: article.content ? article.content.length : 0,
                     extractedKeywords: keywords
              };
       },

       /**
        * 提取页面元数据
        */
       extractMetadata() {
              const title = document.title;
              const description = document.querySelector('meta[name="description"]')?.content ||
                     document.querySelector('meta[property="og:description"]')?.content || '';
              const keywords = document.querySelector('meta[name="keywords"]')?.content || '';
              const author = document.querySelector('meta[name="author"]')?.content ||
                     document.querySelector('[rel="author"]')?.textContent || '';

              return {
                     title,
                     description,
                     keywords: keywords.split(',').map(k => k.trim()).filter(k => k),
                     author,
                     domain: window.location.hostname,
                     pathname: window.location.pathname,
                     url: window.location.href
              };
       },

       /**
        * 提取正文内容 (Readability 简化版)
        */
       extractArticleContent() {
              // 克隆文档以避免修改原始 DOM
              const documentClone = document.cloneNode(true);
              const body = documentClone.body;

              // 移除不需要的元素
              const removeSelectors = [
                     'script', 'style', 'noscript', 'iframe', 'embed', 'object',
                     'nav', 'header', 'footer', 'aside',
                     '[role="navigation"]', '[role="banner"]', '[role="contentinfo"]',
                     '.nav', '.navbar', '.navigation', '.menu', '.sidebar', '.widget',
                     '.advertisement', '.ad', '.ads', '.advert', '.sponsor',
                     '.comment', '.comments', '#comments', '.social', '.share',
                     '.related', '.recommended', '.popular', '.trending',
                     '.newsletter', '.subscribe', '.subscription',
                     '.popup', '.modal', '.overlay', '.cookie',
                     '.breadcrumb', '.pagination', '.pager'
              ];

              removeSelectors.forEach(selector => {
                     try {
                            body.querySelectorAll(selector).forEach(el => el.remove());
                     } catch (e) { /* 忽略无效选择器 */ }
              });

              // 尝试找到主要内容区域
              const contentSelectors = [
                     'article', '[role="main"]', 'main',
                     '.post-content', '.article-content', '.entry-content',
                     '.content', '.post', '.article', '.story',
                     '#content', '#main', '#article'
              ];

              let mainContent = null;
              for (const selector of contentSelectors) {
                     mainContent = body.querySelector(selector);
                     if (mainContent && mainContent.textContent.trim().length > 200) {
                            break;
                     }
              }

              // 如果没有找到特定内容区域，使用整个 body
              if (!mainContent || mainContent.textContent.trim().length < 200) {
                     mainContent = body;
              }

              // 提取文本内容
              const textContent = mainContent.innerText || mainContent.textContent || '';

              // 清理文本：移除多余空白行
              const cleanedContent = textContent
                     .split('\n')
                     .map(line => line.trim())
                     .filter(line => line.length > 0)
                     .join('\n');

              // 提取标题
              let title = document.title;
              const h1 = document.querySelector('h1');
              if (h1 && h1.textContent.trim()) {
                     title = h1.textContent.trim();
              }

              // 提取摘要 (前 200 字符)
              const excerpt = cleanedContent.substring(0, 200).trim() + '...';

              return {
                     title: title,
                     content: cleanedContent,
                     excerpt: excerpt,
                     isReadability: true
              };
       },

       /**
        * 从文本提取关键词
        */
       extractKeywords(text) {
              if (!text) return [];

              const commonWords = ['的', '了', '在', '是', '我', '有', '和', '就', '不', '人', '都', '一', '个', '上', '也', '很', '到', '说', '要', '去', '你', '会', '着', 'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'this', 'that', 'these', 'those'];

              // 简单的分词（中英文）
              const ws = text.toLowerCase().match(/[\u4e00-\u9fa5]+|[a-zA-Z]+/g) || [];
              const wordFreq = {};

              ws.forEach(word => {
                     if (word.length > 1 && !commonWords.includes(word)) {
                            wordFreq[word] = (wordFreq[word] || 0) + 1;
                     }
              });

              return Object.entries(wordFreq)
                     .sort(([, a], [, b]) => b - a)
                     .slice(0, 10)
                     .map(([word]) => word);
       },

       /**
        * 检测页面类型
        */
       detectPageType() {
              const title = document.title.toLowerCase();
              const domain = window.location.hostname;
              const url = window.location.href;

              // 技术文档
              if (domain.includes('github.com') ||
                     domain.includes('stackoverflow.com') ||
                     domain.includes('developer.mozilla.org') ||
                     title.includes('documentation') ||
                     title.includes('api')) {
                     return 'tech';
              }

              // 新闻资讯
              if (domain.includes('news') ||
                     title.includes('news') ||
                     domain.includes('bbc.com') ||
                     domain.includes('cnn.com')) {
                     return 'news';
              }

              // 学术论文
              if (domain.includes('arxiv.org') ||
                     domain.includes('scholar.google') ||
                     title.includes('paper') ||
                     title.includes('research')) {
                     return 'academic';
              }

              // 博客文章
              if (url.includes('/blog/') ||
                     domain.includes('medium.com') ||
                     domain.includes('dev.to')) {
                     return 'blog';
              }

              return 'general';
       }
};
