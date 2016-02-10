# tutum-nginx-load-balancing
Dynamic Nginx Load Balancing for Tutum

- All Tutum services are acessible through Tutum's API, this allows us to use Tutum's API for service discovery.
- When services stop, start, or scale in Tutum, `willrstern/tutum-nginx` containers will notice.
- This allows `willrstern/tutum-nginx` containers to dynamically load balance all services with the `NGINX_SERVER_<descriptor>` ENV variables set.

## 1) Tutum Setup
- Create 2 node clusters on tutum, one with the deploy tag of `apps` and one with the deploy tag of `nginx`.
<br/><img src="https://farm1.staticflickr.com/628/23806789896_555c9f486b.jpg" style="width: 200px;" />
<br/><br/>As the names imply, you will give all of your apps, services, databases, etc an `apps` deploy tag, while only `willrstern/tutum-nginx` containers get the `nginx` tag.  This way, nginx will always be on the exact same IP addresses, so DNS can be directed reliably.

- Send all of your DNS entries & subdomains to the `nginx` node IP addresses.
(NOTE: [DynDNS (dyn.com)](http://dyn.com) supports active failover for IP addresses in case a node goes down, this is a great solution for DNS)

## 2) Running the Load Balancer
Run one or more copies of `willrstern/tutum-nginx` on Tutum.
- add the `nginx` deploy tag & choose the `every node` strategy.<br/>
- Choose the autorestart `always` option as well.<br/>![](https://farm6.staticflickr.com/5691/23724570952_99cc571d7e_z.jpg)
- __MAKE SURE__ to choose the `Full Access` API role on the Environment Variables page or the load balancer won't be able to detect running services via the Tutum API.<br/>![](https://farm6.staticflickr.com/5659/23806877596_fccba186d5_z.jpg)
- Give the LB a name via the `NGINX_LB_NAME=prod` env variable.

The Nginx service will now listen to Tutum's stream API.  As services change, this LB will balance services with the `NGINX_LB=prod` env var. A new Nginx configuration is generated & tested with `nginx -t`.  If Nginx accepts the new configuration, it will reload nginx.


## 3) Load Balancing a Service
Simply run your services on Tutum with the `NGINX_PORT` and one or more `NGINX_SERVER_*` environment variables set in your `Dockerfile`:
```
ENV NGINX_LB prod
ENV NGINX_VIRTUAL_HOST test.com,othersite.com
ENV NGINX_PORT 3000
```

When your service starts, `willrstern/tutum-nginx` will notice each container and immediately reload it's config!

__NOTE__: Apps don't need to expose ports to be load balanced!  Tutum gives each container an IP (much like [CoreOS Flannel](https://github.com/coreos/flannel)).  So don't add `EXPOSE` to your Dockerfile.

## 4) SSL Termination
- create a cert
- concatenate the `.key` and `.crt` files
- replace newlines with `\\n` and copy the output
```
openssl req -x509 -newkey rsa:2048 -keyout mysite.key -out mysite.crt -days 1080 -nodes -subj '/CN=*/O=My Company Name LTD./C=US'
cat mysite.key mysite.crt > mysite.combined.crt
awk 1 ORS='\\\\n' mysite.combined.crt
```
- add the combined key & cert into `NGINX_CERTS` env var to your `Dockerfile`
```
ENV NGINX_CERTS -----BEGIN RSA PRIVATE KEY-----\\nMIIEogIBAAKCAQEA...and so on
```

If you have multiple `NGINX_VIRTUAL_HOST`s, add a cert for each host with `,` in-between: i.e.
```
ENV NGINX_VIRTUAL_HOST mysite.com,othersite.com
ENV NGINX_CERTS <mysite.com key & cert>,<othersite.com key & cert>
```
or
```
ENV NGINX_VIRTUAL_HOST mysite.com,othersite.com
# only do SSL on othersite.com
ENV NGINX_CERTS ,<othersite.com key & cert>
```

## Local Development Workflow
- Set the `TUTUM_AUTH`, `TUTUM_REST_HOST`, `TUTUM_STREAM_HOST` environment variables and run `npm start`.  It will now watch your Tutum cluster for events and generate a config to `./default.conf`
  - __How do I get those variables?__ 
  - Run any service on Tutum with the `Full Access` API role on the environment variables page.
  - Now select the running service and look at the running service's environment variables tab.  You'll see them in the list.

