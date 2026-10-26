# Duit

Catatan keuangan pribadi: pemasukan/pengeluaran, kategori, ringkasan + grafik bulanan.

- Data 100% lokal di `localStorage` (key `duit.tx.v1`). Tanpa server, tanpa akun.
- React 19 + Vite + TypeScript, vanilla CSS dengan token Vyre.
- Dark mode otomatis lewat `prefers-color-scheme`.

## Dev

```bash
npm install
npm run dev
```

## Deploy

Vercel: import repo, framework Vite, build `npm run build`, output `dist` (lihat `vercel.json`).
