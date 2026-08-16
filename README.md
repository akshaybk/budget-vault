# Budget Vault

Budget Vault is a lightweight personal-finance web application for tracking a budget, expenses, and category-wise spending. It is designed as a simple, privacy-conscious static web app that can be deployed directly with **GitHub Pages**, while **Supabase** handles authentication and cloud data storage.

## ✨ Features

- Email/password authentication with Supabase
- Email confirmation flow with automatic return to the Budget Vault dashboard
- Personal budget amount
- Add, edit, and delete expenses
- Expense categories with custom category management
- Search expenses
- Filter expenses by category
- Automatic total-spent and available-balance calculations
- Category-wise spending breakdown
- CSV export of expenses
- Print / Save as PDF
- Light and dark themes
- Responsive layout for desktop and mobile
- Creator links for GitHub and LinkedIn
- Custom Budget Vault favicon
- Row Level Security (RLS) so each signed-in user can access only their own data

## 🛠️ Tech Stack

| Technology | Purpose |
|---|---|
| HTML5 | Application structure |
| CSS3 | Responsive UI, themes, layout, and styling |
| Vanilla JavaScript | Application logic and DOM interactions |
| Supabase Auth | User registration, login, and email confirmation |
| Supabase PostgreSQL | Cloud database |
| Supabase Row Level Security | Per-user data protection |
| GitHub Pages | Static hosting |
| jsDelivr | Loads the Supabase JavaScript client |

No frontend framework or build step is required.

## 📁 Folder Structure

```text
budget-vault/
├── index.html            # Main application UI
├── app.js                # Authentication and application logic
├── styles.css            # UI, responsive styles, and dark theme
├── config.js             # Supabase project URL and publishable key
├── supabase-schema.sql   # Database tables and RLS policies
├── favicon.svg           # Main browser favicon
├── favicon.ico           # ICO favicon fallback
├── favicon.png           # PNG favicon
├── README.md             # Project documentation
├── LICENSE               # MIT License
└── .gitignore            # Files that should not be committed
```

## 🔐 Authentication & Data Model

Supabase provides the authentication layer. Users register with an email and password. When email confirmation is enabled, Supabase sends a confirmation email.

After the user clicks the confirmation link:

1. Supabase redirects the browser back to the Budget Vault GitHub Pages URL.
2. Budget Vault detects the confirmation redirect.
3. The Supabase session is loaded.
4. The dashboard opens automatically.
5. A short **Email confirmed** success message is shown.

The application stores three main data types:

- **Budgets** — one budget record per user
- **Categories** — categories owned by each user
- **Expenses** — expenses linked to the authenticated user and a category

The SQL schema enables Row Level Security and restricts database operations with `auth.uid() = user_id`.

## 🚀 Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/akshaybk/budget-vault.git
cd budget-vault
```

### 2. Create a Supabase project

Create a project in Supabase and open the project's SQL Editor.

Run the complete contents of:

```text
supabase-schema.sql
```

This creates the required tables, relationships, and RLS policies.

### 3. Configure authentication

In Supabase:

**Authentication → Providers → Email**

Keep Email enabled.

If email confirmation is enabled, also configure the redirect URL under:

**Authentication → URL Configuration → Redirect URLs**

Add your GitHub Pages URL:

```text
https://akshaybk.github.io/budget-vault/
```

Set the Site URL to the same deployed URL when appropriate.

> If you deploy the project under a different GitHub username or repository name, use your own deployed URL instead.

### 4. Configure `config.js`

Open `config.js`:

```javascript
window.BUDGET_VAULT_CONFIG = {
  supabaseUrl: 'YOUR_SUPABASE_PROJECT_URL',
  supabaseAnonKey: 'YOUR_SUPABASE_PUBLISHABLE_KEY'
};
```

Use the **publishable/anon key**, never the Supabase service-role key.

The publishable/anon key is intended for frontend use when Row Level Security is correctly configured.

### 5. Run locally

Because this is a static project, you can serve it with any local HTTP server.

For example, with Python:

```bash
python -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

For email confirmation during local development, add your local URL to Supabase's allowed redirect URLs.

### 6. Deploy with GitHub Pages

Push the project to GitHub:

```bash
git add .
git commit -m "Initial Budget Vault setup"
git push -u origin main
```

Then open:

**GitHub → Repository → Settings → Pages**

Choose:

```text
Source: Deploy from a branch
Branch: main
Folder: / (root)
```

Save the configuration and wait for GitHub Pages to publish the site.

## 🔄 Updating the Project

For small changes that have already been tested:

```bash
git add .
git commit -m "Describe your change"
git push
```

For larger features or changes involving authentication, database logic, or significant UI changes, it is recommended to use a feature branch and Pull Request:

```bash
git checkout main
git pull origin main
git checkout -b your-feature-name

# Make and test your changes

git add .
git commit -m "Describe your change"
git push -u origin your-feature-name
```

Then create a Pull Request on GitHub and merge it into `main` after reviewing and testing the changes.

## 🔒 Security Notes

### Safe to expose

The frontend needs the Supabase project URL and publishable/anon key. These can be present in a public frontend application **when RLS is configured correctly**.

### Never expose

Do **not** put any of the following in the repository:

- Supabase service-role key
- Database password
- Private API keys
- `.env` files containing secrets
- Server-side credentials

The included `.gitignore` helps prevent common local secret files from being committed.

### Important

RLS is the actual database security boundary. Never rely on hiding UI elements or JavaScript variables as a security mechanism.

## 🧪 Suggested Test Flow

After deployment, test the complete flow:

1. Open the Budget Vault URL.
2. Select **New here? Create an account**.
3. Enter an email and password.
4. Submit the registration form.
5. Open the confirmation email.
6. Click the confirmation link.
7. Verify that Budget Vault opens instead of a GitHub 404 page.
8. Verify the **Email confirmed** message.
9. Add a budget.
10. Add several expenses.
11. Test search and category filtering.
12. Test edit and delete.
13. Test CSV export and print/PDF.
14. Lock the vault and log in again.

## 🎨 Design

The interface intentionally uses a restrained finance-dashboard aesthetic:

- Off-white background
- White rounded panels
- Teal as the primary action color
- Red for spending / destructive actions
- Gold for category bars
- Muted secondary typography
- Responsive desktop/mobile layouts
- Light and dark themes

The creator section uses inline SVG GitHub and LinkedIn marks so it does not depend on an additional icon library.

## 📄 License

Budget Vault is released under the **MIT License**.

Copyright © 2026 **Akshay B K**.

The MIT License permits others to use, copy, modify, merge, publish, distribute, sublicense, and sell copies of the software, subject to retaining the copyright and license notice.

See the [`LICENSE`](LICENSE) file for the complete license text.

---

Made with ❤️ by **Akshay B K**
