# 🧬 耐药基因分析平台

一个基于Web的耐药基因分析平台，提供AMRFinder数据分析和基因组注释功能。

## ✨ 功能模块

### 📊 流行趋势分析
- 分析amrfinder文件夹内的TSV文件
- 统计月度耐药基因和抗生素流行情况
- 交互式图表展示
- 月度详情和医生建议

### 🧬 基因组注释 (演示版)
- 上传FASTA格式基因组文件
- 模拟AMRFinder注释流程
- 耐药基因检测结果展示
- 结果下载功能

### 🔬 耐药基因分析 (即将推出)
- 深度基因分析
- 系统发育分析

### ⚠️ 风险预测 (即将推出)
- 耐药风险评估
- 治疗方案建议

## 🚀 快速开始

### 方法1: 直接启动 (推荐)
```bash
# Windows用户
双击 start.bat

# 或者手动启动
node simple-proxy.js
```

### 方法2: 使用npm
```bash
npm install
npm start
```

## 📁 文件结构

```
cursor6/
├── index.html              # 主页
├── trend_analysis.html     # 流行趋势分析
├── genome_annotation.html  # 基因组注释
├── simple-proxy.js         # 演示版服务器
├── galaxy-proxy.js         # Galaxy API服务器(高级)
├── start.bat              # Windows启动脚本
├── package.json           # 项目配置
└── README.md             # 说明文档
```

## 🔧 系统要求

- Node.js 14.0 或更高版本
- 现代Web浏览器 (Chrome, Firefox, Safari, Edge)

## 📖 使用说明

### 流行趋势分析
1. 将AMRFinder的TSV结果文件放在 `amrfinder` 文件夹中
2. 文件命名格式: `YYYY-MM-DD-StrainID.tsv`
3. 访问主页，点击"流行趋势分析"
4. 选择amrfinder文件夹开始分析

### 基因组注释
1. 访问主页，点击"基因组注释"
2. 上传FASTA格式的基因组文件
3. 选择生物体类型和数据库版本
4. 开始分析（演示模拟）
5. 查看分析结果和统计信息
6. 下载结果文件

## ⚙️ 配置选项

服务器默认运行在端口3001，可以通过环境变量修改：
```bash
set PORT=3002 && node simple-proxy.js
```

## 🐛 故障排除

### 端口占用
如果端口3001被占用，可以：
1. 使用不同端口启动
2. 或关闭占用端口的程序

### 文件上传问题
- 确保文件格式为FASTA (.fasta, .fa, .fas, .fna)
- 检查文件大小不超过50MB

## 📝 更新日志

### v2.0.0 (最新)
- ✅ 重新设计基因组注释模块
- ✅ 简化服务器架构
- ✅ 改进用户界面
- ✅ 添加演示功能

### v1.0.0
- ✅ 流行趋势分析功能
- ✅ 月度统计和建议
- ✅ 基础Web界面

## 📞 技术支持

如有问题，请检查：
1. Node.js版本是否符合要求
2. 依赖包是否正确安装
3. 端口是否被占用
4. 浏览器控制台是否有错误信息

## 📄 许可证

MIT License - 详见 package.json