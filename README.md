## Database Setup

> **Local development only.** These steps set up a personal database on your own machine.

### 1. Install PostgreSQL

Download and install PostgreSQL from https://www.postgresql.org/download/. During installation, take note of the **password** and **port** you set (the default port is `5432`).

### 2. Add PostgreSQL to your PATH (Windows)

1. Open Settings and search for "Edit the system environment variables".
2. Under System Properties > Advanced, click **Environment Variables**.
3. Under System variables, select **Path** and click **Edit**.
4. Click **New** and add your PostgreSQL `bin` folder, e.g. `C:\Program Files\PostgreSQL\18\bin` (replace `18` with the version you installed).
5. Click OK on all dialogs, then **close and reopen** any open terminals and your code editor.

### 3. Create the database

Open cmd and run:

```
psql -U postgres
```

Enter the password you set during installation, then run:

```sql
CREATE DATABASE files_dev;
\q
```

If you see `'psql' is not recognized`, the PATH step didn't apply yet. Reopen your terminal (or restart your PC) and try again.

### 4. Configure your `.env`

Copy `.env.example` to a new file named `.env` in the root of the repository, then fill in the values:

```
DATABASE_URL="postgresql://USERNAME:PASSWORD@localhost:PORT/files_dev"
```

- `USERNAME` is `postgres` by default.
- `PORT` is `5432` by default.
- If your password contains special characters, URL-encode them (e.g. `@` becomes `%40`, `#` becomes `%23`, `/` becomes `%2F`, `:` becomes `%3A`).

`.env` is git-ignored, so your credentials stay on your machine.

### 5. Install dependencies and create the tables

From the root of the project, run these **in order**:

```
npm install
npx prisma db push
npx prisma generate
```

Run `npm install` first so the project's pinned Prisma version is used. Running `npx prisma` without it may download a different, incompatible version.

### Troubleshooting

- **`connection refused` / can't reach database:** make sure the PostgreSQL service is running (Windows Services > `postgresql-x64-XX` > Start).
- **`password authentication failed`:** double-check the password in your `DATABASE_URL`, including URL-encoding of special characters.
- **`database "files_dev" does not exist`:** redo step 3.

### Seeding and resetting (optional)

Run these from the project root:

- `npm run db-seed` seeds the tables with sample rows.
- `npm run db-reset` **truncates and deletes every row** in the database. Use with caution, and only against your local database.
- `npm run db-refresh` runs `db-reset` and then `db-seed`. Use with caution, and only against your local database.