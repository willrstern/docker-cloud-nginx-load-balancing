const reloadNginx = require('./lib/reload-nginx');
const tutum = require('./lib/tutum');

//Build Initial Config
reloadNginx();

tutum.stream.on('open', () => console.log('Listening for Tutum Change Events'));
tutum.stream.on('error', (message) => console.log('Tutum Stream Error: %s', message));
tutum.stream.on('close', () => console.log('Tutum Socket closed', arguments));
tutum.stream.on('message', (message) => {
  message = JSON.parse(message);
  if (message.state === "Running" && ~["container", "service"].indexOf(message.type)) {
    reloadNginx();
  }
});
