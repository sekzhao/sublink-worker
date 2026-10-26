# <div align="center"><img src="public/favicon.png" alt="Sublink Worker" width="100" height="100"/><br><b>Sublink Worker</b> <code>v2.5.0</code></div>

<div align="center">
  <p><i>One Worker, All Subscriptions · 高效聚合与管理您的代理节点</i></p>
  <p><b>轻量级多协议订阅转换与聚合管理工具，支持部署在 Cloudflare Workers、Vercel、Node.js 及 Docker。</b></p>

  <p>
    <img src="https://img.shields.io/badge/version-2.5.0-blue.svg" alt="Version 2.5.0"/>
    <img src="https://img.shields.io/badge/Sing--box-1.15%20Ready-green.svg" alt="Sing-box 1.15"/>
    <img src="https://img.shields.io/badge/Cloudflare-Workers-orange.svg" alt="Cloudflare Workers"/>
    <img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License MIT"/>
  </p>

  <p>
    <a href="https://deploy.workers.cloudflare.com/?url=https://github.com/sekzhao/sublink-worker">
      <img src="https://deploy.workers.cloudflare.com/button" alt="Deploy to Cloudflare Workers" style="height: 32px;"/>
    </a>
  </p>
</div>

---

## 🔥 v2.5.0 重大更新亮点

* **🚀 全面适配 Sing-box 1.15+**：
  * **原生 TCP/IP 协议栈优化**：针对 1.15+ 客户端自动剔除已废弃的 TUN `stack: "mixed"` 配置，消除启动告警并全面激活 sing-box 1.15 原生网络协议栈的高性能与低内存优势。
  * **全新规则集下载架构**：支持规范的顶层 `http_clients` 与 `route.default_http_client` 调度，彻底告别旧版已废弃的 `download_detour`。
  * **自动识别客户端**：自动识别 `sing-box/1.15.x` 客户端 User-Agent，亦支持通过 `&sb_ver=1.15` 或 `&sb_ver=latest` 强制指定。
* **🛡️ 修复 Clash 数组 Path 兼容性（彻底解决 V2RayHTTPOptions 报错）**：
  * 完美解决从 Clash 导入包含 `http-opts.path: ["/"]` 数组路径时，Sing-box 报错崩溃：`json: cannot unmarshal array into Go struct field V2RayHTTPOptions.path of type string`。
  * 内置智能清洗逻辑，全协议层（VMess, VLESS, Trojan, WebSocket, HTTP/2）自动将数组路径转换为标准单一路径字符串。
* **📦 新增开箱即用单文件**：
  * 根目录直接提供已编译好的独立部署脚本 [`sublink-worker-singbox1.15.js`](./sublink-worker-singbox1.15.js)，纯浏览器即可完成 1 分钟快速部署。

---

## 🚀 极速部署指南

### 方式一：网页端单文件部署（最简单、无需配本地环境）

1. 进入 [Cloudflare Dashboard](https://dash.cloudflare.com/)，点击 **Workers & Pages** $\rightarrow$ **Create Worker**，起个名字并部署。
2. 部署完成后点击 **Edit Code**（编辑代码），清空编辑器中的原有代码。
3. 打开本项目根目录下的单文件脚本 [`sublink-worker-singbox1.15.js`](./sublink-worker-singbox1.15.js)，**全选复制全部内容**，粘贴进编辑器中。
4. 点击右上角 **Deploy** 即可上线！

> **（可选）短链接与持久化配置**：若需使用短链接功能，在 Cloudflare 左侧创建名为 `SUBLINK_KV` 的 KV 命名空间，并在 Worker 的 **Settings $\rightarrow$ Variables $\rightarrow$ KV Namespace Bindings** 中将变量 `SUBLINK_KV` 绑定至该命名空间。

---

### 方式二：GitHub 自动集成部署（推荐长期维护）

1. Fork 本仓库 [`sekzhao/sublink-worker`](https://github.com/sekzhao/sublink-worker)。
2. 在 Cloudflare 控制台新建 Worker，进入 **Settings** $\rightarrow$ **Build & Deploy** $\rightarrow$ **Connect Git**。
3. 选择你的 Fork 仓库并关联 `main` 分支，Cloudflare 随后会在每次推送代码时自动拉取并构建部署。

---

### 方式三：Wrangler 命令行部署

```bash
# 1. 克隆仓库
git clone https://github.com/sekzhao/sublink-worker.git
cd sublink-worker

# 2. 安装依赖
npm install

# 3. 部署上线
npx wrangler login
npx wrangler deploy
```

---

## ✨ 核心特性

### 🌐 支持的代理协议
* **ShadowSocks** (AEAD & SIP003)
* **VMess** (TCP, WS, HTTP, gRPC, H2)
* **VLESS** (Reality, TLS, WS, gRPC, HTTP)
* **Hysteria2** (端口跳跃, 混淆, 带宽设置)
* **Trojan** (TLS, Reality, WS, gRPC)
* **TUIC** (bbr, 拥塞控制, 0-RTT)
* **AnyTLS**

### 📱 客户端订阅输出
* **Sing-Box**（原生支持 **1.15+**、1.14、1.12 及 1.11 旧版向下兼容）
* **Clash / Mihomo (Clash.Meta)**（支持 .mrs 与 rule-providers）
* **Surge**（标准 INI 配置、按需分流策略）
* **Xray / V2Ray**（标准 Base64 订阅）

### ⚙️ 核心能力
* **多源聚合**：支持将多个不同机场、不同格式的 Base64 链接、HTTP 订阅或完整配置文件聚合为单一订阅。
* **分流策略模板**：内置最小化（Minimal）、均衡（Balanced）、完整（Complete）等主流分流规则预设，支持自定义分流规则。
* **智能分组**：按国家与地区自动提取旗帜 Emoji 并分组、支持自动测速节点选择组（urltest）与手动选择组。
* **美观 Web 管理端**：自带现代化明亮/暗黑自适应 UI 界面与多语言支持（中文、English、波斯语、俄语）。

---

## 🛠️ 订阅转换 API 参数说明

你也可以直接通过 API 接口进行订阅转换（适用于自动化脚本与定时更新）：

### 请求接口：
* `/singbox` - 输出 Sing-box 格式配置 JSON
* `/clash` - 输出 Clash / Mihomo 格式 YAML
* `/surge` - 输出 Surge 配置文件
* `/xray` - 输出 Xray / V2Ray 节点 Base64 订阅

### 核心查询参数：
| 参数名 | 默认值 | 说明 |
| :--- | :--- | :--- |
| `config` | **必填** | 节点链接、订阅 URL 或完整配置文本（URL 编码） |
| `sb_ver` | `auto` | 指定 Sing-box 版本梯队（可选：`1.15`、`latest`、`1.14`、`1.12`、`1.11`）。支持通过 UA 自动探测 |
| `group_by_country`| `false` | 是否开启按国家与地区自动生成策略组 (`true`/`false`) |
| `include_auto_select` | `true` | 是否包含自动测速节点选择组 (`true`/`false`) |
| `selectedRules` | `balanced` | 规则预设名称或规则 JSON 数组 |
| `ua` | 浏览器 UA | 请求上游订阅时使用的自定义 User-Agent |

#### 示例：
```text
https://your-worker.workers.dev/singbox?config=https://example.com/sub&sb_ver=1.15&group_by_country=true
```

---

## 📄 开源许可证

本项目基于 [MIT License](LICENSE) 许可开源。
