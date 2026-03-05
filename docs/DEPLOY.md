# Setup & Deploy to Shopify

## Setup (done)

These steps were already run:

- `npm install` — install dependencies
- `npm run setup` — Prisma generate + SQLite migrations (database ready at `prisma/dev.sqlite`)

## Deploy to Shopify

Deploying requires the **Shopify CLI** and **Partner account login**. Do this in your **local terminal** (interactive session).

### 1. Install Shopify CLI (if needed)

```bash
npm install -g @shopify/cli
# or: brew tap shopify/shopify && brew install shopify-cli
```

### 2. Log in to Shopify Partners

Run **one command per line** — do not paste comments on the same line or the CLI will misparse the command.

```bash
cd /Users/bbuser/Downloads/github/PF-Edgar
```

```bash
shopify auth login
```

A browser window will open; sign in with your [Shopify Partner](https://partners.shopify.com/) account. The CLI will link this project to your Partner app (using `client_id` in `shopify.app.toml`).

### 3. Deploy the app

```bash
npm run deploy
```

Or with the CLI directly (again, no comments on the same line):

```bash
shopify app deploy
```

This will:

- Build the app (React Router production build).
- Deploy app **configuration and extensions** to Shopify (app version is created/released).
- **Not** deploy the web app itself — you still need to host the Node server (see below).

### 4. Host the web app (production)

`shopify app deploy` only deploys **config and extensions**. Your **web app** (the Node server that serves the embedded UI) must be hosted by you, for example:

- **Fly.io, Railway, Render, etc.** — run `npm run setup && npm run start` (or use the Dockerfile).
- Set the app’s **Application URL** and **Allowed redirection URL(s)** in the Partner Dashboard to your production URL (e.g. `https://your-app.fly.dev`).
- For local development, use `npm run dev` (tunnel + HMR).

### CI/CD (optional)

In CI or non-interactive environments, use:

```bash
shopify app deploy --allow-updates
```

Ensure the environment has Shopify auth (e.g. via `SHOPIFY_CLI_THEME_TOKEN` or login in a previous step).

## Quick reference

| Command              | Purpose                          |
|----------------------|----------------------------------|
| `npm run setup`      | Prisma generate + migrate        |
| `npm run dev`        | Local dev with tunnel            |
| `npm run build`      | Production build                 |
| `npm run deploy`     | Deploy config + extensions       |
| `shopify auth login` | Log in to Shopify Partners       |

## Troubleshooting

### "You are not a member of the requested organization" (403)

This means the **app** in `shopify.app.toml` (its `client_id`) belongs to a different Shopify Partner organization than the account you’re logged in with.

**Fix one of these:**

1. **Use the account that owns the app**  
   Log in with the Partner account that created or has access to the app with this client ID:
   ```bash
   shopify auth login
   ```
   Then run `npm run deploy` again.

2. **Use an app in your current organization**  
   Create or use an app under your current Partner account and link this project to it:
   ```bash
   shopify app config link
   ```
   Pick your app (or create a new one). That updates `shopify.app.toml` with the correct `client_id`. Then run `npm run deploy`.

### Chạy app local trên store Tubletess (Option B + dev)

1. **Link app với tài khoản Partner của bạn** (chạy trong terminal, từng lệnh một):
   ```bash
   cd /Users/bbuser/Downloads/github/PF-Edgar
   ```
   ```bash
   shopify auth login
   ```
   ```bash
   npm run config:link
   ```
   Chọn organization → chọn app có sẵn hoặc tạo app mới. Xong thì file `shopify.app.toml` sẽ có `client_id` đúng.

2. **Chạy app ở local với store Tubletess**:
   ```bash
   npm run dev:store -- tubletess.myshopify.com
   ```
   Hoặc dùng script (có thể sửa store trong `scripts/dev-tubletess.sh` nếu URL khác):
   ```bash
   ./scripts/dev-tubletess.sh
   ```
   Lần đầu CLI sẽ mở tunnel, build app và có thể mở Admin — vào store Tubletess và bấm **Install** để cài app. Sau đó mở app từ Admin để dùng.

### "Command not found" / "Missing required flag dev-origin"

You may have pasted a **comment on the same line** as the command (e.g. `shopify auth login # opens browser`). The CLI treats everything after the command as part of the command name.

**Fix:** Run each command alone, with no comment on the same line. For example run only:
```bash
shopify auth login
```
Then on the next line run only:
```bash
npm run deploy
```

### "Shop is not configured for app development"

The store you passed (e.g. `tubletess.myshopify.com`) is not a **development store** linked to your Partner account. Only development stores can install and run apps that are not yet published.

**Fix:**

1. **Create a development store** (recommended):
   - Go to [partners.shopify.com](https://partners.shopify.com) → **Stores** → **Add store** → **Development store**.
   - Create a new store (e.g. "Tubletess Dev") and note its URL (`xxx.myshopify.com`).
   - Run dev with that URL:
     ```bash
     npm run dev:store -- xxx.myshopify.com
     ```

2. **Or use an existing development store** from your Partner account:
   - Partners → **Stores** → open a store that shows as **Development**.
   - Use that store’s `.myshopify.com` URL in:
     ```bash
     npm run dev:store -- your-dev-store.myshopify.com
     ```

If "Tubletess" is a **production store** (paid plan, not under Partners), it cannot be used for app development. Use a development store for local testing instead.
