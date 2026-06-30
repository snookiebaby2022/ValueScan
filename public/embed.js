(function () {
  var script = document.currentScript
  var host = script && script.getAttribute('data-host') || 'https://valuescan.online'
  var w = script && script.getAttribute('data-width') || '100%'
  var h = script && script.getAttribute('data-height') || '520'
  var el = document.createElement('iframe')
  el.src = host.replace(/\/$/, '') + '/embed'
  el.title = 'ValueScan website audit'
  el.style.width = w
  el.style.height = h + 'px'
  el.style.border = '0'
  el.loading = 'lazy'
  if (script && script.parentNode) {
    script.parentNode.insertBefore(el, script.nextSibling)
  }
})()
