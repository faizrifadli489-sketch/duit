import { useEffect, useMemo, useState } from 'react'
import {
  EXPENSE_CATEGORIES, INCOME_CATEGORIES, WALLET_COLORS,
  byCategory, dailyTotals, downloadCSV, exportToCSV,
  formatDay, formatIDR, formatMonth, monthOf,
  summarize, today, thisMonth, totalBalance,
  useSavings, useTransactions, useWallets,
  type Kind, type Tx, type Wallet,
} from './lib'

type Page = 'dashboard' | 'dompet' | 'tabungan' | 'kasir' | 'laporan'
type Toast = { id: number; msg: string; err?: boolean }

let toastId = 0
const sign = (k: Kind) => (k === 'income' ? '+' : '\u2212')

// ── Icons (inline SVG, no emoji) ──
const I = {
  grid: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>),
  wallet: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16V7"/><path d="M18 12a1 1 0 0 0 0 2h4v-2Z"/></svg>),
  piggy: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 5c-1.5 0-2.8 1.4-3 2-3.5-1.5-11-.3-11 5 0 1.8 0 3 2 4.5V20h4v-2h3v2h4v-4c1-.5 1.7-1 2-2h2v-4h-2c-.5-2-1.5-3.5-3-4.5V5h-2Z"/><path d="M2 9v1c0 1.1.9 2 2 2h1"/><path d="M16 11h.01"/></svg>),
  cart: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg>),
  chart: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 3v16a2 2 0 0 0 2 2h16"/><path d="M7 13l3 3 7-7"/></svg>),
  x: (<svg viewBox="0 0 16 16"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>),
  plus: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M12 5v14M5 12h14"/></svg>),
}

function pushToast(set: React.Dispatch<React.SetStateAction<Toast[]>>, msg: string, err = false) {
  const id = ++toastId
  set((p) => [...p, { id, msg, err }])
  setTimeout(() => set((p) => p.filter((t) => t.id !== id)), 3200)
}

function Bars({ data }: { data: [string, number][] }) {
  const max = data[0]?.[1] ?? 0
  return (
    <ul className="bars">
      {data.map(([cat, val]) => (
        <li className="bar" key={cat}>
          <span className="nm" title={cat}>{cat}</span>
          <div className="tr" role="img" aria-label={`${cat}: ${formatIDR(val)}`}>
            <div className="fl" style={{ width: `${max > 0 ? (val / max) * 100 : 0}%` }} />
          </div>
          <span className="v">{formatIDR(val)}</span>
        </li>
      ))}
    </ul>
  )
}

function TxList({ txs, wallets, onDel, emptyMsg }: { txs: Tx[]; wallets: Wallet[]; onDel: (t: Tx) => void; emptyMsg: string }) {
  const wm = useMemo(() => new Map(wallets.map((w) => [w.id, w.name])), [wallets])
  if (txs.length === 0) return <p className="empty"><b>Belum ada data</b>{emptyMsg}</p>
  return (
    <ul className="tlist">
      {txs.map((t) => (
        <li className="trow" key={t.id}>
          <span className={`tico ${t.kind === 'income' ? 'in' : 'out'}`} aria-hidden>{t.kind === 'income' ? '\u2191' : '\u2193'}</span>
          <div className="tinfo">
            <div className="tcat">{t.category}</div>
            <div className="tmeta">{formatDay(t.date)} · {wm.get(t.walletId) ?? '-'} {t.note ? `· ${t.note}` : ''}</div>
          </div>
          <span className={`tamt ${t.kind === 'income' ? 'in' : 'out'}`}><span className="tag">{t.kind === 'income' ? 'masuk' : 'keluar'}</span>{sign(t.kind)}{formatIDR(t.amount)}</span>
          <button className="icon-btn danger" onClick={() => onDel(t)} aria-label={`Hapus ${t.category} ${formatIDR(t.amount)}`}>{I.x}</button>
        </li>
      ))}
    </ul>
  )
}

// ── Form tambah transaksi ──
function TxForm({ wallets, defWallet, onAdd }: { wallets: Wallet[]; defWallet: string; onAdd: (t: Omit<Tx, 'id'>) => void }) {
  const [kind, setKind] = useState<Kind>('expense')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(today)
  const [cat, setCat] = useState(EXPENSE_CATEGORIES[0])
  const [note, setNote] = useState('')
  const [wid, setWid] = useState(defWallet)
  const [err, setErr] = useState('')
  const cats = kind === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES

  useEffect(() => { setWid(defWallet) }, [defWallet])

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const v = Number(amount.replace(/[^\d]/g, ''))
    if (!Number.isFinite(v) || v <= 0) { setErr('Nominal harus lebih dari 0.'); return }
    if (!date) { setErr('Tanggal wajib diisi.'); return }
    setErr('')
    onAdd({ date, kind, amount: v, category: cat, note: note.trim(), walletId: wid })
    setAmount(''); setNote('')
  }
  const sw = (k: Kind) => { setKind(k); setCat(k === 'income' ? INCOME_CATEGORIES[0] : EXPENSE_CATEGORIES[0]) }

  return (
    <form onSubmit={submit} noValidate>
      <div className="fgrid">
        <div className="fld">
          <label>Jenis</label>
          <div className="seg" role="group" aria-label="Jenis transaksi">
            <button type="button" aria-pressed={kind === 'expense'} onClick={() => sw('expense')}>Pengeluaran</button>
            <button type="button" aria-pressed={kind === 'income'} onClick={() => sw('income')}>Pemasukan</button>
          </div>
        </div>
        <div className="fld">
          <label htmlFor="f-amt">Nominal (Rp)</label>
          <input id="f-amt" className="mono" inputMode="numeric" autoComplete="off" placeholder="25000" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </div>
        <div className="fld">
          <label htmlFor="f-date">Tanggal</label>
          <input id="f-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="fld">
          <label htmlFor="f-cat">Kategori</label>
          <select id="f-cat" value={cat} onChange={(e) => setCat(e.target.value)}>
            {cats.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="fld">
          <label htmlFor="f-w">Dompet</label>
          <select id="f-w" value={wid} onChange={(e) => setWid(e.target.value)}>
            {wallets.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
        </div>
        <div className="fld">
          <label htmlFor="f-n">Catatan <span className="hint">(opsional)</span></label>
          <input id="f-n" placeholder="mis. makan siang" value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
      </div>
      <div className="fgrid" style={{ marginTop: 14 }}>
        <div className="fld full" style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <button className="btn btn-pri" type="submit">Simpan transaksi</button>
          {err && <span className="ferr" role="alert">{err}</span>}
        </div>
      </div>
    </form>
  )
}

// ══ APP ══
export default function App() {
  const { wallets, add: addW, remove: rmW, transfer, updateBalance } = useWallets()
  const { txs: allTxs, add, remove } = useTransactions()
  const { goals, add: addGoal, deposit, withdraw, remove: rmGoal } = useSavings()

  const [page, setPage] = useState<Page>('dashboard')
  const [month, setMonth] = useState(thisMonth)
  const [toasts, setToasts] = useState<Toast[]>([])
  const toast = (m: string, e = false) => pushToast(setToasts, m, e)

  // modal states
  const [showW, setShowW] = useState(false)
  const [showT, setShowT] = useState(false)
  const [showG, setShowG] = useState(false)
  const [wName, setWName] = useState('')
  const [wColor, setWColor] = useState(WALLET_COLORS[0])
  const [tFrom, setTFrom] = useState('')
  const [tTo, setTTo] = useState('')
  const [tAmt, setTAmt] = useState('')
  const [gName, setGName] = useState('')
  const [gTarget, setGTarget] = useState('')
  const [gDate, setGDate] = useState('')
  const [gAmt, setGAmt] = useState<Record<string, string>>({})
  const [filterW, setFilterW] = useState('all')

  const monthTxs = useMemo(() => allTxs.filter((t) => monthOf(t.date) === month).sort((a, b) => b.date.localeCompare(a.date)), [allTxs, month])
  const stats = useMemo(() => summarize(allTxs, month), [allTxs, month])
  const expCat = useMemo(() => byCategory(allTxs, month, 'expense'), [allTxs, month])
  const total = useMemo(() => totalBalance(wallets), [wallets])
  const months = useMemo(() => {
    const s = new Set(allTxs.map((t) => monthOf(t.date)))
    s.add(thisMonth()); s.add(month)
    return [...s].sort().reverse()
  }, [allTxs, month])

  const addTx = (t: Omit<Tx, 'id'>) => {
    add(t)
    updateBalance(t.walletId, t.kind === 'income' ? t.amount : -t.amount)
    toast(`${t.kind === 'income' ? 'Pemasukan' : 'Pengeluaran'} ${formatIDR(t.amount)} tersimpan.`)
  }
  const delTx = (t: Tx) => {
    remove(t.id)
    updateBalance(t.walletId, t.kind === 'income' ? -t.amount : t.amount)
    toast(`Transaksi ${t.category} dihapus.`)
  }

  const nav: { id: Page; label: string; icon: React.ReactNode; badge?: string }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: I.grid },
    { id: 'dompet', label: 'Dompet', icon: I.wallet, badge: String(wallets.length) },
    { id: 'tabungan', label: 'Tabungan', icon: I.piggy, badge: goals.length ? String(goals.length) : undefined },
    { id: 'kasir', label: 'Kasir', icon: I.cart },
    { id: 'laporan', label: 'Laporan', icon: I.chart },
  ]

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand"><span className="mark">K</span><div><b>KoinKu</b><small>FINANCE OPS</small></div></div>
        <nav className="nav" aria-label="Navigasi utama">
          {nav.map((n) => (
            <button key={n.id} className={page === n.id ? 'on' : ''} onClick={() => setPage(n.id)}>
              {n.icon}<span>{n.label}</span>{n.badge && <span className="cnt">{n.badge}</span>}
            </button>
          ))}
        </nav>
        <div className="side-foot">TOTAL SALDO<br /><span className="mono" style={{ color: 'var(--accent)', fontSize: 13 }}>{formatIDR(total)}</span></div>
      </aside>

      <main className="main">
        <div className="topbar-m" role="tablist" aria-label="Navigasi">
          {nav.map((n) => <button key={n.id} role="tab" aria-selected={page === n.id} className={page === n.id ? 'on' : ''} onClick={() => setPage(n.id)}>{n.label}</button>)}
        </div>

        {page === 'dashboard' && (
          <section>
            <div className="pg-head">
              <div><h1>Dashboard</h1><p>Ringkasan keuangan · <span className="mono">{formatMonth(month)}</span></p></div>
              <label className="monthsel">Periode <select value={month} onChange={(e) => setMonth(e.target.value)}>{months.map((m) => <option key={m} value={m}>{formatMonth(m)}</option>)}</select></label>
            </div>
            <div className="stats">
              <div className="stat"><div className="lb">Total saldo</div><div className="vl ac">{formatIDR(total)}</div><div className="mt">{wallets.length} dompet aktif</div></div>
              <div className="stat"><div className="lb">Pemasukan</div><div className="vl up">+{formatIDR(stats.income)}</div><div className="mt">{formatMonth(month)}</div></div>
              <div className="stat"><div className="lb">Pengeluaran</div><div className="vl dn">−{formatIDR(stats.expense)}</div><div className="mt">{formatMonth(month)}</div></div>
              <div className="stat"><div className="lb">Arus bersih</div><div className={`vl ${stats.balance >= 0 ? 'up' : 'dn'}`}>{formatIDR(stats.balance)}</div><div className="mt">selisih bulan ini</div></div>
            </div>
            <div className="row2">
              <div className="card">
                <div className="card-h"><h2>Tambah transaksi</h2><span className="kbd">N + Enter</span></div>
                <TxForm wallets={wallets} defWallet={wallets[0]?.id ?? 'default'} onAdd={addTx} />
              </div>
              <div className="card">
                <div className="card-h"><h2>Pengeluaran per kategori</h2></div>
                {expCat.length === 0 ? <p className="empty"><b>Belum ada pengeluaran</b>Catat transaksi untuk melihat breakdown.</p> : <Bars data={expCat} />}
              </div>
            </div>
            <div className="card">
              <div className="card-h"><h2>Transaksi terbaru</h2><span className="mono" style={{ fontSize: 12, color: 'var(--text3)' }}>{monthTxs.length} transaksi</span></div>
              <TxList txs={monthTxs.slice(0, 8)} wallets={wallets} onDel={delTx} emptyMsg="di bulan ini." />
            </div>
          </section>
        )}

        {page === 'dompet' && (
          <section>
            <div className="pg-head">
              <div><h1>Dompet</h1><p>Kelola semua sumber dana · total <span className="mono" style={{ color: 'var(--accent)' }}>{formatIDR(total)}</span></p></div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-sec" onClick={() => { setTFrom(wallets[0]?.id ?? ''); setTTo(wallets[1]?.id ?? ''); setShowT(true) }}>Transfer</button>
                <button className="btn btn-pri" onClick={() => setShowW(true)}>{I.plus} Dompet baru</button>
              </div>
            </div>
            <div className="wgrid">
              {wallets.map((w) => {
                const n = allTxs.filter((t) => t.walletId === w.id && monthOf(t.date) === month).length
                return (
                  <div className="wcard" key={w.id} style={{ ['--wc' as string]: w.color }}>
                    <div className="wn"><span className="dot" />{w.name}</div>
                    <div className="wb">{formatIDR(w.balance)}</div>
                    <div className="wm">{n} transaksi bulan ini</div>
                    <div className="wa">
                      <button className="btn btn-sec" style={{ minHeight: 32, fontSize: 12 }} onClick={() => { setFilterW(w.id); }}>Lihat</button>
                      {wallets.length > 1 && <button className="icon-btn danger" onClick={() => { rmW(w.id); toast(`Dompet ${w.name} dihapus.`) }} aria-label={`Hapus dompet ${w.name}`}>{I.x}</button>}
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="card" style={{ marginTop: 16 }}>
              <div className="card-h">
                <h2>Riwayat dompet</h2>
                <select value={filterW} onChange={(e) => setFilterW(e.target.value)} style={{ width: 'auto', minWidth: 160 }}>
                  <option value="all">Semua dompet</option>
                  {wallets.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
                </select>
              </div>
              <TxList txs={monthTxs.filter((t) => filterW === 'all' || t.walletId === filterW)} wallets={wallets} onDel={delTx} emptyMsg="dengan filter ini." />
            </div>
          </section>
        )}

        {page === 'tabungan' && (
          <section>
            <div className="pg-head">
              <div><h1>Tabungan</h1><p>Target menabung · {goals.length} tujuan aktif</p></div>
              <button className="btn btn-pri" onClick={() => setShowG(true)}>{I.plus} Target baru</button>
            </div>
            {goals.length === 0 && <p className="empty"><b>Belum ada target tabungan</b>Buat target pertama — mis. Dana darurat Rp5.000.000.</p>}
            {goals.map((g) => {
              const pct = g.target > 0 ? Math.min(100, Math.round((g.current / g.target) * 100)) : 0
              const sisa = Math.max(0, g.target - g.current)
              return (
                <div className="scard" key={g.id}>
                  <div className="sh">
                    <div><div className="sn">{g.name}</div><div className="sd">Deadline {formatDay(g.deadline)} · {pct}% tercapai</div></div>
                    <button className="icon-btn danger" onClick={() => { rmGoal(g.id); toast(`Target ${g.name} dihapus.`) }} aria-label={`Hapus target ${g.name}`}>{I.x}</button>
                  </div>
                  <div className="prog"><div style={{ width: `${pct}%` }} /></div>
                  <div className="smeta"><span>Terkumpul <b>{formatIDR(g.current)}</b></span><span>Target <b>{formatIDR(g.target)}</b></span><span>Sisa <b>{formatIDR(sisa)}</b></span></div>
                  <div className="sact">
                    <input className="mono" placeholder="Nominal" inputMode="numeric" value={gAmt[g.id] ?? ''} onChange={(e) => setGAmt((p) => ({ ...p, [g.id]: e.target.value }))} style={{ maxWidth: 160 }} />
                    <button className="btn btn-pri" style={{ minHeight: 34 }} onClick={() => {
                      const v = Number((gAmt[g.id] ?? '').replace(/[^\d]/g, ''))
                      if (!v || v <= 0) { toast('Nominal setor harus lebih dari 0.', true); return }
                      deposit(g.id, v); setGAmt((p) => ({ ...p, [g.id]: '' })); toast(`Menabung ${formatIDR(v)} ke ${g.name}.`)
                    }}>Setor</button>
                    <button className="btn btn-sec" style={{ minHeight: 34 }} onClick={() => {
                      const v = Number((gAmt[g.id] ?? '').replace(/[^\d]/g, ''))
                      if (!v || v <= 0) { toast('Nominal tarik harus lebih dari 0.', true); return }
                      withdraw(g.id, v); setGAmt((p) => ({ ...p, [g.id]: '' })); toast(`Tarik ${formatIDR(v)} dari ${g.name}.`)
                    }}>Tarik</button>
                  </div>
                </div>
              )
            })}
          </section>
        )}

        {page === 'kasir' && <POS wallets={wallets} onSale={(t) => addTx(t)} />}

        {page === 'laporan' && (
          <section>
            <div className="pg-head">
              <div><h1>Laporan</h1><p>Analisis & ekspor data · <span className="mono">{formatMonth(month)}</span></p></div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <label className="monthsel"><select value={month} onChange={(e) => setMonth(e.target.value)}>{months.map((m) => <option key={m} value={m}>{formatMonth(m)}</option>)}</select></label>
                <button className="btn btn-pri" onClick={() => { downloadCSV(exportToCSV(monthTxs, wallets), `koinku-${month}.csv`); toast(`Laporan ${formatMonth(month)} diunduh (CSV).`) }}>Unduh CSV</button>
              </div>
            </div>
            <div className="stats">
              <div className="stat"><div className="lb">Pemasukan</div><div className="vl up">+{formatIDR(stats.income)}</div></div>
              <div className="stat"><div className="lb">Pengeluaran</div><div className="vl dn">−{formatIDR(stats.expense)}</div></div>
              <div className="stat"><div className="lb">Transaksi</div><div className="vl">{monthTxs.length}</div></div>
              <div className="stat"><div className="lb">Rata-rata / hari</div><div className="vl ac">{formatIDR(monthTxs.length ? Math.round((stats.income + stats.expense) / Math.max(1, new Set(monthTxs.map((t) => t.date)).size)) : 0)}</div></div>
            </div>
            <div className="row2">
              <div className="card"><div className="card-h"><h2>Arus harian</h2></div><DailyTable txs={allTxs} month={month} /></div>
              <div className="card"><div className="card-h"><h2>Kategori pengeluaran</h2></div>
                {expCat.length === 0 ? <p className="empty"><b>Belum ada data</b>Pilih periode lain atau catat transaksi.</p> : <Bars data={expCat} />}
              </div>
            </div>
            <div className="card"><div className="card-h"><h2>Semua transaksi periode ini</h2></div>
              <TxList txs={monthTxs} wallets={wallets} onDel={delTx} emptyMsg="di periode ini." />
            </div>
          </section>
        )}
      </main>

      {/* ── Modal: dompet baru ── */}
      {showW && (
        <div className="overlay" onClick={() => setShowW(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Dompet baru</h3>
            <p className="msub">Pisahkan dana: tunai, bank, e-wallet.</p>
            <div className="fld" style={{ marginBottom: 12 }}><label>Nama dompet</label><input placeholder="mis. BCA / GoPay" value={wName} onChange={(e) => setWName(e.target.value)} /></div>
            <div className="fld"><label>Warna</label>
              <div className="chips">{WALLET_COLORS.map((c) => (
                <button key={c} onClick={() => setWColor(c)} aria-label={`Warna ${c}`} style={{ width: 28, height: 28, borderRadius: 99, background: c, border: wColor === c ? '2px solid #fff' : '2px solid transparent', cursor: 'pointer' }} />
              ))}</div>
            </div>
            <div className="mact">
              <button className="btn btn-ghost" onClick={() => setShowW(false)}>Batal</button>
              <button className="btn btn-pri" onClick={() => {
                if (!wName.trim()) { toast('Nama dompet wajib diisi.', true); return }
                addW(wName.trim(), wColor); setWName(''); setShowW(false); toast(`Dompet ${wName.trim()} dibuat.`)
              }}>Buat dompet</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: transfer ── */}
      {showT && (
        <div className="overlay" onClick={() => setShowT(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Transfer antar dompet</h3>
            <p className="msub">Pindahkan saldo tanpa mencatat pemasukan/pengeluaran.</p>
            <div className="fgrid">
              <div className="fld"><label>Dari</label><select value={tFrom} onChange={(e) => setTFrom(e.target.value)}>{wallets.map((w) => <option key={w.id} value={w.id}>{w.name} · {formatIDR(w.balance)}</option>)}</select></div>
              <div className="fld"><label>Ke</label><select value={tTo} onChange={(e) => setTTo(e.target.value)}>{wallets.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}</select></div>
              <div className="fld full"><label>Nominal</label><input className="mono" inputMode="numeric" placeholder="100000" value={tAmt} onChange={(e) => setTAmt(e.target.value)} /></div>
            </div>
            <div className="mact">
              <button className="btn btn-ghost" onClick={() => setShowT(false)}>Batal</button>
              <button className="btn btn-pri" onClick={() => {
                const v = Number(tAmt.replace(/[^\d]/g, ''))
                if (!tFrom || !tTo || tFrom === tTo) { toast('Pilih dompet asal dan tujuan yang berbeda.', true); return }
                if (!v || v <= 0) { toast('Nominal harus lebih dari 0.', true); return }
                const src = wallets.find((w) => w.id === tFrom)
                if (src && src.balance < v) { toast('Saldo dompet asal tidak cukup.', true); return }
                transfer(tFrom, tTo, v); setTAmt(''); setShowT(false); toast(`Transfer ${formatIDR(v)} berhasil.`)
              }}>Kirim</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: target tabungan ── */}
      {showG && (
        <div className="overlay" onClick={() => setShowG(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Target menabung</h3>
            <p className="msub">Tentukan tujuan, nominal, dan deadline.</p>
            <div className="fld" style={{ marginBottom: 12 }}><label>Nama tujuan</label><input placeholder="mis. Dana darurat" value={gName} onChange={(e) => setGName(e.target.value)} /></div>
            <div className="fgrid">
              <div className="fld"><label>Target (Rp)</label><input className="mono" inputMode="numeric" placeholder="5000000" value={gTarget} onChange={(e) => setGTarget(e.target.value)} /></div>
              <div className="fld"><label>Deadline</label><input type="date" value={gDate} onChange={(e) => setGDate(e.target.value)} /></div>
            </div>
            <div className="mact">
              <button className="btn btn-ghost" onClick={() => setShowG(false)}>Batal</button>
              <button className="btn btn-pri" onClick={() => {
                const v = Number(gTarget.replace(/[^\d]/g, ''))
                if (!gName.trim()) { toast('Nama tujuan wajib diisi.', true); return }
                if (!v || v <= 0) { toast('Target harus lebih dari 0.', true); return }
                if (!gDate) { toast('Deadline wajib diisi.', true); return }
                addGoal(gName.trim(), v, gDate); setGName(''); setGTarget(''); setGDate(''); setShowG(false); toast(`Target ${gName.trim()} dibuat.`)
              }}>Buat target</button>
            </div>
          </div>
        </div>
      )}

      <div className="toasts" aria-live="polite">
        {toasts.map((t) => <div key={t.id} className={`toast${t.err ? ' err' : ''}`}>{t.msg}</div>)}
      </div>
    </div>
  )
}

// ── Tabel harian ──
function DailyTable({ txs, month }: { txs: Tx[]; month: string }) {
  const rows = useMemo(() => dailyTotals(txs, month), [txs, month])
  if (!rows.length) return <p className="empty"><b>Belum ada aktivitas</b>di periode ini.</p>
  return (
    <ul className="tlist">
      {rows.map((r) => (
        <li className="trow" key={r.date}>
          <div className="tinfo"><div className="tcat">{formatDay(r.date)}</div>
            <div className="tmeta"><span style={{ color: 'var(--income)' }}>+{formatIDR(r.income)}</span> · <span style={{ color: 'var(--expense)' }}>−{formatIDR(r.expense)}</span></div>
          </div>
          <span className={`tamt ${r.income - r.expense >= 0 ? 'in' : 'out'}`}>{formatIDR(r.income - r.expense)}</span>
        </li>
      ))}
    </ul>
  )
}

// ── Halaman Kasir (POS) ──
function POS({ wallets, onSale }: { wallets: Wallet[]; onSale: (t: Omit<Tx, 'id'>) => void }) {
  const [display, setDisplay] = useState('')
  const [cart, setCart] = useState<{ name: string; price: number; qty: number }[]>([])
  const [itemName, setItemName] = useState('')
  const [wid, setWid] = useState(wallets[0]?.id ?? 'default')
  const [note, setNote] = useState('')

  const num = (d: string) => setDisplay((p) => (p === '0' ? d : (p + d).slice(0, 12)))
  const total = cart.reduce((s, c) => s + c.price * c.qty, 0)
  const cur = Number(display) || 0

  const addItem = () => {
    if (!cur || cur <= 0) return
    const name = itemName.trim() || `Item ${cart.length + 1}`
    setCart((p) => {
      const ex = p.find((c) => c.name === name && c.price === cur)
      if (ex) return p.map((c) => (c === ex ? { ...c, qty: c.qty + 1 } : c))
      return [...p, { name, price: cur, qty: 1 }]
    })
    setDisplay(''); setItemName('')
  }

  const checkout = (kind: Kind) => {
    if (!total && !cur) return
    const finalCart = cur > 0 ? [...cart, { name: itemName.trim() || `Item ${cart.length + 1}`, price: cur, qty: 1 }] : cart
    const sum = finalCart.reduce((s, c) => s + c.price * c.qty, 0)
    if (sum <= 0) return
    const desc = finalCart.map((c) => `${c.qty}x ${c.name}`).join(', ')
    onSale({ date: today(), kind, amount: sum, category: kind === 'income' ? 'Penjualan' : 'Belanja', note: (note.trim() ? note.trim() + ' · ' : '') + desc, walletId: wid })
    setCart([]); setDisplay(''); setItemName(''); setNote('')
  }

  return (
    <section>
      <div className="pg-head"><div><h1>Kasir</h1><p>Point of sale cepat · catat jual / beli dalam sekali ketuk</p></div></div>
      <div className="pos-grid">
        <div className="card">
          <div className="card-h"><h2>Input nominal</h2><span className="kbd">{cart.length} item</span></div>
          <div className="pos-display"><div className="pl">Nominal</div><div className="pv">Rp{cur ? cur.toLocaleString('id-ID') : '0'}</div></div>
          <div className="fld"><label>Nama item <span className="hint">(opsional)</span></label><input placeholder="mis. Kopi susu" value={itemName} onChange={(e) => setItemName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addItem() } }} /></div>
          <div className="numpad" role="group" aria-label="Numpad kasir">
            {['1','2','3','4','5','6','7','8','9','0','000','00'].map((d) => <button key={d} onClick={() => num(d)}>{d}</button>)}
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button className="btn btn-sec" style={{ flex: 1 }} onClick={() => setDisplay('')}>C</button>
            <button className="btn btn-sec" style={{ flex: 1 }} onClick={() => setDisplay((p) => p.slice(0, -1))}>⌫</button>
            <button className="btn btn-pri" style={{ flex: 2 }} onClick={addItem} disabled={!cur}>+ Keranjang</button>
          </div>
        </div>
        <div>
          <div className="card">
            <div className="card-h"><h2>Keranjang</h2><span className="mono" style={{ fontSize: 12, color: 'var(--accent)' }}>{formatIDR(total)}</span></div>
            {cart.length === 0 ? <p className="empty"><b>Keranjang kosong</b>Ketik nominal lalu tambah item.</p> : (
              <div>{cart.map((c, i) => (
                <div className="cart-item" key={i}>
                  <div className="tinfo"><div className="tcat">{c.name}</div><div className="tmeta mono">{formatIDR(c.price)} / pcs</div></div>
                  <div className="qty">
                    <button onClick={() => setCart((p) => p.map((x, j) => (j === i ? { ...x, qty: Math.max(1, x.qty - 1) } : x)))} aria-label="Kurangi">−</button>
                    <span>{c.qty}</span>
                    <button onClick={() => setCart((p) => p.map((x, j) => (j === i ? { ...x, qty: x.qty + 1 } : x)))} aria-label="Tambah">+</button>
                  </div>
                  <span className="tamt">{formatIDR(c.price * c.qty)}</span>
                  <button className="icon-btn danger" onClick={() => setCart((p) => p.filter((_, j) => j !== i))} aria-label={`Hapus ${c.name}`}>{I.x}</button>
                </div>
              ))}</div>
            )}
            <div className="divider" />
            <div className="fld" style={{ marginBottom: 10 }}><label>Masuk ke dompet</label>
              <select value={wid} onChange={(e) => setWid(e.target.value)}>{wallets.map((w) => <option key={w.id} value={w.id}>{w.name} · {formatIDR(w.balance)}</option>)}</select>
            </div>
            <div className="fld" style={{ marginBottom: 12 }}><label>Catatan <span className="hint">(opsional)</span></label><input placeholder="mis. shift pagi" value={note} onChange={(e) => setNote(e.target.value)} /></div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-inc" style={{ flex: 1, background: 'var(--income)', color: '#03170f' }} onClick={() => checkout('income')} disabled={!total && !cur}>Jual · {formatIDR(total + cur)}</button>
              <button className="btn" style={{ flex: 1, background: 'var(--expense)', color: '#241300' }} onClick={() => checkout('expense')} disabled={!total && !cur}>Beli</button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
