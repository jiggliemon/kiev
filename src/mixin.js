//@ sourceURL = yate/mixin.js

var hasOwn = require('yaul/hasOwn')
var typeOf = require('yaul/typeOf')
var isArray = require('yaul/isArray')
var slice = require('yaul/slice')

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
  , mixin  = {
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
   *
   *
   *
   */ 
  ,setContext: function (key, value) {
    var  self = this
        ,context = self.getContext()
        ,k

    if ( typeOf( key, 'object') ) {
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
   *
   *
   *
   */ 
  ,getContext: function (args) {
    var args = isArray(args) ? args : slice(arguments,0)
      , context = make(this, '_context', {})

    if (arguments.length > 0 ) {
      forEach(args, function (arg) {
        context[arg] = this._context[arg]
      })
    }

    return context
  }
  
  /**
   *
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
   *
   *
   *
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
    str = String(str).trim().replace(/\\?'/g,"\\'")
    if (!str) {
      return
    }

    var self = this;

    if ( isPath(str) ) {
      require([str],function (tmpl) {
        // todo: use yaul/trim
        self._template = String(tmpl).trim().replace(/\\?'/g,"\\'")
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
    var key, operator, operators = this._templateOperators

    for ( key in operators ) {
      if ( hasOwn(operators, key) ) {
        operator = operators[key]
        if ( typeOf(operator[0], 'string') ) {
          this.addOperator(key, operator[0], operator[1])
        }
      }
    }
  }

  /**
   *
   *
   *
   */ 
  ,getOperators: function () {
    var self = this
    if ( !self._operatorsParsed ) {
      self.parseOperators()
    }
    return self._templateOperators
  }

  /**
   *
   *
   *
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
   *
   *
   *
   */ 
  ,compile: function ( /* Object */ data, context) {
    data = data || this._context;
    var self = this
      , open = this.getTag('open')
      , close = this.getTag('close')
      , operators = this.getOperators()
      , key, body, head = 'var p=[],print=function(){p.push.apply(p,arguments);};'
      , wrapper = ["with(__o){p.push('", "');}return p.join('');"]
      , compiled = null
      , template = this.getTemplate()
      , inner = !template ? "<b>No template</b>" : template.replace(/[\r\t\n]/g, " ")

    for ( key in operators ) {
      if ( hasOwn(operators,key) ) {
        inner = inner.replace(operators[key][0], operators[key][1])
      }
    }

    // This method will evaluate in the template.
    inner = inner.replace(new RegExp(open + '([\\s\\S]+?)' + close, 'g'), function (match, code) {
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
    return compiled.call(context,data)
  }
}

module.exports = mixin

//@ sourceURL = yate/mixin.js