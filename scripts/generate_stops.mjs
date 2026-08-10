// Regenerates lambda/functions/fetch_mta/stops.json from the MTA's station list.
// Run manually when the MTA renames or opens stations: node scripts/generate_stops.mjs
import { writeFile } from "node:fs/promises";

const CSV_URL = "http://web.mta.info/developers/data/nyct/subway/Stations.csv";

const resp = await fetch(CSV_URL);
if (!resp.ok) throw new Error(`Fetch failed: ${resp.status} ${resp.statusText}`);
const text = await resp.text();

function parseLine(line) {
    const fields = [];
    let cur = "", inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        const c = line[i];
        if (inQuotes) {
            if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; }
            else if (c === '"') inQuotes = false;
            else cur += c;
        } else if (c === '"') inQuotes = true;
        else if (c === ",") { fields.push(cur); cur = ""; }
        else cur += c;
    }
    fields.push(cur);
    return fields;
}

const lines = text.split(/\r?\n/).filter((l) => l.trim());
const header = parseLine(lines[0]);
const idCol = header.indexOf("GTFS Stop ID");
const nameCol = header.indexOf("Stop Name");
if (idCol === -1 || nameCol === -1) {
    throw new Error(`Expected columns not found in header: ${lines[0]}`);
}

const stops = {};
for (const line of lines.slice(1)) {
    const fields = parseLine(line);
    const id = fields[idCol]?.trim();
    if (id) stops[id] = fields[nameCol].trim();
}

const out = new URL("../lambda/functions/fetch_mta/stops.json", import.meta.url);
await writeFile(out, JSON.stringify(stops, null, 1) + "\n");
console.log(`Wrote ${Object.keys(stops).length} stops to ${out.pathname}`);
