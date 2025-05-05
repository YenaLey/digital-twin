export async function GET() {
  const token = process.env.TANDEM_TOKEN || "<3-Legged Token>";
  const modelUrn = process.env.TANDEM_MODEL_URN || "<Tandem Model URN>";
  const streamIds = [
    "AQAAAMnQ2pAQd0IOhK647hF6A30AAAAA", // 빨강 LED
    "AQAAAKBmehwDIEhirCRRkXjT_GIAAAAA", // 초록 LED
    "AQAAAFTDpe_Zg0hFhKJalFYSkioAAAAA", // 노랑 LED
  ];

  const result: Record<string, number> = {};

  try {
    for (const id of streamIds) {
      const res = await fetch(
        `https://tandem.autodesk.com/api/v1/timeseries/models/${modelUrn}/streams/${id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await res.json();

      const keys = Object.keys(data);
      if (keys.length > 0) {
        const streamKey = keys[0];
        const streamValues = data[streamKey];
        const timestamps = Object.keys(streamValues);
        if (timestamps.length > 0) {
          const latestTimestamp = timestamps.sort().at(-1)!;
          result[id] = streamValues[latestTimestamp];
        } else {
          result[id] = 0;
        }
      } else {
        result[id] = 0;
      }
    }

    return Response.json({
      led1: result["AQAAAMnQ2pAQd0IOhK647hF6A30AAAAA"] ?? 0,
      led2: result["AQAAAKBmehwDIEhirCRRkXjT_GIAAAAA"] ?? 0,
      led3: result["AQAAAFTDpe_Zg0hFhKJalFYSkioAAAAA"] ?? 0,
    });
  } catch (err) {
    console.error("Tandem fetch error:", err);
    return new Response("Error fetching stream data", { status: 500 });
  }
}
