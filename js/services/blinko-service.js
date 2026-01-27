import { StorageService } from './storage-service.js';

/**
 * Blinko 服务封装
 * 统一处理笔记保存、连接测试、URL修正等逻辑
 */
export const BlinkoService = {

       /**
        * 保存笔记到 Blinko
        * @param {string} content - 笔记内容
        * @param {number} type - 笔记类型 (默认为0)
        * @returns {Promise<void>}
        */
       async saveNote(content, type = 0) {
              const settings = await StorageService.getSync(['blinkoUrl', 'blinkoToken']);

              if (!settings.blinkoUrl || !settings.blinkoToken) {
                     throw new Error('请先配置 Blinko API');
              }

              // 确保 Token 有 Bearer 前缀
              const token = this._formatToken(settings.blinkoToken);

              await this._request(settings.blinkoUrl, 'POST', {
                     content: content,
                     type: type
              }, token);
       },

       /**
        * 测试连接（包含智能修复逻辑）
        * @param {string} url - API 地址
        * @param {string} token - API Token
        * @returns {Promise<{success: boolean, url?: string, token?: string, error?: string}>}
        */
       async testConnection(url, token) {
              if (!url || !token) {
                     return { success: false, error: '请填写完整的配置' };
              }

              const testContent = {
                     content: '🔧 Blinko扩展连接测试 - ' + new Date().toLocaleString(),
                     type: 0
              };

              // 生成变体
              const urlVariants = this._generateUrlVariants(url);
              const tokenFormats = [
                     this._formatToken(token),    // 标准格式
                     token.trim(),                // 原始值
                     `Bearer ${token.trim()}`     // 强制加前缀
              ];
              // 去重 Token
              const uniqueTokens = [...new Set(tokenFormats)];

              let lastError = null;

              // 尝试所有组合
              for (const currentUrl of urlVariants) {
                     for (const currentToken of uniqueTokens) {
                            try {
                                   await this._request(currentUrl, 'POST', testContent, currentToken);

                                   // 成功！
                                   return {
                                          success: true,
                                          url: currentUrl,
                                          token: currentToken
                                   };
                            } catch (error) {
                                   lastError = error;
                                   // 401 可能是 Token 错，继续试
                                   // 404 可能是 URL 错，继续试
                                   // 其他错误也继续试，直到试完所有组合
                            }
                     }
              }

              return {
                     success: false,
                     error: lastError ? lastError.message : '连接测试失败'
              };
       },

       /**
        * 内部通用请求方法
        * @private
        */
       async _request(endpoint, method, body, token) {
              const response = await fetch(endpoint, {
                     method: method,
                     headers: {
                            'Content-Type': 'application/json',
                            'Authorization': token
                     },
                     body: JSON.stringify(body)
              });

              if (!response.ok) {
                     const errorText = await response.text().catch(() => '');
                     throw new Error(`HTTP ${response.status}: ${errorText || response.statusText}`);
              }

              // 有些接口可能不返回 JSON，如果是 204 或空内容需小心
              const text = await response.text();
              try {
                     return text ? JSON.parse(text) : {};
              } catch {
                     return text;
              }
       },

       /**
        * 格式化 Token (添加 Bearer)
        * @private
        */
       _formatToken(token) {
              if (!token) return '';
              token = token.trim();
              if (token.toLowerCase().startsWith('bearer ')) {
                     return token;
              }
              return `Bearer ${token}`;
       },

       /**
        * 生成 URL 变体
        * @private
        */
       _generateUrlVariants(url) {
              const variants = [url];
              // 单复数转换
              if (url.includes('/note/')) variants.push(url.replace('/note/', '/notes/'));
              if (url.includes('/notes/')) variants.push(url.replace('/notes/', '/note/'));

              return [...new Set(variants)];
       }
};
