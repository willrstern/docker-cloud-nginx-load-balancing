import reloadNginx from "./reload-nginx";
import { stream } from "./tutum";

//Build Initial Config
reloadNginx();

stream.on('open', () => console.log('Listening for Tutum Change Events'));
stream.on('error', (message) => console.log('Tutum Stream Error: %s', message));
stream.on('close', () => {
  console.log('Tutum Socket closed unexpectedly', arguments);
  process.exit(1); //Make sure to run with autorestart=always!
});
stream.on('message', (message) => {
  message = JSON.parse(message);
  if (message.state === "Running" && ~["container", "service"].indexOf(message.type)) {
    reloadNginx();
  }
});
