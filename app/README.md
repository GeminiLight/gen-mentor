# Research website previews

This directory belongs only to the static `gh-pages` website branch. The Vercel
project expects an `app` root directory, so this adapter builds the actual
research page and assets for website PR previews using the Other framework.
It preserves the `/gen-mentor/` asset prefix through rewrites. No dependencies,
runtime functions or environment variables are required.

The Next.js application remains on `main`; its source and deployment settings
are separate from these website-branch files. GitHub Pages continues to serve
the website from the branch root.

Check locally with `node app/build.mjs`, then compare `app/dist/index.html` and
`app/dist/static/` with the website sources. Do not commit generated `app/dist/`
or any `.vercel` authentication/environment files.
