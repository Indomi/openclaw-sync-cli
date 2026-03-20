# openclaw-sync-cli 测试指南

本文档说明如何测试 `openclaw-sync-cli` 功能，产品经理、设计师、开发都能照着测。

## 环境准备

1. 已经安装了 Node.js 18+ 和 npm
2. 克隆项目并安装依赖：

```bash
git clone <repository-url>
cd openclaw-sync-cli
npm install
npm run build
```

3. 把命令链接到全局（可选，但方便测试）：

```bash
npm link
```

现在你可以在任何地方直接用 `ocsync` 命令了。

---

## 测试用例

### ✅ 测试 1：list - 列出当前配置

**步骤：**
```bash
ocsync list
```

**预期结果：**
- 显示 OpenClaw 基础路径（一般是 `/root/.openclaw` 或 `/home/xxx/.openclaw`）
- 列出所有工作区，显示每个工作区的名字、路径、文件数量
- 如果有企业微信配置，会显示企业微信配置路径

---

### ✅ 测试 2：pack - 打包所有工作区

**步骤：**
```bash
# 非交互式打包所有
ocsync pack --no-interactive -o test-all.tar.gz
```

**预期结果：**
- 显示发现了 N 个工作区
- 显示打包了 N 个工作区
- 最后输出：
  ```
  ✅ Pack completed successfully!
     Output: test-all.tar.gz
     Files: XX
     Size: XX MB
  ```
- 文件 `test-all.tar.gz` 成功生成

---

### ✅ 测试 3：pack - 交互式选择打包

**步骤：**
```bash
ocsync pack -i -o test-selected.tar.gz
```

**预期结果：**
- 会显示 checkbox，让你勾选要打包哪些工作区
- 如果有企业微信配置，会问你是否包含企业微信配置
- 选择后打包，结果同测试 2

---

### ✅ 测试 4：pack - 打包指定工作区

**步骤：**
```bash
# 假设你有一个叫 coding 的工作区
ocsync pack -w coding -o test-coding.tar.gz
```

**预期结果：**
- 只打包 `coding` 这一个工作区
- 文件数量比测试 2 少

---

### ✅ 测试 5：unpack - 冲突检测（不覆盖）

**步骤：**
```bash
# 用之前打包的文件解压到当前环境，因为文件都已存在，所以全部冲突
ocsync unpack test-all.tar.gz
```

**预期结果：**
- 显示找到 N 个冲突文件
- 一个一个问你怎么处理：
  ```
  Conflict: workspace-coding/SOUL.md
  What would you like to do?
  (Use arrow keys)
  ❯ Overwrite this file
    Keep existing file (skip)
    Overwrite all files
    Keep all existing files
  ```
- 选择 "Keep all existing files" 后，解压完成，0 个文件被覆盖

---

### ✅ 测试 6：unpack --force - 强制覆盖所有

**步骤：**
```bash
ocsync unpack test-all.tar.gz --force
```

**预期结果：**
- 直接覆盖所有已存在文件
- 不会问你任何问题
- 最后显示解压了多少个文件

---

### ✅ 测试 7：backup - 交互式备份

**步骤：**
```bash
ocsync backup
```

**预期结果：**
- 进入交互式选择，和 pack -i 一样
- 选择后自动备份到 `~/.openclaw-backups/` 目录，文件名带时间戳：
  ```
  openclaw-backup-2026-03-21T00-39-31-234Z.tar.gz
  ```
- 自动维护 `backups.json` 记录所有备份

---

### ✅ 测试 8：restore - 从备份恢复

**步骤：**
```bash
ocsync restore
```

**预期结果：**
- 列出 `~/.openclaw-backups/` 里所有备份，最新的排在最前面并标记 (latest)
- 让你选择恢复哪个备份
- 选完之后的冲突处理和 unpack 一样（交互式逐个处理或 --force）

---

### ✅ 测试 9：单元测试（开发测试）

**步骤：**
```bash
npm test
```

**预期结果：**
- 所有测试通过：
  ```
  Test Suites: 2 passed, 2 total
  Tests:       7 passed, 7 total
  ```

---

## 测试场景 - 薅羊毛迁移真实场景

从 A 机器迁移配置到 B 机器：

1. **在 A 机器上：**
   ```bash
   ocsync backup
   # 交互式选择所有要迁移的工作区
   # 备份完成后，下载备份文件到本地
   ```

2. **在 B 机器上：**
   ```bash
   # 上传备份文件到 B 机器
   ocsync restore /path/to/your-backup.tar.gz
   # 根据需要选择覆盖或保留现有文件
   ```

3. **验证：**
   - 打开 B 机器的 OpenClaw，能看到迁移过来的工作区和所有配置文件
   - 配置文件内容和 A 机器一致

---

## 常见问题

**Q: 解压时报 "invalid signature"**
A: 这是旧版 unzipper 依赖的问题，已经修复为 tar-fs，如果还碰到请删除压缩包重新打包。

**Q: 哪些文件会被打包？**
A: 工作区目录下所有文件，自动排除 `node_modules`、`.git`、`dist` 等构建产物。

**Q: 支持同步企业微信配置吗？**
A: 支持，打包时可以选择是否包含 `wecomConfig/config.json`。
