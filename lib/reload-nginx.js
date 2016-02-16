import axios from "axios";
import checksum from "checksum";
import fs from "fs";
import { exec } from "child_process";
import { find } from "lodash";

import nginxTemplate from "./nginx-template";
import { api as dockerCloud } from "./docker-cloud";

const { NGINX_LB_NAME: lbName, SLACK_WEBHOOK: slackWebhook } = process.env;
const configFileName = process.env.NGINX_CONFIG_FILE || "/etc/nginx/conf.d/default.conf";
const certsPath = process.env.NGINX_CERTS || "/certs";

try {
  fs.mkdirSync(certsPath);
} catch(e) {}

/*
 Sequence of Events
*/
module.exports = function() {
  // list all containers
  dockerCloud('/api/app/v1/container/')
    .then(fetchFullContainerDetail)
    .then(getLBServices)
    .then(generateNewConfig)
    .catch(err => console.log("Error:", err, err.stack));
  ;
};


/*
Helper Functions
*/

function fetchFullContainerDetail(allContainers) {
  // Fetch-in-parallel the full resource for each container
  return Promise.all(
    allContainers.objects.map(container => dockerCloud(container.resource_uri))
  );
}

function getLBServices(allContainers) {
  const configs = [];

  //find containers that have NGINX_SERVER_NAME env var
  allContainers.filter((container) => {
    return container.container_envvars
      .filter(env => env.key === "NGINX_LB" && env.value === lbName)
      .length
    ;
  })
  //grab config from each service
  .forEach((container) => {
    const certs = find(container.container_envvars, {key: "NGINX_CERTS"});
    const allCerts = !certs ? [] : certs.value.split(",").map(val => val.split("\\n").join("\n"));
    const ip = find(container.container_envvars, {key: "DOCKERCLOUD_IP_ADDRESS"});
    const port = find(container.container_envvars, {key: "NGINX_PORT"});
    const serviceName = find(container.container_envvars, {key: "DOCKERCLOUD_SERVICE_HOSTNAME"}).value;
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

function generateNewConfig(configs) {
  if (configs.length) {
    const newNginxConf = nginxTemplate.render({ configs });

    //reload nginx if config has changed
    checksum.file(configFileName, (err, sum) => {
      if (sum !== checksum(newNginxConf)) {
        reloadNginxConfig(newNginxConf);
      } else {
        console.log("Nginx config was unchanged");
      }
    });
  }
}

function reloadNginxConfig(config) {
  fs.writeFileSync(configFileName, config);
  const testCmd = process.env.NGINX_RELOAD === "false" ? "echo ()@" : "nginx -t";
  const reloadCmd = process.env.NGINX_RELOAD === "false" ? "" : "service nginx reload";
  console.log("Testing new Nginx config...");

  exec(testCmd, (error, stdout, stderr) => {
      if (error !== null) {
        configFailed(config, stderr);
      } else {
        exec(reloadCmd, (error, stdout, stderr) => {
          if (error !== null) {
            configFailed(config, stderr);
          } else {
            console.log('Nginx reload successful');
            console.log(config);
          }
        });
      }
  });
}

function configFailed(config, stderr) {
  console.log("Config failed", stderr);
  console.log(config);

  if (slackWebhook) {
    const text = `Nginx (${lbName}) config failed:
*Error:*
\`\`\`${stderr}\`\`\`
*Config:*
\`\`\`${config}\`\`\`
    `;

    axios.post(slackWebhook, {text, username: `Nginx ${lbName}`});
  }
}
