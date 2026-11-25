'use strict';
const { text, cut } = require('../util');
const { callRemoteTool, listRemoteTools } = require('../mcp_remote');

const DEFAULT_URL = 'https://mcp.context7.com/mcp';

const schema = {
  name: 'context7',
  description: 'Context7 documentation tool for libraries/frameworks. Resolves a library name to a Context7 library ID and fetches up-to-date docs/code examples. Use for library/API docs, setup, configuration, or code examples. Not for local files or general web search.',
  inputSchema: { type: 'object', properties: {
    action: { type: 'string', enum: ['resolve', 'query', 'list_tools'], description: 'resolve=find library ID by name; query=fetch docs for a library ID; list_tools=list remote Context7 tools' },
    libraryName: { type: 'string', description: 'For resolve: library/package name to search for (e.g. "next.js", "react", "supabase")' },
    query: { type: 'string', description: 'For resolve: what you want to accomplish (helps ranking). For query: specific documentation question/topic' },
    libraryId: { type: 'string', description: 'For query: Context7-compatible library ID (e.g. "/vercel/next.js"), usually from resolve' },
    language: { type: 'string', description: 'For query (optional): programming language to prioritize in examples (e.g. "TypeScript", "Python")' },
    version: { type: 'string', description: 'For query (optional): library version (e.g. "15.4.3", "14")' },
  }, required: ['action'] },
};

const getHeaders = () => {
  const key = process.env.CONTEXT7_API_KEY || process.env.MCP_CONTEXT7_API_KEY;
  return key ? { 'Authorization': `Bearer ${key}` } : {};
};

const pickTool = (tools, action) => {
  const find = (pred) => tools.find(t => pred(t.name));
  if (action === 'resolve') return find(n => n === 'resolve-library-id' || n.includes('resolve'));
  if (action === 'query') return find(n => n === 'query-docs' || n.includes('query'));
  return null;
};

const handler = async (params, id) => {
  const a = params.arguments || {};
  const action = a.action;
  const endpoint = (process.env.MCP_CONTEXT7_URL || DEFAULT_URL).replace(/\/+$/, '');
  const headers = getHeaders();

  try {
    if (action === 'list_tools') {
      const tools = await listRemoteTools(endpoint, 20000, headers);
      const out = tools.map(t => `- ${t.name}: ${t.description || ''}`).join('\n');
      return { jsonrpc: '2.0', id, ...text(cut(`Context7 tools:\n${out || '(none)'}`)) };
    }
    if (action !== 'resolve' && action !== 'query') {
      return { jsonrpc: '2.0', id, ...text('❌ action must be resolve|query|list_tools', true) };
    }

    const tools = await listRemoteTools(endpoint, 20000, headers);
    const tool = pickTool(tools, action);
    if (!tool) return { jsonrpc: '2.0', id, ...text(`❌ No suitable remote tool found. Available: ${tools.map(t=>t.name).join(', ')}`, true) };

    const args = {};
    if (action === 'resolve') {
      if (typeof a.libraryName !== 'string' || !a.libraryName.trim()) return { jsonrpc: '2.0', id, ...text('❌ libraryName is required for resolve', true) };
      if (typeof a.query !== 'string' || !a.query.trim()) return { jsonrpc: '2.0', id, ...text('❌ query is required for resolve', true) };
      args.libraryName = a.libraryName.trim();
      args.query = a.query.trim();
    } else {
      if (typeof a.libraryId !== 'string' || !a.libraryId.trim()) return { jsonrpc: '2.0', id, ...text('❌ libraryId is required for query', true) };
      if (typeof a.query !== 'string' || !a.query.trim()) return { jsonrpc: '2.0', id, ...text('❌ query is required for query', true) };
      args.libraryId = a.libraryId.trim();
      args.query = a.query.trim();
      if (typeof a.language === 'string' && a.language.trim()) args.language = a.language.trim();
      if (typeof a.version === 'string' && a.version.trim()) args.version = a.version.trim();
    }

    const result = await callRemoteTool(endpoint, tool.name, args, 30000, headers);
    const parts = (result?.content || []).map(c => c.type === 'text' ? c.text : `[${c.type}]`).filter(Boolean);
    const body = parts.join('\n\n').trim() || JSON.stringify(result);
    return { jsonrpc: '2.0', id, ...text(cut(`Context7 ${action} / ${tool.name}\n\n${body}`)) };
  } catch (e) {
    const msg = e.name === 'AbortError' ? 'timeout' : e.message;
    return { jsonrpc: '2.0', id, ...text(`❌ Context7 error: ${msg}`, true) };
  }
};

module.exports = { schema, handler };
