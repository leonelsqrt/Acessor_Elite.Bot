import { editMessage, buildKeyboard } from '../../utils/telegram.js';
import { getWeeklySleepData, getSleepStats } from '../../db/health.js';
import { getDayName, formatDuration, formatTimeOnly } from '../../utils/format.js';
import { config } from '../../config/env.js';

// Show sleep monitoring card (Premium)
export async function showSleepCard(
    chatId: number,
    messageId: number,
    userId: number
): Promise<void> {
    const sleepStats = await getSleepStats(userId);
    const weeklyData = await getWeeklySleepData(userId);

    let text = `
<b>🛏️ MONITORAMENTO DE SONO</b>
═══════════════════════════
<i>Análise detalhada do seu descanso</i>

━━━━━━━━━━━━━━━━━━━━━━━━━━━
📅 <b>ÚLTIMOS 7 DIAS</b>
━━━━━━━━━━━━━━━━━━━━━━━━━━━

`;

    // Weekly sleep data with visual bars
    weeklyData.forEach(day => {
        const dayName = getDayName(day.date);
        if (day.hours) {
            const bar = getSleepBar(day.hours);
            const quality = getSleepQuality(day.hours);
            text += `<code>${dayName}</code> ${bar} <b>${day.hours.toFixed(1)}h</b> ${quality}\n`;
        } else {
            text += `<code>${dayName}</code> <i>──────── Sem dados</i>\n`;
        }
    });

    text += `
━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 <b>ESTATÍSTICAS</b>
━━━━━━━━━━━━━━━━━━━━━━━━━━━

`;

    // Stats
    if (sleepStats?.avgHours) {
        const avg = sleepStats.avgHours;
        const emoji = avg >= 7 ? '✅' : avg >= 6 ? '⚠️' : '❌';
        text += `📈 Média semanal: <b>${avg.toFixed(1)}h</b> ${emoji}\n`;
    }

    if (sleepStats?.lastWake) {
        text += `☀️ Último despertar: <b>${formatTimeOnly(sleepStats.lastWake)}</b>\n`;
    }

    if (sleepStats?.lastSleep) {
        text += `🌙 Última vez dormindo: <b>${formatTimeOnly(sleepStats.lastSleep)}</b>\n`;
    }

    if (sleepStats?.todaySleepHours) {
        const todayQuality = getSleepQuality(sleepStats.todaySleepHours);
        text += `😴 Última noite: <b>${formatDuration(Math.round(sleepStats.todaySleepHours * 60))}</b> ${todayQuality}\n`;
    }

    // Insights
    text += `
━━━━━━━━━━━━━━━━━━━━━━━━━━━
💡 <b>INSIGHT</b>
━━━━━━━━━━━━━━━━━━━━━━━━━━━

`;
    const insight = generateSleepInsight(sleepStats, weeklyData);
    text += `<i>${insight}</i>

━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;

    const keyboard = buildKeyboard([
        [
            { text: '☀️ Acordei', callback_data: 'good_morning' },
            { text: '🌙 Vou Dormir', callback_data: 'good_night' },
        ],
        [{ text: '↩️ Voltar à Saúde', callback_data: 'health' }],
        [{ text: '🏠 Voltar ao Hub', callback_data: 'hub' }],
    ]);

    await editMessage(chatId, messageId, text, { replyMarkup: keyboard });
}

// Visual sleep bar (based on hours)
function getSleepBar(hours: number): string {
    const maxHours = 10;
    const blocks = Math.min(Math.round((hours / maxHours) * 8), 8);
    const filled = '█'.repeat(blocks);
    const empty = '░'.repeat(8 - blocks);
    return filled + empty;
}

// Get sleep quality emoji
function getSleepQuality(hours: number): string {
    if (hours >= 7 && hours <= 9) return '😊';
    if (hours >= 6 && hours < 7) return '😐';
    if (hours > 9) return '😴';
    return '😫';
}

// Generate sleep insight
function generateSleepInsight(
    stats: Awaited<ReturnType<typeof getSleepStats>>,
    weeklyData: Array<{ date: Date; hours?: number }>
): string {
    if (!stats?.avgHours) {
        return '💡 Use os botões "Acordei" e "Vou Dormir" no Hub para registrar seu sono automaticamente!';
    }

    const avg = stats.avgHours;

    if (avg >= 7 && avg <= 8) {
        return '💚 Excelente! Sua média de sono está ideal (7-8h). Continue mantendo essa rotina saudável!';
    }

    if (avg < 6) {
        return '⚠️ Atenção! Sua média de sono está abaixo do ideal. Tente dormir mais cedo hoje para recuperar sua energia.';
    }

    if (avg > 9) {
        return '💤 Você está dormindo bastante! Pode indicar cansaço acumulado ou qualidade de sono não ideal.';
    }

    // Find worst day
    const worstDay = weeklyData
        .filter(d => d.hours !== undefined)
        .sort((a, b) => (a.hours || 0) - (b.hours || 0))[0];

    if (worstDay && worstDay.hours && worstDay.hours < 5) {
        const dayName = getDayName(worstDay.date);
        return `😴 ${dayName} foi um dia difícil com apenas ${formatDuration(Math.round(worstDay.hours * 60))}. Priorize descanso!`;
    }

    return '💡 Mantenha uma rotina consistente de sono. Durma e acorde nos mesmos horários para melhorar sua energia!';
}
