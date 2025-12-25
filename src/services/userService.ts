import { updateProfile, type User } from "firebase/auth";

export const userService = {
    updateUserProfile: async (user: User, data: { displayName?: string; photoURL?: string }) => {
        try {
            await updateProfile(user, data);
            return { success: true };
        } catch (error: any) {
            console.error("Error updating profile:", error);
            throw new Error(error.message || "Failed to update profile");
        }
    }
};
