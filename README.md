# NYC Subway Proxy

A small AWS-hosted middleman API that makes NYC subway real-time data easy to use.

The MTA’s GTFS Realtime feeds are **Protocol Buffers** (protobuf). They’re efficient, but not human-readable and not fun to parse on microcontrollers. This repo deploys an AWS Lambda behind an HTTP endpoint that:

1. Fetches the MTA GTFS Realtime feed (protobuf)
2. Decodes it using `gtfs-realtime-bindings`
3. Filters arrivals for a single `stopId`
4. Returns a simple JSON response (next 2 trains)

This proxy is designed to be used by the companion **nyc-subway-display** ESP32 project, but it’s useful for any client.

> This project is not affiliated with the MTA.

---

## What you get

An endpoint like:

```
GET <LAMBDA_FUNCTION_URL>/?urlSuffix=nqrw&stopId=<YOUR_STOP_ID>
```

With JSON like:

```json
{
  "station": "<YOUR_STOP_ID>",
  "arrivals": [
    { "line": "N", "minutes": 5 },
    { "line": "N", "minutes": 9 }
  ]
}
```

---

## How it works

Lambda code:

- `lambda/functions/fetch_mta/fetch_mta.mjs`

Request flow:

- `urlSuffix` (optional) selects which GTFS feed to fetch  
  Example: base URL + `-nqrw`, `-bdfm`, etc.
- `stopId` (required) selects a specific stop/direction
- The function decodes the protobuf feed and walks `feed.entity[]`
- It collects arrivals where:
  - `stopId` matches
  - arrival time exists
  - arrival is between 0 and 60 minutes from “now”
- Sorts by soonest and returns the next 2

---

## API reference

### Endpoint

`GET <LAMBDA_FUNCTION_URL>/`

### Query parameters

| Parameter   | Required | Example | Description |
|------------|----------|---------|-------------|
| `urlSuffix` | no       | `nqrw`  | Feed suffix used by the MTA endpoint (Lambda turns this into `-nqrw`) |
| `stopId`    | yes      | `R20N`  | Stop ID (often includes direction). Pulled from the static GTFS stop list. |

### Success response (200)

```json
{
  "station": "<stopId>",
  "arrivals": [
    { "line": "N", "minutes": 5 },
    { "line": "N", "minutes": 9 }
  ]
}
```
