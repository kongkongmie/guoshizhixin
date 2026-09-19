(async function () {
    'use strict';
    const hashScript = (() => {
        const module = { exports: {} };
        const process = undefined, window = {}, self = undefined, define = undefined;
/**
 * [js-sha256]{@link https://github.com/emn178/js-sha256}
 *
 */
/*jslint bitwise: true */
(function () {
  'use strict';

  var ERROR = 'input is invalid type';
  var WINDOW = typeof window === 'object';
  var root = WINDOW ? window : {};
  if (root.JS_SHA256_NO_WINDOW) {
    WINDOW = false;
  }
  var WEB_WORKER = !WINDOW && typeof self === 'object';
  var NODE_JS = !root.JS_SHA256_NO_NODE_JS && typeof process === 'object' && process.versions && process.versions.node && process.type != 'renderer';
  if (NODE_JS) {
    root = global;
  } else if (WEB_WORKER) {
    root = self;
  }
  var COMMON_JS = !root.JS_SHA256_NO_COMMON_JS && typeof module === 'object' && module.exports;
  var AMD = typeof define === 'function' && define.amd;
  var ARRAY_BUFFER = !root.JS_SHA256_NO_ARRAY_BUFFER && typeof ArrayBuffer !== 'undefined';
  var HEX_CHARS = '0123456789abcdef'.split('');
  var EXTRA = [-2147483648, 8388608, 32768, 128];
  var SHIFT = [24, 16, 8, 0];
  var K = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
  ];
  var OUTPUT_TYPES = ['hex', 'array', 'digest', 'arrayBuffer'];

  var blocks = [];

  if (root.JS_SHA256_NO_NODE_JS || !Array.isArray) {
    Array.isArray = function (obj) {
      return Object.prototype.toString.call(obj) === '[object Array]';
    };
  }

  if (ARRAY_BUFFER && (root.JS_SHA256_NO_ARRAY_BUFFER_IS_VIEW || !ArrayBuffer.isView)) {
    ArrayBuffer.isView = function (obj) {
      return typeof obj === 'object' && obj.buffer && obj.buffer.constructor === ArrayBuffer;
    };
  }

  var createOutputMethod = function (outputType, is224) {
    return function (message) {
      return new Sha256(is224, true).update(message)[outputType]();
    };
  };

  var createMethod = function (is224) {
    var method = createOutputMethod('hex', is224);
    if (NODE_JS) {
      method = nodeWrap(method, is224);
    }
    method.create = function () {
      return new Sha256(is224);
    };
    method.update = function (message) {
      return method.create().update(message);
    };
    for (var i = 0; i < OUTPUT_TYPES.length; ++i) {
      var type = OUTPUT_TYPES[i];
      method[type] = createOutputMethod(type, is224);
    }
    return method;
  };

  var nodeWrap = function (method, is224) {
    var crypto = require('crypto')
    var Buffer = require('buffer').Buffer;
    var algorithm = is224 ? 'sha224' : 'sha256';
    var bufferFrom;
    if (Buffer.from && !root.JS_SHA256_NO_BUFFER_FROM) {
      bufferFrom = Buffer.from;
    } else {
      bufferFrom = function (message) {
        return new Buffer(message);
      };
    }
    var nodeMethod = function (message) {
      if (typeof message === 'string') {
        return crypto.createHash(algorithm).update(message, 'utf8').digest('hex');
      } else {
        if (message === null || message === undefined) {
          throw new Error(ERROR);
        } else if (message.constructor === ArrayBuffer) {
          message = new Uint8Array(message);
        }
      }
      if (Array.isArray(message) || ArrayBuffer.isView(message) ||
        message.constructor === Buffer) {
        return crypto.createHash(algorithm).update(bufferFrom(message)).digest('hex');
      } else {
        return method(message);
      }
    };
    return nodeMethod;
  };

  var createHmacOutputMethod = function (outputType, is224) {
    return function (key, message) {
      return new HmacSha256(key, is224, true).update(message)[outputType]();
    };
  };

  var createHmacMethod = function (is224) {
    var method = createHmacOutputMethod('hex', is224);
    method.create = function (key) {
      return new HmacSha256(key, is224);
    };
    method.update = function (key, message) {
      return method.create(key).update(message);
    };
    for (var i = 0; i < OUTPUT_TYPES.length; ++i) {
      var type = OUTPUT_TYPES[i];
      method[type] = createHmacOutputMethod(type, is224);
    }
    return method;
  };

  function Sha256(is224, sharedMemory) {
    if (sharedMemory) {
      blocks[0] = blocks[16] = blocks[1] = blocks[2] = blocks[3] =
        blocks[4] = blocks[5] = blocks[6] = blocks[7] =
        blocks[8] = blocks[9] = blocks[10] = blocks[11] =
        blocks[12] = blocks[13] = blocks[14] = blocks[15] = 0;
      this.blocks = blocks;
    } else {
      this.blocks = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    }

    if (is224) {
      this.h0 = 0xc1059ed8;
      this.h1 = 0x367cd507;
      this.h2 = 0x3070dd17;
      this.h3 = 0xf70e5939;
      this.h4 = 0xffc00b31;
      this.h5 = 0x68581511;
      this.h6 = 0x64f98fa7;
      this.h7 = 0xbefa4fa4;
    } else { // 256
      this.h0 = 0x6a09e667;
      this.h1 = 0xbb67ae85;
      this.h2 = 0x3c6ef372;
      this.h3 = 0xa54ff53a;
      this.h4 = 0x510e527f;
      this.h5 = 0x9b05688c;
      this.h6 = 0x1f83d9ab;
      this.h7 = 0x5be0cd19;
    }

    this.block = this.start = this.bytes = this.hBytes = 0;
    this.finalized = this.hashed = false;
    this.first = true;
    this.is224 = is224;
  }

  Sha256.prototype.update = function (message) {
    if (this.finalized) {
      return;
    }
    var notString, type = typeof message;
    if (type !== 'string') {
      if (type === 'object') {
        if (message === null) {
          throw new Error(ERROR);
        } else if (ARRAY_BUFFER && message.constructor === ArrayBuffer) {
          message = new Uint8Array(message);
        } else if (!Array.isArray(message)) {
          if (!ARRAY_BUFFER || !ArrayBuffer.isView(message)) {
            throw new Error(ERROR);
          }
        }
      } else {
        throw new Error(ERROR);
      }
      notString = true;
    }
    var code, index = 0, i, length = message.length, blocks = this.blocks;
    while (index < length) {
      if (this.hashed) {
        this.hashed = false;
        blocks[0] = this.block;
        this.block = blocks[16] = blocks[1] = blocks[2] = blocks[3] =
          blocks[4] = blocks[5] = blocks[6] = blocks[7] =
          blocks[8] = blocks[9] = blocks[10] = blocks[11] =
          blocks[12] = blocks[13] = blocks[14] = blocks[15] = 0;
      }

      if (notString) {
        for (i = this.start; index < length && i < 64; ++index) {
          blocks[i >>> 2] |= message[index] << SHIFT[i++ & 3];
        }
      } else {
        for (i = this.start; index < length && i < 64; ++index) {
          code = message.charCodeAt(index);
          if (code < 0x80) {
            blocks[i >>> 2] |= code << SHIFT[i++ & 3];
          } else if (code < 0x800) {
            blocks[i >>> 2] |= (0xc0 | (code >>> 6)) << SHIFT[i++ & 3];
            blocks[i >>> 2] |= (0x80 | (code & 0x3f)) << SHIFT[i++ & 3];
          } else if (code < 0xd800 || code >= 0xe000) {
            blocks[i >>> 2] |= (0xe0 | (code >>> 12)) << SHIFT[i++ & 3];
            blocks[i >>> 2] |= (0x80 | ((code >>> 6) & 0x3f)) << SHIFT[i++ & 3];
            blocks[i >>> 2] |= (0x80 | (code & 0x3f)) << SHIFT[i++ & 3];
          } else {
            code = 0x10000 + (((code & 0x3ff) << 10) | (message.charCodeAt(++index) & 0x3ff));
            blocks[i >>> 2] |= (0xf0 | (code >>> 18)) << SHIFT[i++ & 3];
            blocks[i >>> 2] |= (0x80 | ((code >>> 12) & 0x3f)) << SHIFT[i++ & 3];
            blocks[i >>> 2] |= (0x80 | ((code >>> 6) & 0x3f)) << SHIFT[i++ & 3];
            blocks[i >>> 2] |= (0x80 | (code & 0x3f)) << SHIFT[i++ & 3];
          }
        }
      }

      this.lastByteIndex = i;
      this.bytes += i - this.start;
      if (i >= 64) {
        this.block = blocks[16];
        this.start = i - 64;
        this.hash();
        this.hashed = true;
      } else {
        this.start = i;
      }
    }
    if (this.bytes > 4294967295) {
      this.hBytes += this.bytes / 4294967296 << 0;
      this.bytes = this.bytes % 4294967296;
    }
    return this;
  };

  Sha256.prototype.finalize = function () {
    if (this.finalized) {
      return;
    }
    this.finalized = true;
    var blocks = this.blocks, i = this.lastByteIndex;
    blocks[16] = this.block;
    blocks[i >>> 2] |= EXTRA[i & 3];
    this.block = blocks[16];
    if (i >= 56) {
      if (!this.hashed) {
        this.hash();
      }
      blocks[0] = this.block;
      blocks[16] = blocks[1] = blocks[2] = blocks[3] =
        blocks[4] = blocks[5] = blocks[6] = blocks[7] =
        blocks[8] = blocks[9] = blocks[10] = blocks[11] =
        blocks[12] = blocks[13] = blocks[14] = blocks[15] = 0;
    }
    blocks[14] = this.hBytes << 3 | this.bytes >>> 29;
    blocks[15] = this.bytes << 3;
    this.hash();
  };

  Sha256.prototype.hash = function () {
    var a = this.h0, b = this.h1, c = this.h2, d = this.h3, e = this.h4, f = this.h5, g = this.h6,
      h = this.h7, blocks = this.blocks, j, s0, s1, maj, t1, t2, ch, ab, da, cd, bc;

    for (j = 16; j < 64; ++j) {
      // rightrotate
      t1 = blocks[j - 15];
      s0 = ((t1 >>> 7) | (t1 << 25)) ^ ((t1 >>> 18) | (t1 << 14)) ^ (t1 >>> 3);
      t1 = blocks[j - 2];
      s1 = ((t1 >>> 17) | (t1 << 15)) ^ ((t1 >>> 19) | (t1 << 13)) ^ (t1 >>> 10);
      blocks[j] = blocks[j - 16] + s0 + blocks[j - 7] + s1 << 0;
    }

    bc = b & c;
    for (j = 0; j < 64; j += 4) {
      if (this.first) {
        if (this.is224) {
          ab = 300032;
          t1 = blocks[0] - 1413257819;
          h = t1 - 150054599 << 0;
          d = t1 + 24177077 << 0;
        } else {
          ab = 704751109;
          t1 = blocks[0] - 210244248;
          h = t1 - 1521486534 << 0;
          d = t1 + 143694565 << 0;
        }
        this.first = false;
      } else {
        s0 = ((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10));
        s1 = ((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7));
        ab = a & b;
        maj = ab ^ (a & c) ^ bc;
        ch = (e & f) ^ (~e & g);
        t1 = h + s1 + ch + K[j] + blocks[j];
        t2 = s0 + maj;
        h = d + t1 << 0;
        d = t1 + t2 << 0;
      }
      s0 = ((d >>> 2) | (d << 30)) ^ ((d >>> 13) | (d << 19)) ^ ((d >>> 22) | (d << 10));
      s1 = ((h >>> 6) | (h << 26)) ^ ((h >>> 11) | (h << 21)) ^ ((h >>> 25) | (h << 7));
      da = d & a;
      maj = da ^ (d & b) ^ ab;
      ch = (h & e) ^ (~h & f);
      t1 = g + s1 + ch + K[j + 1] + blocks[j + 1];
      t2 = s0 + maj;
      g = c + t1 << 0;
      c = t1 + t2 << 0;
      s0 = ((c >>> 2) | (c << 30)) ^ ((c >>> 13) | (c << 19)) ^ ((c >>> 22) | (c << 10));
      s1 = ((g >>> 6) | (g << 26)) ^ ((g >>> 11) | (g << 21)) ^ ((g >>> 25) | (g << 7));
      cd = c & d;
      maj = cd ^ (c & a) ^ da;
      ch = (g & h) ^ (~g & e);
      t1 = f + s1 + ch + K[j + 2] + blocks[j + 2];
      t2 = s0 + maj;
      f = b + t1 << 0;
      b = t1 + t2 << 0;
      s0 = ((b >>> 2) | (b << 30)) ^ ((b >>> 13) | (b << 19)) ^ ((b >>> 22) | (b << 10));
      s1 = ((f >>> 6) | (f << 26)) ^ ((f >>> 11) | (f << 21)) ^ ((f >>> 25) | (f << 7));
      bc = b & c;
      maj = bc ^ (b & d) ^ cd;
      ch = (f & g) ^ (~f & h);
      t1 = e + s1 + ch + K[j + 3] + blocks[j + 3];
      t2 = s0 + maj;
      e = a + t1 << 0;
      a = t1 + t2 << 0;
      this.chromeBugWorkAround = true;
    }

    this.h0 = this.h0 + a << 0;
    this.h1 = this.h1 + b << 0;
    this.h2 = this.h2 + c << 0;
    this.h3 = this.h3 + d << 0;
    this.h4 = this.h4 + e << 0;
    this.h5 = this.h5 + f << 0;
    this.h6 = this.h6 + g << 0;
    this.h7 = this.h7 + h << 0;
  };

  Sha256.prototype.hex = function () {
    this.finalize();

    var h0 = this.h0, h1 = this.h1, h2 = this.h2, h3 = this.h3, h4 = this.h4, h5 = this.h5,
      h6 = this.h6, h7 = this.h7;

    var hex = HEX_CHARS[(h0 >>> 28) & 0x0F] + HEX_CHARS[(h0 >>> 24) & 0x0F] +
      HEX_CHARS[(h0 >>> 20) & 0x0F] + HEX_CHARS[(h0 >>> 16) & 0x0F] +
      HEX_CHARS[(h0 >>> 12) & 0x0F] + HEX_CHARS[(h0 >>> 8) & 0x0F] +
      HEX_CHARS[(h0 >>> 4) & 0x0F] + HEX_CHARS[h0 & 0x0F] +
      HEX_CHARS[(h1 >>> 28) & 0x0F] + HEX_CHARS[(h1 >>> 24) & 0x0F] +
      HEX_CHARS[(h1 >>> 20) & 0x0F] + HEX_CHARS[(h1 >>> 16) & 0x0F] +
      HEX_CHARS[(h1 >>> 12) & 0x0F] + HEX_CHARS[(h1 >>> 8) & 0x0F] +
      HEX_CHARS[(h1 >>> 4) & 0x0F] + HEX_CHARS[h1 & 0x0F] +
      HEX_CHARS[(h2 >>> 28) & 0x0F] + HEX_CHARS[(h2 >>> 24) & 0x0F] +
      HEX_CHARS[(h2 >>> 20) & 0x0F] + HEX_CHARS[(h2 >>> 16) & 0x0F] +
      HEX_CHARS[(h2 >>> 12) & 0x0F] + HEX_CHARS[(h2 >>> 8) & 0x0F] +
      HEX_CHARS[(h2 >>> 4) & 0x0F] + HEX_CHARS[h2 & 0x0F] +
      HEX_CHARS[(h3 >>> 28) & 0x0F] + HEX_CHARS[(h3 >>> 24) & 0x0F] +
      HEX_CHARS[(h3 >>> 20) & 0x0F] + HEX_CHARS[(h3 >>> 16) & 0x0F] +
      HEX_CHARS[(h3 >>> 12) & 0x0F] + HEX_CHARS[(h3 >>> 8) & 0x0F] +
      HEX_CHARS[(h3 >>> 4) & 0x0F] + HEX_CHARS[h3 & 0x0F] +
      HEX_CHARS[(h4 >>> 28) & 0x0F] + HEX_CHARS[(h4 >>> 24) & 0x0F] +
      HEX_CHARS[(h4 >>> 20) & 0x0F] + HEX_CHARS[(h4 >>> 16) & 0x0F] +
      HEX_CHARS[(h4 >>> 12) & 0x0F] + HEX_CHARS[(h4 >>> 8) & 0x0F] +
      HEX_CHARS[(h4 >>> 4) & 0x0F] + HEX_CHARS[h4 & 0x0F] +
      HEX_CHARS[(h5 >>> 28) & 0x0F] + HEX_CHARS[(h5 >>> 24) & 0x0F] +
      HEX_CHARS[(h5 >>> 20) & 0x0F] + HEX_CHARS[(h5 >>> 16) & 0x0F] +
      HEX_CHARS[(h5 >>> 12) & 0x0F] + HEX_CHARS[(h5 >>> 8) & 0x0F] +
      HEX_CHARS[(h5 >>> 4) & 0x0F] + HEX_CHARS[h5 & 0x0F] +
      HEX_CHARS[(h6 >>> 28) & 0x0F] + HEX_CHARS[(h6 >>> 24) & 0x0F] +
      HEX_CHARS[(h6 >>> 20) & 0x0F] + HEX_CHARS[(h6 >>> 16) & 0x0F] +
      HEX_CHARS[(h6 >>> 12) & 0x0F] + HEX_CHARS[(h6 >>> 8) & 0x0F] +
      HEX_CHARS[(h6 >>> 4) & 0x0F] + HEX_CHARS[h6 & 0x0F];
    if (!this.is224) {
      hex += HEX_CHARS[(h7 >>> 28) & 0x0F] + HEX_CHARS[(h7 >>> 24) & 0x0F] +
        HEX_CHARS[(h7 >>> 20) & 0x0F] + HEX_CHARS[(h7 >>> 16) & 0x0F] +
        HEX_CHARS[(h7 >>> 12) & 0x0F] + HEX_CHARS[(h7 >>> 8) & 0x0F] +
        HEX_CHARS[(h7 >>> 4) & 0x0F] + HEX_CHARS[h7 & 0x0F];
    }
    return hex;
  };

  Sha256.prototype.toString = Sha256.prototype.hex;

  Sha256.prototype.digest = function () {
    this.finalize();

    var h0 = this.h0, h1 = this.h1, h2 = this.h2, h3 = this.h3, h4 = this.h4, h5 = this.h5,
      h6 = this.h6, h7 = this.h7;

    var arr = [
      (h0 >>> 24) & 0xFF, (h0 >>> 16) & 0xFF, (h0 >>> 8) & 0xFF, h0 & 0xFF,
      (h1 >>> 24) & 0xFF, (h1 >>> 16) & 0xFF, (h1 >>> 8) & 0xFF, h1 & 0xFF,
      (h2 >>> 24) & 0xFF, (h2 >>> 16) & 0xFF, (h2 >>> 8) & 0xFF, h2 & 0xFF,
      (h3 >>> 24) & 0xFF, (h3 >>> 16) & 0xFF, (h3 >>> 8) & 0xFF, h3 & 0xFF,
      (h4 >>> 24) & 0xFF, (h4 >>> 16) & 0xFF, (h4 >>> 8) & 0xFF, h4 & 0xFF,
      (h5 >>> 24) & 0xFF, (h5 >>> 16) & 0xFF, (h5 >>> 8) & 0xFF, h5 & 0xFF,
      (h6 >>> 24) & 0xFF, (h6 >>> 16) & 0xFF, (h6 >>> 8) & 0xFF, h6 & 0xFF
    ];
    if (!this.is224) {
      arr.push((h7 >>> 24) & 0xFF, (h7 >>> 16) & 0xFF, (h7 >>> 8) & 0xFF, h7 & 0xFF);
    }
    return arr;
  };

  Sha256.prototype.array = Sha256.prototype.digest;

  Sha256.prototype.arrayBuffer = function () {
    this.finalize();

    var buffer = new ArrayBuffer(this.is224 ? 28 : 32);
    var dataView = new DataView(buffer);
    dataView.setUint32(0, this.h0);
    dataView.setUint32(4, this.h1);
    dataView.setUint32(8, this.h2);
    dataView.setUint32(12, this.h3);
    dataView.setUint32(16, this.h4);
    dataView.setUint32(20, this.h5);
    dataView.setUint32(24, this.h6);
    if (!this.is224) {
      dataView.setUint32(28, this.h7);
    }
    return buffer;
  };

  function HmacSha256(key, is224, sharedMemory) {
    var i, type = typeof key;
    if (type === 'string') {
      var bytes = [], length = key.length, index = 0, code;
      for (i = 0; i < length; ++i) {
        code = key.charCodeAt(i);
        if (code < 0x80) {
          bytes[index++] = code;
        } else if (code < 0x800) {
          bytes[index++] = (0xc0 | (code >>> 6));
          bytes[index++] = (0x80 | (code & 0x3f));
        } else if (code < 0xd800 || code >= 0xe000) {
          bytes[index++] = (0xe0 | (code >>> 12));
          bytes[index++] = (0x80 | ((code >>> 6) & 0x3f));
          bytes[index++] = (0x80 | (code & 0x3f));
        } else {
          code = 0x10000 + (((code & 0x3ff) << 10) | (key.charCodeAt(++i) & 0x3ff));
          bytes[index++] = (0xf0 | (code >>> 18));
          bytes[index++] = (0x80 | ((code >>> 12) & 0x3f));
          bytes[index++] = (0x80 | ((code >>> 6) & 0x3f));
          bytes[index++] = (0x80 | (code & 0x3f));
        }
      }
      key = bytes;
    } else {
      if (type === 'object') {
        if (key === null) {
          throw new Error(ERROR);
        } else if (ARRAY_BUFFER && key.constructor === ArrayBuffer) {
          key = new Uint8Array(key);
        } else if (!Array.isArray(key)) {
          if (!ARRAY_BUFFER || !ArrayBuffer.isView(key)) {
            throw new Error(ERROR);
          }
        }
      } else {
        throw new Error(ERROR);
      }
    }

    if (key.length > 64) {
      key = (new Sha256(is224, true)).update(key).array();
    }

    var oKeyPad = [], iKeyPad = [];
    for (i = 0; i < 64; ++i) {
      var b = key[i] || 0;
      oKeyPad[i] = 0x5c ^ b;
      iKeyPad[i] = 0x36 ^ b;
    }

    Sha256.call(this, is224, sharedMemory);

    this.update(iKeyPad);
    this.oKeyPad = oKeyPad;
    this.inner = true;
    this.sharedMemory = sharedMemory;
  }
  HmacSha256.prototype = new Sha256();

  HmacSha256.prototype.finalize = function () {
    Sha256.prototype.finalize.call(this);
    if (this.inner) {
      this.inner = false;
      var innerHash = this.array();
      Sha256.call(this, this.is224, this.sharedMemory);
      this.update(this.oKeyPad);
      this.update(innerHash);
      Sha256.prototype.finalize.call(this);
    }
  };

  var exports = createMethod();
  exports.sha256 = exports;
  exports.sha224 = createMethod(true);
  exports.sha256.hmac = createHmacMethod();
  exports.sha224.hmac = createHmacMethod(true);

  if (COMMON_JS) {
    module.exports = exports;
  } else {
    root.sha256 = exports.sha256;
    root.sha224 = exports.sha224;
    if (AMD) {
      define(function () {
        return exports;
      });
    }
  }
})();

        return module.exports.sha256;
    })();

    const APP_ID = 'fruit-heart-v6';
    const BUTTON_NAME = '🍎 果实之心';
    // 咩咩挑的猫，2026-09-14 换下原来那只苹果。整只走 currentColor，所以跟着皮肤变色
    // （暖纸砖红 / 黑金玻璃是金），只有眼白是固定白。
    const BALL_ICON = '<svg viewBox="0 0 512 512" aria-hidden="true" fill="currentColor">'
        + '<path d="M140.6 57.4Q132.4 58.7 128.7 62.5Q124.9 66.2 123.6 69.4Q122.3 72.5 121.1 102.2Q119.8 131.8 128 139.4Q136.2 146.9 136.2 148.2Q136.2 149.5 129.3 153.2Q122.3 157 119.8 160.8Q117.3 164.6 117.9 166.5Q118.6 168.4 124.2 172.8Q129.9 177.2 129.9 179.1Q129.9 181 123.6 186Q117.3 191.1 115.4 209.3Q113.5 227.6 99 248.4Q84.5 269.2 79.5 283.7Q74.4 298.2 73.2 306.4Q71.9 314.6 71.9 326.6Q71.9 338.6 73.8 349.3Q75.7 360 78.8 368.9Q82 377.7 88.9 389.6Q95.9 401.6 108.5 414.9Q121.1 428.1 131.2 434.4Q141.3 440.7 154.5 445.8Q167.7 450.8 179.7 452.7Q191.7 454.6 260.4 454.6Q329.1 454.6 348 450.2Q367 445.8 379.6 438.8Q392.2 431.9 404.1 421.2Q416.1 410.5 421.8 402.9Q427.5 395.3 433.1 384Q438.8 372.6 442 361.9Q445.1 351.2 446.4 336.7Q447.6 322.2 446.4 312.1Q445.1 302 441.4 290Q437.6 278.1 437.6 270.5Q437.6 262.9 449.5 204.3Q461.5 145.7 461.5 140Q461.5 134.3 459 129.9Q456.5 125.5 450.8 122.3Q445.1 119.2 437.6 120.5Q430 121.7 378.3 159.5Q326.6 197.4 301.4 197.4Q276.2 197.4 268 191.1Q259.8 184.8 208.1 122.3Q156.4 59.9 152.6 58Q148.8 56.1 140.6 57.4Z"/>'
        + '<path d="M335.4 256Q348 252.8 355 253.5Q361.9 254.1 367.6 256Q373.3 257.9 382.1 263.6Q390.9 269.2 395.3 273.6Q399.7 278.1 404.8 285.6Q409.8 293.2 414.2 307.7Q418.6 322.2 418 336.7Q417.4 351.2 412.4 363.8Q407.3 376.4 399.7 385.2Q392.2 394.1 385.2 398.5Q378.3 402.9 370.1 405.4Q361.9 407.9 350.6 407.3Q339.2 406.7 332.3 404.1Q325.4 401.6 319.7 397.9Q314 394.1 307.7 387.8Q301.4 381.5 297.6 375.8Q293.8 370.1 290 360.6Q286.3 351.2 285 344.9Q283.7 338.6 283.7 328.5Q283.7 318.4 285 312.1Q286.3 305.8 291.9 293.8Q297.6 281.9 304.5 274.3Q311.5 266.7 317.1 262.9Q322.8 259.1 335.4 256Z" fill="#fff"/>'
        + '<path d="M149.5 256.6Q161.4 251.6 171.5 251.6Q181.6 251.6 186.7 252.8Q191.7 254.1 199.9 258.5Q208.1 262.9 217.5 273.6Q227 284.4 230.8 293.8Q234.6 303.3 235.8 309.6Q237.1 315.9 237.1 325.4Q237.1 334.8 235.2 343.6Q233.3 352.5 227.6 363.8Q222 375.1 215.7 382.1Q209.3 389 204.3 392.8Q199.3 396.6 191.1 400.4Q182.9 404.1 179.1 404.8Q175.3 405.4 163.3 404.8Q151.3 404.1 141.3 399.1Q131.2 394.1 121.7 383.4Q112.3 372.6 107.2 358.8Q102.2 344.9 102.2 331.6Q102.2 318.4 103.4 312.7Q104.7 307.1 110.4 295.1Q116 283.1 126.8 272.4Q137.5 261.7 149.5 256.6Z" fill="#fff"/>'
        + '<path d="M327.9 290.7Q325.4 290.7 320.3 293.2Q315.3 295.7 311.5 301.4Q307.7 307.1 305.8 316.5Q303.9 326 304.5 333.5Q305.2 341.1 307.7 348.7Q310.2 356.2 312.1 359.4Q314 362.5 318.4 367Q322.8 371.4 325.4 372.6Q327.9 373.9 332.9 373.9Q338 373.9 340.5 372.6Q343 371.4 346.1 368.2Q349.3 365.1 351.2 361.3Q353.1 357.5 355 349.9Q356.9 342.4 356.2 333.5Q355.6 324.7 354.4 319.7Q353.1 314.6 349.3 307.7Q345.5 300.8 342.4 297.6Q339.2 294.5 334.8 292.6Q330.4 290.7 327.9 290.7Z"/>'
        + '<path d="M197.4 289.4Q193 288.1 188.5 289.4Q184.1 290.7 178.5 296.4Q172.8 302 169.6 309Q166.5 315.9 165.2 322.2Q164 328.5 164 334.2Q164 339.9 165.2 346.1Q166.5 352.5 170.3 359.4Q174 366.3 179.7 369.5Q185.4 372.6 187.3 372.6Q189.2 372.6 193.6 370.7Q198 368.9 202.4 364.4Q206.8 360 210.6 351.8Q214.4 343.6 215 336.7Q215.7 329.8 216.3 329.1Q216.9 328.5 216.3 321.6Q215.7 314.6 213.1 307.7Q210.6 300.8 206.2 295.7Q201.8 290.7 197.4 289.4Z"/>'
        + '<path d="M442 400.4Q438.8 402.9 439.5 407.3Q440.1 411.7 447 417.4Q454 423.1 465.3 430.6Q476.6 438.2 480.4 436.9Q484.2 435.7 485.5 433.1Q486.7 430.6 486.7 428.7Q486.7 426.9 484.2 423.7Q481.7 420.5 466.6 409.8Q451.4 399.1 448.3 398.5Q445.1 397.9 442 400.4Z"/>'
        + '<path d="M74.4 410.5Q74.4 407.9 71.3 404.8Q68.1 401.6 66.2 401.6Q64.3 401.6 45.4 412.4Q26.5 423.1 25.3 425Q24 426.9 24.6 430.6Q25.3 434.4 27.8 436.3Q30.3 438.2 34.1 437.6Q37.9 436.9 53 428.1Q68.1 419.3 71.3 416.1Q74.4 413 74.4 410.5Z"/>'
        + '<path d="M453.3 367.6Q452.7 368.9 452.7 372Q452.7 375.1 455.9 378.3Q459 381.5 465.9 384Q472.9 386.5 475.4 385.9Q477.9 385.2 479.8 383.4Q481.7 381.5 482.3 378.9Q483 376.4 481.7 373.9Q480.4 371.4 478.5 370.1Q476.6 368.9 469.7 366.3Q462.8 363.8 460.9 363.8Q459 363.8 456.5 365.1Q454 366.3 453.3 367.6Z"/>'
        + '<path d="M65 377Q64.3 373.9 61.8 372Q59.3 370.1 49.9 372Q40.4 373.9 37.9 376.4Q35.4 378.9 35.4 382.1Q35.4 385.2 37.9 387.8Q40.4 390.3 44.2 390.3Q48 390.3 54.3 388.4Q60.6 386.5 63.1 383.4Q65.6 380.2 65 377Z"/>'
        + '</svg>';
    const CONFIG_ID = 'fruit-heart-control-config-v2';
    const QR_COMMANDS = {"剧情控制":"/input 请输入你对接下来剧情的大概要求,不需要就点取消，非必须 |\n/setvar key=order {{pipe}} ||\n/if left={{getvar::order}} right=\"\" rule=neq {:/addvar key=order  :} |\n\n/buttons labels=[\"推进剧情\",\"加速剧情推进\",\"减缓剧情推进\",\"切换其他故事线\",\"切换到IF线\"] 剧情控制🪶 |\n/setvar key=option ||\n\n/if left=option rule=eq right=\"\" {: /flushvar option | /abort :} ||\n\n/if left=option rule=eq right=\"推进剧情\" {: \n  /setvar key=final_message \"<!-- Request:请在当前剧情的基础上继续推进剧情。维持已有节奏基础上，合理发展故事。{{getvar::order}} --!>\"\n:} ||\n\n/if left=option rule=eq right=\"加速剧情推进\" {: \n  /setvar key=final_message \"<!-- Request:当前剧情节奏太慢了，需要你大幅度加快剧情推进，例如加快时间流速，进行剧情转折或反转，增加戏剧事件，新增出场人物等等。注意确保连续性与人设一致。{{getvar::order}} --!>\"\n:} ||\n\n/if left=option rule=eq right=\"减缓剧情推进\" {: \n  /setvar key=final_message \"<!-- Request:当前剧情进度过快，需要你放缓节奏，例如细化描写，放慢时间流速，深挖人物，全面阐释当前故事等，但要避免停滞不前。{{getvar::order}} --!>\"\n:} ||\n\n/if left=option rule=eq right=\"切换其他故事线\" {: \n  /setvar key=final_message \"<!-- Request:综合上文和前一场景，转换至另一条相关或衍生的故事线，维持世界观，合理衔接故事逻辑，可更换场景或登场人物。{{getvar::order}} --!>\"\n:} ||\n\n/if left=option rule=eq right=\"切换到IF线\" {: \n  /setvar key=final_message \"<!-- Request:开一条 IF 线。以当前这一幕为分叉点，假设一种不同的可能，并从这个假设出发重写接下来的发展；若下面没有写明假设，就由你挑一个有意思的分叉点（某个关键选择反过来、某个人没有出现、某件事早发生一天）。保留世界观、人物性格和既有关系，只改动这个假设直接波及的部分；人物的身份、年龄、所处时空若因此改变，要前后自洽。这是与主线并行的支线，不覆盖主线已经发生的事。{{getvar::order}} --!>\"\n:} ||\n/setinput {{getvar::final_message}} ||\n/echo 剧情指令已填充，请检查后发送！ ||\n\n/flushvar option ||\n/flushvar order ||\n/flushvar final_message ||\n","括号大法":"/buttons labels=[\"性别人设确认\",\"禁止粗暴性爱\",\"禁止发情\",\"禁止秒射\",\"边缘性行为\",\"禁止阴谋论\",\"禁止倒贴恋爱脑\", \"u第三人称\", \"u第二人称\", \"u第一人称\", \"c第一人称\", \"字数强调\",\"强制中文\",\"多语言强调\",\"状态栏强调\", \"小剧场强调\",\"好感度扫描\", \"线上沉浸式\",\"禁止转折\",\"禁止抢话\",\"必须抢话\",\"自定义\"] 💢括号大法💢 |\n/setvar key=option ||\n\n/if left=option rule=eq right=\"\" {: /flushvar option | /abort :} ||\n\n/if left=option rule=eq right=\"性别人设确认\" {: \n  /setvar key=final_message \"<!-- Request:分清<user>和其他角色各自的性别和人设，禁止混淆 --!>\" \n:} ||\n\n/if left=option rule=eq right=\"u第三人称\" {: \n  /setvar key=final_message \"<!-- Request:无论上文使用什么人称，接下来必须以第三人称(他/她或名字)称呼<user> --!>\" \n:} ||\n\n/if left=option rule=eq right=\"u第二人称\" {: \n  /setvar key=final_message \"<!-- Request:无论上文使用什么人称，接下来必须以第二人称“你”来称呼<user> --!>\" \n:} ||\n\n/if left=option rule=eq right=\"u第一人称\" {: \n  /setvar key=final_message \"<!-- Request:无论上文使用什么人称，接下来必须以<user>的视角进行剧情，用“我”来指代<user> --!>\" \n:} ||\n\n/if left=option rule=eq right=\"c第一人称\" {: \n  /setvar key=final_message \"<!-- Request:无论上文使用什么人称，接下来必须以角色的视角进行剧情，用“我”来指代角色 --!>\" \n:} ||\n\n/if left=option rule=eq right=\"字数强调\" {: \n  /setvar key=final_message \"<!-- Request:严格遵守字数/段落要求，禁止少于或超出规定范围 --!>\" \n:} ||\n\n/if left=option rule=eq right=\"强制中文\" {: \n  /setvar key=final_message \"<!-- Request:正文中包括旁白、对话、心理活动在内的一切文字都必须使用简体中文，禁止出现错别字、英文、日文或其他语言 --!>\" \n:} ||\n\n/if left=option rule=eq right=\"多语言强调\" {: \n  /setvar key=final_message \"<!-- Request:严格遵循当前所处国家地区，角色的国籍/语言/母语等类似设定，进行符合要求的双语或多语言对白，禁止使用纯文中文对话 --!>\" \n:} ||\n\n/if left=option rule=eq right=\"状态栏强调\" {: \n  /setvar key=final_message \"<!-- Request:必须正确生成所要求的状态栏格式，不得错漏 --!>\" \n:} ||\n\n/if left=option rule=eq right=\"小剧场强调\" {: \n  /setvar key=final_message \"<!-- Request:必须正确生成指定要求和数量的小剧场，禁止遗漏或重复 --!>\" \n:} ||\n\n/if left=option rule=eq right=\"好感度扫描\" {: \n  /setvar key=final_message \"<!-- Request:根据当前剧情进度和好感度要求，正确调整角色的好感度 --!>\" \n:} ||\n\n/if left=option rule=eq right=\"线上沉浸式\" {: \n  /setvar key=final_message \"<!-- Request:当前是线上聊天剧情，user输入为发送给角色的线上消息。请正确生成所要求的线上格式和角色的回复，可省略正文 --!>\" \n:} ||\n\n/if left=option rule=eq right=\"禁止转折\" {: \n  /setvar key=final_message \"<!-- Request:禁止角色突然转换话题、发展新事件、退场或其他突兀转折，禁止新人物、地点或事件突然出现 --!>\" \n:} ||\n\n/if left=option rule=eq right=\"禁止抢话\" {: \n  /setvar key=final_message \"<!-- Request:绝对禁止在任何叙述中包含对<user>的动作、表情、心理活动或状态的描述，除非这些信息是由角色通过直接观察或对话明确获知的，并且仅限于客观描述观察到的现象，不加任何主观解读。 --!>\" \n:} ||\n\n/if left=option rule=eq right=\"必须抢话\" {: \n  /setvar key=final_message \"<!-- Request:必须在叙述中包含对<user>的语言动作或其他方面的描写，必须详细描述<user>的行为过程，将<user>当作重要角色来塑造 --!>\" \n:} ||\n\n/if left=option rule=eq right=\"禁止粗暴性爱\" {: \n  /setvar key=final_message \"<!-- Request:NSFW必须以<user>的感受为主，禁止任何【疼痛】【粗暴】【侮辱性】的细节描述 --!>\" \n:} ||\n\n/if left=option rule=eq right=\"禁止发情\" {: \n  /setvar key=final_message \"<!-- Request:禁止对当前角色互动进行NSFW或露骨性描写，即使暧昧与亲密也不可过界 --!>\" \n:} ||\n\n/if left=option rule=eq right=\"禁止秒射\" {: \n  /setvar key=final_message \"<!-- Request:本回合必须详尽描述或延长性爱过程，将本次亲密互动作为性爱的一部分，下回合应继续互动，禁止插入方射精或结束性爱 --!>\" \n:} ||\n\n/if left=option rule=eq right=\"边缘性行为\" {: \n  /setvar key=final_message \"<!-- Request:当前角色仅可进行“边缘性行为”，禁止发展为插入式性爱 --!>\" \n:} ||\n\n/if left=option rule=eq right=\"禁止阴谋论\" {: \n  /setvar key=final_message \"<!-- Request:<user>的语言和行为目的均为绝对的善意，禁止角色对<user>阴谋论或认为<user>别有用心 --!>\" \n:} ||\n\n/if left=option rule=eq right=\"禁止倒贴恋爱脑\" {: \n  /setvar key=final_message \"<!-- Request:严格禁止任何 NPC 对<user>有好感或情感依赖，包括爱意、迷恋及占有欲；所有角色包括<user>必须保持独立人格，严禁出现讨好、献殷勤或将他人视为救赎等“倒贴”行为，确保所有情感发展具有极高的逻辑门槛与叙事合理性。 --!>\" \n:} ||\n\n/if left=option rule=eq right=\"自定义\" {: \n  /setvar key=final_message \"<!-- Request:     --!>\" \n:} ||\n\n/setvar key=origin_input {{input}} ||\n/setvar key=merged_input \"{{getvar::origin_input}}{{getvar::final_message}}\" ||\n/setinput {{getvar::merged_input}} ||\n/echo 指令已成功填充到输入框，可自行修改 ||\n\n/flushvar option ||\n/flushvar custom_content ||\n/flushvar final_message ||","总结模式":"/setvar key=order {{pipe}} ||\n/if left={{getvar::order}} right=\"\" rule=neq  {:/addvar key=order {{newline}} :} |\n\n/buttons labels=[\"大总结——只总结新增内容\",\"大总结——合并之前的大总结\",\"大总结——短RP专用（非MOM预设通用）\",\"剧情继承——总结当前全部剧情开始新聊天\"] 🧾总结指南：总结后隐藏上文，留5-10楼稳定ai输出风格（如50层总结隐藏0-40层）🧾丨🚀剧情继承指南：需要手动把AI生成的“前情提要”复制在新聊天的0楼🚀 |\n/setvar key=option ||\n\n/if left=option rule=eq right=\"\" {: /flushvar option | /abort :} ||\n\n/if left=option rule=eq right=\"大总结——只总结新增内容\" {: \n  /send \n停止剧情，停止输出其他所有内容，开始执行**新增大总结**\n\n新增大总结应当遵循以下原则：\n- 注明这是第几次大总结\n- **只需总结上次大总结到目前的新增部分剧情**\n- 按逻辑顺序组织信息，并包含具体的前后时间，可以分辨不同日期与时间发生的事情\n- 保留关键事件和重要细节，省略冗余描述\n- 直接陈述事实，避免评价\n- 使用简洁清晰的语言，避免修饰\n- 突出事件发展脉络和关键转折点\n- 保留重要的约定、物品、事件以及情感发展\n- 不回避任何敏感内容，保证记录完全还原前文\n- 可以精简合并较为久远之前的事件\n- 无需加粗标注\n\n格式如下：\n\n<details><summary>大总结(序号注明是第几次大总结)</summary>\n- 时间:\n  - 关键事件（需要以流水帐形式综述事件经过和涉及人物）:\n  - 重要细节:\n  - 关键对话和内心戏:(标明角色)\n  - 关键行为：(标明角色)\n  - 关键角色和{{user}}之间的情感变化（选填）:\n  - 简要的事件后续，事件结束后的小互动（选填）:\n...\n- 时间:\n  - 关键事件（需要以流水帐形式综述事件经过和涉及人物）:\n  - 重要细节:\n  - 关键对话和内心戏:(标明角色)\n  - 关键行为：(标明角色)\n  - 关键角色和{{user}}之间的情感变化（选填）:\n  - 简要的事件后续，事件结束后的小互动（选填）\n</details>\n\n<details><summary>角色表</summary>\n所有对剧情有影响的角色均需出现(包括没有实体的角色,mermaid图同理)，路人NPC不保留，参考`[角色表规范]`\n</details>\n\n:} ||\n\n/if left=option rule=eq right=\"大总结——合并之前的大总结\" {: \n  /send 停止剧情，停止输出其他所有内容，开始执行**全文大总结**\n\n大总结应当遵循以下原则：\n- **大总结应该包括全部上文，之前的大总结和新增内容汇总在一起**\n- 按逻辑顺序组织信息，并包含具体的前后时间，可分辨不同时间发生的事情\n- 保留关键事件和重要细节，避免冗余描述\n- 直接陈述事实，避免评价\n- 使用简洁清晰的语言，避免修饰\n- 突出事件发展脉络和关键转折点\n- 保留重要的约定、物品、事件以及情感发展\n- 不回避任何敏感内容，保证记录完全还原前文\n- 可以精简合并较为久远之前的事件\n- 无需加粗标注\n- 以流水账形式记录\n- 禁止输出<moew_FM>摘要\n\n格式如下：\n\n<details><summary>大总结(序号注明是第几次大总结)</summary>\n- 时间:\n  - 关键事件（需要以流水帐形式综述事件经过和涉及人物）:\n  - 重要细节:\n  - 关键对话和内心戏:(标明角色)\n  - 关键行为：(标明角色)\n  - 关键角色和{{user}}之间的情感变化（选填）:\n  - 简要的事件后续，事件结束后的小互动（选填）:\n...\n- 时间:\n  - 关键事件（需要以流水帐形式综述事件经过和涉及人物）:\n  - 重要细节:\n  - 关键对话和内心戏:(标明角色)\n  - 关键行为：(标明角色)\n  - 关键角色和{{user}}之间的情感变化（选填）:\n  - 简要的事件后续，事件结束后的小互动（选填）\n</details>\n\n<details><summary>角色表</summary>\n所有对剧情有影响的角色均需出现(包括没有实体的角色,mermaid图同理)，路人NPC不保留，参考`[角色表规范]`\n</details>\n\n**注意，本回合无需输出任何其他内容，远期事件可大胆精简合并，仅保留重要细节**\n\n:} ||\n\n/if left=option rule=eq right=\"大总结——短RP专用（非MOM预设通用）\" {: \n  /send 停止剧情，停止输出其他所有内容，开始执行**全文大总结**\n\n大总结应当遵循以下原则：\n- 注明这是第几次大总结\n- **注意大总结应该包括全部上文，之前的大总结和新增内容汇总在一起**\n- 按逻辑顺序组织信息，并包含具体的前后时间，可以分辨不同日期与时间发生的事情\n- 保留关键事件和重要细节，省略冗余描述\n- 直接陈述事实，避免评价\n- 使用简洁清晰的语言，避免修饰\n- 突出事件发展脉络和关键转折点\n- 保留重要的约定、物品、事件以及情感发展\n- 不回避任何敏感内容，保证记录完全还原前文\n- 可以精简合并较为久远之前的事件\n- 无需加粗标注\n- 主线无关的正文无需记录\n- 最后的md表格记录RP的各种细节，以增加真实性为主\n\n格式如下：\n\n<details><summary>大总结(序号注明是第几次大总结)</summary>\n- 时间:\n  - 关键事件（需要以流水帐形式综述事件经过和涉及人物）:\n    - 重要细节:\n    - 关键对话和内心戏:(标明角色)\n    - 关键行为：(标明角色)\n    - 关键角色和{{user}}之间的情感变化（选填）:\n    - 简要的事件后续，事件结束后的小互动（选填）:\n...\n- 时间:\n  - 关键事件（需要以流水帐形式综述事件经过和涉及人物）:\n    - 重要细节:\n    - 关键对话和内心戏:(标明角色)\n    - 关键行为：(标明角色)\n    - 关键角色和{{user}}之间的情感变化（选填）:\n    - 简要的事件后续，事件结束后的小互动（选填）:\n\n(空行)\n(记录：日期、重要互动事件叙述（如纪念日）、礼物(标明谁送给谁)、喜好或厌恶（记录文中揭露的角色或<user>的好恶）、其他细节（AI认为值得记录的细节）.使用markdown表格,精简表述)\n（空行）\n</details>\n\n**大总结回合无需输出其他内容**\n\n:} ||\n/if left=option rule=eq right=\"剧情继承——总结当前全部剧情开始新聊天\" {: \n  /send 停止剧情，停止输出其他所有内容，进入【剧情继承模式】，开始**故事剧情大总结**：\n\n【请注意，这不只是一次剧情梳理和总结，更是一次统筹全局、贯通过去-现在-未来可能性的整体思考】\n\n执行本模式的思考和要求：\n- 本回合输出内容将作为【新聊天】的“前情提要”\n- 本次输出既是故事的大总结，也是新故事的【开端】\n- 注意思考平衡设定和“已发生故事”之间的差异\n- 保证新聊天中**风格、人物、关系与动机完全连续**。\n- 抓取重要细节，细节是真实性的基础\n\n# 输出格式如下：\n---\n\n<前情提要>\n<details><summary>大总结（用于继承剧情的前情提要）</summary>\n\n## 一、剧情状态（必填）\n* 舞台概述：{包括全部剧情的时间段、重要地点、主要角色所处阶段}\n* 当前时间地点：\n* 当前局势一句话概述：\n* 故事基调：\n\n---\n\n## 二、历史关键剧情（必填，以时间顺序罗列）\n* 事件节点1：\n\n  * 时间地点：\n  * 涉及人物：\n  * 发生经过（简述）：\n  * 结果 / 影响：\n* 事件节点2：\n\n  * 时间地点：\n  * 涉及人物：\n  * 发生经过（简述）：\n  * 结果 / 影响：\n* ……（3–7条为宜，禁止冗长）\n\n---\n\n## 三、角色与关系现状（保持角色一致性，无需写入<user>）\n* 角色A：\n\n  * 当前状态：\n  * 与 {{user}} 的关系和情感：\n  * 当前立场 / 动机：\n  * 设定和事实的差异（选填）：\n\n* 角色B：\n\n  * 当前状态：\n  * 与 {{user}} 的关系和情感：\n  * 当前立场 / 动机：\n  * 设定和事实的差异（选填）：\n\n* ……（详细记录重要角色，路人NPC可忽略）\n\n---\n\n## 四、差异性（详细列出设定和已发生事实的差异/选填/后续应该以发生事实为准来演绎，无需写入<user>）\n\n* 差异1:{差异如何造成，可能的影响；差异造成的动态才是故事发展的关键}\n* 差异2:\n……\n* 差异n:\n\n---\n\n## 五、必须继承的硬约束（选填，不可被新聊天和设定“洗掉”）\n\n* 重要约定 / 誓言 / 交易条款：{以1 2 3 4清单依次列出/细节明确}\n* 规则 / 禁令 / 世界观限制：\n* 关键物品状态（持有者 / 损耗 / 去向）：{如果物品和剧情相关，必须详细写明前因后果}\n* 关键秘密：{依次写明角色的认知局限，禁止角色全知}\n* 当前悬而未决的冲突 / 风险：\n* 潜在的对立或不稳定因素：\n\n---\n\n（空行）\n## 六、人物记录（必填 · 精简记录，以如下表头的md表格格式输出）\n日期/阶段；涉及角色；重要互动；赠与/物品变化；喜好或厌恶；备注\n（空行）\n\n## 七、细节备忘（必填 · 精简记录，以如下表头的md表格格式输出）\n日期/阶段；涉及角色；重要细节；备注\n（空行）\n\n</details>\n</前情提要>\n\n**本回合无需输出其他内容**\n\n:} ||\n\n/flushvar option ||\n/flushvar order ||\n/trigger||","大纲模式":"/buttons labels=[\"新建大纲\",\"大纲修改\"] 使用方法和大总结类似，将最终版大纲留在聊天记录里，删去历史修改记录和指令，打开[主线剧情cot]。感谢@Nanimo_Nai的灵感和提示词参考 |\n/setvar key=mode ||\n\n/if left=mode rule=eq right=\"\" {: /flushvar mode | /abort :} ||\n\n/if left=mode rule=eq right=\"新建大纲\" {:\n  /input 请输入你构想的大概剧情大纲,点取消则由AI自由发挥 |\n  /setvar key=outline {{pipe}} ||\n  /if left={{getvar::outline}} right=\"\" rule=neq  {:/addvar key=outline {{newline}} :} |\n\n  /if left={{getvar::outline}} right=\"\" rule=neq {:\n    /send \n停止剧情，停止输出其他所有内容，进入【大纲模式】，开始执行**故事大纲编写**：\n\n根据用户输入扩写为一个完整大纲，必须严格遵循用户的以下输入：\n「这是用户要求的大纲内容：{{getvar::outline}}」\n\n大纲编写应当遵循以下原则：\n- 优先遵循输入的安排和要求\n- 读取全部资料，综合考虑所有人物、关系、势力\n- 按时间或逻辑顺序排列\n- 在故事框架内自由填充大量剧情点\n- 故事需要具有张力，有可玩性和互动性\n- 用**加粗**标注重要剧情与转折（示例：**此处是关键剧情点**）\n\n格式如下：\n\n<details><summary>故事大纲</summary>\n\n<主线剧情>\n# 剧情安排\n## 故事背景\n（描述故事发生的时代、地点、社会环境等）\n## 故事基调\n（确定故事的氛围与基调：如轻松喜剧、黑暗沉重、温馨治愈、色情甜腻，可以同时选择多种基调）\n## 登场人物\n- 主要人物：\n- 次要人物：\n\n## 第1章{本章主题}\n- 剧情点1\n- 剧情点2\n……\n\n## 第2章{本章主题}\n- 剧情点1\n- 剧情点2\n……\n… \n## 第n章{本章主题}\n- 剧情点1\n- 剧情点2\n……\n</主线剧情>\n\n<seeds>\n这里整理一些可参考的seeds伏笔\n</seeds>\n</details>\n\n# AI推动剧情指南 \n1. **保持剧情节奏**：合理推进剧情章节，不要跳跃过快。 \n2. **合理安排遭遇**：在<user>行动时，积极安排与NPC的相遇和冲突。 \n3. **引入其他冲突**：在主线推进的同时，可以引入其他事件和NSFW丰富体验。 \n4. **注意角色一致性**：保持NPC性格和动机的一致性。\n  :} ||\n\n  /if left={{getvar::outline}} right=\"\" rule=eq {:\n    /send \n停止剧情，停止输出其他所有内容，进入【大纲模式】，开始执行**故事大纲编写**：\n\n大纲编写应当遵循以下原则：\n- 自由发挥创作一个完整大纲\n- 如果上文有user对剧情的要求，优先满足\n- 读取全部资料，综合考虑所有人物、关系、势力\n- 按时间或逻辑顺序排列\n- 在故事框架内自由填充大量剧情点\n- 故事需要具有张力，有可玩性和互动性\n- 用**加粗**标注重要剧情与转折（示例：**此处是关键剧情点**）\n\n格式如下：\n\n<details><summary>故事大纲</summary>\n\n<主线剧情>\n# 剧情安排\n## 故事背景\n（描述故事发生的时代、地点、社会环境等）\n## 故事基调\n（确定故事的氛围与基调：如轻松喜剧、黑暗沉重、温馨治愈、色情甜腻，可以同时选择多种基调）\n## 登场人物\n- 主要人物：\n- 次要人物：\n\n## 第1章{本章主题}\n- 剧情点1\n- 剧情点2\n……\n\n## 第2章{本章主题}\n- 剧情点1\n- 剧情点2\n……\n… \n## 第n章{本章主题}\n- 剧情点1\n- 剧情点2\n……\n</主线剧情>\n\n<seeds>\n这里整理一些可参考的seeds伏笔\n</seeds>\n</details>\n\n# AI推动剧情指南 \n1. **保持剧情节奏**：合理推进剧情章节，不要跳跃过快。 \n2. **合理安排遭遇**：在<user>行动时，积极安排与NPC的相遇和冲突。 \n3. **引入其他冲突**：在主线推进的同时，可以引入其他事件和NSFW丰富体验。 \n4. **注意角色一致性**：保持NPC性格和动机的一致性。\n  :} |\n:} ||\n\n/if left=mode rule=eq right=\"大纲修改\" {:\n  /input 请输入你对大纲的修改意见，取消将直接退出 |\n  /setvar key=modnote {{pipe}} ||\n  /if left={{getvar::modnote}} right=\"\" rule=neq  {:/addvar key=modnote {{newline}} :} |\n  /if left={{getvar::modnote}} right=\"\" rule=eq {: /flushvar modnote | /flushvar mode | /abort :} ||\n\n  /send \n停止剧情，停止输出其他所有内容，进入【大纲模式】，开始执行**大纲修改**：\n\n请根据以下用户的修改意见，对**当前已生成的大纲**进行增删、细化与重排；必须严格遵循意见，同时保持世界观、人物设定与逻辑连续性：\n「用户的修改意见：{{getvar::modnote}}」\n\n大纲修改应当遵循以下原则：\n- 优先按用户修改意见执行\n- 在不破坏原结构的前提下补足关键过渡与动机\n- 用 **加粗** 标注新的或调整后的关键剧情与转折（示例：**此处是关键剧情点**）\n- 保留有效情节、合并冗余、必要时调整章节顺序\n- 维持登场人物的性格与关系一致\n\n格式如下：\n\n<details><summary>故事大纲</summary>\n\n<主线剧情>\n# 剧情安排\n## 故事背景\n（描述故事发生的时代、地点、社会环境等）\n## 故事基调\n（确定故事的氛围与基调：如轻松喜剧、黑暗沉重、温馨治愈、色情甜腻，可以同时选择多种基调）\n## 登场人物\n- 主要人物：\n- 次要人物：\n\n## 第1章{本章主题}\n- 剧情点1\n- 剧情点2\n……\n\n## 第2章{本章主题}\n- 剧情点1\n- 剧情点2\n……\n… \n## 第n章{本章主题}\n- 剧情点1\n- 剧情点2\n……\n</主线剧情>\n\n<seeds>\n这里整理一些可参考的seeds伏笔\n</seeds>\n</details>\n\n# AI推动剧情指南 \n1. **保持剧情节奏**：合理推进剧情章节，不要跳跃过快。 \n2. **合理安排遭遇**：在<user>行动时，积极安排与NPC的相遇和冲突。 \n3. **引入其他冲突**：在主线推进的同时，可以引入其他事件和NSFW丰富体验。 \n4. **注意角色一致性**：保持NPC性格和动机的一致性。\n:} ||\n\n/flushvar outline ||\n/flushvar modnote ||\n/flushvar mode ||\n/trigger||","写卡模式":"/buttons labels=[\"创建角色\",\"世界观创建\",\"NPC提取\",\"角色修改\",\"人设更新\",\"开场白创作（不代入user设定）\",\"开场白创作（代入当前user）\"] 使用方法：直接在对话过程中使用，空卡对话更佳，写卡完成后手动粘贴到世界书或角色描述中⚠️使用此模式建议关闭预设大部分条目，仅保留破限功能，以防干扰人设纯净⚠️ |\n/setvar key=mode ||\n/if left=mode rule=eq right=\"\" {: /flushvar mode | /abort :} ||\n/if left=mode rule=eq right=\"创建角色\" {:\n/input 请输入你构想的大概人设，姓名、性别、年龄、性格类型、所处世界观等（可外挂已有的设定、世界观世界书）取消将直接退出 |\n/setvar key=modnote {{pipe}} ||\n/if left={{getvar::modnote}} right=\"\" rule=eq {: /flushvar modnote | /flushvar mode | /abort :} ||\n    /send \n当前回合进入元指令。停止剧情，停止输出其他所有内容，进入【角色创作模式】，开始执行角色/人设创作：\n根据用户输入详细扩写丰满为一个完整角色档案，必须严格遵循用户设定：\n「人设要求：{{getvar::modnote}}」\n输出内容应当遵循以下原则：\n- 优先遵循输入的安排和要求\n- 严格遵从输出格式要求\n- 若有前置资料，需要读取全部资料，综合考虑时代背景、故事基调、世界观等\n- 以细节丰满人物个性\n- 避免脸谱化、标签式设定\n- 为了方便复制粘贴，输出内容需要以代码块包裹\n- 可按需求同时输出其他补充设定内容，同样按yaml格式+代码块包裹\n输出格式如下：\n```yaml\nchar_name:\n  Chinese name: \n  Nickname: \n  age: \n  gender: \n  height: \n  identity:\n    - \n  background_story:\n    童年(0-n岁):\n    少年(x-y岁):\n    青年(x-y岁):\n    中年(可选):\n    现状:\n  \n  social_status: \n    - \n\n  appearance:\n    hair: \n    eyes: \n    skin:\n    face_style: \n    build: \n      - \n  attire:\n    business_formal:\n    business_casual:\n    casual_wear:\n    home_wear:\n\n  archetype: \n\n  personality:\n    core_traits: \n      - : \"\"\n    romantic_traits: \n      - : \"\"\n       \n\n  lifestyle_behaviors:\n    - \n    - \n  \n  work_behaviors:\n    - \n  \n  emotional_behaviors:\n    angry:\n    happy: \n\n  goals（短期+长期）:\n    - \n  \n  weakness:\n    - \n\n  secrets:\n    - \n\n  likes:\n    - \n\n  dislikes:\n    - \n  \n  skills:\n    - 工作: [\"\",\"\"]\n    - 生活: [\"\",\"\"]\n    - 爱好: [\"\",\"\"]\n\n  NSFW_information:\n    Sex_related traits:\n      experiences: \n      sexual_orientation: \n      sexual_role: \n      sexual_habits: \n        - \n    Kinks: \n    Limits:\n```\n视情况输出以下模块：\n```yaml\n# XX（角色名）价值观：\nvalues:\n  moral_alignment:        # 道德取向（不是阵营，是判断方式）\n    - 规则优先 / 结果优先 / 关系优先 / 自我优先\n  justice_view:           # 对“正义”的理解\n  authority_view:         # 对权威/制度/国家的态度\n  freedom_view:           # 对自由的理解边界\n  loyalty_definition:     # 什么情况下才算“背叛”\n  taboo_lines:            # 绝对不能触碰的事\n    - \n```\n```yaml\n# XX（角色名）金钱观：\neconomic_view:\n  wealth_attitude:        # 对钱的态度（安全感 / 工具 / 权力 / 肮脏但必要）\n  spending_style:         # 消费方式（克制 / 冲动 / 投资型 / 享乐型）\n  risk_tolerance:         # 金钱风险承受度（低 / 中 / 高）\n  class_identity:         # 自我阶层认知（底层 / 中产 / 精英 / 游离）\n  dependency_on_money:    # 没钱时的心理崩溃程度\n```\n```yaml\n# XX（角色名）关系模式：\nrelationship_patterns:\n  attachment_style:       # 回避 / 焦虑 / 安全 / 混合\n  trust_building:         # 如何建立信任\n  conflict_response:      # 冲突时的第一反应\n  power_dynamics:         # 亲密关系中的权力取向\n```\n其他可选输出内容（应举一反三，以代码块包裹）：\n- 人物小传\n- 过往重要事件和影响\n- 时代背景\n- 故事基调\n:} ||\n\n/if left=mode rule=eq right=\"世界观创建\" {:\n/input 请输入你想创建的世界观要求，例如：题材类型、时代背景、核心规则、地理/势力/社会结构、禁忌、故事基调、需要生成的世界书词条范围等。取消将直接退出 |\n/setvar key=modnote {{pipe}} ||\n/if left={{getvar::modnote}} right=\"\" rule=eq {: /flushvar modnote | /flushvar mode | /abort :} ||\n/send\n当前回合进入元指令。停止剧情，停止输出其他所有内容，进入【世界观创建模式】，开始执行独立世界观/世界书词条创作：\n请根据用户输入，生成可直接放入世界书的世界观设定。优先尊重用户要求，同时允许进行合理补充和创造。\n「世界观要求：{{getvar::modnote}}」\n基本原则：\n- 世界观是独立设定，不默认绑定任何具体人物、角色卡、主角、user或已有角色。\n- 禁止把世界观写成“某个角色的背景”“某段角色关系”“某个角色专属设定”。\n- 只有当用户明确要求“为某角色生成世界观/补充某角色所属世界/生成某角色相关设定”时，才可以关联具体人物。\n- 如上下文里已有角色或人物信息，除非用户本次明确要求引用，否则只作为可忽略背景，不主动纳入世界观。\n- 不要替用户推进剧情正文，不要写角色行动；只写可复用的世界观词条。\n- 输出以yaml代码块为主，内容要有条理、逻辑清楚、方便复制进世界书。\n- 可以保留一定开放空间，不必把所有细节写死；允许留下“可扩展方向”。\n生成思路：\n先判断用户需求的复杂度。\n- 简单要求：输出一个完整yaml模块即可。\n- 中等要求：可拆成2-4个yaml模块。\n- 复杂世界观：拆成多个yaml模块分别叙述，例如总览、核心规则、地理区域、历史、势力、社会结构、能力/科技体系、禁忌代价、剧情钩子、世界书索引等。\n推荐格式如下，可按实际需求增删，不必机械照抄：\n```yaml\nworld_overview:\n  name: \"\"\n  genre: \"\"\n  tone: \"\"\n  core_premise: \"\"\n  central_conflict: \"\"\n  keywords:\n    - \"\"\n  open_space:\n    - \"\"\n```\n```yaml\nworld_rules:\n  basic_laws:\n    - \"\"\n  special_system:\n    name: \"\"\n    source: \"\"\n    limitation: \"\"\n    cost_or_risk: \"\"\n    social_impact: \"\"\n  taboo:\n    - item: \"\"\n      consequence: \"\"\n```\n```yaml\nhistory_and_current_status:\n  origin: \"\"\n  important_periods:\n    - period: \"\"\n      event: \"\"\n      result: \"\"\n  current_status: \"\"\n```\n```yaml\nlocations:\n  - name: \"\"\n    type: \"\"\n    function: \"\"\n    atmosphere: \"\"\n    conflict_or_secret: \"\"\n```\n```yaml\nfactions_or_social_groups:\n  - name: \"\"\n    type: \"\"\n    public_role: \"\"\n    goal: \"\"\n    resources: []\n    conflict_potential: \"\"\n```\n```yaml\nsociety_and_daily_life:\n  class_structure: \"\"\n  economy: \"\"\n  law_and_order: \"\"\n  culture: \"\"\n  ordinary_life: \"\"\n```\n```yaml\nplot_hooks:\n  - hook: \"\"\n    related_world_rule: \"\"\n    possible_direction: \"\"\n```\n```yaml\nworldbook_index:\n  recommended_entries:\n    - entry_name: \"\"\n      keywords: []\n      purpose: \"\"\n```\n如果用户给出的设定已经很完整，请以整理、补足逻辑、拆分词条为主，不要改写成另一个世界。\n:} ||\n/if left=mode rule=eq right=\"NPC提取\" {:\n/input 请输入你想提取的NPC姓名和要求（一般用于剧情中跑出新人物或者NPC，提取后将人设放在世界书内继续游玩），取消将直接退出 |\n/setvar key=modnote {{pipe}} ||\n/if left={{getvar::modnote}} right=\"\" rule=eq {: /flushvar modnote | /flushvar mode | /abort :} ||\n/send\n当前回合进入元指令。停止剧情，停止输出其他所有内容，进入【NPC人设模式】，开始执行NPC人设完善/修改：\n请根据以下用户输入，新增或者丰满所提到的角色/NPC；必须严格遵循输入意见，同时保持世界观、人物设定与逻辑连续性：\n「NPC名字和要求：{{getvar::modnote}}」\nNPC人设完善/修改应当遵循以下原则：\n- 优先按用户修改意见执行\n- 该NPC必须融入当前世界观，继承故事中的人物关系\n- 保持人设一致性\n- 避免脸谱化、标签式设定\n- 为了方便复制粘贴，输出内容需要以代码块包裹\n- 可按需求同时输出其他补充设定内容，同样按yaml格式+代码块包裹\n可参考的人设输出格式如下：\n```yaml\nNPC_name:\n  Chinese name: \n  Nickname: \n  age: \n  gender: \n  height: \n  identity:\n    - \n  background_story:\n    童年(0-n岁):\n    少年(x-y岁):\n    青年(x-y岁):\n    中年(可选):\n    现状:\n  \n  social_status: \n    - \n\n  appearance:\n    hair: \n    eyes: \n    skin:\n    face_style: \n    build: \n      - \n  attire:\n    business_formal:\n    casual_wear:\n    home_wear:\n\n  archetype: \n\n  personality:\n    core_traits: \n      - : \"\"\n    romantic_traits: \n      - : \"\"\n       \n\n  lifestyle_behaviors:\n    - \n    - \n  \n  likes:\n    - \n\n  dislikes:\n    - \n  \n  skills:\n    - 工作: [\"\",\"\"]\n    - 生活: [\"\",\"\"]\n    - 爱好: [\"\",\"\"]\n\n  NSFW_information:\n    Sex_related traits:\n      experiences: \n      sexual_orientation: \n      sexual_role: \n      sexual_habits: \n        - \n    Kinks: \n    Limits:\n```\n```yaml\n# XX（该NPC姓名）关系\nrelationships:\n  with 角色A:\n    relation_type:\n    current_status:\n    history_link:\n  with 角色B:\n    relation_type:\n    current_status:\n    history_link:\n……\n  with_user:\n    relation_type:\n    current_status:\n    potential_change:\n```\n:} ||\n/if left=mode rule=eq right=\"角色修改\" {:\n/input 请输入你对角色名字的人设修改意见，取消将直接退出 |\n/setvar key=modnote {{pipe}} ||\n/if left={{getvar::modnote}} right=\"\" rule=eq {: /flushvar modnote | /flushvar mode | /abort :} ||\n/send\n当前回合进入元指令。停止剧情，停止输出其他所有内容，进入【人设修改模式】，开始执行角色/人设修改：\n请根据以下用户的修改意见，对所提到的角色进行增删、细化与重排；必须严格遵循意见，同时保持世界观、人物设定与逻辑连续性：\n「用户的修改意见：{{getvar::modnote}}」\n人设修改应当遵循以下原则：\n- 优先按用户修改意见执行\n- 优先采用角色设定的原格式\n- 避免脸谱化、标签式设定\n- 为了方便复制粘贴，输出内容需要以代码块包裹\n- 可按需求同时输出其他补充设定内容，同样按yaml格式+代码块包裹\n可参考的人设格式如下：\n```yaml\nchar_name:\n  Chinese name: \n  Nickname: \n  age: \n  gender: \n  height: \n  identity:\n    - \n  background_story:\n    童年(0-n岁):\n    少年(x-y岁):\n    青年(x-y岁):\n    中年(可选):\n    现状:\n  \n  social_status: \n    - \n\n  appearance:\n    hair: \n    eyes: \n    skin:\n    face_style: \n    build: \n      - \n  attire:\n    business_formal:\n    business_casual:\n    casual_wear:\n    home_wear:\n\n  archetype: \n\n  personality:\n    core_traits: \n      - : \"\"\n    romantic_traits: \n      - : \"\"\n       \n\n  lifestyle_behaviors:\n    - \n    - \n  \n  work_behaviors:\n    - \n  \n  emotional_behaviors:\n    angry:\n    happy: \n\n  goals（短期+长期）:\n    - \n  \n  weakness:\n    - \n\n  secrets:\n    - \n\n  likes:\n    - \n\n  dislikes:\n    - \n  \n  skills:\n    - 工作: [\"\",\"\"]\n    - 生活: [\"\",\"\"]\n    - 爱好: [\"\",\"\"]\n\n  NSFW_information:\n    Sex_related traits:\n      experiences: \n      sexual_orientation: \n      sexual_role: \n      sexual_habits: \n        - \n    Kinks: \n    Limits:\n```\n:} ||\n/if left=mode rule=eq right=\"人设更新\" {:\n/input （⚠️一般用于角色卡玩了一段时间，原始人设跟剧情表现有了一定差异，更新人设可使RP更符合逻辑；⚠️建议更新后人设不要直接覆盖原始人设，而是放进世界书新条目，关闭旧人设）请输入你想更新的角色的姓名 + 更新意见，取消将直接退出 |\n/setvar key=modnote {{pipe}} ||\n/if left={{getvar::modnote}} right=\"\" rule=eq {: /flushvar modnote | /flushvar mode | /abort :} ||\n/send\n当前回合进入元指令。停止剧情，停止输出其他所有内容，进入【人设更新模式】，开始更新指定角色的原始设定：\n请根据以下用户的修改意见，对指定角色进行人设更新；必须严格遵循意见，同时保持世界观、人物设定与逻辑连续性：\n「用户指定的需更新角色和更新意见：{{getvar::modnote}}」\n人设更新应当遵循以下原则：\n- 人设更新是为了将“已发生的历史故事”融入角色设定，修正原始设定和当前故事的差异\n- 角色背景故事 + 经历是塑造人物逻辑的核心\n- 优先按用户修改意见执行\n- 优先采用角色设定的原格式\n- 注意角色的内核始终如一，具有一致性和连贯性，不应和其他人物相关的词条冲突\n- 以细节丰满人物，让人物立起来\n- 避免脸谱化、标签式设定\n- 为了方便复制粘贴，输出内容需要以代码块包裹\n- 可按需求同时输出其他补充设定内容，同样按yaml格式+代码块包裹\n- 输出内容必须包括char人设的分析，阐明什么样的心理和事件导致了char设定的变化\n- 输出必须详尽，不遗漏任何原始细节\n输出格式如下：\n```yaml\nXX（角色名）人设变化分析及思考\n【这部分只是思考，无需复制到世界书】\n一、更新思考\n  - 原始人设的核心定位:\n  - 当前剧情中角色的实际表现:\n  - 二者出现偏差的原因概述:\n  - 时间点锚定：{包括是否需要更新char的年龄}\n  - 身体变化/疾病/能力变化:（可选）\n  - 身份和地位变化（可选）:\n\n二、角色本位思考（这部分必须从char本人视角出发）\n  - 重要外部事件:\n    - 对char的影响：\n  - 内部心理机制:\n    - 价值观和动机变化：\n    - 自我叙事变化：\n    - 核心需求变化：\n  - 行为层面反应:\n    - 决策风格变化：\n    - 道德和底线：\n    - 信任和边界：\n    - 语言风格变化：\n\n三、人设一致性\n  - 不会改变的核心特质：\n  - 与世界观规则的兼容性检查:\n\n四、人设差异点与对应理由\n  差异点1:\n    原始设定:\n    当前表现:\n    变化溯源和分析:\n\n  差异点2:\n    原始设定:\n    当前表现:\n    变化溯源和分析:\n……\n…\n  差异点n:\n    原始设定:\n    当前表现:\n    变化溯源和分析:\n```\n根据分析，更新人设如下（2500字以上，下文格式仅供参考，优先使用原设定格式，更新人设必须覆盖全部原始设定，保持人设一致性，不可省略原始细节）：\n```yaml\nXX（char的姓名）人物设定（更新版）\nchar_name:\n  Chinese name: \n  Nickname: \n  age: \n  gender: \n  height: \n  identity:\n    - \n  background_story:\n    童年(0-n岁):\n    少年(x-y岁):\n    青年(x-y岁):\n    中年(可选):\n    现状:\n  \n  social_status: \n    - \n\n  appearance:\n    hair: \n    eyes: \n    skin:\n    face_style: \n    build: \n      - \n  attire:\n    business_formal:\n    business_casual:\n    casual_wear:\n    home_wear:\n\n  archetype: \n\n  personality:\n    core_traits: \n      - : \"\"\n    romantic_traits: \n      - : \"\"\n       \n\n  lifestyle_behaviors:\n    - \n    - \n  \n  work_behaviors:\n    - \n  \n  emotional_behaviors:\n    angry:\n    happy: \n\n  goals（短期+长期）:\n    - \n  \n  weakness:\n    - \n\n  secrets:\n    - \n\n  likes:\n    - \n\n  dislikes:\n    - \n  \n  skills:\n    - 工作: [\"\",\"\"]\n    - 生活: [\"\",\"\"]\n    - 爱好: [\"\",\"\"]\n\n  NSFW_information:\n    Sex_related traits:\n      experiences: \n      sexual_orientation: \n      sexual_role: \n      sexual_habits: \n        - \n    Kinks: \n    Limits:\n```\n:} ||\n/if left=mode rule=eq right=\"开场白创作（不代入user设定）\" {:\n/input 请输入你对开场白的初步构思，包括大概场景和人物，取消将直接退出 |\n/setvar key=modnote {{pipe}} ||\n/if left={{getvar::modnote}} right=\"\" rule=eq {: /flushvar modnote | /flushvar mode | /abort :} ||\n/send\n当前回合进入元指令。停止剧情，停止输出其他所有内容，进入【开场白模式】，开始创作故事开场白：\n请根据以下用户输入，严格遵守输入的内容和要求，同时保持世界观、人物设定与逻辑连续性：\n「开场白指导：{{getvar::modnote}}」\n开场白是故事的开端，因此你要为整个故事定好总基调，使其不落入俗套，结尾留有回应的余地。创作“开场白”应当仔细思考并遵循以下原则：\n0.初始化\n- 作为故事开篇，应忽略history部分，仅以原设定作为基础\n- 谨慎使用任何回忆和倒叙\n人物塑造\n- 仔细分析阅读当前核心角色、<user>、NPC，确保不混淆char和user的性别、背景、性格、服装、物品等细节\n- 思考如何避免术语、机器人、空洞和非人化，塑造立体、有血有肉、对话贴近生活的人物？\n- 让char和user的好友、宠物等核心NPCs有适度的剧情参与存在感\n禁止抢话\n- 开场白的描述核心应该是角色本人，充分交代前情提要，渲染故事氛围，创造悬念和留白，给<user>留下可回应的结尾收束\n- 尽量避免对<user>的详细描写，默认<user>无性别、无具体外貌，无强烈主观行动的台词\n- 忽视<user>的一切设定，把TA作为背景板\n视角采用前文所要求的形式{{getvar::POV}},注意对char和user的称呼\n字数要求800-1500字\n输出示例\n<hr>\n<p style=\"text-align: center; font-size: 1em; font-style: italic;\"><strong>- 开场白(序号)：简短标题 -</strong></p>\n<!-- 本开场白目标字数为xxxx，目标段落为xx，开始按格式输出 -->\n（开场白正文文字……）\n:} ||\n/if left=mode rule=eq right=\"开场白创作（代入当前user）\" {:\n/input 请输入你对开场白的初步构思，包括大概场景和人物，取消将直接退出 |\n/setvar key=modnote {{pipe}} ||\n/if left={{getvar::modnote}} right=\"\" rule=eq {: /flushvar modnote | /flushvar mode | /abort :} ||\n/send\n当前回合进入元指令。停止剧情，停止输出其他所有内容，进入【开场白模式】，开始创作故事开场白：\n请根据以下用户输入，严格遵守输入的内容和要求，同时保持世界观、人物设定与逻辑连续性：\n「开场白指导：{{getvar::modnote}}」\n开场白是故事的开端，因此你要为整个故事定好总基调，使其不落入俗套，结尾留有回应的余地。创作“开场白”应当仔细思考并遵循以下原则：\n0.初始化\n- 作为故事开篇，应忽略history部分，仅以原设定作为基础\n- 谨慎使用任何回忆和倒叙\n人物塑造\n- 仔细分析阅读当前核心角色、<user>、NPC，确保不混淆char和user的性别、背景、性格、服装、物品等细节\n- 思考如何避免术语、机器人、空洞和非人化，塑造立体、有血有肉、对话贴近生活的人物？\n- 让char和user的好友、宠物等核心NPCs有适度的剧情参与存在感\n融合user人设\n- 开场白聚焦char和<user>的互动，充分交代前情提要，渲染故事氛围，创造悬念和留白，给<user>留下可回应的结尾收束\n- 详细回顾<user>设定，并自然地融入开场白中\n- 可以详细体现<user>的外貌、目前状态\n- 克制地演绎<user>，将扮演交回<user>\n视角采用前文所要求的形式{{getvar::POV}},注意对char和user的称呼\n字数要求800-1500字\n输出示例\n<hr>\n<p style=\"text-align: center; font-size: 1em; font-style: italic;\"><strong>- 开场白(序号)：简短标题 -</strong></p>\n<!-- 本开场白目标字数为xxxx，目标段落为xx，开始按格式输出 -->\n（开场白正文文字……）\n:} ||\n/flushvar outline ||\n/flushvar modnote ||\n/flushvar mode ||\n/trigger||","提示词工程":"/buttons labels=[\"预设提示词调整\"] 🛠️提示词工程 |\n/setvar key=mode ||\n/if left=mode rule=eq right=\"\" {: /flushvar mode | /abort :} ||\n/if left=mode rule=eq right=\"预设提示词调整\" {:\n/input 请输入你对当前预设/提示词效果的反馈，例如：故事节奏很奇怪，人物反应不主动；取消将直接退出 |\n/setvar key=modnote {{pipe}} ||\n/if left={{getvar::modnote}} right=\"\" rule=eq {: /flushvar modnote | /flushvar mode | /abort :} ||\n/send\n当前回合进入元指令。停止RP，停止剧情推进，停止输出正文、旁白、角色台词和角色行动，进入【提示词工程：预设提示词调整】模式。\n\n任务目标：\n请根据用户反馈，回顾当前上下文中你收到的所有提示词部分，包括但不限于：系统/开发者/角色卡/世界书/作者注释/预设规则/历史摘要/当前场景约束/用户自定义要求。判断问题最可能来自哪些提示词缺口、冲突、表述含混或权重不足，并给出可复制到预设或世界书中的 YAML 修改方案。\n\n用户反馈：\n「{{getvar::modnote}}」\n\n执行原则：\n- 只做提示词工程分析和词条改写，不继续RP，不替角色说话，不写剧情正文。\n- 先判断应该【修改现有词条】还是【新增词条】；如果两者都需要，可以同时给出。\n- 必须说明每条建议解决什么问题、适合放在哪里、触发关键词是什么。\n- 修改现有词条时，应尽量保留原词条的意图，只补足约束、消除冲突、提高可执行性。\n- 新增词条时，应避免重复已有规则；只补上当前反馈暴露出的缺口。\n- 如果用户反馈含糊，先归纳可能问题，再给出保守改法。\n- 输出必须以 YAML 代码块为主，方便用户复制增加或替换。\n- 不要输出大段空泛建议；每个词条都要能直接放进预设/世界书。\n- 如果发现多个提示词互相冲突，请明确列出冲突点和推荐保留方向。\n\n输出格式如下：\n```yaml\nprompt_engineering_adjustment:\n  user_feedback: \"{{getvar::modnote}}\"\n  diagnosis:\n    likely_problem:\n      - \"\"\n    prompt_sources_to_review:\n      - source: \"\"\n        issue: \"\"\n    decision: \"modify_existing / add_new / both\"\n\n  replace_entries:\n    - entry_name: \"\"\n      target_location: \"预设 / 世界书 / 作者注释 / 角色卡 / 其他\"\n      trigger_keywords:\n        - \"\"\n      replace_reason: \"\"\n      old_entry_problem: \"\"\n      new_content: |\n        \n\n  add_entries:\n    - entry_name: \"\"\n      target_location: \"预设 / 世界书 / 作者注释 / 角色卡 / 其他\"\n      trigger_keywords:\n        - \"\"\n      add_reason: \"\"\n      new_content: |\n        \n\n  conflict_check:\n    - conflict: \"\"\n      recommendation: \"\"\n\n  usage_note:\n    - \"\"\n```\n\n:} ||\n/flushvar outline ||\n/flushvar modnote ||\n/flushvar mode ||\n/trigger||","隐藏楼层":"/input okButton=\"确定\" cancelButton=\"取消\" 输入要隐藏的楼层范围（例如：0-10），一般保留最近的5-10楼 |\n/if left={{pipe}} right=\"\" rule=neq {: /hide {{pipe}} | /echo 已隐藏 {{pipe}} :} {::} |","取消隐藏":"/input okButton=\"确定\" cancelButton=\"取消\" 输入要取消隐藏的楼层范围（例如：0-10）最近的5-10楼一般是不隐藏的 |\n/if left={{pipe}} right=\"\" rule=neq {: /unhide {{pipe}} | /echo 已取消隐藏 :} {::} |","自动继续":"/setvar key=final_message \"<!-- Request:请在当前剧情的基础上继续推进剧情。维持已有节奏基础上，合理发展故事。 --!>\" ||\n/send {{getvar::final_message}} ||\n/flushvar final_message ||\n/trigger"};
    const groupForName = function groupForName(name) {
    const mark = /^(.{1,10}?)(?:单选|(?:\d{1,2}|多)选1)$/;
    const value = String(name || '')
        .replace(/\s*#\s*[A-Za-z][^#｜]*/g, '')
        .replace(/\s*@[^\s#｜]+/g, '')
        .trim();
    for (const part of value.split('｜').slice(1)) {
        const hit = mark.exec(part.trim());
        if (hit && hit[1]) return hit[1];
    }
    if (/^⌨️/.test(value)) return '文风';
    return '';
};
    // 互斥组由条目名称里的「｜XX单选」自动发现；这里只规定常用组的显示顺序。
    const GROUP_ORDER = ['人称', '文风', '抢话', 'COT', '果农', '主剧场',
        '风格', '关系', '描写', '走向', '节奏', '工作模式',
        '写作指导', '正文格式', '序言', 'seeds', '互动逻辑', '喵喵选择器'];
    const PRIMARY_GROUPS = 6;
    const QR_ORDER = ['剧情控制', '括号大法', '总结模式', '大纲模式', '写卡模式', '提示词工程', '隐藏楼层', '取消隐藏', '自动继续'];
    const NAV_ITEMS = [
        ['overview', '⌂', '首页'], ['qr', '⌘', 'QR'], ['entries', '≡', '条目'], ['settings', '⚙', '设置'],
    ];
    const SCRIPT_VERSION = "20260919.8";
    const SUBTITLE = `脚本 v${SCRIPT_VERSION} · 果实 V6+`;
    // 输出区里「正文」那一组：改正文长什么样的。其余都算非正文。
    // 每张卡一条胶带色；别的皮肤用不到这个变量，不影响
    // 首页栏目：顺序和默认展开都存在预设里，跟着方案走
    const HOME_CARDS = [
        ['qr', '快捷指令 QR', false], ['common', '常用', false], ['turn', '常规设置', false],
        ['theatre', '小剧场', true], ['nsfw', 'NSFW', true], ['body', '正文', true],
        ['rest', '非正文', true], ['farmer', '果农人格', true],
    ];
    function homeOrder(config) {
        const known = HOME_CARDS.map(item => item[0]);
        const want = (config.homeOrder || []).filter(id => known.includes(id));
        return [...want, ...known.filter(id => !want.includes(id))];
    }
    function homeFolded(config, id) {
        if (id in folded) return folded[id];
        return (config.homeOpen || {})[id] === false;
    }
    const folded = {};          // 本次会话里临时折起来的，不写回预设
    const TAPE = { qr:'#e8b9a2', common:'#e0cfa8', turn:'#d5cbb0', theatre:'#e6b8c6',
        nsfw:'#b6c4de', body:'#d9cdb4', rest:'#b8d6c4', farmer:'#cdc0d8' };
    const DOT = { qr:'#b8735a', common:'#9a8360', turn:'#8a7350', theatre:'#a8566b',
        nsfw:'#5f6f96', body:'#8a7350', rest:'#4f7a63', farmer:'#7d6a86' };
    function cardVars(id) { return `--tape:${TAPE[id]};--dot:${DOT[id]}`; }
    const BODY_OUT = /角色内心|灵动正文|果农吐槽|正文防转折|防转折|文末钩子|正文与字数检测|字数检测|性爱柔和自检|柔和自检/;
    const WORD_PRESETS = [['短', 800, 800], ['长', 2200, 2500]];
    // QR 子菜单拍平：把 /buttons 那一段换成 /pass "标签"，其余指令一个字不改。
    const QR_BUTTONS = /\/buttons\s+labels=\[[^\]]*\][^|]*/;
    function qrCommandFor(label, command) {
        if (!label) return command;
        return String(command).replace(QR_BUTTONS, `/pass "${label.replace(/"/g, '')}" `);
    }
    // ── QR 集：数据存在预设里，出厂内容来自 @喵喵电波MoM 的 QR 文件 ──
    // 每张卡就是酒馆 QR 里的一条指令：/buttons 出二级菜单，下面一堆 /if 分支接住。
    // 面板只在原文上做「外科手术」（改 labels 数组、改某个 /if 分支），其余一个字不动，
    // 所以导出去还是一份能被酒馆直接读的 QR 集，不装果实之心的人照样能用。
    const QR_SET_NAME = '🌟喵喵电波MoM快速回复QR（0622）';
    const QR_ENTRY = { label: '🌟喵喵电波QR(0201)', title: 'MoM 系预设配套 QR 工具，内含剧情控制、括号大法、大总结、大纲编写、写卡模式和提示词工程等功能' };
    const QR_NOTES = { 剧情控制: '推进 · 加速 · 减缓 · 换线，写进输入框不发送', 括号大法: '22 条括号提醒，写进输入框不发送', 总结模式: '总结后记得隐藏上文楼层', 大纲模式: '最终版留在聊天记录里', 写卡模式: '建议空卡对话，只留破限', 提示词工程: '把你的反馈变成改稿建议', 隐藏楼层: '输入范围，例如 0-10', 取消隐藏: '一般保留最近 5-10 楼', 自动继续: '直接发送「继续推进剧情」，不经过输入框' };
    const BRANCH_HEAD = /\/if\s+left=(?:option|mode)\s+rule=eq\s+right="([^"]*)"\s*\{:/g;
    const REQUEST_BODY = /^\s*\/setvar\s+key=final_message\s+"<!--\s*Request:([\s\S]*?)--!>"\s*$/;
    const ASK_MARK = /\{\{\s*输入\s*\}\}/;
    const ASK_MARK_G = /\{\{\s*输入\s*\}\}/g;
    const ASK_VAR = '{{getvar::fh_ask}}';

    // 「切换到IF线」的正文。默认 QR 集（fruit-heart-qr.json）里也是这一段，两边别改岔了。
    // 写法照抄隔壁那几条（推进剧情 / 切换其他故事线）：一条 /setvar，末尾挂 {{getvar::order}}。
    // 别再用 /if left={{getvar::order}} —— 那是把变量的值展开成参数，用户输入里有空格就断了。
    // 「自动继续」＝推进剧情，但不写输入框、直接发出去。做成独立大类而不是剧情控制里的一个标签：
    // 首页那排按钮是整条指令跑完，剧情控制开头有 /input，当标签用会先弹个输入框，就不"一键"了。
    const QR_AUTO_CARD = `/setvar key=final_message "<!-- Request:请在当前剧情的基础上继续推进剧情。维持已有节奏基础上，合理发展故事。 --!>" ||
/send {{getvar::final_message}} ||
/flushvar final_message ||
/trigger`;
    // v4 那版把它做成了剧情控制里的标签，还改了那张卡的尾部。这里把改动原样退回去。
    function undoAutoBranch(card) {
        let text = String(card.message);
        if (!text.includes('left=auto')) return text;
        text = dropBranch(text, '自动继续');
        const echo = /\/if left=auto rule=neq right="1" \{: \/setinput \{\{getvar::final_message\}\}(?: \| \/echo ([^:]*?))? :\} \|\|/.exec(text);
        text = text.replace(/\/if left=auto rule=eq right="1" \{: \/send \{\{getvar::final_message\}\} \| \/trigger :\} \|\|\n/, '');
        if (echo) text = text.replace(echo[0], '/setinput {{getvar::final_message}} ||' + (echo[1] ? '\n/echo ' + echo[1].trim() + ' ||' : ''));
        return text.replace(/\/flushvar auto \|\|\n/, '');
    }
    const QR_IF_BRANCH = `
  /setvar key=final_message "<!-- Request:开一条 IF 线。以当前这一幕为分叉点，假设一种不同的可能，并从这个假设出发重写接下来的发展；若下面没有写明假设，就由你挑一个有意思的分叉点（某个关键选择反过来、某个人没有出现、某件事早发生一天）。保留世界观、人物性格和既有关系，只改动这个假设直接波及的部分；人物的身份、年龄、所处时空若因此改变，要前后自洽。这是与主线并行的支线，不覆盖主线已经发生的事。{{getvar::order}} --!>"
`;
    function qrSeed() {
        return {
            name: QR_SET_NAME,
            entry: { ...QR_ENTRY },
            cards: QR_ORDER.map((label, index) => ({
                id: 'qr-seed-' + index, label, title: QR_NOTES[label] || '', message: QR_COMMANDS[label],
            })),
        };
    }
    // 她的 QR 集是导进来的（存在 config.qr 里），所以改默认的 QR_COMMANDS 到不了她那边。
    // 这里放后来新增的按钮，开面板时补一次，补过就记下版本号不再动 ——
    // 她要是自己把按钮删了，版本号已经涨过，不会又给她塞回去。
    const QR_SEED_VERSION = 5;
    const QR_PATCHES = [
        { since: 3, card: '剧情控制', label: '切换到IF线', body: QR_IF_BRANCH },

    ];
    async function upgradeQr() {
        const config = readConfig();
        if ((Number(config.qrSeedVersion) || 0) >= QR_SEED_VERSION) return;
        const set = config.qr;
        let touched = false;
        if (set && Array.isArray(set.cards)) {
            // 旧版 addBranch 插错位置，凡是在面板里加过标签的大类，分隔符都被偷掉了。
            // 全部卡都过一遍修回来；旧的「切换到IF线」写法也不对，摘掉重装。
            if ((Number(config.qrSeedVersion) || 0) < 3) {
                for (const card of set.cards) {
                    const fixed = normalizeQr(card.message);
                    const next = branchOf(fixed, '切换到IF线') ? dropBranch(fixed, '切换到IF线') : fixed;
                    if (next !== card.message) { card.message = next; touched = true; }
                }
            }
            // v4 把「自动继续」做成了剧情控制里的标签，现在改成独立大类，先把那一版退干净
            for (const card of set.cards) {
                const next = undoAutoBranch(card);
                if (next !== card.message) { card.message = next; touched = true; }
            }
            if ((Number(config.qrSeedVersion) || 0) < 5 && !set.cards.some(item => item.label === '自动继续')) {
                set.cards.push({ id: 'qr-auto-' + Date.now().toString(36), label: '自动继续',
                    title: '直接发送「继续推进剧情」，不经过输入框', message: QR_AUTO_CARD });
                touched = true;
            }
            for (const patch of QR_PATCHES) {
                if ((Number(config.qrSeedVersion) || 0) >= patch.since) continue;
                const card = set.cards.find(item => item.label === patch.card);
                if (!card || qrLabels(card.message).includes(patch.label)) continue;
                card.message = addBranch(card.message, patch.label, patch.body);
                if (patch.after) {            // 标签顺序＝菜单顺序，挪到指定的那个后面
                    const list = qrLabels(card.message).filter(x => x !== patch.label);
                    const at = list.indexOf(patch.after);
                    list.splice(at < 0 ? list.length : at + 1, 0, patch.label);
                    card.message = writeLabels(card.message, list);
                }
                touched = true;
            }
        }
        await updateBoth(preset => {
            const cfg = readConfig(preset);
            if (touched) cfg.qr = set;
            cfg.qrSeedVersion = QR_SEED_VERSION;
            writeConfig(preset, cfg);
            return preset;
        });
        if (touched) toast('success', '快捷指令已更新：剧情控制 → 切换到IF线');
    }
    function qrSet(config) {
        const set = config.qr;
        if (!set || !Array.isArray(set.cards) || !set.cards.length) return qrSeed();
        return set;
    }
    function qrSends(message) { return /(^|\n)\s*\/(?:send|trigger)\b/.test(String(message || '')); }

    // /buttons labels=[...] 那一段：只换数组，说明文字和后面的管道全留着
    function qrLabels(command) {
        const m = QR_BUTTONS.exec(String(command || ''));
        QR_BUTTONS.lastIndex = 0;
        if (!m) return [];
        const list = /labels=\[([^\]]*)\]/.exec(m[0]);
        return list ? [...list[1].matchAll(/"([^"]*)"/g)].map(x => x[1]) : [];
    }
    // /buttons labels=[...] 后面那一段，是酒馆弹出菜单时显示在顶上的说明。
    // 她原来的 QR 把用法和 @署名 都写在这儿（大纲模式那条谢的是 @Nanimo_Nai），
    // 面板之前只显示自己那句短 title，等于把作者写的说明和署名吞了。
    function qrDesc(message) {
        const m = QR_BUTTONS.exec(String(message || ''));
        QR_BUTTONS.lastIndex = 0;
        if (!m) return '';
        return m[0].replace(/^\/buttons\s+labels=\[[^\]]*\]/, '').trim();
    }
    function writeDesc(message, text) {
        const m = QR_BUTTONS.exec(String(message || ''));
        QR_BUTTONS.lastIndex = 0;
        if (!m) return String(message);
        const head = m[0].replace(/^(\/buttons\s+labels=\[[^\]]*\])[\s\S]*$/, '$1');
        const body = String(text || '').replace(/[|\n]/g, ' ').trim();
        return String(message).slice(0, m.index) + head + (body ? ' ' + body : '') + ' ' + String(message).slice(m.index + m[0].length);
    }
    function writeLabels(message, labels) {
        return String(message).replace(/labels=\[[^\]]*\]/, 'labels=[' + labels.map(x => `"${String(x).replace(/"/g, '')}"`).join(',') + ']');
    }
    // /if ... right="X" {: 正文 :} —— 正文里还能再套 {: :}，所以得数括号，不能光靠正则
    function qrBranches(message) {
        const text = String(message || '');
        const out = [];
        BRANCH_HEAD.lastIndex = 0;
        let hit;
        while ((hit = BRANCH_HEAD.exec(text))) {
            const bodyFrom = hit.index + hit[0].length;
            let depth = 1, cursor = bodyFrom;
            while (cursor < text.length && depth) {
                if (text.startsWith('{:', cursor)) { depth += 1; cursor += 2; }
                else if (text.startsWith(':}', cursor)) { depth -= 1; cursor += 2; }
                else cursor += 1;
            }
            if (hit[1]) out.push({ label: hit[1], head: hit.index, bodyFrom, bodyTo: cursor - 2, end: cursor });
            BRANCH_HEAD.lastIndex = cursor;
        }
        return out;
    }
    function branchOf(message, label) { return qrBranches(message).find(item => item.label === label) || null; }
    function branchBody(message, label) {
        const hit = branchOf(message, label);
        return hit ? String(message).slice(hit.bodyFrom, hit.bodyTo) : '';
    }
    function requestText(body) {
        const hit = REQUEST_BODY.exec(String(body || '').replace(/\/input[\s\S]*?\/if[^\n]*\n/, ''));
        return hit ? hit[1].trim() : null;
    }
    function makeBody(text, hint) {
        const ask = ASK_MARK.test(text);
        const filled = String(text).replace(ASK_MARK_G, ASK_VAR).replace(/"/g, '');
        const request = `\n  /setvar key=final_message "<!-- Request:${filled} --!>" \n`;
        if (!ask) return request;
        return `\n  /input okButton="确定" cancelButton="取消" ${String(hint || '想补一句什么？').replace(/[|{}"]/g, ' ')} |`
            + '\n  /setvar key=fh_ask {{pipe}} ||'
            + '\n  /if left={{getvar::fh_ask}} right="" rule=eq {: /flushvar fh_ask | /abort :} ||'
            + request;
    }
    function askHint(body) {
        const hit = /\/input\s+okButton="[^"]*"\s+cancelButton="[^"]*"\s+([^\n|]*)/.exec(String(body || ''));
        return hit ? hit[1].trim() : '';
    }
    function friendlyText(body) {
        const text = requestText(body);
        return text === null ? null : text.split(ASK_VAR).join('{{输入}}');
    }
    function saveBranch(message, label, body) {
        const hit = branchOf(message, label);
        if (!hit) return message;
        return String(message).slice(0, hit.bodyFrom) + body + String(message).slice(hit.bodyTo);
    }
    function renameBranch(message, from, to) {
        const hit = branchOf(message, from);
        if (!hit) return message;
        const text = String(message);
        const head = text.slice(hit.head, hit.bodyFrom).replace(`right="${from}"`, `right="${to}"`);
        const next = text.slice(0, hit.head) + head + text.slice(hit.bodyFrom);
        return writeLabels(next, qrLabels(next).map(x => (x === from ? to : x)));
    }
    // qrBranches 的 end 停在 :} 上，但 :} 后面那个 || 是这条分支的分隔符，属于它。
    // 插入必须插在 || 之后 —— 插在中间就等于把上一条分支的 || 偷走，上一条断链，
    // 整条命令在酒馆里解析失败，表现是「点完输入框就没反应了」。
    function branchTail(text, hit) {
        const pipe = /^[ \t]*\|\|/.exec(String(text).slice(hit.end));
        return hit.end + (pipe ? pipe[0].length : 0);
    }
    // 分支之间的分隔符是 `:} ||`。旧版 addBranch 插错了位置，每加一个标签就把上一条的 ||
    // 偷走一个 —— 上一条以 :} 结尾、链断在那儿，最后一条屁股后面攒一串 || || ||。
    // 酒馆解析到断点就整条放弃，表现就是「点完输入框没反应」。这里把 || 还回去。
    function normalizeQr(message) {
        let text = String(message).replace(/\|\|(?:[ \t]*\|\|)+/g, '||');
        const list = qrBranches(text);
        for (let i = list.length - 1; i >= 0; i -= 1) {      // 从后往前补，前面的下标才不会错位
            const hit = list[i];
            if (/^[ \t]*\|\|/.test(text.slice(hit.end))) continue;
            text = text.slice(0, hit.end) + ' ||' + text.slice(hit.end);
        }
        return text;
    }
    function addBranch(message, label, body) {
        const list = qrBranches(message);
        const at = list.length ? branchTail(message, list[list.length - 1]) : String(message).indexOf('\n', String(message).indexOf('/setvar key=option')) + 1;
        const text = writeLabels(message, [...qrLabels(message), label]);
        const cut = at + (text.length - String(message).length);   // labels 数组永远在分支前面，整体后移这么多
        return normalizeQr(text.slice(0, cut) + `\n\n/if left=option rule=eq right="${label}" {: ${body}:} ||` + text.slice(cut));
    }
    function dropBranch(message, label) {
        const hit = branchOf(message, label);
        const text = writeLabels(message, qrLabels(message).filter(x => x !== label));
        if (!hit) return text;
        const shift = text.length - String(message).length;
        return text.slice(0, hit.head + shift) + text.slice(hit.end + shift).replace(/^\s*\|\|/, '');
    }
    const NEW_CARD_BODY = message => `/buttons labels=["新标签"] ${message} |
/setvar key=option ||

/if left=option rule=eq right="" {: /flushvar option | /abort :} ||

/if left=option rule=eq right="新标签" {: 
  /setvar key=final_message "<!-- Request:  --!>" 
:} ||

/setvar key=origin_input {{input}} ||
/setvar key=merged_input "{{getvar::origin_input}}{{getvar::final_message}}" ||
/setinput {{getvar::merged_input}} ||
/echo 指令已填进输入框，可自行修改 ||

/flushvar option ||
/flushvar final_message ||`;

    // ── 导出：拼一份酒馆能直接读的 QR 集 ──
    // /run 认标签，而且是【在所有启用的 QR 集里从头找第一个同名的】（酒馆
    // executeQuickReplyByName 的实现）。她原来那套 0622 还开着，里面也有一条叫「剧情控制」，
    // 于是导入新集之后点进去跑的还是旧的那条 —— 新加的按钮当然不显示。
    // 写成 `集名.标签` 走酒馆的限定查找，就只会命中本集自己的那条。
    function qrExport(set) {
        const entryLabels = set.cards.map(card => card.label);
        // 名字里没有空格就别加引号 —— 原来那句 `/run 剧情控制` 就是不带引号的，照着来最稳
        const scoped = label => {
            const full = `${String(set.name).replace(/"/g, '')}.${String(label).replace(/"/g, '')}`;
            return /\s/.test(full) ? `"${full}"` : full;
        };
        const dispatch = `/buttons labels=[${entryLabels.map(x => `"${x.replace(/"/g, '')}"`).join(',')}] ${set.entry.title || set.name} |\n`
            + '/setvar key=option ||\n/if left=option rule=eq right="" {: /flushvar option | /abort :} ||\n'
            + entryLabels.map(x => `/if left=option rule=eq right="${x}" {: /flushvar option | /run ${scoped(x)} :} ||`).join('\n') + '\n';
        const item = (extra, index) => ({
            id: index * 2 + 2, showLabel: false, label: '', title: '', message: '', contextList: [],
            preventAutoExecute: true, isHidden: true, executeOnStartup: false, executeOnUser: false,
            executeOnAi: false, executeOnChatChange: false, executeOnGroupMemberDraft: false,
            executeOnNewChat: false, executeBeforeGeneration: false, automationId: '', ...extra,
        });
        const list = [item({ showLabel: true, isHidden: false, label: set.entry.label, title: set.entry.title, message: dispatch }, 0)]
            .concat(set.cards.map((card, index) => item({ label: card.label, title: card.title || '', message: card.message }, index + 1)));
        return {
            version: 2, name: set.name, disableSend: false, placeBeforeInput: false, injectInput: false,
            color: 'rgba(0, 0, 0, 0)', onlyBorderColor: true, qrList: list,
            idIndex: list.length * 2 + 2,   // 下一个可用 id，不能等于已经用掉的最大 id
        };
    }
    function qrImport(raw) {
        const box = typeof raw === 'string' ? JSON.parse(raw) : raw;
        const list = Array.isArray(box?.qrList) ? box.qrList : null;
        if (!list || !list.length) throw new Error('这不像一份酒馆 QR 集');
        const visible = list.find(item => item.isHidden === false || item.showLabel === true);
        const rest = list.filter(item => item !== visible);
        const cards = (rest.length ? rest : list).filter(item => String(item.label || '').trim()).map((item, index) => ({
            id: 'qr-in-' + Date.now().toString(36) + '-' + index,
            label: String(item.label), title: String(item.title || ''), message: String(item.message || ''),
        }));
        if (!cards.length) throw new Error('这份 QR 集里没有可用的指令');
        return {
            name: String(box.name || QR_SET_NAME),
            entry: { label: String(visible?.label || QR_ENTRY.label), title: String(visible?.title || '') },
            cards,
        };
    }
    async function writeQr(mutate) {
        await updateBoth(preset => {
            const config = readConfig(preset);
            const set = JSON.parse(JSON.stringify(qrSet(config)));
            config.qr = mutate(set) || set;
            writeConfig(preset, config);
            return preset;
        });
    }

    const PLACEHOLDER_IDS = new Set(['worldInfoBefore', 'personaDescription', 'charDescription', 'charPersonality', 'scenario', 'worldInfoAfter', 'dialogueExamples', 'chatHistory']);
    const hostWindow = (() => {
        let current = window;
        try {
            while (current.parent && current.parent !== current) current = current.parent;
        } catch {}
        return current;
    })();
    const doc = hostWindow.document || document;
    const jq = hostWindow.jQuery || window.jQuery;
    if (!jq) return console.error('[果实之心] 未找到 jQuery');

    try { if (hostWindow.localStorage.getItem('fruit-heart-disabled') === 'true') { hostWindow.localStorage.removeItem('fruit-heart-disabled'); return; } } catch {}

    const old = hostWindow.__FRUIT_HEART_MAIN__;
    if (old && typeof old.destroy === 'function') old.destroy();
    const INSTANCE_ID = `fh${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;
    const ENTRY_EVENT_NS = `.fruitHeartEntry_${INSTANCE_ID}`;
    const KEY_EVENT_NS = `.fruitHeartKeys_${INSTANCE_ID}`;
    const BALL_EVENT_NS = `.fruitHeartBall_${INSTANCE_ID}`;
    let destroyed = false;

    let busy = false;
    let currentView = 'overview';
    let selectedTagFamily = '';
    let selectedMajor = 'all';
    let selectedMinor = '';
    let entryQuery = '';
    let entriesOnOnly = false;
    let nsfwOpen = false;
    let theatreOpen = false;
    let qrEdit = false;          // QR 编辑模式
    let qrCardEdit = '';         // 正在改名的大类 id
    let qrTag = null;            // { card, label?, text, hint, kind, exists }
    let forceSection = '';
    let sortSections = false;
    const openSections = new Set();
    const readFlag = (key, fallback) => { try { const v = hostWindow.localStorage.getItem(key); return v === null ? fallback : v === 'true'; } catch { return fallback; } };
    // 楼层跳转：默认开。开着就把悬浮球一起叫出来（两个按钮是挂在球上的）。
    // 向上是竖起来的猫尾巴，向下是猫的身子 —— 跟猫头同一套扁平剪影，都走 currentColor 跟着皮肤变色。
    const TAIL_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">'
        + '<path d="M8.7 22.3c-.4-5.6.1-9.7 1.5-12.6C12 6 16.8 5 19 7.8c2 2.5.7 6-2.4 6.4'
        + '-2 .2-3.5-1.2-3.3-2.8.1-1.3 1.3-2.1 2.4-1.7-.8-1.1-2.5-.8-3.4.7-1.1 1.9-1.5 5.7-1.2 12Z"/></svg>';
    // 身子是宽平顶、往外扩、再收成两只脚，中间一道窄缝。CSS 里用负 margin 把它顶到下巴底下，
    // 尾巴 / 头 / 身子叠起来要看着是一只猫，不是三个零件。
    const BODY_ICON = '<svg viewBox="0 0 26 20" aria-hidden="true" fill="currentColor">'
        + '<path d="M4.4 1h17.2c1.6 0 2.7 1.3 2.6 2.9-.3 4.6-1.5 10.4-3.2 13.6'
        + '-.8 1.5-2 2.4-3.3 2.4-1.5 0-2.6-1.2-2.6-2.8v-5c0-1.4-1-2.4-2.1-2.4s-2.1 1-2.1 2.4v5'
        + 'c0 1.6-1.1 2.8-2.6 2.8-1.3 0-2.5-.9-3.3-2.4C3.3 14.3 2.1 8.5 1.8 3.9 1.7 2.3 2.8 1 4.4 1Z"/></svg>';
    let entryBar = readFlag('fruit-heart-entry-bar', true);
    let entryBall = readFlag('fruit-heart-entry-ball', false);
    // 猫的大小。原来 32px 在手机上太容易误触（旁边就是酒馆自己的按钮），默认往上提一档。
    // 尺寸全走 --dock 这个倍数，点击区和图形一起放大，不是 transform 缩放 —— 那样点击区会和看到的对不上。
    const BALL_SIZES = [['s', '小', 1], ['m', '中', 1.25], ['l', '大', 1.55], ['xl', '特大', 1.9]];
    const ballSizeKey = 'fruit-heart-ball-size';
    let ballSize = hostWindow.localStorage.getItem(ballSizeKey) || 'm';
    if (!BALL_SIZES.some(item => item[0] === ballSize)) ballSize = 'm';
    function ballScale() { return (BALL_SIZES.find(item => item[0] === ballSize) || BALL_SIZES[1])[2]; }
    function applyBallSize() {
        if (!ballDock) return;
        ballDock[0].style.setProperty('--dock', String(ballScale()));
        const box = ballDock[0].getBoundingClientRect();     // 放大后可能顶出屏幕，重新夹一次
        placeBall(ballDock[0], box.left, box.top);
    }
    let jumpNav = readFlag('fruit-heart-jump-nav', true);
    const CATEGORY_PAGE_SIZE = 24;
    let searchTimer = null;
    let syncTimer = null;
    let renderedFingerprint = '';
    let fallbackButton = null;
    let ballDock = null;

    function h(value) {
        return String(value ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
    }
    function promptId(prompt) { return String(prompt?.id ?? ''); }
    function toast(type, message) {
        const api = hostWindow.toastr || window.toastr;
        if (api && typeof api[type] === 'function') api[type](message);
        else console[type === 'error' ? 'error' : 'log']('[果实之心]', message);
    }
    function loadedName() {
        try { return typeof getLoadedPresetName === 'function' ? getLoadedPresetName() : ''; } catch { return ''; }
    }
    // 不按预设名做白名单。这个脚本是用酒馆助手绑在预设上的，能跑起来就说明装它的那个预设
    // 正被载入 —— 再去匹配名字，只会在出新版本号时把自己锁死（写死 '果实V6.3' 那次，载入
    // V6.4 全线抛错，表现为「面板点了没反应」）。想把面板装到别的预设上的人，自己装就是了。
    // 真正要守的两件事仍在：这里挡住读不到预设名，updateBoth 里挡住写之前预设被换掉；
    // 没有果实之心控制配置的预设，会在 readConfig 那里得到一句明确的报错。
    function ensureTarget() {
        const name = loadedName();
        if (!name) throw new Error('读不到当前预设名，请重新载入预设后再打开面板');
        return name;
    }
    function activePreset() {
        if (typeof getPreset !== 'function') throw new Error('酒馆助手预设 API 不可用');
        ensureTarget();
        return getPreset('in_use');
    }
    async function updateBoth(updater) {
        if (typeof updatePresetWith !== 'function') throw new Error('酒馆助手写入 API 不可用');
        const name = ensureTarget();
        const updated = await updatePresetWith('in_use', async preset => {
            if (ensureTarget() !== name) throw new Error('预设已切换，请重新打开面板');
            const updated = await updater(preset);
            configPrompt(updated).enabled = false;
            return updated;
        }, { render: 'immediate' });
        await updatePresetWith(name, saved => ({ ...saved, prompts: updated.prompts, prompts_unused: updated.prompts_unused, settings: updated.settings, extensions: updated.extensions }), { render: 'none' });
    }
    async function guarded(task) {
        if (busy) return;
        busy = true;
        root.addClass('fh-busy');
        try { await task(); }
        catch (error) { console.error('[果实之心]', error); toast('error', error.message || '操作失败'); }
        finally { busy = false; root.removeClass('fh-busy'); }
    }

    function configPrompt(preset) {
        return (preset.prompts || []).find(prompt => promptId(prompt) === CONFIG_ID);
    }
    let configCache = { raw: '', value: null };
    function readConfig(preset = activePreset()) {
        const prompt = configPrompt(preset);
        if (prompt && prompt.content === configCache.raw && configCache.value) return configCache.value;
        if (!prompt) throw new Error('当前预设里没有果实之心控制配置，面板管不了它');
        const config = JSON.parse(prompt.content || '{}');
        if (config.version !== 4 || !config.tagStates || !config.initialTagStates || !config.initialStates || !config.lastAppliedStates || !config.controlGroups || !Array.isArray(config.categories)) throw new Error('果实之心控制配置版本不正确');
        configCache = { raw: prompt.content, value: config };
        return config;
    }
    function writeConfig(preset, config) {
        const prompt = configPrompt(preset);
        if (!prompt) throw new Error('没有找到果实之心控制配置');
        prompt.content = JSON.stringify(config);
        prompt.enabled = false;
    }
    function promptMap(preset = activePreset()) {
        return new Map((preset.prompts || []).map(prompt => [promptId(prompt), prompt]));
    }
    function activePrompts(preset = activePreset(), config = readConfig(preset)) {
        return (preset.prompts || []).filter(prompt => promptId(prompt) !== CONFIG_ID);
    }
    function modelTags(name) {
        return [...String(name || '').matchAll(/#\s*([^#]+?)(?=#|$)/g)]
            .map(match => match[1].trim().replace(/\s+/g, ' ').toUpperCase()).filter(Boolean);
    }
    function allModelTags(preset = activePreset()) {
        return [...new Set(activePrompts(preset).flatMap(prompt => modelTags(prompt.name)))].sort((a, b) => a.localeCompare(b));
    }
    function stripSource(name) { return String(name || '').replace(/\s*#\s*[^#]+?(?=#|$)/g, '').trimEnd(); }
    // 列表里只显示主名；互斥组与提示另用徽章展示，避免一行塞满竖线。
    // 她要求：极简 COT 后面用小字标一下什么时候开。只写她交代过的那条，
    // 别的选项我不替她编解释 —— 退回条目名里 ｜ 后面自带的提示。
    const COT_NOTES = { '极简': '大总结 / 其他任务不听话时开' };
    // 条目名里的 ｜ 提示大多是给她自己看的记账（单选/必开/别动位置），不往用户面前搬
    function hintText(name) {
        const plain = plainName(name);
        if (COT_NOTES[plain]) return COT_NOTES[plain];
        return nameParts(name).hints.filter(x => !/单选|多选|必开|别动位置|勿动/.test(x)).join(' · ');
    }
    function cotNote(preset, config) {
        const on = activePrompts(preset, config)
            .filter(prompt => exclusiveFamily(prompt, config) === 'COT' && prompt.enabled);
        return on.length === 1 ? hintText(on[0].name) : '';
    }
    function nameParts(name) {
        const plain = stripSource(name).replace(/\s*@[^\s@#]+/g, '').trim();
        const bits = plain.split('｜').map(part => part.trim()).filter(Boolean);
        const title = bits.shift() || plain;
        const group = bits.find(part => /(?:\d{1,2}|多)选1$/.test(part)) || '';
        const hints = bits.filter(part => part !== group);
        return { title, group, hints };
    }
    function displayName(name) { return nameParts(name).title; }
    const LEAD_EMOJI = /^(?:\p{Extended_Pictographic}\uFE0F?|📌)\s*/u;
    function plainName(name) { return displayName(name).replace(LEAD_EMOJI, ''); }
    // 横线约定（2026-09 定）：
    //   ━━ 名字 ━━ 和 ——名字—— 都是【大区】，会独立成一个分区
    //   --名字--（两个半角连字符）是【小区】，只是区内小标题，不分区
    const DIVIDER = /^\s*(?:━+|—{2,}|-{2,})\s*\S/;
    const BAR = /\s*(?:━+|—{2,}|-{2,})\s*/;
    const BIG_DIVIDER = /^\s*(?:━+|—{2,})\s*\S/;   // 大区：粗线或全角破折号
    const SMALL_DIVIDER = /^\s*-{2,}\s*\S/;          // 小区：半角连字符
    function isDivider(prompt) { return DIVIDER.test(String(prompt?.name || '')); }
    function dividerParts(name) {
        const body = String(name).replace(new RegExp('^' + BAR.source), '').replace(new RegExp(BAR.source + '$'), '');
        const cut = body.search(BAR);
        if (cut < 0) return { title: body.trim(), hint: '' };
        return { title: body.slice(0, cut).trim(), hint: body.slice(cut).replace(new RegExp('^' + BAR.source), '').trim() };
    }
    function groupLabel(group) { return String(group || ''); }
    function discoverGroups(preset, config) {
        const found = new Map();
        for (const prompt of activePrompts(preset, config)) {
            const group = exclusiveFamily(prompt, config);
            if (!group) continue;
            if (!found.has(group)) found.set(group, []);
            found.get(group).push(prompt);
        }
        const rank = name => { const index = GROUP_ORDER.indexOf(name); return index < 0 ? GROUP_ORDER.length : index; };
        return [...found.entries()].filter(([, items]) => items.length > 1)
            .sort((a, b) => rank(a[0]) - rank(b[0]) || a[0].localeCompare(b[0]));
    }
    // 型号写法归到同一模型组；保留条目原始标签和各自开关记忆。
    function modelGroup(tag) {
        const name = String(tag || '').trim().toUpperCase().replace(/[_-]+/g, ' ');
        if (/^GEMINI\b/.test(name)) {
            if (/FLASH|\d\s*F\b/.test(name)) return 'GEMINI FLASH';
            if (/PRO/.test(name)) return 'GEMINI PRO';
        }
        return name;
    }
    const MODELS = [
        { tag: 'GEMINI FLASH', label: 'Gemini Flash' },
        { tag: 'GEMINI PRO', label: 'Gemini Pro' },
        { tag: 'CLAUDE', label: 'Claude' },
        { tag: 'DS', label: 'DeepSeek' },
    ];
    function currentModel(config, models) {
        return models.find(item => item.tag === modelGroup(config.activeTag)) || null;
    }
    function modelChoices(preset = activePreset()) {
        const have = new Set(allModelTags(preset).map(modelGroup));
        const known = MODELS.filter(item => have.has(item.tag));
        const families = new Set([...have].filter(tag => tagVariant(tag)).map(tag => tagFamily(tag)));
        const extra = [...have].filter(tag => !MODELS.some(item => item.tag === tag) && !families.has(tag)).map(tag => ({ tag, label: tag }));
        return [...known, ...extra];
    }
    function tagFamily(tag) { return String(tag || '').split(' ')[0]; }
    function tagVariant(tag) { return String(tag || '').slice(tagFamily(tag).length).trim(); }
    function tagGroups(preset = activePreset()) {
        const groups = new Map();
        for (const tag of allModelTags(preset)) {
            const family = tagFamily(tag);
            if (!groups.has(family)) groups.set(family, []);
            groups.get(family).push(tag);
        }
        return groups;
    }
    function appliedTag(promptTags, selectedTag) {
        if (promptTags.includes(selectedTag)) return selectedTag;
        const grouped = promptTags.find(tag => modelGroup(tag) === modelGroup(selectedTag));
        if (grouped) return grouped;
        const family = tagFamily(selectedTag);
        return selectedTag !== family && promptTags.includes(family) ? family : '';
    }
    // ── 分区：直接读柏宝箱的分组数据，和酒馆里看到的是同一套 ──
    // 分区数据优先用柏宝箱那张表（她自己拖过的顺序在那儿）。
    // 但它不是必需品：表不在、或者一条都没归到区里（别人没装柏宝箱、或者预设是从零搭的），
    // 就按前台顺序的「━━ 区名 ━━」现算一份顶上，只在内存里用，一个字都不写回预设。
    const autoSections = new WeakMap();
    function derivedSections(preset) {
        let hit = autoSections.get(preset);
        if (hit) return hit;
        const groups = [];
        const map = {};
        let current = '';
        for (const prompt of activePrompts(preset)) {
            const name = String(prompt.name || '');
            if (BIG_DIVIDER.test(name) && !SECTION_END.test(name)) {
                current = 'fh-auto-' + groups.length;
                groups.push({ id: current, name: dividerParts(name).title || '新区', order: groups.length });
            }
            if (current) map[promptId(prompt)] = { groupId: current };
        }
        hit = { groups, map, derived: true };
        autoSections.set(preset, hit);
        return hit;
    }
    function sectionData(preset = activePreset()) {
        const box = preset?.extensions?.fruitHeartSections ?? preset?.extensions?.baibaiToolkit?.presetPromptGroups;
        const groups = Array.isArray(box?.groups) ? [...box.groups].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)) : [];
        const map = box?.prompts || {};
        if (groups.length && Object.keys(map).length) return { groups, map };
        return derivedSections(preset);
    }
    function sectionOf(prompt, data) { return data.map[promptId(prompt)]?.groupId || ''; }
    // 条目页里区的先后 —— 只是面板里的排列，预设里条目的实际顺序一个字都不动
    function orderedGroups(data, config) {
        const wanted = (config.sectionOrder || []).filter(id => data.groups.some(g => g.id === id));
        if (!wanted.length) return data.groups;
        const rank = new Map(wanted.map((id, index) => [id, index]));
        return [...data.groups].sort((a, b) => (rank.has(a.id) ? rank.get(a.id) : 900 + (a.order ?? 0)) - (rank.has(b.id) ? rank.get(b.id) : 900 + (b.order ?? 0)));
    }

    // ── 同步条目变化 ──
    // 你在酒馆里往某个区里塞了新条目、或者把条目拖到别的区去了，柏宝箱的分组表不会自己跟着动。
    // 这里按【前台顺序】重新推一遍：每条归到它上面最近的那条「━━ 区名 ━━」。
    const SECTION_END = /\bend\b/i;
    function syncLabel(name) { return DIVIDER.test(String(name)) ? dividerParts(String(name)).title : plainName(String(name)); }
    function sectionPlan(preset = activePreset()) {
        const box = preset?.extensions?.fruitHeartSections ?? preset?.extensions?.baibaiToolkit?.presetPromptGroups;
        const groups = Array.isArray(box?.groups) ? box.groups : [];
        const map = box?.prompts || {};
        const known = new Map(groups.map(group => [group.id, group]));
        const seen = [];
        const moves = [];
        const adds = [];
        const newHeads = [];
        let current = '';
        for (const prompt of activePrompts(preset)) {
            const id = promptId(prompt);
            if (id === CONFIG_ID) continue;
            const name = String(prompt.name || '');
            if (BIG_DIVIDER.test(name) && !SECTION_END.test(name)) {
                const owner = map[id]?.groupId;
                if (owner && known.has(owner)) current = owner;
                else { current = 'fruit-sync-' + seen.length + '-' + (dividerParts(name).title || '新区'); newHeads.push({ id: current, name: dividerParts(name).title || '新区' }); }
            }
            if (current && !seen.includes(current)) seen.push(current);
            const was = map[id]?.groupId || '';
            if (was === current) continue;
            (was && known.has(was) ? moves : adds).push({ id, name, from: was, to: current });
        }
        const label = new Map([...groups.map(g => [g.id, g.name]), ...newHeads.map(x => [x.id, x.name])]);
        return { box, groups, map, known, seen, moves, adds, newHeads, nameOf: id => label.get(id) || '（无区）', total: moves.length + adds.length + newHeads.length };
    }
    function applySectionPlan(preset) {
        // 面板分区独立保存；柏宝箱有自己的内存缓存，不能直接争写它的分区表。
        const source = preset.extensions?.fruitHeartSections ?? preset.extensions?.baibaiToolkit?.presetPromptGroups;
        if (!source) throw new Error('这份预设没有分区数据');
        preset.extensions.fruitHeartSections = structuredClone(source);
        const plan = sectionPlan(preset);
        plan.box.groups = plan.groups;
        plan.box.prompts = plan.map;
        for (const head of plan.newHeads) plan.groups.push({ id: head.id, name: head.name, order: 0, collapsed: true, enabled: true });
        for (const move of [...plan.moves, ...plan.adds]) plan.map[move.id] = { ...(plan.map[move.id] || {}), groupId: move.to };
        // 区的先后也跟着前台顺序走 —— 整区挪过位置的话，条目页里也应该跟着挪
        const rank = new Map(plan.seen.map((id, index) => [id, index]));
        plan.groups.sort((a, b) => (rank.has(a.id) ? rank.get(a.id) : 900 + (a.order ?? 0)) - (rank.has(b.id) ? rank.get(b.id) : 900 + (b.order ?? 0)));
        plan.groups.forEach((group, index) => { group.order = index; });
        return plan;
    }

    // ── 总闸按【正文特征】定位，不按条目名 —— 名字会被改，正文里的宏不会 ──
    function findByContent(preset, test) {
        return (preset.prompts || []).find(p => promptId(p) !== CONFIG_ID && test(p.content || '')) || null;
    }
    function initPrompt(preset = activePreset()) {
        return findByContent(preset, c => /\{\{trim\}\}/.test(c) && (c.match(/\{\{setvar::/g) || []).length > 30);
    }
    function nsfwMaster(preset = activePreset()) {
        const init = initPrompt(preset);
        return (preset.prompts || []).find(p => p !== init && /\{\{setglobalvar::NSFW::/.test(p.content || '')) || null;
    }
    function theatreMaster(preset = activePreset()) {
        const init = initPrompt(preset);
        return (preset.prompts || []).find(p => p !== init && promptId(p) !== CONFIG_ID && /\{\{setvar::snow::/.test(p.content || '')) || null;
    }
    // 小剧场素材＝剧场区里除主剧场以外的那些（她用 💡 开头标记）
    function theatreItems(preset, config) {
        const data = sectionData(preset);
        const section = sectionIdOf(sectionData(preset), SECTION_KEYS.theatre);
        const inSection = activePrompts(preset, config).filter(p => sectionOf(p, data) === section && !isDivider(p));
        const marked = inSection.filter(p => /^💡/.test(p.name));
        return marked.length ? marked : inSection.filter(p => exclusiveFamily(p, config) !== '主剧场' && !/^(?:📌|👨)/.test(p.name));
    }
    // 随机小剧场：每回合从全部 💡 里抽 1-2 个开着，其余关掉。
    // 抽的时机挂在酒馆的 GENERATION_AFTER_COMMANDS 上 —— 这个事件酒馆是 await 的，
    // 而且在组装提示词之前，所以抽的结果当回合就生效，不会慢一拍。
    // 结果照常写回预设（和你手点勾选走同一条路），所以面板上一眼能看到本回合抽中了谁。
    function bodyLength(content) {
        return String(content || '').replace(/\{\{\/\/[\s\S]*?\}\}/g, '').replace(/<\/?[^>\n]{1,40}>/g, '').replace(/\s+/g, '').length;
    }
    function pickSome(list, count) {
        const pool = [...list];
        const out = [];
        while (out.length < count && pool.length) out.push(...pool.splice(Math.floor(Math.random() * pool.length), 1));
        return out;
    }
    async function rollTheatre() {
        const preset = activePreset();
        const config = readConfig(preset);
        const want = Number(config.theatreRandom) || 0;
        if (!want) return;
        const master = theatreMaster(preset);
        if (master && !master.enabled) return;   // 总开关关着，抽了也不出现，别白写一次预设
        // 空壳条目（比如「💡 自定义剧场」，里面只有一行「小剧场主题：」）抽中了等于白抽，剔掉
        const pool = theatreItems(preset, config).filter(prompt => bodyLength(prompt.content) >= 20);
        if (pool.length < 2) return;
        const pick = new Set(pickSome(pool.map(promptId), Math.min(want, pool.length)));
        await updateBoth(target => {
            const cfg = readConfig(target);
            captureManualChanges(target, cfg);
            for (const prompt of theatreItems(target, cfg)) prompt.enabled = pick.has(promptId(prompt));
            rememberAppliedStates(target, cfg);
            writeConfig(target, cfg);
            return target;
        });
    }
    function isOn(prompt) { return Boolean(prompt && prompt.enabled); }

    // 正文字数条目按【正文里的字数写法】定位，不按条目名 —— 条目名会被改，正文格式不会。
    const WORD_RANGE = /(?:需求字数|需)\s*(\d+)\s*[-–—~～至到]+\s*(\d+)\s*字/;
    function wordCountPrompt(preset = activePreset(), config = readConfig(preset)) {
        const hits = activePrompts(preset, config).filter(item => WORD_RANGE.test(item.content || ''));
        return hits.find(item => item.enabled) || hits[0] || null;
    }
    function coreWarning(prompt) {
        const name = prompt?.name || '';
        return PLACEHOLDER_IDS.has(promptId(prompt)) || /📌|必开|别动|不要开|别开|勿开/i.test(name);
    }
    // groupForName 要跑一串正则。一次首页渲染会问到一千多次（三个下拉 + 剧场 + 非正文混排），
    // 手机上光这一项就两百多毫秒。按条目名缓存，名字没变就不重算。
    const familyCache = new Map();
    function exclusiveFamily(prompt, config) {
        const name = String(prompt.name || '');
        let hit = familyCache.get(name);
        if (hit === undefined) {
            hit = groupForName(name) || '';
            if (familyCache.size > 600) familyCache.clear();
            familyCache.set(name, hit);
        }
        return hit || config.controlGroups[promptId(prompt)] || '';
    }
    function combinationLabel(preset, config) {
        if (allModelTags(preset).includes(config.activeTag)) return config.activeTag;
        return activePrompts(preset).every(prompt => Boolean(prompt.enabled) === Boolean(config.initialStates[promptId(prompt)])) ? '初始组合' : '自定义组合';
    }
    function detectModelText() {
        try {
            const settings = SillyTavern.getContext().chatCompletionSettings || {};
            const source = String(settings.chat_completion_source || '').toLowerCase();
            const keys = {
                openai: 'openai_model', claude: 'claude_model', google: 'google_model', makersuite: 'google_model',
                vertexai: 'vertexai_model', openrouter: 'openrouter_model', custom: 'custom_model', deepseek: 'deepseek_model',
                minimax: 'minimax_model', electronhub: 'electronhub_model', nanogpt: 'nanogpt_model', xai: 'xai_model',
            };
            return String(settings[keys[source]] || source || '');
        } catch {}
        const source = String(jq('#chat_completion_source', doc).val() || '').toLowerCase();
        const selectors = { openai: '#model_openai_select', claude: '#model_claude_select', google: '#model_google_select', makersuite: '#model_google_select', openrouter: '#model_openrouter_select', custom: '#custom_model' };
        return String(jq(selectors[source] || '', doc).val() || source || '');
    }
    const modelLinkKey = 'fruit-heart-model-link';
    let modelLinkEnabled = readFlag(modelLinkKey, true);
    let modelLinkSignature = '';
    let pendingModelSignature = '';
    let pendingModelSince = 0;
    let modelLinkDestroyed = false;

    function linkedModelTag(model, preset) {
        const name = String(model).toUpperCase();
        const tags = allModelTags(preset);
        if (/DEEPSEEK|(?:^|\/)DS[-_]/.test(name)) return tags.includes('DS') ? 'DS' : '';
        if (/CLAUDE/.test(name)) return tags.includes('CLAUDE') ? 'CLAUDE' : '';
        if (!/GEMINI/.test(name)) return '';
        const group = modelGroup(name.slice(name.indexOf('GEMINI')));
        if (['GEMINI FLASH', 'GEMINI PRO'].includes(group) && tags.some(tag => modelGroup(tag) === group)) return group;
        return tags.includes('GEMINI') ? 'GEMINI' : '';
    }

    async function syncConnectedModel() {
        if (modelLinkDestroyed || !modelLinkEnabled || busy) return;
        const name = loadedName();
        const model = detectModelText();
        if (!name || !model) return;
        const signature = JSON.stringify([name, model]);
        if (signature === modelLinkSignature) return;
        if (signature !== pendingModelSignature) {
            pendingModelSignature = signature;
            pendingModelSince = Date.now();
            return;
        }
        // 自定义模型输入和连接方案切换可能连发事件，等实际设置稳定后再切一次。
        if (Date.now() - pendingModelSince < 500) return;
        try {
            const preset = activePreset();
            if (!configPrompt(preset)) { modelLinkSignature = signature; return; }
            const tag = linkedModelTag(model, preset);
            if (!tag || modelGroup(readConfig(preset).activeTag) === tag) { modelLinkSignature = signature; return; }
            modelLinkSignature = signature;
            await guarded(async () => {
                if (modelLinkDestroyed || !modelLinkEnabled || loadedName() !== name || detectModelText() !== model) return;
                await applyTag(tag);
                if (root.hasClass('open')) render(currentView);
            });
        } catch (error) {
            modelLinkSignature = signature;
            console.warn('[果实之心] 模型联动未执行', error);
        }
    }


    function captureTagState(preset, config, tag) {
        if (!tag) return;
        for (const prompt of activePrompts(preset)) {
            const stateTag = appliedTag(modelTags(prompt.name), tag);
            if (stateTag) {
                config.tagStates[stateTag] ||= {};
                config.tagStates[stateTag][promptId(prompt)] = Boolean(prompt.enabled);
            }
        }
    }
    function captureManualChanges(preset, config) {
        for (const prompt of activePrompts(preset)) {
            const id = promptId(prompt), enabled = Boolean(prompt.enabled), tags = modelTags(prompt.name);
            for (const tag of tags) {
                config.tagStates[tag] ||= {};
                if (!(id in config.tagStates[tag])) config.tagStates[tag][id] = enabled;
            }
            if (config.lastAppliedStates[id] === enabled) continue;
            const selected = appliedTag(tags, config.activeTag);
            for (const tag of selected ? [selected] : tags) config.tagStates[tag][id] = enabled;
        }
    }
    function rememberAppliedStates(preset, config) {
        config.lastAppliedStates = Object.fromEntries(activePrompts(preset, config).map(prompt => [promptId(prompt), Boolean(prompt.enabled)]));
    }
    // 尾部按模型强制：标签对得上的开，对不上的关。
    // 不按条目名认，按条目自己带的 # 标签认 —— 名字会被改，标签不会。
    function applyTails(preset, config, tag) {
        const data = sectionData(preset);
        const tail = sectionIdOf(data, SECTION_KEYS.tail);
        if (!tail) return;
        for (const prompt of activePrompts(preset, config)) {
            if (sectionOf(prompt, data) !== tail || isDivider(prompt)) continue;
            const tags = modelTags(prompt.name);
            if (!tags.length) continue;      // 不带模型标签的尾条目不归模型管
            prompt.enabled = Boolean(appliedTag(tags, tag));
        }
    }
    async function applyTag(tag) {
        await updateBoth(preset => {
            const config = readConfig(preset);
            captureManualChanges(preset, config);
            captureTagState(preset, config, config.activeTag);
            config.tagStates[tag] ||= {};
            for (const prompt of activePrompts(preset, config).filter(prompt => appliedTag(modelTags(prompt.name), tag))) {
                const id = promptId(prompt);
                const stateTag = appliedTag(modelTags(prompt.name), tag);
                config.tagStates[stateTag] ||= {};
                if (!(id in config.tagStates[stateTag])) config.tagStates[stateTag][id] = Boolean(prompt.enabled);
            }
            for (const prompt of activePrompts(preset, config)) {
                const promptTags = modelTags(prompt.name);
                if (!promptTags.length) continue;
                const stateTag = appliedTag(promptTags, tag);
                prompt.enabled = stateTag ? Boolean(config.tagStates[stateTag]?.[promptId(prompt)]) : false;
            }
            applyTails(preset, config, tag);
            config.activeTag = tag;
            selectedTagFamily = tagFamily(tag);
            captureTagState(preset, config, tag);   // 把强制过的尾部状态记回去，下次选同一个还是这样
            rememberAppliedStates(preset, config);
            writeConfig(preset, config);
            return preset;
        });
        toast('success', `已切换模型标签：# ${tag}`);
    }
    async function resetPromptStates() {
        await updateBoth(preset => {
            const config = readConfig(preset);
            for (const prompt of activePrompts(preset, config)) prompt.enabled = Boolean(config.initialStates[promptId(prompt)]);
            config.activeTag = '';
            config.tagStates = structuredClone(config.initialTagStates);
            rememberAppliedStates(preset, config);
            writeConfig(preset, config);
            return preset;
        });
        toast('success', '已恢复初始开关状态');
    }

    function titleBlock(title, note = '') {
        return `<div class="fh-page-head"><div><h2>${h(title)}</h2>${note ? `<p>${h(note)}</p>` : ''}</div></div>`;
    }
    function sourceBadge(prompt) {
        return modelTags(prompt.name).map(tag => `<span class="fh-source"># ${h(tag)}</span>`).join('');
    }
    function navHtml() {
        return NAV_ITEMS.map(([id, icon, label]) => `<button class="fh-nav-item ${currentView === id ? 'on' : ''}" data-nav="${id}" title="${h(label)}"><b>${icon}</b><span>${h(label)}</span></button>`).join('');
    }
    function syncNav() {
        root.find('.fh-bottom-nav')[0].innerHTML = navHtml();
    }
    const style = jq('<style>', { id: `${APP_ID}-style`, text: "/* ═════════ 果实之心 · 暖纸 ═════════\n   日间＝纸，夜间＝墨：同一张纸在灯下和在夜里，不是「浅色再配一套深色」。\n   结构纪律：分隔线内缩、三级灰、一个强调色、控件各司其职。\n   质感：暖投影、一层纸纹、14px 圆角、砖红。 */\n#fruit-heart-v6 {\n  --paper:#f3efe6; --card:#fffdf8; --card2:#faf6ec; --fill:#2428220a; --fill2:#24282214;\n  --ink:#242822; --ink2:#6f7268; --ink3:#a39d8f; --line:#e3ddce;\n  --acc:#9c5346; --acc-soft:#9c534617; --acc-line:#9c534640;\n  --knob:#fffdf8; --track:#cfc8b6;\n  --shadow:0 1px 2px #4a3e2a12,0 7px 18px #4a3e2a0d;\n  --grain:repeating-linear-gradient(0deg,#24282209 0 1px,transparent 1px 3px);\n  --r:14px; --r2:10px; color-scheme:light;\n  display:none; position:fixed; inset:0; z-index:10020; padding:18px;\n  background:#1a1613cc; align-items:center; justify-content:center; color:var(--ink);\n  font:13.5px/1.6 -apple-system,\"PingFang SC\",\"Microsoft YaHei UI\",\"Segoe UI\",sans-serif; -webkit-font-smoothing:antialiased;\n}\n#fruit-heart-v6[data-theme=night] {\n  --paper:#171512; --card:#211e1a; --card2:#2a2622; --fill:#fbf7ee0d; --fill2:#fbf7ee17;\n  --ink:#f1ece1; --ink2:#a9a293; --ink3:#77705f; --line:#39342c;\n  --acc:#e2917f; --acc-soft:#e2917f1f; --acc-line:#e2917f4d;\n  --knob:#fbf7ee; --track:#4a443a;\n  --shadow:0 2px 4px #00000038,0 10px 26px #00000042;\n  --grain:repeating-linear-gradient(0deg,#fbf7ee06 0 1px,transparent 1px 3px); color-scheme:dark;\n}\n#fruit-heart-v6.open { display:flex }\n/* hidden 属性要真的藏住 —— 表单里的 input 有自己的 display，光靠浏览器默认样式压不住 */\n#fruit-heart-v6 [hidden] { display:none!important }\n#fruit-heart-v6 * { box-sizing:border-box }\n/* 作用域重置：酒馆自己给 h2/h3/small/b/code 这些标签定了颜色和字体，\n   我们只写 #fruit-heart-v6 h3{font-size} 是拦不住的 —— 元素上有酒馆的 color 声明时，\n   继承根本轮不上，标题就变成主题色（她那边是一片橙）。这里把它们统统夺回来。\n   放在最前面，后面各自的 color 还能照常覆盖。 */\n/* 字体走变量：皮肤给默认值，用户在设置里选的会以内联 --font 覆盖掉（内联永远赢）。\n   还留 !important 是因为酒馆主题会直接给 h3/p/small 指定字体。 */\n#fruit-heart-v6 { --on-acc:var(--card); --font-sans:-apple-system,\"PingFang SC\",\"Microsoft YaHei UI\",\"Segoe UI\",sans-serif; --font:var(--font-sans) }\n#fruit-heart-v6,#fruit-heart-v6 * { font-family:var(--font)!important }\n/* 只夺回酒馆真会去上色的那些标签，别拿 * 全量刷 —— 全量刷每次重算样式都要多跑一遍。 */\n#fruit-heart-v6 :is(h1,h2,h3,h4,h5,h6,p,a,b,strong,em,i,small,code,pre,label,li,option,summary) {\n  color:inherit; text-shadow:none; text-transform:none; letter-spacing:normal; font-style:normal; text-decoration:none }\n#fruit-heart-v6 :is(ul,ol) { list-style:none; margin:0; padding:0 }\n#fruit-heart-v6 :is(h1,h2,h3,h4,h5,h6) { font-weight:650 }\n#fruit-heart-v6 :is(button,input,select,textarea) { font:inherit; color:inherit }\n#fruit-heart-v6 button { cursor:pointer; border:0; background:none; padding:0 }\n#fruit-heart-v6 :is(button,input,select,textarea):focus-visible { outline:2px solid var(--acc); outline-offset:2px }\n#fruit-heart-v6 .fh-shell { width:min(430px,100%); height:min(880px,80dvh); display:grid; grid-template-rows:auto minmax(0,1fr) auto;\n  background:var(--paper); background-image:var(--grain); border-radius:16px; overflow:hidden; box-shadow:0 22px 66px #00000073 }\n\n/* 头 */\n#fruit-heart-v6 .fh-header { display:flex; align-items:flex-start; gap:11px; padding:16px 18px 11px }\n#fruit-heart-v6 .fh-brand-mark { width:27px; height:27px; margin-top:2px; flex:none; color:var(--acc) }\n#fruit-heart-v6 .fh-brand-mark svg { width:100%; height:100%; display:block; fill:currentColor; stroke:none }\n#fruit-heart-v6 .fh-brand { min-width:0 }\n#fruit-heart-v6 .fh-brand>div { display:flex; flex-wrap:wrap; align-items:baseline; gap:6px }\n#fruit-heart-v6 .fh-brand strong { font-size:21px; font-weight:680; letter-spacing:.02em; line-height:1.2 }\n#fruit-heart-v6 .fh-brand em { font-style:normal; font-size:11px; color:var(--ink3) }\n#fruit-heart-v6 .fh-brand small { display:block; font-size:11px; color:var(--ink3); margin-top:2px; letter-spacing:.02em }\n#fruit-heart-v6 .fh-header-meta { margin-left:auto; display:flex; align-items:center; flex:none; gap:7px }\n#fruit-heart-v6 .fh-update-badge { position:relative; width:25px; height:25px; padding:0; border:1px solid var(--acc-line); border-radius:50%; background:var(--acc-soft); color:var(--acc); font-size:13px; line-height:1; cursor:pointer; transition:transform .18s, background .18s, color .18s; flex:none }\n#fruit-heart-v6 .fh-update-badge:hover { transform:translateY(-1px) scale(1.05); background:var(--acc); color:var(--on-acc) }\n#fruit-heart-v6 .fh-update-badge::after { content:''; position:absolute; top:1px; right:1px; width:5px; height:5px; border-radius:50%; background:var(--acc); box-shadow:0 0 0 2px var(--card) }\n#fruit-heart-v6 .fh-update-badge[hidden] { display:none!important }\n#fruit-heart-v6 :is(.fh-close,.fh-theme) { width:29px; height:29px; border-radius:50%; background:var(--fill); color:var(--ink2); font-size:13px; flex:none }\n#fruit-heart-v6 .fh-close { width:44px; height:44px; font-size:22px; color:var(--ink) }\n#fruit-heart-v6 :is(.fh-close,.fh-theme):hover { color:var(--acc) }\n#fruit-heart-v6 .fh-main { overflow:auto; padding:2px 15px 26px; scrollbar-color:var(--line) transparent; scrollbar-width:thin; scrollbar-gutter:stable }\n#fruit-heart-v6 .fh-main::-webkit-scrollbar { width:10px; height:10px }\n#fruit-heart-v6 .fh-main::-webkit-scrollbar-thumb { background:var(--line); border-radius:8px; border:3px solid transparent; background-clip:content-box }\n\n/* 页头 / 小节标题 */\n#fruit-heart-v6 .fh-page-head { margin:0 0 10px }\n#fruit-heart-v6 h2 { font:680 21px/1.25 inherit; letter-spacing:.02em; margin:0 0 3px }\n#fruit-heart-v6 h3 { font-size:13.5px; font-weight:650; margin:0 }\n#fruit-heart-v6 p { margin:0; font-size:11px; color:var(--ink3); line-height:1.7 }\n#fruit-heart-v6 .fh-dim { font-size:11px; color:var(--ink3) }\n#fruit-heart-v6 .fh-lab { margin:20px 0 7px 13px; font-size:10.5px; font-weight:600; letter-spacing:.16em; color:var(--ink3) }\n#fruit-heart-v6 .fh-mt { margin-top:10px }\n\n/* 分组卡 */\n/* content-visibility：屏幕外的卡片不参与布局。首页现在有八张卡四十多个胶囊，\n   不这么做的话每次切回首页都要给全部内容算一遍版，手机上就是三百多毫秒。 */\n#fruit-heart-v6 :is(.fh-grp,.fh-card,.fh-qr-card,.fh-sec) { background:var(--card); border-radius:var(--r); box-shadow:var(--shadow);\n  overflow:hidden; margin-bottom:8px; break-inside:avoid; border:0;\n}\n#fruit-heart-v6 .fh-card.danger { box-shadow:var(--shadow),inset 0 0 0 1px var(--acc-line) }\n#fruit-heart-v6 .fh-card-head { padding:12px 14px 2px }\n#fruit-heart-v6 .fh-card-head p { margin-top:3px }\n#fruit-heart-v6 .fh-card-actions,#fruit-heart-v6 .fh-pad { padding:11px 14px 13px; position:relative;\n  display:flex; flex-wrap:wrap; gap:6px; align-items:center }\n#fruit-heart-v6 .fh-card>.fh-v,#fruit-heart-v6 .fh-card>textarea { margin:0 14px 11px; width:calc(100% - 28px) }\n\n/* 行：左名右值，分隔线从内容起点开始 */\n#fruit-heart-v6 .fh-row { display:flex; align-items:center; gap:10px; min-height:44px; padding:8px 14px; position:relative }\n#fruit-heart-v6 :is(.fh-row,.fh-pad,.fh-ch)+:is(.fh-row,.fh-pad):before {\n  content:\"\"; position:absolute; left:14px; right:0; top:0; height:1px; background:var(--line) }\n#fruit-heart-v6 .fh-k { flex:none; font-size:13.5px; color:var(--ink) }\n#fruit-heart-v6 .fh-v { margin-left:auto; display:flex; flex-wrap:wrap; align-items:center; gap:6px; justify-content:flex-end; min-width:0 }\n#fruit-heart-v6 .fh-row.act .fh-k { color:var(--acc); font-weight:500 }\n#fruit-heart-v6 .fh-chev { color:var(--ink3); font-size:15px }\n\n/* 两栏格：标签在上、控件在下。横着摆一行只能塞一个「字数」那么宽的东西，\n   竖着摆之后半格也有 180px，一屏能多看四行。缝隙就是分隔线，不额外画。 */\n#fruit-heart-v6 .fh-grid { display:grid; grid-template-columns:1fr 1fr }\n/* 分隔线用边框画，不用 1px 缝 —— 玻璃皮肤的卡片是半透的，缝里的底色会透上来染整格 */\n#fruit-heart-v6 .fh-cell { padding:9px 13px 11px; display:flex; flex-direction:column;\n  gap:6px; min-height:63px; justify-content:flex-start; min-width:0; border-top:1px solid var(--line) }\n#fruit-heart-v6 .fh-cell:nth-child(-n+2) { border-top:0 }\n#fruit-heart-v6 .fh-cell:nth-child(odd):not(.wide) { border-right:1px solid var(--line) }\n#fruit-heart-v6 .fh-cell.wide { grid-column:1/-1 }\n#fruit-heart-v6 .fh-ck { font-size:11px; color:var(--ink2); letter-spacing:.02em; display:flex; align-items:baseline; gap:6px }\n#fruit-heart-v6 .fh-ck em { font-style:normal; font-size:10.5px; color:var(--ink3) }\n#fruit-heart-v6 .fh-cv { display:flex; align-items:center; gap:7px; flex-wrap:wrap; min-width:0 }\n#fruit-heart-v6 .fh-cv .fh-sw { margin-left:0 }\n#fruit-heart-v6 .fh-cv .fh-seg button { padding:4px 10px }\n#fruit-heart-v6 .fh-hint { font-size:10.5px; color:var(--ink3); line-height:1.5 }\n#fruit-heart-v6 .fh-ch { display:flex; align-items:center; gap:9px; min-height:46px; padding:9px 14px; position:relative }\n#fruit-heart-v6 .fh-ch b { font-size:13.5px; font-weight:650; letter-spacing:.02em }\n#fruit-heart-v6 .fh-dot { display:none; width:7px; height:7px; border-radius:50%; background:var(--dot,var(--acc)); flex:none }\n#fruit-heart-v6 .fh-ch .fh-n { margin-left:auto; color:var(--ink3); font-size:12px }\n#fruit-heart-v6 .fh-more.fh-n { padding:2px 0 2px 6px }\n#fruit-heart-v6 .fh-more.fh-n:hover { color:var(--acc) }\n#fruit-heart-v6 .fh-ch .fh-n+.fh-dim { margin-left:0 }\n#fruit-heart-v6 .fh-tile { width:29px; height:29px; border-radius:8px; background:var(--acc); color:var(--on-acc);\n  display:grid; place-items:center; font-size:14px; flex:none }\n\n/* 开关 */\n#fruit-heart-v6 .fh-sw { width:43px; height:25px; border-radius:25px; background:var(--track); position:relative; flex:none;\n  margin-left:auto; transition:background .2s }\n#fruit-heart-v6 .fh-sw:after { content:\"\"; position:absolute; top:2px; left:2px; width:21px; height:21px; border-radius:50%;\n  background:var(--knob); box-shadow:0 1px 3px #00000033; transition:left .2s }\n#fruit-heart-v6 .fh-sw.on { background:var(--acc) }\n#fruit-heart-v6 .fh-sw.on:after { left:20px }\n\n/* 分段控件 */\n#fruit-heart-v6 .fh-seg { display:inline-flex; background:var(--fill2); border-radius:9px; padding:2px; gap:2px }\n#fruit-heart-v6 .fh-seg button { padding:4px 12px; border-radius:7px; font-size:12.5px; white-space:nowrap; color:var(--ink) }\n#fruit-heart-v6 .fh-seg button.on { background:var(--card); box-shadow:0 1px 3px #4a3e2a29; font-weight:650; color:var(--acc) }\n#fruit-heart-v6[data-theme=night] .fh-seg button.on { background:var(--card2); box-shadow:0 1px 3px #0000005c }\n\n/* 下拉：一颗按钮 + 自家的选择面板。\n   要一眼看出「这是能点开的」—— 所以给描边和一个实心 ▾，别做成纯文字。 */\n#fruit-heart-v6 .fh-sel { display:inline-flex; align-items:center; gap:5px; background:var(--card2);\n  border:1px solid var(--line); border-radius:7px; padding:4.5px 8px 4.5px 10px; font-size:12.5px; color:var(--ink);\n  max-width:12em; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; line-height:1.35 }\n#fruit-heart-v6 .fh-sel i { font-style:normal; font-size:8px; color:var(--ink3); flex:none; transform:translateY(1px) }\n#fruit-heart-v6 .fh-sel.on { color:var(--acc); border-color:var(--acc-line); background:var(--acc-soft); font-weight:600 }\n#fruit-heart-v6 .fh-sel.on i { color:var(--acc) }\n#fruit-heart-v6 .fh-sel:hover { border-color:var(--ink3) }\n#fruit-heart-v6 .fh-sel.wide { max-width:15em }\n/* 选择面板：一小块，不是占半屏的大抽屉 */\n#fruit-heart-v6 .fh-sheet { position:absolute; inset:0; z-index:20; display:flex; align-items:center; justify-content:center; padding:16px }\n#fruit-heart-v6 .fh-sheet-bg { position:absolute; inset:0; background:#1a161366 }\n#fruit-heart-v6 .fh-sheet-box { position:relative; display:flex; flex-direction:column; width:min(268px,88%);\n  max-height:min(62%,420px); background:var(--card); border-radius:12px; box-shadow:0 12px 40px #00000059; overflow:hidden }\n#fruit-heart-v6 .fh-sheet-head { padding:9px 13px 8px; font-size:10.5px; font-weight:650; color:var(--ink3);\n  letter-spacing:.14em; border-bottom:1px solid var(--line); flex:none }\n#fruit-heart-v6 .fh-sheet-list { overflow:auto; -webkit-overflow-scrolling:touch }\n#fruit-heart-v6 .fh-sheet-item { display:grid; grid-template-columns:1fr auto; align-items:center; column-gap:8px;\n  width:100%; min-height:38px; padding:8px 13px; text-align:left; position:relative; font-size:12.5px }\n#fruit-heart-v6 .fh-sheet-item+.fh-sheet-item:before { content:\"\"; position:absolute; left:13px; right:0; top:0; height:1px; background:var(--line) }\n#fruit-heart-v6 .fh-sheet-item span { min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap }\n/* 备注单独占第二行，整行给它 —— 之前挤在名字右边，九个字就开始吃省略号 */\n#fruit-heart-v6 .fh-sheet-item em { grid-column:1/-1; font-style:normal; font-size:10.5px; color:var(--ink3);\n  line-height:1.5; margin-top:2px; font-weight:400 }\n#fruit-heart-v6 .fh-sheet-item i { font-style:normal; color:transparent; font-size:12px; font-weight:800;\n  grid-column:2; grid-row:1 }\n#fruit-heart-v6 .fh-sheet-item.on { color:var(--acc); font-weight:600; background:var(--acc-soft) }\n#fruit-heart-v6 .fh-sheet-item.on i { color:var(--acc) }\n#fruit-heart-v6 .fh-sheet-item:hover { background:var(--fill) }\n#fruit-heart-v6 .fh-sheet-cancel { flex:none; padding:9px; font-size:12.5px; color:var(--ink2);\n  border-top:1px solid var(--line); background:var(--card2) }\n#fruit-heart-v6 .fh-sheet-cancel:hover { color:var(--acc) }\n/* 多选：无边框填充胶囊 + 勾 */\n#fruit-heart-v6 .fh-chips { display:flex; flex-wrap:wrap; gap:6px; width:100% }\n#fruit-heart-v6 .fh-chip { font-size:12.5px; border-radius:20px; padding:5.5px 12px; background:var(--fill); color:var(--ink2);\n  display:inline-flex; align-items:center; gap:5px; white-space:nowrap }\n#fruit-heart-v6 .fh-chip.on { background:var(--acc-soft); color:var(--acc); font-weight:600 }\n#fruit-heart-v6 .fh-chip.on:before { content:\"✓\"; font-size:10.5px; font-weight:700 }\n#fruit-heart-v6 .fh-more { color:var(--ink2); font-size:12px; padding:5.5px 4px }\n#fruit-heart-v6 .fh-more:hover { color:var(--acc) }\n\n/* 按钮：动作用，描边 */\n#fruit-heart-v6 .fh-btn { border:1px solid var(--line); background:var(--card2); border-radius:9px; padding:6px 13px;\n  font-size:12.5px; white-space:nowrap; transition:.13s }\n#fruit-heart-v6 .fh-btn:hover { border-color:var(--ink3) }\n#fruit-heart-v6 .fh-btn.on { border-color:var(--acc); color:var(--acc); background:var(--acc-soft); font-weight:600 }\n#fruit-heart-v6 .fh-btn.primary,#fruit-heart-v6 .fh-btn.solid { border-color:var(--acc); background:var(--acc); color:var(--on-acc); font-weight:600 }\n#fruit-heart-v6 .fh-btn.primary:hover,#fruit-heart-v6 .fh-btn.solid:hover { filter:brightness(1.08) }\n#fruit-heart-v6 .fh-btn.solid { padding:8px 15px; font-size:13px; border-radius:10px }\n#fruit-heart-v6 .fh-btn.danger { color:var(--acc); border-color:var(--acc-line) }\n#fruit-heart-v6 .fh-btn.add,#fruit-heart-v6 .fh-btn.mine { border-style:dashed }\n#fruit-heart-v6 .fh-btn.add { color:var(--acc); border-color:var(--acc-line) }\n#fruit-heart-v6 .fh-btn[disabled] { opacity:.42; cursor:default }\n#fruit-heart-v6 .fh-x { color:var(--ink3); font-size:13px; padding:0 3px; line-height:1 }\n#fruit-heart-v6 .fh-x:hover { color:var(--acc) }\n#fruit-heart-v6 .fh-tag,#fruit-heart-v6 .fh-g { font-size:10px; font-style:normal; color:var(--ink3);\n  border:1px solid var(--line); border-radius:5px; padding:1px 6px; white-space:nowrap }\n#fruit-heart-v6 .fh-tag.quiet { color:var(--ink3) }\n#fruit-heart-v6 .fh-tag:not(.quiet) { color:var(--acc); border-color:var(--acc-line) }\n\n/* 输入 */\n#fruit-heart-v6 :is(input[type=text],textarea) { width:100%; border:1px solid var(--line); background:var(--card2);\n  border-radius:9px; padding:8px 11px; font-size:12.5px }\n#fruit-heart-v6 textarea { min-height:74px; resize:vertical; line-height:1.6; font-family:ui-monospace,Consolas,monospace }\n#fruit-heart-v6 .fh-toolbar { display:flex; align-items:center; gap:8px; margin-bottom:10px }\n#fruit-heart-v6 .fh-search { flex:1; min-width:0 }\n#fruit-heart-v6 .fh-check { display:inline-flex; align-items:center; gap:5px; font-size:11.5px; color:var(--ink2); white-space:nowrap }\n#fruit-heart-v6 .fh-foot { font-size:10.5px; color:var(--ink3); margin:16px 0 0 13px }\n#fruit-heart-v6 .fh-empty { padding:26px 0; text-align:center; font-size:12px; color:var(--ink3) }\n#fruit-heart-v6 code { font-family:ui-monospace,Consolas,monospace!important; font-size:11px; background:var(--fill);\n  border-radius:4px; padding:0 4px }\n\n/* QR 入口 */\n#fruit-heart-v6 .fh-qr-entry { display:flex; align-items:center; gap:11px; width:100%; padding:11px 14px; text-align:left }\n#fruit-heart-v6 .fh-qr-ico { width:31px; height:31px; border-radius:8px; background:var(--acc); color:var(--on-acc);\n  display:grid; place-items:center; font-size:15px; flex:none }\n#fruit-heart-v6 .fh-qr-copy strong { display:block; font-size:13.5px; font-weight:650 }\n#fruit-heart-v6 .fh-qr-copy small { font-size:11px; color:var(--ink3) }\n#fruit-heart-v6 .fh-qr-go { margin-left:auto; color:var(--ink3); font-size:15px }\n#fruit-heart-v6 .fh-qr-tags { display:none }\n#fruit-heart-v6 .fh-qr-head { display:flex; align-items:center; gap:8px; padding:11px 14px 0 }\n#fruit-heart-v6 .fh-qr-head strong { font-size:13.5px; font-weight:650 }\n#fruit-heart-v6 .fh-qr-card>p { padding:2px 14px 0 }\n#fruit-heart-v6 .fh-qr-acts { display:flex; flex-wrap:wrap; gap:6px; padding:10px 14px 13px }\n#fruit-heart-v6 .fh-qr-acts .fh-btn { font-size:12px; padding:5px 11px }\n#fruit-heart-v6 .fh-qr-acts.dense .fh-btn { font-size:11.5px; padding:4px 9px }\n#fruit-heart-v6 .fh-qr-form { margin:0 14px 13px; padding-top:11px; border-top:1px solid var(--line);\n  display:flex; flex-wrap:wrap; gap:7px }\n#fruit-heart-v6 .fh-qr-form .fh-dim { width:100%; line-height:1.6 }\n\n/* 条目页：分区折叠 + 右侧打勾 */\n\n#fruit-heart-v6 .fh-sec-head { display:flex; align-items:center; gap:9px; width:100%; padding:11px 14px; text-align:left }\n/* 排序模式 */\n#fruit-heart-v6 .fh-sortlist { display:flex; flex-direction:column; gap:7px; touch-action:none; width:100% }\n#fruit-heart-v6 .fh-sortrow { display:flex; align-items:center; gap:10px; padding:12px 14px; background:var(--card);\n  border-radius:var(--r2); box-shadow:var(--shadow); cursor:grab; user-select:none }\n#fruit-heart-v6 .fh-sortrow b { font-weight:600; font-size:13px; flex:1 }\n#fruit-heart-v6 .fh-sortrow span { font-size:11.5px; color:var(--ink3) }\n#fruit-heart-v6 .fh-grip { font-style:normal; color:var(--ink3); font-size:15px; letter-spacing:-2px }\n#fruit-heart-v6 .fh-sortrow.moving { cursor:grabbing; outline:1.5px solid var(--acc-line) }\n#fruit-heart-v6 .fh-sec-head b { font-size:13.5px; font-weight:600; flex:1; min-width:0 }\n#fruit-heart-v6 .fh-sec-head span { color:var(--ink3); font-size:11.5px }\n#fruit-heart-v6 .fh-sec-head i { color:var(--ink3); font-size:13px; font-style:normal }\n#fruit-heart-v6 .fh-items { display:block }\n#fruit-heart-v6 .fh-item { display:flex; align-items:center; gap:8px; min-height:38px; padding:6px 14px; position:relative; cursor:pointer }\n#fruit-heart-v6 .fh-item+.fh-item:before,#fruit-heart-v6 .fh-sec-head+.fh-items .fh-item:first-child:before {\n  content:\"\"; position:absolute; left:14px; right:0; top:0; height:1px; background:var(--line) }\n#fruit-heart-v6 .fh-item-name { font-size:13px; color:var(--ink2); flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap }\n#fruit-heart-v6 .fh-item.on .fh-item-name { color:var(--ink); font-weight:500 }\n#fruit-heart-v6 .fh-item-meta { display:flex; gap:4px; flex:none }\n#fruit-heart-v6 .fh-item .fh-sw { display:none }\n/* 开没开要一眼看出来：关＝空方框，开＝实心方框带勾。\n   「什么都不显示 vs 一个勾」区分度太低，一屏全是勾的时候尤其看不出来。 */\n#fruit-heart-v6 .fh-tick { width:18px; height:18px; border-radius:5px; border:1.5px solid var(--line);\n  display:grid; place-items:center; font-size:11px; font-weight:800; color:transparent; flex:none; background:var(--paper) }\n#fruit-heart-v6 .fh-item.on .fh-tick { color:var(--on-acc); background:var(--acc); border-color:var(--acc) }\n#fruit-heart-v6 .fh-item.on { background:var(--acc-soft) }\n#fruit-heart-v6 .fh-hidden-check { position:absolute; opacity:0; pointer-events:none }\n\n#fruit-heart-v6 .fh-more.on { color:var(--acc); font-weight:600 }\n#fruit-heart-v6 .fh-toggle { display:flex; align-items:center; justify-content:space-between; gap:10px; padding:9px 14px;\n  position:relative; font-size:13.5px; cursor:pointer }\n#fruit-heart-v6 .fh-toggle+.fh-toggle:before { content:\"\"; position:absolute; left:14px; right:0; top:0; height:1px; background:var(--line) }\n\n/* 标签栏 */\n#fruit-heart-v6 .fh-bottom-nav { display:grid; grid-template-columns:repeat(4,1fr); background:var(--card); border-top:1px solid var(--line) }\n#fruit-heart-v6 .fh-nav-item { padding:8px 0 9px; text-align:center; font-size:10px; color:var(--ink3) }\n#fruit-heart-v6 .fh-nav-item.on { color:var(--acc) }\n#fruit-heart-v6 .fh-nav-item b { display:block; font-size:16px; font-weight:400; margin-bottom:1px; line-height:1.15 }\n#fruit-heart-v6 .fh-nav-item span { display:block }\n#fruit-heart-v6.fh-busy { pointer-events:none; opacity:.75 }\n\n/* 悬浮球 */\n/* 悬浮球：不画圆环不铺底色，就一只猫浮在那儿。\n   靠 drop-shadow 描一圈暗边，深浅背景上都看得见。 */\n/* dock：▲ / 猫 / ▼ 竖排。拖拽和记忆位置都挂在 dock 上，三个一起动。 */\n/* --dock 是整只猫的倍数，设置里改；下面所有尺寸都乘它，点击区跟着一起变 */\n#fruit-heart-v6-dock { --dock:1.25; position:fixed; right:18px; bottom:96px; z-index:10010;\n  display:flex; flex-direction:column; align-items:center; gap:1px; cursor:grab; touch-action:none }\n#fruit-heart-v6-dock.dragging { cursor:grabbing }\n#fruit-heart-v6 .fh-toggle span small { display:block; margin-top:2px; font-size:11px; opacity:.62; font-weight:400; line-height:1.35 }\n#fruit-heart-v6-dock .fh-jump { display:none; align-items:center; justify-content:center;\n  padding:0; border:0; background:none; cursor:pointer;\n  color:#cf6355; opacity:.62; transition:opacity .18s, transform .1s;\n  filter:drop-shadow(0 1px 1.5px #00000047) }\n#fruit-heart-v6-dock.has-jump .fh-jump { display:flex }\n#fruit-heart-v6-dock .fh-jump svg { display:block; fill:currentColor; stroke:none }\n/* 尾巴：图标自己上方留白多，靠负 margin-bottom 压低贴近头顶；\n   点击区（34×26）比图形大一圈，不然太细点不中 */\n#fruit-heart-v6-dock .fh-jump.up { width:calc(34px * var(--dock)); height:calc(26px * var(--dock)); margin-bottom:calc(-6px * var(--dock)) }\n#fruit-heart-v6-dock .fh-jump.up svg { width:calc(26px * var(--dock)); height:calc(26px * var(--dock)) }\n/* 身子：小小的一截，约头宽的 1/3，负 margin 顶到下巴底下。\n   点击区（30×16）比图形大一圈 —— 图形小不等于难点 */\n#fruit-heart-v6-dock .fh-jump.down { width:calc(30px * var(--dock)); height:calc(16px * var(--dock)); margin-top:calc(-7px * var(--dock)) }\n#fruit-heart-v6-dock .fh-jump.down svg { width:calc(14px * var(--dock)); height:calc(11px * var(--dock)) }\n#fruit-heart-v6-dock .fh-jump:hover { opacity:1 }\n/* 按下去往各自的方向缩一下：尾巴往上翘，身子往下坐 */\n#fruit-heart-v6-dock .fh-jump.up:active { opacity:1; transform:translateY(-2px) scale(.92); transition:none }\n#fruit-heart-v6-dock .fh-jump.down:active { opacity:1; transform:translateY(2px) scale(.94); transition:none }\n@media (prefers-color-scheme:dark) { #fruit-heart-v6-dock .fh-jump { color:#ff9e90; filter:drop-shadow(0 1px 3px #000000a6) } }\n\n#fruit-heart-v6-fallback { position:relative; width:calc(38px * var(--dock)); height:calc(35px * var(--dock));\n  display:flex; align-items:center; justify-content:center; padding:0; cursor:grab; touch-action:none;\n  border:0; background:none; color:#cf6355; opacity:.7; transition:opacity .18s, transform .12s;\n  filter:drop-shadow(0 1px 1.5px #00000047) }\n#fruit-heart-v6-fallback svg { width:calc(32px * var(--dock)); height:calc(32px * var(--dock)); display:block; fill:currentColor; stroke:none }\n#fruit-heart-v6-fallback:hover { opacity:1 }\n#fruit-heart-v6-fallback:active,#fruit-heart-v6-fallback.dragging { opacity:1; cursor:grabbing; transform:scale(1.1); transition:none }\n@media (prefers-color-scheme:dark) { #fruit-heart-v6-fallback { color:#ff9e90; filter:drop-shadow(0 1px 3px #000000a6) } }\n\n/* 中间地带（桌面小窗 560-900）：还是一列，但把内容收进 500px 居中，\n   不然「字数 …… 短长自定义」中间空出一大片，就是她说的电脑上丑。 */\n@media (min-width:561px) {\n  #fruit-heart-v6 .fh-main>* { max-width:520px; margin-left:auto; margin-right:auto }\n  #fruit-heart-v6 .fh-header,#fruit-heart-v6 .fh-bottom-nav { padding-left:max(18px,calc(50% - 260px)); padding-right:max(18px,calc(50% - 260px)) }\n}\n/* 宽屏：侧边栏 + 两列 */\n@media (min-width:900px) and (hover:hover) {\n  #fruit-heart-v6 .fh-main>* { max-width:none; margin-left:0; margin-right:0 }\n  #fruit-heart-v6 .fh-header { padding-left:22px; padding-right:22px }\n  #fruit-heart-v6 .fh-shell { width:min(950px,100%); height:min(810px,80dvh);\n    grid-template-rows:auto minmax(0,1fr); grid-template-columns:180px 1fr;\n    grid-template-areas:\"nav head\" \"nav main\" }\n  #fruit-heart-v6 .fh-header { grid-area:head; padding:18px 22px 8px }\n  #fruit-heart-v6 .fh-main { grid-area:main; padding:2px 22px 24px; columns:initial; overflow-y:scroll; overflow-x:hidden; scrollbar-width:thin; scrollbar-gutter:stable }\n  #fruit-heart-v6 .fh-main>* { break-inside:avoid }\n  #fruit-heart-v6 .fh-bottom-nav { grid-area:nav; display:flex; flex-direction:column; border-top:0;\n    border-right:1px solid var(--line); padding:17px 10px; gap:1px; background:transparent }\n  #fruit-heart-v6 .fh-nav-item { display:flex; align-items:center; gap:11px; padding:8px 12px; border-radius:9px;\n    text-align:left; font-size:13px; color:var(--ink2) }\n  #fruit-heart-v6 .fh-nav-item.on { background:var(--acc-soft); color:var(--acc); font-weight:600 }\n  #fruit-heart-v6 .fh-nav-item b { display:inline; font-size:15px; margin:0; width:18px; text-align:center }\n}\n\n/* 手机安全模式：大模糊阴影是重绘杀手，玻璃温室为它踩过一次坑。\n   8 张卡各挂一层 18px 模糊，回首页要多花两百多毫秒。手机上换成一条发丝线，\n   顺带也更像原生 —— iOS 的分组列表本来就没有阴影。 */\n@media (max-width:560px),(hover:none) and (pointer:coarse) {\n  #fruit-heart-v6 { padding:12px; background:#1a1613cc }\n  #fruit-heart-v6 .fh-shell { width:100%; height:80dvh; border-radius:16px; box-shadow:none }\n  #fruit-heart-v6 * { transition:none!important }\n  #fruit-heart-v6 { --shadow:none }\n  #fruit-heart-v6 :is(.fh-grp,.fh-card,.fh-qr-card,.fh-sec,.fh-sortrow) { box-shadow:inset 0 0 0 1px var(--line); contain:content }\n  #fruit-heart-v6 .fh-card.danger { box-shadow:inset 0 0 0 1px var(--acc-line) }\n}\n\n/* ═════════ 皮肤：果园手账 ═════════\n   照第二轮那张草图复刻。上一版我自作主张改成了方格本＋红色装订线，\n   跑偏了 —— 草图要的是「贴在点阵格纸上的一沓纸片」：\n   每张卡左上角一条和纸胶带，每张卡的胶带颜色不一样（由 JS 按卡片主题给 --tape）；\n   按钮是白底细描边不是实心红；勾是描边方框里一个红钩；\n   QR 卡下面横一条颜文字花边。 */\n#fruit-heart-v6[data-skin=journal] {\n  --paper:#f6f2e7; --card:#fffdf6; --card2:#f7f2e5; --fill:#3a373010; --fill2:#3a37301a;\n  --ink:#3a3730; --ink2:#8d877a; --ink3:#a49d8b; --line:#ded7c4;\n  --acc:#c25a4e; --acc-soft:#f7e8e2; --acc-line:#c25a4e;\n  --knob:#fffdf6; --track:#cfc7b2; --tape:#d9cdb4; --dot:#8a7350;\n  --shadow:2px 3px 0 #dcd4bf; --r:4px; --r2:4px;\n  --grain:radial-gradient(#8d877a2b 1.15px,transparent 1.15px);\n}\n#fruit-heart-v6[data-skin=journal][data-theme=night] {\n  --paper:#221f1a; --card:#2c2922; --card2:#343027; --fill:#f6f0e00f; --fill2:#f6f0e01c;\n  --ink:#f0e9d9; --ink2:#a9a290; --ink3:#7a7361; --line:#413b31;\n  --acc:#e8968a; --acc-soft:#e8968a1c; --acc-line:#e8968a59;\n  --knob:#f6f0e0; --track:#4d4638; --tape:#5a6f60; --dot:#c9b78e;\n  --shadow:2px 3px 0 #16140f;\n  --grain:radial-gradient(#f6f0e01c 1.15px,transparent 1.15px);\n}\n/* 手账不再默认楷体：系统楷体的屏显字重太飘，她说「丑巴巴」。想要楷就去设置里挑霞鹜文楷。 */\n#fruit-heart-v6[data-skin=journal] { --font:var(--font-sans) }\n#fruit-heart-v6[data-skin=journal] .fh-shell { background-size:15px 15px }\n/* 卡＝贴上去的纸片：左上角一条胶带，颜色由 --tape 决定（JS 一卡一色） */\n#fruit-heart-v6[data-skin=journal] :is(.fh-grp,.fh-card,.fh-qr-card,.fh-sec) {\n  border:1px solid var(--line); margin-bottom:15px; margin-top:7px; overflow:visible; position:relative }\n#fruit-heart-v6[data-skin=journal] :is(.fh-grp,.fh-card,.fh-qr-card,.fh-sec):before {\n  content:\"\"; position:absolute; top:-8px; left:20px; width:58px; height:16px; z-index:1; border-radius:1px;\n  transform:rotate(-1.6deg); opacity:.85;\n  background:repeating-linear-gradient(46deg,var(--tape) 0 4px,color-mix(in srgb,var(--tape) 45%,#fff) 4px 9px) }\n#fruit-heart-v6[data-skin=journal][data-theme=night] :is(.fh-grp,.fh-card,.fh-qr-card,.fh-sec):before {\n  background:repeating-linear-gradient(46deg,var(--tape) 0 4px,color-mix(in srgb,var(--tape) 55%,#000) 4px 9px) }\n#fruit-heart-v6[data-skin=journal] .fh-grp:first-child { margin-top:9px }\n/* 页头 */\n#fruit-heart-v6[data-skin=journal] .fh-header { border-bottom:1px dashed var(--line) }\n#fruit-heart-v6[data-skin=journal] .fh-brand strong { letter-spacing:.1em }\n#fruit-heart-v6[data-skin=journal] :is(.fh-close,.fh-theme) { border:1px dashed var(--line); background:none }\n#fruit-heart-v6[data-skin=journal] .fh-bottom-nav { border-top:1px dashed var(--line) }\n#fruit-heart-v6[data-skin=journal] .fh-lab { letter-spacing:.26em; color:var(--ink); font-size:12px; font-weight:700; margin-left:6px }\n/* 分隔线改虚线 */\n#fruit-heart-v6[data-skin=journal] :is(.fh-row,.fh-pad,.fh-ch)+:is(.fh-row,.fh-pad):before,\n#fruit-heart-v6[data-skin=journal] .fh-item+.fh-item:before,\n#fruit-heart-v6[data-skin=journal] .fh-sec-head+.fh-items .fh-item:first-child:before,\n#fruit-heart-v6[data-skin=journal] .fh-toggle+.fh-toggle:before,\n#fruit-heart-v6[data-skin=journal] .fh-sheet-item+.fh-sheet-item:before {\n  background:none; border-top:1px dashed var(--line); height:0 }\n#fruit-heart-v6[data-skin=journal] .fh-qr-form { border-top:1px dashed var(--line) }\n#fruit-heart-v6[data-skin=journal] .fh-foot { border-top:1px dashed var(--line); padding-top:12px }\n/* 勾＝描边方框里一个红钩，不填色块 */\n#fruit-heart-v6[data-skin=journal] .fh-chip { background:none; padding-left:3px; color:var(--ink2) }\n#fruit-heart-v6[data-skin=journal] .fh-chip:before {\n  content:\"\"; width:14px; height:14px; border:1.4px solid #c3bba4; border-radius:3px; background:var(--card);\n  display:inline-block; flex:none }\n#fruit-heart-v6[data-skin=journal][data-theme=night] .fh-chip:before { border-color:#5c5545; background:var(--card2) }\n#fruit-heart-v6[data-skin=journal] .fh-chip.on { background:none; color:var(--ink); font-weight:600 }\n#fruit-heart-v6[data-skin=journal] .fh-chip.on:before {\n  content:\"✓\"; color:var(--acc); border-color:var(--acc); background:none; font-size:12px; font-weight:900;\n  line-height:12px; text-align:center }\n#fruit-heart-v6[data-skin=journal] .fh-tick { border-radius:3px; border-width:1.4px; background:var(--card) }\n#fruit-heart-v6[data-skin=journal] .fh-item.on .fh-tick { background:none; color:var(--acc); border-color:var(--acc); font-size:13px }\n#fruit-heart-v6[data-skin=journal] .fh-item.on { background:none }\n#fruit-heart-v6[data-skin=journal] .fh-item.on .fh-item-name { color:var(--ink) }\n/* 按钮：白底细描边 + 淡影，不是实心红 */\n#fruit-heart-v6[data-skin=journal] .fh-btn { border-radius:7px; background:var(--card) }\n#fruit-heart-v6[data-skin=journal] :is(.fh-btn.primary,.fh-btn.solid) {\n  background:var(--card); color:var(--acc); border-color:var(--acc-line); font-weight:700;\n  box-shadow:0 1px 2px #4a3e2a14 }\n#fruit-heart-v6[data-skin=journal] :is(.fh-btn.primary,.fh-btn.solid):hover { background:var(--acc-soft); filter:none }\n/* 字数那排：草图里是三颗独立胶囊，不是分段控件 */\n#fruit-heart-v6[data-skin=journal] .fh-seg { background:none; border:0; padding:0; gap:6px }\n#fruit-heart-v6[data-skin=journal] .fh-seg button { border:1px solid var(--line); background:var(--card); border-radius:7px; padding:5px 12px }\n#fruit-heart-v6[data-skin=journal] .fh-seg button.on { border-color:var(--acc); color:var(--acc); background:var(--acc-soft); box-shadow:none }\n/* 下拉：描边胶囊，选中了就整颗变红 */\n#fruit-heart-v6[data-skin=journal] .fh-sel { border:1px solid var(--line); background:var(--card); border-radius:7px }\n#fruit-heart-v6[data-skin=journal] .fh-sel.on { border-color:var(--acc); background:var(--acc-soft) }\n#fruit-heart-v6[data-skin=journal] .fh-sw { border:1.5px solid var(--line) }\n#fruit-heart-v6[data-skin=journal] :is(input[type=text],textarea) { border:1px dashed var(--line) }\n#fruit-heart-v6[data-skin=journal] .fh-sheet-box { border:1px solid var(--line) }\n/* 右上角一枚歪着的虚线小印 */\n#fruit-heart-v6[data-skin=journal] .fh-header-meta:before {\n  content:\"果実\"; display:grid; place-items:center; width:30px; height:30px; flex:none; margin-right:3px;\n  border:1.5px dashed var(--acc-line); border-radius:50%; color:var(--acc); opacity:.5;\n  font-size:8.5px; letter-spacing:.04em; line-height:1.15; text-align:center; transform:rotate(-11deg) }\n/* ── 下面这些数值是拿设计图逐项量出来对齐的，别随手改 ── */\n#fruit-heart-v6[data-skin=journal] .fh-dot { display:block }\n/* 设计图里行内控件是紧跟标签左对齐的，不是甩到最右边 —— 这一条差别最大，\n   右对齐会在标签和控件之间空出一大片。开关仍然靠右。 */\n#fruit-heart-v6[data-skin=journal] .fh-row .fh-v { margin-left:0; justify-content:flex-start }\n#fruit-heart-v6[data-skin=journal] .fh-row .fh-sw { margin-left:auto }\n#fruit-heart-v6[data-skin=journal] .fh-ch b { font-size:12.5px; letter-spacing:.1em; font-weight:650 }\n#fruit-heart-v6[data-skin=journal] .fh-ch { gap:8px }\n#fruit-heart-v6[data-skin=journal] .fh-lab { font-size:13px; letter-spacing:.3em; width:fit-content;\n  border-bottom:1.5px dashed var(--line); padding-bottom:5px; margin-left:6px }\n#fruit-heart-v6[data-skin=journal] :is(.fh-grp,.fh-card,.fh-qr-card,.fh-sec):before {\n  height:15px; top:-7px; transform:rotate(-2deg); opacity:1 }\n#fruit-heart-v6[data-skin=journal] .fh-sel { font-size:12px; font-weight:700; padding:8px 12px 8px 13px;\n  border-radius:4px; background:var(--card) }\n#fruit-heart-v6[data-skin=journal] .fh-sel.on { background:#f7e8e2; border-color:var(--acc); color:var(--acc) }\n#fruit-heart-v6[data-skin=journal][data-theme=night] .fh-sel.on { background:#3b2f2a }\n#fruit-heart-v6[data-skin=journal] .fh-sel i { font-size:9px }\n#fruit-heart-v6[data-skin=journal] .fh-chip { font-size:11.5px; padding:4px 9px 4px 0; gap:5px }\n#fruit-heart-v6[data-skin=journal] .fh-chip:before { width:12px; height:12px; border-width:1.5px; border-radius:3px }\n#fruit-heart-v6[data-skin=journal] .fh-chip.on:before { color:var(--dot); border-color:var(--dot); font-size:11px; line-height:10px }\n#fruit-heart-v6[data-skin=journal] .fh-chip.on { color:var(--ink); font-weight:600 }\n#fruit-heart-v6[data-skin=journal] :is(.fh-more,.fh-more.fh-n) { font-size:11px; color:var(--ink2) }\n#fruit-heart-v6[data-skin=journal] .fh-ch .fh-n { font-size:11px; color:var(--ink3) }\n#fruit-heart-v6[data-skin=journal] .fh-fold { opacity:.45 }\n@media (max-width:560px),(hover:none) and (pointer:coarse) {\n  #fruit-heart-v6[data-skin=journal] :is(.fh-grp,.fh-card,.fh-qr-card,.fh-sec) { box-shadow:2px 3px 0 #dcd4bf }\n  #fruit-heart-v6[data-skin=journal][data-theme=night] :is(.fh-grp,.fh-card,.fh-qr-card,.fh-sec) { box-shadow:2px 3px 0 #16140f }\n}\n#fruit-heart-v6 .fh-ch[data-fold] { cursor:pointer }\n#fruit-heart-v6 .fh-fold { font-style:normal; color:var(--ink3); font-size:12px; margin-left:6px; flex:none }\n#fruit-heart-v6 .fh-ch .fh-n+.fh-fold,#fruit-heart-v6 .fh-ch .fh-sw+.fh-fold { margin-left:8px }\n\n/* ═════════ 皮肤 · 黑金玻璃 ═════════\n   玻璃的真相是三件事：底下要有东西被糊、边上要有一道亮线、下面要有影子。\n   只有 .fh-shell 和选择面板真的开 backdrop-filter（各一层），卡片用半透明叠色装，\n   手机上四十多张卡不能一人一层模糊，那是直接掉帧的做法。\n   金不用纯黄，用香槟金：纯黄在深底上会发脏。 */\n#fruit-heart-v6[data-skin=glass] {\n  --paper:#0e0d0b; --card:#ffffff0a; --card2:#ffffff12; --fill:#ffffff0d; --fill2:#ffffff17;\n  --ink:#f3eee3; --ink2:#aaa090; --ink3:#7c7466; --line:#e3c27f24;\n  --acc:#e6c689; --acc-soft:#e6c68914; --acc-line:#e6c68947;\n  --knob:#141210; --track:#ffffff1f; --on-acc:#191510;\n  --gold:linear-gradient(135deg,#f4e0b2 0%,#dcbb7d 46%,#b9975c 100%);\n  --shadow:0 1px 0 #ffffff0a inset,0 10px 30px #00000073;\n  --grain:none; --r:16px; --r2:11px; color-scheme:dark;\n}\n#fruit-heart-v6[data-skin=glass][data-theme=day] { --paper:#17140f; --card:#ffffff0e; --line:#e3c27f2e }\n#fruit-heart-v6[data-skin=glass] .fh-shell {\n  background:#14110ddb;\n  backdrop-filter:blur(22px) saturate(135%); -webkit-backdrop-filter:blur(22px) saturate(135%);\n  border:1px solid #e3c27f26; box-shadow:0 30px 80px #000000a6,0 1px 0 #ffffff14 inset }\n/* 一点点金色空气，让黑不是死黑 */\n#fruit-heart-v6[data-skin=glass] .fh-main {\n  background:radial-gradient(120% 60% at 82% -8%,#e6c6891a,transparent 60%),\n             radial-gradient(90% 45% at 0% 104%,#e6c68912,transparent 62%) }\n#fruit-heart-v6[data-skin=glass] :is(.fh-grp,.fh-card,.fh-qr-card,.fh-sec) {\n  border:1px solid #ffffff14; box-shadow:0 1px 0 #ffffff0f inset,0 6px 20px #0000005c;\n  background:linear-gradient(160deg,#ffffff12,#ffffff07 38%,#ffffff05) }\n#fruit-heart-v6[data-skin=glass] .fh-sheet-box { backdrop-filter:blur(26px) saturate(140%);\n  -webkit-backdrop-filter:blur(26px) saturate(140%); background:#1b1813e8; border:1px solid #e3c27f2e }\n#fruit-heart-v6[data-skin=glass] .fh-cell { background:transparent }\n/* 金件：开着的开关、实心按钮、QR 图标 —— 金只给「正在生效」的东西，别处一律留白 */\n#fruit-heart-v6[data-skin=glass] .fh-sw.on { background:var(--gold); box-shadow:0 0 14px #e6c68947 }\n#fruit-heart-v6[data-skin=glass] .fh-sw.on:after { background:#17140f; box-shadow:none }\n#fruit-heart-v6[data-skin=glass] :is(.fh-btn.primary,.fh-btn.solid,.fh-tile,.fh-qr-ico) {\n  background:var(--gold); border:0; font-weight:700; box-shadow:0 2px 12px #e6c68930 }\n#fruit-heart-v6[data-skin=glass] .fh-brand-mark { color:#e6c689; filter:drop-shadow(0 0 7px #e6c68959) }\n#fruit-heart-v6[data-skin=glass] .fh-brand strong { background:var(--gold); -webkit-background-clip:text;\n  background-clip:text; color:transparent }\n#fruit-heart-v6[data-skin=glass] .fh-lab { color:#c9ad78; letter-spacing:.2em }\n#fruit-heart-v6[data-skin=glass] .fh-dot { display:block; background:var(--gold); box-shadow:0 0 8px #e6c68959 }\n#fruit-heart-v6[data-skin=glass] .fh-seg { background:#ffffff0f; border:1px solid #ffffff12 }\n#fruit-heart-v6[data-skin=glass] .fh-seg button.on { background:#e6c68926; color:#f0d9a4;\n  box-shadow:0 0 0 1px #e6c68947 inset }\n#fruit-heart-v6[data-skin=glass] .fh-sel { background:#ffffff0d; border-color:#e6c6893d }\n#fruit-heart-v6[data-skin=glass] .fh-sel.on { color:#f0d9a4; border-color:#e6c68966; background:#e6c6891a }\n#fruit-heart-v6[data-skin=glass] .fh-item.on .fh-tick { background:var(--gold); border-color:transparent }\n#fruit-heart-v6[data-skin=glass] .fh-chip.on { background:#e6c6891f; box-shadow:0 0 0 1px #e6c68947 inset; color:#f0d9a4 }\n#fruit-heart-v6[data-skin=glass] .fh-bottom-nav { background:#13110ecc; border-top:1px solid #ffffff14;\n  backdrop-filter:blur(16px); -webkit-backdrop-filter:blur(16px) }\n\n/* 快捷回复栏里那颗按钮的猫：它在面板外面，酒馆的地盘，所以不加作用域前缀。\n   颜色写死不跟酒馆主题走 —— 那边主题五花八门，跟着走容易变成一只灰猫。 */\n.fh-bar-cat { display:inline-block; width:1.15em; height:1.15em; vertical-align:-.22em;\n  margin-right:.16em; color:#cf6355 }\n.fh-bar-cat svg { width:100%; height:100%; display:block; fill:currentColor; stroke:none }\n@media (prefers-color-scheme:dark) { .fh-bar-cat { color:#ff9e90 } }\n\n/* 大类的「菜单说明」：作者写的用法和署名，字比 title 再小一号，但必须看得见 */\n#fruit-heart-v6 .fh-qr-desc { margin-top:4px; font-size:10.5px; line-height:1.65; color:var(--ink3) }\n#fruit-heart-v6 .fh-qr-form textarea[data-card-desc] { min-height:62px; font-family:inherit; font-size:12px }\n\n/* 编辑某个按钮时顶上那句大白话：点了会发生什么 + {{输入}} 怎么用 */\n#fruit-heart-v6 .fh-qr-tip { font-size:11px; line-height:1.75; color:var(--ink2); background:var(--fill);\n  border-radius:var(--r2); padding:8px 10px; margin:0 0 2px }\n#fruit-heart-v6 .fh-qr-tip b { color:var(--acc); font-weight:650 }\n#fruit-heart-v6 .fh-qr-tip code { font-size:10.5px; padding:1px 4px; border-radius:4px; background:var(--fill2) }\n\n/* Mobile viewport containment: header/footer never scroll with the page. */\n#fruit-heart-v6 { box-sizing:border-box!important; inset:auto!important; top:var(--fh-vtop,0px)!important; left:var(--fh-vleft,0px)!important; width:var(--fh-vwidth,100vw)!important; height:var(--fh-vheight,100dvh)!important; max-width:none!important; max-height:none!important; margin:0!important; transform:none!important; overflow:hidden!important; padding:max(8px,env(safe-area-inset-top)) max(8px,env(safe-area-inset-right)) max(8px,env(safe-area-inset-bottom)) max(8px,env(safe-area-inset-left)); overscroll-behavior:contain; }\n#fruit-heart-v6 .fh-shell { min-height:0; max-height:100%; height:min(880px,80%); min-width:0; max-width:100%; }\n#fruit-heart-v6 .fh-main { min-height:0; min-width:0; overscroll-behavior:contain; overflow-x:hidden; }\n#fruit-heart-v6 .fh-header { min-height:0; padding:8px 10px; }\n#fruit-heart-v6 .fh-header-meta { gap:3px; }\n#fruit-heart-v6 .fh-fullscreen { min-width:40px; min-height:44px; font-size:20px; }\n#fruit-heart-v6 .fh-bottom-nav { grid-template-columns:repeat(4,minmax(0,1fr)); flex-shrink:0; }\n#fruit-heart-v6.fh-is-fullscreen .fh-shell { width:100%; height:100%; border-radius:10px; }\n\n/* 隔离酒馆美化的文字阴影，包含原生按钮及输入框。 */\n#fruit-heart-v6, #fruit-heart-v6 *, #fruit-heart-v6 *::before, #fruit-heart-v6 *::after { text-shadow:none !important; }\n" }).appendTo(doc.head);
    const themeKey = 'fruit-heart-theme';
    const systemTheme = hostWindow.matchMedia('(prefers-color-scheme: dark)');
    let theme = hostWindow.localStorage.getItem(themeKey) || 'system';
    function resolvedTheme() { return theme === 'system' ? (systemTheme.matches ? 'night' : 'day') : theme; }
    // 皮肤：换的是整套质感（纸纹、卡片形状、勾的画法、字体），不只是色号
    const SKINS = [['paper', '暖纸'], ['journal', '果园手账'], ['glass', '黑金玻璃']];
    const skinKey = 'fruit-heart-skin';
    let skin = hostWindow.localStorage.getItem(skinKey) || 'paper';
    if (!SKINS.some(item => item[0] === skin)) skin = 'paper';
    // 字体：皮肤自带一套（暖纸＝黑体、手账＝文楷），这里允许单独覆盖。
    // 系统那几个是零加载；网络字体走 jsDelivr 的中文分包，按 unicode-range 切片，
    // 用到哪几个字才下哪几片，不是一次拖几 MB。关掉网也只是退回系统字体，不会白板。
    const FONTS = [
        { id: 'skin', label: '跟随皮肤', note: '暖纸＝黑体，手账＝文楷' },
        { id: 'sans', label: '系统黑体', css: 'var(--font-sans)', note: '苹方 / 微软雅黑 · 零加载' },
        { id: 'song', label: '系统宋体', css: '"Songti SC",STSong,SimSun,"Noto Serif CJK SC",serif', note: '零加载' },
        { id: 'kai', label: '系统楷体', css: '"Kaiti SC",STKaiti,KaiTi,"Noto Serif CJK SC",serif', note: '零加载' },
        { id: 'yuan', label: '系统圆体', css: '"Yuanti SC","Hiragino Maru Gothic ProN",YouYuan,sans-serif', note: '苹果系统有，安卓多半没有' },
        { id: 'mono', label: '等宽', css: 'ui-monospace,"Sarasa Mono SC",Consolas,monospace', note: '零加载' },
        { id: 'wenkai', label: '霞鹜文楷', css: '"LXGW WenKai Screen",var(--font-sans)', pkg: 'cn-fontsource-lxgw-wen-kai-screen', note: '手写楷 · 需联网' },
        { id: 'xiaolai', label: '小赖字体', css: '"Xiaolai SC",var(--font-sans)', pkg: 'cn-fontsource-xiaolai-sc-regular', note: '圆润手写 · 需联网' },
        { id: 'yozai', label: '悠哉字体', css: '"Yozai",var(--font-sans)', pkg: 'cn-fontsource-yozai-regular', note: '随性手写 · 需联网' },
        { id: 'smiley', label: '得意黑', css: '"Smiley Sans Oblique",var(--font-sans)', pkg: 'cn-fontsource-smiley-sans-oblique-regular', note: '斜体黑 · 需联网' },
        { id: 'songti', label: '思源宋体', css: '"Source Han Serif SC VF",var(--font-sans)', pkg: 'cn-fontsource-source-han-serif-sc-vf-regular', note: '正经宋 · 需联网' },
        { id: 'fzkai', label: '方正楷体', css: '"FZKai-Z03",var(--font-sans)', pkg: 'cn-fontsource-fz-kai-z-03-regular', note: '标准楷 · 需联网' },
    ];
    const fontKey = 'fruit-heart-font';
    let font = hostWindow.localStorage.getItem(fontKey) || 'skin';
    if (!FONTS.some(item => item.id === font)) font = 'skin';
    const fontLoaded = {};
    function loadFont(pkg) {
        if (!pkg || fontLoaded[pkg]) return;
        fontLoaded[pkg] = true;
        const link = doc.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://fastly.jsdelivr.net/npm/' + pkg + '/font.css';
        // fastly 那条线偶尔不通，掉回主域再试一次；两条都不通就是退回系统字体，界面照样能用
        link.onerror = () => { link.onerror = null; link.href = 'https://cdn.jsdelivr.net/npm/' + pkg + '/font.css'; };
        doc.head.appendChild(link);
    }
    function currentFont() { return FONTS.find(item => item.id === font) || FONTS[0]; }
    function applyFont() {
        const item = currentFont();
        if (item.pkg) loadFont(item.pkg);
        if (item.css) root[0].style.setProperty('--font', item.css);
        else root[0].style.removeProperty('--font');
    }
    function applyTheme() {
        root.attr('data-theme', resolvedTheme());
        root.attr('data-skin', skin);
        applyFont();
        root.find('.fh-theme').text(resolvedTheme() === 'night' ? '☀' : '☾').attr('aria-label', resolvedTheme() === 'night' ? '切换日间主题' : '切换夜间主题');
    }

    const root = jq(`<div id="${APP_ID}" role="dialog" aria-modal="true" aria-label="果实之心"><div class="fh-shell">
        <header class="fh-header"><span class="fh-brand-mark">${BALL_ICON}</span><div class="fh-brand"><div><strong>果实之心</strong><em>@KKM</em><button class="fh-update-badge" data-action="open-updates" hidden title="发现果实之心更新" aria-label="发现果实之心更新">🍎</button></div><small>${SUBTITLE}</small></div><div class="fh-header-meta"><button class="fh-theme" data-action="theme" aria-label="切换主题"></button><button class="fh-fullscreen" data-action="fullscreen" aria-label="面板全屏" aria-pressed="false">⛶</button><button class="fh-close" data-action="close" aria-label="关闭">×</button></div></header>
        <main class="fh-main"></main><nav class="fh-bottom-nav"></nav>
    </div></div>`).appendTo(doc.documentElement);
    const mainNode = root.find('.fh-main')[0];
    // jQuery.html() 会走 buildFragment + Sizzle，一次首页渲染能吃掉两三百毫秒。
    // 这里塞的全是静态 HTML，用原生 innerHTML 就够，快一个数量级。
    const main = { html: text => { mainNode.innerHTML = text; return main; },
        find: sel => jq(mainNode.querySelectorAll(sel)),
        scrollTop: v => { if (v === undefined) return mainNode.scrollTop; mainNode.scrollTop = v; return main; } };
    applyTheme();
    function syncViewport() {
        const v = hostWindow.visualViewport;
        const el = root[0];
        el.style.setProperty('--fh-vtop', `${v?.offsetTop || 0}px`);
        el.style.setProperty('--fh-vleft', `${v?.offsetLeft || 0}px`);
        el.style.setProperty('--fh-vwidth', `${v?.width || hostWindow.innerWidth}px`);
        el.style.setProperty('--fh-vheight', `${v?.height || hostWindow.innerHeight}px`);
    }
    hostWindow.visualViewport?.addEventListener('resize', syncViewport);
    hostWindow.visualViewport?.addEventListener('scroll', syncViewport);
    hostWindow.addEventListener('resize', syncViewport);
    syncViewport();

    // 「自动双语」用的是预设里本来就有的那条（🗣️ 双语对白），脚本只负责开关它；
    // 用户把它删了或改了名，这格就自己消失，不会凭空造条目。
    function bilingualPrompt(preset, config) {
        return activePrompts(preset, config).find(prompt => !isDivider(prompt) && /双语/.test(String(prompt.name || ''))) || null;
    }
    function switchRow(key, label, prompt, extra = '') {
        const on = isOn(prompt);
        return `<div class="fh-row"><span class="fh-k">${h(label)}</span><div class="fh-v">`
            + (prompt ? `<button class="fh-sw ${on ? 'on' : ''}" data-master="${h(key)}" role="switch" aria-checked="${on}" aria-label="${h(label)}"></button>` : '<span class="fh-dim">未找到对应条目</span>')
            + extra + '</div></div>';
    }
    function groupSelect(group, config, preset, cls = '', prefix = '') {
        return selectFrom(activePrompts(preset, config).filter(prompt => exclusiveFamily(prompt, config) === group), group, prefix, cls);
    }
    // 不用原生 <select> 了：它的弹层是系统画的，样式一点改不了（她说「下拉框还是很丑」，
    // 那个深色系统菜单确实丑），而且排版极贵 —— 六个下拉五十多个 option，光布局 260ms。
    // 换成自己的选择面板：手机上从底部升起，宽屏上居中，样式跟着皮肤走。
    function selectFrom(items, group, prefix = '', cls = '') {
        if (!items.length) return '';
        const active = items.filter(prompt => prompt.enabled);
        const label = active.length > 1 ? `多项已开（${active.length}）`
            : active.length === 1 ? prefix + plainName(active[0].name) : prefix + '全部关闭';
        return `<button class="fh-sel ${active.length === 1 ? 'on' : ''} ${cls}" data-pick-group="${h(group)}"`
            + ` data-prefix="${h(prefix)}" aria-label="${h(group)}">${h(label)}<i>▾</i></button>`;
    }
    let sheetOpen = false;
    function closePicker() { root.find('.fh-sheet').remove(); sheetOpen = false; }
    function openPicker(title, items, onPick) {
        closePicker();
        const box = jq(`<div class="fh-sheet"><div class="fh-sheet-bg" data-sheet-close></div>
          <div class="fh-sheet-box"><div class="fh-sheet-head">${h(title)}</div>
          <div class="fh-sheet-list">${items.map((item, index) => `<button class="fh-sheet-item ${item.on ? 'on' : ''}" data-pick-index="${index}">
            <span>${h(item.label)}</span>${item.note ? `<em>${h(item.note)}</em>` : ''}<i>✓</i></button>`).join('')}</div>
          <button class="fh-sheet-cancel" data-sheet-close>取消</button></div></div>`).appendTo(root.find('.fh-shell'));
        sheetOpen = true;
        box.on('click', '[data-sheet-close]', closePicker);
        box.on('click', '[data-pick-index]', function () {
            const item = items[Number(this.dataset.pickIndex)];
            closePicker();
            onPick(item.value);
        });
        const first = box.find('.fh-sheet-item.on')[0] || box.find('.fh-sheet-item')[0];
        if (first) first.scrollIntoView({ block: 'nearest' });
    }
    function structureLine(preset, config) {
        const fm = findByContent(preset, c => /structure_sample/i.test(c));
        if (!fm || !fm.enabled) return '输出结构条目未开启';
        const names = { '标题': '标题', 'prologue': '序言', 'status_1': '顶栏', 'content': '正文', 'status_2': '底栏', 'status_3': '状态', 'update_variable': '变量', 'tableEdit': '表格', 'meow_FM': '摘要', 'char_date': '角色表', 'branches': '选项', 'snow': '小剧场', '文生图': '生图', 'online': '线上' };
        const live = new Set();
        for (const prompt of activePrompts(preset, config)) {
            if (!prompt.enabled) continue;
            for (const m of String(prompt.content || '').matchAll(/\{\{setvar::([^:}]+)::([\s\S]*?)\}\}/g)) if (m[2].trim()) live.add(m[1].trim());
        }
        const parts = ['ECoT'];
        for (const m of String(fm.content).matchAll(/\{\{getvar::([^:}]+?)\s*\}\}/g)) {
            const key = m[1].trim();
            if (names[key] && live.has(key)) parts.push(names[key]);
        }
        return parts.join(' → ');
    }
    function outSection(items, data, id) {
        return items.filter(p => sectionOf(p, data) === id && !isDivider(p) && !/^📌/.test(p.name));
    }
    // 区名是会改的：她把「🔞 亲密」改名成「🔞 NSFW」之后，首页那张卡立刻变成 0 / 0。
    // 但每个大区的 emoji 是独有的（她自己定的规矩），所以名字和 emoji 两条都认，改名不至于把卡打空。
    const SECTION_KEYS = {
        theatre: /剧场|🎭/,
        nsfw: /亲密|NSFW|🔞/i,
        out: /输出|🍏/,
        tail: /尾部|尾巴|🔌/,
    };
    function sectionIdOf(data, test) { return data.groups.find(group => test.test(group.name))?.id || ''; }
    let statsMemo = { key: '', value: null };
    function homeStats(preset, config) {
        const key = presetFingerprint();
        if (statsMemo.key === key && statsMemo.value) return statsMemo.value;
        const value = { structure: structureLine(preset, config) };
        statsMemo = { key, value };
        return value;
    }
    function countLink(list, id) {
        return `<button class="fh-more fh-n" data-goto-section="${h(id)}">${list.filter(p => p.enabled).length} / ${list.length} ›</button>`;
    }
    // 收起来的时候优先摆已开的 —— 不然一排全是关着的，等于没说
    function collapse(items, open, keep = 5) {
        if (open || items.length <= keep) return items;
        return [...items].sort((a, b) => (b.enabled ? 1 : 0) - (a.enabled ? 1 : 0)).slice(0, keep);
    }
    function chipOf(prompt, extra = '') {
        return `<button class="fh-chip ${prompt.enabled ? 'on' : ''}" data-chip="${h(promptId(prompt))}">${h(plainName(prompt.name) + extra)}</button>`;
    }
    // 一张卡里既有单选组又有复选条目时，按条目本身的顺序排，单选组就地变成一个下拉
    function mixedChips(items, config, all) {
        const out = [];
        const done = new Set();
        for (const prompt of items) {
            const family = exclusiveFamily(prompt, config);
            if (!family) { out.push(chipOf(prompt)); continue; }
            if (done.has(family)) continue;
            done.add(family);
            out.push(selectFrom(all.filter(p => exclusiveFamily(p, config) === family), family, family + '：'));
        }
        return out.join('');
    }
    function renderOverview() {
        const preset = activePreset();
        const config = readConfig(preset);
        const all = activePrompts(preset, config);
        const data = sectionData(preset);
        const range = wordRange();
        const models = modelChoices(preset);
        const now = currentModel(config, models);
        const theatre = theatreMaster(preset), nsfw = nsfwMaster(preset);
        const showItems = theatreItems(preset, config);
        const theatreId = sectionIdOf(data, SECTION_KEYS.theatre), nsfwId = sectionIdOf(data, SECTION_KEYS.nsfw), outId = sectionIdOf(data, SECTION_KEYS.out);
        const nsfwItems = outSection(all, data, nsfwId);
        const outItems = outSection(all, data, outId);
        const bodyItems = outItems.filter(p => BODY_OUT.test(plainName(p.name)));
        const masters = new Set([theatre, nsfw].filter(Boolean).map(promptId));
        const restItems = outItems.filter(p => !BODY_OUT.test(plainName(p.name)) && !masters.has(promptId(p)));
        const stream = Boolean((preset.settings || {}).should_stream);
        const farmerAll = all.filter(p => exclusiveFamily(p, config) === '果农');
        const farmerNow = plainName((farmerAll.find(p => p.enabled) || {}).name || '') || '未选';
        const seg = WORD_PRESETS.map(([label, min, max]) => {
            const hit = String(range[0]) === String(min) && String(range[1]) === String(max);
            return `<button class="${hit ? 'on' : ''}" data-word-range="${min}:${max}" title="${min === max ? min : min + '-' + max} 字">${h(label)}</button>`;
        }).join('') + `<button data-action="word-custom" title="${h(range[0])}-${h(range[1])} 字">自定义</button>`;
        const fold = id => homeFolded(config, id);
        const head = (id, name, extra = '') => `<div class="fh-ch" data-fold="${id}"><i class="fh-dot"></i><b>${h(name)}</b>${extra}
            <i class="fh-fold">${fold(id) ? '▸' : '▾'}</i></div>`;
        const part = {};
        part.qr = `<div class="fh-grp" style="${cardVars('qr')}"><button class="fh-qr-entry" data-nav="qr"><span class="fh-qr-ico">⌘</span>
          <span class="fh-qr-copy"><strong>快捷指令 QR</strong><small>可自定义编辑，兼容酒馆原生 QR</small></span>
          <span class="fh-qr-go">›</span></button></div>`;
        part.common = `<div class="fh-lab">常用</div>
        <div class="fh-grp" style="${cardVars('common')}"><div class="fh-pad">
          <button class="fh-btn solid" data-qr="总结模式" data-qr-label="大总结——合并之前的大总结" title="大总结，并合并之前的大总结">合并大总结</button>
          <button class="fh-btn solid" data-qr="隐藏楼层" title="输入范围，例如 0-10">隐藏楼层</button>
          <button class="fh-btn solid" data-qr="取消隐藏" title="一般保留最近 5-10 楼">取消隐藏</button>
          <button class="fh-btn solid" data-qr="自动继续" title="直接发送「继续推进剧情」，不经过输入框">自动继续</button></div></div>`;
        const bi = bilingualPrompt(preset, config);
        part.turn = `<div class="fh-lab">常规设置</div>
        <div class="fh-grp" style="${cardVars('turn')}"><div class="fh-grid">
          <div class="fh-cell"><span class="fh-ck">流式传输</span><div class="fh-cv">
            <button class="fh-sw ${stream ? 'on' : ''}" data-master="stream" role="switch" aria-checked="${stream}" aria-label="流式传输"></button></div></div>
          <div class="fh-cell"><span class="fh-ck">自动双语</span><div class="fh-cv">${bi
            ? `<button class="fh-sw ${isOn(bi) ? 'on' : ''}" data-chip="${h(promptId(bi))}" role="switch" aria-checked="${isOn(bi)}" aria-label="自动双语"></button>`
            : '<span class="fh-dim">没找到双语条目</span>'}</div></div>
          <div class="fh-cell"><span class="fh-ck">抢话</span><div class="fh-cv">${groupSelect('抢话', config, preset)}</div></div>
          <div class="fh-cell"><span class="fh-ck">字数<em>${h(range[0])}-${h(range[1])}</em></span><div class="fh-cv"><span class="fh-seg">${seg}</span></div></div>
          <div class="fh-cell"><span class="fh-ck">视角</span><div class="fh-cv">${groupSelect('人称', config, preset)}</div></div>
          <div class="fh-cell"><span class="fh-ck">文风</span><div class="fh-cv">${groupSelect('文风', config, preset)}</div></div>
          <div class="fh-cell"><span class="fh-ck">模型</span><div class="fh-cv">${models.length
            ? `<button class="fh-sel ${now ? 'on' : ''}" data-pick-model aria-label="模型">${h(now ? now.label : '未选模型')}<i>▾</i></button>`
            : '<span class="fh-dim">条目名末尾写 # 模型名即可</span>'}</div></div>
          <div class="fh-cell"><span class="fh-ck">思考方式</span><div class="fh-cv">${groupSelect('COT', config, preset)}</div>
            ${cotNote(preset, config) ? `<span class="fh-hint">${h(cotNote(preset, config))}</span>` : ''}</div>
        </div></div>`;
        part.theatre = `<div class="fh-grp" style="${cardVars('theatre')}">
          ${head('theatre', '小剧场', `${countLink(showItems, theatreId)}${theatre
            ? `<button class="fh-sw ${isOn(theatre) ? 'on' : ''}" data-master="theatre" role="switch" aria-checked="${isOn(theatre)}" aria-label="小剧场总开关"></button>`
            : '<span class="fh-n">没找到总开关</span>'}`)}
          ${fold('theatre') ? '' : `<div class="fh-row"><span class="fh-k">主剧场</span><div class="fh-v">${groupSelect('主剧场', config, preset)}</div></div>
          <div class="fh-row"><span class="fh-k">随机</span><div class="fh-v"><span class="fh-seg">${[[0, '关'], [1, '1 个'], [2, '2 个']]
            .map(([n, label]) => `<button class="${(Number(config.theatreRandom) || 0) === n ? 'on' : ''}" data-theatre-random="${n}"`
              + ` title="${n ? '每回合从全部 💡 里随机开 ' + n + ' 个' : '不随机，按你勾选的来'}">${label}</button>`).join('')}</span></div></div>
          <div class="fh-pad"><div class="fh-chips">${collapse(showItems, theatreOpen).map(p => chipOf(p)).join('')}
            ${showItems.length > 5 ? `<button class="fh-more" data-action="toggle-theatre">素材 ${showItems.length} 项 ${theatreOpen ? '▾' : '›'}</button>` : ''}</div></div>`}
        </div>`;
        part.nsfw = `<div class="fh-grp" style="${cardVars('nsfw')}">
          ${head('nsfw', 'NSFW', `${countLink(nsfwItems, nsfwId)}${nsfw ? `<button class="fh-sw ${isOn(nsfw) ? 'on' : ''}" data-master="nsfw" role="switch" aria-checked="${isOn(nsfw)}" aria-label="NSFW 总开关"></button>` : ''}`)}
          ${fold('nsfw') ? '' : `<div class="fh-pad"><div class="fh-chips">${collapse(nsfwItems, nsfwOpen).map(p => chipOf(p)).join('')}
            ${nsfwItems.length > 5 ? `<button class="fh-more" data-action="toggle-nsfw">细项 ${nsfwItems.length} 项 ${nsfwOpen ? '▾' : '›'}</button>` : ''}</div></div>`}
        </div>`;
        part.body = `<div class="fh-grp" style="${cardVars('body')}">
          ${head('body', '正文', countLink(bodyItems, outId))}
          ${fold('body') ? '' : `<div class="fh-pad"><div class="fh-chips">${bodyItems.map(p => chipOf(p)).join('')}</div></div>`}
        </div>`;
        part.rest = `<div class="fh-grp" style="${cardVars('rest')}">
          ${head('rest', '非正文', countLink(restItems, outId))}
          ${fold('rest') ? '' : `<div class="fh-pad"><div class="fh-chips">${mixedChips(restItems, config, all)}</div></div>`}
        </div>`;
        part.farmer = `<div class="fh-grp" style="${cardVars('farmer')}">
          ${head('farmer', '果农人格', `<span class="fh-n">${h(farmerNow)}</span>`)}
          ${fold('farmer') ? '' : `<div class="fh-pad">${groupSelect('果农', config, preset, 'wide')}</div>`}
        </div>`;
        main.html(`${homeOrder(config).map(id => part[id] || '').join('')}
        <div class="fh-foot" data-stat="structure">计算中…</div>`);
        // 这行要扫全部正文，放到下一帧算，先让面板显示出来
        hostWindow.requestAnimationFrame(() => {
            if (currentView !== 'overview' || !root.hasClass('open')) return;
            try { root.find('[data-stat=structure]').text(homeStats(activePreset(), readConfig()).structure); } catch {}
        });
    }

    function qrTagForm(state) {
        const friendly = state.kind !== 'raw';
        const sends = qrSends(state.raw || '');
        return `<div class="fh-qr-form">
          ${friendly ? `<p class="fh-qr-tip">点这个按钮时：把下面这段话${sends ? '<b>直接发出去</b>，立刻开始生成。' : '<b>写进输入框</b>，你看过再发。'}<br>
            句子中间要留个空、每次临时填？在那个位置写 <code>{{输入}}</code> —— 点的时候会先问你，填的字就插在那儿。</p>` : ''}
          <input type="text" data-qr-name maxlength="24" placeholder="标签名" value="${h(state.label || '')}">
          <textarea data-qr-text rows="${friendly ? 4 : 8}" spellcheck="false" class="${friendly ? '' : 'mono'}"
            placeholder="${friendly ? '写进输入框的要求，例如：这一回合不要出现眼泪。' : '这一条是原始 Slash 指令，整段照改。'}">${h(state.text || '')}</textarea>
          ${friendly ? `<input type="text" data-qr-hint maxlength="30" ${ASK_MARK.test(state.text || '') ? '' : 'hidden'}
            placeholder="点它时问你什么？（选填）" value="${h(state.hint || '')}">` : `<p class="fh-qr-tip">这条的写法面板读不懂（多半是直接发送、或者带了别的酒馆指令），所以整段原文给你改。<br>
            <b>只改文字、别动斜杠开头的那些行和行尾的 <code>|</code> <code>||</code></b> —— 那些是酒馆的断句符号，少一个整条就不灵了。</p>`}
          <button class="fh-btn primary" data-action="qr-tag-save">保存</button>
          <button class="fh-btn" data-action="qr-tag-cancel">取消</button>
          ${state.exists ? '<button class="fh-btn danger" data-action="qr-tag-delete">删掉</button>' : ''}</div>`;
    }
    function qrCardForm(card) {
        return `<div class="fh-qr-form">
          <input type="text" data-card-label maxlength="20" placeholder="大类名，例如 剧情控制" value="${h(card.label)}">
          <input type="text" data-card-title maxlength="60" placeholder="这一类是干嘛的，一句话" value="${h(card.title || '')}">
          ${QR_BUTTONS.test(card.message) ? `<textarea data-card-desc rows="3" maxlength="400" spellcheck="false"
            placeholder="点开这一类时，菜单顶上显示的说明。用法、注意事项、@谁的灵感，都写这儿 —— 导出后酒馆原生也照样显示。">${h(qrDesc(card.message))}</textarea>` : ''}
          <button class="fh-btn primary" data-action="qr-card-save">保存</button>
          <button class="fh-btn" data-action="qr-card-cancel">取消</button>
          <button class="fh-btn danger" data-action="qr-card-delete">删掉整个大类</button></div>`;
    }
    function renderQr() {
        const config = readConfig();
        const set = qrSet(config);
        const edit = qrEdit;
        main.html(`${titleBlock('快捷指令 QR', edit ? '改完记得导出，这份文件酒馆能直接当 QR 集读回去，不装果实之心的人也能用。' : '出厂内容来自 @喵喵电波MoM 的 QR 集；这里把二级菜单摊开了。')}
          <div class="fh-toolbar">
            ${edit ? `<div class="fh-search"><input data-qr-setname type="text" value="${h(set.name)}" placeholder="这套 QR 叫什么"></div>` : `<span class="fh-dim" style="flex:1">${h(set.name)} · ${set.cards.length} 类</span>`}
            <button class="fh-btn ${edit ? 'on' : 'solid'}" data-action="qr-edit">${edit ? '完成编辑' : '编辑指令'}</button></div>
          ${edit ? `<div class="fh-pad fh-mt"><button class="fh-btn" data-action="qr-export">导出给别人</button>
            <button class="fh-btn" data-action="qr-import">导入 QR 集</button>
            <button class="fh-btn danger" data-action="qr-reset">恢复出厂</button></div>` : ''}
          <div class="fh-qr-list fh-mt">${set.cards.map(card => {
            const labels = qrLabels(card.message);
            const sends = qrSends(card.message);
            const editingCard = edit && qrCardEdit === card.id;
            const tag = qrTag && qrTag.card === card.id ? qrTag : null;
            return `<section class="fh-qr-card"><div class="fh-qr-head"><strong>${h(card.label)}</strong>
                ${sends ? '<span class="fh-tag">会触发生成</span>' : '<span class="fh-tag quiet">只写输入框</span>'}
                ${edit ? `<button class="fh-x" data-card-edit="${h(card.id)}" title="改大类名和说明">✎</button>` : ''}</div>
              <p>${h(card.title || '')}</p>
              ${qrDesc(card.message) ? `<p class="fh-qr-desc">${h(qrDesc(card.message))}</p>` : ''}
              ${editingCard ? qrCardForm(card) : ''}
              <div class="fh-qr-acts ${labels.length > 8 ? 'dense' : ''}">${labels.length
                ? labels.map(item => `<button class="fh-btn ${edit ? 'mine' : ''}" data-qr="${h(card.id)}" data-qr-label="${h(item)}">${h(item)}${branchBody(card.message, item).includes('/input ') ? ' …' : ''}</button>`).join('')
                : `<button class="fh-btn ${edit ? 'mine' : 'primary'}" data-qr="${h(card.id)}">${edit ? '改这条指令' : '执行'}</button>`}
                ${edit && labels.length ? `<button class="fh-btn add" data-qr-add="${h(card.id)}">+ 自定义指令</button>` : ''}</div>
              ${tag ? qrTagForm(tag) : ''}</section>`;
          }).join('')}
          ${edit ? '<button class="fh-btn add fh-mt" data-action="qr-card-new">+ 新建大类</button>' : ''}</div>`);
    }

    function ecotEnabled() {
        const api = hostWindow.FruitHeartECoT || window.FruitHeartECoT;
        return api && typeof api.getEnabled === 'function' ? api.getEnabled() : false;
    }
    function ecotStatus() {
        const api = hostWindow.FruitHeartECoT || window.FruitHeartECoT;
        return api ? (ecotEnabled() ? '已开启' : '已关闭') : '未就绪';
    }
    const DEFAULT_ECOT_END_TAGS = ['</ECoT>', '</thinking>', '</think>', '<!-- End of The ECoT -->', '<!-- End the ECoT -->'];
    const LEGACY_ECOT_END_TAGS = ['</ECoT>', '</thinking>', '</think>', '<!-- End of The ECoT -->'];
    function sameTags(actual, expected) {
        const tags = Array.isArray(actual) ? actual.map(tag => String(tag)) : [];
        return tags.length === expected.length && expected.every(tag => tags.includes(tag));
    }
    function ecotEndTags() {
        const api = hostWindow.FruitHeartECoT || window.FruitHeartECoT;
        if (!api || typeof api.getEndTags !== 'function') return [...DEFAULT_ECOT_END_TAGS];
        try {
            const tags = api.getEndTags();
            if (sameTags(tags, LEGACY_ECOT_END_TAGS) && typeof api.setEndTags === 'function') {
                api.setEndTags(DEFAULT_ECOT_END_TAGS);
                return [...DEFAULT_ECOT_END_TAGS];
            }
            return Array.isArray(tags) && tags.length ? tags : [...DEFAULT_ECOT_END_TAGS];
        } catch { return [...DEFAULT_ECOT_END_TAGS]; }
    }
    function wordRange() {
        const config = readConfig();
        const prompt = wordCountPrompt(activePreset(), config);
        const match = (prompt?.content || '').match(WORD_RANGE);
        return match ? [match[1], match[2]] : [2200, 2500];
    }
    function renderEntries() {
        const preset = activePreset();
        const config = readConfig(preset);
        const data = sectionData(preset);
        const prompts = activePrompts(preset, config).filter(prompt => !isDivider(prompt));
        const query = entryQuery.trim().toLowerCase();
        const match = prompt => (!query || String(prompt.name).toLowerCase().includes(query)) && (!entriesOnOnly || prompt.enabled);
        const rowOf = prompt => {
            const part = nameParts(prompt.name);
            return `<label class="fh-item ${prompt.enabled ? 'on' : ''}"><span class="fh-item-name">${h(part.title.replace(LEAD_EMOJI, ''))}</span>`
                + `<span class="fh-item-meta">${sourceBadge(prompt)}${part.group ? `<i class="fh-g">${h(part.group)}</i>` : ''}${part.hints.map(x => `<i>${h(x)}</i>`).join('')}</span>`
                + `<input class="fh-hidden-check" type="checkbox" data-prompt-id="${h(promptId(prompt))}" ${prompt.enabled ? 'checked' : ''}><span class="fh-tick">✓</span></label>`;
        };
        const hidden = new Set(config.hiddenSections || []);
        const groups = orderedGroups(data, config).filter(group => !hidden.has(group.id) || group.id === forceSection);
        let body;
        if (sortSections) {
            body = `<div class="fh-sortlist">${groups.map(group => {
                const items = prompts.filter(prompt => sectionOf(prompt, data) === group.id);
                return `<div class="fh-sortrow" data-sort-id="${h(group.id)}"><i class="fh-grip">⠿</i><b>${h(group.name)}</b><span>${items.length}</span></div>`;
            }).join('')}</div>`;
        } else if (query || entriesOnOnly) {
            const hits = prompts.filter(match);
            body = hits.length ? `<div class="fh-items fh-sec open">${hits.map(rowOf).join('')}</div>` : '<div class="fh-empty">没有匹配的条目</div>';
        } else {
            body = groups.map(group => {
                const items = prompts.filter(prompt => sectionOf(prompt, data) === group.id);
                if (!items.length) return '';
                const on = items.filter(prompt => prompt.enabled).length;
                const open = openSections.has(group.id);
                // 默认只画区标题；点开才渲染这一区的行 —— 原来一口气画 278 行，手机要等一秒多。
                return `<section class="fh-sec ${open ? 'open' : ''}" data-sec-id="${h(group.id)}">
                    <button class="fh-sec-head" data-section="${h(group.id)}"><b>${h(group.name)}</b><span>${on} / ${items.length}</span><i>${open ? '▾' : '▸'}</i></button>
                    ${open ? `<div class="fh-items">${items.map(rowOf).join('')}</div>` : ''}</section>`;
            }).join('');
        }
        main.html(`${titleBlock('条目', sortSections ? '按住 ⠿ 上下拖，排你顺手的顺序。只动面板里的排列，预设本身不变。' : '按分区折叠，点开哪个区才加载哪个区。')}
          <div class="fh-toolbar"><div class="fh-search"><input data-entry-search type="text" placeholder="搜索全部条目…" value="${h(entryQuery)}" ${sortSections ? 'disabled' : ''}></div>
            <label class="fh-check"><input data-action="entries-on-only" type="checkbox" ${entriesOnOnly ? 'checked' : ''} ${sortSections ? 'disabled' : ''}> 仅看已开启</label>
            <button class="fh-btn ${sortSections ? 'on' : 'solid'}" data-action="sections-sort">${sortSections ? '完成排序' : '排序分区'}</button></div>
          ${body}`);
        if (sortSections) bindSectionSort();
        if (forceSection) {
            const node = main.find(`[data-sec-id="${forceSection}"]`)[0];
            forceSection = '';
            if (node) hostWindow.requestAnimationFrame(() => node.scrollIntoView({ block: 'start' }));
        }
    }
    // 区排序：指针拖，手机上也能用（HTML5 drag 在触屏上是死的）
    function bindHomeSort() {
        const list = main.find('[data-home-sort]')[0];
        if (!list) return;
        let row = null;
        list.addEventListener('pointerdown', event => {
            if (event.target.closest('.fh-sw')) return;
            row = event.target.closest('.fh-sortrow');
            if (!row) return;
            row.classList.add('moving'); list.setPointerCapture(event.pointerId); event.preventDefault();
        });
        list.addEventListener('pointermove', event => {
            if (!row) return;
            for (const node of list.querySelectorAll('.fh-sortrow')) {
                if (node === row) continue;
                const box = node.getBoundingClientRect();
                if (event.clientY > box.top && event.clientY < box.bottom) {
                    list.insertBefore(row, event.clientY < box.top + box.height / 2 ? node : node.nextSibling);
                    break;
                }
            }
        });
        const finish = event => {
            if (!row) return;
            row.classList.remove('moving'); row = null;
            try { list.releasePointerCapture(event.pointerId); } catch {}
            const order = [...list.querySelectorAll('.fh-sortrow')].map(node => node.dataset.sortId);
            guarded(async () => {
                await updateBoth(preset => {
                    const config = readConfig(preset);
                    config.homeOrder = order;
                    writeConfig(preset, config); return preset;
                });
            });
        };
        list.addEventListener('pointerup', finish);
        list.addEventListener('pointercancel', finish);
    }
    function bindSectionSort() {
        const list = main.find('.fh-sortlist')[0];
        if (!list) return;
        let row = null;
        list.addEventListener('pointerdown', event => {
            const hit = event.target.closest('.fh-sortrow');
            if (!hit) return;
            row = hit; row.classList.add('moving');
            list.setPointerCapture(event.pointerId);
            event.preventDefault();
        });
        list.addEventListener('pointermove', event => {
            if (!row) return;
            for (const node of list.querySelectorAll('.fh-sortrow')) {
                if (node === row) continue;
                const box = node.getBoundingClientRect();
                if (event.clientY > box.top && event.clientY < box.bottom) {
                    list.insertBefore(row, event.clientY < box.top + box.height / 2 ? node : node.nextSibling);
                    break;
                }
            }
        });
        const finish = event => {
            if (!row) return;
            row.classList.remove('moving'); row = null;
            try { list.releasePointerCapture(event.pointerId); } catch {}
            const order = [...list.querySelectorAll('.fh-sortrow')].map(node => node.dataset.sortId);
            guarded(async () => {
                await updateBoth(preset => {
                    const config = readConfig(preset);
                    config.sectionOrder = order;
                    writeConfig(preset, config); return preset;
                });
            });
        };
        list.addEventListener('pointerup', finish);
        list.addEventListener('pointercancel', finish);
    }

    const RELEASE_BASE = 'https://raw.githubusercontent.com/kongkongmie/guoshizhixin/main/';
    const RELEASE_NOTES = [{"version":"20260919.8","date":"2026-09-19","changes":["标题栏新增苹果更新提示；检测到新版时显示，点击可直接进入更新页。"]},{"version":"20260919.7","date":"2026-09-19","changes":["修复快捷栏兜底入口使用原生 button 导致灰底、灰字的问题，改为与酒馆 Quick Reply 一致的 div.qr--button。"]},{"version":"20260919.6","date":"2026-09-19","changes":["思维链默认结束标签扩展为五个：</ECoT>、</thinking>、</think>、<!-- End of The ECoT -->、<!-- End the ECoT -->。","补上脚本卸载时的界面清理、浮球开关即时隐藏和快捷栏入口兜底修复。"]},{"version":"20260918.5","date":"2026-09-18","changes":["修复普通 HTTP、局域网酒馆下脚本校验接口不可用导致的加载失败。","加载器提示具体失败步骤，不再把所有错误都提示为网络问题。","更新页下载校验同样支持 HTTP；已有旧加载入口需替换一次。"]},{"version":"20260918.4","date":"2026-09-18","changes":["Gemini 3.7F、3.8F、FLASH 等写法统一归入 Gemini Flash，不区分大小写，菜单不再重复。","手动选择和连接联动使用同一分组规则，保留条目原始标签与开关记忆，Flash 与 Pro 分离。"]},{"version":"20260918.3","date":"2026-09-18","changes":["新增连接模型与预设模型组联动，默认开启，可在设置关闭。","新增脚本更新页，可查看更新记录、检查并下载新版。","未知模型或不明确的分组保持原状；连接不变时保留手动选择。"]},{"version":"20260918.2","date":"2026-09-18","changes":["显示脚本版本；统一 Git 加载与本地测试副本。","修复分区同步重复提示、白天文字阴影和自定义字数。","移除底部关闭项，非全屏点击面板外关闭。"]}];
    let availableRelease = null;
    let updateMessage = '';
    let updateBusy = false;
    let updateCheckTimer = null;
    function isNewerRelease(version) {
        const [day, revision] = version.split('.').map(Number);
        const [currentDay, currentRevision] = SCRIPT_VERSION.split('.').map(Number);
        return day > currentDay || (day === currentDay && revision > currentRevision);
    }
    function syncUpdateBadge() {
        const badge = root.find('.fh-update-badge')[0];
        if (!badge) return;
        const newer = Boolean(availableRelease && isNewerRelease(availableRelease.version));
        badge.hidden = !newer;
        if (newer) {
            badge.textContent = '🍎';
            badge.title = `发现果实之心更新 v${availableRelease.version}`;
            badge.setAttribute('aria-label', `发现果实之心更新 v${availableRelease.version}`);
        }
    }
    function scheduleUpdateCheck() {
        clearTimeout(updateCheckTimer);
        updateCheckTimer = setTimeout(() => {
            updateCheckTimer = null;
            if (!destroyed) void checkScriptUpdate();
        }, 1200);
    }
    function renderUpdates() {
        const notes = availableRelease?.history || RELEASE_NOTES;
        main.html(`${titleBlock('脚本更新', `当前运行 v${SCRIPT_VERSION}`)}
          <div class="fh-card-actions"><button class="fh-btn" data-nav="settings">返回设置</button>
          <button class="fh-btn primary" data-action="check-update" ${updateBusy ? 'disabled' : ''}>检查更新</button>
          ${availableRelease && isNewerRelease(availableRelease.version) ? `<button class="fh-btn" data-action="download-update" ${updateBusy ? 'disabled' : ''}>下载 v${h(availableRelease.version)}</button>` : ''}</div>
          <p class="fh-pad" role="status">${h(updateMessage || '更新下载完成后，下次刷新生效。使用本地测试版时，需切回 Git 版才能运行下载的版本。')}</p>
          ${notes.map(note => `<section class="fh-card fh-mt"><div class="fh-card-head"><h3>v${h(note.version)}</h3><p>${h(note.date || '')}</p></div><ul>${note.changes.map(change => `<li>${h(change)}</li>`).join('')}</ul></section>`).join('')}`);
    }
    async function checkScriptUpdate(download = false) {
        if (updateBusy) return;
        updateBusy = true;
        updateMessage = download ? '正在下载更新…' : '正在检查更新…';
        if (currentView === 'updates') renderUpdates();
        try {
            const response = await fetch(RELEASE_BASE + 'release.json', { cache: 'no-store', signal: AbortSignal.timeout(15000) });
            if (!response.ok) throw new Error(`检查更新失败（${response.status}）`);
            const release = await response.json();
            if (!/^\d{8}\.\d+$/.test(release.version) || !/^[a-f0-9]{64}$/.test(release.sha256)) throw new Error('发布信息格式不正确');
            if (release.history !== undefined && (!Array.isArray(release.history) || !release.history.every(note => note && typeof note.version === 'string' && Array.isArray(note.changes) && note.changes.every(change => typeof change === 'string')))) throw new Error('更新记录格式不正确');
            availableRelease = release;
            if (!download) {
                updateMessage = isNewerRelease(release.version) ? `发现新版 v${release.version}，可下载后刷新。` : '当前已是最新版本。';
            } else {
                if (!isNewerRelease(release.version)) { updateMessage = '当前已是最新版本。'; return; }
                const responseCode = await fetch(RELEASE_BASE + `releases/${release.version}/fruit-heart.js`, { signal: AbortSignal.timeout(20000) });
                if (!responseCode.ok) throw new Error(`下载失败（${responseCode.status}）`);
                const code = await responseCode.text();
                const sha256 = hashScript(code);
                if (sha256 !== release.sha256) throw new Error('校验失败，未保存下载内容');
                localStorage.setItem('fruit-heart-released-script-v1', JSON.stringify({ version: release.version, sha256, code }));
                updateMessage = `v${release.version} 已下载。刷新页面后，Git 版将运行新版。`;
            }
        } catch (error) {
            updateMessage = `${error.message || '更新失败'}。当前脚本仍可继续使用。`;
        } finally {
            updateBusy = false;
            syncUpdateBadge();
            if (currentView === 'updates') renderUpdates();
        }
    }


    function renderSettings() {
        const preset = activePreset();
        const config = readConfig(preset);
        const names = Object.keys(config.profiles || {});
        const data = sectionData(preset);
        const hidden = new Set(config.hiddenSections || []);
        let plan; try { plan = sectionPlan(preset); } catch { plan = { total: 0, adds: [], moves: [], newHeads: [] }; }
        const homeList = homeOrder(config);
        main.html(`${titleBlock('设置', '本脚本功能和结构借鉴了 @电波系 的日月西预设脚本、@NUE 的脚本。')}
          <section class="fh-card"><div class="fh-card-head"><h3>模型联动</h3><p>跟随插头处的连接模型切换预设模型组。无法识别时保留当前选择；此设置保存在本浏览器。</p></div>
            <label class="fh-toggle"><span>跟随连接模型</span><button class="fh-sw ${modelLinkEnabled ? 'on' : ''}" data-action="toggle-model-link" role="switch" aria-label="跟随连接模型" aria-checked="${modelLinkEnabled}"></button></label></section>
          <section class="fh-card fh-mt"><div class="fh-card-head"><h3>脚本更新</h3><p>当前版本 v${h(SCRIPT_VERSION)}</p></div><div class="fh-card-actions"><button class="fh-btn" data-nav="updates">查看更新记录</button></div></section>
          <section class="fh-card"><div class="fh-card-head"><h3>面板显示</h3><p>全屏铺满当前网页可视区域。清理仅重置显示偏好、悬浮球位置和面板索引，不删除预设、聊天、方案或思维链设置。</p></div><div class="fh-card-actions"><button class="fh-btn" data-action="fullscreen">切换面板全屏</button><button class="fh-btn" data-action="clear-panel-cache">清理面板缓存</button></div></section>
          <section class="fh-card"><div class="fh-card-head"><h3>方案</h3><p>整套开关组合。存在预设里，分享预设时跟着走。</p></div>
            <div class="fh-pad">${names.length ? names.map(name => `<button class="fh-btn ${config.activeProfile === name ? 'on' : ''}" data-profile="${h(name)}">${h(name)}</button>`).join('') : '<span class="fh-dim">还没有保存过方案</span>'}</div>
            <div class="fh-card-actions"><button class="fh-btn primary" data-action="profile-save">保存当前为方案</button>
              <button class="fh-btn" data-action="profile-export" ${names.length ? '' : 'disabled'}>导出</button>
              <button class="fh-btn" data-action="profile-import">导入</button>
              <button class="fh-btn" data-action="profile-delete" ${names.length ? '' : 'disabled'}>删除当前方案</button></div></section>

          <section class="fh-card fh-mt"><div class="fh-card-head"><h3>思维链折叠设置</h3>
            <p>在下方写入思维链的结束标签，例如 <code>&lt;/thinking&gt;</code>，可自动把思考内容折叠进酒馆原生的自动解析。支持多个标签同时出现，也支持手动添加新标签。</p></div>
            <textarea id="fh-ecot-end-tags" rows="4" spellcheck="false">${h(ecotEndTags().join('\n'))}</textarea>
            <div class="fh-card-actions"><button class="fh-btn primary" data-action="ecot-save-tags">保存</button><button class="fh-btn" data-action="ecot-reset-tags">恢复默认</button>
              <button class="fh-btn" data-action="ecot-apply">重新配置酒馆解析</button><button class="fh-btn" data-action="ecot-scan">整理历史消息</button>
              <span class="fh-dim">${h(ecotStatus())}</span></div></section>

          <section class="fh-card fh-mt"><div class="fh-card-head"><h3>同步条目变化</h3>
            <p>你在酒馆里往区里加了新条目、或者把条目拖去了别的区，点一下这里，脚本就按前台顺序重新认一遍：每条归到它上面最近的那条区头。不改开关、不改正文。</p>
            <p class="fh-mt"><b>横线怎么分：</b><code>━━ 名字 ━━</code> 和 <code>——名字——</code> 都是<b>大区</b>，各自独立成一个分区；<code>--名字--</code>（两个半角连字符）是<b>小区</b>，只是区内的小标题，下面的条目仍算上一个大区的。</p></div>
            <div class="fh-pad">${plan.total ? `<span class="fh-dim">${plan.adds.length ? '新条目 ' + plan.adds.length + ' 条　' : ''}${plan.moves.length ? '挪了区 ' + plan.moves.length + ' 条　' : ''}${plan.newHeads.length ? '新区 ' + plan.newHeads.length + ' 个' : ''}</span>` : '<span class="fh-dim">都对得上，没有要同步的</span>'}</div>
            ${plan.total ? `<div class="fh-chips">${[...plan.adds, ...plan.moves].slice(0, 10).map(x => `<i class="fh-g">${h(syncLabel(x.name))} → ${h(plan.nameOf(x.to))}</i>`).join('')}${plan.total > 10 ? `<i class="fh-g">…等 ${plan.total} 处</i>` : ''}</div>` : ''}
            <div class="fh-card-actions"><button class="fh-btn primary" data-action="sections-sync" ${plan.total ? '' : 'disabled'}>同步进脚本</button></div></section>

          <section class="fh-card fh-mt"><div class="fh-card-head"><h3>首页栏目</h3>
            <p>按住 ⠿ 上下拖排顺序；右边的开关决定这一栏默认是展开还是收起。跟着方案存进预设。</p></div>
            <div class="fh-pad"><div class="fh-sortlist" data-home-sort>${homeList.map(id => {
              const item = HOME_CARDS.find(x => x[0] === id) || [id, id, false];
              const open = (config.homeOpen || {})[id] !== false;
              return `<div class="fh-sortrow" data-sort-id="${h(id)}"><i class="fh-grip">⠿</i><b>${h(item[1])}</b>
                ${item[2] ? `<button class="fh-sw ${open ? 'on' : ''}" data-home-open="${h(id)}" role="switch" aria-checked="${open}" aria-label="默认展开"></button>`
                  : '<span class="fh-dim">常驻</span>'}</div>`;
            }).join('')}</div></div></section>

          <section class="fh-card fh-mt"><div class="fh-card-head"><h3>条目页显示哪些区</h3><p>勾上的才会出现在「条目」里。不影响预设本身，只是少往下翻。</p></div>
            <div class="fh-chips">${data.groups.map(g => `<button class="fh-chip ${hidden.has(g.id) ? '' : 'on'}" data-section-show="${h(g.id)}">${h(g.name)}</button>`).join('')}</div>
            <div class="fh-card-actions"><button class="fh-btn" data-action="sections-all">全选</button><button class="fh-btn" data-action="sections-none">全不选</button></div></section>

          <section class="fh-card fh-mt"><div class="fh-card-head"><h3>外观与入口</h3></div>
            <div class="fh-row"><span class="fh-k">主题</span><span class="fh-seg">
              <button class="${theme === 'day' ? 'on' : ''}" data-theme-set="day">日间</button>
              <button class="${theme === 'night' ? 'on' : ''}" data-theme-set="night">夜间</button>
              <button class="${theme === 'system' ? 'on' : ''}" data-theme-set="system">跟随系统</button></span></div>
            <div class="fh-row"><span class="fh-k">皮肤</span><span class="fh-seg">
              ${SKINS.map(([id, label]) => `<button class="${skin === id ? 'on' : ''}" data-skin-set="${id}">${h(label)}</button>`).join('')}</span></div>
            <div class="fh-row"><span class="fh-k">字体</span><div class="fh-v">
              <button class="fh-sel on" data-pick-font aria-label="字体">${h(currentFont().label)}<i>▾</i></button></div></div>
            <label class="fh-toggle fh-mt"><span>快捷回复栏入口</span><button class="fh-sw ${entryBar ? 'on' : ''}" data-entry-toggle="bar" role="switch" aria-checked="${entryBar}"></button></label>
            <div class="fh-row"><span class="fh-k">悬浮猫大小</span><span class="fh-seg">${BALL_SIZES
              .map(([id, label]) => `<button class="${ballSize === id ? 'on' : ''}" data-ball-size="${id}">${label}</button>`).join('')}</span></div>
            <label class="fh-toggle"><span>🍎 悬浮球</span><button class="fh-sw ${entryBall ? 'on' : ''}" data-entry-toggle="ball" role="switch" aria-checked="${entryBall}"></button></label>
            <label class="fh-toggle"><span>楼层跳转｜尾巴与爪子<small>球上面是尾巴、下面是身子：点一下本层顶/底，再点一下上/下一层</small></span><button class="fh-sw ${jumpNav ? 'on' : ''}" data-entry-toggle="jump" role="switch" aria-checked="${jumpNav}"></button></label>
            <div class="fh-card-actions"><button class="fh-btn danger" data-action="kill-script">彻底关闭脚本</button></div></section>

          <section class="fh-card fh-mt danger"><div class="fh-card-head"><h3>脚本与预设重置</h3>
            <p>⚠️ 危险操作，本操作会初始化到脚本原始状态，请注意保存导出。</p></div>
            <div class="fh-card-actions"><button class="fh-btn" data-action="restore-params">恢复预设初始参数</button>
              <button class="fh-btn danger" data-action="reset-prompt-states">重置全部开关</button></div></section>`);
        bindHomeSort();
    }

    function render(view = currentView) {
        const changedView = view !== currentView;
        currentView = view;
        syncNav();
        if (view === 'overview') renderOverview();
        else if (view === 'qr') renderQr();
        else if (view === 'entries') renderEntries();
        else if (view === 'updates') renderUpdates();
        else if (view === 'settings') renderSettings();
        if (changedView) main.scrollTop(0);
        renderedFingerprint = presetFingerprint();
    }

    // 首页「合并大总结 / 隐藏楼层 / 取消隐藏」传的是大类名字，QR 页传的是 id。
    // 以前只按 id 找，首页三颗按钮一点就报「这个大类已经不在了」。两种都认。
    function findCard(set, key) {
        const cards = (set && set.cards) || [];
        return cards.find(item => item.id === key) || cards.find(item => item.label === key) || null;
    }
    // 她给标签加了前缀（「大总结——合并之前的大总结」→「【推荐用】大总结——合并之前的大总结」），
    // 首页那颗按钮里写死的名字就对不上了，/pass 一个不存在的标签会一路穿过所有 /if，
    // 最后 setinput 写进去一个空串 —— 表现就是「点了没反应」。这里先精确后包含地认一次。
    function resolveLabel(message, want) {
        if (!want) return '';
        const labels = qrLabels(message);
        if (labels.includes(want)) return want;
        return labels.find(x => x.includes(want)) || labels.find(x => want.includes(x)) || '';
    }
    async function runQr(cardId, choice = '') {
        const card = findCard(qrSet(readConfig()), cardId);
        if (!card) throw new Error('这个大类已经不在了');
        if (typeof triggerSlash !== 'function') throw new Error('Slash 指令 API 不可用');
        const label = resolveLabel(card.message, choice);
        if (choice && !label) throw new Error(`「${card.label}」里没有「${choice}」这条指令，可能是被改名或删掉了`);
        close();
        await triggerSlash(qrCommandFor(label, card.message));
    }
    async function saveQrName() {
        const name = String(root.find('[data-qr-setname]').val() || '').trim();
        return guarded(async () => {
            if (name) await writeQr(set => { set.name = name; });
            renderQr();
        });
    }
    async function setQuickGroup(group, id) {
        const preset = activePreset();
        const target = id ? promptMap(preset).get(id) : null;
        if (id && !target) throw new Error('没有找到该条目');
        await updateBoth(next => {
            const config = readConfig(next);
            captureManualChanges(next, config);
            for (const prompt of next.prompts || []) {
                const currentId = promptId(prompt);
                if (currentId === CONFIG_ID) continue;
                if (exclusiveFamily(prompt, config) !== group) continue;
                prompt.enabled = Boolean(id) && currentId === id;
            }
            captureManualChanges(next, config);
            rememberAppliedStates(next, config);
            writeConfig(next, config);
            return next;
        });
        toast('success', `${group}：${target ? stripSource(target.name) : '全部关闭'}`);
    }
    // quiet：来自首页那两颗总开关（小剧场 / NSFW）。它们本来就是「这个功能开不开」这一件事，
    // 位置固定、一眼看得见，每次点都要再确认一次纯属挡路。条目页里点具体条目时该问的还是照问。
    async function setPrompt(id, enabled, quiet = false) {
        const preset = activePreset();
        const before = promptMap(preset).get(id);
        if (!before) throw new Error('没有找到该条目');
        if (!quiet && coreWarning(before) && !hostWindow.confirm(`“${stripSource(before.name)}”是核心或特殊条目，确定要${enabled ? '开启' : '关闭'}吗？`)) return false;
        const family = enabled ? exclusiveFamily(before, readConfig(preset)) : '';
        await updateBoth(target => {
            const config = readConfig(target);
            captureManualChanges(target, config);
            for (const prompt of target.prompts || []) {
                const currentId = promptId(prompt);
                if (currentId === CONFIG_ID) continue;
                let next = prompt.enabled;
                if (currentId === id) next = enabled;
                else if (family && exclusiveFamily(prompt, config) === family) next = false;
                if (family === '抢话' && currentId === 'bd638843-dbcb-478f-a113-e48653809279') next = enabled && id === '87c8a41d-e219-4d35-acc2-dc6b5972cc6f';
                prompt.enabled = Boolean(next);
            }
            captureManualChanges(target, config);
            rememberAppliedStates(target, config);
            writeConfig(target, config);
            return target;
        });
        toast('success', `${stripSource(before.name)}：${enabled ? '已开启' : '已关闭'}`);
        return true;
    }
    async function saveWordCount() {
        const min = Number(root.find('#fh-word-min').val());
        const max = Number(root.find('#fh-word-max').val());
        if (!Number.isFinite(min) || !Number.isFinite(max) || min < 100 || max < min) throw new Error('字数范围不正确');
        await updateBoth(preset => {
            const config = readConfig(preset);
            const prompt = wordCountPrompt(preset, config);
            if (!prompt) throw new Error('当前模型组没有可修改的正文字数条目');
            prompt.content = prompt.content.replace(WORD_RANGE, match => match.replace(/\d+/, String(min)).replace(/([\-–—~～至到]+\s*)\d+/, (_, separator) => separator + max));
            return preset;
        });
        toast('success', `正文字数已改为 ${min}-${max} 字`);
    }
    async function applyWordRange(min, max) {
        if (!Number.isFinite(min) || !Number.isFinite(max) || min < 100 || max < min) throw new Error('字数范围不正确');
        await updateBoth(preset => {
            const config = readConfig(preset);
            const prompt = wordCountPrompt(preset, config);
            if (!prompt) throw new Error('当前模型组没有可修改的正文字数条目');
            prompt.content = prompt.content.replace(WORD_RANGE, match => match.replace(/\d+/, String(min)).replace(/([\-–—~～至到]+\s*)\d+/, (_, separator) => separator + max));
            return preset;
        });
        toast('success', `正文字数已改为 ${min}-${max} 字`);
    }
    async function toggleMaster(key) {
        if (key === 'stream') {
            const next = !(activePreset().settings || {}).should_stream;
            await updateBoth(preset => { preset.settings.should_stream = next; return preset; });
            return toast('success', next ? '已开启流式传输' : '已关闭流式传输');
        }
        const preset = activePreset();
        const target = key === 'nsfw' ? nsfwMaster(preset) : theatreMaster(preset);
        if (!target) throw new Error('没找到对应的总开关条目');
        await setPrompt(promptId(target), !target.enabled, true);
    }
    // 「初始参数」＝具名预设文件里存着的那一份，不需要额外记快照。
    async function restoreParams() {
        const name = ensureTarget();
        const saved = typeof getPreset === 'function' ? getPreset(name) : null;
        if (!saved?.settings) throw new Error('读不到这份预设保存的参数');
        if (!hostWindow.confirm('把温度、上下文等生成参数恢复成预设文件里保存的那一份？')) return;
        await updateBoth(preset => { Object.assign(preset.settings, structuredClone(saved.settings)); return preset; });
        toast('success', '生成参数已恢复');
    }
    function currentStates(preset, config) {
        return Object.fromEntries(activePrompts(preset, config).map(prompt => [promptId(prompt), Boolean(prompt.enabled)]));
    }
    async function saveProfile(name) {
        if (!name) return;
        await updateBoth(preset => {
            const config = readConfig(preset);
            config.profiles = config.profiles || {};
            config.profiles[name] = currentStates(preset, config);
            config.activeProfile = name;
            writeConfig(preset, config);
            return preset;
        });
        toast('success', `已保存方案「${name}」`);
    }
    async function applyProfile(name) {
        const states = readConfig().profiles?.[name];
        if (!states) throw new Error('方案不存在');
        await updateBoth(preset => {
            const config = readConfig(preset);
            for (const prompt of activePrompts(preset, config)) {
                const id = promptId(prompt);
                if (id in states) prompt.enabled = Boolean(states[id]);
            }
            config.activeProfile = name;
            captureManualChanges(preset, config);
            rememberAppliedStates(preset, config);
            writeConfig(preset, config);
            return preset;
        });
        toast('success', `已套用方案「${name}」`);
    }
    async function deleteProfile() {
        const config = readConfig();
        const name = config.activeProfile;
        if (!name || !config.profiles?.[name]) throw new Error('当前没有选中的方案');
        if (!hostWindow.confirm(`删除方案「${name}」？开关状态不变。`)) return;
        await updateBoth(preset => {
            const current = readConfig(preset);
            delete current.profiles[name];
            current.activeProfile = '';
            writeConfig(preset, current);
            return preset;
        });
        toast('success', '方案已删除');
    }
    async function importProfile(raw) {
        let parsed;
        try { parsed = JSON.parse(raw); } catch { throw new Error('这段文本不是有效的方案'); }
        const name = String(parsed.fruitHeartProfile || '').trim();
        if (!name || !parsed.states || typeof parsed.states !== 'object') throw new Error('这段文本不是果实之心的方案');
        await updateBoth(preset => {
            const config = readConfig(preset);
            config.profiles = config.profiles || {};
            config.profiles[name] = parsed.states;
            writeConfig(preset, config);
            return preset;
        });
        toast('success', `已导入方案「${name}」`);
    }

    root.on('click', '[data-nav]', function () {
        render(this.dataset.nav);
    });
    root.on('click', '[data-action]', function (event) {
        if (this.matches('input')) return;
        event.preventDefault();
        const action = this.dataset.action;
        if (action === 'toggle-model-link') {
            modelLinkEnabled = !modelLinkEnabled;
            try { hostWindow.localStorage.setItem(modelLinkKey, String(modelLinkEnabled)); } catch {}
            modelLinkSignature = ''; pendingModelSignature = '';
            renderSettings();
            return;
        }
        if (action === 'open-updates') { open(); render('updates'); return; }
        if (action === 'check-update') return checkScriptUpdate();
        if (action === 'download-update') return checkScriptUpdate(true);
        if (action === 'close') return close();
        if (action === 'fullscreen') {
            const full = !root.hasClass('fh-is-fullscreen');
            root.toggleClass('fh-is-fullscreen', full);
            root.find('.fh-fullscreen').attr('aria-pressed', String(full)).attr('aria-label', full ? '退出面板全屏' : '面板全屏');
            syncViewport(); return;
        }
        if (action === 'clear-panel-cache') {
            if (!hostWindow.confirm('清理果实之心的显示偏好和悬浮球位置？不会删除预设、聊天、方案或思维链设置。')) return;
            try {
                for (const key of [themeKey, skinKey, fontKey, ballSizeKey, 'fruit-heart-ball-pos']) hostWindow.localStorage.removeItem(key);
            } catch (error) { toast('error', '浏览器未允许清理本地显示缓存'); return; }
            familyCache.clear(); renderedFingerprint = '';
            theme = 'system'; skin = 'paper'; font = 'skin'; ballSize = 'm';
            applyTheme(); bindEntry(); renderSettings(); syncViewport();
            toast('success', '面板缓存已清理，预设和聊天未改动'); return;
        }
        if (action === 'theme') { theme = resolvedTheme() === 'night' ? 'day' : 'night'; hostWindow.localStorage.setItem(themeKey, theme); applyTheme(); return; }
        if (action === 'toggle-nsfw') { nsfwOpen = !nsfwOpen; return renderOverview(); }
        if (action === 'toggle-theatre') { theatreOpen = !theatreOpen; return renderOverview(); }
        if (action === 'word-custom') {
            const now = wordRange();
            const input = hostWindow.prompt('正文字数范围（例如 2200-2500）', `${now[0]}-${now[1]}`);
            if (!input) return;
            const parts = String(input).match(/(\d+)\D+(\d+)/) || String(input).match(/(\d+)/);
            if (!parts) return toast('error', '没看懂这个范围');
            const min = Number(parts[1]), max = Number(parts[2] || parts[1]);
            return guarded(async () => { await applyWordRange(min, max); renderOverview(); });
        }
        if (action === 'restore-params') return guarded(async () => { await restoreParams(); renderSettings(); });
        if (action === 'sections-sort') { sortSections = !sortSections; return renderEntries(); }
        if (action === 'qr-edit') { qrEdit = !qrEdit; qrTag = null; qrCardEdit = ''; if (!qrEdit) return saveQrName(); return renderQr(); }
        if (action === 'qr-tag-cancel') { qrTag = null; return renderQr(); }
        if (action === 'qr-card-cancel') { qrCardEdit = ''; return renderQr(); }
        if (action === 'qr-tag-save' || action === 'qr-tag-delete') {
            const state = qrTag;
            if (!state) return;
            const remove = action === 'qr-tag-delete';
            const label = String(root.find('[data-qr-name]').val() || '').trim();
            const text = String(root.find('[data-qr-text]').val() || '').trim();
            const hint = String(root.find('[data-qr-hint]').val() || '').trim();
            if (remove && !hostWindow.confirm(`删掉「${state.label || label}」？`)) return;
            if (!remove && !label) return toast('error', '先给它起个标签名');
            if (!remove && !text) return toast('error', '还没写要做什么');
            return guarded(async () => {
                await writeQr(set => {
                    const card = set.cards.find(x => x.id === state.card);
                    if (!card) throw new Error('这个大类已经不在了');
                    if (!qrLabels(card.message).length) { card.message = text; return; }   // 无二级菜单的整条指令
                    if (remove) { card.message = dropBranch(card.message, state.label); return; }
                    const body = state.kind === 'raw' ? `\n${text}\n` : makeBody(text, hint);
                    if (!state.exists) { card.message = addBranch(card.message, label, body); return; }
                    let next = saveBranch(card.message, state.label, body);
                    if (label !== state.label) next = renameBranch(next, state.label, label);
                    card.message = next;
                });
                qrTag = null;
                toast('success', remove ? '已删掉' : `「${label}」已保存`);
                renderQr();
            });
        }
        if (action === 'qr-card-save' || action === 'qr-card-delete') {
            const id = qrCardEdit;
            const remove = action === 'qr-card-delete';
            const label = String(root.find('[data-card-label]').val() || '').trim();
            const title = String(root.find('[data-card-title]').val() || '').trim();
            const descBox = root.find('[data-card-desc]')[0];
            const desc = descBox ? String(descBox.value || '').trim() : null;
            if (remove && !hostWindow.confirm('整个大类连同里面的标签一起删掉？')) return;
            if (!remove && !label) return toast('error', '大类得有个名字');
            return guarded(async () => {
                await writeQr(set => {
                    if (remove) { set.cards = set.cards.filter(x => x.id !== id); return; }
                    const card = set.cards.find(x => x.id === id);
                    if (!card) return;
                    card.label = label; card.title = title;
                    if (desc !== null) card.message = writeDesc(card.message, desc);
                });
                qrCardEdit = '';
                toast('success', remove ? '已删掉' : '已保存');
                renderQr();
            });
        }
        if (action === 'qr-card-new') {
            const label = String(hostWindow.prompt('新大类叫什么？', '我的指令') || '').trim();
            if (!label) return;
            return guarded(async () => {
                await writeQr(set => {
                    if (set.cards.some(x => x.label === label)) throw new Error('已经有同名大类了');
                    set.cards.push({ id: 'qr-new-' + Date.now().toString(36), label, title: '', message: NEW_CARD_BODY(label) });
                });
                renderQr();
            });
        }
        if (action === 'qr-reset') {
            if (!hostWindow.confirm('恢复出厂的 QR 集？你改过的、加过的全没了。')) return;
            return guarded(async () => { await writeQr(() => qrSeed()); toast('success', '已恢复出厂'); renderQr(); });
        }
        if (action === 'qr-export') {
            const set = qrSet(readConfig());
            const stamp = new Date();
            const day = `${stamp.getFullYear()}${String(stamp.getMonth() + 1).padStart(2, '0')}${String(stamp.getDate()).padStart(2, '0')}`;
            const shipped = { ...set, name: `${set.name}-${day}-BY果实之心` };
            const text = JSON.stringify(qrExport(shipped), null, 2);
            const link = doc.createElement('a');
            link.href = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
            link.download = `${shipped.name.replace(/[\\/:*?"<>|]/g, '')}.json`;
            doc.body.appendChild(link); link.click(); link.remove();
            setTimeout(() => URL.revokeObjectURL(link.href), 2000);
            return toast('success', '导出好了，酒馆的快速回复里直接导入这个文件就能用');
        }
        if (action === 'qr-import') {
            const picker = doc.createElement('input');
            picker.type = 'file'; picker.accept = '.json,application/json';
            picker.onchange = () => {
                const file = picker.files && picker.files[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = () => guarded(async () => {
                    const next = qrImport(String(reader.result));
                    if (!hostWindow.confirm(`导入「${next.name}」，${next.cards.length} 个大类？现在这套会被整个换掉。`)) return;
                    await writeQr(() => next);
                    qrTag = null; qrCardEdit = '';
                    toast('success', `已导入 ${next.cards.length} 个大类`);
                    renderQr();
                });
                reader.readAsText(file);
            };
            picker.click();
            return;
        }
        if (action === 'sections-sync') {
            return guarded(async () => {
                let summary = '';
                await updateBoth(preset => {
                    const plan = applySectionPlan(preset);
                    summary = [plan.adds.length ? `新条目 ${plan.adds.length} 条` : '', plan.moves.length ? `挪区 ${plan.moves.length} 条` : '', plan.newHeads.length ? `新区 ${plan.newHeads.length} 个` : ''].filter(Boolean).join('，');
                    return preset;
                });
                toast('success', summary ? '已同步：' + summary : '没有要同步的');
                renderSettings();
            });
        }
        if (action === 'sections-all' || action === 'sections-none') {
            const all = action === 'sections-all';
            return guarded(async () => {
                await updateBoth(preset => {
                    const config = readConfig(preset);
                    config.hiddenSections = all ? [] : sectionData(preset).groups.map(g => g.id);
                    writeConfig(preset, config); return preset;
                });
                renderSettings();
            });
        }
        if (action === 'kill-script') {
            if (!hostWindow.confirm('彻底关闭果实之心？\n\n面板入口会全部消失。要恢复的话，需要到酒馆助手里把「🍎 果实之心-主面板」这个脚本重新启用一次。')) return;
            try { hostWindow.localStorage.setItem('fruit-heart-disabled', 'true'); } catch {}
            toast('info', '果实之心已关闭');
            return destroy();
        }
        if (action === 'profile-save') {
            const name = hostWindow.prompt('方案名称', readConfig().activeProfile || '我的组合');
            if (!name) return;
            return guarded(async () => { await saveProfile(name.trim()); renderSettings(); });
        }
        if (action === 'profile-delete') return guarded(async () => { await deleteProfile(); renderSettings(); });
        if (action === 'profile-export') {
            const config = readConfig();
            const name = config.activeProfile;
            if (!name || !config.profiles?.[name]) return toast('error', '先保存一个方案');
            hostWindow.prompt('复制这段文本发给别人', JSON.stringify({ fruitHeartProfile: name, states: config.profiles[name] }));
            return;
        }
        if (action === 'profile-import') {
            const raw = hostWindow.prompt('粘贴方案文本');
            if (!raw) return;
            return guarded(async () => { await importProfile(raw); renderSettings(); });
        }
        if (action === 'save-word-count') return guarded(async () => { await saveWordCount(); renderSettings(); });
        if (action === 'reset-prompt-states') {
            if (!hostWindow.confirm('确定把全部条目开关恢复到初始状态吗？')) return;
            return guarded(async () => { await resetPromptStates(); render('settings'); });
        }
        if (action === 'ecot-apply') return guarded(async () => { const api = hostWindow.FruitHeartECoT || window.FruitHeartECoT; if (!api) throw new Error('ECoT 模块未就绪'); await api.applyFormatter(); toast('success', 'ECoT 已配置'); renderSettings(); });
        if (action === 'ecot-scan') return guarded(async () => { const api = hostWindow.FruitHeartECoT || window.FruitHeartECoT; if (!api) throw new Error('ECoT 模块未就绪'); await api.rescan(); toast('success', '历史消息扫描完成'); });
        if (action === 'ecot-save-tags') return guarded(async () => { const api = hostWindow.FruitHeartECoT || window.FruitHeartECoT; if (!api) throw new Error('ECoT 模块未就绪'); api.setEndTags(root.find('#fh-ecot-end-tags').val()); toast('success', '结束标签已保存'); renderSettings(); });
        if (action === 'ecot-reset-tags') return guarded(async () => { const api = hostWindow.FruitHeartECoT || window.FruitHeartECoT; if (!api) throw new Error('ECoT 模块未就绪'); api.resetEndTags(); toast('success', '已恢复默认结束标签'); renderSettings(); });
    });
    root.on('click', '[data-model-tag]', function () { const tag = this.dataset.modelTag; guarded(async () => { await applyTag(tag); render(currentView); }); });
    root.on('click', '[data-tag-family]', function () { selectedTagFamily = this.dataset.tagFamily; render(currentView); });
    root.on('click', '[data-qr]', function () {
        const cardId = this.dataset.qr, label = this.dataset.qrLabel || '';
        if (!qrEdit) return guarded(() => runQr(cardId, label));
        // 编辑模式下点标签＝改它。认得出「写进输入框」那种写法就给友好表单，认不出就直接改原始指令。
        const card = findCard(qrSet(readConfig()), cardId);
        if (!card) return toast('error', '这个大类已经不在了');
        if (!label) { qrTag = { card: cardId, label: '', text: card.message, hint: '', kind: 'raw', exists: true }; return renderQr(); }
        const body = branchBody(card.message, label);
        const friendly = friendlyText(body);
        qrTag = friendly === null
            ? { card: cardId, label, text: body.trim(), hint: '', kind: 'raw', exists: true, raw: card.message }
            : { card: cardId, label, text: friendly, hint: askHint(body), kind: 'request', exists: true, raw: card.message };
        renderQr();
    });
    root.on('click', '[data-goto-section]', function () {
        const id = this.dataset.gotoSection;
        if (id) { forceSection = id; openSections.add(id); entryQuery = ''; entriesOnOnly = false; }
        render('entries');
    });
    // 这一栏只有正文里写了 {{输入}} 才有用（点标签时先弹个框问你一句）。
    // 之前不管写没写都摆在那儿，填了也不生效 —— 她的原话是「这一行没用」。
    root.on('input', '[data-qr-text]', function () {
        const box = root.find('[data-qr-hint]')[0];
        if (box) box.hidden = !ASK_MARK.test(this.value || '');
    });
    root.on('click', '[data-qr-add]', function () {
        const card = findCard(qrSet(readConfig()), this.dataset.qrAdd);
        qrTag = { card: this.dataset.qrAdd, label: '', text: '', hint: '', kind: 'request', exists: false, raw: card ? card.message : '' };
        renderQr();
    });
    root.on('click', '[data-card-edit]', function () {
        qrCardEdit = qrCardEdit === this.dataset.cardEdit ? '' : this.dataset.cardEdit;
        renderQr();
    });
    root.on('click', '[data-section]', function () {
        const id = this.dataset.section;
        if (openSections.has(id)) openSections.delete(id); else openSections.add(id);
        renderEntries();
    });
    root.on('click', '[data-master]', function () {
        const key = this.dataset.master;
        guarded(async () => { await toggleMaster(key); renderOverview(); });
    });
    root.on('click', '[data-theatre-random]', function () {
        const want = Number(this.dataset.theatreRandom) || 0;
        guarded(async () => {
            await updateBoth(preset => { const config = readConfig(preset); config.theatreRandom = want; writeConfig(preset, config); return preset; });
            if (want) await rollTheatre();     // 选完立刻抽一次，不用等下回合才看到效果
            renderOverview();
            toast('success', want ? `小剧场：每回合随机 ${want} 个` : '小剧场：不随机');
        });
    });
    root.on('click', '[data-chip]', function () {
        const id = this.dataset.chip;
        guarded(async () => { await setPrompt(id, !this.classList.contains('on')); renderOverview(); });
    });
    root.on('change', '[data-model-select]', function () { const tag = this.value; guarded(async () => { await applyTag(tag); render(currentView); }); });
    root.on('click', '[data-profile]', function () { const name = this.dataset.profile; guarded(async () => { await applyProfile(name); renderSettings(); }); });
    root.on('click', '[data-pick-font]', function () {
        openPicker('字体', FONTS.map(item => ({ label: item.label, note: item.note, value: item.id, on: item.id === font })), id => {
            font = id;
            try { hostWindow.localStorage.setItem(fontKey, font); } catch { /* 无痕模式会抛，忽略 */ }
            applyFont(); renderSettings();
        });
    });
    root.on('click', '[data-ball-size]', function () {
        ballSize = this.dataset.ballSize;
        try { hostWindow.localStorage.setItem(ballSizeKey, ballSize); } catch { /* 无痕模式会抛 */ }
        applyBallSize();
        renderSettings();
    });
    root.on('click', '[data-skin-set]', function () {
        skin = this.dataset.skinSet;
        try { hostWindow.localStorage.setItem(skinKey, skin); } catch {}
        applyTheme(); renderSettings();
    });
    root.on('click', '[data-theme-set]', function () { theme = this.dataset.themeSet; hostWindow.localStorage.setItem(themeKey, theme); applyTheme(); renderSettings(); });
    root.on('click', '[data-entry-toggle]', function () {
        const which = this.dataset.entryToggle;
        if (which === 'bar') { entryBar = !entryBar; hostWindow.localStorage.setItem('fruit-heart-entry-bar', String(entryBar)); }
        else if (which === 'jump') { jumpNav = !jumpNav; hostWindow.localStorage.setItem('fruit-heart-jump-nav', String(jumpNav)); }
        else { entryBall = !entryBall; hostWindow.localStorage.setItem('fruit-heart-entry-ball', String(entryBall)); }
        if (!entryBar && !entryBall && !jumpNav) toast('info', '两个入口都关了，会保留 🍎 浮球兜底');
        bindEntry(); renderSettings();
    });
    root.on('click', '[data-section-show]', function () {
        const id = this.dataset.sectionShow;
        guarded(async () => {
            await updateBoth(preset => {
                const config = readConfig(preset);
                const set = new Set(config.hiddenSections || []);
                if (set.has(id)) set.delete(id); else set.add(id);
                config.hiddenSections = [...set];
                writeConfig(preset, config); return preset;
            });
            renderSettings();
        });
    });
    root.on('click', '[data-word-range]', function () { const [min, max] = this.dataset.wordRange.split(':').map(Number); guarded(async () => { await applyWordRange(min, max); renderOverview(); }); });
    root.on('click', '[data-home-open]', function (event) {
        event.stopPropagation();
        const id = this.dataset.homeOpen;
        guarded(async () => {
            await updateBoth(preset => {
                const config = readConfig(preset);
                config.homeOpen = { ...(config.homeOpen || {}) };
                config.homeOpen[id] = config.homeOpen[id] === false;
                writeConfig(preset, config); return preset;
            });
            delete folded[id];
            renderSettings();
        });
    });
    root.on('click', '[data-fold]', function (event) {
        if (event.target.closest('.fh-sw,.fh-more,[data-goto-section]')) return;
        const id = this.dataset.fold;
        folded[id] = !homeFolded(readConfig(), id);
        renderOverview();
    });
    root.on('click', '[data-pick-group]', function () {
        const group = this.dataset.pickGroup, prefix = this.dataset.prefix || '';
        const config = readConfig();
        const items = activePrompts(activePreset(), config).filter(prompt => exclusiveFamily(prompt, config) === group);
        const list = [{ value: '', label: '全部关闭', on: !items.some(prompt => prompt.enabled) }]
            .concat(items.map(prompt => ({ value: promptId(prompt), label: plainName(prompt.name),
                note: hintText(prompt.name), on: Boolean(prompt.enabled) })));
        openPicker(prefix ? prefix.replace(/[：:]\s*$/, '') : group, list,
            value => guarded(async () => { await setQuickGroup(group, value); render(); }));
    });
    root.on('click', '[data-pick-model]', function () {
        const config = readConfig(), models = modelChoices(), now = currentModel(config, models);
        openPicker('模型', models.map(item => ({ value: item.tag, label: item.label, on: Boolean(now && item.tag === now.tag) })),
            tag => guarded(async () => { await applyTag(tag); render(); }));
    });
    root.on('change', '[data-prompt-id]', function () { const element = this; guarded(async () => { const changed = await setPrompt(element.dataset.promptId, element.checked); if (!changed) element.checked = !element.checked; renderEntries(); }); });
    root.on('change', '[data-action="ecot-toggle"]', function () { const api = hostWindow.FruitHeartECoT || window.FruitHeartECoT; if (!api) return toast('error', 'ECoT 模块未就绪'); api.setEnabled(this.checked); if (this.checked) guarded(() => api.applyFormatter()); renderSettings(); });
    root.on('change', '[data-action="entries-on-only"]', function () { entriesOnOnly = this.checked; renderEntries(); });
    function filterSearch(element) {
        clearTimeout(searchTimer);
        const caret = element.selectionStart;
        entryQuery = element.value; renderEntries();
        const input = root.find('[data-entry-search]')[0];
        input.focus(); input.setSelectionRange(caret, caret);
    }
    root.on('input', '[data-entry-search]', function (event) {
        clearTimeout(searchTimer);
        if (event.originalEvent?.isComposing) return;
        const element = this;
        searchTimer = setTimeout(() => { if (element.isConnected) filterSearch(element); }, 180);
    });
    root.on('compositionend', '[data-entry-search]', function () { filterSearch(this); });
    root.on('keydown', '[data-entry-search]', function (event) { if (event.key === 'Enter' && !event.originalEvent?.isComposing) filterSearch(this); });
    root.on('click', '.fh-shell', event => event.stopPropagation());
    root.on('click', event => { if (!root.hasClass('fh-is-fullscreen') && event.target === root[0]) close(); });

    let returnFocus = null;
    function close() { clearInterval(syncTimer); syncTimer = null; closePicker(); if (root[0].contains(doc.activeElement)) doc.activeElement.blur(); root.removeClass('open'); if (returnFocus?.isConnected && !returnFocus.matches('input,textarea,[contenteditable]')) returnFocus.focus({ preventScroll:true }); }
    // 指纹只取 id / 名称 / 开关 —— 不含正文。原来每 0.7 秒序列化 0.4 MB，手机会发热。
    function presetFingerprint() {
        const preset = activePreset();
        let hash = 0;
        const feed = text => { for (let i = 0; i < text.length; i++) hash = (hash * 31 + text.charCodeAt(i)) | 0; };
        feed(loadedName()); feed(detectModelText() || ''); feed(String(ecotStatus()));
        for (const prompt of preset.prompts) { feed(promptId(prompt)); feed(prompt.name || ''); feed(prompt.enabled ? '1' : '0'); }
        feed(JSON.stringify(preset.settings || {}));
        return String(hash);
    }
    function refreshFromPreset() {
        if (!entryBar) sweepBarEntry();   // 酒馆换聊天会重建 QR 栏，藏过的按钮会再冒出来
        if (!root.hasClass('open') || busy || doc.hidden || sheetOpen) return;
        if (root[0].contains(doc.activeElement) && doc.activeElement.matches('input,select,textarea')) return;
        try {
            if (presetFingerprint() === renderedFingerprint) return;
            const scroll = main.scrollTop();
            render(currentView);
            main.scrollTop(scroll);
        } catch (error) {
            close(); toast('info', '当前预设已改变，请重新打开控制台');
        }
    }
    function open() {
        if (!root.hasClass('open')) returnFocus = doc.activeElement;
        if (doc.activeElement?.matches('input,textarea,[contenteditable]')) doc.activeElement.blur();
        syncViewport(); render('overview'); main.scrollTop(0); applyTheme(); root.addClass('open'); root.find('.fh-close')[0].focus({ preventScroll:true });
        clearInterval(syncTimer); syncTimer = setInterval(refreshFromPreset, 2000);
        // 补新增的 QR 按钮。放在开面板时做，一辈子就写一次；失败也只是这次没补上，不挡开面板。
        upgradeQr().then(() => { if (root.hasClass('open') && currentView === 'qr') renderQr(); })
            .catch(error => console.error('[果实之心] QR 升级', error));
    }
    jq(doc).on(`keydown${KEY_EVENT_NS}`, event => {
        if (!root.hasClass('open')) return;
        if (event.key === 'Escape') { event.stopPropagation(); if (sheetOpen) return closePicker(); close(); }
        if (event.key !== 'Tab') return;
        const items = root.find('button:visible:not(:disabled),input:visible:not(:disabled),select:visible:not(:disabled)').toArray();
        const first = items[0], last = items.at(-1);
        if (event.shiftKey && doc.activeElement === first) { event.preventDefault(); last?.focus({ preventScroll:true }); }
        else if (!event.shiftKey && doc.activeElement === last) { event.preventDefault(); first?.focus({ preventScroll:true }); }
    });
    function resolveFunction(name) {
        const sources = [window, hostWindow, window.TavernHelper, hostWindow.TavernHelper, window.TavernHelper?.scriptButtons, hostWindow.TavernHelper?.scriptButtons].filter(Boolean);
        for (const source of sources) if (typeof source[name] === 'function') return source[name].bind(source);
        return null;
    }
    const BALL_POS = 'fruit-heart-ball-pos';
    function ballPosition() {
        try { const saved = JSON.parse(hostWindow.localStorage.getItem(BALL_POS) || 'null'); if (saved && Number.isFinite(saved.x) && Number.isFinite(saved.y)) return saved; } catch {}
        return null;
    }
    function placeBall(node, x, y) {
        const w = node.offsetWidth || 44;
        const hgt = node.offsetHeight || w;
        const maxX = Math.max(0, hostWindow.innerWidth - w - 4);
        const maxY = Math.max(0, hostWindow.innerHeight - hgt - 4);
        node.style.left = Math.min(Math.max(4, x), maxX) + 'px';
        node.style.top = Math.min(Math.max(4, y), maxY) + 'px';
        node.style.right = 'auto'; node.style.bottom = 'auto';
    }
    // 楼层跳转。#chat 是酒馆的滚动容器，.mes 是一层。
    // 逻辑：▲ 先回到「当前这层」的顶部；已经在顶部了就再上一层。▼ 同理往下。
    function chatScroller() {
        const chat = doc.querySelector('#chat');
        if (chat && chat.scrollHeight > chat.clientHeight + 4) return chat;
        return chat || doc.scrollingElement || doc.documentElement;
    }
    function floorRows(box) {
        // 根滚动元素的 rect.top 本身就等于 -scrollTop，跟普通容器不是一套算法，分开处理
        const isRoot = box === doc.scrollingElement || box === doc.documentElement || box === doc.body;
        const base = isRoot ? -box.scrollTop : (box.getBoundingClientRect().top - box.scrollTop);
        const out = [];
        for (const m of box.querySelectorAll('.mes')) {
            const r = m.getBoundingClientRect();
            if (r.height < 1) continue;          // 隐藏楼层不算
            out.push({ top: r.top - base, bottom: r.bottom - base });
        }
        return out;
    }
    function jumpFloor(dir) {
        const box = chatScroller();
        if (!box) return;
        const rows = floorRows(box);
        const limit = Math.max(0, box.scrollHeight - box.clientHeight);
        if (!rows.length) { box.scrollTo({ top: dir < 0 ? 0 : limit, behavior: 'smooth' }); return; }
        const EPS = 6;
        let target;
        if (dir < 0) {
            let i = 0;
            for (let k = 0; k < rows.length; k++) if (rows[k].top <= box.scrollTop + EPS) i = k;
            if (Math.abs(rows[i].top - box.scrollTop) <= EPS) i = Math.max(0, i - 1);
            target = rows[i].top;
        } else {
            const edge = box.scrollTop + box.clientHeight;
            let i = rows.length - 1;
            for (let k = rows.length - 1; k >= 0; k--) if (rows[k].bottom >= edge - EPS) i = k;
            if (Math.abs(rows[i].bottom - edge) <= EPS) i = Math.min(rows.length - 1, i + 1);
            target = rows[i].bottom - box.clientHeight;
        }
        box.scrollTo({ top: Math.max(0, Math.min(target, limit)), behavior: 'smooth' });
    }
    function showBall() {
        if (ballDock) return;
        ballDock = jq(`<div id="${APP_ID}-dock" data-fh-instance="${INSTANCE_ID}" class="${jumpNav ? 'has-jump' : ''}" style="--dock:${ballScale()}">`
            + `<button type="button" class="fh-jump up" title="回到本层顶部｜再点一下上一层" aria-label="本层顶部">${TAIL_ICON}</button>`
            + `<button type="button" id="${APP_ID}-fallback" title="果实之心｜按住可以拖" aria-label="果实之心">${BALL_ICON}</button>`
            + `<button type="button" class="fh-jump down" title="回到本层底部｜再点一下下一层" aria-label="本层底部">${BODY_ICON}</button>`
            + `</div>`).appendTo(doc.body);
        const node = ballDock[0];
        fallbackButton = jq(node.querySelector(`#${APP_ID}-fallback`));
        const saved = ballPosition();
        if (saved) placeBall(node, saved.x, saved.y);
        // 按住拖：移动超过 4px 就算拖，不算点击；松手记住位置
        let drag = null;
        // dock 一旦 setPointerCapture，之后的 pointerup 和 click 都会被重定向到 dock 本身，
        // click 的 event.target 不再是被按下的那个按钮（实测：pointerdown=path，click=dock）。
        // 所以在 pointerdown 这一刻 —— target 还是对的 —— 先把按的是哪个按钮记下来。
        let hitButton = null;
        node.addEventListener('pointerdown', event => {
            if (event.button) return;
            hitButton = event.target.closest && (event.target.closest('.fh-jump')
                || event.target.closest(`#${APP_ID}-fallback`));
            const box = node.getBoundingClientRect();
            drag = { dx: event.clientX - box.left, dy: event.clientY - box.top, moved: false };
            node.setPointerCapture(event.pointerId);
        });
        node.addEventListener('pointermove', event => {
            if (!drag) return;
            if (!drag.moved && Math.abs(event.movementX) + Math.abs(event.movementY) < 1) return;
            drag.moved = true;
            node.classList.add('dragging');
            placeBall(node, event.clientX - drag.dx, event.clientY - drag.dy);
        });
        let dragged = false;
        node.addEventListener('pointerup', event => {
            if (!drag) return;
            dragged = drag.moved; drag = null;
            node.classList.remove('dragging');
            try { node.releasePointerCapture(event.pointerId); } catch {}
            if (!dragged) return;
            const box = node.getBoundingClientRect();
            try { hostWindow.localStorage.setItem(BALL_POS, JSON.stringify({ x: box.left, y: box.top })); } catch {}
        });
        node.addEventListener('pointercancel', () => { drag = null; dragged = true; hitButton = null; node.classList.remove('dragging'); });
        // 开面板走 click：拖完那一下的 click 要吃掉，不然一松手面板就弹出来
        node.addEventListener('click', event => {
            // 优先用 pointerdown 记下的那个；键盘回车没有指针事件，退回按 target 找
            const target = hitButton || (event.target.closest && (event.target.closest('.fh-jump')
                || event.target.closest(`#${APP_ID}-fallback`)));
            hitButton = null;
            if (dragged) { dragged = false; event.preventDefault(); event.stopPropagation(); return; }
            if (!target) return;
            if (target.classList.contains('fh-jump')) {
                event.preventDefault();
                jumpFloor(target.classList.contains('up') ? -1 : 1);
                return;
            }
            open();
        });
        jq(hostWindow).off(`resize${BALL_EVENT_NS}`).on(`resize${BALL_EVENT_NS}`, () => {
            if (!ballDock) return;
            const box = ballDock[0].getBoundingClientRect();
            placeBall(ballDock[0], box.left, box.top);
        });
    }
    function hideBall() {
        if (ballDock) { ballDock.remove(); ballDock = null; fallbackButton = null; }
        jq(hostWindow).off(`resize${BALL_EVENT_NS}`);
        doc.querySelectorAll(`#${APP_ID}-dock[data-fh-instance="${INSTANCE_ID}"]`).forEach(node => node.remove());
    }
    // 快捷回复栏里那颗「🍎 果实之心」是预设自带的 QR 条目，不是脚本画的。
    // 关掉入口时只解绑点击，按钮还杵在那儿点不动 —— 所以关的时候要顺手把它藏了。
    const QR_BARS = '#qr--bar button,.qr--buttons button,#quickReplies button,.qr--button';
    const QR_BAR_HOSTS = '#qr--bar,.qr--buttons,#quickReplies';
    let syntheticBarEntry = null;
    let boundPresetName = loadedName();
    let entryBindingSuspended = false;
    // 换过图标的按钮文字里就没有 🍎 了，所以先认标记再认文字，两条都要留
    function isEntryButton(node) {
        if (node.dataset && node.dataset.fhCat) return true;
        const label = (node.textContent || '').replace(/\s+/g, ' ').trim();
        return label === BUTTON_NAME || node.getAttribute('title') === BUTTON_NAME;
    }
    function barEntryButtons() {
        const hit = [];
        for (const node of doc.querySelectorAll(QR_BARS)) if (isEntryButton(node)) hit.push(node);
        return hit;
    }
    function hasFruitHeartConfig() {
        try { return Boolean(configPrompt(activePreset())); } catch { return false; }
    }
    function ensureBarEntry() {
        if (!entryBar || entryBindingSuspended || syntheticBarEntry || !hasFruitHeartConfig()) return;
        if (barEntryButtons().length) return;
        const host = doc.querySelector(QR_BAR_HOSTS);
        if (!host) return;
        // 酒馆 Quick Reply 的真实入口是 div.qr--button；用 button 会触发浏览器/主题的原生灰底样式。
        const button = doc.createElement('div');
        button.className = 'qr--button fh-synthetic-entry';
        button.dataset.fhSynthetic = '1';
        button.dataset.fhCat = '1';
        button.dataset.fhInstance = INSTANCE_ID;
        button.title = BUTTON_NAME;
        button.setAttribute('aria-label', BUTTON_NAME);
        button.setAttribute('role', 'button');
        button.tabIndex = 0;
        button.innerHTML = `<div class="qr--button-label"><span class="fh-bar-cat">${BALL_ICON}</span>果实之心</div>`;
        host.appendChild(button);
        syntheticBarEntry = button;
    }
    function undressBarEntry() {
        for (const node of doc.querySelectorAll(`[data-fh-instance="${INSTANCE_ID}"][data-fh-cat="1"]`)) {
            if (node.dataset.fhSynthetic) { node.remove(); continue; }
            for (const mark of node.querySelectorAll('.fh-bar-cat')) mark.replaceWith(doc.createTextNode('🍎'));
            delete node.dataset.fhCat;
            delete node.dataset.fhInstance;
            if (node.dataset.fhCatTitle) { node.setAttribute('title', node.dataset.fhCatTitle); delete node.dataset.fhCatTitle; }
        }
        syntheticBarEntry = null;
    }
    // 把按钮里那个 🍎 换成猫。只动那一个文字节点，不重写 innerHTML ——
    // 那是酒馆自己的按钮，它随时会往里面塞东西，整个刷掉会把它的结构弄坏。
    function dressBarEntry() {
        if (!entryBar) return;
        for (const node of barEntryButtons()) {
            if (node.dataset.fhCat) continue;
            node.dataset.fhCat = '1';
            node.dataset.fhInstance = INSTANCE_ID;
            if (!node.getAttribute('title')) { node.dataset.fhCatTitle = ''; node.setAttribute('title', BUTTON_NAME); }
            const walker = doc.createTreeWalker(node, 4);   // 4 = NodeFilter.SHOW_TEXT，直接写数字省一个全局依赖
            let text = null;
            while (walker.nextNode()) { if (walker.currentNode.nodeValue.includes('🍎')) { text = walker.currentNode; break; } }
            if (!text) continue;
            const cut = text.nodeValue.indexOf('🍎');
            const head = text.nodeValue.slice(0, cut);
            const tail = text.nodeValue.slice(cut + '🍎'.length);
            const mark = doc.createElement('span');
            mark.className = 'fh-bar-cat';
            mark.innerHTML = BALL_ICON;
            const parent = text.parentNode;
            if (head) parent.insertBefore(doc.createTextNode(head), text);
            parent.insertBefore(mark, text);
            text.nodeValue = tail;
        }
    }
    function sweepBarEntry() {
        if (entryBindingSuspended) return;
        ensureBarEntry();
        for (const node of barEntryButtons()) node.style.display = entryBar ? '' : 'none';
        dressBarEntry();
    }
    function clearEntryArtifacts() {
        entryBindingSuspended = true;
        close();
        undressBarEntry();
        jq(doc).off(`click${ENTRY_EVENT_NS}`);
        hideBall();
    }
    function bindPresetChangeEvents() {
        const on = resolveFunction('eventOn');
        const events = hostWindow.tavern_events || window.tavern_events;
        if (!on || !events) return;
        const names = [...new Set([events.OAI_PRESET_CHANGED_AFTER, events.PRESET_CHANGED].filter(Boolean))];
        for (const name of names) {
            try { on(name, clearEntryArtifacts); } catch {}
        }
    }
    function refreshEntryBinding() {
        const name = loadedName();
        if (!name || !boundPresetName || name === boundPresetName) return;
        boundPresetName = name;
        clearEntryArtifacts();
    }
    function bindEntry() {
        entryBindingSuspended = false;
        hideBall();
        sweepBarEntry();
        if (!entryBar) { jq(doc).off(`click${ENTRY_EVENT_NS}`); showBall(); return; }
        jq(doc).off(`click${ENTRY_EVENT_NS}`).on(`click${ENTRY_EVENT_NS}`, QR_BARS, function (event) {
            if (isEntryButton(this)) { event.preventDefault(); event.stopPropagation(); open(); }
        });
        bindRoll();
        const getEvent = resolveFunction('getButtonEvent'); const on = resolveFunction('eventOn');
        if (getEvent && on) { const name = getEvent(BUTTON_NAME); if (name) on(name, open); }
        // 快捷回复栏是默认入口；认不出按钮、或用户自己选了浮球，就挂 🍎。
        // 认不出快捷回复栏按钮时，就算用户没勾浮球也得挂一个，否则面板彻底打不开
        if (entryBall || !entryBar || !barEntryButtons().length) showBall();
    }
    let rollBound = false;
    function bindRoll() {
        if (rollBound) return;
        const on = resolveFunction('eventOn');
        const events = hostWindow.tavern_events || window.tavern_events;
        const name = events?.GENERATION_AFTER_COMMANDS;
        if (!on || !name) return;              // 酒馆助手版本太老就静默跳过，不影响别的功能
        rollBound = true;
        on(name, async (type, _option, dryRun) => {
            if (dryRun) return;
            if (type === 'quiet' || type === 'impersonate') return;   // 总结之类的后台生成不算一回合
            try {
                await rollTheatre();
                if (root.hasClass('open') && currentView === 'overview') renderOverview();
            } catch (error) { console.error('[果实之心] 随机小剧场', error); }
        });
    }
    function destroy() {
        if (destroyed) return;
        destroyed = true;
        window.removeEventListener('pagehide', destroyOnPageHide);
        window.removeEventListener('unload', destroyOnPageHide);
        modelLinkDestroyed = true;
        clearEntryArtifacts();
        clearInterval(modelLinkTimer);
        clearInterval(entrySweepTimer);
        hostWindow.visualViewport?.removeEventListener('resize', syncViewport);
        hostWindow.visualViewport?.removeEventListener('scroll', syncViewport);
        hostWindow.removeEventListener('resize', syncViewport);
        clearTimeout(searchTimer); clearTimeout(updateCheckTimer); clearInterval(syncTimer); jq(doc).off(`keydown${KEY_EVENT_NS}`); jq(hostWindow).off(`resize${BALL_EVENT_NS}`); root.remove(); style.remove();
    }
    function destroyOnPageHide() { destroy(); }

    hostWindow.__FRUIT_HEART_MAIN__ = { open, destroy };
    bindEntry();
    bindPresetChangeEvents();
    try { ecotEndTags(); } catch {}
    window.addEventListener('pagehide', destroyOnPageHide, { once: true });
    window.addEventListener('unload', destroyOnPageHide, { once: true });
    const modelLinkTimer = setInterval(syncConnectedModel, 1000);
    void syncConnectedModel();
    const entrySweepTimer = setInterval(() => { if (!doc.hidden) { refreshEntryBinding(); sweepBarEntry(); } }, 2500);   // 关着要藏，开着要补图标，两种情况都得扫
    scheduleUpdateCheck();
})();
