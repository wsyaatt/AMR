const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fetch = require('node-fetch');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// Galaxy配置
const GALAXY_URL = 'https://usegalaxy.org';
const GALAXY_API_KEY = '75d7d31ec15222cf80e3857eee1e59d7';

// 中间件配置
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-API-KEY']
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.static('.'));

// 配置文件上传
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 50 * 1024 * 1024 // 50MB
    }
});

// Galaxy API辅助函数
async function galaxyRequest(endpoint, options = {}) {
    const url = `${GALAXY_URL}/api${endpoint}`;
    const headers = {
        'X-API-KEY': GALAXY_API_KEY,
        'Content-Type': 'application/json',
        ...options.headers
    };

    console.log(`Galaxy API请求: ${options.method || 'GET'} ${url}`);

    try {
        const response = await fetch(url, {
            ...options,
            headers,
            timeout: 60000 // 60秒超时
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Galaxy API错误 ${response.status}: ${errorText}`);
        }

        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            return await response.json();
        } else {
            return await response.text();
        }
    } catch (error) {
        console.error('Galaxy API请求失败:', error);
        throw error;
    }
}

// 健康检查
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        galaxy_url: GALAXY_URL,
        port: PORT
    });
});

// 测试Galaxy连接
app.get('/api/test-galaxy', async (req, res) => {
    try {
        const result = await galaxyRequest('/version');
        res.json({
            success: true,
            galaxy_version: result,
            api_key_valid: true
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// 上传文件到Galaxy
app.post('/api/upload', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: '没有文件被上传' });
        }

        console.log('上传文件:', req.file.originalname, `(${req.file.size} bytes)`);

        // 步骤1: 获取当前历史记录
        const histories = await galaxyRequest('/histories');
        let currentHistoryId;
        
        if (histories.length > 0) {
            currentHistoryId = histories[0].id;
        } else {
            // 创建新的历史记录
            const newHistory = await galaxyRequest('/histories', {
                method: 'POST',
                body: JSON.stringify({
                    name: 'AMRFinder Analysis'
                })
            });
            currentHistoryId = newHistory.id;
        }

        console.log('使用历史记录ID:', currentHistoryId);

        // 步骤2: 使用paste内容创建数据集
        const pasteData = {
            'src': 'pasted',
            'paste_content': req.file.buffer.toString('utf8'),
            'name': req.file.originalname,
            'file_type': 'auto',
            'dbkey': '?'
        };

        const response = await fetch(`${GALAXY_URL}/api/histories/${currentHistoryId}/contents`, {
            method: 'POST',
            headers: {
                'X-API-KEY': GALAXY_API_KEY,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(pasteData)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`上传失败: ${response.status} ${errorText}`);
        }

        const result = await response.json();
        console.log('上传成功:', result);

        // 处理不同的返回格式
        let datasetId, datasetName;
        
        if (result.id) {
            // 直接创建数据集的返回格式
            datasetId = result.id;
            datasetName = result.name || req.file.originalname;
        } else if (result.outputs && result.outputs.length > 0) {
            // 工具API的返回格式
            datasetId = result.outputs[0].id;
            datasetName = result.outputs[0].name;
        } else {
            throw new Error('无法从上传结果中获取数据集信息');
        }

        res.json({
            success: true,
            dataset_id: datasetId,
            dataset_name: datasetName,
            history_id: currentHistoryId,
            upload_info: result
        });

    } catch (error) {
        console.error('文件上传错误:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// 运行AMRFinder
app.post('/api/run-amrfinder', async (req, res) => {
    try {
        const { dataset_id, organism = 'Bacteria', history_id } = req.body;

        if (!dataset_id) {
            return res.status(400).json({ error: '缺少dataset_id参数' });
        }

        console.log('运行AMRFinder:', { dataset_id, organism, history_id });

        // 尝试几个可能的AMRFinder工具ID
        const possibleToolIds = [
            'toolshed.g2.bx.psu.edu/repos/iuc/amrfinderplus/amrfinderplus/3.11.26+galaxy0',
            'toolshed.g2.bx.psu.edu/repos/iuc/amrfinderplus/amrfinderplus/3.11.4+galaxy0',
            'amrfinderplus',
            'toolshed.g2.bx.psu.edu/repos/iuc/amrfinderplus/amrfinderplus'
        ];

        let result = null;
        let lastError = null;

        for (const toolId of possibleToolIds) {
            try {
                console.log('尝试工具ID:', toolId);

                // 构建AMRFinder工具参数
                const toolData = {
                    tool_id: toolId,
                    history_id: history_id,
                    inputs: {
                        'nucleotide_input': {
                            'src': 'hda',
                            'id': dataset_id
                        },
                        'organism': organism.toLowerCase(),
                        'report_all_equal': true,
                        'plus': true,
                        'name': true
                    }
                };

                result = await galaxyRequest('/tools', {
                    method: 'POST',
                    body: JSON.stringify(toolData),
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });

                console.log('AMRFinder任务已提交:', result);
                break; // 成功则跳出循环

            } catch (error) {
                console.log(`工具ID ${toolId} 失败:`, error.message);
                lastError = error;
                continue; // 尝试下一个工具ID
            }
        }

        if (!result) {
            throw lastError || new Error('所有AMRFinder工具ID都失败了');
        }

        res.json({
            success: true,
            job_id: result.jobs[0].id,
            job_info: result
        });

    } catch (error) {
        console.error('运行AMRFinder错误:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// 检查任务状态
app.get('/api/job-status/:job_id', async (req, res) => {
    try {
        const { job_id } = req.params;
        
        const result = await galaxyRequest(`/jobs/${job_id}`);
        console.log(`任务状态 ${job_id}:`, result.state);

        res.json({
            success: true,
            job_id: job_id,
            state: result.state,
            job_info: result
        });

    } catch (error) {
        console.error('检查任务状态错误:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// 获取结果
app.get('/api/dataset/:dataset_id', async (req, res) => {
    try {
        const { dataset_id } = req.params;
        
        // 首先检查数据集状态
        const datasetInfo = await galaxyRequest(`/datasets/${dataset_id}`);
        
        if (datasetInfo.state !== 'ok') {
            return res.json({
                success: false,
                state: datasetInfo.state,
                error: '数据集尚未准备好'
            });
        }

        // 下载数据集内容
        const content = await galaxyRequest(`/datasets/${dataset_id}/display`, {
            headers: {
                'Accept': 'text/plain'
            }
        });

        res.json({
            success: true,
            dataset_id: dataset_id,
            state: datasetInfo.state,
            content: content,
            dataset_info: datasetInfo
        });

    } catch (error) {
        console.error('获取数据集错误:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// 获取历史记录
app.get('/api/histories', async (req, res) => {
    try {
        const result = await galaxyRequest('/histories');
        res.json({
            success: true,
            histories: result
        });
    } catch (error) {
        console.error('获取历史记录错误:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// 搜索工具
app.get('/api/tools/search', async (req, res) => {
    try {
        const { q = 'amr' } = req.query;
        const result = await galaxyRequest(`/tools?q=${encodeURIComponent(q)}`);
        res.json({
            success: true,
            tools: result
        });
    } catch (error) {
        console.error('搜索工具错误:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// 获取工具详情
app.get('/api/tools/:tool_id', async (req, res) => {
    try {
        const { tool_id } = req.params;
        const result = await galaxyRequest(`/tools/${tool_id}`);
        res.json({
            success: true,
            tool: result
        });
    } catch (error) {
        console.error('获取工具详情错误:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// 错误处理中间件
app.use((error, req, res, next) => {
    console.error('服务器错误:', error);
    res.status(500).json({
        success: false,
        error: '服务器内部错误',
        message: error.message
    });
});

// 404处理
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: '接口不存在',
        path: req.path
    });
});

// 启动服务器
const server = app.listen(PORT, () => {
    console.log('🚀 Galaxy AMRFinder代理服务器已启动');
    console.log(`📱 访问地址: http://localhost:${PORT}`);
    console.log(`🏠 主页: http://localhost:${PORT}/index.html`);
    console.log(`🧬 基因组注释: http://localhost:${PORT}/genome_annotation.html`);
    console.log(`🔗 Galaxy URL: ${GALAXY_URL}`);
    console.log(`🔑 API Key: ${GALAXY_API_KEY.substring(0, 8)}...`);
    console.log(`⏰ 启动时间: ${new Date().toLocaleString()}`);
});

// 优雅关闭
process.on('SIGTERM', () => {
    console.log('收到SIGTERM信号，正在关闭服务器...');
    server.close(() => {
        console.log('服务器已关闭');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('\n收到SIGINT信号，正在关闭服务器...');
    server.close(() => {
        console.log('服务器已关闭');
        process.exit(0);
    });
});

// 错误处理
server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
        console.error(`❌ 端口 ${PORT} 已被占用`);
        console.error('请尝试使用不同端口: set PORT=3002 && node galaxy-proxy.js');
        process.exit(1);
    } else {
        console.error('服务器启动失败:', error);
        process.exit(1);
    }
});

module.exports = app;
