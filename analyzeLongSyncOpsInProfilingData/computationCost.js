const dateFunctions = require('../helpers/dateFunctions')
const util = require('util')
let db = null
const constants = require('./constants/constants')
const async = require('async')
const reportError = require('./reportError')
const reportErrorTimeout = require('./reportErrorTimeout')
const v8 = require('v8')
const asyncHooksDoctrine = require('./async/asyncHooksDoctrine')
const log = require("./log")

// Load only heapdump in the real application, not in scripts or Doctrine Review, because otherwise it creates dump as every SIGINT received which is annoying.
let heapdump
if (constants.IS_RUNNING) {
  heapdump = require('heapdump')
}

function crashAndDump() {
  if (! heapdump) return
  let start = new Date().getTime()
  log.info('Dumping heap...')
  heapdump.writeSnapshot('doctrine.heapsnapshot')
  let end = new Date().getTime()
  log.info('Dumped heap in ' + (end - start) + ' ms')
  throw new Error('Exiting because of high memory usage')
}

/*
Some historical data:
During the accident on April 17th, 2018, we reached:
rss =         2094714880 (very high)
heap total =  2118148096 (very high)
heap used =   1194958832 (very high)
external =      11358029 (normal)
Between April 18th and May 2nd (no accident), the maximum was:
rss =         1073836032
heap total =  1069473792
heap used =    798948048
external =      25198343
*/
const HEAP_SIZE_LIMIT = v8.getHeapStatistics().heap_size_limit
const HEAP_SIZE_REPORT = 90 // % of HEAP_SIZE_LIMIT
const HEAP_SIZE_STOP = 95 // % of HEAP_SIZE_LIMIT
const LOG_MEMORY_EVERY = (process.env.NODE_ENV === 'production') ? 10000 : 120000
const LOG_SYNC_TIMES_EVERY = (process.env.NODE_ENV === 'production' || process.env.DEBUG_LOG_SYNC_TIMES) ? 10000 : 120000

let costs = Object.create(null)
let victories = Object.create(null)
let sync_times_histogram = []

function writeToDb() {
  if (process.env.DEBUG_COST) {
    console.log(util.inspect(costs, { depth: 4 }))
  }

  if (! db) {
    db = require('./db')
  }

  // Atomically change cost variable
  let costs_to_write = costs
  costs = Object.create(null)

  let victories_to_write = victories
  victories = Object.create(null)

  async.series([
    function(callback) {
      // Write rows in database
      async.eachOfSeries(costs_to_write, function(value, operation_date, callback) {
        async.eachOfSeries(value, function(value, service, callback) {
          async.eachOfSeries(value, function(cost_data, operation, callback) {
            db.web_write.insert_if_not_exists('computation_cost', {
              operation_date: operation_date,
              service: service,
              operation: operation,
              cost: 0,
              count: 0,
            }, function(error) {
              if (error) return callback(error)

              db.web_write.execute(`-- updateComputationCost
                UPDATE computation_cost
                SET cost = cost + $1,
                    count = count + $5,
                    updated_at = now()
                WHERE operation_date = $2
                AND service = $3
                AND operation = $4
              `, [
                cost_data.cost,
                operation_date,
                service,
                operation,
                cost_data.count,
              ], callback)
            }, callback)
          }, callback)
        }, callback)
      }, function(error) {
        if (error) reportError(error)

        return callback()
      })
    },

    function(callback) {
      // Write rows in database
      async.eachOfSeries(victories_to_write, function(victories, victorious_db, callback) {
        db.web_write.insert('db_victories', {
          victorious_db: victorious_db,
          victories: victories,
        }, callback)
      }, function(error) {
        if (error) reportError(error)

        return callback()
      })
    },
  ])
}

// cost in a floating-point number in seconds
function reportCost(service, operation, cost) {
  let date = dateFunctions.dateIsoFormat(new Date())
  if (! (date in costs)) {
    costs[date] = Object.create(null)
  }
  if (! (service in costs[date])) {
    costs[date][service] = Object.create(null)
  }
  if (! (operation in costs[date][service])) {
    costs[date][service][operation] = {
      cost: 0,
      count: 0,
    }
  }
  costs[date][service][operation].cost += cost
  costs[date][service][operation].count++
}

function reportDBVictory(db_nice_name) {
  // Report victory of this DB
  if (! (db_nice_name in victories)) {
    victories[db_nice_name] = 0
  }
  victories[db_nice_name]++

  if (process.env.DEBUG_VICTORIES) {
    console.log(victories)
  }
}

const MB = 1024 * 1024

function printMemoryUsage(memory_usage) {
  console.log('RSS: ' + Math.round(memory_usage.rss/MB) + ' MB\theapTotal: ' + Math.round(memory_usage.heapTotal/MB) + ' MB\theapUsed: ' + Math.round(memory_usage.heapUsed/MB) + ' MB')
}

/**
  * logMemoryUsage
  *
  * Prints the memory usage in a way that is easily parsable by
  * AWS CloudWatch to make custom metrics.
  *
  */
function logMemoryUsage() {
  const memory_usage = process.memoryUsage()
  console.log('MEMORY rss ' + memory_usage.rss + ' heapTotal ' + memory_usage.heapTotal + ' heapUsed ' + memory_usage.heapUsed + ' external ' + memory_usage.external)
  log.measures("memory usage", memory_usage)
}

let last_was_too_high = false
function checkHighMemoryUsage() {
  const memory_usage = process.memoryUsage()

  if (process.env.PRINT_MEMORY_USAGE) {
    printMemoryUsage(memory_usage)
  }

  if (memory_usage.heapTotal > HEAP_SIZE_STOP/100 * HEAP_SIZE_LIMIT) {
    printMemoryUsage(memory_usage)
    reportError(new Error('Heap used > ' + HEAP_SIZE_STOP + '%'), null, -1, memory_usage)
    crashAndDump()
    last_was_too_high = true
  } else if (memory_usage.heapTotal > HEAP_SIZE_REPORT/100 * HEAP_SIZE_LIMIT) {
    printMemoryUsage(memory_usage)
    // Report the error only if the threshold was not reached before
    if (! last_was_too_high) {
      reportError(new Error('Heap used > ' + HEAP_SIZE_REPORT + '%'), null, 0, memory_usage)
    }
    last_was_too_high = true
  } else {
    last_was_too_high = false
  }
}

function reportSyncTimeCallback(data) {
  let delta_time = data.hrtime[0] * 1000 + data.hrtime[1]/1E6 // convert in ms
  if (delta_time > constants.SYNCHRONOUS_OPERATION_THRESHOLD) {
    reportErrorTimeout(new Error('Synchronous operation too long (detected by Async Hooks)'), data.req, 1, {
      delta_time: Math.round(delta_time),
    })
  }
  if (data.hrtime[0] > 0) {
    // time >= 1 sec
    sync_times_histogram[0]++
  } else {
    // time < 1 sec, so let's look at the nanoseconds number
    let i = 9
    let x = data.hrtime[1]
    while (x >= 10) {
      x = x / 10
      i--
    }
    if (i < 1) throw new Error('bug in algorithm i < 1')
    sync_times_histogram[i]++
  }
}

function resetSyncTimes() {
  sync_times_histogram = []
  for (let i=0; i<10; i++) {
    sync_times_histogram[i] = 0
  }
}
// Run it immediately to init array
resetSyncTimes()

/**
 * Prints a line of this format with 10 integers:
 * SYNC_TIMES_HISTOGRAM x1 x2 x3 ... x10
 * The number are:
 * x1: number of sync. operations >= 1 sec
 * x2: number of sync. operations between 100 ms and 1 sec
 * x3: number of sync. operations between 10 ms and 100 ms
 * x4: number of sync. operations between 1 ms and 10 ms
 * x5: number of sync. operations between 100 us and 1 ms
 * x6: number of sync. operations between 10 us and 100 us
 * x7: number of sync. operations between 1 us and 10 us
 * x8: number of sync. operations between 100 ns and 1 us
 * x9: number of sync. operations between 10 ns and 100 ns
 * x10: number of sync. operations < 10 ns
 * Every time a line is printed, the counters are reset.
*/
function reportSyncTimes() {
  let s = 'SYNC_TIMES_HISTOGRAM'
  for (let i=0; i<10; i++) {
    s += ' ' + sync_times_histogram[i]
  }
  console.log(s)
  resetSyncTimes()
}

if (constants.IS_RUNNING && ! constants.READ_ONLY) {
  if (process.env.DEBUG_COST) {
    console.log('Writing computation costs to database')
    setInterval(writeToDb, 10*1000)
  } else {
    setInterval(writeToDb, 60*1000)
  }
}

if (constants.IS_RUNNING) {
  setInterval(checkHighMemoryUsage, 1000)
  setInterval(logMemoryUsage, LOG_MEMORY_EVERY)
  asyncHooksDoctrine.registerSyncTimeCallback(reportSyncTimeCallback)
  setInterval(reportSyncTimes, LOG_SYNC_TIMES_EVERY)
}

module.exports.reportCost = reportCost
module.exports.reportDBVictory = reportDBVictory
module.exports.crashAndDump = crashAndDump
