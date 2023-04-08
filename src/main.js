

var UTF16orUint16index = 1;
var inputTypeof = "";
var copyOutputToClipboard = false;
var input_base = new Array(80).fill(0).map((e,i,a)=>( i<a.length/4?rand(0,255):(i>a.length/2?rand(0,0xffff):rand(0,0xffffffff))));
//var input_base = [192,86,240,34,0,182,231,104,186,168,167,255,167,61,176,117,53,199,169,226,2120835324,3314589773,3340445682,2860981076,3592688777,3112279885,561066373,75609633,575305914,3477216721,1362719853,3057161455,501358851,4033016840,1799930967,1618240925,2363434403,140256082,2879143147,3385114869,2988567845,28085,19516,61489,3138,59659,45279,39584,33382,23513,48125,28894,30207,45191,25835,12124,42695,54755,21279,6069,19202,6375,10307,16107,17915,65058,13105,56888,50121,58783,57748,58747,38750,16798,57912,42970,29809,14398,48076,44454];

//const OPTS_AUTO = 0;
const OPTS_YES = 0;
const OPTS_NO = 1;

var arrayOptimizer = new ArrayOptimizer({
  //optimizeForBytes: true, // useless
  stringify16: OPTS_YES,
  stringify8:  OPTS_YES,
  typeify:     OPTS_YES,
  typeify32:   OPTS_NO,
  replaceHexaEscapeSequence: false,
  replaceNullEscapeSequence: false,

  minSizeof: 1,
  minLength: 4,

  emptyStringSizeof: 12,
  emptyArraySizeof:  16,
  emptyTypedArraySizeof: 68,
});


function charCodeToString(cc) {
  var lut = nonprintable_basiclatin;
  return lut[cc] == undefined? String.fromCharCode(cc) : lut[cc];
}


function arrayAt(a,i) {
  var w = a[0].length;
  if (w) { a = a[(i/w)|0]; i %= w; }
  return a?(a.charCodeAt?a.charCodeAt(i):a[i]):undefined;
}
function arrayLength(a) {
  var w = a[0].length, h = a.length-1;
  return w?((w*h)+a[h].length):(h+1);
}

function checkArrays(a,b, errors = {}) {
  if (a.length !== arrayLength(b)) return false;
  var err_count = 0;
  for (var i = 0; i < a.length; i++) {
    if ((a[i]+0) !== (arrayAt(b,i)+0)) {
      //console.log("index:"+i, "a:"+a[i], "b:"+array2dAt(b,i), "string:"+String.fromCharCode(a[i]))
      err_count++;
    }
  }
  if (err_count > 0) {
    errors.count = err_count;
    return false;
  }
  return true;
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

function utf16_isSurrogate(cp) {
  return cp >= 0xD800 && cp <= 0xDFFF;
}
function utf16_decodeCodePointUnsafe(src, i, getcc) {
  var c1 = getcc(src,i);
  if (c1 < 0xD800 || c1 > 0xDFFF) return c1 | (1<<24);
  if (c1 <= 0xDBFF) {
    var c2 = getcc(src,i+1);
    if (c2 >= 0xDC00 && c2 <= 0xDFFF) {
      return (((c1 & 0x3FF) << 10) + (c2 & 0x3FF) + 0x10000) | (2<<24);
    } 
  }
  return 0xFFFD | (1<<24); // U+FFFD REPLACEMENT CHARACTER
}
function utf16_every(src, cb, getcc) {
  var c = 0, i = 0, read = 0, size = 0;
  var len = src.length - 1;
  // main loop
  while (read < len) {
    c = utf16_decodeCodePointUnsafe(src, read, getcc);
    size = c >> 24;
    if (!cb(c&0xffffff, i++, size)) return read;
    read += size;
  }
  // last
  if (read < src.length) {
    c = getcc(src,read);
    if (utf16_isSurrogate(c)) c = 0xFFFD;
    if (!cb(c,i,1)) return read;
    read += 1;
  }
  return read;
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


function rand(min=0, max=65535) {
  return Math.floor(Math.random()*(max - min + 1) + min);
}


function logStats(opts = {}, input_array, input_utf8_length, input_string_bpp) {
  var input_overhead = 0;
  var input_bytes = 0, output_bytes = 0;

  //var input_bpc = ; // bytes per char
  switch (inputTypeof) {
    case "string":
      input_overhead = arrayOptimizer.emptyStringSizeof;
      input_bytes = input_array.length * input_string_bpp + input_overhead;
      break;
    case "array":
      input_overhead = arrayOptimizer.emptyArraySizeof;
      input_bytes = input_array.length * 4 + input_overhead;
      break;
    case "typedarray": // can't happen
      input_overhead = arrayOptimizer.emptyTypedArraySizeof;
      break;
    default: break;
  }

  var arrayCount = opts.output_arrayCount | 0;
  var chars = opts.output_string_utf8_length | 0;

  var arrayHeaderCount = opts.output_arrayHeaderCount | 0;
  var stringHeaderCount = opts.output_stringHeaderCount | 0;
  var typedArrayHeaderCount = opts.output_typedArrayHeaderCount | 0;

  var szArray = arrayOptimizer.emptyArraySizeof;
  var szString = arrayOptimizer.emptyStringSizeof;
  var szTyped = arrayOptimizer.emptyTypedArraySizeof;

  var output_overhead = (arrayHeaderCount + 1) * arrayOptimizer.emptyArraySizeof + // +1 cuz of main array
                        stringHeaderCount * arrayOptimizer.emptyStringSizeof +
                        typedArrayHeaderCount * arrayOptimizer.emptyTypedArraySizeof;

  // bytes in ram
  //input_bytes = input_bytes + input_overhead;
  output_bytes = opts.output_bytes + output_overhead;


  var ratio_bytes = (output_bytes * 100) / input_bytes;
  var index_bytes = 3;
  if (ratio_bytes < 90) index_bytes = 0;
  else if (ratio_bytes <= 100) index_bytes = 1;
  else if (ratio_bytes < 110) index_bytes = 2;

  // bytes in file (utf8)
  var ratio_utf8_length = (opts.output_string_utf8_length * 100) / input_utf8_length;
  var index_utf8_length = 3;
  if (ratio_utf8_length < 90) index_utf8_length = 0;
  else if (ratio_utf8_length <= 100) index_utf8_length = 1;
  else if (ratio_utf8_length < 110) index_utf8_length = 2;

  var colors = [
    ["#0f0", "#f00"],
    ["#ccc", "#ccc"],
    ["#FF7F00", "#ccc"],
    ["#f00", "#0f0"]
  ];
  consoleClear();
  consoleAddText("Input: " + inputTypeof + "(" + input_array.length + ")\n");
  consoleAddText("  " + input_bytes + " bytes", colors[index_bytes][1]);
  consoleAddText(" in ram\n");
  consoleAddText("  " + input_utf8_length + " bytes", colors[index_utf8_length][1]);
  consoleAddText(" in file (utf8)\n \n");

  var a = opts.output_array;
  consoleAddText(`Output: array((${a.length-1}*${a[0].length})+${a[a.length-1].length})\n`);
  consoleAddText("  " + output_bytes + " bytes", colors[index_bytes][0]);
  consoleAddText(" in ram (");
  consoleAddText(ratio_bytes.toFixed(2) + "%", colors[index_bytes][0]);
  consoleAddText(")\n");


  consoleAddText("  " + opts.output_string_utf8_length + " bytes", colors[index_utf8_length][0]);
  consoleAddText(" in file (");
  consoleAddText(ratio_utf8_length.toFixed(2) + "%", colors[index_utf8_length][0]);
  consoleAddText(")\n ");

  //var check = checkArrays(input_array, opts.output_array);
  //if (check) consoleAddText("\ncomparison check function OK!\n", "#0f0");
  //else consoleAddText("\ncomparison check function fail!\n", "#f00");
}


function consoleCreate(parent, x=0,y=0, width=300, height=150) {
  Dom.div({
    parent: parent,
    id: "console",
    text: "log:>_",
    style: {
      //margin: "2px 2px",
      position: "absolute",
      display: "flex",
      flexWrap: "wrap",
      alignContent: "flex-start",
      border: "1px solid darkgray",
      //"border-radius": "5px 5px",
      boxShadow: "inset 0px 1px 4px #666",
      //marginTop: "5px",
      padding: "2px 3px",
      backgroundColor: "#000",
      color: "#fff",
      fontSize: "16px",
      fontFamily: "DOSVGA",
      width: width + "px",
      height: height + "px",
      transform: "translate("+x+"px,"+y+"px)",
      resize: "none",
    },
    onmouseenter: function() {
      var pos = Dom.getPosition(this);
      var size = Dom.getSize(this);
      var tooltip = Dom.get('tooltip');
      tooltip.innerHTML = "- The estimation of the internal memory was done with chrome(V8) and firefox(Spidemonkey).<br><br>- The size on file is evaluated using the UTF-8 charset.<br><br>This tool is very effective on very large Array's/String's.";
      tooltip.style.visibility = "visible";
      tooltip.style.left = (pos[0] + size[0] + -50) + "px";
      tooltip.style.top = pos[1]  + "px";
      tooltip.style.width = "200px";
    },
    onmouseleave: function() {
      Dom.get('tooltip').style.visibility = 'hidden';
      tooltip.style.width = "400px";
    },
  });
}


function consoleAddLineBreak() {
  var cons = Dom.get("console");
  if (!cons) return;
  Dom.div({
    parent: cons,
    style: {
      width: "100%",
    }
  });
}
function consoleAddText(text = "", color = "#fff") {
  var cons = Dom.get("console");
  if (!cons) return;
  text = text.replace(/ /g, "\xa0"); // replace spaces by no-breaking spaces
  var split = text.split("\n");
  for (var i = 0; i < split.length; i++) {
    Dom.div({
      parent: cons,
      text: split[i],
      style: {
        color: color,
      }
    });
    if (i < split.length-1) consoleAddLineBreak();
  }
}
function consoleClear() {
  var cons = Dom.get("console");
  if (!cons) return;
  while (cons.hasChildNodes()) {
    cons.removeChild(cons.lastChild);
  }
}


function exportOptionsDiv(parent) {

  // export options ************************
  var container = Dom.div({
    parent: parent,
    id: "options",
    style: {
      "border-radius": "20px 20px",
      color: "white",
      backgroundColor: "#73797c",
      width: "230px",
      height: "430px",
      position: "absolute",
      transform: "translate(345px,40px)",
      border: "solid 1px",
      "user-select": "none",
      "-moz-user-select": "-moz-none",
    }
  });


  var x = 5;
  var y = 5;



  y += 20;
  // StringifyUint8 option
  Dom.div({
    parent: container,
    text: "Stringify Uint8:",
    style: {
      fontSize: "12px",
      width: "140px",
      height: "20px",
      position: "absolute",
      transform: "translate("+(x)+"px,"+(y+4)+"px)",
    }
  });


  Dom.checkbox({
    parent: container,
    checked: !Boolean(arrayOptimizer.stringify8),
    style: {
      fontSize: "12px",
      width: "65px",
      height: "20px",
      position: "absolute",
      transform: "translate("+(x+120)+"px,"+(y-4)+"px)",
    },
    onclick: function() {
      arrayOptimizer.stringify8 = (!this.checked) | 0;
    },
    onmouseenter: function() {
      var pos = Dom.getPosition(this);
      var size = Dom.getSize(this);
      var tooltip = Dom.get('tooltip');
      tooltip.innerHTML = "Transform Uint8 data's to String";
      tooltip.style.visibility = "visible";
      tooltip.style.left = (pos[0] + size[0] + 5) + "px";
      tooltip.style.top = pos[1] + "px";
    },
    onmouseleave: function() {
      Dom.get('tooltip').style.visibility = 'hidden';
    },
  });


  y += 20;
  // Stringify option
  Dom.div({
    parent: container,
    text: "Stringify Uint16:",
    style: {
      fontSize: "12px",
      width: "140px",
      height: "20px",
      position: "absolute",
      transform: "translate("+(x)+"px,"+(y+4)+"px)",
    }
  });


  Dom.checkbox({
    parent: container,
    checked: !Boolean(arrayOptimizer.stringify16),
    style: {
      fontSize: "12px",
      width: "65px",
      height: "20px",
      position: "absolute",
      transform: "translate("+(x+120)+"px,"+(y-4)+"px)",
    },
    onclick: function() {
      arrayOptimizer.stringify16 = (!this.checked) | 0;
    },
    onmouseenter: function() {
      var pos = Dom.getPosition(this);
      var size = Dom.getSize(this);
      var tooltip = Dom.get('tooltip');
      tooltip.innerHTML = "Transform Uint16 data's to String";
      tooltip.style.visibility = "visible";
      tooltip.style.left = (pos[0] + size[0] + 5) + "px";
      tooltip.style.top = pos[1] + "px";
    },
    onmouseleave: function() {
      Dom.get('tooltip').style.visibility = 'hidden';
    },
  });

  y += 20;
  // Stringify option
  Dom.div({
    parent: container,
    text: "JSON compatible:",
    style: {
      fontSize: "12px",
      width: "140px",
      height: "20px",
      position: "absolute",
      transform: "translate("+(x)+"px,"+(y+4)+"px)",
    }
  });
  Dom.checkbox({
    parent: container,
    checked: Boolean(arrayOptimizer.replaceHexaEscapeSequence),
    style: {
      fontSize: "12px",
      width: "65px",
      height: "20px",
      position: "absolute",
      transform: "translate("+(x+120)+"px,"+(y-4)+"px)",
    },
    onclick: function() {
      arrayOptimizer.replaceHexaEscapeSequence = Boolean(this.checked);
      arrayOptimizer.replaceNullEscapeSequence = Boolean(this.checked);
    },
    onmouseenter: function() {
      var pos = Dom.getPosition(this);
      var size = Dom.getSize(this);
      var tooltip = Dom.get('tooltip');
      tooltip.innerHTML = 'The basic string format is compatible with most languages (c,c++,javascript,python,lua,etc).<br>The JSON format adds some restrictions.<br><br>Changes:<br>- Null char "\\0" is replaced by "\\u0000"<br>- 2 bytes escape-sequences "\\x" are replaced by "\\u"<br>\xa0\xa0exemple: "\\xA0" -> "\\u00A0"<br><br>Note:<br>These changes make the strings take up more space on the file, but not in internal memory.<br><br>Note 2:<br>To be fully compatible with JSON, you must also disable TypedArray\'s';
      tooltip.style.visibility = "visible";
      tooltip.style.left = (pos[0] + size[0] + 5) + "px";
      tooltip.style.top = pos[1] + "px";
    },
    onmouseleave: function() {
      Dom.get('tooltip').style.visibility = 'hidden';
    },
  });


  y += 30;
  
  // TypedArray option
  Dom.div({
    parent: container,
    text: "Array to Int(8-16):",
    style: {
      fontSize: "12px",
      width: "150px",
      height: "20px",
      position: "absolute",
      transform: "translate("+(x)+"px,"+(y+4)+"px)",
    }
  });
  Dom.checkbox({
    parent: container,
    checked: !Boolean(arrayOptimizer.typeify),
    style: {
      fontSize: "12px",
      width: "65px",
      height: "20px",
      position: "absolute",
      transform: "translate("+(x+120)+"px,"+(y-4)+"px)",
    },
    onclick: function() {
      arrayOptimizer.typeify = (!this.checked) | 0;
    },
    onmouseenter: function() {
      var pos = Dom.getPosition(this);
      var size = Dom.getSize(this);
      var tooltip = Dom.get('tooltip');
      tooltip.innerHTML = "Can transform Array to Int8Array/Uint8Array or Int16Array/Uint16Array if permitted";
      tooltip.style.visibility = "visible";
      tooltip.style.left = (pos[0] + size[0] + 5) + "px";
      tooltip.style.top = pos[1] + "px";
    },
    onmouseleave: function() {
      Dom.get('tooltip').style.visibility = 'hidden';
    },
  });

  y += 20;
  // TypedArray32 option
  Dom.div({
    parent: container,
    text: "Array to Int32:",
    style: {
      fontSize: "12px",
      width: "140px",
      height: "20px",
      position: "absolute",
      transform: "translate("+(x)+"px,"+(y+4)+"px)",
    }
  });
  Dom.checkbox({
    parent: container,
    checked: !Boolean(arrayOptimizer.typeify32),
    style: {
      fontSize: "12px",
      width: "65px",
      height: "20px",
      position: "absolute",
      transform: "translate("+(x+120)+"px,"+(y-4)+"px)",
    },
    onclick: function() {
      arrayOptimizer.typeify32 = (!this.checked) | 0;
    },
    onmouseenter: function() {
      var pos = Dom.getPosition(this);
      var size = Dom.getSize(this);
      var tooltip = Dom.get('tooltip');
      tooltip.innerHTML = "Transform Array to Int32Array/Uint32Array:<br>not recommended";
      tooltip.style.visibility = "visible";
      tooltip.style.left = (pos[0] + size[0] + 5) + "px";
      tooltip.style.top = pos[1] + "px";
    },
    onmouseleave: function() {
      Dom.get('tooltip').style.visibility = 'hidden';
    },
  });


  y += 30;
  // TypedArray option
  Dom.div({
    parent: container,
    text: "Min byteSize Array:",
    style: {
      fontSize: "12px",
      width: "140px",
      height: "20px",
      position: "absolute",
      transform: "translate("+(x)+"px,"+(y+4)+"px)",
    }
  });
  Dom.select({
    parent: container,
    selectedIndex: [null,0,1,null,2][arrayOptimizer.minSizeof],
    options: {
      array: ["8 bits", "16 bits", "32 bits"],
      onclick: function() {
        arrayOptimizer.minSizeof = [1,2,4][this.index];
      },
    },
    onmouseenter: function() {
      var pos = Dom.getPosition(this);
      var size = Dom.getSize(this);
      var tooltip = Dom.get('tooltip');
      tooltip.innerHTML = "Minimal Array size container";
      tooltip.style.visibility = "visible";
      tooltip.style.left = (pos[0] + size[0] + 5) + "px";
      tooltip.style.top = pos[1] + "px";
    },
    onmouseleave: function() {
      Dom.get('tooltip').style.visibility = 'hidden';
    },
    style: {
      fontSize: "12px",
      width: "65px",
      height: "20px",
      position: "absolute",
      transform: "translate("+(x+150)+"px,"+(y)+"px)",
    }
  });

  y += 20;
  // Minimum length of the portions
  Dom.div({
    parent: container,
    text: "Minimal length:",
    style: {
      fontSize: "12px",
      width: "140px",
      height: "20px",
      position: "absolute",
      transform: "translate("+(x)+"px,"+(y+4)+"px)",
    }
  });
  Dom.numberSection({
    parent: container,
    value: arrayOptimizer.minLength,
    min: 1,
    max: 4096,
    step: 1,
    style: {
      width: "45px",
      height: "13px",
      position: "absolute",
      transform: "translate("+(x+164)+"px,"+(y)+"px)",
    },
    onchange: function() {
      arrayOptimizer.minLength = this.value | 0;
    },
    onmouseenter: function() {
      var pos = Dom.getPosition(this);
      var size = Dom.getSize(this);
      var tooltip = Dom.get('tooltip');
      tooltip.innerHTML = "Internal Arrays or Strings can't be smaller than this value (except the final one)";
      tooltip.style.visibility = "visible";
      tooltip.style.left = (pos[0] + size[0] + 5) + "px";
      tooltip.style.top = pos[1] + "px";
    },
    onmouseleave: function() {
      Dom.get('tooltip').style.visibility = 'hidden';
    }
  });

  y += 30;
  // Empty array size in memory
  Dom.div({
    parent: container,
    text: "Array overhead:",
    style: {
      fontSize: "12px",
      width: "160px",
      height: "20px",
      position: "absolute",
      transform: "translate("+(x)+"px,"+(y+4)+"px)",
    }
  });
  Dom.numberSection({
    parent: container,
    value: arrayOptimizer.emptyArraySizeof,
    min: 4,
    max: 4096,
    step: 1,
    style: {
      width: "45px",
      height: "13px",
      position: "absolute",
      transform: "translate("+(x+164)+"px,"+(y)+"px)",
    },
    onmouseenter: function() {
      var pos = Dom.getPosition(this);
      var size = Dom.getSize(this);
      var tooltip = Dom.get('tooltip');
      tooltip.innerHTML = "Array elements takes at minimum 32bits in memory with a small overhead (with both V8 & SpiderMonkey engines)";
      tooltip.style.visibility = "visible";
      tooltip.style.left = (pos[0] + size[0] + 5) + "px";
      tooltip.style.top = pos[1] + "px";
    },
    onmouseleave: function() {
      Dom.get('tooltip').style.visibility = 'hidden';
    },
    onchange: function() {
      arrayOptimizer.emptyArraySizeof = this.value | 0;
    }
  });


  y += 20;
  // Empty String size in memory
  Dom.div({
    parent: container,
    text: "String overhead:",
    style: {
      fontSize: "12px",
      width: "160px",
      height: "20px",
      position: "absolute",
      transform: "translate("+(x)+"px,"+(y+4)+"px)",
    }
  });
  Dom.numberSection({
    parent: container,
    value: arrayOptimizer.emptyStringSizeof,
    min: 4,
    max: 4096,
    step: 1,
    style: {
      width: "45px",
      height: "13px",
      position: "absolute",
      transform: "translate("+(x+164)+"px,"+(y)+"px)",
    },
    onmouseenter: function() {
      var pos = Dom.getPosition(this);
      var size = Dom.getSize(this);
      var tooltip = Dom.get('tooltip');
      tooltip.innerHTML = "String's internal representation takes 8 or 16bits in memory (depend to alphabet range) plus a thin overhead.<br>This is the best format for 8 and 16bits const data's !";
      tooltip.style.visibility = "visible";
      tooltip.style.left = (pos[0] + size[0] + 5) + "px";
      tooltip.style.top = pos[1] + "px";
    },
    onmouseleave: function() {
      Dom.get('tooltip').style.visibility = 'hidden';
    },
    onchange: function() {
      arrayOptimizer.emptyStringSizeof = this.value | 0;
    }
  });

  y += 20;
  // Empty array size in memory
  Dom.div({
    parent: container,
    text: "TypedArray overhead:",
    style: {
      fontSize: "12px",
      width: "190px",
      height: "20px",
      position: "absolute",
      transform: "translate("+(x)+"px,"+(y+4)+"px)",
    }
  });
  Dom.numberSection({
    parent: container,
    value: arrayOptimizer.emptyTypedArraySizeof,
    min: 4,
    max: 4096,
    step: 1,
    style: {
      width: "45px",
      height: "13px",
      position: "absolute",
      transform: "translate("+(x+164)+"px,"+(y)+"px)",
    },
    onmouseenter: function() {
      var pos = Dom.getPosition(this);
      var size = Dom.getSize(this);
      var tooltip = Dom.get('tooltip');
      tooltip.innerHTML = "TypedArray elements takes 8 or 16 or 32bits in memory, plus a big overhead. This is a good choice for big array's.";
      tooltip.style.visibility = "visible";
      tooltip.style.left = (pos[0] + size[0] + 5) + "px";
      tooltip.style.top = pos[1] + "px";
    },
    onmouseleave: function() {
      Dom.get('tooltip').style.visibility = 'hidden';
    },
    onchange: function() {
      arrayOptimizer.emptyTypedArraySizeof = this.value | 0;
    }
  });


  // OPTMIMIZE!
  y += 60;
  Dom.button({
    parent: container,
    id: "generate",
    value: "OPTIMIZE",
    style: {
      //backgroundImage: "linear-gradient(bottom, rgb(0,0,0) 0%, rgb(255,255,0) 100%)",
      //boxShadow: "inset 0px 1px 0px #fff, 0px 20px 0px #555",
      boxShadow:
        "inset 0px 1px 0px #fff," +
        "0px 6px 0px #222,"+
        "0 0 5px rgba(0,0,0,.1),"+
        "0 1px 3px rgba(0,0,0,.3),"+
        "0 3px 5px rgba(0,0,0,.2),"+
        "0 5px 10px rgba(0,0,0,.25),"+
        "0 10px 10px rgba(0,0,0,.2),"+
        "0 20px 20px rgba(0,0,0,.15)",

       // "0px 6px 0px rgba(0,0,0,0.15)",
      borderRadius: "20px 20px",
      width: "128px",
      height: "64px",
      position: "absolute",
      transform: "translate(45px,"+(y)+"px)"
    },
    onmouseenter: function() {
      var pos = Dom.getPosition(this);
      var size = Dom.getSize(this);
      var tooltip = Dom.get('tooltip');
      tooltip.innerHTML = "Optimize the array size<br>Bruteforce method, can take minutes..."
      tooltip.style.visibility = "visible";
      tooltip.style.left = (pos[0] + size[0] + 5) + "px";
      tooltip.style.top = pos[1] + "px";
    },
    onmouseleave: function(event) {
      Dom.get('tooltip').style.visibility = 'hidden';
      var elem = event.target;
      var style = elem.style;
      style.top = "0px";
      style.borderColor = "#a5a5a5";
      style.boxShadow =
        "inset 0px 1px 0px #fff," +
        "0px 6px 0px #222,"+
        "0 0 5px rgba(0,0,0,.1),"+
        "0 1px 3px rgba(0,0,0,.3),"+
        "0 3px 5px rgba(0,0,0,.2),"+
        "0 5px 10px rgba(0,0,0,.25),"+
        "0 10px 10px rgba(0,0,0,.2),"+
        "0 20px 20px rgba(0,0,0,.15)";
    },
    onmousedown: function(event) {
      var elem = event.target;
      var style = elem.style;
      style.top = "5px";
      style.borderColor = "#777";
      style.boxShadow =
        "inset 0px -1px 0px #fff," +
        "0px 1px 0px #222,"+
        "0 0 5px rgba(0,0,0,.1),"+
        "0 1px 3px rgba(0,0,0,.3),"+
        "0 3px 5px rgba(0,0,0,.2),"+
        "0 5px 10px rgba(0,0,0,.25),"+
        "0 10px 10px rgba(0,0,0,.2),"+
        "0 20px 20px rgba(0,0,0,.15)";
    },
    onmouseup: function(event) {
      var elem = event.target;
      var style = elem.style;
      style.top = "0px";
      style.borderColor = "#a5a5a5";
      style.boxShadow =
        "inset 0px 1px 0px #fff," +
        "0px 6px 0px #222,"+
        "0 0 5px rgba(0,0,0,.1),"+
        "0 1px 3px rgba(0,0,0,.3),"+
        "0 3px 5px rgba(0,0,0,.2),"+
        "0 5px 10px rgba(0,0,0,.25),"+
        "0 10px 10px rgba(0,0,0,.2),"+
        "0 20px 20px rgba(0,0,0,.15)";
    },
    onclick: function() {
      var util_textarea = "";
      var input_string_bpp = 1;
      var input_array = parseCode(Dom.get("input_textarea").value.trim(), function(e) {
          Dom.get("output_textarea").value = 'Input must be an Array([1,2,3]) or String("hey")\n' + e;
        });
      if (!input_array) return;

      // typeof
      if (Typeof.isArray(input_array)) inputTypeof = "array";
      else if (Typeof.isString(input_array)) inputTypeof = "string";
      else if (Typeof.isTypedArray(input_array)) inputTypeof = "typedarray";

      if (inputTypeof=="array" || inputTypeof=="string" || inputTypeof=="typedarray") {
        if (inputTypeof=="array") {
          input_array = input_array.flat(Infinity);
          for (var i = 0; i < input_array.length; i++) {
            var elem = input_array[i];
            var t = Typeof.types(elem);
            if (!(t[0] == "number" || t[0] == 'boolean' || t[0] == 'null')) {
              Dom.get("output_textarea").value = '\nError:\n  The input Array contains a "'+t[0]+'" element\n  at position '+i+': impossible to convert into a number.';
              return;
            }
          }

        } else if (inputTypeof=="string") {
          if (UTF16orUint16index == 1) {
            for (var i = 0, a = []; i < input_array.length; i++) {
              var cc = input_array.charCodeAt(i);
              if (cc >= 0x80) input_string_bpp = 2;
              a.push(cc);
            }
            input_array = a; 
          } else {
            var badChars = 0, a = [];
            utf16_every(input_array, function(e) {
                if (e >= 0x80) input_string_bpp = 2;
                if (e == 0xFFFD) badChars++;
                a.push(e);
                return true;
              }, (s,i) => s.charCodeAt(i));
            input_array = a;
            if (badChars > 0) {
              util_textarea += '\nIt seems that the UTF16 String is malformed.\n'+badChars+' illegal code points!\n';
            }
          }
        }

        var res = arrayOptimizer.optimize(input_array);

        logStats(res, input_array, string_utf8_lengthCodePoint(Dom.get("input_textarea").value+''), input_string_bpp);

        Dom.get("output_textarea").value = res.output_string;

        if (copyOutputToClipboard) {
          var elem = Dom.get("output_textarea");
          elem.select();
          elem.setSelectionRange(0, 9999999);
          document.execCommand("copy"); // copy to clipboard
        }

      } else {
        Dom.get("output_textarea").value = 'Input must be [1,2,3] or "im a string" or Int8Array.of(1,2,3)';
      }
    },

  });





  y += 70;
  // button auto copy
  Dom.div({
    parent: container,
    text: "copy output to clipboard:",
    style: {
      fontSize: "11px",
      fontFamily: "arial",
      width: "140px",
      height: "20px",
      position: "absolute",
      transform: "translate("+(x+35)+"px,"+(y+4)+"px)",
    }
  });
  Dom.checkbox({
    parent: container,
    checked: Boolean(copyOutputToClipboard),
    style: {
      fontSize: "12px",
      width: "65px",
      height: "20px",
      position: "absolute",
      transform: "translate("+(x+128)+"px,"+(y-2)+"px)",
    },
    onclick: function() {
      copyOutputToClipboard = (this.checked) | 0;
    },
  });



}


function main() {
  console.clear();
  Dom.init();


  var title = Dom.div({
    id: "inputs",
    text: '"Array/String 🙂ptimizer"',
    style: {
      "border-radius": "20px 20px",
      //backgroundColor: "grey",
      margin: "10px auto",
      backgroundColor: "#73797c",
      borderColor: "white",
      border: "solid 1px",
      //fontFamily: "monospace",
      //fontSize: "24px",
      textAlign: "center",
      verticalAlign: "middle",
      lineHeight: "80px",
      //textShadow: "0px 1px 1px #aaa",
      width: "800px",
      height: "80px",
      // text style
      color: "#fff",
      fontSize: "4em",
      fontWeight: "bold",
      fontFamily: "Helvetica",
      textShadow:
        "0 1px 0 #ccc,"+
        "0 2px 0 #c9c9c9,"+ 
        "0 3px 0 #bbb,"+
        "0 4px 0 #b9b9b9,"+ 
        "0 5px 0 #aaa,"+
        "0 6px 1px rgba(0,0,0,.1),"+
        "0 0 5px rgba(0,0,0,.1),"+
        "0 1px 3px rgba(0,0,0,.3),"+
        "0 3px 5px rgba(0,0,0,.2),"+
        "0 5px 10px rgba(0,0,0,.25),"+
        "0 10px 10px rgba(0,0,0,.2),"+
        "0 20px 20px rgba(0,0,0,.15)",
    },
  });
  var bubble = Dom.div({
    parent: title,
    style: {
      backgroundImage: "url('css/bubble.png')",
      backgroundSize: "100% 100%",
      fontSize: "12px",
      width: "140px",
      height: "65px",
      position: "absolute",
      zIndex: "1",
      pointerEvents: "none",
      transform: "translate(340px,-20px)",
    }
  });
  Dom.div({
    parent: bubble,
    text: "Optimize me! (or not)",
    style: {
      fontFamily: "Kalam, cursive",
      fontWeight: "bold",
      //textShadow: "none",
      textShadow:
        "-2px  2px 0 #fff," +
        " 2px  2px 0 #fff," +
        " 2px -2px 0 #fff," +
        "-2px -2px 0 #fff",
      fontSize: "13px",
      width: "160px",
      height: "16px",
      //position: "absolute",
      color: "#000",
      zIndex: "2",
      pointerEvents: "none",
      transform: "translate(-15px,0px)",
    }
  });

  // exemple
  Dom.div({
    parent: title,
    style: {
      backgroundImage: "url('css/arrays.png')",
      backgroundSize: "100% 100%",
      border: "solid 3px #000",
      width: (477*0.75) + "px",
      height: (152*0.75) + "px",
      position: "absolute",
      zIndex: "-1",
      pointerEvents: "none",
      transform: "translate(-320px,-30px) rotate(-25deg)",
    }
  });




  var container = Dom.div({
    id: "inputs",
    style: {
      "border-radius": "20px 20px",
      //backgroundColor: "grey",
      margin: "10px auto",
      backgroundColor: "#73797c",
      borderColor: "white",
      border: "solid 1px",
      fontFamily: "monospace",
      fontSize: "12px",
      transform: "translate(0px,20px)",
      //textShadow: "0px 1px 1px #aaa",
      width: "1024px",
      height: "600px",
    },
  });


  // The tooltip div
  Dom.div({
    id: "tooltip",
    text: "tooltip div",
    className: 'tooltip',
    style: {
      position: "absolute",
      background: "#646464",
      borderRadius:"4px",
      padding: "6px 12px",
      fontFamily: "monospace",
      fontSize: "12px",
      textShadow: "0px 1px 1px #000",
      color: "white",
      //backgroundColor: "black",
      //fontSize: "12px",
      //border: "solid 1px",
      "user-select": "none",
      "-moz-user-select": "-moz-none",
      visibility: "hidden",
      width: "400px",
      //height: "100px",
      //position: "absolute",
      left: "0px",
      top: "0px",
      zIndex: 1000,
    }
  });

  // input
  Dom.textarea({
    parent: container,
    id: "input_textarea",
    value: "[" + input_base + "]",
    style: {
      "border-radius": "5px 5px",
      backgroundColor: "#cbc3b7",
      fontSize: "12px",
      fontFamily: "monospace",
      position: "absolute",
      width: "300px",
      height: "300px",
      transform: "translate(20px,40px)",
      resize: "none",
    },
  });

  consoleCreate(container, 600,400, 300,174);


  var x = 20;
  var y = 350;
  // String interpretation (UTF16 or Uint16)
  Dom.div({
    parent: container,
    text: "Input String format:",
    style: {
      fontSize: "12px",
      width: "180px",
      height: "20px",
      position: "absolute",
      transform: "translate("+(x)+"px,"+(y+4)+"px)",
    }
  });
  Dom.select({
    parent: container,
    selectedIndex: UTF16orUint16index | 0,
    options: {
      array: ["UTF16", "Uint16"],
      onclick: function() {
        UTF16orUint16index = this.index;
      },
    },
    style: {
      fontSize: "12px",
      width: "65px",
      height: "20px",
      position: "absolute",
      transform: "translate("+(x+150)+"px,"+(y)+"px)",
    },
    onmouseenter: function() {
      var pos = Dom.getPosition(this);
      var size = Dom.getSize(this);
      var tooltip = Dom.get('tooltip');
      tooltip.innerHTML = `UTF16: String has a mix between 16 and 32 bits values.<br>Uint16: String is interpreted like an Uint16Array.`;
      tooltip.style.visibility = "visible";
      tooltip.style.left = (pos[0] + size[0] + 5) + "px";
      tooltip.style.top = pos[1] + "px";
    },
    onmouseleave: function() {
      Dom.get('tooltip').style.visibility = 'hidden';
    }
  });



  // util code
  Dom.textarea({
    parent: container,
    id: "util_textarea",
    value: "// Util functions\n" +
      "function arrayAt(a,i) { // 1d and 2d array's\n" +
      "  var w = a[0].length;\n" +
      "  if (w) { a = a[(i/w)|0]; i %= w; }\n" +
      "  return a?(a.charCodeAt?a.charCodeAt(i):a[i]):undefined;\n" +
      "}\n" +
      "function arrayLength(a) { // 1d and 2d array's\n" +
      "  var w = a[0].length, h = a.length-1;\n" +
      "  return w?((w*h)+a[h].length):(h+1);\n" +
      "}\n" +
      "function array2dAt(a,i) {\n" +
      "  var w = a[0].length, t = (i/w)|0;\n" +
      "  i -= w*t; a = a[t];\n" +
      "  return a.charCodeAt? a.charCodeAt(i) : a[i];\n" +
      "}\n" +
      "function array2dLength(a) {\n" +
      "  var w = a[0].length, h = a.length-1;\n" +
      "  return w*h + a[h].length;\n" +
      "}\n" +
      "// exemple:\n" +
      "var a = [ // original\n" +
      "  74,158,90,1,244,87,85,92,135,83,29,\n" +
      "  126,150,148,1604968941,55628,42063\n" +
      "];\n" +
      "var b = [ // optimised (83.33% of original size)\n" +
      '  "J\\x9EZ\\x01ôWU\\\\\\x87S\\x1D~\\x96\\x94",\n' +
      "  [1604968941,55628,42063]\n" +
      "];\n" +
      "for (var i = 0, len = array2dLength(b); i < len; i++) {\n" +
      "  console.log(array2dAt(b,i), a[i]);\n" +
      "}\n",
    wrap: "off",
    style: {
      "border-radius": "5px 5px",
      backgroundColor: "#fff",
      fontSize: "10px",
      fontFamily: "arial",
      position: "absolute",
      width: "300px",
      height: "160px",
      transform: "translate(20px,410px)",
      resize: "none",
    },
  });


  // output
  Dom.textarea({
    parent: container,
    id: "output_textarea",
    value: '\nPress "OPTIMIZE" button!\n\nTips:\n  - Array\'s are flattened in 1D before conversion\n  - null or Boolean elements are converted\n    to zero or one.',
    wrap: "off",
    style: {
      "border-radius": "5px 5px",
      backgroundColor: "#cbc3b7",
      fontSize: "12px",
      fontFamily: "monospace",
      position: "absolute",
      width: "400px",
      height: "300px",
      transform: "translate(600px,40px)",
      resize: "none",
    },
  });


  // copy!
  Dom.button({
    parent: container,
    value: "copy to Clipboard",
    onclick: function() {
      var elem = Dom.get("output_textarea");
      elem.select();
      elem.setSelectionRange(0, 99999);
      document.execCommand("copy"); // copy to clipboard
    },
    style: {
      "border-radius": "5px 5px",
      width: "400px",
      height: "40px",
      position: "absolute",
      transform: "translate(600px,350px)"
    },
  });

  exportOptionsDiv(container);
}






