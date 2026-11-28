This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Checks

Run the unit tests with:

```bash
npm test
```

Run ESLint with `npm run lint` and the TypeScript check with `npx tsc --noEmit`.

Apply SQL migrations from `supabase/migrations` to your Supabase project before relying on database functions used by the app.

## Profiles and audio metadata

The `20261128000000_profiles_usernames.sql` migration creates username profiles,
backfills existing accounts with a generated username, and creates a profile
when a new account is registered. Apply it before enabling username registration
or profile settings.

Uploads are stored and played as their original audio bytes; the upload flow
does not parse or overwrite embedded tags. Playback streams the public storage
URL through an HTML audio element and supplies the song display name and
uploader username through the browser Media Session API. Supported browsers
and connected media systems can use this metadata for lock screens and car
controls. Support varies by browser, operating system, and car system, and some
players may continue to prefer embedded file tags or the URL's filename.
Downloaded audio retains its original tags: adding ID3 tags to MP3s (or
equivalent metadata to other formats) would require rewriting or remuxing files,
which this app intentionally does not do.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
