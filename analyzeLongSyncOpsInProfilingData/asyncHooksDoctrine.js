// Async Hooks Doctrine system
//
// Why?
// Better error diagnosis, more precisely:
// - Be able to find the originating Express query in case of an uncaught exception (which causes the application to crash).
// - Be able to find the originating Express query in case of an error reported but not "sent back" to Express via next(error), for example warnings like "ElasticSearch query longer than 10 sec".
//
// What?
// This uses the Node.js experimental Async Hooks API.
//
// The enrionment variable DEBUG_ASYNC_HOOKS_DEEP_CRASH can be used to simulate a deep hard-to-diagnose crash which demonstrates Async Hooks usefulness.
// Test with:
// DEBUG_ASYNC_HOOKS_DEEP_CRASH=true ./start.sh
// Then read a decision with your browser.
const _ = require('lodash')
const AsyncHook = require('async_hooks')

const STACK_STORAGE_LIMIT = 50000

// Static variables
const map = new Map()
let reportSyncTimeCallback = null


if (process.env.DEBUG_ASYNC_HOOK_MAP_SIZE) {
  setInterval(() => {
    console.log(process.argv[1] +  ': Async hooks map size: ' + map.size)
  }, 10000)
}

function init(asyncId, type, triggerAsyncId) {
  let old_async_data = map.get(triggerAsyncId) || Object.create(null)
  let old_stack = old_async_data.stack || ''

  // Always propagate a clone of the object else you could merge different async hooks
  let new_async_data = _.clone(old_async_data)

  if (process.env.ENABLE_ASYNC_HOOKS_STACK_TRACES) {
    const stack_part = (new Error()).stack.split('\n').slice(1).join('\n')
    let new_stack = '\n----- callback (link provided by Async Hooks - resource: ' + type + ') ------\n' + stack_part + old_stack
    if (new_stack.length > STACK_STORAGE_LIMIT) {
      new_stack = new_stack.slice(0, STACK_STORAGE_LIMIT) + '\n[...]'
    }
    new_async_data.stack = new_stack
  }

  map.set(asyncId, new_async_data)
}

function before(asyncId) {
  const async_data = map.get(asyncId)
  if (async_data == null) return
  async_data.before_time = process.hrtime()
}

function after(asyncId) {
  const async_data = map.get(asyncId)
  if (async_data == null) return
  const delta_time_struct = process.hrtime(async_data.before_time)
  if (reportSyncTimeCallback != null) {
    reportSyncTimeCallback({
      req: async_data.req,
      hrtime: delta_time_struct,
    })
  }
}

function destroy(asyncId) {
  // To avoid memory leak
  map.delete(asyncId)
}

// Extend the stack trace of the provided error (which is broken at the last callback) with stack traces from the previous context between different callbacks. The error is modified in-place.
function extendError(error) {
  const id = AsyncHook.executionAsyncId()
  const async_data = map.get(id)
  if (async_data && async_data.stack) {
    error.stack += async_data.stack
  }
}

function get(key) {
  const async_data = map.get(AsyncHook.executionAsyncId())
  if (async_data && key in async_data) {
    return async_data[key]
  } else {
    return null
  }
}

// Get the Express request object associated with the current async hooks context, if possible.
function guessReq() {
  return get('req')
}

function set(key, value) {
  const id = AsyncHook.executionAsyncId()
  const async_data = map.get(id)
  if (async_data) {
    async_data[key] = value
  }
}

// Tell Async Hooks Doctrine system which Express request is associated with the current context.
function associateReq(req) {
  if (!req) return
  set('req', req)
}

/**
 * @typedef {Object} GuessReqReturnType
 * @property {Object} req provided request is returned if provided, otherwise the guessed request if it was possible to get it
 * @property {String} associated_request a field describing if Async Hooks worked, with these possible values:
 *   - OK_ASYNC_HOOKS: Async Hooks was able to guess a req object even though none was provided
 *   - OK_ASYNC_HOOKS_AND_PROVIDED: Async Hooks was able to guess a req object and is the same as the provided request (to the guess is correct)
 *   - FAIL_ASYNC_HOOKS_INCORRECT_REQ: Async Hooks guessed a different request that the provided_req (this is a very problematic case because it means Async Hooks gives incorrect information)
 *   - FAIL_NO_ASYNC_HOOKS_BUT_PROVIDED: Async Hooks was unable to guess the request, but one was provided (so it is a failure because there was indeed a request to guess).
 *   - UNKNOWN: No request was guessed by Async Hooks and none was provided. This can be normal if the context is outside an HTTP request (script, data loading, etc.).
 */

/**
 * Tries to guess the current Express request from Async Hooks and compares
 * it to the optional provided req.
 * @param {Object} [provided_req] Express request object
 * @returns {GuessReqReturnType} guessed request and how it was guessed
*/
function guessReqAndCompare(provided_req) {
  let req = provided_req
  let associated_request
  const guessed_req = guessReq()
  if (req && guessed_req) {
    if (req === guessed_req) {
      associated_request = 'OK_ASYNC_HOOKS_AND_PROVIDED'
    } else {
      associated_request = 'FAIL_ASYNC_HOOKS_INCORRECT_REQ'
    }
  } else if (req) {
    associated_request = 'FAIL_NO_ASYNC_HOOKS_BUT_PROVIDED'
  } else if (guessed_req) {
    req = guessed_req
    associated_request = 'OK_ASYNC_HOOKS'
  } else {
    associated_request = 'UNKNOWN'
  }
  return {
    req,
    associated_request,
  }
}

/**
 * Register the callback to be called after each synchronous operation,
 * with a measure of the time it took.
 * @param {Function} callback called with an object containing req (the Express req guessed with Async Hooks, if possible) and hrtime (interval as returned by process.hrtime()).
*/
function registerSyncTimeCallback(callback) {
  reportSyncTimeCallback = callback
}

if (! process.env.DISABLE_ASYNC_HOOKS) {
  // Enable Async Hooks system
  AsyncHook.createHook({
    init: init,
    destroy: destroy,
    before: before,
    after: after,
  }).enable()
}

module.exports = {
  set,
  get,
  associateReq,
  guessReq,
  extendError,
  guessReqAndCompare,
  registerSyncTimeCallback,
}
