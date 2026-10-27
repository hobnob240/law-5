# Book a Medium Night

Website, members' portal and admin console for Book a Medium Night, built on Cloudflare Workers with KV storage.

- Venues register for free. Each listing waits for admin approval (you can turn this off in Settings).
- Mediums create an account and pay £100 for 12 months through Stripe Checkout. It's a single payment with no automatic renewal.
- Active members can see venues within their travel radius, along with the venues' contact details.
- The admin console is at `/admin/`. Each partner gets their own login.

## Deploy

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/hobnob240/law-5/tree/book-a-medium-night)

During the deploy you'll be asked for one secret:

- `SETUP_CODE`: any phrase of 8 or more characters. You enter it once at `/admin/setup/` to create the first admin login.

Optional secrets, which you add later in Cloudflare under Settings → Variables and Secrets:

- `STRIPE_SECRET_KEY`: your Stripe secret key, for card payments.
- `STRIPE_WEBHOOK_SECRET`: the signing secret for the webhook `https://<your-site>/stripe/webhook`, which listens for the event `checkout.session.completed`.

No keys or passwords are stored in this repository or sent to browsers.

## Privacy and data

- **Cookies:** only essential login cookies are used. There is no analytics or tracking, and fonts are self-hosted, so no cookie banner is needed.
- **Automatic deletion:** a daily job deletes:
  - venues 3 months after their last date,
  - unpaid accounts after 30 days,
  - lapsed members 24 months after their membership ends,
  - payment records after 6 years.
- **Members' rights:** members can download or delete their own data. Venues can edit or delete their listing with their private link.
