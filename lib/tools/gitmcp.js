'use strict';
const { text, cut } = require('../util');
const { callRemoteTool, listRemoteTools } = require('../mcp_remote');

const schema = {
  name: 'gitmcp',
  description: 'GitHub repozitoriyaları üçün GitMCP (gitmcp.io) aləti. Public GitHub repo-nun sənədlərini gətirir, sənəddə semantik axtarış və kod axtarışı edir. Lokal fayllar/ümumi web üçün deyil — yalnız GitHub repo owner/repo ilə işləyir.',
  inputSchema: { type: 'object', properties: {
    owner: { type: 'string', description: 'GitHub owner/təşkilat (məs. "facebook")' },
    repo: { type: 'string', description: 'Repo adı (məs. "react"). owner/repo formatı da qəbul olunur.' },
    action: { type: 'string', enum: ['fetch_docs', 'search_docs', 'search_code', 'list_tools'], description: 'fetch_docs=sənədləri gətir, search_docs=sənəddə axtar, search_code=kodda axtar, list_tools=remote alətləri göstər' },
    query: { type: 'string', description: 'search_docs/search_code üçün axtarış sorğusu' },
  }, required: ['owner', 'repo', 'action'] },
};

const pickTool = (tools, action) => {
  const names = tools.map(t => t.name);
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
  if (typeof owner !== 'string' || !owner.trim()) return { jsonrpc: '2.0', id, ...text('❌ owner tələb olunur', true) };
  if (typeof repo !== 'string' || !repo.trim()) return { jsonrpc: '2.0', id, ...text('❌ repo tələb olunur', true) };
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
      return { jsonrpc: '2.0', id, ...text('❌ action fetch_docs|search_docs|search_code|list_tools olmalıdır', true) };
    }
    if ((action === 'search_docs' || action === 'search_code') && (typeof query !== 'string' || !query.trim())) {
      return { jsonrpc: '2.0', id, ...text('❌ search üçün query tələb olunur', true) };
    }
    const tools = await listRemoteTools(endpoint);
    const tool = pickTool(tools, action);
    if (!tool) return { jsonrpc: '2.0', id, ...text(`❌ Uyğun remote tool tapılmadı. Mövcud: ${tools.map(t=>t.name).join(', ')}`, true) };
    const args = {};
    if (query) args.query = query;
    const result = await callRemoteTool(endpoint, tool.name, args);
    const parts = (result?.content || []).map(c => c.type === 'text' ? c.text : `[${c.type}]`).filter(Boolean);
    const body = parts.join('\n\n').trim() || JSON.stringify(result);
    return { jsonrpc: '2.0', id, ...text(cut(`GitMCP ${owner}/${repo} / ${tool.name}\n\n${body}`)) };
  } catch (e) {
    const msg = e.name === 'AbortError' ? 'timeout' : e.message;
    return { jsonrpc: '2.0', id, ...text(`❌ GitMCP xətası: ${msg}`, true) };
  }
};

module.exports = { schema, handler };
