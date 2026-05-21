import React, { useState } from 'react'

// ===========================================================================
// PLACEHOLDER COMPONENT — replace this whole file with your real
// profile_recommender__7_.jsx (keep a `export default` at the bottom).
//
// It's wired to call the serverless Claude proxy at /api/recommend so you can
// see the full local -> Vercel pattern working end to end. If your real
// component already calls Claude some other way, switch it to fetch
// '/api/recommend' the same way and the key stays safe on the server.
// ===========================================================================

const TP = {
  slate: '#4B4C6A',
  pink: '#FF0082',
  turquoise: '#00AF9B',
  bg: '#F6F7FB',
}

export default function ProfileRecommender() {
  const [profile, setProfile] = useState('')
  const [result, setResult] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function getRecommendations() {
    setLoading(true)
    setError('')
    setResult('')
    try {
      const res = await fetch('/api/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile }),
      })
      if (!res.ok) {
        const detail = await res.text()
        throw new Error(`Server returned ${res.status}: ${detail}`)
      }
      const data = await res.json()
      setResult(data.recommendation || 'No recommendation returned.')
    } catch (e) {
      setError(
        e.message +
          '  —  If you are running plain `npm run dev`, the /api function is not served. Use `vercel dev` instead.'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: TP.bg,
        fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
        color: TP.slate,
        padding: '40px 16px',
      }}
    >
      <div style={{ maxWidth: 640, margin: '0 auto' }}>
        <h1 style={{ margin: 0, fontSize: 26 }}>
          Profile Recommender{' '}
          <span style={{ color: TP.pink }}>·</span>{' '}
          <span style={{ color: TP.turquoise }}>TP</span>
        </h1>
        <p style={{ marginTop: 4, opacity: 0.7, fontSize: 14 }}>
          Placeholder build — replace <code>src/ProfileRecommender.jsx</code> with your own.
        </p>

        <textarea
          value={profile}
          onChange={(e) => setProfile(e.target.value)}
          placeholder="Paste a candidate profile: languages, location, experience, role interest..."
          rows={6}
          style={{
            width: '100%',
            marginTop: 20,
            padding: 12,
            borderRadius: 10,
            border: '1px solid #d8dae6',
            fontSize: 14,
            boxSizing: 'border-box',
            resize: 'vertical',
          }}
        />

        <button
          onClick={getRecommendations}
          disabled={loading || !profile.trim()}
          style={{
            marginTop: 12,
            background: loading || !profile.trim() ? '#c9cad6' : TP.pink,
            color: '#fff',
            border: 'none',
            borderRadius: 10,
            padding: '12px 22px',
            fontSize: 15,
            fontWeight: 600,
            cursor: loading || !profile.trim() ? 'not-allowed' : 'pointer',
          }}
        >
          {loading ? 'Thinking…' : 'Recommend roles'}
        </button>

        {error && (
          <div
            style={{
              marginTop: 20,
              padding: 14,
              borderRadius: 10,
              background: '#fff0f5',
              border: `1px solid ${TP.pink}`,
              fontSize: 13,
              whiteSpace: 'pre-wrap',
            }}
          >
            {error}
          </div>
        )}

        {result && (
          <div
            style={{
              marginTop: 20,
              padding: 18,
              borderRadius: 12,
              background: '#fff',
              border: '1px solid #e3e5ef',
              fontSize: 15,
              lineHeight: 1.5,
              whiteSpace: 'pre-wrap',
            }}
          >
            {result}
          </div>
        )}
      </div>
    </div>
  )
}
