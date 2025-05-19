class CozeClient {
  // 调用 Coze 工作流
  static async runWorkflow(workflowId, inputs) {
    try {
      const response = await fetch('/api/coze/workflow', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ workflowId, inputs })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || '工作流调用失败');
      }
      
      return data;
    } catch (error) {
      console.error('运行工作流错误:', error);
      throw error;
    }
  }
  
  // 检查工作流状态
  static async checkWorkflowStatus(runId) {
    try {
      const response = await fetch(`/api/coze/workflow/status?runId=${runId}`);
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || '检查工作流状态失败');
      }
      
      return data;
    } catch (error) {
      console.error('检查工作流状态错误:', error);
      throw error;
    }
  }
  
  // 轮询工作流状态直到完成
  static async pollWorkflowUntilComplete(runId, interval = 1000, maxAttempts = 60) {
    return new Promise(async (resolve, reject) => {
      let attempts = 0;
      
      const checkStatus = async () => {
        try {
          const statusData = await this.checkWorkflowStatus(runId);
          
          // 大小写不敏感的状态检查
          const status = statusData.status?.toUpperCase();
          
          if (status === 'COMPLETED' || status === 'COMPLETE' || status === 'SUCCESS') {
            resolve(statusData);
            return;
          }
          
          if (status === 'FAILED' || status === 'FAILURE' || status === 'ERROR') {
            reject(new Error('工作流执行失败'));
            return;
          }
          
          attempts++;
          
          if (attempts >= maxAttempts) {
            reject(new Error('工作流执行超时'));
            return;
          }
          
          // 继续轮询
          setTimeout(checkStatus, interval);
        } catch (error) {
          reject(error);
        }
      };
      
      // 开始轮询
      checkStatus();
    });
  }
}

// 导出 CozeClient
window.CozeClient = CozeClient;
