// Local driver for the Lambda handler (no deploy needed).
// Requires gtfs-realtime-bindings resolvable from the repo root:
//   npm i --no-save gtfs-realtime-bindings
// Usage: node scripts/test_local.mjs [urlSuffix] [stopId]
process.env.DEVICE_KEY ??= "test-key";

const { lambda_handler } = await import("../lambda/functions/fetch_mta/fetch_mta.mjs");

const res = await lambda_handler({
    headers: { "x-device-key": process.env.DEVICE_KEY },
    queryStringParameters: {
        urlSuffix: process.argv[2] ?? "nqrw",
        stopId: process.argv[3] ?? "R20",
    },
});

console.log(res.statusCode);
console.log(JSON.stringify(JSON.parse(res.body), null, 2));
