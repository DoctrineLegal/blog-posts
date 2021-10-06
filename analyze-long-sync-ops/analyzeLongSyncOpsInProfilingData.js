/*
 * This script allows to extact the long synchronous operations in backend from a profiling file as produced by Chrome inspector when using the "Save" function. It runs as a script with a single argument which is the profile file path.
*/

/*
 * In order to write the script, we reverse-enginnered the profiling format and understood the following about it. Here we documented what we used from the data.
 * The profiling file is a JSON format with the following root attributes:
 * - nodes: This is a tree structure which represents all the call stacks that were seen during profiling. Note that it is non-redundant, so if there are 3 calls from a function A to a function B, we will only have one B node in the tree as a child of A. However, if function B is also called from function C, we will have two Bs, one as a child of A and the other as a child of C (whatever the number of A to B and B to C calls). Each node has:
 *   - id: the id of the node
 *   - callFrame: an attribute with:
 *     - functionName: name of function. There are particular cases:
 *       - '(garbage collector)' is the GC as the name suggests. It may run "in the middle" of another function without meaning that the function has stopped running. For this reason, we had to handle the ticks falling in the GC with a specific rule.
 *       - '(root)' which is the root node with id 1
 *       - '(program)' which means that the process is idle, for instance waiting for asynchronous operations to complete, or waiting for a new query.
 *     - url: path of source code file
 *     - lineNumber: line number if source code file (beware: the first line is 0)
 *   - hitCount: number of hits on this node in "self" mode, ie. without counting the hits in children of this node
 *   - children: array of ids of nodes which are the children of this node
 * - startTime: profiling start time
 * - endTime: profiling end time
 * - samples: Arrays with as many elements as points of time at which the profiler sampled the process. Each value is an integer which is a reference to a node id of nodes objects (the id is NOT the index in the nodes array, it correspond to the "id" attribue of the node.)
 * - timeDeltas: An array of the same size as samples, which for each samples gives the corresponding time interval. This is useful for translating each sample in an amount of time. For instance if samples is [1, 1, 1, 2, 2, 3] and timeDeltas is [102, 98, 104, 102, 103, 97, 101] we assume that node 2 was "running" for 102+103 time units. The unit is microseconds.
*/

const fs = require('fs')
const _ = require('lodash')

// Report operations which take longer than this threshold
const LONG_OPERATION_THRESHOLD = 10 // ms

// Used to differenciate our code from external code:
// In case an external function is slow, we want to report our code
// which called it instead of the external function.
const REPO_NAME = 'nodejs-doctrine'

let data
let nodes_map = new Map()
let tick_period
let results_grouped_by_function = new Map()

/*
 * Takes a sorted array of ticks indices (integers in interval 0 to data.samples.length-1) which represent samples in which a given function was detected in the call stack, and computes intervals during which the function has been running uninterupted.
 * The contiguous_tick_groups (member of returned object) is an array of arrays of integers, in which the indices provided in tick_list are put into groups.
 * The contiguous_tick_groups_times (member of returned object) is an array of numbers, each being the time span of the group.
*/
function findSpanInTickList(tick_list) {
  let previous_tick_index = -100 // any value such that "tick_index !== previous_tick_index + 1" is always violated on first iteration (could be anything < -1 in fact)
  let contiguous_tick_groups = []
  let contiguous_tick_groups_times = []
  for (let tick_index of tick_list) {
    if (tick_index !== previous_tick_index + 1) {
      contiguous_tick_groups.push([])
      contiguous_tick_groups_times.push(0)
    }
    contiguous_tick_groups[contiguous_tick_groups.length-1].push(tick_index)
    //contiguous_tick_groups_times[contiguous_tick_groups_times.length-1] += tick_period
    contiguous_tick_groups_times[contiguous_tick_groups_times.length-1] += data.timeDeltas[tick_index]
    previous_tick_index = tick_index
  }

  return {
    contiguous_tick_groups,
    contiguous_tick_groups_times,
  }
}

/*
 * This function recursively goes through the tree of the profing data and compute the results_grouped_by_function global variable in which it puts information for every function which we at least once detected as taking longer than LONG_OPERATION_THRESHOLD.
 */
function analyzeNode(node_id, depth) {
  let node_data = nodes_map.get(node_id)
  if (node_data == null) {
    throw new Error('cannot find node: ' + node_id)
  }
  let children_time = 0
  node_data.ticks_indices_total = _.clone(node_data.ticks_indices_self)
  let long_ops_count_children = 0

  // Recursive call on children
  for (let child_id of node_data.children) {
    let child_results = analyzeNode(child_id, depth+1)
    children_time += child_results.total_time
    for (let tick_index of child_results.ticks_indices_total) {
      node_data.ticks_indices_total.push(tick_index)
    }
    long_ops_count_children += child_results.long_ops_count
  }

  node_data.ticks_indices_total.sort()
  node_data.total_time = node_data.self_time + children_time

  let {contiguous_tick_groups, contiguous_tick_groups_times} = findSpanInTickList(node_data.ticks_indices_total)
  //let {contiguous_tick_groups, contiguous_tick_groups_times} = findSpanInTickList(node_data.ticks_indices_self)

  let long_ops_count = 0
  if (node_data.callFrame.url != null
    && node_data.callFrame.url.includes(REPO_NAME + '/')
    && ! node_data.callFrame.url.includes('/node_modules/')
  ) {
    let long_ops_worst_time = 0
    // Now find which groups are long
    for (let i=0; i<contiguous_tick_groups_times.length; i++) {
      if (contiguous_tick_groups_times[i]/1000 > LONG_OPERATION_THRESHOLD) {
        long_ops_count++
        if (contiguous_tick_groups_times[i] > long_ops_worst_time) {
          long_ops_worst_time = contiguous_tick_groups_times[i]
        }
      }
    }
    // Do not report long sync ops on this node if we already reported any of its children
    if (long_ops_count_children === 0 && long_ops_count > 0) {
      let line_in_code_description = node_data.callFrame.url.split(REPO_NAME + '/')[1]
      if (node_data.callFrame.lineNumber) {
        line_in_code_description += ':' + (node_data.callFrame.lineNumber + 1) // 0-based by default
      }
      if (node_data.callFrame.functionName) {
        line_in_code_description += ':' + node_data.callFrame.functionName
      }

      if (results_grouped_by_function.get(line_in_code_description) == null) {
        results_grouped_by_function.set(line_in_code_description, {
          line_in_code_description,
          long_ops_worst_time: 0,
          long_ops_total_count: 0,
          different_call_stack_count: 0,
        })
      }

      let result = results_grouped_by_function.get(line_in_code_description)
      result.long_ops_worst_time += long_ops_worst_time
      result.long_ops_total_count += long_ops_count
      result.different_call_stack_count += 1
    }
  }

  if (node_data.ticks_indices_self.length !== node_data.total_ticks) {
    throw new Error('bug')
  }

  if (process.env.DEBUG_OP) console.log('id ' + node_data.id + ': self time: ' + node_data.self_time/1000 + ' ms / total time: ' + node_data.total_time/1000 + ' ms / self ticks: ' + node_data.ticks_indices_self.length + ' / total ticks: ' + node_data.ticks_indices_total.length + ' spans: ' + contiguous_tick_groups.length + ' / spans lengths: ' + contiguous_tick_groups.map(x => x.length) + ' / spans times (ms): ' + contiguous_tick_groups_times.map(x => x/1000))

  return {
    total_time: node_data.total_time,
    ticks_indices_total: node_data.ticks_indices_total,
    long_ops_count: long_ops_count + long_ops_count_children,
  }
}

/*
 * Reads the results_grouped_by_function global variable and prints an ordered list of all functions which were detected and human-readble information.
 */
function reportResults() {
  let sorted_results = Array.from(results_grouped_by_function.values())

  sorted_results.sort((a, b) => b.long_ops_worst_time - a.long_ops_worst_time)

  for (let result of sorted_results) {
    let description = result.line_in_code_description + ' - ' + result.long_ops_worst_time/1000 + ' ms - ' + result.long_ops_total_count + ' ops - ' + result.different_call_stack_count + ' different_call_stacks'
    console.log(description)
  }
}

/*
 * Main script function.
 */
function main() {
  if (process.argv.length < 3) {
    console.error('Missing argument: profiling file')
    process.exit(1)
  }

  console.log('Reading file...')
  data = fs.readFileSync(process.argv[2])

  console.log('Parsing file...')
  data = JSON.parse(data)
  console.log(data.nodes.length + ' nodes')
  console.log(data.samples.length + ' samples')
  console.log(data.timeDeltas.length + ' timeDeltas')
  console.log((data.endTime - data.startTime)/1000000 + ' seconds')
  tick_period = (data.endTime - data.startTime) / data.timeDeltas.length
  console.log('Average tick period: ' + tick_period/1000 + ' ms')

  console.log('Putting nodes in hash...')
  let blacklisted_node_ids = []
  for (let node_data of data.nodes) {
    nodes_map.set(node_data.id, node_data)
    node_data.self_time = 0
    node_data.total_ticks = 0
    node_data.ticks_indices_self = []
    if (node_data.callFrame.functionName === '(garbage collector)') {
      blacklisted_node_ids.push(node_data.id)
    }
  }
  if (blacklisted_node_ids.length !== 1) throw new Error('could not find GC node')
  console.log(nodes_map.size + ' nodes indexed')

  // Filter out GC because it happens in parallel to code execution
  // and we would therefore mistake it for a finish of
  // the current function execution.
  let new_samples = []
  let new_timeDeltas = []
  for (let i=0; i<data.samples.length; i++) {
    if (! blacklisted_node_ids.includes(data.samples[i])) {
      new_samples.push(data.samples[i])
      new_timeDeltas.push(data.timeDeltas[i])
    }/* else {
      new_samples.push(new_samples[new_samples.length-1])
      new_timeDeltas.push(new_timeDeltas[new_timeDeltas.length-1])
    }*/
  }
  data.samples = new_samples
  data.timeDeltas = new_timeDeltas
  console.log(data.samples.length + ' samples after filtering')

  // We we have a tick in the garbage collector, we assume we are still in the same
  // function as just before the GC. By empirically comparing results, it seems
  // that this is the Chrome inspector does.
  let time_delta_total = 0
  for (let i=0; i<data.samples.length; i++) {
    let node_id = data.samples[i]
    let node_data = nodes_map.get(node_id)
    node_data.total_ticks++
    node_data.self_time += data.timeDeltas[i]
    time_delta_total += data.timeDeltas[i]
    node_data.ticks_indices_self.push(i)
  }
  console.log('time_delta_total = ' + time_delta_total/1E6 + ' seconds')

  console.log('Processing recursively...')
  analyzeNode(1, 0)

  if (data.samples.length !== nodes_map.get(1).ticks_indices_total.length) throw new Error('wrong ticks sum')

  console.log('Preparing report...')
  reportResults()
}

main()
