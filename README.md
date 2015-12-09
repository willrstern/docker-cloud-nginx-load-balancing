# tutum-nginx
Dynamic DNS for Tutum

When services stop, start, or scale in Tutum, this container will look for all services and reconfigure/reload Nginx with external DNS.

## Setting up Tutum
Get your Tutum token and add your username/token to `lib/tutum.js`

Create 2 clusters on tutum, one with the deploy tag of `apps` and one with the deploy tag of `dns`.

Run this container with the `Every Node` strategy and the `dns` deploy tag.<br/>
Run all of your other apps with the `apps` deploy tag.<br/>
Send all of your DNS entries to the `dns` node IP addresses.

## Load Balancing a Service
On any Tutum service, add `DNS_ENTRY` and `DNS_PORT` Environment variables.

e.g. `DNS_ENTRY=somesite.com` & `DNS_PORT=3000` will create an nginx config to load balance `<allnodes>:3000` to traffic from `somesite.com`


