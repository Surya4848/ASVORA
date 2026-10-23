import { useCallback, useEffect, useRef, useState } from 'react'
import { motion, useScroll, useSpring, useTransform, AnimatePresence } from 'framer-motion'
import { api, DEFAULT_QUOTE_BUDGETS, media } from './api'

const rv = (i = 0) => ({ initial: { opacity: 0, y: 40 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, margin: '-80px' }, transition: { duration: .7, delay: i * .08, ease: [.2, .7, .2, 1] } })
const Tag = ({ children }: any) => <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs uppercase tracking-widest text-lime"><i className="h-1.5 w-1.5 rounded-full bg-lime" />{children}</span>
const Head = ({ tag, title, sub }: any) => <motion.div {...rv()} className="mx-auto mb-8 max-w-2xl text-center md:mb-10"><Tag>{tag}</Tag><h2 className="mt-4 font-display text-4xl font-bold md:mt-5 md:text-5xl">{title}</h2>{sub && <p className="mt-4 text-white/60">{sub}</p>}</motion.div>
const safeCaseStudyUrl = (value: unknown): value is string =>
  typeof value === 'string' && ((value.startsWith('/') && !value.startsWith('//')) || /^https?:\/\//i.test(value))
const REVIEW_PROMPT_KEY = 'asvora_review_prompt_v1'
const REVIEW_PROMPT_COOLDOWN_MS = 60 * 60 * 1000
type ReviewPromptState = { lastPromptAt: number; submitted: boolean }

function readReviewPromptState(): ReviewPromptState {
  try {
    const value = localStorage.getItem(REVIEW_PROMPT_KEY)
    if (!value) return { lastPromptAt: 0, submitted: false }
    const state = JSON.parse(value)
    return {
      lastPromptAt: Number.isFinite(state.lastPromptAt) ? state.lastPromptAt : 0,
      submitted: state.submitted === true,
    }
  } catch (error) {
    console.error('Could not read review prompt preference:', error)
    return { lastPromptAt: 0, submitted: false }
  }
}

function saveReviewPromptState(state: ReviewPromptState) {
  try {
    localStorage.setItem(REVIEW_PROMPT_KEY, JSON.stringify(state))
  } catch (error) {
    console.error('Could not save review prompt preference:', error)
  }
}

function Spot({ children, className = '' }: any) {
  const r = useRef<HTMLDivElement>(null)
  return <div ref={r} className={`card relative overflow-hidden transition duration-300 hover:-translate-y-1.5 hover:border-brand/50 ${className}`}
    onMouseMove={e => { const b = r.current!.getBoundingClientRect(); r.current!.style.setProperty('--x', e.clientX - b.left + 'px'); r.current!.style.setProperty('--y', e.clientY - b.top + 'px') }}>
    <div className="pointer-events-none absolute inset-0 opacity-0 transition group-hover:opacity-100 hover:opacity-100" style={{ background: 'radial-gradient(300px circle at var(--x) var(--y),#7c5cff30,transparent 60%)', opacity: 1 }} />
    <div className="relative">{children}</div></div>
}

function requestQuote(service: string, setTab: (tab: 'enquiries' | 'quotes') => void, setForm: (form: any) => void) {
  setTab('quotes')
  setForm((current: any) => ({ ...current, service }))
  document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' })
}

function Nav({ c, hasProjects, hasTestimonials }: any) {
  const [s, setS] = useState(false), [o, setO] = useState(false)
  useEffect(() => { const f = () => setS(scrollY > 40); f(); addEventListener('scroll', f); return () => removeEventListener('scroll', f) }, [])
  const links = [
    { id: 'top', label: 'Home' },
    { id: 'services', label: 'Services' },
    { id: 'work', label: 'Works' },
    { id: 'about', label: 'About' },
    ...(hasTestimonials ? [{ id: 'testimonials', label: 'Reviews' }] : []),
    { id: 'contact', label: 'Contact' },
  ]
  return <motion.header initial={{ y: -80 }} animate={{ y: 0 }} className="fixed inset-x-0 top-0 z-50 flex justify-center px-3 pt-3 sm:px-4 sm:pt-4">
    <nav className={`flex w-full max-w-6xl items-center justify-between rounded-full px-4 py-3 sm:px-5 transition-all duration-500 ${s ? 'border border-white/10 bg-ink/70 backdrop-blur-xl' : ''}`}>
      <a href="#top" className="font-display text-xl font-bold tracking-tight">{c.brand || 'ASVORA'}</a>
      <div className="hidden gap-8 md:flex">{links.map(({ id, label }) => <a key={id} href={'#' + id} className="group relative text-sm text-white/70 transition hover:text-white">{label}<span className="absolute -bottom-1 left-0 h-px w-0 bg-lime transition-all group-hover:w-full" /></a>)}</div>
      <a href="#contact" className="btn-p hidden md:inline-flex">Get a quote</a>
      <button aria-label={o ? 'Close menu' : 'Open menu'} aria-expanded={o} aria-controls="mobile-navigation" onClick={() => setO(!o)} className="grid h-11 w-11 place-items-center text-2xl md:hidden">{o ? '✕' : '☰'}</button>
    </nav>
    <AnimatePresence>{o && <motion.div id="mobile-navigation" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="card absolute inset-x-3 top-[4.5rem] flex flex-col gap-1 bg-ink/95 p-4 sm:inset-x-4 md:hidden">
      {links.map(({ id, label }) => <a key={id} href={'#' + id} onClick={() => setO(false)} className="rounded-xl px-3 py-3 hover:bg-white/5">{label}</a>)}</motion.div>}</AnimatePresence></motion.header>
}

function Hero({ c, hasProjects }: any) {
  const { scrollY } = useScroll(), y = useTransform(scrollY, [0, 600], [0, 120])
  const words = (c.heroTitle || '').split(' ')
  return <section id="top" className="relative flex min-h-screen items-center overflow-hidden px-5 pt-28">
    <div className="grid-bg absolute inset-0" />
    <motion.div style={{ y }} className="absolute -left-32 top-20 h-96 w-96 rounded-full bg-brand/40 blur-[120px]" />
    <motion.div style={{ y }} className="absolute -right-20 top-40 h-80 w-80 rounded-full bg-lime/20 blur-[120px]" />
    <div className="relative mx-auto grid w-full max-w-6xl items-center gap-14 lg:grid-cols-2">
      <div>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}><Tag>AS Digital Studio</Tag></motion.div>
        <h1 className="mt-6 font-display text-4xl font-bold leading-[1.05] sm:text-5xl md:text-7xl">
          {words.map((w: string, i: number) => <motion.span key={i} initial={{ opacity: 0, y: 40, filter: 'blur(8px)' }} animate={{ opacity: 1, y: 0, filter: 'blur(0)' }} transition={{ delay: .2 + i * .07, duration: .6 }} className={`mr-3 inline-block ${i > words.length - 3 ? 'grad' : ''}`}>{w}</motion.span>)}
        </h1>
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: .9 }} className="mt-6 max-w-lg text-lg text-white/60">{c.heroSub}</motion.p>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.1 }} className="mt-9 flex flex-wrap gap-4">
          <a href="#contact" className="btn-p">Start your project →</a>{hasProjects && <a href="#work" className="btn-g">View our work</a>}</motion.div>
      </div>
      <motion.div initial={{ opacity: 0, scale: .9, rotate: 3 }} animate={{ opacity: 1, scale: 1, rotate: 0 }} transition={{ delay: .5, duration: .9 }} className="relative animate-float">
        <div className="card space-y-4 bg-panel/80 p-6 shadow-2xl shadow-brand/20">
          <div className="flex gap-1.5"><i className="h-3 w-3 rounded-full bg-red-400" /><i className="h-3 w-3 rounded-full bg-yellow-400" /><i className="h-3 w-3 rounded-full bg-lime" /></div>
          <div className="grid min-h-36 grid-cols-3 items-center gap-3">{[['💻', 'Web'], ['🎬', 'Video'], ['✍️', 'Content']].map(([icon, label]) => <div key={label} className="rounded-2xl bg-white/5 p-4 text-center"><span className="text-3xl">{icon}</span><span className="mt-2 block text-xs text-white/60">{label}</span></div>)}</div>
        </div>
      </motion.div></div></section>
}

function Counter({ v }: { v: string }) {
  const [n, l] = v.split('|'), m = n.match(/^([\d.]+)(.*)$/), [val, setVal] = useState(0), ref = useRef<HTMLDivElement>(null)
  useEffect(() => { if (!m) return; const t = parseFloat(m[1]); const io = new IntersectionObserver(([e]) => { if (!e.isIntersecting) return; io.disconnect(); const s = performance.now(); const f = (x: number) => { const p = Math.min((x - s) / 1600, 1); setVal(t * (1 - Math.pow(1 - p, 3))); p < 1 && requestAnimationFrame(f) }; requestAnimationFrame(f) }); io.observe(ref.current!); return () => io.disconnect() }, [v])
  return <div ref={ref} className="text-center"><b className="grad font-display text-4xl md:text-5xl">{m ? (m[1].includes('.') ? val.toFixed(1) : Math.round(val)) + m[2] : n}</b><p className="mt-1 text-sm text-white/50">{l}</p></div>
}

export default function Public() {
  const [d, setD] = useState<any>(null), [t, setT] = useState(0), [loadError, setLoadError] = useState('')
  const [tab, setTab] = useState<'enquiries' | 'quotes'>('enquiries'), [f, setF] = useState<any>({}), [st, setSt] = useState('')
  const [reviewOpen, setReviewOpen] = useState(false), [reviewRating, setReviewRating] = useState(0)
  const [reviewName, setReviewName] = useState(''), [reviewText, setReviewText] = useState('')
  const [reviewStatus, setReviewStatus] = useState(''), [reviewSending, setReviewSending] = useState(false)
  const reviewPromptShown = useRef(false), reviewCooldownUntil = useRef(0), reviewSubmitted = useRef(false)
  const { scrollYProgress } = useScroll(), sx = useSpring(scrollYProgress)
  const loadPublic = useCallback(() => {
    setLoadError('')
    api('/public').then(setD).catch((error: any) => {
      setD(null)
      setLoadError(error.message || 'Could not load the portfolio.')
    })
  }, [])
  useEffect(() => {
    void loadPublic()
    api('/track', { method: 'POST', body: { path: '/' } }).catch((error: any) => console.error('Visit tracking failed:', error))
    if (typeof BroadcastChannel === 'undefined') return
    const channel = new BroadcastChannel('tp_public_update')
    const refresh = () => { void loadPublic() }
    channel.addEventListener('message', refresh)
    return () => {
      channel.close()
    }
  }, [loadPublic])
  useEffect(() => {
    if (!d) return
    const key = 'tp_public_scroll'
    const saved = sessionStorage.getItem(key)
    if (saved !== null) {
      requestAnimationFrame(() => window.scrollTo(0, Number(saved)))
    } else if (window.location.hash) {
      document.getElementById(decodeURIComponent(window.location.hash.slice(1)))?.scrollIntoView()
    }
    const remember = () => sessionStorage.setItem(key, String(window.scrollY))
    window.addEventListener('scroll', remember, { passive: true })
    return () => window.removeEventListener('scroll', remember)
  }, [d])
  useEffect(() => {
    if (!d) return
    let lastY = window.scrollY
    let userScrollIntent = false
    const allowPrompt = () => { userScrollIntent = true }
    const allowKeyboardScroll = (event: KeyboardEvent) => {
      if (['ArrowDown', 'PageDown', ' ', 'End'].includes(event.key)) allowPrompt()
    }
    const checkBottom = () => {
      const currentY = window.scrollY
      const scrolledDown = currentY > lastY
      lastY = currentY
      if (!userScrollIntent || !scrolledDown || reviewPromptShown.current || reviewSubmitted.current) return
      if (currentY + window.innerHeight < document.documentElement.scrollHeight - 8) return
      const state = readReviewPromptState()
      reviewSubmitted.current = state.submitted
      reviewCooldownUntil.current = state.lastPromptAt + REVIEW_PROMPT_COOLDOWN_MS
      if (state.submitted || Date.now() < reviewCooldownUntil.current) return
      state.lastPromptAt = Date.now()
      reviewCooldownUntil.current = state.lastPromptAt + REVIEW_PROMPT_COOLDOWN_MS
      saveReviewPromptState(state)
      reviewPromptShown.current = true
      setReviewRating(0)
      setReviewStatus('')
      setReviewOpen(true)
    }
    window.addEventListener('wheel', allowPrompt, { passive: true })
    window.addEventListener('touchmove', allowPrompt, { passive: true })
    window.addEventListener('keydown', allowKeyboardScroll)
    window.addEventListener('scroll', checkBottom, { passive: true })
    return () => {
      window.removeEventListener('wheel', allowPrompt)
      window.removeEventListener('touchmove', allowPrompt)
      window.removeEventListener('keydown', allowKeyboardScroll)
      window.removeEventListener('scroll', checkBottom)
    }
  }, [d])
  useEffect(() => {
    if (!reviewOpen) return
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') dismissReview() }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [reviewOpen])
  useEffect(() => { const i = setInterval(() => setT(x => x + 1), 5000); return () => clearInterval(i) }, [])
  if (!d) return <main className="grid min-h-screen place-items-center px-5 text-center">
    <div><p className="font-display text-2xl">{loadError ? 'Portfolio unavailable' : 'ASVORA'}</p>
      {loadError ? <><p role="alert" className="mt-3 text-sm text-red-300">{loadError}</p><button className="btn-g mt-5" onClick={loadPublic}>Try again</button></> : <p className="mt-3 text-sm text-white/50">Loading portfolio…</p>}</div>
  </main>
  const c = d.content, T = d.testimonials, cur = T.length ? T[t % T.length] : null
  const submit = async (e: any) => { e.preventDefault(); setSt('sending'); try { await api('/' + tab, { method: 'POST', body: f }); setSt('ok'); setF({}) } catch (x: any) { setSt(x.message) } }
  const submitReview = async (e: any) => {
    e.preventDefault()
    if (!reviewRating) {
      setReviewStatus('Please select a star rating.')
      return
    }
    setReviewSending(true)
    setReviewStatus('')
    try {
      await api('/reviews', { method: 'POST', body: { name: reviewName, rating: reviewRating, quote: reviewText } })
      reviewSubmitted.current = true
      saveReviewPromptState({ lastPromptAt: reviewCooldownUntil.current - REVIEW_PROMPT_COOLDOWN_MS, submitted: true })
      setReviewStatus('Thank you! Your review was sent for approval.')
    } catch (error: any) {
      setReviewStatus(error.message || 'Could not submit your review. Please try again.')
    } finally {
      setReviewSending(false)
    }
  }
  const dismissReview = () => {
    reviewPromptShown.current = false
    setReviewOpen(false)
  }
  return <div>
    <motion.div style={{ scaleX: sx }} className="fixed inset-x-0 top-0 z-[60] h-0.5 origin-left bg-gradient-to-r from-lime to-brand" />
    <Nav c={c} hasTestimonials={T.length > 0} /><Hero c={c} hasProjects />
    {c.technologies && <div className="overflow-hidden border-y border-white/10 py-5"><div className="flex w-max animate-marquee gap-12 text-white/40">{[...c.technologies.split(','), ...c.technologies.split(',')].map((x: string, i: number) => <span key={i} className="font-display text-xl">{x} <b className="text-lime">✦</b></span>)}</div></div>}
    {[1, 2, 3, 4].some(i => c['stat' + i]) && <section className="mx-auto grid max-w-6xl grid-cols-2 gap-x-4 gap-y-8 px-4 py-10 sm:px-5 sm:py-14 md:grid-cols-4 md:gap-10 md:py-20">{[1, 2, 3, 4].map(i => c['stat' + i] && <Counter key={i} v={c['stat' + i]} />)}</section>}

    <section id="services" className="mx-auto max-w-6xl px-4 py-8 sm:px-5 sm:py-10 md:py-14"><Head tag="Services" title="Creative services for your brand" sub="Web development, video editing, and content creation for your online presence." />
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">{d.services.map((s: any, i: number) => <motion.div key={s.id} {...rv(i)}><Spot className="h-full p-5 sm:p-7"><div className="mb-5 grid h-12 w-12 place-items-center rounded-2xl bg-brand/20 text-2xl text-lime">{s.icon}</div><h3 className="font-display text-xl font-semibold">{s.title}</h3><p className="mt-2 text-sm leading-relaxed text-white/60">{s.description}</p><button type="button" className="btn-g mt-5 !px-4 !py-2 text-xs" onClick={() => requestQuote(s.title, setTab, setF)}>Request a quote</button></Spot></motion.div>)}</div></section>

    <section id="work" className="mx-auto max-w-6xl px-4 py-8 sm:px-5 sm:py-10 md:py-14"><Head tag="Selected projects" title="Work that speaks for itself" />
      {d.projects.length > 0
        ? <div className="grid gap-6 md:grid-cols-2">{d.projects.map((p: any, i: number) => <motion.article key={p.id} {...rv(i)} className="group card overflow-hidden">
        <div className="relative h-48 overflow-hidden sm:h-56" style={{ background: `linear-gradient(135deg,hsl(${(i * 70 + 250) % 360} 70% 35%),#07080c)` }}>
          {p.image && <img src={media(p.image)} alt={p.title} className="h-full w-full object-cover transition duration-700 group-hover:scale-110" />}
          <span className="absolute left-4 top-4 rounded-full bg-black/50 px-3 py-1 text-xs backdrop-blur">{p.category}</span></div>
        <div className="p-5 sm:p-6"><div className="flex flex-col items-start gap-2 sm:flex-row sm:justify-between sm:gap-3"><h3 className="font-display text-xl font-semibold sm:text-2xl">{p.title}</h3><span className="max-w-full break-words rounded-full bg-lime/15 px-3 py-1 text-xs font-semibold text-lime">{p.result}</span></div>
          <p className="mt-2 text-sm text-white/60">{p.description}</p>{safeCaseStudyUrl(p.caseStudyUrl) && <a href={p.caseStudyUrl} target={p.caseStudyUrl.startsWith('/') ? undefined : '_blank'} rel="noopener noreferrer" className="mt-4 inline-block text-sm text-lime transition hover:translate-x-1">Read case study →</a>}</div></motion.article>)}</div>
        : <p className="text-center text-white/60">Our projects will be showcased here soon.</p>}
    </section>

    <section id="about" className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-8 sm:px-5 sm:py-10 md:py-14 lg:grid-cols-2">
      <motion.div {...rv()}><Tag>About {c.brand || 'ASVORA'}</Tag><h2 className="mt-5 font-display text-3xl font-bold sm:text-4xl md:text-5xl">{c.aboutTitle || 'Creative digital work. Made for your business.'}</h2><p className="mt-5 leading-relaxed text-white/60">{c.aboutText}</p>
        <ul className="mt-6 space-y-3 text-sm">{['Web development', 'Creative video editing', 'Engaging content creation'].map(x => <li key={x} className="flex gap-3"><b className="text-lime">✓</b>{x}</li>)}</ul></motion.div>
      <motion.div {...rv(1)} className="grid grid-cols-2 gap-3 sm:gap-4">{['Discover', 'Create', 'Build', 'Grow'].map((x, i) => <Spot key={x} className="p-4 sm:p-6"><b className="font-display text-3xl text-brand">0{i + 1}</b><p className="mt-3 font-display text-lg">{x}</p></Spot>)}</motion.div></section>

    {T.length > 0 && <section id="testimonials" className="mx-auto max-w-4xl px-4 py-8 sm:px-5 sm:py-10 md:py-14"><Head tag="Testimonials" title="What clients say" />
      {cur && <div className="card relative min-h-[260px] p-5 text-center sm:p-8 md:p-12"><AnimatePresence mode="wait"><motion.div key={cur.id} initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }}>
        <div className="text-lime">{'★'.repeat(cur.rating || 5)}</div><p className="mt-4 font-display text-xl leading-relaxed md:text-2xl">“{cur.quote}”</p><b className="mt-6 block">{cur.name}</b><span className="text-sm text-white/50">{cur.role}</span></motion.div></AnimatePresence>
        <div className="mt-6 flex justify-center gap-2">{T.map((_: any, i: number) => <button aria-label={'testimonial ' + (i + 1)} key={i} onClick={() => setT(i)} className={`h-2 rounded-full transition-all ${i === t % T.length ? 'w-8 bg-lime' : 'w-2 bg-white/20'}`} />)}</div></div>}</section>}

    <section className="px-4 py-8 sm:px-5 sm:py-10"><motion.div {...rv()} className="relative mx-auto max-w-6xl overflow-hidden rounded-[2rem] bg-gradient-to-br from-brand to-indigo-900 p-6 text-center sm:p-10 md:p-16">
      <div className="absolute -right-10 -top-10 h-60 w-60 rounded-full bg-lime/30 blur-3xl" /><h2 className="relative font-display text-4xl font-bold md:text-5xl">{c.ctaText}</h2>
      <a href="#contact" className="btn-p relative mt-8">Start a conversation</a></motion.div></section>

    <section id="contact" className="mx-auto grid max-w-6xl gap-10 px-4 py-8 sm:px-5 sm:py-10 md:py-14 lg:grid-cols-2">
      <motion.div {...rv()}><Tag>Contact</Tag><h2 className="mt-5 font-display text-3xl font-bold sm:text-4xl md:text-5xl">{c.contactTitle || 'Let us talk about your project'}</h2>
        <div className="mt-8 space-y-4 text-white/70">{c.email && <p>✉ <a href={`mailto:${c.email}`} className="hover:text-lime">{c.email}</a></p>}{c.phone && <p>☎ <a href={`tel:${c.phone.replace(/[^\d+]/g, '')}`} className="hover:text-lime">{c.phone}</a></p>}{c.address && <p>⌖ {c.address}</p>}</div></motion.div>
      <motion.form {...rv(1)} onSubmit={submit} className="card space-y-4 p-5 sm:p-7">
        <div className="flex rounded-full bg-white/5 p-1 text-sm">{(['enquiries', 'quotes'] as const).map(k => <button type="button" key={k} onClick={() => setTab(k)} className={`flex-1 rounded-full py-2 transition ${tab === k ? 'bg-lime font-semibold text-black' : ''}`}>{k === 'quotes' ? 'Request a quote' : 'General enquiry'}</button>)}</div>
        <div className="grid gap-4 sm:grid-cols-2"><input required className="inp" placeholder="Name" value={f.name || ''} onChange={e => setF({ ...f, name: e.target.value })} /><input required type="email" className="inp" placeholder="Email" value={f.email || ''} onChange={e => setF({ ...f, email: e.target.value })} /></div>
        {tab === 'quotes' && <div className="grid gap-4 sm:grid-cols-2"><select className="inp" value={f.service || ''} onChange={e => setF({ ...f, service: e.target.value })}><option value="">Service</option>{d.services.map((s: any) => <option key={s.id}>{s.title}</option>)}</select>
          <select className="inp" value={f.budget || ''} onChange={e => setF({ ...f, budget: e.target.value })}><option value="">Budget</option>{(c.quoteBudgets || DEFAULT_QUOTE_BUDGETS.join(',')).split(',').map((b: string) => b.trim()).filter(Boolean).map((b: string) => <option key={b}>{b}</option>)}</select></div>}
        <textarea required rows={4} className="inp" placeholder="Tell us about your project" value={f.message || ''} onChange={e => setF({ ...f, message: e.target.value })} />
        <button className="btn-p w-full" disabled={st === 'sending'}>{st === 'sending' ? 'Sending…' : 'Send message'}</button>
        {st === 'ok' && <p className="text-center text-sm text-lime">Thank you. Your message was sent.</p>}{st && !['ok', 'sending'].includes(st) && <p className="text-center text-sm text-red-400">{st}</p>}
      </motion.form></section>

    <footer className="border-t border-white/10 px-4 py-10 sm:px-5 sm:py-14"><div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-5 text-center sm:flex-row sm:text-left">
      <div><a href="#top" className="font-display text-2xl font-bold">{c.brand || 'ASVORA'}</a><p className="mt-2 text-sm text-white/50">Digital solutions for your business.</p></div>
      <p className="text-xs text-white/40">© {new Date().getFullYear()} {c.brand || 'ASVORA'}. All rights reserved.</p></div></footer>
    <AnimatePresence>{reviewOpen && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={dismissReview} className="fixed inset-0 z-[70] grid place-items-center bg-black/75 p-4 backdrop-blur-sm">
      <motion.section role="dialog" aria-modal="true" aria-labelledby="review-dialog-title" initial={{ opacity: 0, y: 20, scale: .97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 12 }} onClick={event => event.stopPropagation()} className="card relative w-full max-w-md space-y-5 bg-panel p-6 sm:p-8">
        <button type="button" aria-label="Close review prompt" onClick={dismissReview} className="absolute right-4 top-4 rounded-full px-3 py-1 text-white/60 hover:bg-white/10 hover:text-white">✕</button>
        <div><Tag>ASVORA</Tag><h2 id="review-dialog-title" className="mt-4 font-display text-2xl font-bold">How was your experience?</h2><p className="mt-2 text-sm text-white/60">Leave a star rating for AS Digital Studio.</p></div>
        {reviewStatus.startsWith('Thank you!') ? <div role="status"><p className="text-lime">{reviewStatus}</p><p className="mt-2 text-sm text-white/50">Your review will appear after it is approved.</p><button type="button" className="btn-p mt-5" onClick={dismissReview}>Done</button></div> : <form onSubmit={submitReview} className="space-y-4">
          <div><span className="sr-only">Choose a rating</span><div className="flex gap-2" role="group" aria-label="Star rating">
            {[1, 2, 3, 4, 5].map(star => <button key={star} type="button" aria-label={`${star} ${star === 1 ? 'star' : 'stars'}`} aria-pressed={reviewRating === star} onClick={() => setReviewRating(star)} className={`text-4xl transition hover:scale-110 ${reviewRating >= star ? 'text-yellow-300' : 'text-white/25'}`}>★</button>)}
          </div></div>
          <label className="block text-sm text-white/60">Your name<input required maxLength={120} className="inp mt-1" value={reviewName} onChange={event => setReviewName(event.target.value)} /></label>
          <label className="block text-sm text-white/60">Your review <span className="text-white/40">(optional)</span><textarea maxLength={3000} rows={3} className="inp mt-1" value={reviewText} onChange={event => setReviewText(event.target.value)} /></label>
          <p className="text-xs text-white/40">Reviews are checked before they appear publicly. This prompt will not return after you submit.</p>
          {reviewStatus && <p role="alert" className="text-sm text-red-300">{reviewStatus}</p>}
          <button className="btn-p w-full" disabled={reviewSending || !reviewRating}>{reviewSending ? 'Sending…' : 'Submit review'}</button>
        </form>}
      </motion.section>
    </motion.div>}</AnimatePresence>
  </div>
}
