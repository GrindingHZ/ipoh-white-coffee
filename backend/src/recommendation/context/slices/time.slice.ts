export function timeSlice(
  serverTime: Date,
  typicalDepartureTime: string | null,
): string {
  const hour = serverTime.getHours();
  const typicalHour = typicalDepartureTime
    ? parseInt(typicalDepartureTime.split(':')[0], 10)
    : null;

  const isFirstTap = hour < 10;
  const isLateReconsideration = typicalHour !== null && hour > typicalHour + 3;

  if (isLateReconsideration) {
    return `Current time: ${serverTime.toTimeString().slice(0, 5)}. Fisher is reconsidering late — typical departure was around ${typicalDepartureTime}.`;
  }
  if (isFirstTap) {
    return `Current time: ${serverTime.toTimeString().slice(0, 5)}. First check of the day before departure.`;
  }
  return `Current time: ${serverTime.toTimeString().slice(0, 5)}.`;
}
