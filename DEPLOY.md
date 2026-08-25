# Deploying the website

The backend has `backend/DEPLOY.md`. This is the other half, which until now
was not written down anywhere.

## The thing that catches people out

**The website is a build, not source.** `git pull` on the server does nothing
for it — nginx serves a folder of compiled files, and those only change when
you build and upload. So a change can be committed, merged and pulled, and the
site still shows the old one indefinitely. There is no error and nothing looks
wrong.

This is different from the backend, where pulling and restarting is enough.

The symptom is always the same: a feature that exists in the code, that you can
see in the file, is not on the site. Before debugging anything, check whether
the build ever shipped.

## Where it goes

Ask nginx rather than remembering:

```bash
grep -rn "root " /etc/nginx/sites-enabled/ | grep -v api
```

The line for `f2hmarket.com` gives the folder. The `api` subdomain is excluded
because that one proxies to Flask and has no folder worth copying into.

## Deploying

**1. Build, on your machine.**

```bash
cd frontend
npm run build
```

Output lands in `frontend/dist/`. The build reads `.env.production`, which is
where `VITE_API_URL` comes from — anything prefixed `VITE_` is inlined into the
bundle at build time and is therefore public. Never put a secret there.

If the build fails, it fails here rather than on the server, which is the point
of doing it in this order. A missing export is the usual cause — Vite reports
the file and the symbol.

**2. Upload.**

```bash
scp -r dist/* root@<server>:<the root path from above>/
```

`dist/*` rather than `dist` — copying the directory itself nests it one level
down and the site 404s.

**3. Hard refresh.**

`Cmd-Shift-R`, or the site keeps serving the cached `index.html` and you see the
old build while the new one sits on disk. Worth doing before concluding the
deploy did not work.

## Confirming what is actually live

The built filenames are content-hashed, so comparing them tells you whether
what you uploaded is what is being served:

```bash
# locally, after building
ls dist/assets/ | head

# on the server
ls <root>/assets/ | head
```

Different hashes mean the upload did not land where nginx is looking.

For a specific change, the crude check works well: pick a string only the new
build contains and grep the served bundle.

```bash
curl -s https://f2hmarket.com/assets/<the-js-file>.js | grep -c "Delivery charge"
```

`0` means the old build is still up.

## Things that do not need a website deploy

Worth knowing, because it saves a build:

- **Figures an admin sets** — the order minimum, the delivery charge. They come
  from the server per request, so changing one in the admin panel takes effect
  immediately on the website *and* the app.
- **Anything that is only backend** — pricing rules, validation, new API fields
  the current site does not read yet.

And the reverse: a new *field* on the settings screen is website code, so that
does need one.
