<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/7afd469a-b6d6-472b-9278-244320bfb712

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Sign-in pages

- Student sign-in: `/login` (registration is disabled).
- Administrator sign-in: `/admin_login`.
- The first administrator login must be followed by a password change before `/admin` opens.
- The initial administrator credentials are `study-admin` and the temporary password supplied for this setup. The password is stored as a salted scrypt hash in `.data/admin.json`; session signing material is also stored in `.data/`. Both are excluded from Git.

Run `npm run build` and then `npm start` to serve the production build and the administrator authentication API. Keep `DATA_DIR` on persistent storage in production so the changed administrator password and session secret survive restarts. Set `DATA_DIR` to a private, writable directory before deploying.

## AI test generation

Teacher-created image tests use the NVIDIA API from the server. Add `NVIDIA_API_KEY` to the Render Web Service's **Environment** settings and redeploy. The key is never sent to the browser. `NVIDIA_MODEL` is optional; the default is `mistralai/mistral-medium-3.5-128b`. Generated tests contain 10 multiple-choice questions and are stored in Supabase with the student's account.
