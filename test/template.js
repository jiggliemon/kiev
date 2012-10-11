var assert = require('assert')
var Template = require('../src/index')

describe('Template', function () {
  

  beforeEach(function () {

  })

  describe('#compile', function () {
    it('should inturpret inline javascript', function () {
      var tmpl = new Template('<% for(var i=0; i < 2; i++) {%><%=i%><% } %>')
      assert.equal('12', tmpl.compile())
    })
  })
})
