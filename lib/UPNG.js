// https://github.com/photopea/UPNG.js/blob/88f504b6577b726975f593caa38ba85d327c7c1f/UPNG.js

// import * as pako from 'pako'
import * as UZIP from 'uzip';

const UPNG = (function () {
  var _bin = {
    nextZero(data, p) { while (data[p] != 0) p++; return p; },
    readUshort(buff, p) { return (buff[p] << 8) | buff[p + 1]; },
    writeUshort(buff, p, n) { buff[p] = (n >> 8) & 255; buff[p + 1] = n & 255; },
    readUint(buff, p) { return (buff[p] * (256 * 256 * 256)) + ((buff[p + 1] << 16) | (buff[p + 2] << 8) | buff[p + 3]); },
    writeUint(buff, p, n) { buff[p] = (n >> 24) & 255; buff[p + 1] = (n >> 16) & 255; buff[p + 2] = (n >> 8) & 255; buff[p + 3] = n & 255; },
    readASCII(buff, p, l) { let s = ''; for (let i = 0; i < l; i++) s += String.fromCharCode(buff[p + i]); return s; },
    writeASCII(data, p, s) { for (let i = 0; i < s.length; i++) data[p + i] = s.charCodeAt(i); },
    readBytes(buff, p, l) { const arr = []; for (let i = 0; i < l; i++) arr.push(buff[p + i]); return arr; },
    pad(n) { return n.length < 2 ? `0${n}` : n; },
    readUTF8(buff, p, l) {
      let s = '';
      let ns;
      for (let i = 0; i < l; i++) s += `%${_bin.pad(buff[p + i].toString(16))}`;
      try { ns = decodeURIComponent(s); } catch (e) { return _bin.readASCII(buff, p, l); }
      return ns;
    },
  };

  function toRGBA8(out) {
    const w = out.width; const
      h = out.height;
    if (out.tabs.acTL == null) return [decodeImage(out.data, w, h, out).buffer];

    const frms = [];
    if (out.frames[0].data == null) out.frames[0].data = out.data;

    const len = w * h * 4; const img = new Uint8Array(len); const empty = new Uint8Array(len); const
      prev = new Uint8Array(len);
    for (let i = 0; i < out.frames.length; i++) {
      const frm = out.frames[i];
      const fx = frm.rect.x; const fy = frm.rect.y; const fw = frm.rect.width; const
        fh = frm.rect.height;
      const fdata = decodeImage(frm.data, fw, fh, out);

      if (i != 0) for (var j = 0; j < len; j++) prev[j] = img[j];

      if (frm.blend == 0) _copyTile(fdata, fw, fh, img, w, h, fx, fy, 0);
      else if (frm.blend == 1) _copyTile(fdata, fw, fh, img, w, h, fx, fy, 1);

      frms.push(img.buffer.slice(0));

      if (frm.dispose == 0) {} else if (frm.dispose == 1) _copyTile(empty, fw, fh, img, w, h, fx, fy, 0);
      else if (frm.dispose == 2) for (var j = 0; j < len; j++) img[j] = prev[j];
    }
    return frms;
  }
  function decodeImage(data, w, h, out) {
    const area = w * h; const
      bpp = _getBPP(out);
    const bpl = Math.ceil(w * bpp / 8);	// bytes per line

    const bf = new Uint8Array(area * 4); const
      bf32 = new Uint32Array(bf.buffer);
    const { ctype } = out;
    const { depth } = out;
    const rs = _bin.readUshort;

    // console.log(ctype, depth);
    const time = Date.now();

    if (ctype == 6) { // RGB + alpha
      const qarea = area << 2;
      if (depth == 8) for (var i = 0; i < qarea; i += 4) { bf[i] = data[i]; bf[i + 1] = data[i + 1]; bf[i + 2] = data[i + 2]; bf[i + 3] = data[i + 3]; }
      if (depth == 16) for (var i = 0; i < qarea; i++) { bf[i] = data[i << 1]; }
    } else if (ctype == 2) {	// RGB
      const ts = out.tabs.tRNS;
      if (ts == null) {
        if (depth == 8) for (var i = 0; i < area; i++) { var ti = i * 3; bf32[i] = (255 << 24) | (data[ti + 2] << 16) | (data[ti + 1] << 8) | data[ti]; }
        if (depth == 16) for (var i = 0; i < area; i++) { var ti = i * 6; bf32[i] = (255 << 24) | (data[ti + 4] << 16) | (data[ti + 2] << 8) | data[ti]; }
      } else {
        var tr = ts[0]; const tg = ts[1]; const
          tb = ts[2];
        if (depth == 8) {
          for (var i = 0; i < area; i++) {
            var qi = i << 2; var
              ti = i * 3; bf32[i] = (255 << 24) | (data[ti + 2] << 16) | (data[ti + 1] << 8) | data[ti];
            if (data[ti] == tr && data[ti + 1] == tg && data[ti + 2] == tb) bf[qi + 3] = 0;
          }
        }
        if (depth == 16) {
          for (var i = 0; i < area; i++) {
            var qi = i << 2; var
              ti = i * 6; bf32[i] = (255 << 24) | (data[ti + 4] << 16) | (data[ti + 2] << 8) | data[ti];
            if (rs(data, ti) == tr && rs(data, ti + 2) == tg && rs(data, ti + 4) == tb) bf[qi + 3] = 0;
          }
        }
      }
    } else if (ctype == 3) {	// palette
      const p = out.tabs.PLTE;
      const ap = out.tabs.tRNS;
      const tl = ap ? ap.length : 0;
      // console.log(p, ap);
      if (depth == 1) {
        for (var y = 0; y < h; y++) {
          var s0 = y * bpl; var
            t0 = y * w;
          for (var i = 0; i < w; i++) {
            var qi = (t0 + i) << 2; var j = ((data[s0 + (i >> 3)] >> (7 - ((i & 7) << 0))) & 1); var
              cj = 3 * j; bf[qi] = p[cj]; bf[qi + 1] = p[cj + 1]; bf[qi + 2] = p[cj + 2]; bf[qi + 3] = (j < tl) ? ap[j] : 255;
          }
        }
      }
      if (depth == 2) {
        for (var y = 0; y < h; y++) {
          var s0 = y * bpl; var
            t0 = y * w;
          for (var i = 0; i < w; i++) {
            var qi = (t0 + i) << 2; var j = ((data[s0 + (i >> 2)] >> (6 - ((i & 3) << 1))) & 3); var
              cj = 3 * j; bf[qi] = p[cj]; bf[qi + 1] = p[cj + 1]; bf[qi + 2] = p[cj + 2]; bf[qi + 3] = (j < tl) ? ap[j] : 255;
          }
        }
      }
      if (depth == 4) {
        for (var y = 0; y < h; y++) {
          var s0 = y * bpl; var
            t0 = y * w;
          for (var i = 0; i < w; i++) {
            var qi = (t0 + i) << 2; var j = ((data[s0 + (i >> 1)] >> (4 - ((i & 1) << 2))) & 15); var
              cj = 3 * j; bf[qi] = p[cj]; bf[qi + 1] = p[cj + 1]; bf[qi + 2] = p[cj + 2]; bf[qi + 3] = (j < tl) ? ap[j] : 255;
          }
        }
      }
      if (depth == 8) {
        for (var i = 0; i < area; i++) {
          var qi = i << 2; var j = data[i]; var
            cj = 3 * j; bf[qi] = p[cj]; bf[qi + 1] = p[cj + 1]; bf[qi + 2] = p[cj + 2]; bf[qi + 3] = (j < tl) ? ap[j] : 255;
        }
      }
    } else if (ctype == 4) {	// gray + alpha
      if (depth == 8) {
        for (var i = 0; i < area; i++) {
          var qi = i << 2; var di = i << 1; var
            gr = data[di]; bf[qi] = gr; bf[qi + 1] = gr; bf[qi + 2] = gr; bf[qi + 3] = data[di + 1];
        }
      }
      if (depth == 16) {
        for (var i = 0; i < area; i++) {
          var qi = i << 2; var di = i << 2; var
            gr = data[di]; bf[qi] = gr; bf[qi + 1] = gr; bf[qi + 2] = gr; bf[qi + 3] = data[di + 2];
        }
      }
    } else if (ctype == 0) {	// gray
      var tr = out.tabs.tRNS ? out.tabs.tRNS : -1;
      for (var y = 0; y < h; y++) {
        const off = y * bpl; const
          to = y * w;
        if (depth == 1) {
          for (var x = 0; x < w; x++) {
            var gr = 255 * ((data[off + (x >>> 3)] >>> (7 - ((x & 7)))) & 1); var
              al = (gr == tr * 255) ? 0 : 255; bf32[to + x] = (al << 24) | (gr << 16) | (gr << 8) | gr;
          }
        } else if (depth == 2) {
          for (var x = 0; x < w; x++) {
            var gr = 85 * ((data[off + (x >>> 2)] >>> (6 - ((x & 3) << 1))) & 3); var
              al = (gr == tr * 85) ? 0 : 255; bf32[to + x] = (al << 24) | (gr << 16) | (gr << 8) | gr;
          }
        } else if (depth == 4) {
          for (var x = 0; x < w; x++) {
            var gr = 17 * ((data[off + (x >>> 1)] >>> (4 - ((x & 1) << 2))) & 15); var
              al = (gr == tr * 17) ? 0 : 255; bf32[to + x] = (al << 24) | (gr << 16) | (gr << 8) | gr;
          }
        } else if (depth == 8) {
          for (var x = 0; x < w; x++) {
            var gr = data[off + x]; var
              al = (gr == tr) ? 0 : 255; bf32[to + x] = (al << 24) | (gr << 16) | (gr << 8) | gr;
          }
        } else if (depth == 16) {
          for (var x = 0; x < w; x++) {
            var gr = data[off + (x << 1)]; var
              al = (rs(data, off + (x << 1)) == tr) ? 0 : 255; bf32[to + x] = (al << 24) | (gr << 16) | (gr << 8) | gr;
          }
        }
      }
    }
    // console.log(Date.now()-time);
    return bf;
  }

  function decode(buff) {
    const data = new Uint8Array(buff); let offset = 8; const bin = _bin; const rUs = bin.readUshort; const
      rUi = bin.readUint;
    const out = { tabs: {}, frames: [] };
    const dd = new Uint8Array(data.length); let
      doff = 0;	 // put all IDAT data into it
    let fd; let
      foff = 0;	// frames

    const mgck = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
    for (var i = 0; i < 8; i++) if (data[i] != mgck[i]) throw 'The input is not a PNG file!';

    while (offset < data.length) {
      const len = bin.readUint(data, offset); offset += 4;
      const type = bin.readASCII(data, offset, 4); offset += 4;
      // console.log(type,len);

      if (type == 'IHDR') { _IHDR(data, offset, out); } else if (type == 'iCCP') {
        var off = offset; while (data[off] != 0) off++;
        const nam = bin.readASCII(data, offset, off - offset);
        const cpr = data[off + 1];
        const fil = data.slice(off + 2, offset + len);
        let res = null;
        try { res = _inflate(fil); } catch (e) { res = inflateRaw(fil); }
        out.tabs[type] = res;
      } else if (type == 'CgBI') { out.tabs[type] = data.slice(offset, offset + 4); } else if (type == 'IDAT') {
        for (var i = 0; i < len; i++) dd[doff + i] = data[offset + i];
        doff += len;
      } else if (type == 'acTL') {
        out.tabs[type] = { num_frames: rUi(data, offset), num_plays: rUi(data, offset + 4) };
        fd = new Uint8Array(data.length);
      } else if (type == 'fcTL') {
        if (foff != 0) {
          var fr = out.frames[out.frames.length - 1];
          fr.data = _decompress(out, fd.slice(0, foff), fr.rect.width, fr.rect.height); foff = 0;
        }
        const rct = {
          x: rUi(data, offset + 12), y: rUi(data, offset + 16), width: rUi(data, offset + 4), height: rUi(data, offset + 8),
        };
        let del = rUs(data, offset + 22); del = rUs(data, offset + 20) / (del == 0 ? 100 : del);
        const frm = {
          rect: rct, delay: Math.round(del * 1000), dispose: data[offset + 24], blend: data[offset + 25],
        };
        // console.log(frm);
        out.frames.push(frm);
      } else if (type == 'fdAT') {
        for (var i = 0; i < len - 4; i++) fd[foff + i] = data[offset + i + 4];
        foff += len - 4;
      } else if (type == 'pHYs') {
        out.tabs[type] = [bin.readUint(data, offset), bin.readUint(data, offset + 4), data[offset + 8]];
      } else if (type == 'cHRM') {
        out.tabs[type] = [];
        for (var i = 0; i < 8; i++) out.tabs[type].push(bin.readUint(data, offset + i * 4));
      } else if (type == 'tEXt' || type == 'zTXt') {
        if (out.tabs[type] == null) out.tabs[type] = {};
        var nz = bin.nextZero(data, offset);
        var keyw = bin.readASCII(data, offset, nz - offset);
        var text; var
          tl = offset + len - nz - 1;
        if (type == 'tEXt') text = bin.readASCII(data, nz + 1, tl);
        else {
          var bfr = _inflate(data.slice(nz + 2, nz + 2 + tl));
          text = bin.readUTF8(bfr, 0, bfr.length);
        }
        out.tabs[type][keyw] = text;
      } else if (type == 'iTXt') {
        if (out.tabs[type] == null) out.tabs[type] = {};
        var nz = 0; var
          off = offset;
        nz = bin.nextZero(data, off);
        var keyw = bin.readASCII(data, off, nz - off); off = nz + 1;
        const cflag = data[off]; const
          cmeth = data[off + 1]; off += 2;
        nz = bin.nextZero(data, off);
        const ltag = bin.readASCII(data, off, nz - off); off = nz + 1;
        nz = bin.nextZero(data, off);
        const tkeyw = bin.readUTF8(data, off, nz - off); off = nz + 1;
        var text; var
          tl = len - (off - offset);
        if (cflag == 0) text = bin.readUTF8(data, off, tl);
        else {
          var bfr = _inflate(data.slice(off, off + tl));
          text = bin.readUTF8(bfr, 0, bfr.length);
        }
        out.tabs[type][keyw] = text;
      } else if (type == 'PLTE') {
        out.tabs[type] = bin.readBytes(data, offset, len);
      } else if (type == 'hIST') {
        const pl = out.tabs.PLTE.length / 3;
        out.tabs[type] = []; for (var i = 0; i < pl; i++) out.tabs[type].push(rUs(data, offset + i * 2));
      } else if (type == 'tRNS') {
        if (out.ctype == 3) out.tabs[type] = bin.readBytes(data, offset, len);
        else if (out.ctype == 0) out.tabs[type] = rUs(data, offset);
        else if (out.ctype == 2) out.tabs[type] = [rUs(data, offset), rUs(data, offset + 2), rUs(data, offset + 4)];
        // else console.log("tRNS for unsupported color type",out.ctype, len);
      } else if (type == 'gAMA') out.tabs[type] = bin.readUint(data, offset) / 100000;
      else if (type == 'sRGB') out.tabs[type] = data[offset];
      else if (type == 'bKGD') {
        if (out.ctype == 0 || out.ctype == 4) out.tabs[type] = [rUs(data, offset)];
        else if (out.ctype == 2 || out.ctype == 6) out.tabs[type] = [rUs(data, offset), rUs(data, offset + 2), rUs(data, offset + 4)];
        else if (out.ctype == 3) out.tabs[type] = data[offset];
      } else if (type == 'IEND') {
        break;
      }
      // else {  console.log("unknown chunk type", type, len);  out.tabs[type]=data.slice(offset,offset+len);  }
      offset += len;
      const crc = bin.readUint(data, offset); offset += 4;
    }
    if (foff != 0) {
      var fr = out.frames[out.frames.length - 1];
      fr.data = _decompress(out, fd.slice(0, foff), fr.rect.width, fr.rect.height);
    }
    out.data = _decompress(out, dd, out.width, out.height);

    delete out.compress; delete out.interlace; delete out.filter;
    return out;
  }

  function _decompress(out, dd, w, h) {
    var time = Date.now();
    const bpp = _getBPP(out); const bpl = Math.ceil(w * bpp / 8); const
      buff = new Uint8Array((bpl + 1 + out.interlace) * h);
    if (out.tabs.CgBI) dd = inflateRaw(dd, buff);
    else dd = _inflate(dd, buff);
    // console.log(dd.length, buff.length);
    // console.log(Date.now()-time);

    var time = Date.now();
    if (out.interlace == 0) dd = _filterZero(dd, out, 0, w, h);
    else if (out.interlace == 1) dd = _readInterlace(dd, out);
    // console.log(Date.now()-time);
    return dd;
  }

  function _inflate(data, buff) { const out = inflateRaw(new Uint8Array(data.buffer, 2, data.length - 6), buff); return out; }

  var inflateRaw = (function () {
    const D = (function () {
      const o = Uint16Array; const j = Uint32Array; return {
        m: new o(16),
        v: new o(16),
        d: [16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15],
        o: [3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 15, 17, 19, 23, 27, 31, 35, 43, 51, 59, 67, 83, 99, 115, 131, 163, 195, 227, 258, 999, 999, 999],
        z: [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 0, 0, 0, 0],
        B: new o(32),
        p: [1, 2, 3, 4, 5, 7, 9, 13, 17, 25, 33, 49, 65, 97, 129, 193, 257, 385, 513, 769, 1025, 1537, 2049, 3073, 4097, 6145, 8193, 12289, 16385, 24577, 65535, 65535],
        w: [0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12, 12, 13, 13, 0, 0],
        h: new j(32),
        g: new o(512),
        s: [],
        A: new o(32),
        t: [],
        k: new o(32768),
        c: [],
        a: [],
        n: new o(32768),
        e: [],
        C: new o(512),
        b: [],
        i: new o(1 << 15),
        r: new j(286),
        f: new j(30),
        l: new j(19),
        u: new j(15e3),
        q: new o(1 << 16),
        j: new o(1 << 15),
      };
    }());
    function C(o, j) {
      const I = o.length; let A; let r; let i; var y; let G; const f = D.v; for (var y = 0; y <= j; y++)f[y] = 0; for (y = 1; y < I; y += 2)f[o[y]]++;
      const a = D.m; A = 0; f[0] = 0; for (r = 1; r <= j; r++) { A = A + f[r - 1] << 1; a[r] = A; } for (i = 0; i < I; i += 2) {
        G = o[i + 1]; if (G != 0) {
          o[i] = a[G];
          a[G]++;
        }
      }
    } function t(o, j, I) {
      const A = o.length; const r = D.i; for (let i = 0; i < A; i += 2) {
        if (o[i + 1] != 0) {
          const y = i >> 1; const G = o[i + 1]; const f = y << 4 | G; const a = j - G; let k = o[i] << a; const N = k + (1 << a);
          while (k != N) { const x = r[k] >>> 15 - j; I[x] = f; k++; }
        }
      }
    } function g(o, j) {
      const I = D.i; const A = 15 - j; for (let r = 0; r < o.length; r += 2) {
        const i = o[r] << j - o[r + 1];
        o[r] = I[i] >>> A;
      }
    }(function () {
      const o = 1 << 15; for (var j = 0; j < o; j++) {
        let I = j; I = (I & 2863311530) >>> 1 | (I & 1431655765) << 1;
        I = (I & 3435973836) >>> 2 | (I & 858993459) << 2; I = (I & 4042322160) >>> 4 | (I & 252645135) << 4; I = (I & 4278255360) >>> 8 | (I & 16711935) << 8;
        D.i[j] = (I >>> 16 | I << 16) >>> 17;
      } function A(r, i, y) { while (i-- != 0)r.push(0, y); } for (var j = 0; j < 32; j++) {
        D.B[j] = D.o[j] << 3 | D.z[j];
        D.h[j] = D.p[j] << 4 | D.w[j];
      }A(D.s, 144, 8); A(D.s, 255 - 143, 9); A(D.s, 279 - 255, 7); A(D.s, 287 - 279, 8); C(D.s, 9); t(D.s, 9, D.g);
      g(D.s, 9); A(D.t, 32, 5); C(D.t, 5); t(D.t, 5, D.A); g(D.t, 5); A(D.b, 19, 0); A(D.c, 286, 0); A(D.e, 30, 0); A(D.a, 320, 0);
    }());
    function F(o, j, I) { return (o[j >>> 3] | o[(j >>> 3) + 1] << 8) >>> (j & 7) & (1 << I) - 1; } function s(o, j, I) { return (o[j >>> 3] | o[(j >>> 3) + 1] << 8 | o[(j >>> 3) + 2] << 16) >>> (j & 7) & (1 << I) - 1; }
    function w(o, j) { return (o[j >>> 3] | o[(j >>> 3) + 1] << 8 | o[(j >>> 3) + 2] << 16) >>> (j & 7); } function b(o, j) { return (o[j >>> 3] | o[(j >>> 3) + 1] << 8 | o[(j >>> 3) + 2] << 16 | o[(j >>> 3) + 3] << 24) >>> (j & 7); }
    function v(o, j) {
      const I = Uint8Array; let r = 0; let i = 0; let y = 0; let G = 0; let f = 0; let a = 0; let k = 0; let N = 0; let x = 0; let P; let J;
      if (o[0] == 3 && o[1] == 0) return j || new I(0); const A = j == null; if (A)j = new I(o.length >>> 2 << 3); while (r == 0) {
        r = s(o, x, 1);
        i = s(o, x + 1, 2); x += 3; if (i == 0) {
          if ((x & 7) != 0)x += 8 - (x & 7); const K = (x >>> 3) + 4; const m = o[K - 4] | o[K - 3] << 8; if (A)j = H(j, N + m);
          j.set(new I(o.buffer, o.byteOffset + K, m), N); x = K + m << 3; N += m; continue;
        } if (A)j = H(j, N + (1 << 17)); if (i == 1) {
          P = D.g;
          J = D.A; a = (1 << 9) - 1; k = (1 << 5) - 1;
        } if (i == 2) {
          y = F(o, x, 5) + 257; G = F(o, x + 5, 5) + 1; f = F(o, x + 10, 4) + 4; x += 14; const O = x; let Q = 1;
          for (var p = 0; p < 38; p += 2) { D.b[p] = 0; D.b[p + 1] = 0; } for (var p = 0; p < f; p++) {
            const l = F(o, x + p * 3, 3); D.b[(D.d[p] << 1) + 1] = l;
            if (l > Q)Q = l;
          }x += 3 * f; C(D.b, Q); t(D.b, Q, D.C); P = D.k; J = D.n; x = B(D.C, (1 << Q) - 1, y + G, o, x, D.a); const u = d(D.a, 0, y, D.c);
          a = (1 << u) - 1; const n = d(D.a, y, G, D.e); k = (1 << n) - 1; C(D.c, u); t(D.c, u, P); C(D.e, n); t(D.e, n, J);
        } while (!0) {
          const h = P[w(o, x) & a];
          x += h & 15; const L = h >>> 4; if (L >>> 8 == 0) { j[N++] = L; } else if (L == 256) { break; } else {
            let M = N + L - 254; if (L > 264) {
              const z = D.B[L - 257];
              M = N + (z >>> 3) + F(o, x, z & 7); x += z & 7;
            } const e = J[w(o, x) & k]; x += e & 15; const E = e >>> 4; const c = D.h[E]; const q = (c >>> 4) + s(o, x, c & 15); x += c & 15;
            if (A)j = H(j, N + (1 << 17)); while (N < M) { j[N] = j[N++ - q]; j[N] = j[N++ - q]; j[N] = j[N++ - q]; j[N] = j[N++ - q]; }N = M;
          }
        }
      } return j.length == N ? j : j.slice(0, N);
    } function H(o, j) {
      const I = o.length;
      if (j <= I) return o; const A = new Uint8Array(Math.max(I << 1, j)); A.set(o, 0); return A;
    } function B(o, j, I, A, r, i) {
      let y = 0;
      while (y < I) {
        const G = o[w(A, r) & j]; r += G & 15; const f = G >>> 4; if (f <= 15) { i[y] = f; y++; } else {
          let a = 0; let k = 0; if (f == 16) {
            k = 3 + F(A, r, 2);
            r += 2; a = i[y - 1];
          } else if (f == 17) { k = 3 + F(A, r, 3); r += 3; } else if (f == 18) { k = 11 + F(A, r, 7); r += 7; } const N = y + k; while (y < N) {
            i[y] = a;
            y++;
          }
        }
      } return r;
    } function d(o, j, I, A) {
      let r = 0; let i = 0; const y = A.length >>> 1; while (i < I) {
        const G = o[i + j]; A[i << 1] = 0; A[(i << 1) + 1] = G;
        if (G > r)r = G; i++;
      } while (i < y) { A[i << 1] = 0; A[(i << 1) + 1] = 0; i++; } return r;
    } return v;
  }());

  function _readInterlace(data, out) {
    const w = out.width; const
      h = out.height;
    const bpp = _getBPP(out); const cbpp = bpp >> 3; const
      bpl = Math.ceil(w * bpp / 8);
    const img = new Uint8Array(h * bpl);
    let di = 0;

    const starting_row = [0, 0, 4, 0, 2, 0, 1];
    const starting_col = [0, 4, 0, 2, 0, 1, 0];
    const row_increment = [8, 8, 8, 4, 4, 2, 2];
    const col_increment = [8, 8, 4, 4, 2, 2, 1];

    let pass = 0;
    while (pass < 7) {
      const ri = row_increment[pass]; const
        ci = col_increment[pass];
      let sw = 0; let
        sh = 0;
      let cr = starting_row[pass]; while (cr < h) { cr += ri; sh++; }
      let cc = starting_col[pass]; while (cc < w) { cc += ci; sw++; }
      const bpll = Math.ceil(sw * bpp / 8);
      _filterZero(data, out, di, sw, sh);

      let y = 0; let
        row = starting_row[pass];
      while (row < h) {
        let col = starting_col[pass];
        let cdi = (di + y * bpll) << 3;

        while (col < w) {
          if (bpp == 1) {
            var val = data[cdi >> 3]; val = (val >> (7 - (cdi & 7))) & 1;
            img[row * bpl + (col >> 3)] |= (val << (7 - ((col & 7) << 0)));
          }
          if (bpp == 2) {
            var val = data[cdi >> 3]; val = (val >> (6 - (cdi & 7))) & 3;
            img[row * bpl + (col >> 2)] |= (val << (6 - ((col & 3) << 1)));
          }
          if (bpp == 4) {
            var val = data[cdi >> 3]; val = (val >> (4 - (cdi & 7))) & 15;
            img[row * bpl + (col >> 1)] |= (val << (4 - ((col & 1) << 2)));
          }
          if (bpp >= 8) {
            const ii = row * bpl + col * cbpp;
            for (let j = 0; j < cbpp; j++) img[ii + j] = data[(cdi >> 3) + j];
          }
          cdi += bpp; col += ci;
        }
        y++; row += ri;
      }
      if (sw * sh != 0) di += sh * (1 + bpll);
      pass += 1;
    }
    return img;
  }

  function _getBPP(out) {
    const noc = [1, null, 3, 1, 2, null, 4][out.ctype];
    return noc * out.depth;
  }

  function _filterZero(data, out, off, w, h) {
    let bpp = _getBPP(out); const
      bpl = Math.ceil(w * bpp / 8);
    bpp = Math.ceil(bpp / 8);

    let i; let di; let type = data[off]; let
      x = 0;

    if (type > 1) data[off] = [0, 0, 1][type - 2];
    if (type == 3) for (x = bpp; x < bpl; x++) data[x + 1] = (data[x + 1] + (data[x + 1 - bpp] >>> 1)) & 255;

    for (let y = 0; y < h; y++) {
      i = off + y * bpl; di = i + y + 1;
      type = data[di - 1]; x = 0;

      if (type == 0) for (; x < bpl; x++) data[i + x] = data[di + x];
      else if (type == 1) {
        for (; x < bpp; x++) data[i + x] = data[di + x];
							   for (; x < bpl; x++) data[i + x] = (data[di + x] + data[i + x - bpp]);
      } else if (type == 2) { for (; x < bpl; x++) data[i + x] = (data[di + x] + data[i + x - bpl]); } else if (type == 3) {
        for (; x < bpp; x++) data[i + x] = (data[di + x] + (data[i + x - bpl] >>> 1));
							   for (; x < bpl; x++) data[i + x] = (data[di + x] + ((data[i + x - bpl] + data[i + x - bpp]) >>> 1));
      } else {
        for (; x < bpp; x++) data[i + x] = (data[di + x] + _paeth(0, data[i + x - bpl], 0));
							   for (; x < bpl; x++) data[i + x] = (data[di + x] + _paeth(data[i + x - bpp], data[i + x - bpl], data[i + x - bpp - bpl]));
      }
    }
    return data;
  }

  function _paeth(a, b, c) {
    const p = a + b - c; const pa = (p - a); const pb = (p - b); const
      pc = (p - c);
    if (pa * pa <= pb * pb && pa * pa <= pc * pc) return a;
    if (pb * pb <= pc * pc) return b;
    return c;
  }

  function _IHDR(data, offset, out) {
    out.width = _bin.readUint(data, offset); offset += 4;
    out.height = _bin.readUint(data, offset); offset += 4;
    out.depth = data[offset]; offset++;
    out.ctype = data[offset]; offset++;
    out.compress = data[offset]; offset++;
    out.filter = data[offset]; offset++;
    out.interlace = data[offset]; offset++;
  }

  function _copyTile(sb, sw, sh, tb, tw, th, xoff, yoff, mode) {
    const w = Math.min(sw, tw); const
      h = Math.min(sh, th);
    let si = 0; let
      ti = 0;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (xoff >= 0 && yoff >= 0) { si = (y * sw + x) << 2; ti = ((yoff + y) * tw + xoff + x) << 2; } else { si = ((-yoff + y) * sw - xoff + x) << 2; ti = (y * tw + x) << 2; }

        if (mode == 0) { tb[ti] = sb[si]; tb[ti + 1] = sb[si + 1]; tb[ti + 2] = sb[si + 2]; tb[ti + 3] = sb[si + 3]; } else if (mode == 1) {
          var fa = sb[si + 3] * (1 / 255); var fr = sb[si] * fa; var fg = sb[si + 1] * fa; var
            fb = sb[si + 2] * fa;
          var ba = tb[ti + 3] * (1 / 255); var br = tb[ti] * ba; var bg = tb[ti + 1] * ba; var
            bb = tb[ti + 2] * ba;

          const ifa = 1 - fa; const oa = fa + ba * ifa; const
            ioa = (oa == 0 ? 0 : 1 / oa);
          tb[ti + 3] = 255 * oa;
          tb[ti + 0] = (fr + br * ifa) * ioa;
          tb[ti + 1] = (fg + bg * ifa) * ioa;
          tb[ti + 2] = (fb + bb * ifa) * ioa;
        } else if (mode == 2) {	// copy only differences, otherwise zero
          var fa = sb[si + 3]; var fr = sb[si]; var fg = sb[si + 1]; var
            fb = sb[si + 2];
          var ba = tb[ti + 3]; var br = tb[ti]; var bg = tb[ti + 1]; var
            bb = tb[ti + 2];
          if (fa == ba && fr == br && fg == bg && fb == bb) { tb[ti] = 0; tb[ti + 1] = 0; tb[ti + 2] = 0; tb[ti + 3] = 0; } else { tb[ti] = fr; tb[ti + 1] = fg; tb[ti + 2] = fb; tb[ti + 3] = fa; }
        } else if (mode == 3) {	// check if can be blended
          var fa = sb[si + 3]; var fr = sb[si]; var fg = sb[si + 1]; var
            fb = sb[si + 2];
          var ba = tb[ti + 3]; var br = tb[ti]; var bg = tb[ti + 1]; var
            bb = tb[ti + 2];
          if (fa == ba && fr == br && fg == bg && fb == bb) continue;
          // if(fa!=255 && ba!=0) return false;
          if (fa < 220 && ba > 20) return false;
        }
      }
    }
    return true;
  }

  return {
    decode,
    toRGBA8,
    _paeth,
    _copyTile,
    _bin,
  };
}());

(function () {
  const { _copyTile } = UPNG;
  const { _bin } = UPNG;
  const paeth = UPNG._paeth;
  var crcLib = {
    table: (function () {
		   const tab = new Uint32Array(256);
		   for (let n = 0; n < 256; n++) {
        let c = n;
        for (let k = 0; k < 8; k++) {
          if (c & 1) c = 0xedb88320 ^ (c >>> 1);
          else c >>>= 1;
        }
        tab[n] = c;
      }
      return tab;
    }()),
    update(c, buf, off, len) {
      for (let i = 0; i < len; i++) c = crcLib.table[(c ^ buf[off + i]) & 0xff] ^ (c >>> 8);
      return c;
    },
    crc(b, o, l) { return crcLib.update(0xffffffff, b, o, l) ^ 0xffffffff; },
  };

  function addErr(er, tg, ti, f) {
    tg[ti] += (er[0] * f) >> 4; tg[ti + 1] += (er[1] * f) >> 4; tg[ti + 2] += (er[2] * f) >> 4; tg[ti + 3] += (er[3] * f) >> 4;
  }
  function N(x) { return Math.max(0, Math.min(255, x)); }
  function D(a, b) {
    const dr = a[0] - b[0]; const dg = a[1] - b[1]; const db = a[2] - b[2]; const
      da = a[3] - b[3]; return (dr * dr + dg * dg + db * db + da * da);
  }

  // MTD: 0: None, 1: floyd-steinberg, 2: Bayer
  function dither(sb, w, h, plte, tb, oind, MTD) {
    if (MTD == null) MTD = 1;

    const pc = plte.length; const nplt = []; const
      rads = [];
    for (var i = 0; i < pc; i++) {
      const c = plte[i];
      nplt.push([((c >>> 0) & 255), ((c >>> 8) & 255), ((c >>> 16) & 255), ((c >>> 24) & 255)]);
    }
    for (var i = 0; i < pc; i++) {
      let ne = 0xffffffff; var
        ni = 0;
      for (var j = 0; j < pc; j++) { var ce = D(nplt[i], nplt[j]); if (j != i && ce < ne) { ne = ce; ni = j; } }
      const hd = Math.sqrt(ne) / 2;
      rads[i] = ~~(hd * hd);
    }

    const tb32 = new Uint32Array(tb.buffer);
    const err = new Int16Array(w * h * 4);

    /*
		var S=2, M = [
			0,2,
		    3,1];  // */
    //*
    const S = 4; const
      M = [
			 0, 8, 2, 10,
		    12, 4, 14, 6,
			 3, 11, 1, 9,
        15, 7, 13, 5]; //* /
    for (var i = 0; i < M.length; i++) M[i] = 255 * (-0.5 + (M[i] + 0.5) / (S * S));

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        var i = (y * w + x) * 4;

        var cc;
        if (MTD != 2) cc = [N(sb[i] + err[i]), N(sb[i + 1] + err[i + 1]), N(sb[i + 2] + err[i + 2]), N(sb[i + 3] + err[i + 3])];
        else {
          var ce = M[(y & (S - 1)) * S + (x & (S - 1))];
          cc = [N(sb[i] + ce), N(sb[i + 1] + ce), N(sb[i + 2] + ce), N(sb[i + 3] + ce)];
        }

        var ni = 0; let
          nd = 0xffffff;
        for (var j = 0; j < pc; j++) {
          const cd = D(cc, nplt[j]);
          if (cd < nd) { nd = cd; ni = j; }
        }

        const nc = nplt[ni];
        const er = [cc[0] - nc[0], cc[1] - nc[1], cc[2] - nc[2], cc[3] - nc[3]];

        if (MTD == 1) {
          // addErr(er, err, i+4, 16);
          if (x != w - 1) addErr(er, err, i + 4, 7);
          if (y != h - 1) {
            if (x != 0) addErr(er, err, i + 4 * w - 4, 3);
								   addErr(er, err, i + 4 * w, 5);
            if (x != w - 1) addErr(er, err, i + 4 * w + 4, 1);
          }//* /
        }
        oind[i >> 2] = ni; tb32[i >> 2] = plte[ni];
      }
    }
  }

  function encode(bufs, w, h, ps, dels, tabs, forbidPlte) {
    if (ps == null) ps = 0;
    if (forbidPlte == null) forbidPlte = false;

    const nimg = compress(bufs, w, h, ps, [false, false, false, 0, forbidPlte, false]);
    compressPNG(nimg, -1);

    return _main(nimg, w, h, dels, tabs);
  }

  function encodeLL(bufs, w, h, cc, ac, depth, dels, tabs) {
    const nimg = { ctype: 0 + (cc == 1 ? 0 : 2) + (ac == 0 ? 0 : 4), depth, frames: [] };

    const time = Date.now();
    const bipp = (cc + ac) * depth; const
      bipl = bipp * w;
    for (let i = 0; i < bufs.length; i++) {
      nimg.frames.push({
        rect: {
          x: 0, y: 0, width: w, height: h,
        },
        img: new Uint8Array(bufs[i]),
        blend: 0,
        dispose: 1,
        bpp: Math.ceil(bipp / 8),
        bpl: Math.ceil(bipl / 8),
      });
    }

    compressPNG(nimg, 0, true);

    const out = _main(nimg, w, h, dels, tabs);
    return out;
  }

  function _main(nimg, w, h, dels, tabs) {
    if (tabs == null) tabs = {};
    const { crc } = crcLib;
    const wUi = _bin.writeUint;
    const wUs = _bin.writeUshort;
    const wAs = _bin.writeASCII;
    let offset = 8; const anim = nimg.frames.length > 1; let
      pltAlpha = false;

    let cicc;

    let leng = 8 + (16 + 5 + 4) /* + (9+4) */ + (anim ? 20 : 0);
    if (tabs.sRGB != null) leng += 8 + 1 + 4;
    if (tabs.pHYs != null) leng += 8 + 9 + 4;
    if (tabs.iCCP != null) { cicc = pako.deflate(tabs.iCCP); leng += 8 + 11 + 2 + cicc.length + 4; }
    if (nimg.ctype == 3) {
      var dl = nimg.plte.length;
      for (var i = 0; i < dl; i++) if ((nimg.plte[i] >>> 24) != 255) pltAlpha = true;
      leng += (8 + dl * 3 + 4) + (pltAlpha ? (8 + dl * 1 + 4) : 0);
    }
    for (var j = 0; j < nimg.frames.length; j++) {
      var fr = nimg.frames[j];
      if (anim) leng += 38;
      leng += fr.cimg.length + 12;
      if (j != 0) leng += 4;
    }
    leng += 12;

    const data = new Uint8Array(leng);
    const wr = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
    for (var i = 0; i < 8; i++) data[i] = wr[i];

    wUi(data, offset, 13); offset += 4;
    wAs(data, offset, 'IHDR'); offset += 4;
    wUi(data, offset, w); offset += 4;
    wUi(data, offset, h); offset += 4;
    data[offset] = nimg.depth; offset++; // depth
    data[offset] = nimg.ctype; offset++; // ctype
    data[offset] = 0; offset++; // compress
    data[offset] = 0; offset++; // filter
    data[offset] = 0; offset++; // interlace
    wUi(data, offset, crc(data, offset - 17, 17)); offset += 4; // crc

    // 13 bytes to say, that it is sRGB
    if (tabs.sRGB != null) {
      wUi(data, offset, 1); offset += 4;
      wAs(data, offset, 'sRGB'); offset += 4;
      data[offset] = tabs.sRGB; offset++;
      wUi(data, offset, crc(data, offset - 5, 5)); offset += 4; // crc
    }
    if (tabs.iCCP != null) {
      const sl = 11 + 2 + cicc.length;
      wUi(data, offset, sl); offset += 4;
      wAs(data, offset, 'iCCP'); offset += 4;
      wAs(data, offset, 'ICC profile'); offset += 11; offset += 2;
      data.set(cicc, offset); offset += cicc.length;
      wUi(data, offset, crc(data, offset - (sl + 4), sl + 4)); offset += 4; // crc
    }
    if (tabs.pHYs != null) {
      wUi(data, offset, 9); offset += 4;
      wAs(data, offset, 'pHYs'); offset += 4;
      wUi(data, offset, tabs.pHYs[0]); offset += 4;
      wUi(data, offset, tabs.pHYs[1]); offset += 4;
      data[offset] = tabs.pHYs[2];			offset++;
      wUi(data, offset, crc(data, offset - 13, 13)); offset += 4; // crc
    }

    if (anim) {
      wUi(data, offset, 8); offset += 4;
      wAs(data, offset, 'acTL'); offset += 4;
      wUi(data, offset, nimg.frames.length); offset += 4;
      wUi(data, offset, tabs.loop != null ? tabs.loop : 0); offset += 4;
      wUi(data, offset, crc(data, offset - 12, 12)); offset += 4; // crc
    }

    if (nimg.ctype == 3) {
      var dl = nimg.plte.length;
      wUi(data, offset, dl * 3); offset += 4;
      wAs(data, offset, 'PLTE'); offset += 4;
      for (var i = 0; i < dl; i++) {
        const ti = i * 3; const c = nimg.plte[i]; const r = (c) & 255; const g = (c >>> 8) & 255; const
          b = (c >>> 16) & 255;
        data[offset + ti + 0] = r; data[offset + ti + 1] = g; data[offset + ti + 2] = b;
      }
      offset += dl * 3;
      wUi(data, offset, crc(data, offset - dl * 3 - 4, dl * 3 + 4)); offset += 4; // crc

      if (pltAlpha) {
        wUi(data, offset, dl); offset += 4;
        wAs(data, offset, 'tRNS'); offset += 4;
        for (var i = 0; i < dl; i++) data[offset + i] = (nimg.plte[i] >>> 24) & 255;
        offset += dl;
        wUi(data, offset, crc(data, offset - dl - 4, dl + 4)); offset += 4; // crc
      }
    }

    let fi = 0;
    for (var j = 0; j < nimg.frames.length; j++) {
      var fr = nimg.frames[j];
      if (anim) {
        wUi(data, offset, 26); offset += 4;
        wAs(data, offset, 'fcTL'); offset += 4;
        wUi(data, offset, fi++); offset += 4;
        wUi(data, offset, fr.rect.width); offset += 4;
        wUi(data, offset, fr.rect.height); offset += 4;
        wUi(data, offset, fr.rect.x); offset += 4;
        wUi(data, offset, fr.rect.y); offset += 4;
        wUs(data, offset, dels[j]); offset += 2;
        wUs(data, offset, 1000); offset += 2;
        data[offset] = fr.dispose; offset++;	// dispose
        data[offset] = fr.blend; offset++;	// blend
        wUi(data, offset, crc(data, offset - 30, 30)); offset += 4; // crc
      }

      const imgd = fr.cimg; var
        dl = imgd.length;
      wUi(data, offset, dl + (j == 0 ? 0 : 4)); offset += 4;
      const ioff = offset;
      wAs(data, offset, (j == 0) ? 'IDAT' : 'fdAT'); offset += 4;
      if (j != 0) { wUi(data, offset, fi++); offset += 4; }
      data.set(imgd, offset);
      offset += dl;
      wUi(data, offset, crc(data, ioff, offset - ioff)); offset += 4; // crc
    }

    wUi(data, offset, 0); offset += 4;
    wAs(data, offset, 'IEND'); offset += 4;
    wUi(data, offset, crc(data, offset - 4, 4)); offset += 4; // crc

    return data.buffer;
  }

  function compressPNG(out, filter, levelZero) {
    for (let i = 0; i < out.frames.length; i++) {
      const frm = out.frames[i]; const nw = frm.rect.width; const
        nh = frm.rect.height;
      const fdata = new Uint8Array(nh * frm.bpl + nh);
      frm.cimg = _filterZero(frm.img, nh, frm.bpp, frm.bpl, fdata, filter, levelZero);
    }
  }

  function compress(bufs, w, h, ps, prms) // prms:  onlyBlend, minBits, forbidPlte
  {
    // var time = Date.now();
    const onlyBlend = prms[0]; const evenCrd = prms[1]; const forbidPrev = prms[2]; const minBits = prms[3]; const forbidPlte = prms[4]; const
      dith = prms[5];

    let ctype = 6; let depth = 8; let
      alphaAnd = 255;

    for (var j = 0; j < bufs.length; j++) { // when not quantized, other frames can contain colors, that are not in an initial frame
      const img = new Uint8Array(bufs[j]); var
        ilen = img.length;
      for (var i = 0; i < ilen; i += 4) alphaAnd &= img[i + 3];
    }
    const gotAlpha = (alphaAnd != 255);

    // console.log("alpha check", Date.now()-time);  time = Date.now();

    // var brute = gotAlpha && forGIF;		// brute : frames can only be copied, not "blended"
    const frms = framize(bufs, w, h, onlyBlend, evenCrd, forbidPrev);
    // console.log("framize", Date.now()-time);  time = Date.now();

    const cmap = {}; const plte = []; const
      inds = [];

    if (ps != 0) {
      const nbufs = []; for (var i = 0; i < frms.length; i++) nbufs.push(frms[i].img.buffer);

      const abuf = concatRGBA(nbufs); const
        qres = quantize(abuf, ps);

      for (var i = 0; i < qres.plte.length; i++) plte.push(qres.plte[i].est.rgba);

      let cof = 0;
      for (var i = 0; i < frms.length; i++) {
        var frm = frms[i]; const bln = frm.img.length; var
          ind = new Uint8Array(qres.inds.buffer, cof >> 2, bln >> 2); inds.push(ind);
        const bb = new Uint8Array(qres.abuf, cof, bln);

        // console.log(frm.img, frm.width, frm.height);
        // var time = Date.now();
        if (dith) dither(frm.img, frm.rect.width, frm.rect.height, plte, bb, ind);
        // console.log(Date.now()-time);
        frm.img.set(bb); cof += bln;
      }

      // console.log("quantize", Date.now()-time);  time = Date.now();
    } else {
      // what if ps==0, but there are <=256 colors?  we still need to detect, if the palette could be used
      for (var j = 0; j < frms.length; j++) { // when not quantized, other frames can contain colors, that are not in an initial frame
        var frm = frms[j]; const img32 = new Uint32Array(frm.img.buffer); var nw = frm.rect.width; var
          ilen = img32.length;
        var ind = new Uint8Array(ilen); inds.push(ind);
        for (var i = 0; i < ilen; i++) {
          const c = img32[i];
          if (i != 0 && c == img32[i - 1]) ind[i] = ind[i - 1];
          else if (i > nw && c == img32[i - nw]) ind[i] = ind[i - nw];
          else {
            let cmc = cmap[c];
            if (cmc == null) { cmap[c] = cmc = plte.length; plte.push(c); if (plte.length >= 300) break; }
            ind[i] = cmc;
          }
        }
      }
      // console.log("make palette", Date.now()-time);  time = Date.now();
    }

    const cc = plte.length; // console.log("colors:",cc);
    if (cc <= 256 && forbidPlte == false) {
      if (cc <= 2) depth = 1; else if (cc <= 4) depth = 2; else if (cc <= 16) depth = 4; else depth = 8;
      depth = Math.max(depth, minBits);
    }

    for (var j = 0; j < frms.length; j++) {
      var frm = frms[j]; const nx = frm.rect.x; const ny = frm.rect.y; var nw = frm.rect.width; const
        nh = frm.rect.height;
      let cimg = frm.img; const
        cimg32 = new Uint32Array(cimg.buffer);
      let bpl = 4 * nw; let
        bpp = 4;
      if (cc <= 256 && forbidPlte == false) {
        bpl = Math.ceil(depth * nw / 8);
        var nimg = new Uint8Array(bpl * nh);
        const inj = inds[j];
        for (let y = 0; y < nh; y++) {
          var i = y * bpl; const
            ii = y * nw;
          if (depth == 8) for (var x = 0; x < nw; x++) nimg[i + (x)] = (inj[ii + x]);
          else if (depth == 4) for (var x = 0; x < nw; x++) nimg[i + (x >> 1)] |= (inj[ii + x] << (4 - (x & 1) * 4));
          else if (depth == 2) for (var x = 0; x < nw; x++) nimg[i + (x >> 2)] |= (inj[ii + x] << (6 - (x & 3) * 2));
          else if (depth == 1) for (var x = 0; x < nw; x++) nimg[i + (x >> 3)] |= (inj[ii + x] << (7 - (x & 7) * 1));
        }
        cimg = nimg; ctype = 3; bpp = 1;
      } else if (gotAlpha == false && frms.length == 1) {	// some next "reduced" frames may contain alpha for blending
        var nimg = new Uint8Array(nw * nh * 3); const
          area = nw * nh;
        for (var i = 0; i < area; i++) {
          const ti = i * 3; const
            qi = i * 4; nimg[ti] = cimg[qi]; nimg[ti + 1] = cimg[qi + 1]; nimg[ti + 2] = cimg[qi + 2];
        }
        cimg = nimg; ctype = 2; bpp = 3; bpl = 3 * nw;
      }
      frm.img = cimg; frm.bpl = bpl; frm.bpp = bpp;
    }
    // console.log("colors => palette indices", Date.now()-time);  time = Date.now();

    return {
      ctype, depth, plte, frames: frms,
    };
  }
  function framize(bufs, w, h, alwaysBlend, evenCrd, forbidPrev) {
    /*  DISPOSE
			- 0 : no change
			- 1 : clear to transparent
			- 2 : retstore to content before rendering (previous frame disposed)
			BLEND
			- 0 : replace
			- 1 : blend
		*/
    const frms = [];
    for (var j = 0; j < bufs.length; j++) {
      const cimg = new Uint8Array(bufs[j]); const
        cimg32 = new Uint32Array(cimg.buffer);
      var nimg;

      let nx = 0; let ny = 0; let nw = w; let nh = h; let
        blend = alwaysBlend ? 1 : 0;
      if (j != 0) {
        const tlim = (forbidPrev || alwaysBlend || j == 1 || frms[j - 2].dispose != 0) ? 1 : 2; let tstp = 0; let
          tarea = 1e9;
        for (let it = 0; it < tlim; it++) {
          var pimg = new Uint8Array(bufs[j - 1 - it]); const
            p32 = new Uint32Array(bufs[j - 1 - it]);
          let mix = w; let miy = h; let max = -1; let may = -1;
          for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
              var i = y * w + x;
              if (cimg32[i] != p32[i]) {
                if (x < mix) mix = x; if (x > max) max = x;
                if (y < miy) miy = y; if (y > may) may = y;
              }
            }
          }
          if (max == -1) mix = miy = max = may = 0;
          if (evenCrd) { if ((mix & 1) == 1)mix--; if ((miy & 1) == 1)miy--; }
          const sarea = (max - mix + 1) * (may - miy + 1);
          if (sarea < tarea) {
            tarea = sarea; tstp = it;
            nx = mix; ny = miy; nw = max - mix + 1; nh = may - miy + 1;
          }
        }

        // alwaysBlend: pokud zjistím, že blendit nelze, nastavím předchozímu snímku dispose=1. Zajistím, aby obsahoval můj obdélník.
        var pimg = new Uint8Array(bufs[j - 1 - tstp]);
        if (tstp == 1) frms[j - 1].dispose = 2;

        nimg = new Uint8Array(nw * nh * 4);
        _copyTile(pimg, w, h, nimg, nw, nh, -nx, -ny, 0);

        blend = _copyTile(cimg, w, h, nimg, nw, nh, -nx, -ny, 3) ? 1 : 0;
        if (blend == 1) {
          _prepareDiff(cimg, w, h, nimg, {
            x: nx, y: ny, width: nw, height: nh,
          });
        } else _copyTile(cimg, w, h, nimg, nw, nh, -nx, -ny, 0);
      } else nimg = cimg.slice(0);	// img may be rewritten further ... don't rewrite input

      frms.push({
        rect: {
          x: nx, y: ny, width: nw, height: nh,
        },
        img: nimg,
        blend,
        dispose: 0,
      });
    }

    if (alwaysBlend) {
      for (var j = 0; j < frms.length; j++) {
        var frm = frms[j]; if (frm.blend == 1) continue;
        const r0 = frm.rect; const
          r1 = frms[j - 1].rect;
        const miX = Math.min(r0.x, r1.x); const
          miY = Math.min(r0.y, r1.y);
        const maX = Math.max(r0.x + r0.width, r1.x + r1.width); const
          maY = Math.max(r0.y + r0.height, r1.y + r1.height);
        const r = {
          x: miX, y: miY, width: maX - miX, height: maY - miY,
        };

        frms[j - 1].dispose = 1;
        if (j - 1 != 0) _updateFrame(bufs, w, h, frms, j - 1, r, evenCrd);
        _updateFrame(bufs, w, h, frms, j, r, evenCrd);
      }
    }
    let area = 0;
    if (bufs.length != 1) {
      for (var i = 0; i < frms.length; i++) {
        var frm = frms[i];
        area += frm.rect.width * frm.rect.height;
      // if(i==0 || frm.blend!=1) continue;
      // var ob = new Uint8Array(
      // console.log(frm.blend, frm.dispose, frm.rect);
      }
    }
    // if(area!=0) console.log(area);
    return frms;
  }
  function _updateFrame(bufs, w, h, frms, i, r, evenCrd) {
    const U8 = Uint8Array; const
      U32 = Uint32Array;
    const pimg = new U8(bufs[i - 1]); const pimg32 = new U32(bufs[i - 1]); const
      nimg = i + 1 < bufs.length ? new U8(bufs[i + 1]) : null;
    const cimg = new U8(bufs[i]); const
      cimg32 = new U32(cimg.buffer);

    let mix = w; let miy = h; let max = -1; let may = -1;
    for (let y = 0; y < r.height; y++) {
      for (let x = 0; x < r.width; x++) {
        const cx = r.x + x; const
          cy = r.y + y;
        const j = cy * w + cx; const
          cc = cimg32[j];
        // no need to draw transparency, or to dispose it. Or, if writing the same color and the next one does not need transparency.
        if (cc == 0 || (frms[i - 1].dispose == 0 && pimg32[j] == cc && (nimg == null || nimg[j * 4 + 3] != 0))/**/) {} else {
          if (cx < mix) mix = cx; if (cx > max) max = cx;
          if (cy < miy) miy = cy; if (cy > may) may = cy;
        }
      }
    }
    if (max == -1) mix = miy = max = may = 0;
    if (evenCrd) { if ((mix & 1) == 1)mix--; if ((miy & 1) == 1)miy--; }
    r = {
      x: mix, y: miy, width: max - mix + 1, height: may - miy + 1,
    };

    const fr = frms[i]; fr.rect = r; fr.blend = 1; fr.img = new Uint8Array(r.width * r.height * 4);
    if (frms[i - 1].dispose == 0) {
      _copyTile(pimg, w, h, fr.img, r.width, r.height, -r.x, -r.y, 0);
      _prepareDiff(cimg, w, h, fr.img, r);
    } else _copyTile(cimg, w, h, fr.img, r.width, r.height, -r.x, -r.y, 0);
  }
  function _prepareDiff(cimg, w, h, nimg, rec) {
    _copyTile(cimg, w, h, nimg, rec.width, rec.height, -rec.x, -rec.y, 2);
  }

  function _filterZero(img, h, bpp, bpl, data, filter, levelZero) {
    const fls = []; let
      ftry = [0, 1, 2, 3, 4];
    if (filter != -1) ftry = [filter];
    else if (h * bpl > 500000 || bpp == 1) ftry = [0];
    let opts; if (levelZero) opts = { level: 0 };

    const CMPR = UZIP;

    const time = Date.now();
    for (var i = 0; i < ftry.length; i++) {
      for (let y = 0; y < h; y++) _filterLine(data, img, y, bpl, bpp, ftry[i]);
      // var nimg = new Uint8Array(data.length);
      // var sz = UZIP.F.deflate(data, nimg);  fls.push(nimg.slice(0,sz));
      // var dfl = pako["deflate"](data), dl=dfl.length-4;
      // var crc = (dfl[dl+3]<<24)|(dfl[dl+2]<<16)|(dfl[dl+1]<<8)|(dfl[dl+0]<<0);
      // console.log(crc, UZIP.adler(data,2,data.length-6));
      fls.push(CMPR.deflate(data, opts));
    }

    let ti; let
      tsize = 1e9;
    for (var i = 0; i < fls.length; i++) if (fls[i].length < tsize) { ti = i; tsize = fls[i].length; }
    return fls[ti];
  }
  function _filterLine(data, img, y, bpl, bpp, type) {
    const i = y * bpl; let
      di = i + y;
    data[di] = type; di++;

    if (type == 0) {
      if (bpl < 500) for (var x = 0; x < bpl; x++) data[di + x] = img[i + x];
      else data.set(new Uint8Array(img.buffer, i, bpl), di);
    } else if (type == 1) {
      for (var x = 0; x < bpp; x++) data[di + x] = img[i + x];
      for (var x = bpp; x < bpl; x++) data[di + x] = (img[i + x] - img[i + x - bpp] + 256) & 255;
    } else if (y == 0) {
      for (var x = 0; x < bpp; x++) data[di + x] = img[i + x];

      if (type == 2) for (var x = bpp; x < bpl; x++) data[di + x] = img[i + x];
      if (type == 3) for (var x = bpp; x < bpl; x++) data[di + x] = (img[i + x] - (img[i + x - bpp] >> 1) + 256) & 255;
      if (type == 4) for (var x = bpp; x < bpl; x++) data[di + x] = (img[i + x] - paeth(img[i + x - bpp], 0, 0) + 256) & 255;
    } else {
      if (type == 2) { for (var x = 0; x < bpl; x++) data[di + x] = (img[i + x] + 256 - img[i + x - bpl]) & 255; }
      if (type == 3) {
        for (var x = 0; x < bpp; x++) data[di + x] = (img[i + x] + 256 - (img[i + x - bpl] >> 1)) & 255;
						  for (var x = bpp; x < bpl; x++) data[di + x] = (img[i + x] + 256 - ((img[i + x - bpl] + img[i + x - bpp]) >> 1)) & 255;
      }
      if (type == 4) {
        for (var x = 0; x < bpp; x++) data[di + x] = (img[i + x] + 256 - paeth(0, img[i + x - bpl], 0)) & 255;
						  for (var x = bpp; x < bpl; x++) data[di + x] = (img[i + x] + 256 - paeth(img[i + x - bpp], img[i + x - bpl], img[i + x - bpp - bpl])) & 255;
      }
    }
  }

  function quantize(abuf, ps, doKmeans) {
    const time = Date.now();
    const sb = new Uint8Array(abuf); const tb = sb.slice(0); const
      tb32 = new Uint32Array(tb.buffer);

    const KD = getKDtree(tb, ps);
    const root = KD[0]; const
     leafs = KD[1];
     const K = leafs.length;

    // console.log(Date.now()-time, "tree made");  time = Date.now();

    const cl32 = new Uint32Array(K); const
      clr8 = new Uint8Array(cl32.buffer);
    for (var i = 0; i < K; i++) cl32[i] = leafs[i].est.rgba;

    const len = sb.length;

    const inds = new Uint8Array(len >> 2); let
      nd;
    if (K <= 60) { findNearest(sb, inds, clr8); remap(inds, tb32, cl32); } else if (sb.length < 32e6) // precise, but slow :(
    // for(var j=0; j<4; j++)
    {
      for (var i = 0; i < len; i += 4) {
        var r = sb[i] * (1 / 255); var g = sb[i + 1] * (1 / 255); var b = sb[i + 2] * (1 / 255); var
          a = sb[i + 3] * (1 / 255);

        nd = getNearest(root, r, g, b, a);
        inds[i >> 2] = nd.ind; tb32[i >> 2] = nd.est.rgba;
      }
    } else {
      for (var i = 0; i < len; i += 4) {
        var r = sb[i] * (1 / 255); var g = sb[i + 1] * (1 / 255); var b = sb[i + 2] * (1 / 255); var
          a = sb[i + 3] * (1 / 255);

        nd = root; while (nd.left) nd = (planeDst(nd.est, r, g, b, a) <= 0) ? nd.left : nd.right;
        inds[i >> 2] = nd.ind; tb32[i >> 2] = nd.est.rgba;
      }
    }

    // console.log(Date.now()-time, "nearest found");  time = Date.now();

    if (doKmeans || sb.length * K < 10 * 4e6) {
      let le = 1e9;
      for (var i = 0; i < 10; i++) {
        const ce = kmeans(sb, inds, clr8); // console.log(i,ce);
        if (ce / le > 0.997) break; le = ce;
      }
      for (var i = 0; i < K; i++) leafs[i].est.rgba = cl32[i];
      remap(inds, tb32, cl32);
      // console.log(Date.now()-time, "k-means");
    }

    return { abuf: tb.buffer, inds, plte: leafs };
  }

  function remap(inds, tb32, pl32) { for (let i = 0; i < inds.length; i++) tb32[i] = pl32[inds[i]]; }
  function kmeans(sb, inds, plte) {
    updatePalette(sb, inds, plte);
    const err = findNearest(sb, inds, plte);
    return err;
  }

  function updatePalette(sb, inds, plte) {
    const K = plte.length >>> 2;
    const sums = new Uint32Array(K * 4); const
      cnts = new Uint32Array(K);

    for (var i = 0; i < sb.length; i += 4) {
      const ind = inds[i >>> 2]; const
        qi = ind * 4;
      cnts[ind]++;
      sums[qi] += sb[i]; sums[qi + 1] += sb[i + 1];
      sums[qi + 2] += sb[i + 2]; sums[qi + 3] += sb[i + 3];
    }
    for (var i = 0; i < plte.length; i++) plte[i] = Math.round(sums[i] / cnts[i >>> 2]);
  }

  function findNearest(sb, inds, plte) {
    let terr = 0; const
      K = plte.length >>> 2;

    const nd = []; // squared half-distance to the nearest color
    for (var i = 0; i < K; i++) {
      var qi = i * 4;
      var r = plte[qi]; var g = plte[qi + 1]; var b = plte[qi + 2]; var a = plte[qi + 3]; var ti = 0; var
        te = 1e9;
      for (var j = 0; j < K; j++) {
        if (i == j) continue;
        const qj = j * 4; var dr = r - plte[qj]; var dg = g - plte[qj + 1]; var db = b - plte[qj + 2]; var
          da = a - plte[qj + 3];
        var err = dr * dr + dg * dg + db * db + da * da;
        if (err < te) { te = err; ti = j; }
      }
      nd[i] = Math.sqrt(te) * 0.5; nd[i] = nd[i] * nd[i];
    }

    for (var i = 0; i < sb.length; i += 4) {
      var r = sb[i]; var g = sb[i + 1]; var b = sb[i + 2]; var
        a = sb[i + 3];
      var ti = inds[i >>> 2]; var qi = ti * 4; var dr = r - plte[qi]; var dg = g - plte[qi + 1]; var db = b - plte[qi + 2]; var da = a - plte[qi + 3]; var
        te = dr * dr + dg * dg + db * db + da * da;
      if (te > nd[ti]) {
        for (var j = 0; j < K; j++) {
          qi = j * 4; dr = r - plte[qi]; dg = g - plte[qi + 1]; db = b - plte[qi + 2]; da = a - plte[qi + 3];
          var err = dr * dr + dg * dg + db * db + da * da;
          if (err < te) { te = err; ti = j; if (te < nd[j]) break; }
        }
      }
      inds[i >>> 2] = ti;
      terr += te;
    }
    return terr / (sb.length >>> 2);
  }

  function getKDtree(nimg, ps, err) {
    if (err == null) err = 0.0001;
    const nimg32 = new Uint32Array(nimg.buffer);

    const root = {
      i0: 0, i1: nimg.length, bst: null, est: null, tdst: 0, left: null, right: null,
    }; // basic statistic, extra statistic
    root.bst = stats(nimg, root.i0, root.i1); root.est = estats(root.bst);
    const leafs = [root];

    while (leafs.length < ps) {
      let maxL = 0; let
        mi = 0;
      for (var i = 0; i < leafs.length; i++) if (leafs[i].est.L > maxL) { maxL = leafs[i].est.L; mi = i; }
      if (maxL < err) break;
      const node = leafs[mi];

      const s0 = splitPixels(nimg, nimg32, node.i0, node.i1, node.est.e, node.est.eMq255);
      const s0wrong = (node.i0 >= s0 || node.i1 <= s0);
      // console.log(maxL, leafs.length, mi);
      if (s0wrong) { node.est.L = 0; continue; }

      const ln = {
        i0: node.i0, i1: s0, bst: null, est: null, tdst: 0, left: null, right: null,
      }; ln.bst = stats(nimg, ln.i0, ln.i1);
      ln.est = estats(ln.bst);
      const rn = {
        i0: s0, i1: node.i1, bst: null, est: null, tdst: 0, left: null, right: null,
      }; rn.bst = { R: [], m: [], N: node.bst.N - ln.bst.N };
      for (var i = 0; i < 16; i++) rn.bst.R[i] = node.bst.R[i] - ln.bst.R[i];
      for (var i = 0; i < 4; i++) rn.bst.m[i] = node.bst.m[i] - ln.bst.m[i];
      rn.est = estats(rn.bst);

      node.left = ln; node.right = rn;
      leafs[mi] = ln; leafs.push(rn);
    }
    leafs.sort((a, b) => b.bst.N - a.bst.N);
    for (var i = 0; i < leafs.length; i++) leafs[i].ind = i;
    return [root, leafs];
  }

  function getNearest(nd, r, g, b, a) {
    if (nd.left == null) { nd.tdst = dist(nd.est.q, r, g, b, a); return nd; }
    const pd = planeDst(nd.est, r, g, b, a);

    let node0 = nd.left; let
      node1 = nd.right;
    if (pd > 0) { node0 = nd.right; node1 = nd.left; }

    const ln = getNearest(node0, r, g, b, a);
    if (ln.tdst <= pd * pd) return ln;
    const rn = getNearest(node1, r, g, b, a);
    return rn.tdst < ln.tdst ? rn : ln;
  }
  function planeDst(est, r, g, b, a) { const { e } = est; return e[0] * r + e[1] * g + e[2] * b + e[3] * a - est.eMq; }
  function dist(q, r, g, b, a) {
    const d0 = r - q[0]; const d1 = g - q[1]; const d2 = b - q[2]; const
      d3 = a - q[3]; return d0 * d0 + d1 * d1 + d2 * d2 + d3 * d3;
  }

  function splitPixels(nimg, nimg32, i0, i1, e, eMq) {
    i1 -= 4;
    const shfs = 0;
    while (i0 < i1) {
      while (vecDot(nimg, i0, e) <= eMq) i0 += 4;
      while (vecDot(nimg, i1, e) > eMq) i1 -= 4;
      if (i0 >= i1) break;

      const t = nimg32[i0 >> 2]; nimg32[i0 >> 2] = nimg32[i1 >> 2]; nimg32[i1 >> 2] = t;

      i0 += 4; i1 -= 4;
    }
    while (vecDot(nimg, i0, e) > eMq) i0 -= 4;
    return i0 + 4;
  }
  function vecDot(nimg, i, e) {
    return nimg[i] * e[0] + nimg[i + 1] * e[1] + nimg[i + 2] * e[2] + nimg[i + 3] * e[3];
  }
  function stats(nimg, i0, i1) {
    const R = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    const m = [0, 0, 0, 0];
    const N = (i1 - i0) >> 2;
    for (let i = i0; i < i1; i += 4) {
      const r = nimg[i] * (1 / 255); const g = nimg[i + 1] * (1 / 255); const b = nimg[i + 2] * (1 / 255); const
        a = nimg[i + 3] * (1 / 255);
      // var r = nimg[i], g = nimg[i+1], b = nimg[i+2], a = nimg[i+3];
      m[0] += r; m[1] += g; m[2] += b; m[3] += a;

      R[0] += r * r; R[1] += r * g; R[2] += r * b; R[3] += r * a;
						   R[5] += g * g; R[6] += g * b; R[7] += g * a;
										  R[10] += b * b; R[11] += b * a;
														 R[15] += a * a;
    }
    R[4] = R[1]; R[8] = R[2]; R[9] = R[6]; R[12] = R[3]; R[13] = R[7]; R[14] = R[11];

    return { R, m, N };
  }
  function estats(stats) {
    const { R } = stats;
    const { m } = stats;
    const { N } = stats;

    // when all samples are equal, but N is large (millions), the Rj can be non-zero ( 0.0003.... - precission error)
    const m0 = m[0]; const m1 = m[1]; const m2 = m[2]; const m3 = m[3]; const
      iN = (N == 0 ? 0 : 1 / N);
    const Rj = [
      R[0] - m0 * m0 * iN, R[1] - m0 * m1 * iN, R[2] - m0 * m2 * iN, R[3] - m0 * m3 * iN,
      R[4] - m1 * m0 * iN, R[5] - m1 * m1 * iN, R[6] - m1 * m2 * iN, R[7] - m1 * m3 * iN,
      R[8] - m2 * m0 * iN, R[9] - m2 * m1 * iN, R[10] - m2 * m2 * iN, R[11] - m2 * m3 * iN,
      R[12] - m3 * m0 * iN, R[13] - m3 * m1 * iN, R[14] - m3 * m2 * iN, R[15] - m3 * m3 * iN,
    ];

    const A = Rj; const
      M = M4;
    let b = [Math.random(), Math.random(), Math.random(), Math.random()]; let mi = 0; let
      tmi = 0;

    if (N != 0) {
      for (let i = 0; i < 16; i++) {
        b = M.multVec(A, b); tmi = Math.sqrt(M.dot(b, b)); b = M.sml(1 / tmi, b);
        if (i != 0 && Math.abs(tmi - mi) < 1e-9) break; mi = tmi;
      }
    }
    // b = [0,0,1,0];  mi=N;
    const q = [m0 * iN, m1 * iN, m2 * iN, m3 * iN];
    const eMq255 = M.dot(M.sml(255, q), b);

    return {
      Cov: Rj,
      q,
      e: b,
      L: mi,
      eMq255,
      eMq: M.dot(b, q),
      rgba: (((Math.round(255 * q[3]) << 24) | (Math.round(255 * q[2]) << 16) | (Math.round(255 * q[1]) << 8) | (Math.round(255 * q[0]) << 0)) >>> 0),
    };
  }
  var M4 = {
    multVec(m, v) {
      return [
        m[0] * v[0] + m[1] * v[1] + m[2] * v[2] + m[3] * v[3],
        m[4] * v[0] + m[5] * v[1] + m[6] * v[2] + m[7] * v[3],
        m[8] * v[0] + m[9] * v[1] + m[10] * v[2] + m[11] * v[3],
        m[12] * v[0] + m[13] * v[1] + m[14] * v[2] + m[15] * v[3],
      ];
    },
    dot(x, y) { return x[0] * y[0] + x[1] * y[1] + x[2] * y[2] + x[3] * y[3]; },
    sml(a, y) { return [a * y[0], a * y[1], a * y[2], a * y[3]]; },
  };

  function concatRGBA(bufs) {
    let tlen = 0;
    for (var i = 0; i < bufs.length; i++) tlen += bufs[i].byteLength;
    const nimg = new Uint8Array(tlen); let
      noff = 0;
    for (var i = 0; i < bufs.length; i++) {
      const img = new Uint8Array(bufs[i]); const
        il = img.length;
      for (let j = 0; j < il; j += 4) {
        let r = img[j]; let g = img[j + 1]; let b = img[j + 2]; const
          a = img[j + 3];
        if (a == 0) r = g = b = 0;
        nimg[noff + j] = r; nimg[noff + j + 1] = g; nimg[noff + j + 2] = b; nimg[noff + j + 3] = a;
      }
      noff += il;
    }
    return nimg.buffer;
  }

  UPNG.encode = encode;
  UPNG.encodeLL = encodeLL;
  UPNG.encode.compress = compress;
  UPNG.encode.dither = dither;

  UPNG.quantize = quantize;
  UPNG.quantize.findNearest = findNearest;
  UPNG.quantize.getKDtree = getKDtree;
  UPNG.quantize.getNearest = getNearest;
}());

export default UPNG;
