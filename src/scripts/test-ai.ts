
import dotenv from 'dotenv';
import path from 'path';

// Carregar .env manualmente
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const rawKey = process.env.PERPLEXITY_API_KEY || '';
const apiKey = rawKey.trim();
const model = process.env.PERPLEXITY_MODEL || 'sonar-pro';

console.log(`🔑 Testando Perplexity Key: ${apiKey ? 'Encontrada' : 'NÃO ENCONTRADA'}`);
console.log(`   - Modelo: ${model}`);
console.log(`   - Comprimento Chave: ${apiKey.length} chars (pplx-...)`);
console.log(`   - Fim: ...${apiKey.substring(apiKey.length - 4)}`);

if (!apiKey.startsWith('pplx-')) {
    console.warn('⚠️ AVISO: Sua chave não começa com "pplx-". Verifique se copiou certo!');
}

async function test() {
    console.log(`\n🤖 Testando conexão com Perplexity API (${model})...`);

    try {
        const response = await fetch('https://api.perplexity.ai/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: model,
                messages: [
                    { role: 'user', content: 'Responda apenas com a palavra: FUNCIONOU' }
                ]
            })
        });

        if (!response.ok) {
            const err = await response.text();
            throw new Error(`${response.status} ${response.statusText} - ${err}`);
        }

        const data = await response.json();
        console.log(`✅ SUCESSO! Resposta: ${data.choices[0].message.content}`);

    } catch (error: any) {
        console.error(`❌ Falha na conexão:`, error.message);
    }
}

test();
