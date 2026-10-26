import { useEffect, useState } from 'react'

export type Kind = 'income' | 'expense'

export type Tx = {
  id: string
  date: string // YYYY-MM-DD
  kind: Kind
  amount: number
  category: string
  note: string
}

const KEY = 'duit.tx.v1'

export const EXPENSE_CATEGORIES = [
  'Makanan', 'Transport', 'Belanja', 'Tagihan', 'Kesehatan',
  'Hiburan', 'Pendidikan', 'Rumah', 'Lainnya',
]
export const INCOME_CATEGORIES = ['Gaji', 'Bonus', 'Freelance', 'Investasi', 'Hadiah', 'Lainnya']

const load = (): Tx[] => {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as Tx[]) : []
  } catch {
    return []
  }
}

const uid = () =>
  crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`

export function useTransactions() {
  const [txs, setTxs] = useState<Tx[]>(load)

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(txs))
  }, [txs])

  const add = (t: Omit<Tx, 'id'>) => setTxs((prev) => [{ ...t, id: uid() }, ...prev])
  const remove = (id: string) => setTxs((prev) => prev.filter((t) => t.id !== id))

  return { txs, add, remove }
}

export const monthOf = (date: string) => date.slice(0, 7) // YYYY-MM

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
