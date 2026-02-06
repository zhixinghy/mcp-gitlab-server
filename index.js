#!/usr/bin/env node
import fetch from 'node-fetch'

const GITLAB_TOKEN = process.env.GITLAB_TOKEN
const GITLAB_BASE_URL = process.env.GITLAB_BASE_URL

if (!GITLAB_TOKEN) {
  console.error('错误：未设置 GITLAB_TOKEN，请在环境变量中填写你的 GitLab 访问令牌')
  process.exit(1)
}

if (!GITLAB_BASE_URL) {
  console.error('错误：未设置 GITLAB_BASE_URL，请在环境变量中填写你的 GitLab 服务器地址')
  process.exit(1)
}

const MCP_PROTOCOL_VERSION = '2024-11-05'
const SERVER_INFO = {
  name: 'mcp-server-gitlab',
  version: '0.0.1'
}

const TOOL_SCHEMAS = {
  create_merge_request: {
    name: 'create_merge_request',
    description: '创建 GitLab Merge Request',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'string', description: '项目 ID' },
        source_branch: { type: 'string', description: '源分支' },
        target_branch: { type: 'string', description: '目标分支' },
        title: { type: 'string', description: 'MR 标题' },
        description: { type: 'string', description: 'MR 描述' }
      },
      required: ['project_id', 'source_branch', 'target_branch', 'title']
    }
  }
}

const ResponseBuilder = {
  success(id, result) {
    return { jsonrpc: '2.0', id, result }
  },

  error(id, code, message) {
    return { jsonrpc: '2.0', id, error: { code, message } }
  },

  initializeResponse(id) {
    return this.success(id, {
      protocolVersion: MCP_PROTOCOL_VERSION,
      capabilities: { tools: {} },
      serverInfo: SERVER_INFO
    })
  },

  toolsListResponse(id) {
    return this.success(id, {
      tools: Object.values(TOOL_SCHEMAS)
    })
  },

  mrSuccessResponse(id, data) {
    return this.success(id, {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              id: data.id,
              iid: data.iid,
              web_url: data.web_url,
              source_branch: data.source_branch,
              target_branch: data.target_branch,
              state: data.state
            },
            null,
            2
          )
        }
      ]
    })
  }
}

async function createMergeRequest({ project_id, source_branch, target_branch, title, description }) {
  const res = await fetch(`${GITLAB_BASE_URL}/api/v4/projects/${project_id}/merge_requests`, {
    method: 'POST',
    headers: {
      'PRIVATE-TOKEN': GITLAB_TOKEN,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ source_branch, target_branch, title, description })
  })

  const data = await res.json()

  if (res.status >= 400) {
    throw new Error(data.message || '未知错误')
  }

  return data
}

const RequestHandlers = {
  async initialize(msg) {
    return ResponseBuilder.initializeResponse(msg.id)
  },

  async 'notifications/initialized'() {
    return null // 忽略通知
  },

  async 'tools/list'(msg) {
    return ResponseBuilder.toolsListResponse(msg.id)
  },

  async 'tools/call'(msg) {
    if (msg.params?.name === 'create_merge_request') {
      return await this.handleCreateMR(msg, msg.params.arguments)
    }
    return ResponseBuilder.error(msg.id, -32601, '错误:未知工具')
  },

  async create_merge_request(msg) {
    return await this.handleCreateMR(msg, msg.params)
  },

  async handleCreateMR(msg, params) {
    const { project_id, source_branch, target_branch, title, description } = params

    if (!project_id || !source_branch || !target_branch || !title) {
      return ResponseBuilder.error(
        msg.id,
        -32602,
        '错误:缺少必要字段(project_id, source_branch, target_branch, title)'
      )
    }

    try {
      const data = await createMergeRequest({ project_id, source_branch, target_branch, title, description })
      return ResponseBuilder.mrSuccessResponse(msg.id, data)
    } catch (err) {
      return ResponseBuilder.error(msg.id, -32603, `GitLab API 错误:${err.message}`)
    }
  }
}

async function routeMessage(msg) {
  const handler = RequestHandlers[msg.method]
  if (handler) {
    return await handler.call(RequestHandlers, msg)
  }
  return ResponseBuilder.error(msg.id, -32601, '错误:未知方法')
}

function startServer() {
  process.stdin.setEncoding('utf8')
  console.error('MCP 服务已启动,准备接收请求…')

  let buffer = ''

  process.stdin.on('data', async (chunk) => {
    buffer += chunk

    let lineEnd
    while ((lineEnd = buffer.indexOf('\n')) >= 0) {
      const line = buffer.slice(0, lineEnd)
      buffer = buffer.slice(lineEnd + 1)

      if (!line.trim()) continue

      try {
        const msg = JSON.parse(line)
        const response = await routeMessage(msg)

        if (response) {
          process.stdout.write(JSON.stringify(response) + '\n')
        }
      } catch (err) {
        const errorResponse = ResponseBuilder.error(null, -32700, `解析或执行错误:${err.message}`)
        process.stdout.write(JSON.stringify(errorResponse) + '\n')
      }
    }
  })
}

startServer()
