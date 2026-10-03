import { withRoute } from "@/lib/apiResponse";
import { handleTelemetryRequest } from "@/lib/telemetryIngest";

export const runtime = "nodejs";

export const POST = withRoute(async (request, { params }) => handleTelemetryRequest(request, (await params).token));
