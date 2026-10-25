import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { api, browserOnlyDemo, tok, media } from './api'

type F = { k: string; l: string; t?: 'area' | 'bool' | 'num' | 'img' }
const CFG: Record<string, { title: string; f: F[]; status?: string[]; ro?: boolean }> = {
  services: { title: 'Services', f: [{ k: 'icon', l: 'Icon (emoji/symbol)' }, { k: 'title', l: 'Title' }, { k: 'description', l: 'Description', t: 'area' }, { k: 'published', l: 'Published', t: 'bool' }] },
  projects: { title: 'Works', f: [{ k: 'title', l: 'Title' }, { k: 'category', l: 'Category' }, { k: 'result', l: 'Key result' }, { k: 'description', l: 'Description', t: 'area' }, { k: 'caseStudyUrl', l: 'Case study URL (optional)' }, { k: 'image', l: 'Image URL (pick from Media)', t: 'img' }, { k: 'published', l: 'Published', t: 'bool' }] },
  testimonials: { title: 'Testimonials', f: [{ k: 'name', l: 'Name' }, { k: 'role', l: 'Role / company' }, { k: 'quote', l: 'Quote', t: 'area' }, { k: 'rating', l: 'Rating (1-5)', t: 'num' }, { k: 'published', l: 'Published', t: 'bool' }] },
  enquiries: { title: 'Enquiries', ro: true, status: ['new', 'in-progress', 'closed'], f: [] },
  quotes: { title: 'Quote requests', ro: true, status: ['new', 'in-progress', 'quoted', 'closed'], f: [] },
}
const NAV = [['dashboard', '▦ Dashboard'], ['enquiries', '✉ Enquiries'], ['quotes', '＄ Quotes'], ['services', '◆ Services'], ['projects', '▣ Works'], ['about', '◉ About'], ['contact', '✉ Contact'], ['testimonials', '★ Testimonials'], ['content', '✎ Content'], ['quote-settings', '＄ Quote Settings'], ['media', '▤ Media'], ['notifications', '🔔 Notifications'], ['profile', '⚙ Profile']]
const SECTION_FIELDS: Record<string, F[]> = {
  about: [
    { k: 'aboutTitle', l: 'About heading' },
    { k: 'aboutText', l: 'About description', t: 'area' },
  ],
  contact: [
    { k: 'contactTitle', l: 'Contact heading' },
    { k: 'email', l: 'Public email' },
    { k: 'phone', l: 'Phone number' },
    { k: 'address', l: 'Location' },
  ],
}
const Card = ({ children, className = '' }: any) => <div className={`card p-4 sm:p-5 ${className}`}>{children}</div>

function Login({ ok }: any) {
  const [e, setE] = useState(''), [p, setP] = useState(''), [err, setErr] = useState('')
  return <div className="grid min-h-screen place-items-center px-4"><motion.form initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} onSubmit={async x => { x.preventDefault(); try { const r = await api('/auth/login', { method: 'POST', body: { email: e, password: p } }); localStorage.setItem('tp_token', r.token); ok() } catch (z: any) { setErr(z.message) } }} className="card w-full max-w-sm space-y-4 p-6 sm:p-8">
    <h1 className="font-display text-2xl font-bold">ASVORA Admin</h1><p className="text-sm text-white/50">Sign in to manage the website.</p>
    {browserOnlyDemo && <p className="rounded-xl border border-yellow-400/20 bg-yellow-400/5 p-3 text-xs text-yellow-200">Browser-only demo: this is not secure authentication. Changes stay in this browser and do not update the live website. Open the public site with this same address and port to share demo changes.</p>}
    <input className="inp" type="email" placeholder="Email" value={e} onChange={x => setE(x.target.value)} required /><input className="inp" type="password" placeholder="Password" value={p} onChange={x => setP(x.target.value)} required />
    {err && <p className="text-sm text-red-400">{err}</p>}<button className="btn-p w-full">Sign in</button></motion.form></div>
}

function Dash() {
  const [s, setS] = useState<any>(null), [error, setError] = useState('')
  const load = () => { setError(''); api('/admin/stats').then(setS).catch((x: any) => setError(x.message || 'Could not load dashboard data.')) }
  useEffect(() => { load() }, [])
  if (!s) return error ? <div><p role="alert" className="text-red-300">{error}</p><button className="btn-g mt-4" onClick={load}>Retry</button></div> : <p>Loading dashboard…</p>
  const max = Math.max(1, ...s.series.map((x: any) => x.n))
  const K = [['Total visits', s.visits], ['Enquiries', s.enquiries], ['Quote requests', s.quotes], ['Awaiting reply', s.new], ['Services', s.services], ['Projects', s.projects]]
  return <div className="space-y-6"><div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">{K.map(([k, v], i) => <motion.div key={k} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * .05 }}><Card><p className="text-sm text-white/50">{k}</p><b className="font-display text-3xl text-lime">{v}</b></Card></motion.div>)}</div>
    <div className="grid gap-6 lg:grid-cols-3"><Card className="lg:col-span-2"><h3 className="mb-4 font-display">Visitors, last 14 days</h3><div className="flex h-48 items-end gap-2">{s.series.map((x: any, i: number) => <div key={x.d} className="group relative flex-1"><motion.div initial={{ height: 0 }} animate={{ height: (x.n / max) * 100 + '%' }} transition={{ delay: i * .04 }} className="min-h-[3px] rounded-t bg-gradient-to-t from-brand to-lime" /><span className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs opacity-0 group-hover:opacity-100">{x.n}</span></div>)}</div>
      <div className="mt-2 flex justify-between text-xs text-white/40"><span>{s.series[0].d}</span><span>{s.series[13].d}</span></div></Card>
      <Card><h3 className="mb-4 font-display">Top pages</h3>{s.top.length ? s.top.map((t: any) => <div key={t.path} className="flex justify-between border-b border-white/5 py-2 text-sm"><span>{t.path}</span><b>{t.n}</b></div>) : <p className="text-sm text-white/40">No traffic yet.</p>}</Card></div></div>
}

function Manager({ col }: { col: string }) {
  const cfg = CFG[col], [rows, setRows] = useState<any[]>([]), [q, setQ] = useState(''), [sf, setSf] = useState(''), [ed, setEd] = useState<any>(null), [media_, setM] = useState<any[]>([]), [error, setError] = useState(''), [loading, setLoading] = useState(true)
  const load = async () => {
    setLoading(true)
    try { setRows(await api(`/admin/${col}?q=${encodeURIComponent(q)}&status=${sf}`)); setError('') }
    catch (x: any) { setError(x.message || `Could not load ${cfg.title.toLowerCase()}.`) }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [col, q, sf]); useEffect(() => { setEd(null); setQ(''); setSf('') }, [col])
  const save = async () => {
    try {
      if (ed.id) await api(`/admin/${col}/${ed.id}`, { method: 'PUT', body: ed })
      else await api(`/admin/${col}`, { method: 'POST', body: { published: true, ...ed } })
      setEd(null)
      await load()
    } catch (x: any) { setError(x.message || 'Could not save changes.') }
  }
  const del = async (id: string) => {
    if (!confirm('Delete permanently?')) return
    try { await api(`/admin/${col}/${id}`, { method: 'DELETE' }); await load() }
    catch (x: any) { setError(x.message || 'Could not delete this item.') }
  }
  const setStatus = async (r: any, status: string) => {
    try { await api(`/admin/${col}/${r.id}`, { method: 'PUT', body: { status } }); await load() }
    catch (x: any) { setError(x.message || 'Could not update this status.') }
  }
  return <div><div className="mb-5 flex flex-wrap gap-3"><input className="inp max-w-xs" placeholder="Search…" value={q} onChange={e => setQ(e.target.value)} />
    {cfg.status && <select className="inp max-w-[180px] bg-panel text-white cursor-pointer" value={sf} onChange={e => setSf(e.target.value)}><option value="" className="bg-panel text-white">All statuses</option>{cfg.status.map(s => <option key={s} value={s} className="bg-panel text-white">{s}</option>)}</select>}
    {!cfg.ro && <button className="btn-p ml-auto" onClick={() => { api('/admin/media').then(setM).catch((x: any) => setError(x.message)); setEd({ published: true }) }}>+ Add</button>}</div>
    {error && <p role="alert" className="mb-4 text-sm text-red-300">{error}</p>}
    <div className="space-y-3">{rows.map(r => <Card key={r.id} className="flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0 flex-1">{cfg.ro ? <><b>{r.name}</b> <span className="text-sm text-white/50">{r.email}</span>{r.service && <p className="text-xs text-lime">{r.service} · {r.budget}</p>}<p className="mt-2 text-sm text-white/70">{r.message}</p><p className="mt-1 text-xs text-white/30">{new Date(r.created).toLocaleString()}</p></>
        : <><b>{r.icon} {r.title || r.name}</b> {r.published === false && <span className="ml-2 rounded bg-yellow-500/20 px-2 text-xs text-yellow-300">hidden</span>}<p className="mt-1 line-clamp-2 text-sm text-white/60">{r.description || r.quote}</p></>}</div>
      <div className="flex items-center gap-2">{cfg.ro ? <select className="inp !w-auto !py-2 bg-panel text-white cursor-pointer" value={r.status} onChange={e => setStatus(r, e.target.value)}>{cfg.status!.map(s => <option key={s} value={s} className="bg-panel text-white">{s}</option>)}</select>
        : <button className="btn-g !py-2" onClick={() => { api('/admin/media').then(setM).catch((x: any) => setError(x.message)); setEd(r) }}>Edit</button>}<button className="btn-g !py-2 text-red-400" onClick={() => del(r.id)}>Delete</button></div></Card>)}
      {loading && <p className="py-10 text-center text-white/40">Loading…</p>}
      {!loading && !rows.length && !error && <p className="py-10 text-center text-white/40">Nothing here yet.</p>}</div>
    {ed && <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-3 backdrop-blur sm:p-4" onClick={() => setEd(null)}><motion.div initial={{ scale: .95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} onClick={e => e.stopPropagation()} className="card max-h-[90vh] w-full max-w-lg space-y-4 overflow-auto bg-panel p-5 sm:p-6">
      <h3 className="font-display text-xl">{ed.id ? 'Edit' : 'New'} {cfg.title.toLowerCase()}</h3>
      {cfg.f.map(f => <label key={f.k} className="block text-sm"><span className="text-white/60">{f.l}</span>
        {f.t === 'bool' ? <input type="checkbox" className="ml-3" checked={ed[f.k] !== false} onChange={e => setEd({ ...ed, [f.k]: e.target.checked })} />
          : f.t === 'area' ? <textarea rows={3} className="inp mt-1" value={ed[f.k] || ''} onChange={e => setEd({ ...ed, [f.k]: e.target.value })} />
          : <input type={f.t === 'num' ? 'number' : 'text'} className="inp mt-1" value={ed[f.k] ?? ''} onChange={e => setEd({ ...ed, [f.k]: f.t === 'num' ? +e.target.value : e.target.value })} />}
        {f.t === 'img' && <div className="mt-2 flex flex-wrap gap-2">{media_.map(m => <img key={m.id} src={media(m.url)} onClick={() => setEd({ ...ed, image: m.url })} className={`h-12 w-12 cursor-pointer rounded object-cover ${ed.image === m.url ? 'ring-2 ring-lime' : ''}`} />)}</div>}</label>)}
      <div className="flex justify-end gap-3"><button className="btn-g" onClick={() => setEd(null)}>Cancel</button><button className="btn-p" onClick={save}>Save</button></div></motion.div></div>}</div>
}

function Content() {
  const [c, setC] = useState<any>(null), [m, setM] = useState(''), [error, setError] = useState('')
  useEffect(() => { api('/admin/content').then(setC).catch((x: any) => setError(x.message || 'Could not load site content.')) }, [])
  if (!c) return error ? <p role="alert" className="text-red-300">{error}</p> : <p>Loading site content…</p>
  const separateFields = new Set(['aboutTitle', 'aboutText', 'contactTitle', 'email', 'phone', 'address'])
  return <Card className="max-w-2xl space-y-4">{Object.keys(c).filter(k => k !== 'quoteBudgets' && !separateFields.has(k)).map(k => <label key={k} className="block text-sm"><span className="text-white/60">{k}</span>{c[k].length > 70 ? <textarea rows={3} className="inp mt-1" value={c[k]} onChange={e => setC({ ...c, [k]: e.target.value })} /> : <input className="inp mt-1" value={c[k]} onChange={e => setC({ ...c, [k]: e.target.value })} />}</label>)}
    <p className="text-xs text-white/40">Leave metrics blank unless you can verify them. Stats use “value|label”; technologies are comma separated.</p>
    {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
    <button className="btn-p" onClick={async () => { try { await api('/admin/content', { method: 'PUT', body: c }); setM('Saved. Live on the website.'); setError('') } catch (x: any) { setError(x.message || 'Could not save site content.') } }}>Save changes</button> <span className="text-sm text-lime">{m}</span></Card>
}

function SectionEditor({ section }: { section: 'about' | 'contact' }) {
  const [content, setContent] = useState<Record<string, string> | null>(null)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const fields = SECTION_FIELDS[section]
  const title = section === 'about' ? 'About section' : 'Contact details'
  useEffect(() => {
    api('/admin/content')
      .then(setContent)
      .catch((x: any) => setError(x.message || `Could not load ${title.toLowerCase()}.`))
  }, [section])
  const save = async () => {
    if (!content) return
    try {
      await api('/admin/content', {
        method: 'PUT',
        body: Object.fromEntries(fields.map(({ k }) => [k, content[k] || ''])),
      })
      setMessage('Saved. Live on the website.')
      setError('')
    } catch (x: any) {
      setError(x.message || `Could not save ${title.toLowerCase()}.`)
    }
  }
  if (!content) return error ? <p role="alert" className="text-red-300">{error}</p> : <p>Loading {title.toLowerCase()}…</p>
  return <Card className="max-w-2xl space-y-4">
    <p className="text-sm text-white/50">Changes here update only the public {section} section.</p>
    {fields.map(({ k, l, t }) => <label key={k} className="block text-sm">
      <span className="text-white/60">{l}</span>
      {t === 'area'
        ? <textarea rows={5} className="inp mt-1" value={content[k] || ''} onChange={event => setContent({ ...content, [k]: event.target.value })} />
        : <input type={k === 'email' ? 'email' : k === 'phone' ? 'tel' : 'text'} className="inp mt-1" value={content[k] || ''} onChange={event => setContent({ ...content, [k]: event.target.value })} />}
    </label>)}
    {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
    <button type="button" className="btn-p" onClick={save}>Save changes</button>
    {message && <p role="status" className="text-sm text-lime">{message}</p>}
  </Card>
}

function QuoteSettings() {
  const [budgets, setBudgets] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  useEffect(() => {
    api('/admin/content').then(content => setBudgets(content.quoteBudgets || '')).catch((x: any) => setError(x.message))
  }, [])
  const save = async () => {
    try {
      await api('/admin/content', { method: 'PUT', body: { quoteBudgets: budgets } })
      setMessage('Budget options saved and live on the quote form.')
      setError('')
    } catch (x: any) {
      setError(x.message)
    }
  }
  return <Card className="max-w-2xl space-y-4">
    <p className="text-sm text-white/60">Enter the budget choices customers can select when requesting a quote. Separate each option with a comma.</p>
    <label className="block text-sm text-white/60">Budget options
      <textarea rows={4} className="inp mt-1" value={budgets} onChange={e => setBudgets(e.target.value)} placeholder="$1k–$5k, $5k–$10k, $10k+" />
    </label>
    {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
    <button className="btn-p" onClick={save}>Save budget options</button>
    {message && <p className="text-sm text-lime">{message}</p>}
  </Card>
}

function Media() {
  const [m, setM] = useState<any[]>([]), load = () => api('/admin/media').then(setM); useEffect(() => { load() }, [])
  return <div><label className="btn-p mb-6 cursor-pointer">Upload image<input type="file" hidden accept="image/*" onChange={async e => { const fd = new FormData(); fd.append('file', e.target.files![0]); try { await api('/admin/media/upload', { method: 'POST', body: fd }); load() } catch (x: any) { alert(x.message) } }} /></label>
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">{m.map(i => <Card key={i.id} className="!p-2"><img src={media(i.url)} className="h-32 w-full rounded-2xl object-cover" /><p className="mt-2 truncate text-xs">{i.title}</p><div className="flex justify-between text-xs"><button className="text-lime" onClick={() => navigator.clipboard.writeText(media(i.url))}>Copy URL</button><button className="text-red-400" onClick={async () => { await api('/admin/media/' + i.id, { method: 'DELETE' }); load() }}>Delete</button></div></Card>)}</div></div>
}

function Notes() {
  const [n, setN] = useState<any[]>([]), load = () => api('/admin/notifications').then(setN); useEffect(() => { load() }, [])
  return <div className="max-w-2xl space-y-3">{n.map(x => <Card key={x.id} className={`flex items-center justify-between ${x.read ? 'opacity-50' : ''}`}><div><b>{x.title}</b><p className="text-sm text-white/60">{x.message}</p><p className="text-xs text-white/30">{new Date(x.created).toLocaleString()}</p></div>
    <div className="flex gap-2">{!x.read && <button className="btn-g !py-1" onClick={async () => { await api('/admin/notifications/' + x.id, { method: 'PUT', body: { read: true } }); load() }}>Mark read</button>}<button className="text-red-400" onClick={async () => { await api('/admin/notifications/' + x.id, { method: 'DELETE' }); load() }}>✕</button></div></Card>)}{!n.length && <p className="text-white/40">No notifications.</p>}</div>
}

function Profile({ me, onSaved }: { me: any; onSaved: (me: any) => void }) {
  const [email, setEmail] = useState(me.email), [name, setName] = useState(me.name), [pw, setPw] = useState(''), [m, setM] = useState('')
  return <Card className="max-w-md space-y-4">{browserOnlyDemo && <p className="text-sm text-yellow-200">Browser-only demo mode. Password changes require the backend.</p>}<label className="block text-sm text-white/60">Admin email<input className="inp mt-1" type="email" value={email} onChange={e => setEmail(e.target.value)} required /></label><label className="block text-sm text-white/60">Name<input className="inp mt-1" value={name} onChange={e => setName(e.target.value)} /></label>{!browserOnlyDemo && <label className="block text-sm text-white/60">New password<input className="inp mt-1" type="password" placeholder="At least 8 characters (optional)" value={pw} onChange={e => setPw(e.target.value)} /></label>}
    <button className="btn-p" onClick={async () => { try { const r = await api('/auth/profile', { method: 'PUT', body: { email, name, password: pw || undefined } }); if (r.token) localStorage.setItem('tp_token', r.token); onSaved({ ...me, email, name }); setM('Saved'); setPw('') } catch (x: any) { setM(x.message) } }}>Save</button> <span className="text-sm text-lime">{m}</span></Card>
}

export default function Admin() {
  const savedSection = localStorage.getItem('tp_admin_section')
  const [ok, setOk] = useState(!!tok()), [v, setV] = useState(() => NAV.some(([key]) => key === savedSection) ? savedSection || 'dashboard' : 'dashboard'), [me, setMe] = useState<any>(null), [open, setOpen] = useState(false), [unread, setU] = useState(0), [adminError, setAdminError] = useState('')
  useEffect(() => { localStorage.setItem('tp_admin_section', v) }, [v])
  useEffect(() => { if (ok) { api('/auth/me').then(setMe).catch(() => setOk(false)); api('/admin/stats').then(s => { setU(s.unread); setAdminError('') }).catch((x: any) => setAdminError(x.message || 'Could not load admin status.')) } }, [ok, v])
  if (!ok) return <Login ok={() => setOk(true)} />; if (!me) return <p className="p-8">{adminError || 'Loading admin…'}</p>
  return <div className="flex min-h-screen bg-ink">
    <aside className={`fixed inset-y-0 z-40 flex flex-col w-[min(18rem,85vw)] border-r border-white/10 bg-panel p-4 sm:p-5 transition-transform md:sticky md:top-0 md:h-screen md:max-h-screen md:w-64 md:translate-x-0 overscroll-contain ${open ? '' : '-translate-x-full'}`}>
      <div className="shrink-0 mb-6 flex items-center justify-between">
        <a href="/" className="font-display text-xl font-bold">AS<span className="text-lime">VORA</span> <span className="text-xs text-white/40">admin</span></a>
        <a href="/" target="_blank" rel="noopener noreferrer" className="rounded-lg bg-white/5 px-2 py-1 text-xs text-white/50 hover:bg-white/10 hover:text-lime transition" title="Open public site">↗ Site</a>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto overscroll-contain pr-1 scrollbar-thin">
        {NAV.map(([k, l]) => <button key={k} onClick={() => { setV(k); setOpen(false); window.scrollTo({ top: 0, behavior: 'smooth' }) }} className={`flex w-full items-center justify-between rounded-xl px-4 py-2.5 text-left text-sm transition ${v === k ? 'bg-brand/20 text-lime font-medium' : 'text-white/60 hover:bg-white/5'}`}>{l}{k === 'notifications' && unread > 0 && <b className="rounded-full bg-lime px-2 text-xs text-black">{unread}</b>}</button>)}
        <button className="mt-6 w-full rounded-xl px-4 py-2.5 text-left text-sm text-red-400 hover:bg-white/5" onClick={() => { localStorage.removeItem('tp_token'); setOk(false) }}>⏻ Logout</button>
      </nav>
    </aside>
    {open && <button aria-label="Close navigation menu" onClick={() => setOpen(false)} className="fixed inset-0 z-30 bg-black/60 md:hidden" />}
    <main className="min-w-0 flex-1 p-4 sm:p-6 md:p-10"><div className="mb-6 flex items-center justify-between gap-3 sm:mb-8"><button aria-label="Open navigation menu" aria-expanded={open} onClick={() => setOpen(!open)} className="grid h-11 w-11 shrink-0 place-items-center text-2xl md:hidden">☰</button><h1 className="min-w-0 flex-1 truncate font-display text-2xl font-bold capitalize sm:text-3xl">{v === 'projects' ? 'Works' : v}</h1><span className="max-w-[8rem] truncate text-right text-xs text-white/50 sm:max-w-none sm:text-sm">{me.name}</span></div>
      {adminError && <p role="alert" className="mb-4 text-sm text-red-300">{adminError}</p>}
      {v === 'dashboard' ? <Dash /> : CFG[v] ? <Manager col={v} /> : v === 'about' || v === 'contact' ? <SectionEditor section={v} /> : v === 'content' ? <Content /> : v === 'quote-settings' ? <QuoteSettings /> : v === 'media' ? <Media /> : v === 'notifications' ? <Notes /> : <Profile me={me} onSaved={setMe} />}</main></div>
}
