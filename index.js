import OpenAI from "openai";

const endpoint = "https://models.inference.ai.azure.com";
const modelName = "gpt-4o";

function getFlightInfo({ originCity, destinationCity }) {
  if (originCity === "Seattle" && destinationCity === "Miami") {
    return JSON.stringify({
      airline: "Delta",
      flight_number: "DL123",
      flight_date: "May 7th, 2024",
      flight_time: "10:00 AM",
    });
  }
  return JSON.stringify({ error: "No flights found between the cities" });
}

const namesToFunctions = {
  getFlightInfo: (data) => getFlightInfo(data),
};

export async function main() {
  const tool = {
    type: "function",
    function: {
      name: "getFlightInfo",
      description: "Returns information about the next flight between two cities.",
      parameters: {
        type: "object",
        properties: {
          originCity: {
            type: "string",
            description: "The name of the city where the flight originates",
          },
          destinationCity: {
            type: "string",
            description: "The flight destination city",
          },
        },
        required: ["originCity", "destinationCity"],
      },
    },
  };

  const client = new OpenAI({ baseURL: endpoint });

  let messages = [
    { role: "system", content: "You're a friendly bot for zeeps.me." },
    { role: "user", content: "I'm interested in going to Miami. What is the next flight there from Seattle?" },
  ];

  let response = await client.chat.completions.create({
    messages: messages,
    tools: [tool],
    model: modelName,
  });

  if (response.choices[0].finish_reason === "tool_calls") {
    messages.push(response.choices[0].message);

    if (response.choices[0].message && response.choices[0].message.tool_calls.length === 1) {
      const toolCall = response.choices[0].message.tool_calls[0];
      if (toolCall.type === "function") {
        const functionArgs = JSON.parse(toolCall.function.arguments);
        const callableFunc = namesToFunctions[toolCall.function.name];
        const functionReturn = callableFunc(functionArgs);

        messages.push({
          tool_call_id: toolCall.id,
          role: "tool",
          name: toolCall.function.name,
          content: functionReturn,
        });

        response = await client.chat.completions.create({
          messages: messages,
          tools: [tool],
          model: modelName,
        });
        console.log(`Model response = ${response.choices[0].message.content}`);
      }
    }
  }
}

main().catch((err) => {
  console.error("The sample encountered an error:", err);
});
