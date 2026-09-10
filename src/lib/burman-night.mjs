const tallinnHour = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/Tallinn", hour: "2-digit", hourCycle: "h23",
});

export function isBurmanNight(date = new Date()) {
  const hour = Number(tallinnHour.format(date));
  return hour >= 22 || hour < 7;
}

export function shouldShowBurmanNight(now, lastActivity, preview = false) {
  return (preview || isBurmanNight(new Date(now))) && now - lastActivity >= 30_000;
}
