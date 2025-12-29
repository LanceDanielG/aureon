/**
 * Validation Utility Functions
 */

export const validationUtils = {
    /**
     * Checks if a string is valid (not null, undefined, or empty/whitespace only)
     */
    isValidString: (str: any): boolean => {
        return typeof str === 'string' && str.trim().length > 0;
    },

    /**
     * Checks if a value is a valid number (not NaN, finite)
     */
    isValidNumber: (num: any): boolean => {
        return typeof num === 'number' && !isNaN(num) && isFinite(num);
    },

    /**
     * Sanitizes a string by basic trimming. 
     * For HTML sanitization, a library like DOMPurify would be needed, 
     * but for Firestore text storage, ensuring it's a string is the primary step.
     */
    sanitizeString: (str: string): string => {
        return str ? str.trim() : '';
    }
};
