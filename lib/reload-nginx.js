import { filter, findWhere } from "lodash";
import checksum from "checksum";
import { exec } from "child_process";
import fs from "fs";

import nginxTemplate from "./nginx-template";
import { api as tutum } from "./tutum";

const configFileName = process.env.NGINX_CONFIG_FILE || "/etc/nginx/conf.d/default.conf";

module.exports = function() {
  tutum('/api/v1/container/')
    .then((allContainers) => {
      //fetch full resource for each container
      return Promise.all(
        allContainers.objects.map(container => tutum(container.resource_uri))
      );
    })
    .then(getNginxConfigs)
    .then((configs) => {
      if (configs.length) {
        const newNginxConf = nginxTemplate.render({ configs });

        //reload nginx if config has changed
        checksum.file(configFileName, (err, sum) => {
          if (sum !== checksum(newNginxConf)) {
            reloadNginxConfig(newNginxConf);
          }
        });
      }
    })
    .catch(err => console.log("Error:", err, err.stack));
  ;
};

function getNginxConfigs(allContainers) {
  const configs = [];

  //find containers that have NGINX_SERVER_NAME env var
  allContainers.filter((container) => {
    return container.container_envvars
      .filter(env => env.key.match(/^NGINX_SERVER_/))
      .length
    ;
  })
  //grab dns entries from each service
  .forEach((container) => {

    const servers = filter(container.container_envvars, envVar => envVar.key.match(/^NGINX_SERVER_/))
      .map(server => JSON.parse(server.value))
    ;
    const ip = findWhere(container.container_envvars, {key: "TUTUM_IP_ADDRESS"});
    const port = findWhere(container.container_envvars, {key: "NGINX_PORT"});
    const serviceName = findWhere(container.container_envvars, {key: "TUTUM_SERVICE_HOSTNAME"}).value;

    let config = findWhere(configs, { serviceName });

    if (!config) {
      config = {
        serviceName,
        servers,
        upstreamName: serviceName.replace(/[^A-z]/g, ""),
        upstream: [],
      };
      configs.push(config);
    }

    //get ip from "tcp://10.7.0.1:3000"
    config.upstream.push(`${ip.value.split("/")[0]}:${port ? port.value : 80}`);
  });

  return configs;
}

function reloadNginxConfig(config) {
  fs.writeFileSync(configFileName, config);
  if (process.env.NGINX_RELOAD === "false") { return; }

  console.log("testing new Nginx config...");
  exec('nginx -t', (error, stdout, stderr) => {
      if (error !== null) {
        console.log('Nginx config error: ' + stderr);
      } else {
        exec('service nginx reload', (error, stdout, stderr) => {
          if (error !== null) {
            console.log('Nginx reload error: ' + stderr);
          } else {
            console.log('Nginx reload successful');
          }
        });
      }
  });
}
