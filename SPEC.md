# KoinKu — Sistem Keuangan Lengkap

## Concept & Vision

Aplikasi keuangan personal dengan nuansa **tactical precision** — terinspirasi dari terminal fintech dan dashboard trading profesional. Dark slate dengan aksen emerald untuk income dan amber untuk expense. Data ditampilkan dengan tabular numerals, monospace untuk metrik, menciptakan kesan "alat profesional" yang trustworthy dan akurat.

## Design Language

### Aesthetic Direction
**Archetype B: Precision Instrument / Tactical Terminal**
- Dark obsidian surfaces (#0D0F12, #14171D)
- Razor-thin borders (1px #262C36)
- Crisp contrast text (#E6EDF3)
- Accent: Emerald #10B981 (income), Amber #F59E0B (expense), Cyan #06B6D4 (interactive)

### Color Palette
```
--bg: #0e1420          // deep obsidian
--paper: #161d29      // elevated surface
--fill: #1e2735       // input backgrounds
--fill-hover: #26313f  // hover states
--line: #283140       // dividers
--line-strong: #3a4354 // borders
--text: #e8ecf1       // primary text
--text-2: #aab3c0     // secondary
--text-3: #8d97a6     // muted/metadata
--accent: #06b6d4     // interactive cyan
--accent-hover: #22d3ee
--income: #10b981      // emerald
--income-soft: #064e3b
--expense: #f59e0b     // amber
--expense-soft: #78350f
```

### Typography
- **Display/Headers:** Geist / Inter (tight tracking)
- **Data/Numbers:** JetBrains Mono (tabular-nums)
- **Labels:** 11px uppercase monospace tracking-wider

### Spatial System
- Compact density: py-1.5 px-3
- Micro-labels: text-[11px] font-mono tracking-wider uppercase
- Tabular numerals everywhere for financial data

## Layout & Structure

### Navigation (Sidebar)
Fixed left sidebar dengan 5 sections:
1. **Dashboard** — ringkasan total
2. **Dompet** — multi-wallet management
3. **Tabungan** — target menabung
4. **Kasir** — POS sederhana
5. **Laporan** — export & analytics

### Pages

#### 1. Dashboard
- Total saldo semua dompet
- Quick stats: income bulan ini, expense bulan ini, balance
- Recent transactions (5 terakhir)
- Mini chart pengeluaran per kategori

#### 2. Dompet
- List dompet dengan saldo
- Tambah/edit/hapus dompet
- Transfer antar dompet
- Filter transaksi per dompet

#### 3. Tabungan
- Target menabung dengan progress bar
- Set target amount & deadline
- Riwayat setor/tarik tabungan
- Notifikasi progress (toast)

#### 4. Kasir (POS)
- Quick payment interface
- Scan/input nominal
- Pilih dompet tujuan
- Struk/cetak (print-friendly)

#### 5. Laporan
- Filter tanggal & dompet
- Export CSV
- Ringkasan bulanan
- Breakdown kategori

## Features & Interactions

### Core Features
1. **Multi-transaction:** income/expense dengan kategori
2. **Multi-wallet:** buat dompet terpisah (Tunai, Bank, E-wallet)
3. **Saving goals:** target menabung dengan progress
4. **POS:** kasir cepat untuk mencatat penjualan/pembelian
5. **Reports:** export data ke CSV

### Interaction Details
- **Add transaction:** Form dengan validation inline, toast confirmation
- **Delete:** Swipe atau click icon, konfirmasi dengan dialog
- **Charts:** Hover untuk tooltip dengan detail
- **Empty states:** Ilustrasi + CTA jelas

### Data Persistence
localStorage dengan key versioning untuk migrasi data

## Component Inventory

### Navigation
- Sidebar: dark bg, active state dengan accent left-border
- Nav items: icon + label, hover state subtle

### Cards
- Stat cards: large number + label, subtle border
- Action cards: title + content + action button

### Forms
- Input: dark bg, thin border, focus ring cyan
- Select: custom styled dropdown
- Buttons: primary (cyan), secondary (transparent + border)

### Tables/Lists
- Zebra striping dengan tint alternation
- Row hover state
- Action buttons right-aligned

### Modals/Dialogs
- Centered overlay
- Close button top-right
- Action buttons bottom

## Technical Approach

### Stack
- React 19 + TypeScript
- Vite build
- localStorage persistence
- CSS custom properties (no Tailwind)

### Data Model
```typescript
Wallet: { id, name, balance, color }
Transaction: { id, date, kind, amount, category, note, walletId }
SavingsGoal: { id, name, target, current, deadline }
```

### State Management
- React useState/useReducer per feature
- Custom hooks untuk data operations
- localStorage sync dengan useEffect
