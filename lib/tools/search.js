'use strict';
const { spawn } = require('child_process');
const path = require('path');
const { text } = require('../util');
const state = require('../state');

const schema = {
  name: 'search',
  description: 'Search for text or regex inside code/files. Returns file:line:context — use to narrow before reading a large file fully. Skips binary files.',
  inputSchema: { type: 'object', properties: {
    pattern: { type: 'string', description: 'Text or regex to search for' },
    path: { type: 'string', description: 'Search root: file or directory (relative/absolute), default current cwd' },
    glob: { type: 'string', description: 'Only matching files (e.g. "*.js", "*.{ts,tsx}")' },
    literal: { type: 'boolean', description: 'If true, searches pattern as literal text (-F), default false (regex)' },
    case_sensitive: { type: 'boolean', description: 'default true; false adds -i' },
    context: { type: 'number', description: 'Number of context lines around each match, default 2, max 5' },
    max_results: { type: 'number', description: 'Maximum number of matches, default 50, max 200' },
  }, required: ['pattern'] },
};

const handler = async (params, id) => {
  const pattern = params.arguments?.pattern;
  if (typeof pattern !== 'string' || !pattern) return { jsonrpc: '2.0', id, ...text('❌ pattern is required', true) };
  const searchPath = state.resolvePath(params.arguments?.path || '.');
  const rawContext = Number(params.arguments?.context);
  const context = Math.min(Math.max(Number.isFinite(rawContext) ? rawContext : 2, 0), 5);
  const maxResults = Math.min(Math.max(Number(params.arguments?.max_results) || 50, 1), 200);
  const args = ['-rnIH', '--color=never'];
  if (params.arguments?.literal === true) args.push('-F');
  if (params.arguments?.case_sensitive === false) args.push('-i');
  if (context > 0) args.push(`-C${context}`);
  if (typeof params.arguments?.glob === 'string' && params.arguments.glob) args.push(`--include=${params.arguments.glob}`);
  args.push('--', pattern, searchPath);

  return await new Promise((resolve) => {
    let out = '', err = '', done = false;
    const finish = (v) => { if (!done) { done = true; clearTimeout(timer); resolve(v); } };
    const p = spawn('grep', args, { cwd: state.getCwd() });
    const MAXB = 200000;
    p.stdout.on('data', (d) => { if (out.length < MAXB) out += d.toString('utf8'); });
    p.stderr.on('data', (d) => { if (err.length < MAXB) err += d.toString('utf8'); });
    p.on('error', (e) => finish({ jsonrpc: '2.0', id, ...text(`❌ grep failed to start: ${e.message}`, true) }));
    p.on('close', (code) => {
      if (code === 2) return finish({ jsonrpc: '2.0', id, ...text(`❌ grep error: ${err.trim() || 'invalid pattern'}`, true) });
      if (code === 1 || !out.trim()) return finish({ jsonrpc: '2.0', id, ...text('No matches found.') });
      // limit matches by counting match lines (file:line:content)
      const lines = out.split('\n');
      const matchLineRe = /^(.+?):(\d+):(.*)$/;
      let matchCount = 0, cutIndex = lines.length;
      for (let i = 0; i < lines.length; i++) {
        if (matchLineRe.test(lines[i])) {
          matchCount++;
          if (matchCount > maxResults) { cutIndex = i; break; }
        }
      }
      let result = lines.slice(0, cutIndex).join('\n').trimEnd();
      if (matchCount > maxResults) result += `\n\n...[${matchCount - maxResults}+ results truncated, increase max_results or narrow pattern]...`;
      else result += `\n\n[${matchCount} match${matchCount === 1 ? '' : 'es'}]`;
      finish({ jsonrpc: '2.0', id, ...text(result) });
    });
    const timer = setTimeout(() => { try { p.kill('SIGKILL'); } catch {} finish({ jsonrpc: '2.0', id, ...text('❌ search timeout', true) }); }, 15000);
  });
};

module.exports = { schema, handler };
