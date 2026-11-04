/**
 * Converts a string in YYYY-MM-DD format to a Date object
 * @param d - string in 'YYYY-MM-DD' format or null
 * @returns Date object or null
 */
export const parseDate = (d: string | null): Date | null => {
	if (!d) return null;
	const [year, month, day] = d.split('-').map(Number);
	return new Date(year, month - 1, day);
};

/**
 * Converts a Date object (or string) to a string in YYYY-MM-DD format
 * @param d - Date object, string, or null
 * @returns string in 'YYYY-MM-DD' format or null
 */
export const formatDate = (d: Date | string | null): string | null => {
	if (!d) return null;

	const date =
		typeof d === 'string' ? new Date(d.length === 10 ? `${d}T00:00:00` : d) : d;

	if (isNaN(date.getTime())) return null;

	return date.toLocaleDateString('th-TH', {
		year: 'numeric',
		month: 'short',
		day: 'numeric',
	});
};

/**
 * Sets a new start date, and moves the end date with it while the end date is empty or still the same day as the old start
 * @param dates - current start and end dates
 * @param start_date - new start date, or null to clear it
 * @returns the updated dates, keeping an end date the user set separately
 */
export const withStartDate = <
	T extends { start_date?: string | null; end_date?: string | null },
>(
	dates: T,
	start_date: string | null,
): T => ({
	...dates,
	start_date,
	end_date:
		!dates.end_date || dates.end_date === dates.start_date
			? start_date
			: dates.end_date,
});

/**
 * Converts a Date object (or string) to a string in YYYY-MM-DD format for persistence
 * @param d - Date object, string, or null
 * @returns string in 'YYYY-MM-DD' format or null
 */
export const serializeDate = (d: Date | string | null): string | null => {
	if (!d) return null;

	const date =
		typeof d === 'string' ? new Date(d.length === 10 ? `${d}T00:00:00` : d) : d;

	if (isNaN(date.getTime())) return null;

	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
};
