const AsyncHook = require('async_hooks')

// Static variables
const map = new Map()

function init(asyncId, type, triggerAsyncId) {
  let old_stack = ''
  let trigger_async_data = map.get(triggerAsyncId)
  const new_async_data = Object.create(null)
  if (trigger_async_data) {
    old_stack = trigger_async_data.stack
    new_async_data.req = trigger_async_data.req
  }

  map.set(asyncId, new_async_data)
}

function destroy(asyncId) {
  // To avoid memory leak
  map.delete(asyncId)
}

// Get the Express request object associated with the current async hooks context, if possible.
function guessReq() {
  const async_data = map.get(AsyncHook.executionAsyncId())
  if (async_data && async_data.req) {
    return async_data.req
  } else {
    return null
  }
}

// Tell Async Hooks Doctrine system which Express request is associated with the current context.
function associateReq(req) {
  if (!req) return
  const id = AsyncHook.executionAsyncId()
  const async_data = map.get(id)
  if (async_data) {
    async_data.req = req
  }
}

// Enable Async Hooks system
AsyncHook.createHook({
  init: init,
  destroy: destroy,
}).enable()

module.exports.associateReq = associateReq
module.exports.guessReq = guessReq
