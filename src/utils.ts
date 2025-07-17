const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

/**
 * Create a random string of the given length.
 * @param length - The length of the string to create.
 * @returns A random string of the given length.
 */
export function createRandomString(length = 12): string {
	let result = "";
	for (let i = 0; i < length; i++) {
		result += chars.charAt(Math.floor(Math.random() * chars.length));
	}
	return result;
}

/**
 * Check if the given value is an Error.
 * @param error - The value to check.
 * @returns True if the value is an Error, false otherwise.
 */
export const isError = (error: unknown): error is Error => {
	if (typeof error === "object" && error !== null && error instanceof Error) {
		return true;
	}
	return false;
};

type SerializableObject = {
	toString: () => string;
};

/**
 * Check if the given value is serializable.
 * @param error - The value to check.
 * @returns True if the value is serializable, false otherwise.
 */
export const isSerializableObject = (
	error: unknown,
): error is SerializableObject => {
	if (typeof error === "object" && error !== null && "toString" in error) {
		return true;
	}
	return false;
};
