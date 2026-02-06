# mcp-gitlab-server

GitLab MCP Server - 专门用于快速创建 GitLab Merge Request.

## 快速配置

在您的 MCP 客户端配置文件中添加：

```json
{
  "mcpServers": {
    "gitlab": {
      "command": "npx",
      "args": ["-y", "mcp-gitlab-server"],
      "env": {
        "GITLAB_TOKEN": "您的GitLab访问令牌",
        "GITLAB_BASE_URL": "https://gitlab.jinsubao.cn"
      }
    }
  }
}
```

## 建议配置的 AI Rules

为了获得最佳体验，建议在 AI 助手中配置以下规则：

### 1. 分支自动转换

- **后缀**: `-dev` → `-develop`。
- **别名**: `ms` → `master`, `dev` → `develop`。
- **补全**:
  - `X.Y.Z` → `develop-ProjectV-X.Y.Z` (示例: `0.0.1` → `develop-ProjectV-0.0.1`)
  - `X.Y.Z-suffix` → `feat-ProjectV-X.Y.Z-suffix` (示例: `0.0.1-abc` → `feat-ProjectV-0.0.1-abc`)

### 2. 交互规范

- **直接执行**: 收到创建 MR 指令后直接调用工具，无需确认或查询 Git 信息。
- **输出格式**: 成功后仅返回 `MR [#iid](web_url)`。

## 工具参数 (create_merge_request)

| 参数            | 必填 | 说明           |
| --------------- | ---- | -------------- |
| `project_id`    | 是   | GitLab 项目 ID |
| `source_branch` | 是   | 源分支         |
| `target_branch` | 是   | 目标分支       |
| `title`         | 是   | MR 标题        |
| `description`   | 否   | MR 描述        |

## 开发与运行

```bash
npm install
npm start # 本地启动
```

## 许可证

MIT

## 相关链接

- [Model Context Protocol 规范](https://modelcontextprotocol.io/)
- [GitLab API 文档](https://docs.gitlab.com/ee/api/merge_requests.html)
