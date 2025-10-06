// src/components/LicenseModal.jsx
import { useState, useEffect } from 'react'
import { useRouter }            from 'next/router'
import { supabase }             from '../lib/supabaseClient'
import { useCart }              from '@/context/CartContext'
import { useLicenseModal }      from '@/context/LicenseModalContext'

export default function LicenseModal() {
  const router    = useRouter()
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

    // exclusive → contact
    if (lic.name === 'Exclusive License') {
      closeLicenseModal()
      router.push('/contact')
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
    <div className="fixed inset-0 bg-black bg-opacity-70 z-[9999] flex items-center justify-center p-4">
      <div className="relative bg-gray-900 text-white rounded-lg w-full max-w-2xl overflow-hidden">

        {/* Close */}
        <button
          onClick={closeLicenseModal}
          className="absolute top-4 right-4 text-2xl hover:text-pink-400"
        >✕</button>

        {/* Header */}
        <div className="flex items-center gap-3 bg-gray-800 p-4">
          <img src={coverUrl} alt={title} className="w-16 h-16 rounded object-cover" />
          <h2 className="text-2xl font-bold">{title} — Choose License</h2>
        </div>

        {/* Options */}
        <div className="p-4 space-y-3">
          {licenses.map(lic => {
            const combo = `${realId}-${lic.name}`
            const bought = purchasedIds.includes(combo)
            const inCart = cart.some(item => item.id === combo)

            let label, btnClass
            if (bought) {
              label    = 'Purchased'
              btnClass = 'bg-gray-600 text-gray-300 cursor-not-allowed'
            } else if (inCart) {
              label    = 'Added'
              btnClass = 'bg-gray-600 text-gray-300 cursor-not-allowed'
            } else if (lic.name === 'Exclusive License') {
              label    = 'Contact'
              btnClass = 'border-2 border-pink-300 text-pink-300 hover:bg-pink-500 hover:text-white'
            } else {
              label    = `+ $${lic.price.toFixed(2)}`
              btnClass = 'bg-pink-300 text-black hover:bg-pink-500'
            }

            return (
              <div
                key={lic.name}
                className="flex justify-between items-center bg-gray-800 rounded p-4"
              >
                <div>
                  <h4 className="font-semibold">{lic.name}</h4>
                  <p className="text-sm text-gray-400">{lic.terms}</p>
                </div>
                <button
                  disabled={bought || inCart}
                  onClick={() => handleClick(lic)}
                  className={`${btnClass} px-4 py-2 rounded font-semibold transition`}
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
