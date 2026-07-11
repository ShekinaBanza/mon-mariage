# Deploiement Hostinger Business Web Hosting

Cette application est une app Next.js avec Prisma et SQLite. Sur Hostinger Business Web Hosting, utilise l'option Node.js de hPanel si elle est disponible.

## Valeurs a mettre dans hPanel

- Repository: `https://github.com/ShekinaBanza/mon-mariage`
- Branch: `main`
- Node version: `24.14.1` si disponible, sinon une version Node 22+.
- Install/build command:

```bash
bash scripts/hostinger-build.sh
```

Le projet est aligne sur `pnpm@11.11.0`, la version actuellement utilisee par Hostinger dans ton erreur de build.
Les scripts de build natifs requis par Prisma, Sharp et SWC sont approuves dans `pnpm-workspace.yaml`.
Le check automatique `verifyDepsBeforeRun` est desactive pour eviter que pnpm tente de relancer `pnpm install` dans l'environnement Hostinger.
Le script `build` lance `prisma generate` avant `next build`, car Next importe Prisma pendant la collecte des pages.

- Start command ou startup file:

```bash
npm start
```

Si hPanel demande un fichier de demarrage au lieu d'une commande, utilise:

```text
hostinger-server.js
```

## Variables d'environnement

```text
DATABASE_URL=file:../data/custom.db
SESSION_SECRET=remplace-moi-par-un-secret-long
NEXT_PUBLIC_BASE_URL=https://ton-domaine.com
```

`hostinger-server.js` cree `data/custom.db` au premier demarrage en copiant `db/custom.db`. Ensuite l'application ecrit dans `data/custom.db`, qui ne doit pas etre commite dans Git.

## Point d'entree

- Application Next.js: `src/app/page.tsx`
- Serveur Hostinger: `hostinger-server.js`
- Serveur Next standalone: `.next/standalone/server.js`
