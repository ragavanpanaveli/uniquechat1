const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { HfInference } = require('@huggingface/inference');

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '20mb' }));

const HF_API_KEY = (process.env.HF_API_KEY || '').trim();

// ─── CHAT ROUTE ───────────────────────────────────────────────────────────
app.post('/api/chat', async (req, res) => {
  try {
    const { message, history = [], language = 'tamil' } = req.body;
    console.log(`[AI] Request in ${language}: ${message?.slice(0, 50)}`);

    if (!HF_API_KEY) {
      console.error('[AI] Missing API Key');
      return res.status(500).json({ error: '❌ HF API Key missing' });
    }

    // ─── FRIENDLY CHAT ONLY ────────────────────────────────────────────────
    const systemPrompt = language === 'tamil'
      ? 'You are UniqueChat AI, a friendly best friend. You must respond ONLY in TAMIL script. Be warm, supportive, and humorous. Call the user "machi" or "da". If they ask in English or Thanglish, you translate to beautiful Tamil.'
      : 'You are UniqueChat AI, a friendly best friend. You must respond ONLY in ENGLISH. Be warm, supportive, and humorous. Call the user "machi", "bro", or "bestie". If they use Tamil, you respond in clear English.';

    try {
      const chatRes = await fetch('https://router.huggingface.co/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${HF_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'meta-llama/Llama-3.1-8B-Instruct',
          messages: [
            { role: 'system', content: systemPrompt },
            ...history.slice(-10).map(h => ({
              role: h.role === 'user' ? 'user' : 'assistant',
              content: h.parts?.[0]?.text || h.content || ''
            })),
            { role: 'user', content: message }
          ],
          max_tokens: 500,
          temperature: 0.7
        })
      });

      if (!chatRes.ok) {
        const errText = await chatRes.text();
        console.error('[AI] Router Error:', errText);
        throw new Error(`Router API returned ${chatRes.status}`);
      }

      const data = await chatRes.json();
      const aiText = data.choices[0].message.content.trim();

      console.log(`[AI] Response: ${aiText.slice(0, 30)}...`);
      res.json({ text: aiText || "I'm here for you, machi! Can you say that again? 😅" });

    } catch (chatErr) {
      console.error('[AI] Chat API Error:', chatErr.message);
      res.json({ text: "Machi, small connection issue. Try again! ⏳" });
    }

  } catch (error) {
    console.error('[AI] Global Error:', error);
    res.status(500).json({ error: '❌ Server Error' });
  }
});

app.get('/', (req, res) => res.send('UniqueChat AI Chat Server is Running 🚀'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`[SERVER] UniqueChat AI Live on Port ${PORT}`));
