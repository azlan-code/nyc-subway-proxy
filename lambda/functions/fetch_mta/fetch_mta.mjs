import GtfsRealtimeBindings from "gtfs-realtime-bindings";

export const lambda_handler = async (event) => {
    const deviceKey = event.headers?.["x-device-key"];
    if (deviceKey !== process.env.DEVICE_KEY) {
        return error_response("Unauthorized", 401);
    }

    const BASE_URL = "https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs";
    const queryParams = event.queryStringParameters;

    if (!queryParams) return error_response("No query parameters provided");

    const urlSuffix = queryParams.urlSuffix ? `-${queryParams.urlSuffix}` : "";
    const stopId = queryParams.stopId;
    if (!stopId) return error_response("Stop id is required");

    const resp = await fetch(BASE_URL + urlSuffix);
    if (!resp.ok) {
        return error_response("Failed to fetch MTA data", 500);
    }  

    const buffer = await resp.arrayBuffer();
    const feed = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(
        new Uint8Array(buffer)
    );

    const now = Math.floor(Date.now() / 1000);
    const arrivals = [];

    for (const entity of feed.entity) {
        const tu = entity.tripUpdate;
        if (!tu) continue;

        const line = tu.trip?.routeId;
        if (!line) continue;

        for (const { stopId: id, arrival } of tu.stopTimeUpdate ?? []) {
            if (id !== stopId || !arrival?.time) continue;

            const minutes = Math.round((Number(arrival.time) - now) / 60);
            if (minutes > 0 && minutes < 60) {
                arrivals.push({ line, minutes });
            }
        }
    }

    arrivals.sort((a, b) => a.minutes - b.minutes);
    const nextArrivals = arrivals.slice(0, 2);

    return success_response({
        station: stopId,
        arrivals: nextArrivals,
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