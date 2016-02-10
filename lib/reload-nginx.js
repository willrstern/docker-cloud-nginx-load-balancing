import checksum from "checksum";
import fs from "fs";
import { exec } from "child_process";
import { find } from "lodash";

import nginxTemplate from "./nginx-template";
import { api as tutum } from "./tutum";

const configFileName = process.env.NGINX_CONFIG_FILE || "/etc/nginx/conf.d/default.conf";
const certsPath = process.env.NGINX_CERTS || "/certs";
try {
  fs.mkdirSync(certsPath);
} catch(e) {}

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
          } else {
            console.log("nginx config unchanged");
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
      .filter(env => env.key === "NGINX_LB" && env.value === process.env.NGINX_LB_NAME)
      .length
    ;
  })
  //grab config from each service
  .forEach((container) => {
    const certs = find(container.container_envvars, {key: "NGINX_CERTS"});
    const allCerts = !certs ? [] : certs.value.split(",").map(val => val.split("\\n").join("\n"));
    const ip = find(container.container_envvars, {key: "TUTUM_IP_ADDRESS"});
    const port = find(container.container_envvars, {key: "NGINX_PORT"});
    const serviceName = find(container.container_envvars, {key: "TUTUM_SERVICE_HOSTNAME"}).value;
    const virtualHosts = find(container.container_envvars, {key: "NGINX_VIRTUAL_HOST"}).value
      .split(",")
      .map((host, i) => {
        let ssl = false;

        //if certs exist, write them as files and set ssl to true
        if (allCerts[i] && allCerts[i].length) {
          fs.writeFileSync(`${certsPath}/${host}.crt`, allCerts[i]);
          ssl = true;
        }

        return { host, ssl };
      })
    ;

    let config = find(configs, { serviceName });

    if (!config) {
      config = {
        serviceName,
        virtualHosts,
        upstreamName: serviceName.replace(/[^A-z]/g, ""),
        upstream: [],
      };
      configs.push(config);
    }

    //get ip from "10.7.0.8/16"
    config.upstream.push(`${ip.value.split("/")[0]}:${port ? port.value : 80}`);
  });
  console.log(configs.length ? configs : "There are no services to load balance");
  return configs;
}

function reloadNginxConfig(config) {
  fs.writeFileSync(configFileName, config);
  if (process.env.NGINX_RELOAD === "false") {
    return console.log(config);
  }

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
            console.log(config);
          }
        });
      }
  });
}
