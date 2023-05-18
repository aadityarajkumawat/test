import { createParser } from "eventsource-parser";

// add vercel config for running the function on edge
export const config = {
  runtime: "edge",
};

export default async function (req) {
  const kluEndpointUrl = "https://api.klu.ai/v1/actions/";
  const kluToken = "EeebQD9I6ZOi4LYDtqENg606h6Oe5VUUtyg//Lix+/8=";

  try {
    const { question } = await req.json();

    const response = await fetch(kluEndpointUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${kluToken}`,
      },
      body: JSON.stringify({
        prompt: question,
        agent: "6ed64af3-7f0d-4751-8573-5570b4ee3f16", // davinci
        // agent: "995e9d20-b208-45ef-b001-020fe5cc3d21", // claude
        streaming: "true",
      }),
    });

    const data = await response.json();

    if (!data.msg) {
      const errorMessage = `Unexpected response: ${JSON.stringify(data)}`;
      throw new Error(errorMessage);
    }

    const streamingUrl = data.streaming_url;
    if (!streamingUrl) {
      throw new Error("No streaming url");
    }

    const streamRes = await fetch(streamingUrl);

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    const stream = new ReadableStream({
      async start(controller) {
        const onParse = (event) => {
          if (event.type === "event") {
            const data = event.data;

            if (data.includes("END_STREAM")) {
              controller.close();
              return;
            }

            try {
              if (data !== "BEGIN_STREAM") {
                let token = JSON.parse(data).token;
                const queue = encoder.encode(token);
                controller.enqueue(queue);
              }
            } catch (e) {
              controller.error(e);
            }
          }
        };

        const parser = createParser(onParse);

        for await (const chunk of streamRes.body) {
          parser.feed(decoder.decode(chunk));
        }
      },
    });

    return new Response(stream);
  } catch (error) {
    console.error(error);
    return new Response(error.message, { status: 500 });
  }
}
