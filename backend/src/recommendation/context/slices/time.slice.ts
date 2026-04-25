const MYT = 'Asia/Kuala_Lumpur';

export function timeSlice(
  serverTime: Date,
  typicalDepartureTime: string | null,
): string {
  const fmt = new Intl.DateTimeFormat('en-MY', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: MYT,
  });
  const timeStr = fmt.format(serverTime);
  const hour = parseInt(timeStr.split(':')[0], 10);

  const typicalHour = typicalDepartureTime
    ? parseInt(typicalDepartureTime.split(':')[0], 10)
    : null;

  const isFirstTap = hour < 10;
  const isLateReconsideration = typicalHour !== null && hour > typicalHour + 3;

  if (isLateReconsideration) {
    return `Current time: ${timeStr} MYT. Fisher is reconsidering late — typical departure was around ${typicalDepartureTime}.`;
  }
  if (isFirstTap) {
    return `Current time: ${timeStr} MYT. First check of the day before departure.`;
  }
  return `Current time: ${timeStr} MYT.`;
}
