// src/components/LicenseModal.jsx
import { useState, useEffect } from 'react'
import { supabase }             from '../lib/supabaseClient'
import { useCart }              from '@/context/CartContext'
import { useLicenseModal }      from '@/context/LicenseModalContext'

export default function LicenseModal() {
  const { isOpen, beat, closeLicenseModal } = useLicenseModal()
  const { addToCart, cart } = useCart()
  const [purchasedIds, setPurchasedIds] = useState([])

  // 1) Load what this user already owns, building "id-license" combos
  useEffect(() => {
    if (!isOpen) return

    ;(async () => {
      const { data: { session }, error: sessErr } = await supabase.auth.getSession()
      if (sessErr) {
        console.error('Session error:', sessErr)
        return
      }
      if (!session) return

      const { data: purchases, error } = await supabase
        .from('purchases')
        .select('beats')
        .eq('user_id', session.user.id)

      if (error) {
        console.error('Error loading purchases:', error)
        return
      }

      const ids = purchases.flatMap(p => {
        let arr = p.beats
        if (typeof arr === 'string') {
          try { arr = JSON.parse(arr) }
          catch { arr = [] }
        }
        return (arr || []).map(item => `${item.id}-${item.license}`)
      })

      setPurchasedIds(ids)
    })()
  }, [isOpen])

  if (!isOpen || !beat) return null

  // 2) Resolve a real numeric ID (fallback to beat.beatId if necessary)
  const rawId = beat.id ?? beat.beatId
  const realId = Number(rawId)
  if (!Number.isInteger(realId)) {
    console.warn('⚠️ LicenseModal got invalid beat id:', rawId, beat)
    return null
  }

  const title    = beat.name   || beat.title   || 'Untitled'
  const coverUrl = beat.cover  || '/images/beats/default-cover.png'

  // 3) Define exactly which files each tier ships
  const licenses = [
    {
      name: 'Basic License',
      price: 24.99,
      terms: 'MP3 | Personal Use',
      mp3:   beat.audiourl || beat.audioUrl,
      wav:   null,
      stems: null,
    },
    {
      name: 'Premium License',
      price: 34.99,
      terms: 'MP3 + WAV',
      mp3:   beat.audiourl || beat.audioUrl,
      wav:   beat.wav   || null,
      stems: null,
    },
    {
      name: 'Premium Plus License',
      price: 49.99,
      terms: 'MP3 + WAV + STEMS',
      mp3:   beat.audiourl || beat.audioUrl,
      wav:   beat.wav   || null,
      stems: beat.stems || null,
    },
    {
      name: 'Unlimited License',
      price: 74.99,
      terms: 'Full Package',
      mp3:   beat.audiourl || beat.audioUrl,
      wav:   beat.wav   || null,
      stems: beat.stems || null,
    },
    {
      name: 'Exclusive License',
      price: null,
      terms: 'Negotiate',
      mp3:   null,
      wav:   null,
      stems: null,
    },
  ]

  function handleClick(lic) {
    const combo = `${realId}-${lic.name}`

    // already own it?
    if (purchasedIds.includes(combo)) return

    // Exclusive is negotiated, not carted. The contact page is gone, so open mail.
    if (lic.name === 'Exclusive License') {
      closeLicenseModal()
      const subject = encodeURIComponent(`Exclusive license — ${title}`)
      window.location.href = `mailto:antonbosspd@gmail.com?subject=${subject}`
      return
    }

    // otherwise add exactly what they paid for
    addToCart({
      beatId:      realId,
      name:        title,
      title:       beat.title || '',
      cover:       coverUrl,
      licenseType: lic.name,
      price:       lic.price || 0,
      audioUrl:    lic.mp3,
      wav:         lic.wav,
      stems:       lic.stems,
    })

    closeLicenseModal()
  }

  return (
    <div
      className="fixed inset-0 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
      style={{ zIndex: 'var(--z-dialog)' }}
    >
      <div className="relative w-full max-w-2xl border border-[var(--fg-20)] bg-black text-white">

        {/* Close */}
        <button
          onClick={closeLicenseModal}
          aria-label="Close"
          className="ab-btn ab-btn-bare absolute right-4 top-4 text-lg"
        >×</button>

        {/* Header */}
        <div className="flex items-center gap-4 border-b border-[var(--fg-10)] p-6">
          <img src={coverUrl} alt="" className="h-14 w-14 object-cover grayscale" />
          <div className="min-w-0">
            <h2 className="ab-label mb-1">Choose license</h2>
            <p className="truncate text-lg">{title}</p>
          </div>
        </div>

        {/* Options */}
        <div className="max-h-[60vh] space-y-3 overflow-y-auto p-6">
          {licenses.map(lic => {
            const combo = `${realId}-${lic.name}`
            const bought = purchasedIds.includes(combo)
            const inCart = cart.some(item => item.id === combo)

            let label, btnClass
            if (bought) {
              label    = 'Purchased'
              btnClass = 'ab-btn'
            } else if (inCart) {
              label    = 'Added'
              btnClass = 'ab-btn ab-btn-active'
            } else if (lic.name === 'Exclusive License') {
              label    = 'Enquire'
              btnClass = 'ab-btn'
            } else {
              label    = `+ $${lic.price.toFixed(2)}`
              btnClass = 'ab-btn ab-btn-solid'
            }

            return (
              <div
                key={lic.name}
                className="ab-card flex items-center justify-between gap-4 p-4"
              >
                <div className="min-w-0">
                  <h4 className="text-sm">{lic.name}</h4>
                  <p className="ab-meta mt-1">{lic.terms}</p>
                </div>
                <button
                  disabled={bought || inCart}
                  onClick={() => handleClick(lic)}
                  className={btnClass}
                >
                  {label}
                </button>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
