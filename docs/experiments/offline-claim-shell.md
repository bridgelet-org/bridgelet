# Offline-capable claim page with service worker

## Summary

The claim experience now registers a service worker from the app shell so the page can load its cached shell when the network is slow or unavailable. The worker caches core app routes and assets and serves a fallback for navigation requests, making the claim page accessible in low-connectivity conditions.

## Notes

- The service worker is registered from the root layout.
- A web app manifest was added so the app can be installed and treated as a standalone experience.
- The offline behavior is covered by a regression test for service worker registration.
