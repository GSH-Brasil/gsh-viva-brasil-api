// api/chat.js

const ALLOWED_ORIGIN = 'https://globalspeak.online';

function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
  res.setHeader('Vary', 'Origin'); // bom p/ caches/CDN
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

export default async function handler(req, res) {
  // Trata a preflight request do browser
  if (req.method === 'OPTIONS') {
    setCorsHeaders(res);
    return res.status(204).end(); // sem corpo
  }

  if (req.method !== 'POST') {
    setCorsHeaders(res);
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    setCorsHeaders(res);

    const { prompt, level } = req.body || {};
    if (!prompt) {
      return res.status(400).json({ error: 'Missing prompt' });
    }

    // ==== SUA CHAMADA AO OPENAI AQUI ====
    // Exemplo com fetch do OpenAI Responses API:
    // Certifique-se de ter OPENAI_API_KEY em Vercel -> Settings -> Environment Variables
    const openaiKey = process.env.OPENAI_API_KEY;
    if (!openaiKey) {
      return res.status(500).json({ error: 'Missing OPENAI_API_KEY' });
    }

    // Ajuste o sistema/estilo conforme seu caso
    const systemPrompt = `
Você é um professor brasileiro de PLE. Fale simples, amigável.
Nível do aluno: ${level || 'A2'}. Responda curto, com exemplos práticos.
`;

    const resp = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4.1-mini',
        input: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ]
      })
    });

    if (!resp.ok) {
      const txt = await resp.text().catch(() => '');
      return res.status(resp.status).send(txt || 'OpenAI error');
    }

    const data = await resp.json();
    // Compatível com Responses API: pegue o texto
    const reply =
      data?.output_text ||
      data?.choices?.[0]?.message?.content ||
      '(sem resposta)';

    return res.status(200).json({ reply });
  } catch (err) {
    console.error('[API ERROR]', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
