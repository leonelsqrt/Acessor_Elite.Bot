import { sendMessage, editMessage, buildKeyboard, deleteMessage } from '../../utils/telegram.js';
import { setLastMessageId, getLastMessageId } from '../../db/users.js';
import { getSleepStats, getWaterStats } from '../../db/health.js';
import { formatDuration, formatTimeOnly } from '../../utils/format.js';

// Barra de progresso AZUL (compacta 10 blocos)
function getProgressBar(percent: number): string {
    const length = 10;
    const cappedPercent = Math.min(percent, 100);
    const filled = Math.round((cappedPercent / 100) * length);
    const empty = length - filled;
    return '🟦'.repeat(Math.min(filled, length)) + '▪️'.repeat(Math.max(empty, 0));
}

// Emoji de status
function getStatusEmoji(percent: number): string {
    if (percent >= 100) return '✅';
    if (percent >= 75) return '🔥';
    if (percent >= 50) return '💪';
    return '⚡';
}

// Saudação baseada no horário de Brasília (regra estrita)
function getGreeting(): string {
    const now = new Date();
    const brasiliaTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
    const hour = brasiliaTime.getHours();

    // 05:00 - 11:59 = Bom dia
    // 12:00 - 17:59 = Boa tarde
    // 18:00 - 04:59 = Boa noite
    if (hour >= 5 && hour < 12) return 'Bom dia';
    if (hour >= 12 && hour < 18) return 'Boa tarde';
    return 'Boa noite';
}

// Data atual em Brasília
function getBrasiliaDate(): string {
    const now = new Date();
    return now.toLocaleDateString('pt-BR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        timeZone: 'America/Sao_Paulo'
    });
}

// Linha separadora
const LINE = '─────────────────────';

// Build Hub Central Premium
export async function handleStart(chatId: number, userId: number): Promise<void> {
    const lastMsgId = await getLastMessageId(userId);
    if (lastMsgId) {
        await deleteMessage(chatId, lastMsgId);
    }

    const text = await buildHubText(userId);

    const keyboard = buildKeyboard([
        [
            { text: '⏰ Lembretes', callback_data: 'reminders' },
            { text: '🌙 Dormir', callback_data: 'good_night' },
        ],
        [
            { text: '💧 +250ml', callback_data: 'water_250' },
            { text: '💧 +500ml', callback_data: 'water_500' },
            { text: '💧 +1L', callback_data: 'water_1000' },
        ],
        [
            { text: '📅 Criar Evento', callback_data: 'create_event' },
        ],
        [
            { text: '── 📂 MÓDULOS ──', callback_data: 'show_modules' },
        ],
    ]);

    const msg = await sendMessage(chatId, text, { replyMarkup: keyboard });
    if (msg) {
        await setLastMessageId(userId, msg.message_id);
    }
}

// Build hub text
async function buildHubText(userId: number): Promise<string> {
    const sleepStats = await getSleepStats(userId);
    const waterStats = await getWaterStats(userId);

    const greeting = getGreeting();
    const dateStr = getBrasiliaDate();

    let text = `<b>🧠 ASSESSOR ELITE</b>
${LINE}

${greeting}, Leonel!
🗓 <i>${dateStr}</i>

${LINE}
<b>⚡ DASHBOARD DO DIA</b>
${LINE}
`;

    // Sleep info
    if (sleepStats?.lastWake) {
        text += `☀️ Acordou às <b>${formatTimeOnly(sleepStats.lastWake)}</b>\n`;
    }

    // Dormiu por (calculado corretamente)
    if (sleepStats?.todaySleepHours && sleepStats.todaySleepHours > 0) {
        const totalMinutes = Math.round(sleepStats.todaySleepHours * 60);
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        text += `😴 Dormiu por <b>${hours}h${minutes}min</b>\n`;
    }

    // Water info (meta 4000ml)
    if (waterStats) {
        const percent = waterStats.percentComplete;
        const bar = getProgressBar(percent);
        const emoji = getStatusEmoji(percent);

        text += `\n💧 <b>Hidratação</b>\n`;
        text += `${bar} ${percent}%\n`;
        text += `<b>${waterStats.todayMl}ml</b> / ${waterStats.goalMl}ml ${emoji}\n`;

        if (waterStats.remaining > 0) {
            text += `<i>🎯 Faltam ${waterStats.remaining}ml</i>\n`;
        } else {
            text += `<i>💪 Meta atingida!</i>\n`;
        }
    }

    text += `\n${LINE}`;

    return text;
}

// Show Hub (edit existing message)
export async function showHub(chatId: number, messageId: number, userId: number): Promise<void> {
    const text = await buildHubText(userId);

    const keyboard = buildKeyboard([
        [
            { text: '⏰ Lembretes', callback_data: 'reminders' },
            { text: '🌙 Dormir', callback_data: 'good_night' },
        ],
        [
            { text: '💧 +250ml', callback_data: 'water_250' },
            { text: '💧 +500ml', callback_data: 'water_500' },
            { text: '💧 +1L', callback_data: 'water_1000' },
        ],
        [
            { text: '📅 Criar Evento', callback_data: 'create_event' },
        ],
        [
            { text: '── 📂 MÓDULOS ──', callback_data: 'show_modules' },
        ],
    ]);

    await editMessage(chatId, messageId, text, { replyMarkup: keyboard });
}

// Show modules
export async function showModules(chatId: number, messageId: number, userId: number): Promise<void> {
    const text = await buildHubText(userId);
    const finalText = text + `\n\n<b>📂 MÓDULOS</b>`;

    const keyboard = buildKeyboard([
        [{ text: '💪 Saúde', callback_data: 'health' }],
        [
            { text: '📚 Estudos', callback_data: 'studies' },
            { text: '💰 Finanças', callback_data: 'finances' },
        ],
        [{ text: '↩️ Voltar', callback_data: 'hub' }],
    ]);

    await editMessage(chatId, messageId, finalText, { replyMarkup: keyboard });
}
