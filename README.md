# Budget Vault

A personal budget tracker with a shared cloud database. Registration collects an email, password, and confirmation once; later visits use only the email and password. Budgets, categories, and expenses are stored in Supabase and are available on every signed-in device.

## Publish on GitHub Pages

1. Create a free Supabase project.
2. In **SQL Editor**, paste and run `supabase-schema.sql`.
3. In **Authentication → Providers → Email**, leave Email enabled. For normal use keep email confirmation enabled.
4. In **Project Settings → API**, copy the Project URL and publishable/anon key into `config.js`.
5. Create a new GitHub repository and upload these files. Do not commit a service-role key.
6. In **Settings → Pages**, select **Deploy from a branch**, then choose `main` and `/(root)`.
7. Open the published site and register an account.

## Privacy and storage

GitHub Pages hosts only the website. Supabase hosts the PostgreSQL database and user accounts. The Row Level Security policies in `supabase-schema.sql` ensure that a user can read and change only their own records.

The budget data is available after logging in on any device. Export regularly for backup. Do **not** put financial data, a database password, or a Supabase service-role key in a public repository.
