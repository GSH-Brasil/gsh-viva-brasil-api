// api/chat.js
export default async function handler(req, res) {
  // CORS básico
  res.setHeader('Access-Control-Allow-Origin', 'https://globalspeak.online');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { prompt, level } = req.body || {};
    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'Missing "prompt" (string)' });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'Missing OPENAI_API_KEY' });
    }

    // ===== OpenAI (Responses API) =====
    const r = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        input: [
          {
            role: 'system',
            content:
              `Você é um professor brasileiro paciente de PLE. Fale SEMPRE em português simples, `
              + `adaptando ao nível do aluno (${level || 'A2'}). Seja breve, corrija de leve e incentive.`
          },
          {
            role: 'user',
            content: prompt
          }
        ]
      })
    });

    if (!r.ok) {
      const txt = await r.text().catch(() => '');
      return res.status(502).json({ error: 'OpenAI error', details: txt });
    }

    const data = await r.json();

    // 3 caminhos possíveis conforme o client da OpenAI:
    const direct = data.output_text; // novo campo helper do Responses
    const choice0 = data.output?.[0]?.content?.[0]?.text; // formato estruturado
    const legacy = data.choices?.[0]?.message?.content; // fallback

    const reply = direct || choice0 || legacy || '(sem resposta gerada)';
    return res.status(200).json({ reply });
  } catch (err) {
    console.error('API /chat error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}
