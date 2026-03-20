# openclaw-sync-cli

跨环境同步 OpenClaw 配置的命令行工具。

帮你在不同机器、不同环境之间一键迁移 OpenClaw 工作区配置，完美适合 "薅各大厂商首月 9.9 体验羊毛" 场景，不用每次重新配置。

## 功能特性

- 📦 **pack** - 打包选中的工作区到压缩包
- 📂 **unpack** - 从压缩包恢复配置到当前环境
- 💾 **backup** - 一键备份当前配置，自动按时间戳命名
- 🔄 **restore** - 从历史备份恢复，交互式选择备份
- 📋 **list** - 列出当前所有工作区
- 🎨 **交互式选择** - 勾选要同步的内容，不用记命令参数
- ⚔️ **冲突处理** - 支持逐个选择覆盖/保留，也支持一键全量覆盖

## 安装

```bash
npm install -g openclaw-sync-cli
```

然后你就可以在终端使用 `ocsync` 命令了。

## 快速开始

### 查看当前配置
```bash
ocsync list
```

### 打包配置
```bash
# 交互式选择
ocsync pack -i -o my-config.tar.gz

# 或者直接指定工作区
ocsync pack -w coding,pm -o my-config.tar.gz
```

### 恢复配置
```bash
ocsync unpack my-config.tar.gz
# 添加 --force 强制覆盖所有
ocsync unpack my-config.tar.gz --force
```

### 一键备份
```bash
ocsync backup
```
自动备份到 `~/.openclaw-backups/`，文件名带时间戳。

### 从备份恢复
```bash
ocsync restore
# 交互式选择备份，然后处理冲突
```

## 命令说明

| 命令 | 说明 |
|------|------|
| `ocsync list` | 列出所有工作区 |
| `ocsync pack [-i] [-o output] [-w workspaces]` | 打包配置 |
| `ocsync unpack <archive> [--force]` | 解压恢复配置 |
| `ocsync backup [-i] [-o dir]` | 创建备份 |
| `ocsync restore [backup-path] [--force]` | 从备份恢复 |

## 适用场景

- **跨机器迁移**：从旧电脑搬到新电脑，一键迁移所有配置
- **薅羊毛体验**：各家 AI 厂商首月 9.9，换账号不用重新配置
- **备份还原**：定期备份配置，防丢失

## 技术栈

- Node.js 18+
- TypeScript 5.x
- Commander.js - CLI 框架
- Inquirer.js - 交互式提示
- chalk - 彩色输出
- tar-fs - 压缩解压

## 开发测试

见 [TESTING.md](./TESTING.md)

## 开发指南

见飞书文档：[https://www.feishu.cn/docx/ROxJd5JTQoxFFGxQFaUcxOHGnnJ](https://www.feishu.cn/docx/ROxJd5JTQoxFFGxQFaUcxOHGnnJ)

## 📁 项目代码结构

```
openclaw-sync-cli/
├── README.md               # 项目介绍
├── TESTING.md              # 测试指引
├── package.json            # 依赖配置
├── tsconfig.json           # TypeScript 配置
├── jest.config.js          # Jest 测试配置
├── src/
│   ├── index.ts            # 入口文件
│   ├── commands/           # CLI 命令
│   │   ├── pack.ts
│   │   ├── unpack.ts
│   │   ├── backup.ts
│   │   ├── restore.ts
│   │   └── list.ts
│   └── utils/              # 工具函数
│       ├── discovery.ts    # 发现 OpenClaw 配置
│       ├── discovery.test.ts
│       ├── pack.ts         # 打包逻辑
│       ├── unpack.ts       # 解压逻辑
│       ├── pack-unpack.test.ts
│       └── interactive.ts  # 交互式选择
└── dist/                   # 编译输出（git ignore）
```

## 许可证

MIT