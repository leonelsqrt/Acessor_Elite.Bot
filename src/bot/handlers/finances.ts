import { editMessage, buildKeyboard, sendMessage } from '../../utils/telegram.js';
import {
    getCategories,
    getMonthSummary,
    getMonthTransactions,
    getFixedBills,
    getBillValue,
    getFinancialGoals,
    Category,
    FixedBill,
    FinancialGoal
} from '../../db/finances.js';
import { setBotState, getBotState, clearBotState } from '../../db/users.js';

// Linha separadora mobile
const LINE = '─────────────────────';

// Formatar valor monetário brasileiro
export function formatCurrency(value: number): string {
    return value.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

// Barra de progresso
function getProgressBar(percent: number, length: number = 10): string {
    const cappedPercent = Math.min(percent, 100);
    const filled = Math.round((cappedPercent / 100) * length);
    const empty = length - filled;
    return '🟦'.repeat(Math.min(filled, length)) + '⬛'.repeat(Math.max(empty, 0));
}

// Card Principal Finanças
export async function showFinancesModule(
    chatId: number,
    messageId: number,
    userId: number
): Promise<void> {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    const monthName = now.toLocaleDateString('pt-BR', { month: 'long' });

    const summary = await getMonthSummary(userId, month, year);
    const bills = await getFixedBills(userId);

    // Próximas contas (7 dias)
    const today = now.getDate();
    const upcomingBills = bills.filter(b => {
        const daysUntil = b.dueDay - today;
        return daysUntil >= 0 && daysUntil <= 7;
    }).slice(0, 3);

    let text = `<b>💰 FINANÇAS</b>
${LINE}

<b>📊 RESUMO DO MÊS</b> (${monthName})

💵 Saldo atual: <b>${formatCurrency(summary.saldo)}</b>

📥 Entradas: ${formatCurrency(summary.totalEntradas)}
📤 Saídas: ${formatCurrency(summary.totalSaidas)}
`;

    if (upcomingBills.length > 0) {
        text += `\n<b>⚠️ PRÓXIMAS CONTAS</b>\n`;
        for (const bill of upcomingBills) {
            const billValue = await getBillValue(bill.id, month, year);
            const valueText = billValue
                ? formatCurrency(billValue.amount)
                : (bill.isVariable ? '<i>Valor não definido</i>' : formatCurrency(bill.amount || 0));
            text += `   📅 ${bill.dueDay.toString().padStart(2, '0')}/${month.toString().padStart(2, '0')} - ${bill.emoji} ${bill.name}: ${valueText}\n`;
        }
    }

    text += `\n${LINE}`;

    const keyboard = buildKeyboard([
        [
            { text: '📥 Entrada', callback_data: 'fin_entrada' },
            { text: '📤 Saída', callback_data: 'fin_saida' },
        ],
        [
            { text: '📆 Contas Fixas', callback_data: 'fin_bills' },
            { text: '🏷️ Categorias', callback_data: 'fin_categories' },
        ],
        [
            { text: '📊 Extrato', callback_data: 'fin_extrato' },
            { text: '📈 Relatórios', callback_data: 'fin_reports' },
        ],
        [
            { text: '🎯 Metas', callback_data: 'fin_goals' },
        ],
        [
            { text: '↩️ Voltar ao Hub', callback_data: 'hub' },
        ],
    ]);

    await editMessage(chatId, messageId, text, { replyMarkup: keyboard });
}

// Card Contas Fixas
export async function showBillsCard(
    chatId: number,
    messageId: number,
    userId: number
): Promise<void> {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    const today = now.getDate();

    const bills = await getFixedBills(userId);

    let totalFixed = 0;
    let totalPaid = 0;
    let totalPending = 0;

    let text = `<b>📆 CONTAS FIXAS</b>
${LINE}

<b>📌 ESTE MÊS</b>

`;

    if (bills.length === 0) {
        text += `<i>Nenhuma conta cadastrada.</i>\n`;
    } else {
        for (const bill of bills) {
            const billValue = await getBillValue(bill.id, month, year);
            const isPaid = billValue?.isPaid || false;
            const amount = billValue?.amount || bill.amount || bill.estimatedAmount || 0;

            const statusEmoji = isPaid ? '✅' : '⏳';
            let valueText: string;

            if (bill.isVariable && !billValue) {
                valueText = '<i>Valor não definido</i>';
            } else {
                valueText = formatCurrency(amount);
                totalFixed += amount;
                if (isPaid) {
                    totalPaid += amount;
                } else {
                    totalPending += amount;
                }
            }

            text += `${statusEmoji} ${bill.dueDay.toString().padStart(2, '0')}/${month.toString().padStart(2, '0')} - ${bill.emoji} ${bill.name}: ${valueText}\n`;
        }
    }

    text += `
<b>📊 Total fixo:</b> ${formatCurrency(totalFixed)}
<b>✅ Pago:</b> ${formatCurrency(totalPaid)}
<b>⏳ Pendente:</b> ${formatCurrency(totalPending)}

${LINE}`;

    const keyboard = buildKeyboard([
        [
            { text: '➕ Adicionar', callback_data: 'bill_add' },
            { text: '✏️ Editar', callback_data: 'bill_edit' },
        ],
        [
            { text: '↩️ Voltar', callback_data: 'finances' },
        ],
    ]);

    await editMessage(chatId, messageId, text, { replyMarkup: keyboard });
}

// Card Categorias
export async function showCategoriesCard(
    chatId: number,
    messageId: number,
    userId: number
): Promise<void> {
    const entradas = await getCategories(userId, 'entrada');
    const saidas = await getCategories(userId, 'saida');

    let text = `<b>🏷️ CATEGORIAS</b>
${LINE}

<b>📥 ENTRADAS</b>
`;

    if (entradas.length === 0) {
        text += `   <i>Nenhuma categoria</i>\n`;
    } else {
        for (const cat of entradas) {
            text += `   ${cat.emoji} ${cat.name}\n`;
        }
    }

    text += `\n<b>📤 SAÍDAS</b>\n`;

    if (saidas.length === 0) {
        text += `   <i>Nenhuma categoria</i>\n`;
    } else {
        for (const cat of saidas) {
            text += `   ${cat.emoji} ${cat.name}\n`;
        }
    }

    text += `\n${LINE}`;

    const keyboard = buildKeyboard([
        [
            { text: '➕ Adicionar', callback_data: 'cat_add' },
            { text: '✏️ Editar', callback_data: 'cat_edit' },
        ],
        [
            { text: '↩️ Voltar', callback_data: 'finances' },
        ],
    ]);

    await editMessage(chatId, messageId, text, { replyMarkup: keyboard });
}

// Card Extrato
export async function showExtratoCard(
    chatId: number,
    messageId: number,
    userId: number,
    month?: number,
    year?: number
): Promise<void> {
    const now = new Date();
    const displayMonth = month || (now.getMonth() + 1);
    const displayYear = year || now.getFullYear();
    const monthName = new Date(displayYear, displayMonth - 1).toLocaleDateString('pt-BR', { month: 'long' });

    const transactions = await getMonthTransactions(userId, displayMonth, displayYear);
    const summary = await getMonthSummary(userId, displayMonth, displayYear);

    let text = `<b>📊 EXTRATO</b>
${LINE}

<b>📅 ${monthName.toUpperCase()} ${displayYear}</b>

`;

    if (transactions.length === 0) {
        text += `<i>Nenhuma transação registrada.</i>\n`;
    } else {
        const recentTransactions = transactions.slice(0, 8);
        for (const t of recentTransactions) {
            const date = new Date(t.transactionDate);
            const dayStr = date.getDate().toString().padStart(2, '0') + '/' + (date.getMonth() + 1).toString().padStart(2, '0');
            const typeEmoji = t.transactionType === 'entrada' ? '📥' : '📤';
            const catEmoji = t.categoryEmoji || '📦';
            const sign = t.transactionType === 'entrada' ? '+' : '-';
            text += `${dayStr} ${typeEmoji} ${catEmoji} ${t.categoryName || 'Outros'} ${sign}${formatCurrency(t.amount)}\n`;
        }
        if (transactions.length > 8) {
            text += `<i>... e mais ${transactions.length - 8} transações</i>\n`;
        }
    }

    text += `
${LINE}
📥 Total entradas: ${formatCurrency(summary.totalEntradas)}
📤 Total saídas: ${formatCurrency(summary.totalSaidas)}
💰 Saldo: ${formatCurrency(summary.saldo)}

${LINE}`;

    // Navegação de meses
    const prevMonth = displayMonth === 1 ? 12 : displayMonth - 1;
    const prevYear = displayMonth === 1 ? displayYear - 1 : displayYear;
    const nextMonth = displayMonth === 12 ? 1 : displayMonth + 1;
    const nextYear = displayMonth === 12 ? displayYear + 1 : displayYear;

    const keyboard = buildKeyboard([
        [
            { text: `◀️ ${new Date(prevYear, prevMonth - 1).toLocaleDateString('pt-BR', { month: 'short' })}`, callback_data: `fin_extrato_${prevMonth}_${prevYear}` },
            { text: `${new Date(nextYear, nextMonth - 1).toLocaleDateString('pt-BR', { month: 'short' })} ▶️`, callback_data: `fin_extrato_${nextMonth}_${nextYear}` },
        ],
        [
            { text: '↩️ Voltar', callback_data: 'finances' },
        ],
    ]);

    await editMessage(chatId, messageId, text, { replyMarkup: keyboard });
}

// Card Metas
export async function showGoalsCard(
    chatId: number,
    messageId: number,
    userId: number
): Promise<void> {
    const goals = await getFinancialGoals(userId);
    const activeGoals = goals.filter(g => !g.isCompleted);

    let text = `<b>🎯 METAS FINANCEIRAS</b>
${LINE}

<b>📌 METAS ATIVAS</b>

`;

    if (activeGoals.length === 0) {
        text += `<i>Nenhuma meta cadastrada.</i>\n`;
    } else {
        for (let i = 0; i < activeGoals.length; i++) {
            const goal = activeGoals[i];
            const percent = Math.round((goal.currentAmount / goal.targetAmount) * 100);
            text += `${i + 1}️⃣ ${goal.name}\n`;
            text += `   ${getProgressBar(percent)} ${percent}%\n`;
            text += `   ${formatCurrency(goal.currentAmount)} / ${formatCurrency(goal.targetAmount)}\n\n`;
        }
    }

    text += `${LINE}`;

    const keyboard = buildKeyboard([
        [{ text: '➕ Nova Meta', callback_data: 'goal_add' }],
        [{ text: '↩️ Voltar', callback_data: 'finances' }],
    ]);

    await editMessage(chatId, messageId, text, { replyMarkup: keyboard });
}

// Card Relatórios
export async function showReportsCard(
    chatId: number,
    messageId: number,
    userId: number
): Promise<void> {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    const monthName = now.toLocaleDateString('pt-BR', { month: 'long' });

    const transactions = await getMonthTransactions(userId, month, year);

    // Agrupar gastos por categoria
    const gastosPorCategoria: { [key: string]: { emoji: string; total: number } } = {};

    for (const t of transactions) {
        if (t.transactionType === 'saida') {
            const key = t.categoryName || 'Outros';
            if (!gastosPorCategoria[key]) {
                gastosPorCategoria[key] = { emoji: t.categoryEmoji || '📦', total: 0 };
            }
            gastosPorCategoria[key].total += t.amount;
        }
    }

    let text = `<b>📈 RELATÓRIOS</b>
${LINE}

<b>📅 ${monthName.toUpperCase()} ${year}</b>

<b>📊 GASTOS POR CATEGORIA</b>

`;

    const sortedCategories = Object.entries(gastosPorCategoria)
        .sort((a, b) => b[1].total - a[1].total)
        .slice(0, 6);

    if (sortedCategories.length === 0) {
        text += `<i>Sem gastos registrados.</i>\n`;
    } else {
        const maxTotal = sortedCategories[0][1].total;
        for (const [name, data] of sortedCategories) {
            const barLength = Math.round((data.total / maxTotal) * 10);
            const bar = '█'.repeat(barLength) + '░'.repeat(10 - barLength);
            text += `${data.emoji} ${name}\n   ${bar} ${formatCurrency(data.total)}\n`;
        }
    }

    text += `\n${LINE}`;

    const keyboard = buildKeyboard([
        [{ text: '↩️ Voltar', callback_data: 'finances' }],
    ]);

    await editMessage(chatId, messageId, text, { replyMarkup: keyboard });
}

// Placeholder para funcionalidades em desenvolvimento
export async function showFinancePlaceholder(
    chatId: number,
    messageId: number,
    title: string,
    message: string
): Promise<void> {
    const text = `<b>${title}</b>
${LINE}

🚧 <i>${message}</i>

${LINE}`;

    const keyboard = buildKeyboard([
        [{ text: '↩️ Voltar', callback_data: 'finances' }],
    ]);

    await editMessage(chatId, messageId, text, { replyMarkup: keyboard });
}
