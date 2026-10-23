import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import Public from './Public'
import Admin from './Admin'
import './index.css'
const Page = ({ children }: any) => <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: .5 }}>{children}</motion.div>
function App() {
  const l = useLocation()
  return <AnimatePresence mode="wait"><Routes location={l} key={l.pathname.startsWith('/admin') ? 'a' : 'p'}>
    <Route path="/admin/*" element={<Page><Admin /></Page>} /><Route path="*" element={<Page><Public /></Page>} /></Routes></AnimatePresence>
}
createRoot(document.getElementById('root')!).render(<BrowserRouter><App /></BrowserRouter>)
