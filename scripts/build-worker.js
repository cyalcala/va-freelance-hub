const esbuild = require('esbuild');

const banner = `
import * as node_fs from "node:fs";
import * as node_path from "node:path";
import * as node_url from "node:url";
import * as node_crypto from "node:crypto";
import * as node_async_hooks from "node:async_hooks";
import * as node_events from "node:events";
import * as node_stream from "node:stream";
import * as node_util from "node:util";
import * as node_buffer from "node:buffer";
import * as node_os from "node:os";
import * as node_http from "node:http";
import * as node_https from "node:https";
import * as node_zlib from "node:zlib";
import * as node_net from "node:net";
import * as node_tls from "node:tls";
import * as node_querystring from "node:querystring";
import * as node_dns from "node:dns";
import * as node_timers from "node:timers";
import * as node_string_decoder from "node:string_decoder";
import * as node_readline from "node:readline";
import * as node_child_process from "node:child_process";
import * as node_vm from "node:vm";
import * as node_tty from "node:tty";
import * as node_punycode from "node:punycode";
import * as node_assert from "node:assert";
import * as node_worker_threads from "node:worker_threads";
import * as node_constants from "node:constants";
import * as node_module from "node:module";
import * as node_process from "node:process";

const nodeModules = {
  fs: node_fs, "node:fs": node_fs,
  path: node_path, "node:path": node_path,
  url: node_url, "node:url": node_url,
  crypto: node_crypto, "node:crypto": node_crypto,
  async_hooks: node_async_hooks, "node:async_hooks": node_async_hooks,
  events: node_events, "node:events": node_events,
  stream: node_stream, "node:stream": node_stream,
  util: node_util, "node:util": node_util,
  buffer: node_buffer, "node:buffer": node_buffer,
  os: node_os, "node:os": node_os,
  http: node_http, "node:http": node_http,
  https: node_https, "node:https": node_https,
  zlib: node_zlib, "node:zlib": node_zlib,
  net: node_net, "node:net": node_net,
  tls: node_tls, "node:tls": node_tls,
  querystring: node_querystring, "node:querystring": node_querystring,
  dns: node_dns, "node:dns": node_dns,
  timers: node_timers, "node:timers": node_timers,
  string_decoder: node_string_decoder, "node:string_decoder": node_string_decoder,
  readline: node_readline, "node:readline": node_readline,
  child_process: node_child_process, "node:child_process": node_child_process,
  vm: node_vm, "node:vm": node_vm,
  tty: node_tty, "node:tty": node_tty,
  punycode: node_punycode, "node:punycode": node_punycode,
  assert: node_assert, "node:assert": node_assert,
  worker_threads: node_worker_threads, "node:worker_threads": node_worker_threads,
  constants: node_constants, "node:constants": node_constants,
  module: node_module, "node:module": node_module,
  process: node_process, "node:process": node_process
};

globalThis.require = (name) => {
  if (name in nodeModules) {
    return nodeModules[name];
  }
  throw new Error("Dynamic require of " + name + " is not supported in workerd");
};
`;

esbuild.build({
  entryPoints: ['apps/web/entry.ts'],
  bundle: true,
  outfile: 'apps/web/dist/worker.js',
  platform: 'neutral',
  format: 'esm',
  target: 'esnext',
  mainFields: ['module', 'main'],
  banner: {
    js: banner,
  },
  external: [
    'node:*',
    'async_hooks',
    'fs',
    'path',
    'url',
    'crypto',
    'events',
    'stream',
    'util',
    'buffer',
    'os',
    'http',
    'https',
    'zlib',
    'net',
    'tls',
    'querystring',
    'dns',
    'timers',
    'string_decoder',
    'readline',
    'child_process',
    'vm',
    'jimp',
    'probe-image-size',
    '../platform',
    'tty',
    'punycode',
    'assert',
    'worker_threads',
    'constants',
    'module',
    'process'
  ]
}).then(() => {
  console.log('Worker bundled successfully with Node.js built-in polyfills.');
}).catch((err) => {
  console.error('Esbuild bundling failed:', err);
  process.exit(1);
});
