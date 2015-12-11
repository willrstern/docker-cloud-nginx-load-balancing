"use strict";
const _ = require('lodash');
const checksum = require('checksum');
const exec = require('child_process').exec;
const fs = require('fs');

const nginxTemplate = require('./nginx-template');
const tutum = require('./tutum').api;
const privateIp = process.env.PRIVATE_IP || null;

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
        const newNginxConf = nginxTemplate.render({
          servers:configs,
          privateIp: privateIp,
        });
        return console.log(newNginxConf);
        //reload nginx if config has changed
        checksum.file("/etc/nginx/conf.d/default.conf", (err, sum) => {
          if (sum !== checksum(newNginxConf)) {
            reloadNginxConfig(newNginxConf);
          }
        });
      }
    })
    .catch(err => console.log("Error:", err.stack));
  ;
};

function getNginxConfigs(allContainers) {
  const configs = [];

  //find containers that have NGINX_SERVER_NAME env var
  allContainers.filter((container) => {
    return container.container_envvars
      .filter(env => env.key === "NGINX_SERVER_NAME")
      .length
    ;
  })
  //grab dns entries from each service
  .forEach((container) => {
    const serverName = _.findWhere(container.container_envvars, {key: "NGINX_SERVER_NAME"});
    const port = _.findWhere(container.container_envvars, {key: "NGINX_PORT"});
    const ip = _.findWhere(container.container_envvars, {key: "TUTUM_IP_ADDRESS"});
    const publicPath = _.findWhere(container.container_envvars, {key: "NGINX_PUBLIC_PATH"});
    const privatePath = _.findWhere(container.container_envvars, {key: "NGINX_PRIVATE_PATH"});

    let config = _.findWhere(configs, {serverName: serverName.value});

    if (!config) {
      config = {
        serverName: serverName.value,
        upstreamName: serverName.value.replace(/[^A-z]/g, ""),
        publicPath: publicPath ? publicPath.value : "/",
        privatePath: privatePath ? privatePath.value : null,
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
  fs.writeFileSync("/etc/nginx/conf.d/default.conf", config);
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
