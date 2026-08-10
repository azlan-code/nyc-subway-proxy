import GtfsRealtimeBindings from "gtfs-realtime-bindings";
import stops from "./stops.json" with { type: "json" };

export const lambda_handler = async (event) => {
    const deviceKey = event.headers?.["x-device-key"];
    if (deviceKey !== process.env.DEVICE_KEY) {
        return error_response("Unauthorized", 401);
    }

    const BASE_URL = "https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs";
    const queryParams = event.queryStringParameters;

    if (!queryParams) return error_response("No query parameters provided");

    const urlSuffix = queryParams.urlSuffix ? `-${queryParams.urlSuffix}` : "";
    let stopId = queryParams.stopId;
    if (!stopId) return error_response("Stop id is required");
    stopId = stopId.toUpperCase().replace(/[NS]$/, "");

    const resp = await fetch(BASE_URL + urlSuffix);
    if (!resp.ok) {
        return error_response("Failed to fetch MTA data", 500);
    }  

    const buffer = await resp.arrayBuffer();
    const feed = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(
        new Uint8Array(buffer)
    );

    const now = Math.floor(Date.now() / 1000);
    const northId = stopId + "N";
    const southId = stopId + "S";
    const northbound = [];
    const southbound = [];

    for (const entity of feed.entity) {
        const tu = entity.tripUpdate;
        if (!tu) continue;

        const line = tu.trip?.routeId;
        if (!line) continue;

        const updates = tu.stopTimeUpdate ?? [];
        if (updates.length === 0) continue;

        // stopTimeUpdate only lists the trip's remaining stops, so the last one is its terminal
        const lastId = updates[updates.length - 1].stopId;
        const terminalId = lastId ? lastId.replace(/[NS]$/, "") : null;
        const destination = terminalId ? (stops[terminalId] ?? terminalId) : null;

        for (const { stopId: id, arrival } of updates) {
            if ((id !== northId && id !== southId) || !arrival?.time) continue;

            const minutes = Math.round((Number(arrival.time) - now) / 60);
            if (minutes > 0) {
                (id === northId ? northbound : southbound).push({ line, minutes, destination });
            }
        }
    }

    const byTime = (a, b) => a.minutes - b.minutes;

    return success_response({
        station: stopId,
        stationName: stops[stopId] ?? null,
        northbound: northbound.sort(byTime).slice(0, 5),
        southbound: southbound.sort(byTime).slice(0, 5),
    });
}

function error_response(message, statusCode=400) {
    return {
        statusCode: statusCode,
        body: JSON.stringify({
            "message": message
        }),
    };
}

function success_response(body) {
    return {
        statusCode: 200,
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
    };
}