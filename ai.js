import OpenAI from "openai";

const token = process.env["TOKEN_AI"];  // Using TOKEN_AI instead of GITHUB_TOKEN or 4o_TOKEN
const endpoint = "https://models.inference.ai.azure.com";
const modelName = "gpt-4o";

function getFlightInfo({originCity, destinationCity}) {
  if (originCity === "Seattle" && destinationCity === "Miami") {
    return JSON.stringify({
      airline: "Delta",
      flight_number: "DL123",
      flight_date: "May 7th, 2024",
      flight_time: "10:00AM",
    });
  }
  return JSON.stringify({ error: "No flights found between the cities" });
}

const namesToFunctions = {
  getFlightInfo: (data) => getFlightInfo(data),
};

export async function main(userMessage, systemPrompt = null) {
  const tool = {
    "type": "function",
    "function": {
      name: "getFlightInfo",
      description:
        "Returns information about the next flight between two cities." +
        "This includes the name of the airline, flight number, and the date and time" +
        "of the next flight",
      parameters: {
        "type": "object",
        "properties": {
          "originCity": {
            "type": "string",
            "description": "The name of the city where the flight originates",
          },
          "destinationCity": {
            "type": "string",
            "description": "The flight destination city",
          },
        },
        "required": ["originCity", "destinationCity"],
      },
    },
  };

  const client = new OpenAI({ baseURL: endpoint, apiKey: token });

  let messages = [];
  
  if (systemPrompt) {
    messages.push({ role: "system", content: systemPrompt });
  }
  
  messages.push({ role: "user", content: userMessage });

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
        console.log(`Calling function \`${toolCall.function.name}\` with arguments ${toolCall.function.arguments}`);
        const callableFunc = namesToFunctions[toolCall.function.name];
        const functionReturn = callableFunc(functionArgs);
        console.log(`Function returned = ${functionReturn}`);

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

  return response.choices[0].message.content;
}
