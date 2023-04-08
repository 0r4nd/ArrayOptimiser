


// The Browser Object Model (BOM)
var Dom = (function() {
  "use strict";

  function setCharAt(str,idx,chr) {
    if (idx > str.length-1) return str.toString();
    else return str.substr(0,idx) + chr + str.substr(idx+1);
  }

  function cssToJson(css) {
    let s = '{"';
    
    function isSpace(c) {
      return c == ' ' || c == '\t' || c == '\n' || c == '\r';
    }

    function add(i) {
      let keyval = 0;
      for (; i < css.length; i++) {
        let c = css.charAt(i);
        if (keyval == 0 && isSpace(c)) {
          continue;
        } else if (c == ':') {
          s += '":"';
          keyval = 1;
          continue;
        } else if (c == ';') {
          s += '"';
          i++;
          break;
        }
        s += c;
      }
      return i;
    }

    function hasMore(i) {
      for (let j = i; j < css.length; j++) {
        if (!isSpace(css.charAt(j))) return true;
      }
      return false;
    }

    for (let index = 0; true; s += ', "') {
      index = add(index);
      if (!hasMore(index)) break;
    }
    s += '}';

    //console.log(s);
    return s;
  }

  function Dom() {
    this.style = {
      classes : [],
      items : [],
      sheet : null,
    };
  }

  Dom.defaultParent = document.body;
  Dom.setDefaultParent = function(parent = document.body) {
    Dom.defaultParent = parent;
    return parent;
  };
  Dom.init = function() {
    Dom.setDefaultParent();
  };

  // exemple : body.get("fruit").selectedIndex == 0,1,2...
  // exemple : body.get("fruit").value == "orange","banane"...
  Dom.get = function(id) {
    return document.getElementById(id);
  };

  // exemple :
  Dom.prototype.style = function(name, css, innerHTML) {
    let cstr = "";
    if (!this.style.sheet) {
      this.style.sheet = document.createElement('style');
    } else {
      cstr += "\n";
    }
    const style = this.style;
    const sheet = style.sheet;
    if (!sheet) return;
    sheet.setAttribute('type', 'text/css');

    let rules = JSON.parse(cssToJson(css));
    if (!this.style.items[name]) {

      let parents = name.split(",");
      //self.style_classes.push({parents : parents, rules : rules });
      let index = 0;
      for (let i = 0; i < style.classes.length; i++) {
        if (!style.classes[i]) { index = i; break; }
      }
      style.classes[index] = { parents:parents, rules:rules };

      for (let i = 0; i < parents.length; i++) {
        style.items[parents[i]] = index;
        console.log("parents:" + parents[i], "id:" + style.items[parents[i]]);
      }

    } else {
      const classes = style.classes[name];
      for (var propName in rules) {
        if (rules.hasOwnProperty(propName)) {
          classes.rules[propName] = rules[propName];
        }
      }

      //self.style_classes[name] 
    }

    cstr += name + ' {' + css + '}';

    rules = document.createTextNode(cstr);
    if (sheet.styleSheet) { // IE
      sheet.styleSheet.cssText = rules.nodeValue;
    } else {
      sheet.appendChild(rules);
    }
    const head = document.getElementsByTagName('head')[0];
    if (head) head.appendChild(sheet);
    if (innerHTML) style.sheet.innerHTML = innerHTML;
  };

  Dom.removeAllChilds = function(elem) {
    if (!elem) return;
    while (elem.hasChildNodes()) {
      elem.removeChild(elem.firstChild);
    }
  };

  function copyKeys(dst, src) {
    if (!src || !dst) return;
    for (var i = 0, keys = Object.keys(src); i < keys.length; ++i) {
      var key = keys[i];
      dst[key] = src[key];
    }  
  }

  function copyStyle(elem, style) {
    if (!style) return;
    for (var i = 0, keys = Object.keys(style); i < keys.length; ++i) {
      var key = keys[i];
      elem.style[key] = style[key];
    }  
  }

  const mouseEventTypes = [
    "onclick","oncontextmenu","ondblclick","onmousedown","onmouseenter",
    "onmouseleave","onmousemove","onmouseout","onmouseover","onmouseup",
  ];
  function copyMouseEventTypes(dst, src) {
    for (var i = 0; i < mouseEventTypes.length; i++) {
      var key = mouseEventTypes[i];
      if (src[key]) dst[key] = src[key];
    }
  }


  Dom.setStyle = function(elem, style) {
    if (!elem) return;
    copyStyle(elem, style);
  };

  // exemple :
  Dom.print = function(parent, text, type = "code") {
    
    if (text) {
      let prev = text.charAt(0);
      for (let i = 1; i < text.length; i++) {
        if (prev == " ") {
          if (text.charAt(i) == " ") text = setCharAt(text, i, "&nbsp;");
        }
        prev = text.charAt(i);
      }
    }

    if (!parent) {
      parent = document.createElement(type);
      if (text) parent.innerHTML = text;
      document.body.appendChild(parent);
    } else {
      //var content = document.createTextNode(text);
      //parent.appendChild(content);
      if (text) parent.innerHTML += text;
    }
    return parent;
  };



  // exemple :
  /*
  Dom.prototype.button = function(parent,text,onclick,id) {
    const elem = document.createElement("input");
    elem.setAttribute("type", "button");
    if (text) elem.setAttribute("value", text);
    if (id !== undefined) elem.setAttribute("id", id);
    
    elem.onclick = onclick;

    if (!parent) parent = document.body;
    parent.appendChild(elem);
    return elem;
  };
  */
  Dom.button = function(opts = {}) {
    const elem = document.createElement("input");
    elem.setAttribute("type", "button");
    var parent = opts.parent;
    if (opts.id) elem.id = opts.id;
    if (opts.class) elem.class = opts.class;
    if (opts.value) elem.value = opts.value;

    //if (opts.textContent) elem.textContent = opts.textContent;
    copyMouseEventTypes(elem, opts);
    copyStyle(elem, opts.style);
    if (!parent) parent = Dom.defaultParent;
    parent.appendChild(elem);
    return elem;
  };

  Dom.inputImage = function(opts = {}) {
    const elem = document.createElement("input");
    elem.setAttribute("type", "image");
    var parent = opts.parent;
    if (opts.id) elem.id = opts.id;
    if (opts.class) elem.class = opts.class;
    if (opts.value) elem.value = opts.value;

    if (opts.src) elem.src = opts.src;

    if (opts.onclick) elem.onclick = opts.onclick;
    copyStyle(elem, opts.style);
    if (!parent) parent = Dom.defaultParent;
    parent.appendChild(elem);
    return elem;
  };


  Dom.file = function(opts = {}) {
    const elem = document.createElement("input");
    elem.setAttribute("type", "file");
    var parent = opts.parent;
    if (opts.id) elem.id = opts.id;
    if (opts.class) elem.class = opts.class;
    if (opts.value) elem.value = opts.value;
    //if (opts.textContent) elem.textContent = opts.textContent;
    if (opts.onclick) elem.onclick = opts.onclick;
    if (opts.onchange) elem.onchange = opts.onchange;
    if (opts.accept) elem.accept = opts.accept;
    copyStyle(elem, opts.style);
    if (!parent) parent = Dom.defaultParent;
    parent.appendChild(elem);
    return elem;
  };

  Dom.checkbox = function(opts = {}) {
    const elem = document.createElement("input");
    var parent = opts.parent;
    elem.setAttribute("type", "checkbox");
    if (opts.id !== undefined) elem.setAttribute("id", opts.id);
    elem.checked = (opts.checked !== undefined)? opts.checked : true;
    copyMouseEventTypes(elem, opts);
    copyStyle(elem, opts.style);
    if (!parent) parent = document.body;
    parent.appendChild(elem);
    return elem;
  };
  Dom.checkboxSection = function(opts = {}) {
    var container = Dom.div({
      parent: opts.parent,
      id: opts.id + "_container",
      style: opts.style
    });
    copyStyle(container, opts.style);

    const elem = document.createElement("INPUT");
    elem.setAttribute("type", "checkbox");
    elem.checked = opts.checked?true:false;
    if (opts.id) elem.id = opts.id;
    //if (opts.onclick) elem.onclick = opts.onclick;
    copyMouseEventTypes(elem, opts);
    if (opts.text) {
      Dom.text({
        parent: container,
        text: opts.text + " ",
        id: opts.id + "_text"
      });
    }

    container.appendChild(elem);
    return elem;
  };


  //<input type="color" id="colorshadow" onchange="PALSET.updateBOM()" title="shadow color" value="#0000ff"></button>
  Dom.color = function(parent,value,onchange,id) {
    const elem = document.createElement("input");
    elem.setAttribute("type", "color");
    if (value) elem.setAttribute("value", value);
    if (id) elem.setAttribute("id", id);
    elem.onchange = onchange;
    if (!parent) parent = document.body;
    parent.appendChild(elem);

    return elem;
  };

  Dom.br = function(parent,id) {
    const elem = document.createElement("br");
    if (id !== undefined) elem.setAttribute("id", id);
    if (!parent) parent = document.body;
    parent.appendChild(elem);
    return elem;
  };

  Dom.h1 = function(opts = {}) {
    const elem = document.createElement("H1");
    var parent = opts.parent;
    if (opts.id) elem.id = opts.id;
    if (opts.text) {
      var t = document.createTextNode(opts.text);
      elem.appendChild(t);
    }
    copyStyle(elem, opts.style);
    if (!parent) parent = Dom.defaultParent;
    parent.appendChild(elem);
    return elem;
  };

  Dom.h2 = function(opts = {}) {
    const elem = document.createElement("H2");
    var parent = opts.parent;
    if (opts.id) elem.id = opts.id;
    if (opts.text) {
      var t = document.createTextNode(opts.text);
      elem.appendChild(t);
    }
    copyStyle(elem, opts.style);
    if (!parent) parent = Dom.defaultParent;
    parent.appendChild(elem);
    return elem;
  };

  Dom.h3 = function(opts = {}) {
    const elem = document.createElement("H3");
    var parent = opts.parent;
    if (opts.id) elem.id = opts.id;
    if (opts.text) {
      var t = document.createTextNode(opts.text);
      elem.appendChild(t);
    }
    copyStyle(elem, opts.style);
    if (!parent) parent = Dom.defaultParent;
    parent.appendChild(elem);
    return elem;
  };

  Dom.h4 = function(opts = {}) {
    const elem = document.createElement("H4");
    var parent = opts.parent;
    if (opts.id) elem.id = opts.id;
    if (opts.text) {
      var t = document.createTextNode(opts.text);
      elem.appendChild(t);
    }
    copyStyle(elem, opts.style);
    if (!parent) parent = Dom.defaultParent;
    parent.appendChild(elem);
    return elem;
  };

  Dom.h5 = function(opts = {}) {
    const elem = document.createElement("H5");
    var parent = opts.parent;
    if (opts.id) elem.id = opts.id;
    if (opts.text) {
      var t = document.createTextNode(opts.text);
      elem.appendChild(t);
    }
    copyStyle(elem, opts.style);
    if (!parent) parent = Dom.defaultParent;
    parent.appendChild(elem);
    return elem;
  };

  Dom.h6 = function(opts = {}) {
    const elem = document.createElement("H6");
    var parent = opts.parent;
    if (opts.id) elem.id = opts.id;
    if (opts.text) {
      var t = document.createTextNode(opts.text);
      elem.appendChild(t);
    }
    copyStyle(elem, opts.style);
    if (!parent) parent = Dom.defaultParent;
    parent.appendChild(elem);
    return elem;
  };

  //Dom.prototype.div = function(parent,id) {
  Dom.div = function(opts = {}) {
    const elem = document.createElement("div");
    var parent = opts.parent;
    if (opts.id) elem.id = opts.id;
    if (opts.className) elem.className = opts.className;
    if (typeof(opts.text) == "string") {
      var t = document.createTextNode(opts.text);
      elem.appendChild(t);
    }
    copyMouseEventTypes(elem, opts);
    copyStyle(elem, opts.style);
    if (!parent) parent = Dom.defaultParent;
    parent.appendChild(elem);
    return elem;
  };
;
  Dom.aside = function(parent,id) {
    const elem = document.createElement("aside");
    if (id !== undefined) elem.setAttribute("id", id);
    if (!parent) parent = document.body;
    parent.appendChild(elem);
    return elem;
  };

  Dom.section = function(opts = {}) {
    const elem = document.createElement("section");
    var parent = opts.parent;
    if (opts.id) elem.id = opts.id;
    copyStyle(elem, opts.style);
    if (!parent) parent = Dom.defaultParent;
    parent.appendChild(elem);
    return elem;
  };

  Dom.span = function(opts = {}) {
    const elem = document.createElement("span");
    var parent = opts.parent;
    if (opts.id) elem.id = opts.id;
    if (opts.className) elem.className = opts.className;
    if (opts.textContent) elem.textContent = opts.textContent;
    copyStyle(elem, opts.style);
    /*if (opts.style) {
      for (var i = 0, keys = Object.keys(opts.style); i < keys.length; ++i) {
        var key = keys[i];
        elem.style[key] = opts.style[key];
        //console.log(key)
      }
      //elem.style = opts.style;
    }*/
    if (!parent) parent = Dom.defaultParent;
    parent.appendChild(elem);
    return elem;
  };
/*
  Dom.prototype.text = function(parent, text, id) {
    const elem = document.createTextNode(text);
    if (id !== undefined) elem.setAttribute("id", id);
    if (!parent) parent = document.body;
    parent.appendChild(elem);
    return elem;
  };*/
  
  Dom.text = function(opts = {}) {
    const elem = document.createTextNode(opts.text);
    var parent = opts.parent;
    if (opts.id) elem.id = opts.id;
    if (opts.text) elem.text = opts.text;
    if (!parent) parent = Dom.defaultParent;
    parent.appendChild(elem);
    return elem;
  };


/*function addTextInElement(text,elem) {
  var node = document.createTextNode(text);
  if (!node) return null;
  document.getElementById(elem).appendChild(node);
  return node;
}
*/

/*
  Dom.div = function(opts = {}) {
    const elem = document.createElement("div");
    var parent = opts.parent;
    if (opts.id) elem.id = opts.id;
    copyStyle(elem, opts.style);
    if (!parent) parent = document.body;
    parent.appendChild(elem);
    return elem;
  };
  */




  Dom.loadImage = function(elem, src, onload) {
    if (!src) return;
    var img = new Image();
    img.onload = function() {
      if (elem) {
        var ctx = elem.getContext("2d");
        if (!elem.width) elem.width = this.naturalWidth;
        if (!elem.height) elem.height = this.naturalHeight;
        ctx.drawImage(this, 0,0, elem.width, elem.height);
      }
      if (typeof onload === 'function') onload(img);
    }
    img.src = src;

    return img;
  };


  Dom.img = function(opts = {}) {
    const elem = document.createElement("img");
    var parent = opts.parent;
    if (opts.id) elem.id = opts.id;
    if (opts.alt) elem.alt = opts.alt;
    elem.src = opts.src;
    if (opts.width) elem.width = opts.width;
    if (opts.height) elem.height = opts.height;
    copyStyle(elem, opts.style);

    if (!parent) parent = Dom.defaultParent;
    parent.appendChild(elem);
    return elem;
  };

  // exemple :
  Dom.canvas = function(opts = {}) {
    const elem = document.createElement("canvas");
    var parent = opts.parent;
    if (opts.id) elem.id = opts.id;
    //if (opts.image) elem.image = opts.image;
    elem.width = opts.width;
    elem.height = opts.height;
    copyMouseEventTypes(elem, opts);
    copyStyle(elem, opts.style);
    // attention: getContext récupère le contexte et
    // le définit définitivement pour le canvas ("2d" ou "webgl")
    if (opts.context) {
      if (opts.context.type === "webgl") {
        copyKeys(elem.getContext("webgl"), opts.context);
      } else {
        copyKeys(elem.getContext("2d"), opts.context);
      }
    }
    Dom.loadImage(elem, opts.src);

    if (elem.style.zIndex === undefined) elem.style.zIndex = 1;
    if (!elem.style.position) elem.style.position = "absolute";

    if (!parent) parent = Dom.defaultParent;
    parent.appendChild(elem);
    return elem;
  };

  Dom.canvasDrawQuad = function(canvas, opts = {}) {
    if (!canvas) return;
    var ctx = canvas.getContext("2d");
    ctx.strokeStyle = opts.color || "#000";
    var x = opts.x + 0.5;
    var y = opts.y + 0.5;
    var width = opts.width || 0;
    var height = opts.height || 0;
    ctx.beginPath();
    ctx.moveTo(x,y);
    ctx.lineTo(x+width,y);
    ctx.lineTo(x+width,y+height);
    ctx.lineTo(x,y+height);
    ctx.lineTo(x,y);
    ctx.stroke();
  };


  // à virer probablement
  Dom.hoverEvent = function(event) {
    event.preventDefault();
    var x = 10;
    var y = 10;
    //this.style.sheet.innerHTML = '*[data-tooltip]::after { left: ' + x + 'px; top: ' + y + 'px  }'
    //console.log(this);
  };

  // exemple :
  /*
  Dom.textfield = function(parent, text,onchange,size, id) {
    const elem = document.createElement("input");
    elem.setAttribute("type", "text");
    elem.setAttribute("value", text);
    elem.setAttribute("id", id);
    elem.addEventListener('mouseover', this.hoverEvent);

    if (size) elem.setAttribute("size", size);
    elem.onchange = onchange;
    if (!parent) parent = document.body;
    parent.appendChild(elem);
    return elem;
  };*/
  Dom.textfield = function(opts = {}) {
    const elem = document.createElement("INPUT");
    elem.setAttribute("type", "text");
    var parent = opts.parent;
    if (opts.id) elem.id = opts.id;
    if (opts.value) elem.value = opts.value;
    if (opts.size) elem.size = opts.size;
    if (opts.onchange) elem.onchange = opts.onchange;
    if (opts.onkeyup) elem.onkeyup = opts.onkeyup;
    copyStyle(elem, opts.style);

    if (!parent) parent = Dom.defaultParent;
    parent.appendChild(elem);
    return elem;
  };


  Dom.textarea = function(opts = {}) {
    const elem = document.createElement("TEXTAREA");
    var parent = opts.parent;
    if (opts.id) elem.id = opts.id;
    if (opts.value) elem.value = opts.value;
    if (opts.size) elem.size = opts.size;
    if (opts.rows) elem.rows = opts.rows;
    if (opts.cols) elem.cols = opts.cols;
    if (opts.wrap) elem.wrap = opts.wrap;
    if (opts.onchange) elem.onchange = opts.onchange;
    if (opts.onkeyup) elem.onkeyup = opts.onkeyup;
    if (opts.onkeydown) elem.onkeydown = opts.onkeydown;
    copyStyle(elem, opts.style);

    if (!parent) parent = Dom.defaultParent;
    parent.appendChild(elem);
    return elem;
  };
 



  // exemple :
  Dom.number = function(parent,value,onchange,min,max,step,id) {
    const elem = document.createElement("INPUT");
    elem.setAttribute("type", "number");
    elem.setAttribute("value", value);
    elem.setAttribute("id", id);
    if (min || min==0) elem.setAttribute("min", min);
    if (max || max==0) elem.setAttribute("max", max);
    if (step) elem.setAttribute("step", step);
    elem.onchange = onchange;
    if (!parent) parent = document.body;
    parent.appendChild(elem);
    return elem;
  };

  Dom.numberSection = function(opts = {}) {
    //copyStyle(elem, opts.style);

    const elem = document.createElement("INPUT");
    var parent = opts.parent;
    elem.setAttribute("type", "number");
    copyMouseEventTypes(elem, opts);
    copyStyle(elem, opts.style);
    if (opts.value || opts.value==0) elem.value = opts.value;
    if (opts.id) elem.id = opts.id;
    if (opts.min || opts.min==0) elem.min = opts.min;
    if (opts.max || opts.max==0) elem.max = opts.max;
    if (opts.step) elem.step = opts.step;
    if (opts.onchange) elem.onchange = opts.onchange;

    if (!parent) parent = document.body;
    parent.appendChild(elem);
    return elem;
  };
/*
  Dom.prototype.section = function(opts = {}) {
    const elem = document.createElement("section");
    var parent = opts.parent;
    if (opts.id) elem.id = opts.id;
    copyStyle(elem, opts.style);
    if (!parent) parent = document.body;
    parent.appendChild(elem);
    return elem;
  };
  */

  Dom.selectOptionById = (elem, name) => {
    var options = elem.options;
    if (!elem || !options) return;
    for (var i = 0; i < options.length; i++) {
      if (options[i].value !== name) continue;
      elem.selectedIndex = i;
      options[i].selected = true;
      break;
    }
  };

  // index can be negative
  Dom.selectOptionByIndex = (elem, index) => {
    if (index === undefined) return;
    var options = elem.options;
    if (!elem || !options || index >= options.length) return;
    if (index < 0) {
      index = options.length + index;
      if (index < 0) return;
    }

    elem.selectedIndex = index;
    options[index].selected = true;
  };

  Dom.appendTextChild = function(elem, text) {
    if (!elem) return;
    var option = document.createElement("option");
    //option.value = arrayOptions[i];
    option.setAttribute("value", text);
    option.text = text;
    elem.appendChild(option);
  };

  Dom.insertBeforeTextChild = function(elem, text, node) {
    if (!elem || !node) return;
    var option = document.createElement("option");
    //option.value = arrayOptions[i];
    option.setAttribute("value", text);
    option.text = text;
    elem.insertBefore(option, node);
  };

  Dom.getChilds = function(elem) {
    var childNodes = elem.childNodes;
    var childs = [];
    for (var i = 0; i < childNodes.length; ++i) {
      if (childNodes[i].nodeType === 1) childs.push(childNodes[i]);
    }
    return childs;
  };

  Dom.getOptionsText = function(elem) {
    var options = elem.options;
    var ret = [];
    for (var i = 0; i < options.length; ++i) ret.push(options[i].text);
    return ret;
  };

  Dom.hasChild = function(elem, child) {
    var childNodes = elem.childNodes;
    for (var i = 0; i < childNodes.length; ++i)
      if (childNodes[i].nodeType === 1 && childNodes[i] === child) return true;
    return false;
  };

  Dom.hasChildValue = function(elem, value) {
    var childNodes = elem.childNodes;
    for (var i = 0; i < childNodes.length; ++i)
      if (childNodes[i].nodeType === 1 && childNodes[i].value === value) return i;
    return undefined;
  };

  Dom.getSelectedChild = function(elem) {
    return BOM.getChilds(elem)[elem.selectedIndex];
  };

  Dom.removeSelectedChilds = function(elem) {
    var childs = BOM.getChilds(elem);
    var firstIndex = childs.length;
    for (var i = 0; i < childs.length; ++i) {
      var child = childs[i];
      if (child.selected) {
        if (i < firstIndex) firstIndex = i;
        elem.removeChild(child);
      }

    }
    return firstIndex;
  };

  // exemple : body.select(null, "fruit:", ["orange","banane"]) == "fruit: [orange,banane]"
  // exemple : body.select(null, "fruit", ["orange","banane"]) = "[orange,banane]"
  //Dom.select = function(parent,arrayOptions,onchange,id) {
  Dom.select = function(opts = {}) {
    const elem = document.createElement("SELECT");
    var parent = opts.parent;
    if (opts.id) elem.id = opts.id;
    if (opts.className) elem.className = opts.className;

    //elem.onchange = onchange;
    //elem.selectedIndex = 0;

    if (opts.options) {
      if (opts.options.array) {
        opts.options.array.forEach(e => {
          var optionElem = document.createElement("option");
          optionElem.setAttribute("value", e);
          optionElem.text = e;
          copyMouseEventTypes(optionElem, opts.options);
          //if (opts.options.onchange) optionElem.onchange = opts.options.onchange;
          ///optionElem.onclick = function() {alert("oker")}
          copyStyle(elem, opts.options.style);
          elem.appendChild(optionElem);
          //Dom.appendTextChild(elem, e);
        });
      }
    }

    /*for (let i = 0; i < arrayOptions.length; i++) {
      let option = document.createElement("option");
      //option.value = arrayOptions[i];
      option.setAttribute("value", arrayOptions[i]);
      option.text = arrayOptions[i];
      elem.appendChild(option);
    }*/

    //elem.options[0] = selected;
    //elem.selectedIndex = 1;
    //BOM.selectOptionByIndex(elem, -1);
    copyMouseEventTypes(elem, opts);
    copyStyle(elem, opts.style);
    elem.selectedIndex = opts.selectedIndex || 0;
    if (!parent) parent = Dom.defaultParent;
    parent.appendChild(elem);
    return elem;
  };


  Dom.div = function(opts = {}) {
    const elem = document.createElement("div");
    var parent = opts.parent;
    if (opts.id) elem.id = opts.id;
    if (opts.className) elem.className = opts.className;
    if (typeof(opts.text) == "string") {
      var t = document.createTextNode(opts.text);
      elem.appendChild(t);
    }
    copyMouseEventTypes(elem, opts);
    copyStyle(elem, opts.style);
    if (!parent) parent = Dom.defaultParent;
    parent.appendChild(elem);
    return elem;
  };


  Dom.getPosition = function(elem) {
    var rect = elem.getBoundingClientRect();
    var scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
    var scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    return [rect.left + scrollLeft, rect.top + scrollTop];
  };
/*
function offset(el) {
      var rect = el.getBoundingClientRect(),
      scrollLeft = window.pageXOffset || document.documentElement.scrollLeft,
      scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      return { top: rect.top + scrollTop, left: rect.left + scrollLeft }
  }*/


  Dom.getSize = function(elem) {
    var elemRect = elem.getBoundingClientRect();
    var sizeX   = elemRect.right - elemRect.left;
    var sizeY   = elemRect.bottom - elemRect.top;
    return [sizeX, sizeY];
  };


  function copyListCallback(value) {
    return value;
  }
  

  //Dom.selector = function(parent, arrayOptions = [], arrayOptions2 = [], onchange, id) {
  Dom.selector = function(opts = {}) {
    if (!opts.id) return;
    var buttons = opts.buttons || ["push","pop"]; // ["auto-push", "pop"]
    var btn, container = BOM.div({parent: opts.parent,
                                  id: opts.id,
                                  style: {
                                    'border': "1px solid White",
                                    'border-radius': "4px",
                                    'padding': "4px 4px"
                                  }});
    var options = ["---", ...opts.options];
    var select = BOM.select(container, options, ()=>{}, opts.id+"_select");
    var copyList = opts.copyListCallback || copyListCallback;
    //select.multiple = "multiple";
    //select.size = 2;
    if (opts.selectedIndex !== undefined) BOM.selectOptionByIndex(select, opts.selectedIndex);
    BOM.br(container);

    // sub-functions
    var push = function(){
      var select = BOM.get(container.id+"_select");
      var list = BOM.get(container.id+"_list");
      if (!select || !list || select.selectedIndex === 0) return;
      var index,selectedChild = BOM.getSelectedChild(select);
      if ((index = BOM.hasChildValue(list, copyList(selectedChild.value))) !== undefined) {
        BOM.selectOptionByIndex(list, index);
        BOM.selectOptionByIndex(select, 0);
        return;
      }
      BOM.appendTextChild(list, copyList(selectedChild.value));
      BOM.selectOptionByIndex(select, 0);
    };
    var insert = function(){
      var select = BOM.get(container.id+"_select");
      var list = BOM.get(container.id+"_list");
      if (!select || !list || select.selectedIndex === 0) return;
      if (!list.hasChildNodes()) {
        BOM.appendTextChild(list, copyList(BOM.getSelectedChild(select).value));
        BOM.selectOptionByIndex(list, 0);
      } else {
        BOM.insertBeforeTextChild(list, copyList(BOM.getSelectedChild(select).value), list.childNodes[list.selectedIndex]);
        //BOM.selectOptionByIndex(list, list.selectedIndex-1);
      }

      BOM.selectOptionByIndex(select, 0);
    };

    // function callbacks
    var callbacks =  {
      push: function() {
        //btn = BOM.button(container, "push", push, opts.id+"_push");
        btn = BOM.button({
          parent: container,
          value: "push",
          onclick: push,
          id: opts.id+"_push",
        });
        return btn;
      },

      pop: function() {
        //btn = BOM.button(container, "pop", function(){
        //  var list = BOM.get(container.id+"_list");
        //  if (!list) return;
        //  if (!list.hasChildNodes()) return;
        //  list.removeChild(list.childNodes[list.length-1]);
        //  //while (foo.firstChild) foo.removeChild(foo.firstChild);
        //}, opts.id+"_pop");
        btn = BOM.button({
          parent: container,
          value: "pop",
          onclick:function(){
            var list = BOM.get(container.id+"_list");
            if (!list) return;
            if (!list.hasChildNodes()) return;
            list.removeChild(list.childNodes[list.length-1]);
            //while (foo.firstChild) foo.removeChild(foo.firstChild);
          },
          id:opts.id+"_pop",
        });
        return btn;
      },
      insert: function() {
        //btn = BOM.button(container, "insert", insert, opts.id+"_insert");
        btn = BOM.button({
          parent: container,
          value: "insert",
          onclick: insert,
          id: opts.id+"_insert",
        });
        return btn;
      },
      delete: function() {
        //btn = BOM.button(container, "delete", function(){
        //  var list = BOM.get(container.id+"_list");
        //  if (!list) return;
        //  if (!list.hasChildNodes()) return;
        //  //list.removeChild(list.childNodes[list.length-1]);
        //  var index = BOM.removeSelectedChilds(list);
        //  BOM.selectOptionByIndex(list, index);
        //}, opts.id+"_delete");

        btn = BOM.button({
          parent: container,
          value: "delete",
          onclick: function(){
            var list = BOM.get(container.id+"_list");
            if (!list) return;
            if (!list.hasChildNodes()) return;
            //list.removeChild(list.childNodes[list.length-1]);
            var index = BOM.removeSelectedChilds(list);
            BOM.selectOptionByIndex(list, index);
          },
          id: opts.id+"_delete",
        });
        return btn;
      },

      "auto-push": function() {
        var select = BOM.get(container.id+"_select");
        select.onchange = push;
        //BOM.selectOptionByIndex(select, 0);
      },
      "auto-insert": function() {
        var select = BOM.get(container.id+"_select");
        select.onchange = insert;
        //BOM.selectOptionByIndex(select, 0);
      },
    };

    // add buttons
    for (var i = 0; i < buttons.length; ++i) {
      if (callbacks[buttons[i]]) {
        var btn = callbacks[buttons[i]]();
        if (!btn) continue;
        btn.style['min-width'] = "40px";
        btn.style['min-height'] = "20px";
        btn.style['font-size'] = "10px";
      }
    }

    BOM.br(container);
    select = BOM.select(container, opts.options2, ()=>{}, opts.id+"_list");
    select.multiple = "multiple";
    select.style['min-width'] = "140px";
    //select.size = 6;
    if (opts.selectedIndex2 !== undefined) BOM.selectOptionByIndex(select, opts.selectedIndex2);

    copyStyle(container, opts.style);
    return container;
  };



  //Dom.prototype.select = function(parent,options,onchange,id) {
  //}

  return Dom;
})();

