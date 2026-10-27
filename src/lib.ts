import { useEffect, useState, useCallback } from 'react'

// ── Types ─────────────────────────────────────────────────────────────
export type Kind = 'income' | 'expense'

export type Tx = {
  id: string
  date: string // YYYY-MM-DD
  kind: Kind
  amount: number
  category: string
  note: string
  walletId: string
}

export type Wallet = {
  id: string
  name: string
  balance: number
  color: string
}

export type SavingsGoal = {
  id: string
  name: string
  target: number
  current: number
  deadline: string // YYYY-MM-DD
  createdAt: string
}

export type POSItem = {
  id: string
  name: string
  price: number
  quantity: number
}

// ── Categories ─────────────────────────────────────────────────────────
export const EXPENSE_CATEGORIES = [
  'Makanan', 'Transport', 'Belanja', 'Tagihan', 'Kesehatan',
  'Hiburan', 'Pendidikan', 'Rumah', 'Kehidupan', 'Lainnya',
]
export const INCOME_CATEGORIES = [
  'Gaji', 'Bonus', 'Freelance', 'Investasi', 'Hadiah', 'Penjualan', 'Lainnya',
]
export const WALLET_COLORS = [
  '#ffffff', '#d4d4d4', '#a3a3a3', '#737373', '#525252', '#e5e5e5', '#c0c0c0', '#8f8f8f',
]

// ── Utilities ──────────────────────────────────────────────────────────
const uid = () =>
  crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`

const monthOf = (date: string) => date.slice(0, 7)
export { monthOf }

export const formatIDR = (n: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(n)

export const formatMonth = (ym: string) =>
  new Date(`${ym}-01T00:00:00`).toLocaleDateString('id-ID', {
    month: 'long',
    year: 'numeric',
  })

export const formatDay = (date: string) =>
  new Date(`${date}T00:00:00`).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })

export const today = () => new Date().toISOString().slice(0, 10)
export const thisMonth = () => new Date().toISOString().slice(0, 7)

// ── Storage helpers ──────────────────────────────────────────────────────
function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) || typeof parsed === 'object' ? parsed : fallback
  } catch {
    return fallback
  }
}

function saveToStorage<T>(key: string, data: T) {
  localStorage.setItem(key, JSON.stringify(data))
}

// ── Hook: Transactions ──────────────────────────────────────────────────
const TX_KEY = 'koinku.tx.v2'

export function useTransactions(walletId?: string) {
  const [txs, setTxs] = useState<Tx[]>(() => loadFromStorage(TX_KEY, []))

  useEffect(() => {
    saveToStorage(TX_KEY, txs)
  }, [txs])

  const add = useCallback((t: Omit<Tx, 'id'>) => {
    setTxs((prev) => [{ ...t, id: uid() }, ...prev])
  }, [])

  const remove = useCallback((id: string) => {
    setTxs((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const update = useCallback((id: string, data: Partial<Tx>) => {
    setTxs((prev) => prev.map((t) => (t.id === id ? { ...t, ...data } : t)))
  }, [])

  const filtered = walletId ? txs.filter((t) => t.walletId === walletId) : txs

  return { txs: filtered, allTxs: txs, add, remove, update }
}

// ── Hook: Wallets ───────────────────────────────────────────────────────
const WALLET_KEY = 'koinku.wallets.v1'

const DEFAULT_WALLETS: Wallet[] = [
  { id: 'default', name: 'Tunai', balance: 0, color: '#06b6d4' },
]

export function useWallets() {
  const [wallets, setWallets] = useState<Wallet[]>(() =>
    loadFromStorage(WALLET_KEY, DEFAULT_WALLETS)
  )

  useEffect(() => {
    saveToStorage(WALLET_KEY, wallets)
  }, [wallets])

  const add = useCallback((name: string, color: string) => {
    const wallet: Wallet = { id: uid(), name, balance: 0, color }
    setWallets((prev) => [...prev, wallet])
    return wallet
  }, [])

  const update = useCallback((id: string, data: Partial<Wallet>) => {
    setWallets((prev) => prev.map((w) => (w.id === id ? { ...w, ...data } : w)))
  }, [])

  const remove = useCallback((id: string) => {
    setWallets((prev) => prev.filter((w) => w.id !== id))
  }, [])

  const transfer = useCallback((fromId: string, toId: string, amount: number) => {
    setWallets((prev) =>
      prev.map((w) => {
        if (w.id === fromId) return { ...w, balance: w.balance - amount }
        if (w.id === toId) return { ...w, balance: w.balance + amount }
        return w
      })
    )
  }, [])

  const updateBalance = useCallback((id: string, delta: number) => {
    setWallets((prev) =>
      prev.map((w) => (w.id === id ? { ...w, balance: w.balance + delta } : w))
    )
  }, [])

  return { wallets, add, update, remove, transfer, updateBalance }
}

// ── Hook: Savings Goals ──────────────────────────────────────────────────
const SAVINGS_KEY = 'koinku.savings.v1'

export function useSavings() {
  const [goals, setGoals] = useState<SavingsGoal[]>(() =>
    loadFromStorage(SAVINGS_KEY, [])
  )

  useEffect(() => {
    saveToStorage(SAVINGS_KEY, goals)
  }, [goals])

  const add = useCallback((name: string, target: number, deadline: string) => {
    const goal: SavingsGoal = {
      id: uid(),
      name,
      target,
      current: 0,
      deadline,
      createdAt: today(),
    }
    setGoals((prev) => [...prev, goal])
    return goal
  }, [])

  const deposit = useCallback((id: string, amount: number) => {
    setGoals((prev) =>
      prev.map((g) => (g.id === id ? { ...g, current: g.current + amount } : g))
    )
  }, [])

  const withdraw = useCallback((id: string, amount: number) => {
    setGoals((prev) =>
      prev.map((g) => (g.id === id ? { ...g, current: Math.max(0, g.current - amount) } : g))
    )
  }, [])

  const remove = useCallback((id: string) => {
    setGoals((prev) => prev.filter((g) => g.id !== id))
  }, [])

  return { goals, add, deposit, withdraw, remove }
}

// ── Analytics helpers ───────────────────────────────────────────────────
export function summarize(txs: Tx[], month: string) {
  let income = 0
  let expense = 0
  for (const t of txs) {
    if (monthOf(t.date) !== month) continue
    if (t.kind === 'income') income += t.amount
    else expense += t.amount
  }
  return { income, expense, balance: income - expense }
}

export function byCategory(txs: Tx[], month: string, kind: Kind) {
  const map = new Map<string, number>()
  for (const t of txs) {
    if (t.kind !== kind || monthOf(t.date) !== month) continue
    map.set(t.category, (map.get(t.category) ?? 0) + t.amount)
  }
  return [...map].sort((a, b) => b[1] - a[1])
}

export function dailyTotals(txs: Tx[], month: string) {
  const days: Record<string, { income: number; expense: number }> = {}
  for (const t of txs) {
    if (monthOf(t.date) !== month) continue
    const day = t.date
    if (!days[day]) days[day] = { income: 0, expense: 0 }
    if (t.kind === 'income') days[day].income += t.amount
    else days[day].expense += t.amount
  }
  return Object.entries(days)
    .map(([date, vals]) => ({ date, ...vals }))
    .sort((a, b) => a.date.localeCompare(b.date))
}

export function totalBalance(wallets: Wallet[]) {
  return wallets.reduce((sum, w) => sum + w.balance, 0)
}

export function exportToCSV(txs: Tx[], wallets: Wallet[]) {
  const walletMap = new Map(wallets.map((w) => [w.id, w.name]))
  const header = 'Tanggal,Jenis,Kategori,Nominal,Dompet,Catatan\n'
  const rows = txs
    .map((t) =>
      [
        t.date,
        t.kind === 'income' ? 'Pemasukan' : 'Pengeluaran',
        t.category,
        t.amount,
        walletMap.get(t.walletId) ?? '-',
        `"${t.note.replace(/"/g, '""')}"`,
      ].join(',')
    )
    .join('\n')
  return header + rows
}

export function downloadCSV(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
