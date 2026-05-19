'use client'

import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useAccount, useChainId, useDisconnect } from 'wagmi'
import { mainnet, polygon, optimism, arbitrum, base } from 'wagmi/chains'
import { useState, useEffect } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

const MORALIS_API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJub25jZSI6ImUxNTgyMGJlLTE4NTgtNDAxNy04MGI2LWM3YWFhOWZmNjAzNyIsIm9yZ0lkIjoiNTE2MDUyIiwidXNlcklkIjoiNTMxMDk2IiwidHlwZUlkIjoiMmY4YWQ0ZjgtOTFmNC00NTk1LTk1OTktNzFjOTMyNzhiZDU1IiwidHlwZSI6IlBST0pFQ1QiLCJpYXQiOjE3Nzg4MTI1NDMsImV4cCI6NDkzNDU3MjU0M30.jXhDWlMUXa4RY5sLCcLqbYcQIyV1rO_hLmFWZhHQYTM'

const CHAIN_MAP: Record<number, string> = {
  [mainnet.id]: '0x1',
  [polygon.id]: '0x89',
  [optimism.id]: '0xa',
  [arbitrum.id]: '0xa4b1',
  [base.id]: '0x2105',
}

const CHAIN_NAMES: Record<number, string> = {
  [mainnet.id]: 'Ethereum',
  [polygon.id]: 'Polygon',
  [optimism.id]: 'Optimism',
  [arbitrum.id]: 'Arbitrum',
  [base.id]: 'Base',
}

type Token = {
  symbol: string
  name: string
  balance: string
  decimals: number
  usd_price: number | null
  usd_value: number | null
  logo: string | null
  thumbnail: string | null
  token_address: string
}

type ChartPoint = { date: string; price: number }

function formatBalance(balance: string, decimals: number): string {
  const num = Number(balance) / Math.pow(10, decimals)
  if (num < 0.0001) return '< 0.0001'
  if (num < 1) return num.toFixed(4)
  if (num < 1000) return num.toFixed(2)
  return num.toLocaleString('ja-JP', { maximumFractionDigits: 2 })
}

function formatJPY(usd: number): string {
  return new Intl.NumberFormat('ja-JP', {
    style: 'currency', currency: 'JPY', maximumFractionDigits: 0,
  }).format(usd * 150)
}

function formatUSD(value: number): string {
  return new Intl.NumberFormat('ja-JP', {
    style: 'currency', currency: 'USD', maximumFractionDigits: 2,
  }).format(value)
}

// ────────────────────────────────────────────
// 確定申告CSV出力
// ────────────────────────────────────────────
function downloadCSV(tokens: Token[], address: string) {
  const JPY_RATE = 150
  const rows = [
    ['トークン名', 'シンボル', '保有数量', '現在価格(USD)', '現在価格(JPY)', '評価額(JPY)', 'ウォレットアドレス', '出力日時'],
    ...tokens.map(t => {
      const amount = Number(t.balance) / Math.pow(10, t.decimals)
      const priceUSD = t.usd_price ?? 0
      const priceJPY = priceUSD * JPY_RATE
      const valueJPY = (t.usd_value ?? 0) * JPY_RATE
      return [
        t.name,
        t.symbol,
        amount.toFixed(6),
        priceUSD.toFixed(6),
        priceJPY.toFixed(2),
        valueJPY.toFixed(0),
        address,
        new Date().toLocaleString('ja-JP'),
      ]
    })
  ]

  const csv = rows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n')
  const bom = '\uFEFF'
  const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `defi_portfolio_${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// ────────────────────────────────────────────
// 価格チャート
// ────────────────────────────────────────────
function PriceChart({ symbol }: { symbol: string }) {
  const [data, setData] = useState<ChartPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [days, setDays] = useState(7)

  useEffect(() => {
    const fetchChart = async () => {
      setLoading(true)
      try {
        const searchRes = await fetch(`https://api.coingecko.com/api/v3/search?query=${symbol}`)
        const searchData = await searchRes.json()
        const coinId = searchData.coins?.[0]?.id
        if (!coinId) return
        const priceRes = await fetch(`https://api.coingecko.com/api/v3/coins/${coinId}/market_chart?vs_currency=jpy&days=${days}`)
        const priceData = await priceRes.json()
        const points: ChartPoint[] = (priceData.prices ?? []).map(([ts, price]: [number, number]) => ({
          date: new Date(ts).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' }),
          price: Math.round(price),
        }))
        const step = Math.max(1, Math.floor(points.length / 30))
        setData(points.filter((_, i) => i % step === 0))
      } catch { } finally {
        setLoading(false)
      }
    }
    fetchChart()
  }, [symbol, days])

  if (loading) return <div style={styles.chartLoading}>📈 チャート読み込み中...</div>
  if (data.length === 0) return <div style={styles.chartLoading}>チャートデータなし</div>

  const first = data[0]?.price ?? 0
  const last = data[data.length - 1]?.price ?? 0
  const isUp = last >= first
  const color = isUp ? '#00FF88' : '#FF4444'

  return (
    <div style={styles.chartWrap}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
        {[7, 30].map(d => (
          <button key={d} onClick={() => setDays(d)} style={{ ...styles.dayBtn, color: days === d ? '#060D1A' : '#556677', background: days === d ? '#00FF88' : 'transparent', border: `1px solid ${days === d ? '#00FF88' : '#1A2A40'}` }}>{d}日</button>
        ))}
        <span style={{ marginLeft: 'auto', fontSize: 12, color, alignSelf: 'center' }}>{isUp ? '▲' : '▼'} {Math.abs(((last - first) / first) * 100).toFixed(2)}%</span>
      </div>
      <ResponsiveContainer width="100%" height={120}>
        <LineChart data={data}>
          <XAxis dataKey="date" hide />
          <YAxis hide domain={['auto', 'auto']} />
          <Tooltip contentStyle={{ background: '#0D1E35', border: '1px solid #1A2A40', borderRadius: 8, fontSize: 11 }} formatter={(val) => [`¥${Number(val).toLocaleString()}`, '価格']} labelStyle={{ color: '#556677' }} />
          <Line type="monotone" dataKey="price" stroke={color} dot={false} strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

function TokenRow({ token }: { token: Token }) {
  const [open, setOpen] = useState(false)
  return (
    <div>
      <div style={{ ...styles.tokenRow, cursor: 'pointer' }} onClick={() => setOpen(!open)}>
        <div style={styles.tokenIcon}>
          {token.thumbnail || token.logo ? (
            <img src={token.thumbnail ?? token.logo ?? ''} alt={token.symbol} style={{ width: 36, height: 36, borderRadius: '50%' }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
          ) : (
            <div style={styles.tokenIconFallback}>{token.symbol.slice(0, 2)}</div>
          )}
        </div>
        <div style={{ flex: 1 }}>
          <div style={styles.tokenSymbol}>{token.symbol}</div>
          <div style={styles.tokenName}>{token.name}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={styles.tokenBalance}>{formatBalance(token.balance, token.decimals)}</div>
          <div style={styles.tokenValue}>{token.usd_value != null ? formatJPY(token.usd_value) : '価格なし'}</div>
        </div>
        <div style={{ marginLeft: 12, color: '#334455', fontSize: 12 }}>{open ? '▲' : '▼'}</div>
      </div>
      {open && <div style={{ background: '#080F1A', padding: '12px 20px', borderBottom: '1px solid #0A1525' }}><PriceChart symbol={token.symbol} /></div>}
    </div>
  )
}

function TokenList({ address, chainId }: { address: `0x${string}`; chainId: number }) {
  const [tokens, setTokens] = useState<Token[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [totalUSD, setTotalUSD] = useState(0)
  const chain = CHAIN_MAP[chainId] ?? '0x1'

  useEffect(() => {
    const fetchTokens = async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`https://deep-index.moralis.io/api/v2.2/${address}/erc20?chain=${chain}&exclude_spam=true`, { headers: { 'X-API-Key': MORALIS_API_KEY, accept: 'application/json' } })
        if (!res.ok) throw new Error(`APIエラー: ${res.status}`)
        const data = await res.json()
        const list: Token[] = data.result ?? []
        setTotalUSD(list.reduce((sum, t) => sum + (t.usd_value ?? 0), 0))
        setTokens(list)
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'データの取得に失敗しました')
      } finally {
        setLoading(false)
      }
    }
    fetchTokens()
  }, [address, chain])

  if (loading) return <div style={styles.loadingWrap}><div style={styles.loadingText}>🔄 トークンを取得中...</div></div>
  if (error) return <div style={styles.errorCard}>⚠️ {error}<div style={{ fontSize: 11, color: '#556677', marginTop: 6 }}>APIキーを確認してください</div></div>
  if (tokens.length === 0) return (
    <div>
      <button onClick={() => downloadCSV([], address)} style={styles.csvBtn}>
        📄 確定申告用CSV出力
      </button>
      <div style={styles.emptyCard}>🪙 このチェーンにトークンが見つかりませんでした</div>
    </div>
  )

  return (
    <div>
      <div style={styles.totalCard}>
        <div style={styles.totalLabel}>総資産額（ERC20トークン）</div>
        <div style={styles.totalUSD}>{formatUSD(totalUSD)}</div>
        <div style={styles.totalJPY}>≈ {formatJPY(totalUSD)}</div>
        <div style={styles.tokenCount}>{tokens.length} トークン</div>
      </div>

      {/* 確定申告CSVボタン */}
      <button onClick={() => downloadCSV(tokens, address)} style={styles.csvBtn}>
        📄 確定申告用CSV出力
      </button>

      <div style={styles.tokenList}>
        <div style={{ fontSize: 11, color: '#334455', padding: '8px 20px', borderBottom: '1px solid #0A1525' }}>トークン名をタップするとチャートが表示されます 📈</div>
        {tokens.sort((a, b) => (b.usd_value ?? 0) - (a.usd_value ?? 0)).map((token, i) => <TokenRow key={i} token={token} />)}
      </div>
    </div>
  )
}

function Dashboard({ address }: { address: `0x${string}` }) {
  const chainId = useChainId()
  const { disconnect } = useDisconnect()
  const shortAddr = `${address.slice(0, 6)}...${address.slice(-4)}`

  const handleUpgrade = async () => {
    const res = await fetch('/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address }),
    })
    const data = await res.json()
    if (data.url) window.location.href = data.url
  }

  return (
    <div style={styles.dashboard}>
      <button onClick={() => disconnect()} style={styles.disconnectBtn}>← 接続を解除</button>
      <button onClick={handleUpgrade} style={styles.upgradeBtn}>
  ⭐ Proプランにアップグレード ¥980/月
</button>
      <div style={styles.dashHeader}>
        <div>
          <div style={styles.dashTitle}>ポートフォリオ 💼</div>
          <div style={styles.dashMeta}>
            <span style={styles.dashAddr}>{shortAddr}</span>
            <span style={styles.dashChain}>{CHAIN_NAMES[chainId] ?? 'Unknown'}</span>
          </div>
        </div>
        <ConnectButton showBalance={false} />
      </div>
      <TokenList address={address} chainId={chainId} />
    </div>
  )
}

function LandingPage() {
  return (
    <div style={styles.landing}>
      <div style={styles.logo}>◆</div>
      <h1 style={styles.headline}>DeFi Portfolio<br /><span style={styles.headlineGreen}>Manager</span></h1>
      <p style={styles.subtext}>ウォレットを繋ぐだけで<br />全資産を<strong style={{ color: '#00FF88' }}>円換算</strong>で一目で把握</p>
      <div style={styles.features}>
        {[{ icon: '⚡', text: '接続3秒' }, { icon: '🇯🇵', text: '完全日本語' }, { icon: '🔒', text: 'シークレットキー不要' }, { icon: '📊', text: '損益一覧' }].map(f => (
          <div key={f.text} style={styles.featureItem}>
            <span style={{ fontSize: 20 }}>{f.icon}</span>
            <span style={{ fontSize: 12, color: '#8899AA' }}>{f.text}</span>
          </div>
        ))}
      </div>
      <div style={styles.connectWrap}><ConnectButton label="ウォレットを接続する" /></div>
      <p style={styles.disclaimer}>MetaMask / Coinbase / WalletConnect 対応</p>
    </div>
  )
}

export default function Home() {
  const { address, isConnected } = useAccount()
  return (
    <main style={styles.main}>
      {isConnected && address ? <Dashboard address={address} /> : <LandingPage />}
    </main>
  )
}

const styles: Record<string, React.CSSProperties> = {
  main: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' },
  landing: { textAlign: 'center', maxWidth: 480, width: '100%' },
  logo: { fontSize: 40, color: '#00FF88', marginBottom: 24, transform: 'rotate(45deg)', display: 'inline-block' },
  headline: { fontSize: 48, fontWeight: 800, color: '#FFFFFF', lineHeight: 1.15, marginBottom: 20, letterSpacing: -1 },
  headlineGreen: { color: '#00FF88' },
  subtext: { fontSize: 16, color: '#8899AA', lineHeight: 1.8, marginBottom: 32 },
  features: { display: 'flex', justifyContent: 'center', gap: 24, marginBottom: 40 },
  featureItem: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 },
  connectWrap: { display: 'flex', justifyContent: 'center', marginBottom: 16 },
  disclaimer: { fontSize: 11, color: '#334455' },
  dashboard: { width: '100%', maxWidth: 680 },
  disconnectBtn: { display: 'inline-block', marginBottom: 12, padding: '6px 14px', fontSize: 12, color: '#8899AA', background: 'transparent', border: '1px solid #1A2A40', borderRadius: 8, cursor: 'pointer' },
  csvBtn: { display: 'block', width: '100%', padding: '12px', marginBottom: 16, fontSize: 14, fontWeight: 700, color: '#060D1A', background: '#00FF88', border: 'none', borderRadius: 12, cursor: 'pointer' },
  dashHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, padding: '16px 20px', background: '#0D1E35', border: '1px solid #1A2A40', borderRadius: 16 },
  dashTitle: { fontSize: 20, fontWeight: 800, color: '#FFFFFF', marginBottom: 4 },
  dashMeta: { display: 'flex', alignItems: 'center', gap: 10 },
  dashAddr: { fontSize: 12, color: '#00FF88', fontFamily: 'monospace' },
  dashChain: { fontSize: 10, color: '#445566', background: '#0A1525', border: '1px solid #1A2A40', borderRadius: 4, padding: '2px 8px' },
  totalCard: { background: 'linear-gradient(135deg, #0D1E35 0%, #051A10 100%)', border: '1px solid #00FF8844', borderRadius: 16, padding: '24px', marginBottom: 16, textAlign: 'center' },
  totalLabel: { fontSize: 11, color: '#556677', letterSpacing: 2, marginBottom: 8 },
  totalUSD: { fontSize: 40, fontWeight: 800, color: '#FFFFFF', marginBottom: 4 },
  totalJPY: { fontSize: 18, color: '#00FF88', marginBottom: 8 },
  tokenCount: { fontSize: 11, color: '#334455' },
  loadingWrap: { display: 'flex', justifyContent: 'center', padding: '40px' },
  loadingText: { fontSize: 14, color: '#556677' },
  errorCard: { background: '#1A0A0A', border: '1px solid #ff444433', borderRadius: 16, padding: '32px', textAlign: 'center', color: '#ff6666', fontSize: 13 },
  emptyCard: { background: '#0D1E35', border: '1px dashed #1A2A40', borderRadius: 16, padding: '40px', textAlign: 'center', color: '#556677', fontSize: 13 },
  tokenList: { background: '#0D1E35', border: '1px solid #1A2A40', borderRadius: 16, overflow: 'hidden' },
  tokenRow: { display: 'flex', alignItems: 'center', gap: 12, padding: '14px 20px', borderBottom: '1px solid #0A1525' },
  tokenIcon: { width: 36, height: 36, flexShrink: 0 },
  tokenIconFallback: { width: 36, height: 36, borderRadius: '50%', background: '#1A2A40', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#00FF88', fontWeight: 700 },
  tokenSymbol: { fontSize: 14, fontWeight: 700, color: '#FFFFFF', marginBottom: 2 },
  tokenName: { fontSize: 11, color: '#556677' },
  tokenBalance: { fontSize: 13, fontWeight: 600, color: '#C8D0E0', marginBottom: 2 },
  tokenValue: { fontSize: 12, color: '#00FF88' },
  chartWrap: { padding: '4px 0' },
  chartLoading: { fontSize: 12, color: '#334455', padding: '16px 0', textAlign: 'center' },
  dayBtn: { fontSize: 11, padding: '3px 10px', borderRadius: 4, cursor: 'pointer', fontWeight: 600 },
  upgradeBtn: { display: 'block', width: '100%', padding: '12px', marginBottom: 12, fontSize: 14, fontWeight: 700, color: '#FFFFFF', background: 'linear-gradient(135deg, #6600FF 0%, #0066FF 100%)', border: 'none', borderRadius: 12, cursor: 'pointer' },
}