import { editMessage, buildKeyboard } from '../../utils/telegram.js';
import { getSleepStats, getWaterStats, getWeeklySleepData, getWeeklyWaterData } from '../../db/health.js';
import { formatTimeOnly } from '../../utils/format.js';

// Linha separadora mobile
const LINE = '─────────────────────';

// Formatar duração compacta
function formatDurationCompact(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h${mins}min`;
}

// Barra de progresso
function getProgressBar(percent: number, length: number = 10): string {
    const cappedPercent = Math.min(percent, 100);
    const filled = Math.round((cappedPercent / 100) * length);
    const empty = length - filled;
    return '🟦'.repeat(Math.min(filled, length)) + '⬛'.repeat(Math.max(empty, 0));
}

// Card Principal Saúde
export async function showHealthModule(
    chatId: number,
    messageId: number,
    userId: number
): Promise<void> {
    const sleepStats = await getSleepStats(userId);
    const waterStats = await getWaterStats(userId);
    const weeklySleep = await getWeeklySleepData(userId);
    const weeklyWater = await getWeeklyWaterData(userId);

    // Calcular consistência (dias com sono ideal: 7-9h)
    const idealSleepDays = weeklySleep.filter(d => d.hours && d.hours >= 7 && d.hours <= 9).length;
    const consistencyPercent = Math.round((idealSleepDays / 7) * 100);

    // Calcular média de sono
    const sleepHours = weeklySleep.filter(d => d.hours).map(d => d.hours!);
    const avgSleepMinutes = sleepHours.length > 0
        ? Math.round((sleepHours.reduce((a, b) => a + b, 0) / sleepHours.length) * 60)
        : 0;

    // Calcular média de água
    const waterTotals = weeklyWater.map(d => d.totalMl);
    const avgWater = waterTotals.length > 0
        ? Math.round(waterTotals.reduce((a, b) => a + b, 0) / waterTotals.length)
        : 0;

    // Dias com meta de água atingida
    const waterGoalDays = weeklyWater.filter(d => d.metGoal).length;

    let text = `<b>💪 SAÚDE</b>
${LINE}

<b>📊 RESUMO DA SEMANA</b>
${getProgressBar(consistencyPercent)} ${consistencyPercent}% consistência

<b>😴 SONO</b>
   Média: ${avgSleepMinutes > 0 ? formatDurationCompact(avgSleepMinutes) : '<i>Sem dados</i>'}/noite
   Dias ideais: ${idealSleepDays}/7

<b>💧 HIDRATAÇÃO</b>
   Média: ${avgWater > 0 ? `${avgWater.toLocaleString('pt-BR')}ml` : '<i>Sem dados</i>'}/dia
   Meta atingida: ${waterGoalDays}/7 dias

${LINE}`;

    const keyboard = buildKeyboard([
        [
            { text: '😴 Sono', callback_data: 'health_sleep' },
            { text: '💧 Água', callback_data: 'health_water' },
        ],
        [
            { text: '🏃 Atividade', callback_data: 'health_activity' },
            { text: '📊 Stats', callback_data: 'health_stats' },
        ],
        [
            { text: '↩️ Voltar ao Hub', callback_data: 'hub' },
        ],
    ]);

    await editMessage(chatId, messageId, text, { replyMarkup: keyboard });
}

// Card Sono
export async function showSleepCard(
    chatId: number,
    messageId: number,
    userId: number
): Promise<void> {
    const weeklySleep = await getWeeklySleepData(userId);
    const sleepStats = await getSleepStats(userId);

    const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

    let text = `<b>😴 SONO</b>
${LINE}

<b>📅 ÚLTIMOS 7 DIAS</b>

`;

    for (const day of weeklySleep) {
        const date = new Date(day.date);
        const weekDay = weekDays[date.getDay()];

        if (day.hours && day.hours > 0) {
            const minutes = Math.round(day.hours * 60);
            const bar = getProgressBar(Math.min((day.hours / 9) * 100, 100), 9);
            const emoji = day.hours >= 7 && day.hours <= 9 ? '✅' : day.hours < 6 ? '❌' : '⚠️';
            text += `${weekDay} ${bar} ${formatDurationCompact(minutes)} ${emoji}\n`;
        } else {
            text += `${weekDay} ░░░░░░░░░ <i>Sem registro</i>\n`;
        }
    }

    // Calcular média
    const sleepHours = weeklySleep.filter(d => d.hours).map(d => d.hours!);
    const avgMinutes = sleepHours.length > 0
        ? Math.round((sleepHours.reduce((a, b) => a + b, 0) / sleepHours.length) * 60)
        : 0;

    const idealDays = sleepHours.filter(h => h >= 7 && h <= 9).length;

    text += `
<b>📈 MÉDIA:</b> ${avgMinutes > 0 ? formatDurationCompact(avgMinutes) : '<i>Sem dados</i>'}
<b>🎯 META:</b> 7-8h

💡 Você dormiu bem ${idealDays} de 7 dias!

${LINE}`;

    const keyboard = buildKeyboard([
        [{ text: '📊 Ver Detalhes', callback_data: 'health_sleep_details' }],
        [{ text: '↩️ Voltar', callback_data: 'health' }],
    ]);

    await editMessage(chatId, messageId, text, { replyMarkup: keyboard });
}

// Card Detalhes do Sono
export async function showSleepDetails(
    chatId: number,
    messageId: number,
    userId: number
): Promise<void> {
    const sleepStats = await getSleepStats(userId);

    const now = new Date();
    const dateStr = now.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

    let text = `<b>📊 DETALHES DO SONO</b>
${LINE}

<b>📅 HOJE (${dateStr})</b>

`;

    if (sleepStats?.lastSleep) {
        text += `🌙 Dormiu: <b>${formatTimeOnly(sleepStats.lastSleep)}</b>\n`;
    } else {
        text += `🌙 Dormiu: <i>Sem registro</i>\n`;
    }

    if (sleepStats?.lastWake) {
        text += `☀️ Acordou: <b>${formatTimeOnly(sleepStats.lastWake)}</b>\n`;
    } else {
        text += `☀️ Acordou: <i>Sem registro</i>\n`;
    }

    if (sleepStats?.todaySleepHours && sleepStats.todaySleepHours > 0) {
        const minutes = Math.round(sleepStats.todaySleepHours * 60);
        const quality = sleepStats.todaySleepHours >= 7 && sleepStats.todaySleepHours <= 9 ? '⭐⭐⭐⭐⭐' :
            sleepStats.todaySleepHours >= 6 ? '⭐⭐⭐⭐☆' : '⭐⭐⭐☆☆';
        text += `⏱️ Duração: <b>${formatDurationCompact(minutes)}</b>\n`;
        text += `📈 Qualidade: ${quality}\n`;
    }

    text += `
${LINE}

💡 <b>DICA PERSONALIZADA</b>

<i>Mantenha horários regulares de sono
para melhorar sua qualidade de vida!</i>

${LINE}`;

    const keyboard = buildKeyboard([
        [{ text: '↩️ Voltar', callback_data: 'health_sleep' }],
    ]);

    await editMessage(chatId, messageId, text, { replyMarkup: keyboard });
}

// Card Água
export async function showWaterCard(
    chatId: number,
    messageId: number,
    userId: number
): Promise<void> {
    const waterStats = await getWaterStats(userId);
    const weeklyWater = await getWeeklyWaterData(userId);

    const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

    const todayPercent = waterStats?.percentComplete || 0;
    const todayMl = waterStats?.todayMl || 0;
    const goalMl = waterStats?.goalMl || 4000;

    let text = `<b>💧 HIDRATAÇÃO</b>
${LINE}

<b>📅 HOJE</b>
${getProgressBar(todayPercent)} ${todayPercent}%
${todayMl.toLocaleString('pt-BR')}ml / ${goalMl.toLocaleString('pt-BR')}ml

<b>📅 ÚLTIMOS 7 DIAS</b>

`;

    for (const day of weeklyWater) {
        const date = new Date(day.date);
        const weekDay = weekDays[date.getDay()];
        const percent = Math.round((day.totalMl / day.goalMl) * 100);
        const bar = getProgressBar(percent);
        const emoji = day.metGoal ? '✅' : '';
        text += `${weekDay} ${bar} ${day.totalMl.toLocaleString('pt-BR')}ml ${emoji}\n`;
    }

    // Calcular média
    const avgMl = weeklyWater.length > 0
        ? Math.round(weeklyWater.reduce((a, b) => a + b.totalMl, 0) / weeklyWater.length)
        : 0;

    text += `
<b>📈 MÉDIA:</b> ${avgMl.toLocaleString('pt-BR')}ml/dia

${LINE}`;

    const keyboard = buildKeyboard([
        [
            { text: '💧 +250ml', callback_data: 'water_250' },
            { text: '💧 +500ml', callback_data: 'water_500' },
            { text: '💧 +1L', callback_data: 'water_1000' },
        ],
        [{ text: '↩️ Voltar', callback_data: 'health' }],
    ]);

    await editMessage(chatId, messageId, text, { replyMarkup: keyboard });
}

// Card Atividade Física
export async function showActivityCard(
    chatId: number,
    messageId: number,
    userId: number
): Promise<void> {
    let text = `<b>🏃 ATIVIDADE FÍSICA</b>
${LINE}

<b>📅 ESTA SEMANA</b>

<i>Nenhuma atividade registrada.</i>

${LINE}

💡 Registre suas atividades físicas
para acompanhar seu progresso!

${LINE}`;

    const keyboard = buildKeyboard([
        [{ text: '➕ Registrar Atividade', callback_data: 'activity_add' }],
        [{ text: '↩️ Voltar', callback_data: 'health' }],
    ]);

    await editMessage(chatId, messageId, text, { replyMarkup: keyboard });
}

// Card Estatísticas
export async function showHealthStats(
    chatId: number,
    messageId: number,
    userId: number
): Promise<void> {
    const weeklySleep = await getWeeklySleepData(userId);
    const weeklyWater = await getWeeklyWaterData(userId);

    const idealSleepDays = weeklySleep.filter(d => d.hours && d.hours >= 7 && d.hours <= 9).length;
    const waterGoalDays = weeklyWater.filter(d => d.metGoal).length;

    let text = `<b>📊 ESTATÍSTICAS</b>
${LINE}

<b>🏆 CONQUISTAS DA SEMANA</b>

${idealSleepDays >= 5 ? '✅' : '⬜'} ${idealSleepDays}/7 dias com sono ideal
${waterGoalDays >= 5 ? '✅' : '⬜'} ${waterGoalDays}/7 dias meta de água

${LINE}

<b>💡 DICA</b>

<i>Mantenha consistência nos seus
hábitos para melhores resultados!</i>

${LINE}`;

    const keyboard = buildKeyboard([
        [{ text: '↩️ Voltar', callback_data: 'health' }],
    ]);

    await editMessage(chatId, messageId, text, { replyMarkup: keyboard });
}

// Compatibilidade com código antigo
export async function showHealthCard(
    chatId: number,
    messageId: number,
    userId: number
): Promise<void> {
    return showHealthModule(chatId, messageId, userId);
}
