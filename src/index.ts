#!/usr/bin/env node

/**
 * This is a template MCP server that implements a simple notes system.
 * It demonstrates core MCP concepts like resources and tools by allowing:
 * - Listing notes as resources
 * - Reading individual notes
 * - Creating new notes via a tool
 * - Summarizing all notes via a prompt
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { InfoResponse, ParametersResponse, RunWorkflowRequest } from "./type.js";
import { getRequestClient } from "./request.js";


// 从 MCP 配置文件获取 API_KEYS
let API_KEYS: string[] = [];
// 读取配置文件
const apiKey = process?.env?.AGENT_API_KEYS;
API_KEYS = apiKey ? apiKey?.split(',') : [];


// 定义 toolsMap，存储 toolsName 和 API_KEYS 的映射关系
const toolsMap = new Map<string, string>();


/**
 * Create an MCP server with capabilities for resources (to list/read notes),
 * tools (to create new notes), and prompts (to summarize notes).
 */
const server = new Server(
  {
    name: "dify-mcp-server",
    version: "0.0.1",
  },
  {
    capabilities: {
      resources: {},
      tools: {},
      prompts: {},
    },
  }
);


/**
 * Handler that lists available tools.
 */
server.setRequestHandler(ListToolsRequestSchema, async () => {

  const tools = [];

  for (const apiKey of API_KEYS) {
    try {
      // 获取应用信息
      const infoData: InfoResponse = await getRequestClient().get('/v1/info', {
        headers: {
          'Authorization': `Bearer ${apiKey}`
        }
      });


      // 获取应用参数
      const paramsData: ParametersResponse = await getRequestClient().get('/v1/parameters', {
        headers: {
          'Authorization': `Bearer ${apiKey}`
        }
      });


      // 解析 user_input_form 并生成 inputSchema
      const inputSchema = {
        type: "object",
        properties: {} as Record<string, any>,
        required: [] as string[]
      };

      for (const formItem of paramsData.user_input_form) {
        if (formItem['text-input']) {
          const textInput = formItem['text-input'];
          inputSchema.properties[textInput?.variable] = {
            type: "string",
            description: textInput.label
          };
          if (textInput.required) {
            inputSchema.required.push(textInput?.variable);
          }
        } else if (formItem['select']) {
          const select = formItem['select'];
          inputSchema.properties[select?.variable] = {
            type: "string",
            description: select.label,
            enum: select.options
          };
          if (select.required) {
            inputSchema.required.push(select?.variable);
          }
        } else if (formItem['paragraph']) {
          const paragraph = formItem['paragraph'];
          inputSchema.properties[paragraph?.variable] = {
            type: "string",
            description: paragraph.label
          };
          if (paragraph.required) {
            inputSchema.required.push(paragraph?.variable);
          }
        }
        // else if (formItem['file_upload']) {
        //     const fileUpload = formItem['file_upload'];
        //     inputSchema.properties[fileUpload?.variable] = {
        //         type: "string",
        //         description: fileUpload?.label
        //     };
        //     if (fileUpload?.required) {
        //         inputSchema.required.push(fileUpload?.variable);
        //     }
        // } else if (formItem['image']) {
        //     const image = formItem['image'];
        //     inputSchema.properties[image?.variable] = {
        //         type: "string",
        //         description: image.label
        //     };
        //     if (image?.required) {
        //         inputSchema.required.push(image?.variable);
        //     }
        // }
      }

      const toolName = `agentx_app_info_${infoData.name}`;
      toolsMap.set(toolName, apiKey);

      // 组装 tool 描述
      tools.push({
        name: `agentx_app_info_${infoData.name}`,
        description: `${infoData.description} (tags: ${infoData.tags?.join(', ')})`,
        inputSchema: inputSchema,
        metadata: {
          info: infoData,
          parameters: paramsData
        }
      });
    } catch (error) {
      console.error(`加载 API Key ${apiKey} 时出错:`, error);
      // 继续处理下一个API Key
      continue;
    }
  }

  return {
    tools: tools
  }

  // return {
  //   tools: [
  //     {
  //       name: "create_note",
  //       description: "Create a new note",
  //       inputSchema: {
  //         type: "object",
  //         properties: {
  //           title: {
  //             type: "string",
  //             description: "Title of the note"
  //           },
  //           content: {
  //             type: "string",
  //             description: "Text content of the note"
  //           }
  //         },
  //         required: ["title", "content"]
  //       }
  //     }
  //   ]
  // };
});

/**
 * Handler for the create_note tool.
 * Creates a new note with the provided title and content, and returns success message.
 */

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const methodName = request.params.name;
  const apiKey = toolsMap.get(methodName);
  if (!apiKey) {
    throw new Error(`Tool ${methodName} not found`);
  }

  // 构建 /workflows/run 请求体
  const workflowRequest: RunWorkflowRequest = {
    inputs: request.params.arguments || {},
    response_mode: 'blocking',
    // 默认使用流式模式 streaming 流式模式（推荐）。基于 SSE（Server-Sent Events）实现类似打字机输出方式的流式返回。
    // blocking 阻塞模式，等待执行完毕后返回结果。（请求若流程较长可能会被中断）。 由于 Cloudflare 限制，请求会在 100 秒超时无返回后中断。
    user: 'default_user' // 默认用户标识，可根据需要替换
  };

  // 调用 /workflows/run 接口
  const workflowResponse = await getRequestClient().post('/v1/workflows/run',
    workflowRequest,
    {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Authorization': `Bearer ${apiKey}`
      }
    });

  // 处理响应
  //response_mode: 'blocking' = CompletionResponse 
  const result = workflowResponse;
  return {
    content: [{
      type: "text",
      text: JSON.stringify(result?.data?.error || result?.data?.outputs)
    }]
  };
});






/**
 * Start the server using stdio transport.
 * This allows the server to communicate via standard input/output streams.
 */
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});

