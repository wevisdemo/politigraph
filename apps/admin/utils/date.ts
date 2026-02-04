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

	const yyyy = date.getFullYear() + 543;
	const monthNames = [
		'ม.ค.',
		'ก.พ.',
		'มี.ค.',
		'เม.ย.',
		'พ.ค.',
		'มิ.ย.',
		'ก.ค.',
		'ส.ค.',
		'ก.ย.',
		'ต.ค.',
		'พ.ย.',
		'ธ.ค.',
	];
	const month = monthNames[date.getMonth()];
	const dd = String(date.getDate()).padStart(2, '0');
	return `${dd} ${month} ${yyyy}`;
};
