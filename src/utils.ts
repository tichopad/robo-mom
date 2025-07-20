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
