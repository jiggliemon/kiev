var hasOwn = require('yaul/hasOwn')
var forEach = require('yaul/forEach')
var typeOf = require('yaul/typeOf')
var make = require('yaul/make')
var trim = require('yaul/trim')

function isPath ( str ) {
  if(!str) return !!0;
  // todo: use yaul/trim
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

function escape (string) {
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
     open: '<?'
    ,close: '?>'
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

    if ( typeOf(key, 'object') ) {
      for ( k in key ) {
        if ( hasOwn(key,k) ) {
          self.setContext(k, key[k])
        }
      }
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
    args = typeOf(args,'array') ? args : Array.prototype.slice.call(arguments,0)
    var context = make(this, '_context', {})

    if ( arguments.length > 0 ) {
      forEach(args, function (arg) {
        context[arg] = this._context[arg]
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
    for ( var key in tags) {
      if ( hasOwn(tags,key) ) {
        this.setTag(key,tags[key])
      }
    }

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
    str = trim(str).replace(/\\?'/g,"\\'")

    if (!str) {
      return
    }

    var self = this

    if ( isPath(str) ) {
      require([str], function (tmpl) {
        self._template = trim(tmpl).replace(/\\?'/g,"\\'")
        self.fireEvent && self.fireEvent('template:ready:latched', self._template)
      })
    } else {
      self._template = str
      self.fireEvent && self.fireEvent('template:ready:latched', str)
    }

  }

  /**
   *
   *
   *
   */ 
  ,getTemplate: function () {
    return this._template || '<b>No template loaded</b>'
  }

  /**
   *
   *
   *
   */ 
  ,parseOperators: function () {
    var key
    var operator
    var operators = this._templateOperators

    for ( key in operators ) {
      if ( hasOwn(operators, key) ) {
        operator = operators[key]
        if ( typeof operator[0] === 'string' ) {
          this.addOperator(key, operator[0], operator[1])
        }
      }
    }
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
    var open = self.getTag('open')
    var close = self.getTag('close')
    var operators = self.getOperators()
    var key
    var body
    var head = 'var p=[],print=function(){p.push.apply(p,arguments);};'
    var wrapper = ["with(__o){p.push('", "');}return p.join('');"]
    var compiled = null
    var template = self.getTemplate()
    var inner = !template ? "<b>No template</b>" : template.replace(/[\r\t\n]/g, " ")

    for ( key in operators ) {
      if ( hasOwn(operators,key) ) {
        inner = inner.replace(operators[key][0], operators[key][1])
      }
    }

    // This method will evaluate in the template.
    inner = inner.replace(new RegExp(open + '([\\s\\S]+?)' + close, 'g'), function ( match, code ) {
      return "');" + code.replace(/\\'/g, "'").replace(/[\r\n\t]/g, ' ') + ";p.push('"
    })

    // Close off the template string.
    inner = inner.split("\t").join("');").split("\r").join("\\'")

    try {
      body = head + wrapper.join(inner)
      compiled = new Function('__o', head + wrapper.join(inner))
    } catch (ex) {
      window.console && console.warn(ex)
      throw new Error('Syntax error in template: function body :: ' + body)
    }
    return compiled.call(model,data)
  }
}


module.exports = TemplateMixin
