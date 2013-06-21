var TemplateMixin = require('./mixin')
var extend = require('lodash').extend

var config = module.config()

function Template (config) {
  config = config || {}
  var self = this
  self._template = null
  self._context = {}
  if( (typeof config.template === 'string') || (typeof config == 'string') ) {
    self._template = config.template || config
  }
} 

Template.prototype = extend({}, TemplateMixin)
Template.setTags = Template.prototype.setTags

if (config.tags) {
  Template.setTags(config.tags)
}

module.exports = Template
