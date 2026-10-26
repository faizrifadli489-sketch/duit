import { useEffect, useId, useMemo, useRef, useState } from 'react'
import {
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  byCategory,
  formatDay,
  formatIDR,
  formatMonth,
  monthOf,
  summarize,
  useTransactions,
  type Kind,
} from './lib'

const today = () => new Date().toISOString().slice(0, 10)
const thisMonth = () => new Date().toISOString().slice(0, 7)
const sign = (kind: Kind) => (kind === 'income' ? '+' : '−')

function Bars({ data }: { data: [string, number][] }) {
  const max = data[0]?.[1] ?? 0
  return (
    <ul className="bars">
      {data.map(([cat, val]) => (
        <li className="bar" key={cat}>
          <span className="name" title={cat}>
            {cat}
          </span>
          <div
            className="track"
            role="img"
            aria-label={`${cat}: ${formatIDR(val)}`}
          >
            <div
              className="fill"
              style={{ width: `${max > 0 ? (val / max) * 100 : 0}%` }}
            />
          </div>
          <span className="val">{formatIDR(val)}</span>
        </li>
      ))}
    </ul>
  )
}

export default function App() {
  const { txs, add, remove } = useTransactions()
  const [month, setMonth] = useState(thisMonth)
  const [kind, setKind] = useState<Kind>('expense')
  const [category, setCategory] = useState(EXPENSE_CATEGORIES[0])
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(today)
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const [saved, setSaved] = useState('')
  const amountRef = useRef<HTMLInputElement>(null)
  const ids = { amount: useId(), date: useId(), cat: useId(), note: useId(), month: useId() }

  const categories = kind === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES

  const monthTxs = useMemo(
    () =>
      txs
        .filter((t) => monthOf(t.date) === month)
        .sort((a, b) => b.date.localeCompare(a.date)),
    [txs, month],
  )
  const stats = useMemo(() => summarize(txs, month), [txs, month])
  const expenseByCat = useMemo(() => byCategory(txs, month, 'expense'), [txs, month])

  const months = useMemo(() => {
    const s = new Set(txs.map((t) => monthOf(t.date)))
    s.add(thisMonth())
    s.add(month)
    return [...s].sort().reverse()
  }, [txs, month])

  useEffect(() => {
    if (!saved) return
    const t = setTimeout(() => setSaved(''), 3000)
    return () => clearTimeout(t)
  }, [saved])

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const value = Number(amount.replace(/[^\d]/g, ''))
    if (!Number.isFinite(value) || value <= 0) {
      setError('Nominal harus lebih dari 0.')
      amountRef.current?.focus()
      return
    }
    if (!date) {
      setError('Tanggal wajib diisi.')
      return
    }
    setError('')
    add({ date, kind, amount: value, category, note: note.trim() })
    setSaved(
      `${kind === 'income' ? 'Pemasukan' : 'Pengeluaran'} ${formatIDR(value)} tersimpan.`,
    )
    setAmount('')
    setNote('')
    setMonth(monthOf(date))
    amountRef.current?.focus()
  }

  const switchKind = (k: Kind) => {
    setKind(k)
    setCategory(k === 'income' ? INCOME_CATEGORIES[0] : EXPENSE_CATEGORIES[0])
  }

  return (
    <main className="shell">
      <header className="top">
        <div>
          <h1>Duit</h1>
          <p className="sub">Catatan pemasukan dan pengeluaran. Tersimpan di perangkat ini.</p>
        </div>
        <div className="month-pick">
          <label htmlFor={ids.month}>Bulan</label>
          <select id={ids.month} value={month} onChange={(e) => setMonth(e.target.value)}>
            {months.map((m) => (
              <option key={m} value={m}>
                {formatMonth(m)}
              </option>
            ))}
          </select>
        </div>
      </header>

      <section aria-labelledby="ringkasan">
        <h2 id="ringkasan" className="sr-only">
          Ringkasan {formatMonth(month)}
        </h2>
        <dl className="stats">
          <div className="stat">
            <dt>Pemasukan</dt>
            <dd className="up">+{formatIDR(stats.income)}</dd>
          </div>
          <div className="stat">
            <dt>Pengeluaran</dt>
            <dd className="down">−{formatIDR(stats.expense)}</dd>
          </div>
          <div className="stat">
            <dt>Saldo</dt>
            <dd className={stats.balance >= 0 ? 'up' : 'down'}>
              {formatIDR(stats.balance)}
            </dd>
          </div>
        </dl>
      </section>

      <section className="card" aria-labelledby="tambah">
        <h2 id="tambah">Tambah transaksi</h2>
        <form className="form-grid" onSubmit={submit} noValidate>
          <div className="field">
            <span className="legend" id="jenis-label">
              Jenis
            </span>
            <div className="seg" role="group" aria-labelledby="jenis-label">
              <button
                type="button"
                aria-pressed={kind === 'expense'}
                onClick={() => switchKind('expense')}
              >
                Pengeluaran
              </button>
              <button
                type="button"
                aria-pressed={kind === 'income'}
                onClick={() => switchKind('income')}
              >
                Pemasukan
              </button>
            </div>
          </div>

          <div className="field">
            <label htmlFor={ids.amount}>Nominal (Rp)</label>
            <input
              id={ids.amount}
              ref={amountRef}
              inputMode="numeric"
              autoComplete="off"
              placeholder="25000"
              value={amount}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? 'form-error' : undefined}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>

          <div className="field">
            <label htmlFor={ids.date}>Tanggal</label>
            <input
              id={ids.date}
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          <div className="field">
            <label htmlFor={ids.cat}>Kategori</label>
            <select id={ids.cat} value={category} onChange={(e) => setCategory(e.target.value)}>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div className="field full">
            <label htmlFor={ids.note}>
              Catatan <span className="hint">(opsional)</span>
            </label>
            <input
              id={ids.note}
              placeholder="mis. makan siang"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          <div className="actions">
            <button className="btn" type="submit">
              Simpan
            </button>
            {error && (
              <p className="status" id="form-error" role="alert" style={{ color: 'var(--expense)' }}>
                {error}
              </p>
            )}
          </div>
        </form>
        <p className="status" role="status">
          {saved}
        </p>
      </section>

      <section className="card" aria-labelledby="kategori">
        <div className="section-head">
          <h2 id="kategori">Pengeluaran per kategori</h2>
        </div>
        {expenseByCat.length === 0 ? (
          <p className="empty">Belum ada pengeluaran bulan ini.</p>
        ) : (
          <Bars data={expenseByCat} />
        )}
      </section>

      <section className="card" aria-labelledby="daftar">
        <div className="section-head">
          <h2 id="daftar">Transaksi</h2>
          <span className="count">
            {monthTxs.length} transaksi · {formatMonth(month)}
          </span>
        </div>
        {monthTxs.length === 0 ? (
          <p className="empty">Belum ada transaksi bulan ini.</p>
        ) : (
          <ul className="list">
            {monthTxs.map((t) => (
              <li className="row" key={t.id}>
                <div className="who">
                  <div className="cat">{t.category}</div>
                  <div className="meta">
                    {formatDay(t.date)}
                    {t.note ? ` · ${t.note}` : ''}
                  </div>
                </div>
                <span className={`amt ${t.kind === 'income' ? 'in' : 'out'}`}>
                  <span className="tag">
                    {t.kind === 'income' ? 'masuk' : 'keluar'}
                  </span>
                  {sign(t.kind)}
                  {formatIDR(t.amount)}
                </span>
                <button
                  className="icon-btn"
                  type="button"
                  aria-label={`Hapus ${t.category} ${formatIDR(t.amount)} tanggal ${formatDay(t.date)}`}
                  onClick={() => {
                    remove(t.id)
                    setSaved(`Transaksi ${t.category} dihapus.`)
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
                    <path
                      d="M4 4l8 8M12 4l-8 8"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  )
}
