


const ArrayOptimizer = (function() {
  "use strict";

  const toHex = (v,pad=8) => v.toString(16).padStart(pad, "0");

  function array_1dTo2d(a, mod) {
    for (var x = 0, y =-1, r = []; x < a.length; x++) {
      if (((x + mod) % mod) == 0) r[++y] = [];
      r[y].push(a[x]);
    }
    return r;
  }

  function utf8_lengthCodePoint(cp) {
    if (cp < 0x80) return 1;
    if (cp < 0x800) return 2;
    if (cp < 0x10000) return 3;
    if (cp < 0x110000) return 4;
    return 1;
  }

  function string_utf8_lengthCodePoint(s) {
    var len = 0;
    for (var i = 0; i < s.length; i++) {
      len += utf8_lengthCodePoint(s.charCodeAt(i));
    }
    return len;
  }



  // surrogates (low and high)
  function utf16_isSurrogate(cp) {
    return cp >= 0xD800 && cp <= 0xDFFF;
  }
  function hasSurrogate(a) {
    for (var i = 0; i < a.length; i++) if (utf16_isSurrogate(a[i])) return true;
    return false;
  }


  // more concise form
  const char_concise = Object.assign(Object.create(null), { // dict
      0: "\\0", // null character "\x00"
      8: "\\b", // backspace "\x08"
      9: "\\t", // character tabulation "\x09"
     10: "\\n", // line feed "\x0A"
     //11: "\\v", // line tabulation "\x0B" (incompatible json: not used)
     12: "\\f", // form feed "\x0C"
     13: "\\r", // carriage return "\x0D"
     34: '\\"', // quotation mark "\x22" 
     //39: "\\'", // apostrophe "\x27" 
     92: "\\\\",  // backslash "\x5C"
    160: "\\xa0", // Non-breaking space (this one can't be copy/pasted...)
  });


  // https://en.wikipedia.org/wiki/Plane_(Unicode)
  //https://en.wikipedia.org/wiki/Unicode_block
  const UNICODE_110_BMP_CONTROLS = [
    // "Basic Latin" [charset range],[controls points ranges]
    [0x0000,0x007F],
    [[0x0,0x1F],0x7f],
    // "Latin-1 Supplement"
    [0x0080,0x00FF],
    [[0x80,0x9F],0xAD],
    // "Combining Diacritical Marks"
    [0x0300,0x036F],
    [0x34F],
    // "Arabic"
    [0x0600,0x06FF],
    [[0x600,0x605],0x61C,0x6DC],    
    // "Syriac"
    [0x0700,0x074F],
    [0x70F],
    // "Arabic Extended-A"
    [0x08A0,0x08FF],
    [0x8E2],
    // "Malayalam"
    [0x0D00,0x0D7F],
    [0x0D4E]
  ];

  // ugly control point verification
  function isControlPoint(cc) {
    var lut = UNICODE_110_BMP_CONTROLS;
    if (cc > lut[lut.length-1]) return false;
    for (var r = 0; r < lut.length; r += 2) {
      var ranges = lut[r+1];
      for (var i = 0; i < ranges.length; i++) {
        var t = ranges[i];
        if (Array.isArray(t) && (cc >= t[0] && cc <= t[1])) return true;
        else if (cc == t) return true;
      }
    }
    return false;
  }

  
  function isOctalDigit(cc) {
    if (cc == undefined) false;
    if (cc >= 48 && cc <= 55) return true;
    return false;
  }


  function charCodeToString(cc, ccnext, options) {
    var concise = char_concise[cc];
    if (concise) {
      // null char can't be followed by octal digit
      if (options.replaceNullEscapeSequence || isOctalDigit(ccnext)) {
        if (concise.substring(0,2) == "\\0") {
          if (options.replaceHexaEscapeSequence) return "\\u0000";
          else return "\\x00";
        }
      }
      if (options.replaceHexaEscapeSequence) {
        if (concise.substring(0,2) == "\\x") return "\\u" + toHex(cc,4);
      }
      return concise;
    }
    if (utf16_isSurrogate(cc)) return "\\u"+toHex(cc,4);
    if (isControlPoint(cc)) {
      if (cc <= 255 && !options.replaceHexaEscapeSequence) {
        return "\\x" + toHex(cc,2);
      }
      return "\\u" + toHex(cc,4);
    }
    return String.fromCodePoint(cc);
  }

  function stringToArray(s) {
    for (var i = 0, a = []; i < s.length; i++) a.push(s.charCodeAt(i));
    return a;
  }
  function stringPrettify(s, options = {}) {
    for (var i = 0, d = ""; i < s.length; i++) {
      d += charCodeToString(s.charCodeAt(i), s.charCodeAt(i+1), options);
    }
    return d;
  }
  function arrayToString(a, options = {}) {
    var getAt = (a,i) => (a[i]+0);
    if (Typeof.isString(a)) getAt = (s,i) => s.charCodeAt(i);
    for (var i = 0, s = ""; i < a.length; i++) s += charCodeToString(getAt(a,i),getAt(a,i+1), options);
    return s;
  }
  function arrayToTypedArray(a, bytesType, sign) {
    if (Typeof.isString(a)) a = stringToArray(a);
    switch (bytesType) {
      case 1: return sign? new Int8Array(a) : new Uint8Array(a);
      case 2: return sign? new Int16Array(a) : new Uint16Array(a);
      case 4: return sign? new Int32Array(a) : new Uint32Array(a);
      default: return a;
    }
  }

  function flatArray_minSizeof(a, minSizeof = 1) {
    var min = Number.MAX_SAFE_INTEGER;
    var max = Number.MIN_SAFE_INTEGER;
    var sign = false, getAt = (a,i) => (a[i]+0);
    if (Typeof.isString(a)) {
      getAt = (s,i) => s.charCodeAt(i);
    }
    for (var i = 0; i < a.length; i++) {
      var v = getAt(a,i);
      if (!Typeof.isNumber(v)) return null;
      min = Math.min(min,v);
      max = Math.max(max,v);
    }
    if (min < 0) sign = true;
    if (minSizeof == 1) {
      if (!((min >= 0 && max <= 255) || (min >= -128 && max <= 127))) minSizeof = 2;
    }
    if (!((min >= 0 && max <= 65535) || (min >= -32768 && max <= 32767))) minSizeof = 4;
    if (!((min >= 0 && max <= 0xFFFFFFFF) || (min >= -(0x7FFFFFFF+1) && max <= 0x7FFFFFFF))) minSizeof = 8;

    return {minSizeof, sign};
  }

  //const OPTS_AUTO = 0;
  const OPTS_YES = 0;
  const OPTS_NO = 1;

  function flatArray_sizeof(a, options = {}, output = {}) {
    var res, bytes = 0/*, headerBytes = 0*/;
    var arrayHeaderCount = 0;
    var stringHeaderCount = 0;
    var typedArrayHeaderCount = 0;
    var copy = Typeof.isArray(output.array);

    for (var i = 0; i < a.length; i++) {
      var v = a[i];
      if (!Typeof.isArrayOrStringOrTypedArray(v)) return null;
      if (!(res = flatArray_minSizeof(v, options.minSizeof))) return null;
      bytes += res.minSizeof * v.length;


      // unsigned type only can be converted to string
      if (!res.sign) {
        /*
        problèmes:
          - ne conserve pas la meilleur taille lorsqu'en mode "auto": y'a beaucoup trop de tableaux de strings
          - ne retranscrit pas la bonne taille si fallback vers un tableau normal (compte le tableau normal comme un tableau Int8)
          
          conseils:
            d'abord terminer la version 8 bits, puis copier/coller sur la version 16 bits
        */

        // 8 bits
        if ((options.stringify8 == OPTS_YES || options.typeify == OPTS_YES) && 
             res.minSizeof == 1) {
          /*
          if (options.stringify8 == OPTS_AUTO) {
            var sizeTypedArray = 1 * v.length + options.emptyTypedArraySizeof;
            var sizeString = 2 * v.length + options.emptyStringSizeof;
            console.log(sizeTypedArray, sizeString)
            if (sizeTypedArray < sizeString) {
              if (copy) output.array.push(arrayToTypedArray(v, res.minSizeof,res.sign));
              headerBytes += options.emptyTypedArraySizeof;
              typedArrayHeaderCount++;
              continue;
            }
          }
          */

          if (options.stringify8 == OPTS_YES) {
            stringHeaderCount++;
            if (copy) output.array.push(arrayToString(v, options));
          } else {
            typedArrayHeaderCount++;
            if (copy) output.array.push(arrayToTypedArray(v,1,res.sign));
          }

          //if (copy) output.array.push(arrayToString(v));
          //headerBytes += options.emptyStringSizeof;
          //stringHeaderCount++;
          continue;

        // 16 bits
        } else if ((options.stringify16 == OPTS_YES || options.typeify == OPTS_YES) &&
                    res.minSizeof == 2) {

          if (options.stringify16 == OPTS_YES) {
            stringHeaderCount++;
            if (copy) output.array.push(arrayToString(v, options));
          } else {
            typedArrayHeaderCount++;
            if (copy) output.array.push(arrayToTypedArray(v,2,res.sign));
          }

          //if (copy) output.array.push(arrayToString(v));
          //headerBytes += options.emptyStringSizeof;
          //stringHeaderCount++;
          continue;
        }

      }

      if ((options.typeify == OPTS_YES && res.minSizeof <= 2) ||
          (res.minSizeof == 4 && options.typeify32 == OPTS_YES)) {
        if (copy) output.array.push(arrayToTypedArray(v, res.minSizeof,res.sign));
        //headerBytes += options.emptyTypedArraySizeof;
        typedArrayHeaderCount++;
        continue;
      }


      /*if (!res.sign && ((options.stringify16 == OPTS_NO && res.minSizeof == 2) ||
         (options.stringify8 != OPTS_NO && res.minSizeof == 1))) {
        
        if (copy) output.array.push(arrayToString(v));
        headerBytes += options.emptyStringSizeof;
        stringHeaderCount++;

        continue;
      } else if ((options.typeify == OPTS_YES && res.minSizeof <= 2) || options.typeify32 == OPTS_YES) {
        if (copy) output.array.push(arrayToTypedArray(v, res.minSizeof,res.sign));
        headerBytes += options.emptyTypedArraySizeof;
        typedArrayHeaderCount++;
        continue;
      }
*/
      // copy
      if (Typeof.isArrayOrTypedArray(v)) {
        if (Typeof.isArray(v)) {
          //headerBytes += options.emptyArraySizeof;
          arrayHeaderCount++;
        } else {
          //headerBytes += options.emptyTypedArraySizeof;
          typedArrayHeaderCount++;
        }
        if (copy) {
          var dst = new v.constructor(v.length);
          for (var j = 0; j < v.length; j++) dst[j] = v[j]+0; // avoid null/undefined/bool 
          output.array.push(dst);
        }

      // string to string
      } else {
        //headerBytes += options.emptyStringSizeof;
        stringHeaderCount++;
        if (copy) output.array.push(stringPrettify(v));
      }
    }
    output.arrayHeaderCount = arrayHeaderCount;
    output.stringHeaderCount = stringHeaderCount;
    output.typedArrayHeaderCount = typedArrayHeaderCount;
    output.bytes = bytes;
    return bytes;
  }


  // optimize array size by bruteforce
  function optimizeArray(a, options = {}) {
    var best = {
      totalBytes: Number.MAX_SAFE_INTEGER,
      bytes: 0,
      arrayCount: 0,
      array: null
    };
    var output = {
      bytes: 0,
      headerBytes: 0,
      arrayHeaderCount: 0,
      stringHeaderCount: 0,
      typedArrayHeaderCount: 0,
    };

    for (var i = Math.min(options.minLength,a.length); i < a.length+1; i++) {
      var divided = array_1dTo2d(a, i);
      flatArray_sizeof(divided, options, output);
      //var curTotalBytes = output.bytes + (divided.length * options.emptyArraySizeof);
      
      var curTotalBytes = output.bytes + /*output.headerBytes*/
                          output.arrayHeaderCount * options.emptyArraySizeof + 
                          output.stringHeaderCount * options.emptyStringSizeof + 
                          output.typedArrayHeaderCount * options.emptyTypedArraySizeof;
      if (curTotalBytes < best.totalBytes) {
        best.totalBytes = curTotalBytes;
        best.bytes = output.bytes;
        best.arrayCount = divided.length;
        best.array = divided; // not converted yet
      }
    }
    output.array = [];
    flatArray_sizeof(best.array, options, output);
    return {
      input_bytes: a.length * 4,
      output_bytes: best.bytes,
      output_arrayCount: best.arrayCount,
      output_array: output.array,
      output_arrayHeaderCount: output.arrayHeaderCount,
      output_stringHeaderCount: output.stringHeaderCount,
      output_typedArrayHeaderCount: output.typedArrayHeaderCount,
    };
  }


  function array2dToString(a, spacing = "", format=true) {
    var s = "[" + (format?"\n":"") + spacing;
    var stringify = a => {
      if (Typeof.isArray(a)) {
        return JSON.stringify(a);
      } else if (Typeof.isTypedArray(a)) {
        return a.constructor.name + ".of("+a+")";
      }
      return '"'+a+'"';
    };
    // only one element
    //if (a.length == 1) return stringify(a[0]);
    for (var i = 0; i < a.length; i++) {
      var v = a[i];
      s += stringify(v) + (i>=a.length-1?(format?"\n":""):(',\n'+spacing));
    }
    return s + "]";
  }


  function parseCode(code, cberror) {
    var res;
    try {
      //res = JSON.parse(code);
      res = (new Function('return ' + code))();
    } catch(e) {
      cberror(e);
    }
    return res;
  }

  function ArrayOptimizer(opts = {}) {
    this.optimizeForBytes = opts.optimizeForBytes || true;

    this.stringify16 = opts.stringify16 || 0;
    this.stringify8 = opts.stringify8 || 0;
    this.typeify = opts.typeify || 0;
    this.typeify32 = opts.typeify32 || 0;

    this.minSizeof = opts.minSizeof || 2;
    this.minLength = opts.minLength || 8;

    this.emptyTypedArraySizeof = opts.emptyTypedArraySizeof || 200;
    this.emptyStringSizeof = opts.emptyStringSizeof || 30;
    this.emptyArraySizeof = opts.emptyArraySizeof || 60;
  }

  ArrayOptimizer.prototype.optimize = function(a) {
    var options = {
      optimizeForBytes: this.optimizeForBytes,
      minSizeof: this.minSizeof,
      stringify16: this.stringify16,
      stringify8: this.stringify8,
      typeify: this.typeify,
      typeify32: this.typeify32,
      minLength: this.minLength,
      replaceHexaEscapeSequence: this.replaceHexaEscapeSequence,
      replaceNullEscapeSequence: this.replaceNullEscapeSequence,

      emptyArraySizeof: this.emptyArraySizeof,
      emptyStringSizeof: this.emptyStringSizeof,
      emptyTypedArraySizeof: this.emptyTypedArraySizeof,

      input_bytes: a.length * 4,
      input_arrayCount: 1,

      output_bytes: 0,
      output_arrayCount: 0,
      output_array: null,
      output_string: null,
      output_string_utf8_length: 0
    };
    var res = optimizeArray(a, options);
    res.output_string = array2dToString(res.output_array, "  ");
    res.output_string_utf8_length = string_utf8_lengthCodePoint(res.output_string);
    //res.output_array = JSON.parse(res.output_string);
    
    //var parsed = parseCode(res.output_string.trim(), e => {
    //  console.warn("error on parsing final array");
    //})
    //if (parsed) res.output_array = parsed;

    return res;
  };

  return ArrayOptimizer;
})();

