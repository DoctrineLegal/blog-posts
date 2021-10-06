# async-hooks

This simple project shows how Async Hooks can help find automatically find the original HTTP request that trigerred an error.

It was generated with:
express --view=ejs myapp
The only files which we modified after are:
myapp/app.js: the modified section is explicitely delimited by comments
myapp/asyncHooksDoctrineSimplified.js: this is core of the async hooks implementation

To run it (you need at least Node.js 8):

```console
cd myapp
npm install
npm start
```

Then to test the concept:
Go to http://localhost:3000/ to check the app is running (you should see "Welcome to Express")
Go to http://localhost:3000/crash1 or http://localhost:3000/crash2

The application will crash, but you should be able to see in the console whether it was /crash1 or /crash2 that triggered the crash. The is the value added by our Async Hooks system.

Example here with crash1:

```
**_ Application crashed (uncaught exception) _**

Path triggering the error (this is the magic): /crash1
TypeError: Cannot set property 'crash' of null
at Timeout.db.execute [as _onTimeout] (/Users/raphaelchampeimont/async-hooks-demo/myapp/routes/index.js:22:13)
at ontimeout (timers.js:498:11)
at tryOnTimeout (timers.js:323:5)
at Timer.listOnTimeout (timers.js:290:5)
```
