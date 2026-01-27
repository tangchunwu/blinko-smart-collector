/**
 * 存储服务封装
 */
export const StorageService = {
       /**
        * 获取同步配置
        * @param {string[]} keys 
        */
       async getSync(keys) {
              return await chrome.storage.sync.get(keys);
       },

       /**
        * 保存同步配置
        * @param {Object} data 
        */
       async setSync(data) {
              return await chrome.storage.sync.set(data);
       },

       /**
        * 移除同步配置
        * @param {string[]} keys
        */
       async removeSync(keys) {
              return await chrome.storage.sync.remove(keys);
       },

       /**
        * 清空同步配置
        */
       async clearSync() {
              return await chrome.storage.sync.clear();
       },

       /**
        * 获取本地状态
        * @param {string[]} keys 
        */
       async getLocal(keys) {
              return await chrome.storage.local.get(keys);
       },

       /**
        * 保存本地状态
        * @param {Object} data 
        */
       async setLocal(data) {
              return await chrome.storage.local.set(data);
       },

       /**
        * 移除本地状态
        * @param {string[]} keys
        */
       async removeLocal(keys) {
              return await chrome.storage.local.remove(keys);
       },

       /**
        * 清空本地状态
        */
       async clearLocal() {
              return await chrome.storage.local.clear();
       },

       /**
        * 获取AI流式生成状态
        */
       async getAIStreamMode() {
              const { aiStreamMode } = await this.getSync(['aiStreamMode']);
              return !!aiStreamMode;
       },

       /**
        * 获取AI配置
        */
       async getAISettings() {
              return await this.getSync([
                     'aiApiKey', 'aiProvider', 'aiBaseUrl', 'aiModel', 'aiCustomModel', 'aiTemperature',
                     'aiMaxTokens', 'aiTopP', 'aiTimeout', 'aiSystemPrompt', 'summaryLength'
              ]);
       }
};
