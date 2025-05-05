/**
 * Coze Bot Publisher
 * 用于发布Coze机器人的API工具
 */

const path = require('path');

// 加载环境变量
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const axios = require('axios');

// 使用环境变量中的API密钥
const COZE_API_KEY = process.env.COZE_API_KEY;

/**
 * 发布Coze机器人
 * @param {string} botId - 要发布的机器人ID
 * @param {Array<string>} connectorIds - 连接器ID列表
 * @returns {Promise} 发布结果
 */
async function publishBot(botId = process.env.COZE_BOT_ID, connectorIds = [process.env.COZE_CONNECTOR_ID]) {
  try {
    console.log(`正在发布机器人 ID: ${botId}`);
    
    // 完全按照curl命令的格式发送请求
    const response = await axios({
      method: 'POST',
      url: 'https://api.coze.cn/v1/bot/publish',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${COZE_API_KEY}`
      },
      // 使用原始的data-raw格式，完全匹配curl命令
      data: {
        bot_id: botId,
        connector_ids: connectorIds
      }
    });
    
    console.log('发布成功:', response.data);
    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    console.error('发布失败:', error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data || error.message
    };
  }
}

// 导出函数以便在server.js中使用
module.exports = {
  publishBot
};

// 如果直接运行此文件，则执行发布操作
if (require.main === module) {
  publishBot()
    .then(result => {
      console.log('执行结果:', result);
      process.exit(result.success ? 0 : 1);
    })
    .catch(err => {
      console.error('执行出错:', err);
      process.exit(1);
    });
}
