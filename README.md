# window-pipe
Browser window to window two-way communication based on `window.postMessage()`.

Main features:
- Seamless asychronus communication between pages in same or different domain.
- Written in Typescript.
- Below 10kB before gzipping.
- Promise based connection establishing (handshake).
- Timeout management on connection and request level.
- Universal request command signature (method, parameters, timeout)
- Request buffering until pipe connected.
- Incomming requests listerner.
- Promise based request sending with commands to "other side" recipient.
- Posiblity to receive responses to send requests.

# Getting started

To start communication between two browser windows you need reference to each window object. On each end of communication page has to reference window-pipe lib, and have to establish a connection. Pages can be loaded form different domains.

Below example shows communication between "Parent" page that embeds iframe with "Child" window. Web module imports have been used in node enviroment replace them with `import WindowPipe from 'window-pipe'`

## Parent

``` js
import WindowPipe from 'https://cdn.jsdelivr.net/npm/window-pipe@latest'

// *** PIPE SETUP
// create window pipe instance
const pipe = new WindowPipe
// get reference to iframe containg child window
// iframe element with src attribute and id 'child' set to child window page has to be already present in DOM.
const childFrame = document.getElementById('child')

pipe.authKey = 'window-pipe-demo'

// pipe internal loger
// pipe.onLog = (l) => console.log(l)

// await for iframe loading
childFrame.addEventListener('load', () => {
  // set origin and window
  pipe.targetOrigin = childFrame.src
  pipe.targetWindow = childFrame.contentWindow

  // start connecting the pipe
  pipe.connect().then(() => console.log('CONNECTED!')) 
});

// subscribe to received event
pipe.onReceived = cmd => console.log(cmd)

// send pipe command named 'ping-from-parent' every 2,5 seconds
setInterval(() => {
  pipe.send({
    method: 'ping-from-parent',
    timeout: 0
  })    
}, 2500)
```

## Child (frame)

``` js
import WindowPipe from 'https://cdn.jsdelivr.net/npm/window-pipe@latest'

// *** PIPE SETUP
// create window pipe instance
const pipe = new WindowPipe

// set origin and window
// origin have to have exact match with parent page url
pipe.targetOrigin = 'https://cdpn.io/xtech-dev/fullpage/Exeqjxm?nocache=true&view=' // change to url / host of the window that embeds child window.
// because child window is embed into iframe we will be communicating with parent window
pipe.targetWindow = window.parent

// set key that will identify created pipe (distinguish between other parties that will send messages to same window)
pipe.authKey = 'window-pipe-demo'

// pipe internal loger
// pipe.onLog = (l) => console.log(l)

// connect to the pipe
pipe.connect().then(() => {
  console.log('CONNECTED!')
})

// subscribe to received event
pipe.onReceived = cmd => console.log(cmd)

// send pipe command named 'ping-from-parent' every 3 seconds
setInterval(() => {
  pipe.send({
    method: 'ping-from-child',
    timeout: 0
  })    
}, 3000)
```

# Live example

https://codepen.io/xtech-dev/full/Exeqjxm

Parent: https://codepen.io/xtech-dev/pen/Exeqjxm

Child: https://codepen.io/xtech-dev/full/Exeqjxm