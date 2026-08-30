import { writeFile } from 'node:fs/promises';

const source = 'https://new.spacex.com/launches';
const html = await fetch(source, { headers: { 'user-agent': 'SpaceXLaunchesPersonalDashboard/1.0 (+GitHub Pages)' } }).then(async response => {
  if (!response.ok) throw new Error(`SpaceX returned ${response.status}`);
  return response.text();
});
const text = html.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, '\n').replace(/&amp;/g, '&').replace(/\r/g, '').split('\n').map(line => line.trim()).filter(Boolean);
function between(start, end) {
  const from = text.findIndex(line => line.toLowerCase() === start.toLowerCase());
  const to = text.findIndex((line, index) => index > from && line.toLowerCase() === end.toLowerCase());
  if (from < 0 || to < 0) throw new Error(`Could not find ${start} / ${end} on the official page`);
  return text.slice(from, to);
}
function rows(lines) {
  const header = lines.findIndex(line => line === 'Mission'); if (header < 0) throw new Error('Official launch-table header not found');
  const data = [];
  for (let i = header + 5; i + 3 < lines.length; i += 5) {
    const [mission, vehicle, launchSite, landingSite, launchDate] = lines.slice(i, i + 5);
    if (['Falcon 9', 'Falcon Heavy', 'Starship'].includes(vehicle)) {
      const hasClockTime = /\b\d{1,2}:\d{2}(?::\d{2})?\b/.test(launchDate || '');
      const parsed = hasClockTime ? Date.parse(launchDate) : Number.NaN;
      data.push({ mission, vehicle, launchSite, landingSite, launchDate: launchDate || null, launchTime: Number.isNaN(parsed) ? null : new Date(parsed).toISOString() });
    }
  }
  return data;
}
const completedStart = text.findIndex(line => line === 'Completed missions');
if (completedStart < 0) throw new Error('Official completed-missions section not found');
const payload = { updatedAt: new Date().toISOString(), source, upcoming: rows(between('Upcoming launches', 'Completed missions')), completed: rows(text.slice(completedStart)) };
await writeFile('data/launches.json', `${JSON.stringify(payload, null, 2)}\n`);
