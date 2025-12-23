import { billService, type Bill } from "./billService";
import { transactionService } from "./transactionService";
import type { Wallet } from "./walletService";
import { currencyService } from "./currencyService";
import { toast } from "react-hot-toast";

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

    return nextDate;
}

/**
 * Process all due bills with auto-deduct enabled
 * Returns the number of bills processed
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

    // Filter bills that are due and need processing
    const dueBills = bills.filter(bill => {
        if (bill.isPaid) return false; // Skip already paid bills

        const billDate = new Date(bill.dueDate);
        billDate.setHours(0, 0, 0, 0);

        // Include bills that are overdue (for auto-deduct or recurring creation)
        if (billDate <= today) {
            // Process if auto-deduct is enabled, OR if it's a recurring bill that needs new instances
            return bill.autoDeduct && bill.walletId || bill.frequency !== 'once';
        }

        return false;
    });

    console.log(`Processing ${dueBills.length} due bills`);

    for (const bill of dueBills) {
        // Handle auto-deduct payment if enabled and wallet is linked
        if (bill.autoDeduct && bill.walletId) {
            try {
                // Find the linked wallet
                const wallet = wallets.find(w => w.id === bill.walletId);
                if (!wallet) {
                    console.warn(`Wallet not found for bill ${bill.id}`);
                    failed++;
                } else {
                    const walletCurrency = wallet.currency || 'USD';
                    let billAmount = bill.amount;

                    // Convert bill amount to wallet currency if needed
                    if (bill.currency !== walletCurrency) {
                        const amountUSD = currencyService.convertToUSD(bill.amount, bill.currency, exchangeRates);
                        billAmount = currencyService.convertFromUSD(amountUSD, walletCurrency, exchangeRates);
                    }

                    // Check if wallet has sufficient balance
                    if (wallet.balance < billAmount) {
                        console.warn(`Insufficient balance for bill ${bill.title}`);
                        toast.error(`Insufficient balance to pay ${bill.title}`, { duration: 3000 });
                        failed++;
                    } else {
                        // Create expense transaction
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

                        // Mark bill as paid
                        await billService.updateBill(bill.id!, { isPaid: true });

                        processed++;
                        toast.success(`Auto-paid: ${bill.title}`, { duration: 3000 });
                    }
                }
            } catch (error) {
                console.error(`Error processing bill ${bill.id}:`, error);
                failed++;
            }
        }

        // Create recurring bills regardless of payment success
        // This ensures recurring bills are created even if payment fails
        try {
            if (bill.frequency !== 'once') {
                let nextDueDate = calculateNextDueDate(bill.dueDate, bill.frequency);
                const todayDate = new Date();
                todayDate.setHours(0, 0, 0, 0);

                console.log(`[Recurring] Checking ${bill.title}: next=${nextDueDate.toDateString()}, today=${todayDate.toDateString()}, freq=${bill.frequency}`);

                // Create all missed recurring instances up to today
                while (nextDueDate <= todayDate) {
                    console.log(`[Recurring] Creating bill for ${nextDueDate.toDateString()}`);
                    await billService.addBill({
                        userId: bill.userId,
                        title: bill.title,
                        amount: bill.amount,
                        currency: bill.currency,
                        dueDate: nextDueDate,
                        category: bill.category,
                        isPaid: false,
                        frequency: bill.frequency,
                        walletId: bill.walletId,
                        autoDeduct: bill.autoDeduct
                    });

                    recurring++;
                    nextDueDate = calculateNextDueDate(nextDueDate, bill.frequency);
                }

                if (recurring > 0) {
                    console.log(`[Recurring] Created ${recurring} new bill instances`);
                }
            }
        } catch (error) {
            console.error(`Error creating recurring bills for ${bill.id}:`, error);
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
