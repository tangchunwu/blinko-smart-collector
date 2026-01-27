import { StorageService } from './storage-service.js';

/**
 * AI 服务封装
 */
export const AIService = {
       /**
        * 获取实际使用的模型名称
        */
       getActualModelName(settings) {
              const selectedModel = settings.aiModel || 'gpt-3.5-turbo';
              const customModel = settings.aiCustomModel || '';

              if (selectedModel === 'custom' && customModel) {
                     return customModel;
              }
              return selectedModel;
       },

       /**
        * 准备AI请求参数
        */
       prepareRequestParams(settings, messages) {
              const baseUrl = settings.aiBaseUrl || 'https://api.openai.com/v1';
              const model = this.getActualModelName(settings);
              const temperature = settings.aiTemperature || 0.7;
              const maxTokens = settings.aiMaxTokens || 1000;
              const topP = settings.aiTopP || 1.0;

              // 根据总结长度调整maxTokens
              const lengthSettings = {
                     short: Math.min(maxTokens, 300),
                     medium: Math.min(maxTokens, 600),
                     long: Math.min(maxTokens, 1000),
                     adaptive: maxTokens
              };
              const adjustedMaxTokens = lengthSettings[settings.summaryLength] || maxTokens;

              const endpoint = baseUrl.endsWith('/') ? baseUrl + 'chat/completions' : baseUrl + '/chat/completions';

              return {
                     endpoint,
                     headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${settings.aiApiKey}`
                     },
                     body: {
                            model: model,
                            messages: messages,
                            max_tokens: adjustedMaxTokens,
                            temperature: temperature,
                            top_p: topP
                     },
                     timeout: (settings.aiTimeout || 30) * 1000
              };
       },

       /**
        * 生成 AI 摘要 (非流式)
        */
       /**
        * 执行单个 AI 请求 (内部使用)
        */
       async _request(settings, messages, options = {}) {
              const params = this.prepareRequestParams(settings, messages);

              const controller = new AbortController();
              const timeoutId = setTimeout(() => controller.abort(), params.timeout);

              try {
                     const response = await fetch(params.endpoint, {
                            method: 'POST',
                            headers: params.headers,
                            body: JSON.stringify(params.body),
                            signal: controller.signal
                     });

                     clearTimeout(timeoutId);

                     if (!response.ok) {
                            const error = await response.text();

                            // 识别特定错误码，用于决定是否切换模型
                            // 429: Too Many Requests (限流)
                            // 401: Unauthorized (Key错误)
                            // 5xx: Server Error (服务崩溃)
                            const isFailoverWorth = [429, 401, 500, 502, 503, 504].includes(response.status);

                            const errorObj = new Error(`AI服务调用失败: ${response.status} - ${error}`);
                            errorObj.status = response.status;
                            errorObj.shouldFailover = isFailoverWorth;

                            throw errorObj;
                     }

                     const data = await response.json();
                     return data.choices[0].message.content;
              } catch (error) {
                     clearTimeout(timeoutId);
                     if (error.name === 'AbortError') {
                            const e = new Error('AI请求超时，请检查网络连接或增加超时时间');
                            e.shouldFailover = true; // 超时也值得重试
                            throw e;
                     }

                     // 网络错误（如断网）也值得重试
                     if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
                            error.shouldFailover = true;
                     }

                     throw error;
              }
       },

       /**
        * 生成 AI 摘要 (支持多模型备用切换)
        */
       async generateSummary(content, title, contextPrompt = '') {
              const mainSettings = await StorageService.getAISettings();

              if (!mainSettings.aiApiKey) {
                     throw new Error('请先配置AI API密钥');
              }

              // 准备 System Prompt 和 User Message
              let systemPrompt = mainSettings.aiSystemPrompt || '你是一个专业的文章总结助手。请用中文总结文章的核心要点，包括：1）主要观点；2）关键信息；3）实用建议。保持简洁明了，突出价值。';
              if (contextPrompt) {
                     systemPrompt += '\n' + contextPrompt;
              }

              const messages = [
                     { role: 'system', content: systemPrompt },
                     { role: 'user', content: `请总结以下内容：\n\n标题：${title}\n\n内容：${content}` }
              ];

              // 获取备用配置
              const { backupAiConfigs } = await StorageService.getSync(['backupAiConfigs']);
              const backups = backupAiConfigs || [];

              // 构造尝试队列：主配置 + 备用配置
              const attemptQueue = [
                     { config: mainSettings, name: '主模型' },
                     ...backups.map((cfg, idx) => ({ config: cfg, name: `备用模型 ${idx + 1} (${cfg.aiProvider})` }))
              ];

              let lastError = null;

              // 循环尝试
              for (const attempt of attemptQueue) {
                     try {
                            console.log(`正在尝试使用: ${attempt.name} - ${attempt.config.aiModel}`);
                            return await this._request(attempt.config, messages);
                     } catch (error) {
                            console.warn(`${attempt.name} 调用失败:`, error);
                            lastError = error;

                            // 如果该错误不值得切换（例如请求格式严重错误），则直接中断？
                            // 目前策略：只要出错就尝试下一个，尽最大努力成功。
                            // 但如果用户明确取消（虽然这里是后端服务，不太涉及用户交互取消），则应中断

                            if (!error.shouldFailover && attemptQueue.length > 1) {
                                   console.warn('捕获到非故障转移类错误，但为确保成功仍将尝试备用模型');
                            }
                     }
              }

              // 如果所有都失败了
              throw new Error(`所有模型均尝试失败。最后一次错误: ${lastError?.message || '未知错误'}`);
       },

       /**
        * 生成 AI 摘要 (流式)
        * 注意：此函数在 Service Worker 中使用时，回调函数可能需要配合 postMessage 使用
        */
       async generateSummaryStreaming(content, title, contextPrompt = '', onUpdate, onComplete, onError) {
              const settings = await StorageService.getAISettings();
              if (!settings.aiApiKey) {
                     onError(new Error('请先配置AI API密钥'));
                     return;
              }

              let systemPrompt = settings.aiSystemPrompt || '你是一个专业的文章总结助手。';
              if (contextPrompt) systemPrompt += '\n' + contextPrompt;

              const messages = [
                     { role: 'system', content: systemPrompt },
                     { role: 'user', content: `请总结以下内容：\n\n标题：${title}\n\n内容：${content}` }
              ];

              const params = this.prepareRequestParams(settings, messages);
              params.body.stream = true; // 开启流式

              try {
                     const response = await fetch(params.endpoint, {
                            method: 'POST',
                            headers: params.headers,
                            body: JSON.stringify(params.body)
                     });

                     if (!response.ok) {
                            const text = await response.text();
                            throw new Error(`HTTP ${response.status}: ${text}`);
                     }

                     const reader = response.body.getReader();
                     const decoder = new TextDecoder("utf-8");
                     let fullText = "";

                     while (true) {
                            const { value, done } = await reader.read();
                            if (done) break;

                            const chunk = decoder.decode(value, { stream: true });
                            const lines = chunk.split("\n").filter(line => line.trim() !== "");

                            for (const line of lines) {
                                   if (line === "data: [DONE]") continue;
                                   if (line.startsWith("data: ")) {
                                          try {
                                                 const json = JSON.parse(line.substring(6));
                                                 const content = json.choices[0]?.delta?.content || "";
                                                 if (content) {
                                                        fullText += content;
                                                        onUpdate(fullText);
                                                 }
                                          } catch (e) {
                                                 console.warn("解析流式数据失败:", line);
                                          }
                                   }
                            }
                     }

                     onComplete(fullText);

              } catch (error) {
                     onError(error);
              }
       }
};
