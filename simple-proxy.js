const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// 基本中间件
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// 健康检查端点
app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        port: PORT
    });
});

// 模拟Galaxy API端点
app.post('/api/mock-amrfinder', (req, res) => {
    console.log('收到AMRFinder分析请求');
    
    // 模拟处理时间
    setTimeout(() => {
        const mockResults = {
            jobId: 'mock_job_' + Date.now(),
            status: 'completed',
            results: [
                {
                    geneSymbol: 'blaTEM-1',
                    subclass: 'BETA-LACTAM',
                    coverage: 100.0,
                    identity: 99.65,
                    elementType: 'AMR'
                },
                {
                    geneSymbol: 'tetA',
                    subclass: 'TETRACYCLINE',
                    coverage: 100.0,
                    identity: 100.0,
                    elementType: 'AMR'
                },
                {
                    geneSymbol: 'aph(3\'-Ia)',
                    subclass: 'KANAMYCIN',
                    coverage: 100.0,
                    identity: 99.26,
                    elementType: 'AMR'
                }
            ]
        };
        
        res.json(mockResults);
    }, 2000); // 2秒延迟模拟分析时间
});

// 文件上传模拟端点
app.post('/api/upload', (req, res) => {
    console.log('收到文件上传请求');
    
    // 模拟上传处理
    setTimeout(() => {
        res.json({
            uploadId: 'upload_' + Date.now(),
            status: 'success',
            message: '文件上传成功'
        });
    }, 1000);
});

// 错误处理中间件
app.use((err, req, res, next) => {
    console.error('服务器错误:', err);
    res.status(500).json({
        error: '服务器内部错误',
        message: err.message
    });
});

// 404处理
app.use((req, res) => {
    res.status(404).json({
        error: '接口不存在',
        path: req.path
    });
});

// 启动服务器
const server = app.listen(PORT, () => {
    console.log('🚀 简化代理服务器已启动');
    console.log(`📱 访问地址: http://localhost:${PORT}`);
    console.log(`🏠 主页: http://localhost:${PORT}/index.html`);
    console.log(`🧬 基因组注释: http://localhost:${PORT}/genome_annotation.html`);
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
        console.error('请尝试使用不同端口: set PORT=3002 && node simple-proxy.js');
        process.exit(1);
    } else {
        console.error('服务器启动失败:', error);
        process.exit(1);
    }
});

module.exports = app;

