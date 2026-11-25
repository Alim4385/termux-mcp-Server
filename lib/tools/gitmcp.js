'use strict';
const { text, cut } = require('../util');
const { callRemoteTool, listRemoteTools } = require('../mcp_remote');

const schema = {
  name: 'gitmcp',
  description: 'GitMCP (gitmcp.io) tool for GitHub repositories. Fetches documentation, performs semantic doc search, and code search for public GitHub repos. Not for local files or general web — works only with GitHub owner/repo.',
  inputSchema: { type: 'object', properties: {
    owner: { type: 'string', description: 'GitHub owner/organization (e.g. "facebook")' },
    repo: { type: 'string', description: 'Repository name (e.g. "react"). owner/repo format is also accepted.' },
    action: { type: 'string', enum: ['fetch_docs', 'search_docs', 'search_code', 'list_tools'], description: 'fetch_docs=fetch docs, search_docs=search docs, search_code=search code, list_tools=list remote tools' },
    query: { type: 'string', description: 'Search query for search_docs/search_code' },
  }, required: ['owner', 'repo', 'action'] },
};

const pickTool = (tools, action) => {
  const find = (pred) => tools.find(t => pred(t.name));
  if (action === 'fetch_docs') return find(n => n.startsWith('fetch_') && n.includes('doc')) || find(n => n.includes('fetch'));
  if (action === 'search_docs') return find(n => n.startsWith('search_') && n.includes('doc')) || find(n => n.includes('search') && !n.includes('code'));
  if (action === 'search_code') return find(n => n.includes('code'));
  return null;
};

const handler = async (params, id) => {
  let owner = params.arguments?.owner;
  let repo = params.arguments?.repo;
  const action = params.arguments?.action;
  const query = params.arguments?.query;
  if (typeof owner !== 'string' || !owner.trim()) return { jsonrpc: '2.0', id, ...text('❌ owner is required', true) };
  if (typeof repo !== 'string' || !repo.trim()) return { jsonrpc: '2.0', id, ...text('❌ repo is required', true) };
  owner = owner.trim(); repo = repo.trim();
  if (repo.includes('/') && !owner.includes('/')) { const parts = repo.split('/'); owner = parts[0]; repo = parts[1]; }
  if (owner.includes('/')) { const parts = owner.split('/'); owner = parts[0]; repo = parts[1] || repo; }

  const base = (process.env.MCP_GITMCP_BASE || 'https://gitmcp.io').replace(/\/+$/, '');
  const endpoint = `${base}/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;
  try {
    if (action === 'list_tools') {
      const tools = await listRemoteTools(endpoint);
      const out = tools.map(t => `- ${t.name}: ${t.description || ''}`).join('\n');
      return { jsonrpc: '2.0', id, ...text(cut(`GitMCP ${owner}/${repo} tools:\n${out || '(none)'}`)) };
    }
    if (!['fetch_docs', 'search_docs', 'search_code'].includes(action)) {
      return { jsonrpc: '2.0', id, ...text('❌ action must be fetch_docs|search_docs|search_code|list_tools', true) };
    }
    if ((action === 'search_docs' || action === 'search_code') && (typeof query !== 'string' || !query.trim())) {
      return { jsonrpc: '2.0', id, ...text('❌ query is required for search', true) };
    }
    const tools = await listRemoteTools(endpoint);
    const tool = pickTool(tools, action);
    if (!tool) return { jsonrpc: '2.0', id, ...text(`❌ No suitable remote tool found. Available: ${tools.map(t=>t.name).join(', ')}`, true) };
    const args = {};
    if (query) args.query = query;
    const result = await callRemoteTool(endpoint, tool.name, args);
    const parts = (result?.content || []).map(c => c.type === 'text' ? c.text : `[${c.type}]`).filter(Boolean);
    const body = parts.join('\n\n').trim() || JSON.stringify(result);
    return { jsonrpc: '2.0', id, ...text(cut(`GitMCP ${owner}/${repo} / ${tool.name}\n\n${body}`)) };
  } catch (e) {
    const msg = e.name === 'AbortError' ? 'timeout' : e.message;
    return { jsonrpc: '2.0', id, ...text(`❌ GitMCP error: ${msg}`, true) };
  }
};

module.exports = { schema, handler };
