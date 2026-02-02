import { sendMessage, editMessage, buildKeyboard, deleteMessage } from '../../utils/telegram.js';
import { setLastMessageId, getLastMessageId } from '../../db/users.js';
import { getSleepStats, getWaterStats } from '../../db/health.js';
import { formatDuration, formatTimeOnly } from '../../utils/format.js';

// Barras de progresso visuais
function getProgressBar(percent: number, length: number = 10): string {
    const filled = Math.round((percent / 100) * length);
    const empty = length - filled;
    return '▓'.repeat(Math.min(filled, length)) + '░'.repeat(Math.max(empty, 0));
}

// Emoji de status baseado na porcentagem
function getStatusEmoji(percent: number): string {
    if (percent >= 100) return '✅';
    if (percent >= 75) return '🔥';
    if (percent >= 50) return '💪';
    if (percent >= 25) return '⚡';
    return '🎯';
}

// Saudação baseada no horário
function getGreeting(): string {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'Bom dia';
    if (hour >= 12 && hour < 18) return 'Boa tarde';
    return 'Boa noite';
}

// Build the Hub Central Premium card
export async function handleStart(chatId: number, userId: number): Promise<void> {
    // Delete previous message if exists
    const lastMsgId = await getLastMessageId(userId);
    if (lastMsgId) {
        await deleteMessage(chatId, lastMsgId);
    }

    // Get current stats for display
    const sleepStats = await getSleepStats(userId);
    const waterStats = await getWaterStats(userId);

    const greeting = getGreeting();
    const now = new Date();
    const dateStr = now.toLocaleDateString('pt-BR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long'
    });

    // Build premium dashboard
    let text = `
<b>🧠 ASSESSOR ELITE</b>
═══════════════════════════

<b>${greeting}, Leonel!</b>
📅 <i>${dateStr}</i>

━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚡ <b>DASHBOARD DO DIA</b>
━━━━━━━━━━━━━━━━━━━━━━━━━━━

`;

    // Sleep status
    if (sleepStats?.lastWake) {
        const wakeTime = formatTimeOnly(sleepStats.lastWake);
        text += `☀️ Acordou às <b>${wakeTime}</b>\n`;
    } else {
        text += `☀️ <i>Aguardando registro de manhã</i>\n`;
    }

    if (sleepStats?.todaySleepHours) {
        const duration = formatDuration(Math.round(sleepStats.todaySleepHours * 60));
        text += `😴 Dormiu <b>${duration}</b>\n`;
    }

    // Water status with visual progress
    if (waterStats) {
        const percent = waterStats.percentComplete;
        const bar = getProgressBar(percent);
        const emoji = getStatusEmoji(percent);
        text += `\n💧 <b>Hidratação</b>\n`;
        text += `   ${bar} <b>${waterStats.todayMl}ml</b>/${waterStats.goalMl}ml ${emoji}\n`;

        if (waterStats.remaining > 0) {
            text += `   <i>Faltam ${waterStats.remaining}ml para a meta</i>\n`;
        } else {
            text += `   <i>✨ Meta atingida! Excelente!</i>\n`;
        }
    }

    text += `
━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;

    // Build keyboard with premium hierarchical layout
    const keyboard = buildKeyboard([
        // Section: Quick Status Actions
        [
            { text: '☀️ Acordei', callback_data: 'good_morning' },
            { text: '🌙 Vou Dormir', callback_data: 'good_night' },
        ],
        // Section: Quick Water
        [
            { text: '💧 +250ml', callback_data: 'water_250' },
            { text: '💧 +500ml', callback_data: 'water_500' },
            { text: '💧 +1L', callback_data: 'water_1000' },
        ],
        // Section: Create Event (prominent)
        [
            { text: '📅 Criar Evento', callback_data: 'create_event' },
        ],
        // Section separator
        [
            { text: '──── 📂 ÁREAS ────', callback_data: 'noop' },
        ],
        // Section: Areas
        [
            { text: '💪 Saúde', callback_data: 'health' },
        ],
        [
            { text: '📚 Estudos', callback_data: 'studies' },
            { text: '💰 Finanças', callback_data: 'finances' },
        ],
    ]);

    const msg = await sendMessage(chatId, text, { replyMarkup: keyboard });

    if (msg) {
        await setLastMessageId(userId, msg.message_id);
    }
}

// Show Hub (for back navigation) - edit existing message
export async function showHub(chatId: number, messageId: number, userId: number): Promise<void> {
    // Get current stats
    const sleepStats = await getSleepStats(userId);
    const waterStats = await getWaterStats(userId);

    const greeting = getGreeting();
    const now = new Date();
    const dateStr = now.toLocaleDateString('pt-BR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long'
    });

    let text = `
<b>🧠 ASSESSOR ELITE</b>
═══════════════════════════

<b>${greeting}, Leonel!</b>
📅 <i>${dateStr}</i>

━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚡ <b>DASHBOARD DO DIA</b>
━━━━━━━━━━━━━━━━━━━━━━━━━━━

`;

    if (sleepStats?.lastWake) {
        const wakeTime = formatTimeOnly(sleepStats.lastWake);
        text += `☀️ Acordou às <b>${wakeTime}</b>\n`;
    } else {
        text += `☀️ <i>Aguardando registro de manhã</i>\n`;
    }

    if (sleepStats?.todaySleepHours) {
        const duration = formatDuration(Math.round(sleepStats.todaySleepHours * 60));
        text += `😴 Dormiu <b>${duration}</b>\n`;
    }

    if (waterStats) {
        const percent = waterStats.percentComplete;
        const bar = getProgressBar(percent);
        const emoji = getStatusEmoji(percent);
        text += `\n💧 <b>Hidratação</b>\n`;
        text += `   ${bar} <b>${waterStats.todayMl}ml</b>/${waterStats.goalMl}ml ${emoji}\n`;

        if (waterStats.remaining > 0) {
            text += `   <i>Faltam ${waterStats.remaining}ml para a meta</i>\n`;
        } else {
            text += `   <i>✨ Meta atingida! Excelente!</i>\n`;
        }
    }

    text += `
━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;

    const keyboard = buildKeyboard([
        [
            { text: '☀️ Acordei', callback_data: 'good_morning' },
            { text: '🌙 Vou Dormir', callback_data: 'good_night' },
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
            { text: '──── 📂 ÁREAS ────', callback_data: 'noop' },
        ],
        [
            { text: '💪 Saúde', callback_data: 'health' },
        ],
        [
            { text: '📚 Estudos', callback_data: 'studies' },
            { text: '💰 Finanças', callback_data: 'finances' },
        ],
    ]);

    await editMessage(chatId, messageId, text, { replyMarkup: keyboard });
}
