// Vercel Serverless Function — runs at  /api/recommend
// The Anthropic API key NEVER reaches the browser. It lives only here, read
// from the ANTHROPIC_API_KEY environment variable (set in .env locally and in
// the Vercel dashboard for production).

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return res
      .status(500)
      .send('ANTHROPIC_API_KEY is not set. Add it to .env (local) or Vercel env vars (prod).')
  }

  const { profile } = req.body || {}
  if (!profile || !profile.trim()) {
    return res.status(400).json({ error: 'Missing "profile" in request body.' })
  }

  const systemPrompt =
    'You are a recruitment assistant for TP Talent Acquisition (BPO / contact-center hiring across Malaysia and Thailand). ' +
    'Given a candidate profile, recommend the 2-3 most suitable role types and briefly explain why, ' +
    'considering language skills, location, and experience. Be concise and practical.'

  try {
    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1024,
        system: systemPrompt,
        messages: [{ role: 'user', content: profile }],
      }),
    })

    if (!anthropicRes.ok) {
      const detail = await anthropicRes.text()
      return res.status(anthropicRes.status).send(`Anthropic API error: ${detail}`)
    }

    const data = await anthropicRes.json()
    const recommendation = (data.content || [])
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('\n')

    return res.status(200).json({ recommendation })
  } catch (e) {
    return res.status(500).send(`Request failed: ${e.message}`)
  }
}
