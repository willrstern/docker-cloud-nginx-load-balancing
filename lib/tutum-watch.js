import reloadNginx from "./reload-nginx";
import { createStream } from "./tutum";

//Build Initial Config
reloadNginx();
createStreamEvents(createStream());

function createStreamEvents(stream) {
  stream.on('open', () => console.log('Listening for Tutum Change Events'));
  stream.on('error', (message) => console.log('Tutum Stream Error: %s', message));
  stream.on('close', (message) => {
    console.log('Tutum Socket connection closed unexpectedly', message);
    createStreamEvents(createStream());
  });
  stream.on('message', (message) => {
    message = JSON.parse(message);
    if (message.state === "Running" && ~["container", "service"].indexOf(message.type)) {
      reloadNginx();
    }
  });
}
