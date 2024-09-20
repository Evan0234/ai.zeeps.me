import fetch from "node-fetch";
import dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

const token = process.env.TOKEN_AI; // Use the token injected by GitHub Actions
const endpoint = "https://models.inference.ai.azure.com";
const modelName = "gpt-4o";

// Function to get flight information
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

// Map function names to corresponding logic
const namesToFunctions = {
  getFlightInfo: (data) => getFlightInfo(data),
};

// Main function to communicate with GPT-4o model
export async function main(userMessage) {
  const tool = {
    type: "function",
    function: {
      name: "getFlightInfo",
      description: "Returns information about the next flight between two cities.",
      parameters: {
        type: "object",
        properties: {
          originCity: { type: "string", description: "Origin city" },
          destinationCity: { type: "string", description: "Destination city" },
        },
        required: ["originCity", "destinationCity"],
      },
    },
  };

  const messages = [
    { role: "user", content: userMessage },
  ];

  try {
    const response = await fetch(`${endpoint}/chat/completions`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages: messages,
        tools: [tool],
        model: modelName,
      }),
    });

    const data = await response.json();

    if (data.choices[0].finish_reason === "tool_calls") {
      const toolCall = data.choices[0].message.tool_calls[0];
      const functionArgs = JSON.parse(toolCall.function.arguments);
      const callableFunc = namesToFunctions[toolCall.function.name];
      const functionReturn = callableFunc(functionArgs);

      console.log(`Function result: ${functionReturn}`);
      return functionReturn;
    }
  } catch (error) {
    console.error("Error:", error.message);
    return { error: error.message };
  }
}
