const axios = require('axios');

async function testCozeWorkflow() {
    console.log('开始测试Coze工作流...');
    
    const prompt = "一只可爱的猫咪，坐在窗台上看着窗外的雨";
    console.log('提示词:', prompt);

    const requestBody = {
        workflow_id: "7497867481949192227",
        space_id: "7460521430900490277",
        inputs: {
            prompt: prompt
        },
        stream: false
    };

    console.log('请求体:', JSON.stringify(requestBody, null, 2));

    try {
        const response = await axios({
            method: 'post',
            url: 'https://api.coze.cn/open_api/v2/workflow/run',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer pat_CMLtOVIKxXR5ZZnXtF62W5WIS22e4eKKI7vD8i1j8f5Uey4rHU4yohWROp1vf6yw',
                'Accept': 'application/json'
            },
            data: requestBody
        });

        console.log('响应状态码:', response.status);
        console.log('响应头:', response.headers);
        console.log('响应数据:', JSON.stringify(response.data, null, 2));

        if (response.data.code === 0) {
            console.log('工作流执行成功!');
            console.log('生成的图片URL:', response.data.data.image_url);
        } else {
            console.log('工作流执行失败:', response.data.message);
        }
    } catch (error) {
        console.log('测试失败:', error.message);
        if (error.response) {
            console.log('错误状态码:', error.response.status);
            console.log('错误响应头:', error.response.headers);
            console.log('错误响应数据:', error.response.data);
        }
    }
}

testCozeWorkflow(); 