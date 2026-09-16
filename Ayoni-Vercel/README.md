# Ayoni — Vercel + Supabase Ecommerce

Production-ready starter for the Ayoni unisex fashion store in Ilorin, Kwara.

## Admin dashboard

The admin dashboard is now protected by Supabase Auth. You can manage the catalog without editing code:

- Add products
- Upload product photos from phone or computer
- Edit product name, category, price and description
- Add/remove sizes
- Add/remove colors
- Set stock for every size/color combination
- Delete products
- View customer orders
- Change order status: pending, paid, processing, shipped, delivered, cancelled
- Refresh catalog/orders from the dashboard

## 1. Create Supabase project

Create a Supabase project and run `supabase/schema.sql` in the SQL Editor.

The SQL creates the `products` and `orders` tables and a public `product-images` Storage bucket. The browser does not receive the server secret; uploads are performed by the protected Vercel API.

## 2. Create the admin account

In Supabase Authentication, create the admin user with the email you want to use for the store manager. Set the same email in Vercel as `AYONI_ADMIN_EMAIL`.

Example:

`AYONI_ADMIN_EMAIL=admin@yourdomain.com`

The admin dashboard will only allow that authenticated email to use product/order management APIs.

## 3. Vercel environment variables

Set these in Vercel Project Settings → Environment Variables:

- `VITE_SUPABASE_URL` — Supabase project URL
- `VITE_SUPABASE_ANON_KEY` — Supabase publishable/anon key
- `SUPABASE_URL` — same Supabase project URL
- `SUPABASE_SECRET_KEY` — Supabase server secret/service-role key; server only
- `AYONI_ADMIN_EMAIL` — admin account email
- `AYONI_WHATSAPP_NUMBER` — WhatsApp number with country code, digits only
- `PAYSTACK_SECRET_KEY` — Paystack secret key (optional until payments are enabled)

Never prefix the server secret with `VITE_`.

## 4. Deploy

Build command: `npm run build`

Output directory: `dist`

Framework preset: Vite (or Other if Vercel does not auto-detect it).

## 5. Use the dashboard

Open the deployed store and select **Admin** in the footer. Sign in with the Supabase admin account.

### Product upload workflow

1. Choose **Products**.
2. Click **Choose photo**.
3. Select a real product image from your phone/computer.
4. Enter name, category and price.
5. Add sizes and colors.
6. Enter stock for each generated variant.
7. Click **Publish product**.

To change a product later, click the pencil/edit button. To remove it, click the trash button.

## Notes

- The storefront includes starter products so the design does not become blank before Supabase is configured.
- Once Supabase has products, the storefront uses the live catalog.
- Paystack initialization is server-side. Payment verification is available at `/api/paystack/verify`, and a Paystack webhook endpoint is included at `/api/paystack/webhook`.
- The current order flow does not expose Supabase server credentials to customers.

## Local Chrome preview

Do NOT double-click `index.html` or use `file:///...` in Chrome. This is a Vite/React application and browser module loading will be blocked when opened as a local file.

From the project folder run:

    npm install
    npm run dev

Then open the `http://localhost:5173` address shown by Vite.

The storefront includes local SVG product artwork and does not require Supabase environment variables just to preview the design and demo catalog. Supabase is required for live admin, accounts, uploads and orders.
