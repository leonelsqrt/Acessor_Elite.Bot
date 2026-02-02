import { editMessage, buildKeyboard } from '../../utils/telegram.js';
import { getSleepStats, getWaterStats } from '../../db/health.js';
import { formatDuration, formatTimeOnly } from '../../utils/format.js';

// Barra de progresso visual
function getProgressBar(percent: number, length: number = 10): string {
    const filled = Math.round((percent / 100) * length);
    const empty = length - filled;
    return '▓'.repeat(Math.min(filled, length)) + '░'.repeat(Math.max(empty, 0));
}

// Emoji de status
function getStatusEmoji(percent: number): string {
    if (percent >= 100) return '✅';
    if (percent >= 75) return '🔥';
    if (percent >= 50) return '💪';
    return '⚡';
}

// Show health area card (Premium)
export async function showHealthCard(
    chatId: number,
    messageId: number,
    userId: number
): Promise<void> {
    const sleepStats = await getSleepStats(userId);
    const waterStats = await getWaterStats(userId);

    let text = `
<b>💪 SAÚDE</b>
═══════════════════════════
<i>Monitoramento completo do seu bem-estar</i>

━━━━━━━━━━━━━━━━━━━━━━━━━━━
😴 <b>SONO</b>
━━━━━━━━━━━━━━━━━━━━━━━━━━━

`;

    // Sleep info
    if (sleepStats?.todaySleepHours) {
        const duration = formatDuration(Math.round(sleepStats.todaySleepHours * 60));
        text += `⏱️ Dormiu <b>${duration}</b> hoje\n`;
    } else {
        text += `⏱️ <i>Aguardando dados de sono</i>\n`;
    }

    if (sleepStats?.lastWake) {
        text += `☀️ Acordou às <b>${formatTimeOnly(sleepStats.lastWake)}</b>\n`;
    }

    if (sleepStats?.avgHours) {
        const avgFormatted = sleepStats.avgHours.toFixed(1);
        const emoji = sleepStats.avgHours >= 7 ? '✅' : sleepStats.avgHours >= 6 ? '⚠️' : '❌';
        text += `📊 Média semanal: <b>${avgFormatted}h</b> ${emoji}\n`;
    }

    text += `
━━━━━━━━━━━━━━━━━━━━━━━━━━━
💧 <b>HIDRATAÇÃO</b>
━━━━━━━━━━━━━━━━━━━━━━━━━━━

`;

    // Water info
    if (waterStats) {
        const bar = getProgressBar(waterStats.percentComplete);
        const emoji = getStatusEmoji(waterStats.percentComplete);

        text += `${bar} ${emoji}\n`;
        text += `<b>${waterStats.todayMl}ml</b> / ${waterStats.goalMl}ml (${waterStats.percentComplete}%)\n\n`;

        if (waterStats.remaining > 0) {
            text += `<i>🎯 Faltam ${waterStats.remaining}ml para a meta</i>\n`;
        } else {
            text += `<i>✨ Meta atingida! Excelente!</i>\n`;
        }
    } else {
        text += `<i>Aguardando dados de hidratação</i>\n`;
    }

    text += `
━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;

    const keyboard = buildKeyboard([
        [{ text: '🛏️ Monitoramento de Sono', callback_data: 'sleep' }],
        [{ text: '💧 Ver Consumo de Água', callback_data: 'water' }],
        [
            { text: '💧 +250ml', callback_data: 'water_250' },
            { text: '💧 +500ml', callback_data: 'water_500' },
        ],
        [{ text: '↩️ Voltar ao Hub', callback_data: 'hub' }],
    ]);

    await editMessage(chatId, messageId, text, { replyMarkup: keyboard });
}
