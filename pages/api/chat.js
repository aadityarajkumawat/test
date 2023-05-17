// add vercel config for running the function on edge
export const config = {
  runtime: "edge",
};

export default async function (req, res) {
  const kluEndpointUrl = "https://api.klu.ai/v1/actions/";
  const kluToken = "EeebQD9I6ZOi4LYDtqENg606h6Oe5VUUtyg//Lix+/8=";

  try {
    const response = await fetch(kluEndpointUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${kluToken}`,
      },
      body: JSON.stringify({
        prompt: req.body.question,
        action: "6ed64af3-7f0d-4751-8573-5570b4ee3f16", // davinci
        // action: "995e9d20-b208-45ef-b001-020fe5cc3d21", // claude
        streaming: "true",
      }),
    });

    if (!response.ok) {
      const errorMessage = `Request failed with status ${response.status}: ${response.statusText}`;
      return res.status(response.status).json({ error: errorMessage });
    }

    console.log("response", response);

    const data = await response.json();

    console.log("data", data);

    if (!data.msg) {
      const errorMessage = `Unexpected response: ${JSON.stringify(data)}`;
      return res.status(500).json({ error: errorMessage });
    }

    const streamingUrl = data.streaming_url;

    console.log("streamingUrl", streamingUrl);

    if (!streamingUrl) {
      return;
    }

    const streamRes = await fetch(streamingUrl, { method: "GET" });

    if (!streamRes.ok) {
      const errorMessage = `Stream request failed with status ${streamRes.status}.`;
      return res.status(streamRes.status).json({ error: errorMessage });
    }

    const reader = streamRes.body?.getReader();
    if (!reader) return;

    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }

      let chunk = new TextDecoder("utf-8").decode(value).trim();

      if (chunk.includes("END_STREAM")) {
        return res.end("END_STREAM");
      }

      if (chunk.includes("BEGIN_STREAM")) {
        continue;
      }

      const chunkData = JSON.parse(chunk.substring(6));

      if (chunkData.token === null || chunkData.token === undefined) {
        return;
      }

      res.write(chunkData.token);
    }

    return res.status(200).end("END_STREAM");
  } catch (error) {
    console.error(error);
    return res.status(500).end("END_STREAM");
  }
}
