'use strict';
const bash = require('./bash');
const view = require('./view');
const createFile = require('./create_file');
const strReplace = require('./str_replace');
const processTool = require('./process');

const tools = [bash, view, createFile, strReplace, processTool];

const list = tools.map((t) => t.schema);
const handlers = Object.fromEntries(tools.map((t) => [t.schema.name, t.handler]));

// name naməlumdursa null qaytarır — çağıran tərəf 'Method not found' formalaşdırsın deyə
const dispatch = async (name, params, id) => {
  const h = handlers[name];
  if (!h) return null;
  return h(params, id);
};

module.exports = { list, dispatch };
