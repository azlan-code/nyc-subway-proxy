# NYC Subway Proxy

A small AWS-hosted middleman API that makes NYC subway real-time data easy to use.

The MTA’s GTFS Realtime feeds are **Protocol Buffers** (protobuf). They’re efficient, but not human-readable and not fun to parse on microcontrollers. This repo deploys an AWS Lambda behind an HTTP endpoint that:

1. Fetches the MTA GTFS Realtime feed (protobuf)
2. Decodes it using `gtfs-realtime-bindings`
3. Filters arrivals for a single station
4. Returns a simple JSON response (next 5 trains in each direction, with human-readable destinations)

This proxy is designed to be used by the companion **nyc-subway-display** ESP32 project, but it’s useful for any client.

> This project is not affiliated with the MTA.

---

## What you get

An endpoint like:

```
GET <LAMBDA_FUNCTION_URL>/?urlSuffix=nqrw&stopId=R20
```

With JSON like:

```json
{
  "station": "R20",
  "stationName": "14 St-Union Sq",
  "northbound": [
    { "line": "N", "minutes": 3, "destination": "Astoria-Ditmars Blvd" },
    { "line": "Q", "minutes": 7, "destination": "96 St" }
  ],
  "southbound": [
    { "line": "R", "minutes": 2, "destination": "Bay Ridge-95 St" },
    { "line": "N", "minutes": 9, "destination": "Coney Island-Stillwell Av" }
  ]
}
```

---

## How it works

Lambda code:

- `lambda/functions/fetch_mta/fetch_mta.mjs`
- `lambda/functions/fetch_mta/stops.json` — station ID → name lookup, bundled with the function

Request flow:

- `urlSuffix` (optional) selects which GTFS feed to fetch  
  Example: base URL + `-nqrw`, `-bdfm`, etc.
- `stopId` (required) selects a station (parent stop ID, no direction suffix)
- The function decodes the protobuf feed and walks `feed.entity[]`
- It collects arrivals where:
  - the stop matches `<stopId>N` (northbound) or `<stopId>S` (southbound)
  - arrival time exists and is in the future
- Each train's `destination` is the last remaining stop of its trip, looked up in `stops.json`
- Sorts by soonest and returns up to 5 trains per direction

Station names come from the MTA's [Stations.csv](http://web.mta.info/developers/data/nyct/subway/Stations.csv). To refresh `stops.json` (e.g. after the MTA renames or opens stations):

```
node scripts/generate_stops.mjs
```

---

## API reference

### Endpoint

`GET <LAMBDA_FUNCTION_URL>/`

### Query parameters

| Parameter   | Required | Example | Description |
|------------|----------|---------|-------------|
| `urlSuffix` | no       | `nqrw`  | Feed suffix used by the MTA endpoint (Lambda turns this into `-nqrw`) |
| `stopId`    | yes      | `R20`   | Parent station ID, no N/S direction suffix (a suffix is tolerated and stripped). Pulled from the static GTFS stop list. |

### Success response (200)

```json
{
  "station": "R20",
  "stationName": "14 St-Union Sq",
  "northbound": [
    { "line": "N", "minutes": 3, "destination": "Astoria-Ditmars Blvd" }
  ],
  "southbound": [
    { "line": "R", "minutes": 2, "destination": "Bay Ridge-95 St" }
  ]
}
```

`stationName` and `destination` are `null` when the station ID isn't in `stops.json` (for destinations, the raw stop ID is used as a fallback before giving up). Arrays are sorted soonest-first with up to 5 entries each; a direction with no upcoming service is an empty array.
