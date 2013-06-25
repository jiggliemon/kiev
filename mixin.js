var lodash = require('lodash')
var forOwn = lodash.forOwn
var forEach = lodash.forEach
var isObject = lodash.isObject
var isArray = lodash.isArray

var compiledFns = {}


function typeOf ( thing, isType ) {
  var type = Object.prototype.toString.call(thing).match(/\s([a-z|A-Z]+)/)[1].toLowerCase()
  return isType ? type == isType : type
}

var isPath = function  ( str ) {
  if(!str) return !!0;
  str = String(str).trim()

  // crude check for a dom node && multiple lines
  // URL paths shoudln't have either
  if(str.charAt(0) === '<' || /\n/.test(str)) {
    return false
  }
  
  // Crude AMD check
  if(/^te(xt|mplate)!/.test(str)) {
    return true
  }

  // If still not decided, check for path elements
  return pathRegexp.test(str)
}

var escape = function (string) {
  return String(string)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
}

var pathRegexp = /[-a-zA-Z0-9@:%_\+.~#?&//=]{2,256}\.[a-z]{2,4}\b(\/[-a-zA-Z0-9@:%_\+.~#?&//=]*)?/gi

var TemplateMixin = {
   _templateTags: {
     open: '<%'
    ,close: '%>'
   }

  ,_templateOperators: {
     interpolate: ['=([\\s\\S]+?)', function (match, code) {
      return "'," + code.replace(/\\'/g, "'") + ",'"
    }]
    ,escape: ['-([\\s\\S]+?)', function (match, code) {
      return "',escape(" + code.replace(/\\'/g, "'") + "),'"
    }]
  }
  
  /**
   *  #setContext
   *
   *
   */ 
  ,setContext: function (key, value) {
    var self = this
    var context = self.getContext()
    var k

    if ( isObject(key) ) {
      forOwn (key, function (k,v)) {
        self.setContext(k, v)
      })
      return
    }

    context[key] = value
    return self
  }

  /**
   *  #getContext
   *
   *
   */ 
  ,getContext: function (args) {
    args = isArray(args) ? args : Array.prototype.slice.call(arguments,0)
    var context = this._context = this._contect || {} 

    if ( arguments.length > 0 ) {
      forEach(args, function (arg, key) {
        context[key] = self._context[key]
      })
    }

    return context
  }
  
  /**
   *  #setTags
   *  
   *
   */ 
  ,setTags: function ( tags) {
    var self = this
    forOwn(tags, function ( tag, key ) {
      self.setTag(key, tag)
    })

    return this
  }

  /**
   *
   *
   *
   */ 
  ,setTag: function( tag, str) {
    this._templateTags[tag] = String(str).replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&")

    return this
  }

  /**
   *  #getTags
   *  @returns {Object} Key/Value hash with the value of the open and close tags
   */ 
  ,getTags: function () {
    return this._templateTags
  }

  /**
   *
   *
   *
   */ 
  ,getTag: function (tag) {
    return this._templateTags[tag]
  }

  /**
   *
   *
   *
   */ 
  ,setTemplate: function ( /* String */ str) {
    // todo: use yaul/trim
    var self = this
    str = str.trim().replace(/\\?'/g,"\\'")
    self._template = str
    self.fireEvent && self.fireEvent('template:ready:latched', str)
  }

  /**
   *
   *
   *
   */ 
  ,getTemplate: function () {
    return this._template || ''
  }

  /**
   *
   *
   *
   */ 
  ,parseOperators: function () {
    var self = this
    var operators = this._templateOperators

    forOwn( operators , function (operator, key) {
      if ( typeof operator[0] === 'string' ) {
        self.addOperator(key, operator[0], operator[1])
      }
    })
  }

  /**
   *  #getOperators
   *  
   *  @returns {Object}
   */ 
  ,getOperators: function () {
    var self = this

    if ( !self._operatorsParsed ) {
      self.parseOperators()
    }
    
    return self._templateOperators
  }

  /**
   *  #addOperator
   *
   *  @param {String} name
   *  @param {String|Regexp} regexp
   *  @param {Function|String} fn
   */ 
  ,addOperator: function ( /* String */ name, /* || String */ regexp, /* Function || String */ fn) {
    var self = this
    // This will be part of a str.replace method
    // So the arguments should match those that you would use
    // for the .replace method on strings.
    if ( !typeOf(regexp, 'regexp') ) { // todo: Fix Duck Typing for regexp
      regexp = new RegExp(self.getTag('open') + regexp + self.getTag('close'), 'g')
    }
    
    self._templateOperators[name] = [regexp, fn]
  }

  /**
   *  #compile
   *
   *  @param {Object} context
   *  @param {Object} model
   */ 
  ,compile: function ( /* Object */ context, model ) {
    data = context || this.getContext()
    var self = this
    var template = self.getTemplate()
    var tmpl = !template ? "<b>No template</b>" : template.replace(/[\r\t\n]/g, " ")

    if (!compiledFns[tmpl]) {
      var open = self.getTag('open')
      var close = self.getTag('close')
      var operators = self.getOperators()
      var body
      var head = 'var p=[],print=function(){p.push.apply(p,arguments);};'
      var wrapper = ["with(__o){p.push('", "');}return p.join('');"]

      forOwn(operators, function (operator, key) {
        tmpl = tmpl.replace(operator[0], operator[1])
      }) {

      // This method will evaluate in the template.
      tmpl = tmpl.replace(new RegExp(open + '([\\s\\S]+?)' + close, 'g'), function ( match, code ) {
        return "');" + code.replace(/\\'/g, "'").replace(/[\r\n\t]/g, ' ') + ";p.push('"
      })

      // Close off the template string.
      tmpl = tmpl.split("\t").join("');").split("\r").join("\\'")

      try {
        body = head + wrapper.join(tmpl)
        compiledFns[tmpl] = new Function('__o',body)
      } catch (ex) {
        window.console && console.warn(ex) && console.warn(body)
      }
    }
    return compiledFns[tmpl].call(model,data)
  }
}

module.exports = TemplateMixin
