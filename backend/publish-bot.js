/**
 * Coze Bot Publisher
 * 用于发布Coze机器人的API工具
 * 支持直接调用API或使用curl命令
 */

const path = require('path');

// 加载环境变量
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const axios = require('axios');
const { exec } = require('child_process');

// 使用环境变量中的API密钥 - 仅在服务器端使用，不暴露在前端
const COZE_API_KEY = process.env.COZE_API_KEY;

/**
 * 使用axios直接调用API发布机器人
 */
async function publishBotWithAxios(botId = process.env.COZE_BOT_ID, connectorIds = [process.env.COZE_CONNECTOR_ID]) {
  try {
    console.log(`[Axios] 正在发布机器人 ID: ${botId}`);
    
    const response = await axios({
      method: 'POST',
      url: 'https://api.coze.cn/v1/bot/publish',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${COZE_API_KEY}`
      },
      data: {
        bot_id: botId,
        connector_ids: connectorIds
      }
    });
    
    console.log('[Axios] 发布响应:', response.data);
    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    console.error('[Axios] 发布失败:', error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data || error.message
    };
  }
}

/**
 * 发布Coze机器人
 * @param {string} botId - 要发布的机器人ID
 * @param {Array<string>} connectorIds - 连接器ID列表
 * @returns {Promise} 发布结果
 */
/**
 * 使用curl命令发布机器人
 */
function publishBotWithCurl(botId = process.env.COZE_BOT_ID, connectorIds = [process.env.COZE_CONNECTOR_ID]) {
  return new Promise((resolve, reject) => {
    console.log(`[Curl] 正在发布机器人 ID: ${botId}`);
    
    // 构建与原始curl命令完全一致的命令
    const curlCommand = `curl --location --request POST 'https://api.coze.cn/v1/bot/publish' \\
--header 'Content-Type: application/json' \\
--header 'Authorization: Bearer ${COZE_API_KEY}' \\
--data-raw '{
    "bot_id": "${botId}",
    "connector_ids": [
        "${connectorIds[0]}"
    ]
}'`;
    
    // 执行curl命令
    exec(curlCommand, (error, stdout, stderr) => {
      if (error) {
        console.error('[Curl] 发布失败:', error);
        return reject({
          success: false,
          error: error.message
        });
      }
      
      if (stderr) {
        console.warn('[Curl] 警告:', stderr);
      }
      
      try {
        const responseData = JSON.parse(stdout);
        console.log('[Curl] 发布响应:', responseData);
        resolve({
          success: true,
          data: responseData
        });
      } catch (parseError) {
        console.log('[Curl] 原始响应:', stdout);
        resolve({
          success: true,
          data: stdout
        });
      }
    });
  });
}

/**
 * 发布Coze机器人 - 主函数，尝试使用两种方法
 * @param {string} botId - 要发布的机器人ID
 * @param {Array<string>} connectorIds - 连接器ID列表
 * @returns {Promise} 发布结果
 */
async function publishBot(botId = process.env.COZE_BOT_ID, connectorIds = [process.env.COZE_CONNECTOR_ID]) {
  // 先尝试使用axios调用API
  try {
    const axiosResult = await publishBotWithAxios(botId, connectorIds);
    if (axiosResult.success && !axiosResult.data.code) {
      return axiosResult;
    }
    
    console.log('尝试使用curl方式发布...');
    return await publishBotWithCurl(botId, connectorIds);
  } catch (error) {
    console.error('两种方式都失败:', error);
    return {
      success: false,
      error: error.message || '发布失败'
    };
  }
}

// 导出函数以便在server.js中使用
module.exports = {
  publishBot,
  publishBotWithAxios,
  publishBotWithCurl
};

// 如果直接运行此文件，则执行发布操作
if (require.main === module) {
  console.log('测试Coze机器人发布模块...');
  publishBot()
    .then(result => {
      console.log('执行结果:', JSON.stringify(result, null, 2));
      process.exit(result.success ? 0 : 1);
    })
    .catch(err => {
      console.error('执行出错:', err);
      process.exit(1);
    });
}
