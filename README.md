# tutum-nginx-load-balancing
Dynamic Nginx Load Balancing for Tutum

When services stop, start, or scale in Tutum, this container dynamically reconfigure & reload Nginx to load balance services.

## Running the Load Balancer
Run one or more copies of `willrstern/tutum-nginx` (or your image built from this repo) on Tutum.<br/>
__IMPORTANT__: When creating the service, make sure to choose the `Full Access` API role on the Environment Variables page.

__OPTIONAL__: If you want to support redirection of internal and external traffic, then assign a `PRIVATE_IP=123.45.67.89` environment variable to the Nginx service.

The Nginx service will listen to Tutum's stream API.  As services change, a new Nginx configuration is generated & tested with `nginx -t`.  If Nginx accepts the new configuration, it will reload nginx.


## Load Balancing a Service
Set the following environment variables in your `Dockerfile` (or manuall on Tutum when setting up the service)
```
ENV NGINX_SERVER_NAME somesubdomain.mydomain.com
ENV NGINX_PORT 3000
ENV NGINX_PUBLIC_PATH /external
ENV NGINX_PRIVATE_PATH /  #optional
```

`NGINX_PRIVATE_PATH` is optional and only works if the Nginx service has a `PRIVATE_IP` environment variable.

__NOTE__: Apps don't need to expose ports to be load balanced!  Tutum gives each container an IP (much like [CoreOS Flannel](https://github.com/coreos/flannel))

## Recommended Tutum Setup
Create 2 clusters on tutum, one with the deploy tag of `apps` and one with the deploy tag of `nginx`.

Run this container with the `Every Node` strategy and the `nginx` deploy tag.<br/>
Run all of your other apps with the `apps` deploy tag.<br/>
Send all of your DNS entries to the `nginx` node IP addresses.
([Dyn.com](http://dyn.com) supports active failover for IP addresses in case a node goes down)
