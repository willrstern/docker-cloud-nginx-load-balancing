import reloadNginx from "./reload-nginx";
import { createStream } from "./docker-cloud";

//Build Initial Config
reloadNginx();
createStreamEvents(createStream());

function createStreamEvents(stream) {
  stream.on('open', () => console.log('Listening for Docker Cloud Change Events'));
  stream.on('error', (message) => console.log('Docker Cloud Stream Error: %s', message));
  stream.on('close', (message) => {
    console.log('Docker Cloud Socket connection closed unexpectedly', message);
    createStreamEvents(createStream());
  });
  stream.on('message', (message) => {
    message = JSON.parse(message);
    if (~["Running", "Stopped"].indexOf(message.state) && ~["container", "service"].indexOf(message.type)) {
      reloadNginx();
    }
  });
}
