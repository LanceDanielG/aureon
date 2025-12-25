import { billService, type Bill } from "./billService";
import { transactionService } from "./transactionService";
import type { Wallet } from "./walletService";
import { currencyService } from "./currencyService";
import { toast } from "react-hot-toast";
import { Timestamp } from "firebase/firestore";

/**
 * Calculate the next due date based on bill frequency
 */
export function calculateNextDueDate(currentDueDate: Date, frequency: Bill['frequency']): Date {
    const nextDate = new Date(currentDueDate);

    switch (frequency) {
        case 'daily':
            nextDate.setDate(nextDate.getDate() + 1);
            break;
        case 'weekly':
            nextDate.setDate(nextDate.getDate() + 7);
            break;
        case 'biweekly':
            nextDate.setDate(nextDate.getDate() + 15);
            break;
        case 'monthly':
            nextDate.setMonth(nextDate.getMonth() + 1);
            break;
        case 'once':
            // One-time bills don't recur
            return currentDueDate;
    }

    nextDate.setHours(0, 0, 0, 0);
    return nextDate;
}

/**
 * Process all due bills:
 * 1. Auto-deduct payments for bills with autoDeduct=true
 * 2. Generate new instances for recurring bills
 */
export async function processDueBills(
    bills: Bill[],
    wallets: Wallet[],
    userId: string,
    exchangeRates: Record<string, number>
): Promise<{ processed: number; failed: number; recurring: number }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let processed = 0;
    let failed = 0;
    let recurring = 0;

    // Filter bills that need processing (either for payment or recursion)
    const dueBills = bills.filter(bill => {
        // If it's recurring, we check it regardless of paid status (to generate next instances)
        if (bill.frequency !== 'once') return true;

        // If it's one-time, skip if already paid
        if (bill.isPaid) return false;

        const billDate = new Date(bill.dueDate);
        billDate.setHours(0, 0, 0, 0);

        // Include due or overdue bills for payment
        return billDate <= today && bill.autoDeduct && !!bill.walletId;
    });

    // Processing start point
    for (const bill of dueBills) {
        // ---------- 1. Auto-deduct payment ----------
        // Only if not paid, auto-deduct is on, wallet is set, and it is due
        const billDate = new Date(bill.dueDate);
        billDate.setHours(0, 0, 0, 0);

        const isDueForPayment = !bill.isPaid && bill.autoDeduct && bill.walletId && billDate <= today;

        if (isDueForPayment) {
            try {
                const wallet = wallets.find(w => w.id === bill.walletId);
                if (!wallet) {
                    console.warn(`Wallet not found for bill ${bill.id}`);
                    failed++;
                } else {
                    const walletCurrency = wallet.currency || 'USD';
                    let billAmount = bill.amount;

                    if (bill.currency !== walletCurrency) {
                        const amountUSD = currencyService.convertToUSD(bill.amount, bill.currency, exchangeRates);
                        billAmount = currencyService.convertFromUSD(amountUSD, walletCurrency, exchangeRates);
                    }

                    if (wallet.balance < billAmount) {
                        console.warn(`Insufficient balance for bill ${bill.title}`);
                        // Only toast if it's strictly due today to avoid spamming for old bills? 
                        // Or just log it. Toast might be annoying if bulk processing.
                        // toast.error(`Insufficient balance to pay ${bill.title}`, { duration: 3000 });
                        failed++;
                    } else {
                        // Use transaction service for atomic update
                        await transactionService.addTransactionWithWallet({
                            userId: userId,
                            title: `Auto-pay: ${bill.title}`,
                            subtitle: 'Automatic Bill Payment',
                            amount: -billAmount,
                            flow: 'expense',
                            categoryId: 'bills',
                            currency: walletCurrency,
                            date: new Date(),
                            walletId: bill.walletId
                        }, exchangeRates);

                        await billService.updateBill(bill.id!, { isPaid: true });

                        processed++;
                        toast.success(`Auto-paid: ${bill.title}`, { duration: 3000 });
                    }
                }
            } catch (err) {
                console.error(`Error processing bill payment ${bill.id}:`, err);
                failed++;
            }
        }

        // ---------- 2. Recurring bill generation ----------
        if (bill.frequency !== 'once') {
            try {
                // Determine where to start generating from
                // If we have a lastGeneratedDueDate, start from there.
                // Otherwise start from the bill's own dueDate.

                let lastGenDate: Date;
                if (bill.lastGeneratedDueDate) {
                    lastGenDate = bill.lastGeneratedDueDate instanceof Timestamp
                        ? bill.lastGeneratedDueDate.toDate()
                        : new Date(bill.lastGeneratedDueDate);
                } else {
                    lastGenDate = bill.dueDate instanceof Timestamp
                        ? bill.dueDate.toDate()
                        : new Date(bill.dueDate);
                }

                // Helper to ensure we don't mutate original
                let cursorDate = new Date(lastGenDate);
                cursorDate.setHours(0, 0, 0, 0);

                // If this is the first run (no lastGenDate recorded), we might need to verify 
                // if we should generate the *next* one or if the *current* one counts.
                // Usually: current bill exists. We want to generate the NEXT one.
                // So if we haven't generated anything yet, the first generation check starts from dueDate.

                // Example: Bill due Jan 1. Today Jan 5. Frequency Daily.
                // We want Jan 2, Jan 3, Jan 4, Jan 5.
                // nextDueDate(Jan 1) -> Jan 2.
                // Jan 2 <= Jan 5? Yes. Create. Recurse.

                let nextDueDate = calculateNextDueDate(cursorDate, bill.frequency);
                let newlyGeneratedCount = 0;
                let lastSuccessfullyGeneratedDate = cursorDate;

                while (nextDueDate <= today) {
                    // Clone date for storage
                    const dueDateToSave = new Date(nextDueDate);
                    dueDateToSave.setHours(0, 0, 0, 0);

                    // Check if this specific instance already exists
                    // We check by: same parent + same due date OR same title + same amount + same due date
                    const alreadyExists = bills.some(b => {
                        const bDate = b.dueDate instanceof Timestamp ? b.dueDate.toDate() : new Date(b.dueDate);
                        bDate.setHours(0, 0, 0, 0);

                        const dateMatch = bDate.getTime() === dueDateToSave.getTime();
                        if (!dateMatch) return false;

                        if (bill.id && b.parentBillId === bill.id) return true;

                        // Fallback checking for legacy data or if parentBillId missing
                        return b.title === bill.title && b.amount === bill.amount && !b.isPaid;
                    });

                    if (!alreadyExists) {
                        await billService.addBill({
                            userId: bill.userId,
                            title: bill.title,
                            amount: bill.amount,
                            currency: bill.currency,
                            dueDate: dueDateToSave,
                            category: bill.category,
                            isPaid: false,
                            frequency: 'once', // Generated instances are one-time
                            walletId: bill.walletId,
                            autoDeduct: bill.autoDeduct,
                            parentBillId: bill.id
                        });

                        recurring++;
                        newlyGeneratedCount++;
                        lastSuccessfullyGeneratedDate = nextDueDate;
                    } else {
                        // Duplicate found, skip
                        lastSuccessfullyGeneratedDate = nextDueDate;
                    }

                    nextDueDate = calculateNextDueDate(nextDueDate, bill.frequency);
                }

                // Update the parent bill with the progress
                // We update this even if we skipped duplicates, to advance the cursor.
                if (lastSuccessfullyGeneratedDate > lastGenDate) {
                    await billService.updateBill(bill.id!, {
                        lastGeneratedDueDate: lastSuccessfullyGeneratedDate
                    });
                }

            } catch (err) {
                console.error(`Error creating recurring bills for ${bill.id}:`, err);
            }
        }
    }

    return { processed, failed, recurring };
}

/**
 * Check if bills need processing (used to determine if we should run the processor)
 */
export function hasDueBills(bills: Bill[]): boolean {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return bills.some(bill => {
        if (!bill.autoDeduct || bill.isPaid || !bill.walletId) return false;

        const billDate = new Date(bill.dueDate);
        billDate.setHours(0, 0, 0, 0);

        return billDate <= today;
    });
}
