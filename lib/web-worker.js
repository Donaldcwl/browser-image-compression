import * as UZIP from 'uzip';
// eslint-disable-next-line import/no-cycle
import lib from './index';
import compress from './image-compression';
import { getNewCanvasAndCtx, isIOS } from './utils';
import UPNG from './UPNG';
import MAX_CANVAS_SIZE from './config/max-canvas-size';
import BROWSER_NAME from './config/browser-name';

let cnt = 0;
let imageCompressionLibUrl;
let worker;

function createWorker(script) {
  const blobArgs = [];
  if (typeof script === 'function') {
    blobArgs.push(`(${script})()`);
  } else {
    blobArgs.push(script);
  }
  return new Worker(URL.createObjectURL(new Blob(blobArgs)));
}

function createSourceObject(str) {
  // console.log('createSourceObject', str)
  return URL.createObjectURL(new Blob([str], { type: 'application/javascript' }));
}

function stringify(o) {
  return JSON.stringify(o, (key, value) => ((typeof value === 'function') ? `BIC_FN:::(function () { return ${value.toString()} })()` : value));
}

function parse(o) {
  if (typeof o === 'string') return o;
  const result = {};
  Object.entries(o).forEach(([key, value]) => {
    if (typeof value === 'string' && value.startsWith('BIC_FN:::')) {
      try {
        // eslint-disable-next-line no-eval
        result[key] = eval(value.replace(/^BIC_FN:::/, ''));
      } catch (e) {
        if (process.env.BUILD === 'development') {
          console.error(key, e);
        }
        throw e;
      }
    } else {
      result[key] = parse(value);
    }
  });
  return result;
}

function generateLib() {
  // prepare the lib to be used inside WebWorker
  return createSourceObject(`
    // reconstruct library
    function imageCompression (){return (${lib}).apply(null, arguments)}

    imageCompression.getDataUrlFromFile = ${lib.getDataUrlFromFile}
    imageCompression.getFilefromDataUrl = ${lib.getFilefromDataUrl}
    imageCompression.loadImage = ${lib.loadImage}
    imageCompression.drawImageInCanvas = ${lib.drawImageInCanvas}
    imageCompression.drawFileInCanvas = ${lib.drawFileInCanvas}
    imageCompression.canvasToFile = ${lib.canvasToFile}
    imageCompression.getExifOrientation = ${lib.getExifOrientation}
    imageCompression.handleMaxWidthOrHeight = ${lib.handleMaxWidthOrHeight}
    imageCompression.followExifOrientation = ${lib.followExifOrientation}
    imageCompression.cleanupCanvasMemory = ${lib.cleanupCanvasMemory}
    imageCompression.isAutoOrientationInBrowser = ${lib.isAutoOrientationInBrowser}
    imageCompression.approximateBelowMaximumCanvasSizeOfBrowser = ${lib.approximateBelowMaximumCanvasSizeOfBrowser}
    imageCompression.getBrowserName = ${lib.getBrowserName}

    // functions / objects
    getDataUrlFromFile = imageCompression.getDataUrlFromFile
    getFilefromDataUrl = imageCompression.getFilefromDataUrl
    loadImage = imageCompression.loadImage
    drawImageInCanvas = imageCompression.drawImageInCanvas
    drawFileInCanvas = imageCompression.drawFileInCanvas
    canvasToFile = imageCompression.canvasToFile
    getExifOrientation = imageCompression.getExifOrientation
    handleMaxWidthOrHeight = imageCompression.handleMaxWidthOrHeight
    followExifOrientation = imageCompression.followExifOrientation
    cleanupCanvasMemory = imageCompression.cleanupCanvasMemory
    isAutoOrientationInBrowser = imageCompression.isAutoOrientationInBrowser
    approximateBelowMaximumCanvasSizeOfBrowser = imageCompression.approximateBelowMaximumCanvasSizeOfBrowser
    getBrowserName = imageCompression.getBrowserName
    isIOS = ${isIOS}
    
    getNewCanvasAndCtx = ${getNewCanvasAndCtx}
    CustomFileReader = FileReader
    CustomFile = File
    MAX_CANVAS_SIZE = ${JSON.stringify(MAX_CANVAS_SIZE)}
    BROWSER_NAME = ${JSON.stringify(BROWSER_NAME)}
    function compress (){return (${compress}).apply(null, arguments)}

    // core-js
    function _slicedToArray(arr, n) { return arr }
    function _typeof(a) { return typeof a }
    function _objectSpread2(target) {
      for (var i = 1; i < arguments.length; i++) {
        var source = arguments[i] != null ? arguments[i] : {};
  
        Object.assign(target, source)
      }
  
      return target;
    }

    // Libraries
    const parse = ${parse}
    const UPNG = {}
    UPNG.toRGBA8 = ${UPNG.toRGBA8}
    UPNG.toRGBA8.decodeImage = ${UPNG.toRGBA8.decodeImage}
    UPNG.decode = ${UPNG.decode}
    UPNG.decode._decompress = ${UPNG.decode._decompress}
    UPNG.decode._inflate = ${UPNG.decode._inflate}
    UPNG.decode._readInterlace = ${UPNG.decode._readInterlace}
    UPNG.decode._getBPP = ${UPNG.decode._getBPP} 
    UPNG.decode._filterZero = ${UPNG.decode._filterZero}
    UPNG.decode._paeth = ${UPNG.decode._paeth}
    UPNG.decode._IHDR = ${UPNG.decode._IHDR}
    UPNG._bin = parse(${stringify(UPNG._bin)})
    UPNG._copyTile = ${UPNG._copyTile}
    UPNG.encode = ${UPNG.encode}
    UPNG.encodeLL = ${UPNG.encodeLL} 
    UPNG.encode._main = ${UPNG.encode._main}
    UPNG.encode.compressPNG = ${UPNG.encode.compressPNG} 
    UPNG.encode.compress = ${UPNG.encode.compress}
    UPNG.encode.framize = ${UPNG.encode.framize} 
    UPNG.encode._updateFrame = ${UPNG.encode._updateFrame} 
    UPNG.encode._prepareDiff = ${UPNG.encode._prepareDiff} 
    UPNG.encode._filterZero = ${UPNG.encode._filterZero} 
    UPNG.encode._filterLine = ${UPNG.encode._filterLine}
    UPNG.encode.concatRGBA = ${UPNG.encode.concatRGBA}
    UPNG.crc = parse(${stringify(UPNG.crc)})
    UPNG.crc.table = ( function() {
    var tab = new Uint32Array(256);
    for (var n=0; n<256; n++) {
      var c = n;
      for (var k=0; k<8; k++) {
        if (c & 1)  c = 0xedb88320 ^ (c >>> 1);
        else        c = c >>> 1;
      }
      tab[n] = c;  }
    return tab;  })()
    UPNG.quantize = ${UPNG.quantize} 
    UPNG.quantize.getKDtree = ${UPNG.quantize.getKDtree} 
    UPNG.quantize.getNearest = ${UPNG.quantize.getNearest} 
    UPNG.quantize.planeDst = ${UPNG.quantize.planeDst} 
    UPNG.quantize.dist = ${UPNG.quantize.dist}     
    UPNG.quantize.splitPixels = ${UPNG.quantize.splitPixels} 
    UPNG.quantize.vecDot = ${UPNG.quantize.vecDot} 
    UPNG.quantize.stats = ${UPNG.quantize.stats} 
    UPNG.quantize.estats = ${UPNG.quantize.estats}
    UPNG.M4 = parse(${stringify(UPNG.M4)})
    UPNG.encode.concatRGBA = ${UPNG.encode.concatRGBA}
    UPNG.inflateRaw=function(){
    var H={};H.H={};H.H.N=function(N,W){var R=Uint8Array,i=0,m=0,J=0,h=0,Q=0,X=0,u=0,w=0,d=0,v,C;
      if(N[0]==3&&N[1]==0)return W?W:new R(0);var V=H.H,n=V.b,A=V.e,l=V.R,M=V.n,I=V.A,e=V.Z,b=V.m,Z=W==null;
      if(Z)W=new R(N.length>>>2<<5);while(i==0){i=n(N,d,1);m=n(N,d+1,2);d+=3;if(m==0){if((d&7)!=0)d+=8-(d&7);
        var D=(d>>>3)+4,q=N[D-4]|N[D-3]<<8;if(Z)W=H.H.W(W,w+q);W.set(new R(N.buffer,N.byteOffset+D,q),w);d=D+q<<3;
        w+=q;continue}if(Z)W=H.H.W(W,w+(1<<17));if(m==1){v=b.J;C=b.h;X=(1<<9)-1;u=(1<<5)-1}if(m==2){J=A(N,d,5)+257;
        h=A(N,d+5,5)+1;Q=A(N,d+10,4)+4;d+=14;var E=d,j=1;for(var c=0;c<38;c+=2){b.Q[c]=0;b.Q[c+1]=0}for(var c=0;
                                                                                                        c<Q;c++){var K=A(N,d+c*3,3);b.Q[(b.X[c]<<1)+1]=K;if(K>j)j=K}d+=3*Q;M(b.Q,j);I(b.Q,j,b.u);v=b.w;C=b.d;
        d=l(b.u,(1<<j)-1,J+h,N,d,b.v);var r=V.V(b.v,0,J,b.C);X=(1<<r)-1;var S=V.V(b.v,J,h,b.D);u=(1<<S)-1;M(b.C,r);
        I(b.C,r,v);M(b.D,S);I(b.D,S,C)}while(!0){var T=v[e(N,d)&X];d+=T&15;var p=T>>>4;if(p>>>8==0){W[w++]=p}else if(p==256){break}else{var z=w+p-254;
        if(p>264){var _=b.q[p-257];z=w+(_>>>3)+A(N,d,_&7);d+=_&7}var $=C[e(N,d)&u];d+=$&15;var s=$>>>4,Y=b.c[s],a=(Y>>>4)+n(N,d,Y&15);
        d+=Y&15;while(w<z){W[w]=W[w++-a];W[w]=W[w++-a];W[w]=W[w++-a];W[w]=W[w++-a]}w=z}}}return W.length==w?W:W.slice(0,w)};
      H.H.W=function(N,W){var R=N.length;if(W<=R)return N;var V=new Uint8Array(R<<1);V.set(N,0);return V};
      H.H.R=function(N,W,R,V,n,A){var l=H.H.e,M=H.H.Z,I=0;while(I<R){var e=N[M(V,n)&W];n+=e&15;var b=e>>>4;
        if(b<=15){A[I]=b;I++}else{var Z=0,m=0;if(b==16){m=3+l(V,n,2);n+=2;Z=A[I-1]}else if(b==17){m=3+l(V,n,3);
          n+=3}else if(b==18){m=11+l(V,n,7);n+=7}var J=I+m;while(I<J){A[I]=Z;I++}}}return n};H.H.V=function(N,W,R,V){var n=0,A=0,l=V.length>>>1;
        while(A<R){var M=N[A+W];V[A<<1]=0;V[(A<<1)+1]=M;if(M>n)n=M;A++}while(A<l){V[A<<1]=0;V[(A<<1)+1]=0;A++}return n};
      H.H.n=function(N,W){var R=H.H.m,V=N.length,n,A,l,M,I,e=R.j;for(var M=0;M<=W;M++)e[M]=0;for(M=1;M<V;M+=2)e[N[M]]++;
        var b=R.K;n=0;e[0]=0;for(A=1;A<=W;A++){n=n+e[A-1]<<1;b[A]=n}for(l=0;l<V;l+=2){I=N[l+1];if(I!=0){N[l]=b[I];
          b[I]++}}};H.H.A=function(N,W,R){var V=N.length,n=H.H.m,A=n.r;for(var l=0;l<V;l+=2)if(N[l+1]!=0){var M=l>>1,I=N[l+1],e=M<<4|I,b=W-I,Z=N[l]<<b,m=Z+(1<<b);
        while(Z!=m){var J=A[Z]>>>15-W;R[J]=e;Z++}}};H.H.l=function(N,W){var R=H.H.m.r,V=15-W;for(var n=0;n<N.length;
                                                                                                 n+=2){var A=N[n]<<W-N[n+1];N[n]=R[A]>>>V}};H.H.M=function(N,W,R){R=R<<(W&7);var V=W>>>3;N[V]|=R;N[V+1]|=R>>>8};
      H.H.I=function(N,W,R){R=R<<(W&7);var V=W>>>3;N[V]|=R;N[V+1]|=R>>>8;N[V+2]|=R>>>16};H.H.e=function(N,W,R){return(N[W>>>3]|N[(W>>>3)+1]<<8)>>>(W&7)&(1<<R)-1};
      H.H.b=function(N,W,R){return(N[W>>>3]|N[(W>>>3)+1]<<8|N[(W>>>3)+2]<<16)>>>(W&7)&(1<<R)-1};H.H.Z=function(N,W){return(N[W>>>3]|N[(W>>>3)+1]<<8|N[(W>>>3)+2]<<16)>>>(W&7)};
      H.H.i=function(N,W){return(N[W>>>3]|N[(W>>>3)+1]<<8|N[(W>>>3)+2]<<16|N[(W>>>3)+3]<<24)>>>(W&7)};H.H.m=function(){var N=Uint16Array,W=Uint32Array;
        return{K:new N(16),j:new N(16),X:[16,17,18,0,8,7,9,6,10,5,11,4,12,3,13,2,14,1,15],S:[3,4,5,6,7,8,9,10,11,13,15,17,19,23,27,31,35,43,51,59,67,83,99,115,131,163,195,227,258,999,999,999],T:[0,0,0,0,0,0,0,0,1,1,1,1,2,2,2,2,3,3,3,3,4,4,4,4,5,5,5,5,0,0,0,0],q:new N(32),p:[1,2,3,4,5,7,9,13,17,25,33,49,65,97,129,193,257,385,513,769,1025,1537,2049,3073,4097,6145,8193,12289,16385,24577,65535,65535],z:[0,0,0,0,1,1,2,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,10,10,11,11,12,12,13,13,0,0],c:new W(32),J:new N(512),_:[],h:new N(32),$:[],w:new N(32768),C:[],v:[],d:new N(32768),D:[],u:new N(512),Q:[],r:new N(1<<15),s:new W(286),Y:new W(30),a:new W(19),t:new W(15e3),k:new N(1<<16),g:new N(1<<15)}}();
      (function(){var N=H.H.m,W=1<<15;for(var R=0;R<W;R++){var V=R;V=(V&2863311530)>>>1|(V&1431655765)<<1;
        V=(V&3435973836)>>>2|(V&858993459)<<2;V=(V&4042322160)>>>4|(V&252645135)<<4;V=(V&4278255360)>>>8|(V&16711935)<<8;
        N.r[R]=(V>>>16|V<<16)>>>17}function n(A,l,M){while(l--!=0)A.push(0,M)}for(var R=0;R<32;R++){N.q[R]=N.S[R]<<3|N.T[R];
        N.c[R]=N.p[R]<<4|N.z[R]}n(N._,144,8);n(N._,255-143,9);n(N._,279-255,7);n(N._,287-279,8);H.H.n(N._,9);
        H.H.A(N._,9,N.J);H.H.l(N._,9);n(N.$,32,5);H.H.n(N.$,5);H.H.A(N.$,5,N.h);H.H.l(N.$,5);n(N.Q,19,0);n(N.C,286,0);
        n(N.D,30,0);n(N.v,320,0)}());return H.H.N}()
    
    const UZIP = {}
    UZIP["parse"] = ${UZIP.parse}
    UZIP._readLocal = ${UZIP._readLocal}
    UZIP.inflateRaw = ${UZIP.inflateRaw}
    UZIP.inflate = ${UZIP.inflate}
    UZIP.deflate = ${UZIP.deflate}
    UZIP.deflateRaw = ${UZIP.deflateRaw}
    UZIP.encode = ${UZIP.encode}
    UZIP._noNeed = ${UZIP._noNeed}
    UZIP._writeHeader = ${UZIP._writeHeader}
    UZIP.crc = parse(${stringify(UZIP.crc)})
    UZIP.crc.table = ( function() {
      var tab = new Uint32Array(256);
      for (var n=0; n<256; n++) {
        var c = n;
        for (var k=0; k<8; k++) {
          if (c & 1)  c = 0xedb88320 ^ (c >>> 1);
          else        c = c >>> 1;
        }
        tab[n] = c;  }
      return tab;  })()
    
    UZIP.adler = ${UZIP.adler}
    UZIP.bin = parse(${stringify(UZIP.bin)})
    UZIP.F = {}
    UZIP.F.deflateRaw = ${UZIP.F.deflateRaw}
    UZIP.F._bestMatch = ${UZIP.F._bestMatch}
    UZIP.F._howLong = ${UZIP.F._howLong}
    UZIP.F._hash = ${UZIP.F._hash}
    UZIP.saved = ${UZIP.saved}
    UZIP.F._writeBlock = ${UZIP.F._writeBlock}
    UZIP.F._copyExact = ${UZIP.F._copyExact}
    UZIP.F.getTrees = ${UZIP.F.getTrees}
    UZIP.F.getSecond = ${UZIP.F.getSecond}
    UZIP.F.nonZero = ${UZIP.F.nonZero}
    UZIP.F.contSize = ${UZIP.F.contSize}
    UZIP.F._codeTiny = ${UZIP.F._codeTiny} 
    UZIP.F._lenCodes = ${UZIP.F._lenCodes} 
    UZIP.F._hufTree = ${UZIP.F._hufTree} 
    UZIP.F.setDepth = ${UZIP.F.setDepth} 
    UZIP.F.restrictDepth = ${UZIP.F.restrictDepth}
    UZIP.F._goodIndex = ${UZIP.F._goodIndex} 
    UZIP.F._writeLit = ${UZIP.F._writeLit} 
    UZIP.F.inflate = ${UZIP.F.inflate} 
    UZIP.F._check = ${UZIP.F._check} 
    UZIP.F._decodeTiny = ${UZIP.F._decodeTiny} 
    UZIP.F._copyOut = ${UZIP.F._copyOut} 
    UZIP.F.makeCodes = ${UZIP.F.makeCodes} 
    UZIP.F.codes2map = ${UZIP.F.codes2map} 
    UZIP.F.revCodes = ${UZIP.F.revCodes} 

    // used only in deflate
    UZIP.F._putsE = ${UZIP.F._putsE}
    UZIP.F._putsF = ${UZIP.F._putsF}
  
    UZIP.F._bitsE = ${UZIP.F._bitsE}
    UZIP.F._bitsF = ${UZIP.F._bitsF}

    UZIP.F._get17 = ${UZIP.F._get17}
    UZIP.F._get25 = ${UZIP.F._get25}
    UZIP.F.U = function(){
      var u16=Uint16Array, u32=Uint32Array;
      return {
        next_code : new u16(16),
        bl_count  : new u16(16),
        ordr : [ 16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15 ],
        of0  : [3,4,5,6,7,8,9,10,11,13,15,17,19,23,27,31,35,43,51,59,67,83,99,115,131,163,195,227,258,999,999,999],
        exb  : [0,0,0,0,0,0,0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4,  4,  5,  5,  5,  5,  0,  0,  0,  0],
        ldef : new u16(32),
        df0  : [1,2,3,4,5,7,9,13,17,25,33,49,65,97,129,193,257,385,513,769,1025,1537,2049,3073,4097,6145,8193,12289,16385,24577, 65535, 65535],
        dxb  : [0,0,0,0,1,1,2, 2, 3, 3, 4, 4, 5, 5,  6,  6,  7,  7,  8,  8,   9,   9,  10,  10,  11,  11,  12,   12,   13,   13,     0,     0],
        ddef : new u32(32),
        flmap: new u16(  512),  fltree: [],
        fdmap: new u16(   32),  fdtree: [],
        lmap : new u16(32768),  ltree : [],  ttree:[],
        dmap : new u16(32768),  dtree : [],
        imap : new u16(  512),  itree : [],
        //rev9 : new u16(  512)
        rev15: new u16(1<<15),
        lhst : new u32(286), dhst : new u32( 30), ihst : new u32(19),
        lits : new u32(15000),
        strt : new u16(1<<16),
        prev : new u16(1<<15)
      };
    } ();

    (function(){
      var U = UZIP.F.U;
      var len = 1<<15;
      for(var i=0; i<len; i++) {
        var x = i;
        x = (((x & 0xaaaaaaaa) >>> 1) | ((x & 0x55555555) << 1));
        x = (((x & 0xcccccccc) >>> 2) | ((x & 0x33333333) << 2));
        x = (((x & 0xf0f0f0f0) >>> 4) | ((x & 0x0f0f0f0f) << 4));
        x = (((x & 0xff00ff00) >>> 8) | ((x & 0x00ff00ff) << 8));
        U.rev15[i] = (((x >>> 16) | (x << 16)))>>>17;
      }
  
      function pushV(tgt, n, sv) {  while(n--!=0) tgt.push(0,sv);  }
  
      for(var i=0; i<32; i++) {  U.ldef[i]=(U.of0[i]<<3)|U.exb[i];  U.ddef[i]=(U.df0[i]<<4)|U.dxb[i];  }
  
      pushV(U.fltree, 144, 8);  pushV(U.fltree, 255-143, 9);  pushV(U.fltree, 279-255, 7);  pushV(U.fltree,287-279,8);
      /*
        var i = 0;
        for(; i<=143; i++) U.fltree.push(0,8);
        for(; i<=255; i++) U.fltree.push(0,9);
        for(; i<=279; i++) U.fltree.push(0,7);
        for(; i<=287; i++) U.fltree.push(0,8);
        */
      UZIP.F.makeCodes(U.fltree, 9);
      UZIP.F.codes2map(U.fltree, 9, U.flmap);
      UZIP.F.revCodes (U.fltree, 9)
  
      pushV(U.fdtree,32,5);
      //for(i=0;i<32; i++) U.fdtree.push(0,5);
      UZIP.F.makeCodes(U.fdtree, 5);
      UZIP.F.codes2map(U.fdtree, 5, U.fdmap);
      UZIP.F.revCodes (U.fdtree, 5)
  
      pushV(U.itree,19,0);  pushV(U.ltree,286,0);  pushV(U.dtree,30,0);  pushV(U.ttree,320,0);
      /*
        for(var i=0; i< 19; i++) U.itree.push(0,0);
        for(var i=0; i<286; i++) U.ltree.push(0,0);
        for(var i=0; i< 30; i++) U.dtree.push(0,0);
        for(var i=0; i<320; i++) U.ttree.push(0,0);
        */
    })()
    `);
}

function generateWorkerScript() {
  // code to be run in the WebWorker
  return createWorker(`
    let scriptImported = false
    self.addEventListener('message', async (e) => {
      const { file, id, imageCompressionLibUrl, options } = e.data
      options.onProgress = (progress) => self.postMessage({ progress, id })
      try {
        if (!scriptImported) {
          // console.log('[worker] importScripts', imageCompressionLibUrl)
          self.importScripts(imageCompressionLibUrl)
          scriptImported = true
        }
        // console.log('[worker] self', self)
        const compressedFile = await imageCompression(file, options)
        self.postMessage({ file: compressedFile, id })
      } catch (e) {
        // console.error('[worker] error', e)
        self.postMessage({ error: e.message + '\\n' + e.stack, id })
      }
    })
  `);
}

export default function compressOnWebWorker(file, options) {
  return new Promise((resolve, reject) => {
    cnt += 1;
    const id = cnt;

    if (!imageCompressionLibUrl) {
      imageCompressionLibUrl = generateLib();
    }

    if (!worker) {
      worker = generateWorkerScript();
    }

    function handler(e) {
      if (e.data.id === id) {
        if (options.signal && options.signal.aborted) {
          return;
        }
        if (e.data.progress !== undefined) {
          options.onProgress(e.data.progress);
          return;
        }
        worker.removeEventListener('message', handler);
        if (e.data.error) {
          reject(new Error(e.data.error));
        }
        resolve(e.data.file);
      }
    }

    worker.addEventListener('message', handler);
    worker.addEventListener('error', reject);
    if (options.signal) {
      options.signal.addEventListener('abort', () => {
        worker.terminate();
        reject(options.signal.reason);
      });
    }

    worker.postMessage({
      file,
      id,
      imageCompressionLibUrl,
      options: { ...options, onProgress: undefined, signal: undefined },
    });
  });
}
