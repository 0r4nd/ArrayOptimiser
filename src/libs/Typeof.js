

/**
 * Alternative for the lame typeof operator
 */
const Typeof = (function() {
  "use strict";
  const tos = Object.prototype.toString;
  const fb = ['object','object']; // fallback
  const dict = Object.assign(Object.create(null), {
      // primitives
    'boolean': ['boolean','primitive'],
    'undefined': ['undefined','primitive'],
    'number': ['number','primitive'],
    'bigint': ['bigint','primitive'],
    'string': ['string','primitive'],
    'symbol': ['symbol','primitive'],
      // typeof(null) return "object" for legacy reasons, but null is a primitive
    '[object Null]': ['null','primitive'],
      // Primitive wrapper object
    '[object Boolean]': ['boolean','object'],
    '[object Undefined]': ['undefined','object'],
    '[object Number]': ['number','object'],
    '[object BigInt]': ['bigint','object'],
    '[object String]': ['string','object'],
    '[object Symbol]': ['symbol','object'],
      // Module-like objects
    '[object JSON]': ['json','object'],
    '[object Math]': ['math','object'],
      // Built-in classes
    '[object ArrayBuffer]': ['arraybuffer','object'],
    '[object DataView]': ['dataview','object'],
    '[object Int8Array]': ['int8array','typedarray'],
    '[object Uint8Array]': ['uint8array','typedarray'],
    '[object Uint8ClampedArray]': ['uint8clampedarray','typedarray'],
    '[object Int16Array]': ['int16array','typedarray'],
    '[object Uint16Array]': ['uint16array','typedarray'],
    '[object Int32Array]': ['int32array','typedarray'],
    '[object Uint32Array]': ['uint32array','typedarray'],
    '[object Float32Array]': ['float32array','typedarray'],
    '[object Float64Array]': ['float64array','typedarray'],
    '[object BigInt64Array]': ['bigint64array','typedarray'],
    '[object BigUint64Array]': ['biguint64array','typedarray'],
    '[object WeakSet]': ['weakset','object'],
    '[object WeakMap]': ['weakmap','object'],
    '[object Promise]': ['promise','object'],
    '[object Set]': ['set','object'],
    '[object Map]': ['map','object'],
      // Iterators
    '[object Map Iterator]': ['map iterator','iterator'],
    '[object Set Iterator]': ['set iterator','iterator'],
    '[object String Iterator]': ['string iterator','iterator'],
      // Miscellaneous
    '[object Date]': ['date','object'],
    '[object Array]': ['array','object'],
    '[object Error]': ['error','object'],
    '[object RegExp]': ['regexp','object'],
    '[object Function]': ['function','object'],
    '[object Arguments]': ['arguments','object'],
    '[object Generator]': ['generator','generator'],
    '[object GeneratorFunction]': ['generatorFunction','generator']
  });
  function Typeof(o) { return Typeof.types(o)[0]; }
  Typeof.types = o => dict[typeof(o)] || dict[tos.call(o)] || fb;
  Typeof.isFunction = o => Typeof(o) == "function";
  Typeof.isNumber = o => Typeof(o) == "number";
  Typeof.isPrimitive = o => Typeof.types(o)[1] == 'primitive';
  Typeof.isArray = o => tos.call(o)=='[object Array]';
  Typeof.isString = o => Typeof(o)=='string';
  Typeof.isTypedArray = o => Typeof.types(o)[1]=='typedarray';
  Typeof.isArrayOrString = function(o) {
    var t = Typeof(o); return (t=='array'||t=='string');
  };
  Typeof.isArrayOrTypedArray = function(o) {
    var t = Typeof.types(o); return (t[0]=='array'||t[1]=='typedarray');
  };
  Typeof.isArrayOrStringOrTypedArray = function(o) {
    var t = Typeof.types(o);
    return (t[0]=='array' || t[0]=='string' || t[1]=='typedarray');
  };
  Typeof.isIterable = o => (o==null)?false:Typeof(o[Symbol.iterator])=='function';
  Typeof.isIterator = o => Typeof.types(o)[1] == 'iterator';

  // Add a new type. 
  Typeof.addType = function(o, type, supertype = 'object') {
    if (!o || !o.prototype || !o.name) return;
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Symbol/toStringTag
    // http://2ality.com/2015/09/well-known-symbols-es6.html
    Object.defineProperty(o.prototype, Symbol.toStringTag, {
      configurable:true, value:o.name,
    });
    // add object in the lookup array
    type = type || o.name.toLowerCase();
    dict[`[object ${o.name}]`] = [type,supertype];
  };

  // Remove a new type. 
  Typeof.removeType = function(o) {
    if (!o || !o.prototype || !o.name) return;
    var name = `[object ${o.name}]`;
    if (o.prototype.hasOwnProperty(Symbol.toStringTag)) {
      delete(o.prototype[Symbol.toStringTag]);
    }
    if (dict[name]) delete(dict[name]);
  };

  return Typeof;
})();


// export {Typeof}; // uncomment if used as module

