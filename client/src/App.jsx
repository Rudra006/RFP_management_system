import React, { useEffect, useState } from 'react'
import api from './api'
import { Toaster, toast } from 'react-hot-toast'

function RfpCreate({ onCreated }) {
  const [text, setText] = useState('I need to procure laptops and monitors for our new office. Budget is $50,000 total. Need delivery within 30 days. We need 20 laptops with 16GB RAM and 15 monitors 27-inch. Payment terms should be net 30, and we need at least 1 year warranty.')
  const [loading, setLoading] = useState(false)
  const create = async () => {
    setLoading(true)
    try {
      const r = await api.post('/rfps/ai', { text })
      onCreated(r)
    } finally {
      setLoading(false)
    }
  }
  return (
    <div className="card">
      <div className="card-header">Create RFP (AI)</div>
      <div className="card-body space-y-3">
        <textarea rows={6} className="w-full input min-h-32" value={text} onChange={e=>setText(e.target.value)} />
        <button className="btn btn-primary" onClick={create} disabled={loading}>{loading?'Creating...':'Create RFP'}</button>
      </div>
    </div>
  )
}

function Vendors() {
  const [vendors, setVendors] = useState([])
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [adding, setAdding] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const load = async () => setVendors(await api.get('/vendors'))
  useEffect(()=>{ load() }, [])
  const add = async () => {
    if (!name || !email) return toast.error('Name and email required')
    setAdding(true)
    try {
      await api.post('/vendors', { name, email })
      setName(''); setEmail('');
      await load()
      toast.success('Vendor added')
    } catch (e) {
      toast.error('Failed to add vendor')
    } finally {
      setAdding(false)
    }
  }
  const del = async id => {
    setDeletingId(id)
    try {
      await api.del(`/vendors/${id}`)
      await load()
      toast.success('Vendor deleted')
    } catch (e) {
      toast.error('Failed to delete vendor')
    } finally {
      setDeletingId(null)
    }
  }
  return (
    <div className="space-y-4">
      <div className="card">
        <div className="card-header">Add Vendor</div>
        <div className="card-body">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input className="input" placeholder='Name' value={name} onChange={e=>setName(e.target.value)} />
            <input className="input" placeholder='Email' value={email} onChange={e=>setEmail(e.target.value)} />
            <button className="btn btn-primary disabled:opacity-60" onClick={add} disabled={adding}>{adding?'Adding…':'Add'}</button>
          </div>
        </div>
      </div>
      <div className="card">
        <div className="card-header">Vendors</div>
        <div className="card-body">
          <ul className="divide-y divide-slate-200">
            {vendors.map(v=> (
              <li key={v._id} className="py-3 flex items-center justify-between">
                <span className="font-medium">{v.name}</span>
                <span className="text-sm text-slate-500">{v.email}</span>
                <button className="btn btn-secondary disabled:opacity-60" onClick={()=>del(v._id)} disabled={deletingId===v._id}>{deletingId===v._id?'Deleting…':'Delete'}</button>
              </li>
            ))}
            {vendors.length===0 && <div className="text-sm text-slate-500">No vendors yet.</div>}
          </ul>
        </div>
      </div>
    </div>
  )
}

function RfpList({ onOpen }) {
  const [rfps, setRfps] = useState([])
  useEffect(()=>{ api.get('/rfps').then(setRfps) }, [])
  return (
    <div className="card">
      <div className="card-header">RFPs</div>
      <div className="card-body">
        <ul className="divide-y divide-slate-200">
          {rfps.map(r=> (
            <li key={r._id} className="py-3 flex items-center justify-between">
              <button className="text-blue-600 hover:underline font-medium" onClick={()=>onOpen(r._id)}>{r.title}</button>
              <span className="text-xs uppercase tracking-wide px-2 py-1 rounded bg-slate-100 text-slate-700">{r.status}</span>
            </li>
          ))}
          {rfps.length===0 && <div className="text-sm text-slate-500">No RFPs yet.</div>}
        </ul>
      </div>
    </div>
  )
}

function RfpDetail({ rfpId }) {
  const [data, setData] = useState(null)
  const [allVendors, setAllVendors] = useState([])
  const [selected, setSelected] = useState([])
  const [savingVendors, setSavingVendors] = useState(false)
  const [sending, setSending] = useState(false)
  const [fetching, setFetching] = useState(false)
  const [comparing, setComparing] = useState(false)
  const [compareOpen, setCompareOpen] = useState(false)
  const [compareData, setCompareData] = useState(null)
  const load = async () => {
    const d = await api.get(`/rfps/${rfpId}`)
    setData(d); setSelected(d.rfp.vendorIds?.map(v=>v._id)||[])
  }
  useEffect(()=>{ load(); api.get('/vendors').then(setAllVendors) }, [rfpId])
  const saveVendors = async () => {
    setSavingVendors(true)
    try {
      await api.patch(`/rfps/${rfpId}/vendors`, { vendorIds: selected })
      await load()
      toast.success('Vendors saved')
    } catch (e) {
      toast.error('Failed to save vendors')
    } finally { setSavingVendors(false) }
  }
  const send = async () => {
    setSending(true)
    try {
      await api.post(`/rfps/${rfpId}/send`)
      await load()
      toast.success('RFP emails sent')
    } catch (e) {
      toast.error('Failed to send emails')
    } finally { setSending(false) }
  }
  const fetchEmails = async () => {
    setFetching(true)
    try {
      const r = await api.post(`/email/fetch/${rfpId}`)
      await load()
      toast.success(`Fetched ${r.count} proposals`)
    } catch (e) {
      toast.error('Failed to fetch emails')
    } finally { setFetching(false) }
  }
  const compare = async () => {
    setComparing(true)
    try {
      const res = await api.get(`/compare/${rfpId}`)
      setCompareData(res)
      setCompareOpen(true)
    } catch (e) {
      toast.error('Failed to compare proposals')
    } finally { setComparing(false) }
  }
  if (!data) return null
  const { rfp, proposals } = data
  return (
    <div className="space-y-6">
      <div className="card">
        <div className="card-header">RFP Detail</div>
        <div className="card-body grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <div className="text-sm text-slate-500">Title</div>
            <div className="font-semibold">{rfp.title}</div>
          </div>
          <div>
            <div className="text-sm text-slate-500">Budget</div>
            <div className="font-semibold">{rfp.budget}</div>
          </div>
          <div>
            <div className="text-sm text-slate-500">Delivery</div>
            <div className="font-semibold">{rfp.delivery_timeline}</div>
          </div>
          <div>
            <div className="text-sm text-slate-500">Payment Terms</div>
            <div className="font-semibold">{rfp.payment_terms}</div>
          </div>
          <div>
            <div className="text-sm text-slate-500">Warranty</div>
            <div className="font-semibold">{rfp.warranty}</div>
          </div>
          <div className="sm:col-span-2">
            <div className="text-sm text-slate-500">Items</div>
            <ul className="mt-1 text-sm list-disc list-inside">
              {(rfp.items||[]).map((i,idx)=>(<li key={idx}>{i.name} x{i.quantity} {i.specs}</li>))}
            </ul>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">Vendors</div>
        <div className="card-body space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {allVendors.map(v=> (
              <label key={v._id} className="flex items-center gap-2 p-2 border border-slate-200 rounded-md">
                <input type='checkbox' className="h-4 w-4" checked={selected.includes(v._id)} onChange={e=>{
                  setSelected(s=> e.target.checked? [...s, v._id] : s.filter(x=>x!==v._id))
                }} /> <span className="font-medium">{v.name}</span> <span className="text-sm text-slate-500">({v.email})</span>
              </label>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <button className="btn btn-secondary disabled:opacity-60" onClick={saveVendors} disabled={savingVendors}>{savingVendors?'Saving…':'Save Vendors'}</button>
            <button className="btn btn-primary disabled:opacity-60" onClick={send} disabled={sending || rfp.status==='sent'}>{sending?'Sending…':'Send RFP Emails'}</button>
            <button className="btn btn-secondary disabled:opacity-60" onClick={fetchEmails} disabled={fetching}>{fetching?'Fetching…':'Fetch Vendor Emails'}</button>
            <button className="btn btn-primary disabled:opacity-60" onClick={compare} disabled={comparing}>{comparing?'Comparing…':'AI Compare'}</button>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">Proposals</div>
        <div className="card-body">
          <ul className="grid gap-3">
            {(proposals||[]).map(p=> (
              <li key={p._id} className="p-3 rounded-lg border border-slate-200">
                <div className="flex items-center justify-between">
                  <div className="font-semibold">{p.vendorId?.name}</div>
                  <div className="text-sm text-slate-600">Total: <span className="font-semibold">{p.totalPrice}</span></div>
                </div>
                {p.aiSummary && <div className="mt-2 text-sm text-slate-700">{p.aiSummary}</div>}
              </li>
            ))}
            {(!proposals || proposals.length===0) && <div className="text-sm text-slate-500">No proposals yet.</div>}
          </ul>
        </div>
      </div>

      {compareOpen && compareData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={()=>setCompareOpen(false)}>
          <div className="card max-w-2xl w-full" onClick={e=>e.stopPropagation()}>
            <div className="card-header flex items-center justify-between">
              <span>AI Comparison</span>
              <button className="btn btn-secondary" onClick={()=>setCompareOpen(false)}>Close</button>
            </div>
            <div className="card-body space-y-4">
              <div>
                <div className="section-title">Recommendation</div>
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-md text-blue-900 text-sm">{compareData.recommendation}</div>
              </div>
              <div>
                <div className="section-title">Ranked Vendors</div>
                <ul className="divide-y divide-slate-200">
                  {(compareData.ranked||[]).map((r,idx)=> (
                    <li key={idx} className="py-3 flex flex-col gap-1">
                      <div className="flex items-center justify-between">
                        <div className="font-semibold">{idx+1}. {r.vendorName}</div>
                        <div className="text-sm text-slate-600">Score: <span className="font-semibold">{r.score}</span></div>
                      </div>
                      <div className="text-sm text-slate-700">Total: {r.totalPrice}</div>
                      {r.summary && <div className="text-sm text-slate-600">{r.summary}</div>}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function App() {
  const [page, setPage] = useState('home')
  const [openRfpId, setOpenRfpId] = useState(null)
  return (
    <div className="min-h-screen">
      <header className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-semibold">AI RFP Manager</h1>
          <nav className="flex gap-2">
            <button className={`btn ${page==='home'?'bg-white text-blue-700':'btn-secondary bg-white/20 text-white hover:bg-white/30'}`} onClick={()=>{setPage('home'); setOpenRfpId(null)}}>Home</button>
            <button className={`btn ${page==='vendors'?'bg-white text-blue-700':'btn-secondary bg-white/20 text-white hover:bg-white/30'}`} onClick={()=>setPage('vendors')}>Vendors</button>
          </nav>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {page==='home' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <RfpCreate onCreated={(r)=>{ setOpenRfpId(r._id); setPage('detail') }} />
            <RfpList onOpen={(id)=>{ setOpenRfpId(id); setPage('detail') }} />
          </div>
        )}
        {page==='vendors' && <Vendors/>}
        {page==='detail' && openRfpId && <RfpDetail rfpId={openRfpId} />}
      </main>
      <Toaster position="top-right" />
    </div>
  )
}
