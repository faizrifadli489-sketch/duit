import { useMemo, useState } from 'react'
import {
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  byCategory,
  formatIDR,
  formatMonth,
  monthOf,
  summarize,
  useTransactions,
  type Kind,
} from './lib'

const today = () => new Date().toISOString().slice(0, 10)
const thisMonth = () => new Date().toISOString().slice(0, 7)

function Bar({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = max > 0 ? (value / max) * 100 : 0
  return (
    <div className="bar-row">
      <span title={label}>{label}</span>
      <div
        className="bar-track"
        role="img"
        aria-label={`${label}: ${formatIDR(value)}`}
      >
        <div className="bar-fill" style={{ width: `${pct}%` }} />
      </div>
      <span className="num">{formatIDR(value)}</span>
    </div>
  )
}

export default function App() {
  const { txs, add, remove } = useTransactions()
  const [month, setMonth] = useState(thisMonth)
  const [kind, setKind] = useState<Kind>('expense')
  const [category, setCategory] = useState('Makanan')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(today)
  const [note, setNote] = useState('')

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
  const maxCat = expenseByCat.length ? expenseByCat[0][1] : 0

  const monthsWithData = useMemo(() => {
    const s = new Set(txs.map((t) => monthOf(t.date)))
    s.add(thisMonth())
    return [...s].sort().reverse()
  }, [txs])

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const value = Number(amount.replace(/[^\d]/g, ''))
    if (!Number.isFinite(value) || value <= 0) return
    add({ date, kind, amount: value, category, note: note.trim() })
    setAmount('')
    setNote('')
    setMonth(monthOf(date))
  }

  const switchKind = (k: Kind) => {
    setKind(k)
    setCategory(k === 'income' ? INCOME_CATEGORIES[0] : EXPENSE_CATEGORIES[0])
  }

  return (
    <div className="app">
      <header className="header">
        <h1>Duit</h1>
        <label className="field">
          <span>Bulan</span>
          <select value={month} onChange={(e) => setMonth(e.target.value)}>
            {monthsWithData.map((m) => (
              <option key={m} value={m}>
                {formatMonth(m)}
              </option>
            ))}
          </select>
        </label>
      </header>

      <section className="summary" aria-label="Ringkasan bulan ini">
        <div className="card stat">
          <div className="label">Pemasukan</div>
          <div className="value success">{formatIDR(stats.income)}</div>
        </div>
        <div className="card stat">
          <div className="label">Pengeluaran</div>
          <div className="value danger">{formatIDR(stats.expense)}</div>
        </div>
        <div className="card stat">
          <div className="label">Saldo</div>
          <div className={`value ${stats.balance >= 0 ? 'success' : 'danger'}`}>
            {formatIDR(stats.balance)}
          </div>
        </div>
      </section>

      <section className="card">
        <h2>Tambah transaksi</h2>
        <form className="tx" onSubmit={submit}>
          <div className="field">
            <span>Jenis</span>
            <div className="seg">
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

          <label className="field">
            <span>Nominal (Rp)</span>
            <input
              inputMode="numeric"
              placeholder="25000"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </label>

          <label className="field">
            <span>Tanggal</span>
            <input type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
          </label>

          <label className="field">
            <span>Kategori</span>
            <select value={category} onChange={(e) => setCategory(e.target.value)}>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>

          <label className="field wide">
            <span>Catatan (opsional)</span>
            <input
              placeholder="mis. makan siang"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </label>

          <div className="field wide">
            <button className="btn" type="submit">
              Simpan
            </button>
          </div>
        </form>
      </section>

      <section className="card">
        <h2>Pengeluaran per kategori</h2>
        {expenseByCat.length === 0 ? (
          <p className="empty">Belum ada pengeluaran bulan ini.</p>
        ) : (
          <div className="chart">
            {expenseByCat.map(([cat, val]) => (
              <Bar key={cat} label={cat} value={val} max={maxCat} />
            ))}
          </div>
        )}
      </section>

      <section className="card">
        <h2>Transaksi</h2>
        {monthTxs.length === 0 ? (
          <p className="empty">Belum ada transaksi.</p>
        ) : (
          <ul className="tx-list">
            {monthTxs.map((t) => (
              <li className="tx-item" key={t.id}>
                <div>
                  <div>{t.category}</div>
                  <div className="meta">
                    {new Date(`${t.date}T00:00:00`).toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'short',
                    })}
                    {t.note ? ` · ${t.note}` : ''}
                  </div>
                </div>
                <span className={`amount ${t.kind}`}>
                  {t.kind === 'income' ? '+' : '−'}
                  {formatIDR(t.amount)}
                </span>
                <button
                  className="icon-btn"
                  type="button"
                  aria-label={`Hapus ${t.category} ${formatIDR(t.amount)}`}
                  onClick={() => remove(t.id)}
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
