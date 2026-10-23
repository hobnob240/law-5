# Law and Son Decorators website

Website, admin console and enquiry inbox for Law and Son Decorators, Wolverhampton. Runs as one Cloudflare Worker with KV storage.

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/hobnob240/law-5/tree/law-and-son-site)

## Publish from a phone

1. Open the Deploy to Cloudflare link above and sign in to Cloudflare.
2. Connect GitHub if asked. Cloudflare makes a copy of this code in your GitHub account.
3. Leave the storage as **Create new**. For **SETUP_CODE**, make up a phrase of 8 or more characters.
4. Press **Create and deploy** and wait for it to finish.
5. Open `https://<your-worker>.workers.dev/admin`, enter the setup code, and choose a username and password.

Every change pushed to the new repository's main branch publishes automatically.

## What the admin does

- **Enquiries**: every quote request and message from the website, with Call, WhatsApp and Email buttons, notes, replied and archive.
- **Photos**: upload from the phone camera; photos are resized before upload.
- **Reviews, business details, website text, Google & privacy, account**.

Anything left blank (phone, owner, insurance, reviews, photos) stays hidden on the website.

## Forgotten password

In Cloudflare: Storage & databases → KV → the site's namespace → delete the keys `auth:user` and `auth:hash`. Then open `/admin` and set up again with the SETUP_CODE.

## Privacy

Enquiries are stored in Cloudflare KV and deleted automatically after the period set in the admin (12 months by default). The public site sets no cookies; the admin uses one login cookie.
