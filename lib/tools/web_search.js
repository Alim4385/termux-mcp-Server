'use strict';
const { WEB_SEARCH_URL } = require('../config');
const { text, cut } = require('../util');

const schema = {
  name: 'web_search',
  description: 'Search the web (VortexSearch API). Use for current events, facts, prices, weather, time, currency, or topics you are unsure about. Cite results as [id]; verify numbers/dates against returned content.',
  inputSchema: { type: 'object', properties: {
    query: { type: 'string', description: 'Search query' },
    max_results: { type: 'integer', description: 'Number of results (1-8), default 5', minimum: 1, maximum: 8 },
    freshness: { type: 'string', enum: ['day', 'week', 'month', 'year'], description: 'Freshness filter' },
    lang: { type: 'string', enum: ['az', 'tr', 'en', 'ru'], description: 'Query/response language (default: auto)' },
    exclude_domains: { type: 'array', items: { type: 'string' }, description: 'Domains to exclude, e.g. ["reddit.com"]' },
  }, required: ['query'] },
};

const fmtResult = (r) => {
  const id = r.id ?? '?';
  const title = r.title || '(no title)';
  const url = r.url || '';
  const snippet = (r.snippet || '').trim();
  const content = (r.content || '').trim();
  const body = snippet || content.slice(0, 300);
  const date = r.published_at || r.updated_at || r.date_info?.published_at || r.date_info?.updated_at || '';
  const freshness = r.date_info?.freshness || r.date_info?.label || '';
  let out = `[${id}] ${title}\n${url}`;
  if (date || freshness) out += `\nDate: ${[date, freshness].filter(Boolean).join(' | ')}`;
  if (body) out += `\n${body}`;
  return out;
};

const handler = async (params, id) => {
  const query = params.arguments?.query;
  if (typeof query !== 'string' || !query.trim()) {
    return { jsonrpc: '2.0', id, ...text('❌ query is required', true) };
  }
  const maxResults = Math.min(Math.max(Number(params.arguments?.max_results) || 5, 1), 8);
  const freshness = params.arguments?.freshness;
  const lang = params.arguments?.lang;
  const excludeDomains = Array.isArray(params.arguments?.exclude_domains) ? params.arguments.exclude_domains.filter(d => typeof d === 'string').slice(0, 20) : [];

  const u = new URL('/api/search', WEB_SEARCH_URL);
  u.searchParams.set('q', query.trim());
  u.searchParams.set('n', String(maxResults));
  u.searchParams.set('format', 'json');
  if (['day', 'week', 'month', 'year'].includes(freshness)) u.searchParams.set('freshness', freshness);
  if (['az', 'tr', 'en', 'ru'].includes(lang)) u.searchParams.set('lang', lang);
  if (excludeDomains.length) u.searchParams.set('exclude_domains', excludeDomains.join(','));

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 15000);
  try {
    const res = await fetch(u.toString(), { signal: ctrl.signal, headers: { 'Accept': 'application/json' } });
    const raw = await res.text();
    let data;
    try { data = JSON.parse(raw); } catch { return { jsonrpc: '2.0', id, ...text(`❌ Search API did not return JSON (HTTP ${res.status})`, true) }; }
    if (!res.ok) {
      const msg = data?.message || data?.error || `HTTP ${res.status}`;
      return { jsonrpc: '2.0', id, ...text(`❌ Search API error: ${msg}`, true) };
    }
    const results = Array.isArray(data.results) ? data.results : [];
    const meta = data.meta || {};
    let out = `Query: ${data.query || query}\n`;
    if (data.intent) out += `Intent: ${data.intent}`;
    if (meta.confidence) out += ` | confidence: ${meta.confidence}`;
    if (meta.fallback) out += ` | fallback: true`;
    out += `\nSource: ${WEB_SEARCH_URL}\n`;
    if (results.length === 0) {
      out += '\nNo results found.';
    } else {
      out += '\n' + results.map(fmtResult).join('\n\n---\n\n');
    }
    if (data.conflicts?.length) out += `\n\n⚠️ Conflicts: ${data.conflicts.length}`;
    return { jsonrpc: '2.0', id, ...text(cut(out)) };
  } catch (e) {
    const msg = e.name === 'AbortError' ? 'timeout (15s)' : e.message;
    return { jsonrpc: '2.0', id, ...text(`❌ Web search error: ${msg}`, true) };
  } finally {
    clearTimeout(timer);
  }
};

module.exports = { schema, handler };
