# tutum-nginx-load-balancing
Dynamic Nginx Load Balancing for Tutum

- All Tutum services are acessible through Tutum's API, this allows us to use Tutum's API for service discovery.
- When services stop, start, or scale in Tutum, `willrstern/tutum-nginx` containers will notice.
- This allows `willrstern/tutum-nginx` containers to dynamically load balance all services with the `NGINX_SERVER_NAME` ENV variable set.

## 1) Tutum Setup
- Create 2 node clusters on tutum, one with the deploy tag of `apps` and one with the deploy tag of `nginx`.
<br/><img src="https://farm1.staticflickr.com/628/23806789896_555c9f486b.jpg" style="width: 200px;" />
<br/><br/>As the names imply, you will give all of your apps, services, databases, etc an `apps` deploy tag, while only `willrstern/tutum-nginx` containers get the `nginx` tag.  This way, nginx will always be on the exact same IP addresses, so DNS can be directed reliably.

- Send all of your DNS entries & subdomains to the `nginx` node IP addresses.
(NOTE: [DynDNS (dyn.com)](http://dyn.com) supports active failover for IP addresses in case a node goes down, this is a great solution for DNS)

## 2) Running the Load Balancer
Run one or more copies of `willrstern/tutum-nginx` on Tutum.
- add the `nginx` deploy tag<br/>![](https://farm6.staticflickr.com/5691/23724570952_99cc571d7e_z.jpg)
- __MAKE SURE__ to choose the `Full Access` API role on the Environment Variables page or the load balancer won't be able to detect running services via the Tutum API.<br/>![](https://farm6.staticflickr.com/5659/23806877596_fccba186d5_z.jpg)
- __OPTIONAL__: If you want to direct internal/VPN and external traffic to different endpoints, then assign a `PRIVATE_IP=<your.vpn.ip>` environment variable to the Nginx service.

The Nginx service will now listen to Tutum's stream API.  As services change, a new Nginx configuration is generated & tested with `nginx -t`.  If Nginx accepts the new configuration, it will reload nginx.


## 3) Load Balancing a Service
Simply run your service on Tutum with the following environment variables set in your `Dockerfile`
```
ENV NGINX_SERVER_NAME somesubdomain.mydomain.com
ENV NGINX_PORT 3000
ENV NGINX_PUBLIC_PATH /external
ENV NGINX_PRIVATE_PATH /  #optional
```

`NGINX_PRIVATE_PATH` is optional and only works if the Nginx service has a `PRIVATE_IP` environment variable.

When your service starts, `willrstern/tutum-nginx` will notice each container and immediately reload it's config!

__NOTE__: Apps don't need to expose ports to be load balanced!  Tutum gives each container an IP (much like [CoreOS Flannel](https://github.com/coreos/flannel)).  So don't add `EXPOSE` to your Dockerfile.


