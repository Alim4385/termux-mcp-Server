'use strict';
const { spawn } = require('child_process');
const path = require('path');
const { text } = require('../util');
const state = require('../state');

const schema = {
  name: 'search',
  description: 'Kod/fayl içində mətn və ya regex axtar. Fayl:line:kontekst qaytarır — böyük faylı tam oxumadan əvvəl grep ilə daraltmaq üçün istifadə et. Binary faylları skip edir.',
  inputSchema: { type: 'object', properties: {
    pattern: { type: 'string', description: 'Axtarılacaq mətn və ya regex' },
    path: { type: 'string', description: 'Axtarış kökü: fayl və ya qovluq (nisbi/mütləq), default cari cwd' },
    glob: { type: 'string', description: 'Yalnız uyğun fayllar (məs. "*.js", "*.{ts,tsx}")' },
    literal: { type: 'boolean', description: 'true olsa pattern düz mətn kimi axtarılır (-F), default false (regex)' },
    case_sensitive: { type: 'boolean', description: 'default true; false olsa -i' },
    context: { type: 'number', description: 'Hər match ətrafında göstəriləcək sətir sayı, default 2, maks 5' },
    max_results: { type: 'number', description: 'Maksimum match sayı, default 50, maks 200' },
  }, required: ['pattern'] },
};

const handler = async (params, id) => {
  const pattern = params.arguments?.pattern;
  if (typeof pattern !== 'string' || !pattern) return { jsonrpc: '2.0', id, ...text('❌ pattern tələb olunur', true) };
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
    p.on('error', (e) => finish({ jsonrpc: '2.0', id, ...text(`❌ grep işə düşmədi: ${e.message}`, true) }));
    p.on('close', (code) => {
      if (code === 2) return finish({ jsonrpc: '2.0', id, ...text(`❌ grep xətası: ${err.trim() || 'invalid pattern'}`, true) });
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
      if (matchCount > maxResults) result += `\n\n...[${matchCount - maxResults}+ nəticə kəsildi, max_results artır və ya pattern-i daralt]...`;
      else result += `\n\n[${matchCount} match]`;
      finish({ jsonrpc: '2.0', id, ...text(result) });
    });
    const timer = setTimeout(() => { try { p.kill('SIGKILL'); } catch {} finish({ jsonrpc: '2.0', id, ...text('❌ search timeout', true) }); }, 15000);
  });
};

module.exports = { schema, handler };
