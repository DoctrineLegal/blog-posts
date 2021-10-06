var express = require('express');
var router = express.Router();
const AsyncHook = require('async_hooks')

const map = new Map()

let db = {
  // Fake DB function
  execute: function(query, callback) {
    setTimeout(callback, 100)
  }
}

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

function crashInCallback() {
  db.execute('SELECT now()', () => {
    let x = null
    x.crash = 4
  })
}
router.get('/crash1', function a(req, res, next) {
  crashInCallback()
})
router.get('/crash2', function a(req, res, next) {
  crashInCallback()
})

module.exports = router;
