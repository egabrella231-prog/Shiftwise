import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

// Lazy-initialized Gemini client
let aiClient: GoogleGenAI | null = null;
function getGeminiClient() {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("GEMINI_API_KEY is not defined in environment variables.");
    }
    aiClient = new GoogleGenAI({
      apiKey: apiKey || "MOCK_KEY",
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

// REST API endpoint: AI Roster Assistant
app.post("/api/gemini/roster-assistant", async (req, res) => {
  try {
    const { message, rosterState, month, currentMonth, employees } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    // Proactive check for GEMINI_API_KEY secret
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === "MY_GEMINI_API_KEY" || apiKey.trim() === "" || apiKey === "YOUR_API_KEY") {
      return res.json({
        reply: "Awe my friend! 🇳🇦 To activate my AI brain, please go to the Settings menu (top right gears icon of Google AI Studio) and configure your `GEMINI_API_KEY` secret. Once you save it, I can help you draft schedules and answer questions instantly! Sharp sharp!",
        actions: []
      });
    }

    const selectedMonth = month || currentMonth;

    const ai = getGeminiClient();
    const systemInstruction = `
You are the "ShiftWise Namibia AI Roster Assistant" representing Namibia's top shift scheduling system.
You speak in friendly Namibian English (use colloquial terms occasionally like "Awe!", "sharp sharp", "lekker", "my friend", "Namibia", "how is it?").
Your objective is to read the current roster state, the selected month, and user's text requests, and map them into specific structured roster update actions.
Only perform actions that can be executed. Output a helpful, warm friendly reply as well.

Selected month context: ${selectedMonth}
Existing employees list: ${JSON.stringify(employees || [])}
Current roster state for these employees: ${JSON.stringify(rosterState || {})}

Roster Action Schema Definitions:
1. set_shift: Assign shift to employee for specific days
   - employeeId: string
   - days: number[] (days of the month, from 1 up to 28, 29, 30, or 31 depending on month length)
   - shiftType: string ("D" = Day shift, "N" = Night shift, "O" = Off, "X" = Leave, "PH" = Public Holiday)
2. auto_fill: Run general 6-day cycle roster auto-fill for all employees
3. clear_all: Clear entire roster changes
4. clear_employee: Clear roster for one employee
   - employeeId: string
5. set_day_of_week: Set specific day of the week to a shift for ALL employees
   - dayOfWeek: string ("Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday")
   - shiftType: string ("D", "N", "O", "X")

Answer requirements:
Always provide a JSON response mapping strictly to our response schema:
{
  "reply": "friendly Namibian greeting and explanation of what was changed, including answers to questions",
  "actions": Array of actions to execute
}
If answering a question like "Who has the most hours this month?", inspect the rosterState, calculate hours, provide the answer in the "reply" field with "actions" as empty array.
If multiple employees have similar names (e.g., Samuel vs Maria), match them correctly to their respective employeeId from the provided list.
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite",
      contents: message,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            reply: {
              type: Type.STRING,
              description: "The friendly conversational response in Namibian English."
            },
            actions: {
              type: Type.ARRAY,
              description: "Array of structured roster commands to feed back to the frontend roster.",
              items: {
                type: Type.OBJECT,
                properties: {
                  type: {
                    type: Type.STRING,
                    description: "Action type: 'set_shift', 'auto_fill', 'clear_all', 'clear_employee', 'set_day_of_week'"
                  },
                  employeeId: {
                    type: Type.STRING,
                    description: "Employee ID to lock/apply shift."
                  },
                  days: {
                    type: Type.ARRAY,
                    description: "Days of month (e.g. [1, 2, 3, 4, 5, 6, 7]) for setting shift.",
                    items: { type: Type.INTEGER }
                  },
                  shiftType: {
                    type: Type.STRING,
                    description: "Shift type: 'D', 'N', 'O', 'X', 'PH'"
                  },
                  dayOfWeek: {
                    type: Type.STRING,
                    description: "Day of week: 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'"
                  }
                },
                required: ["type"]
              }
            }
          },
          required: ["reply", "actions"]
        }
      }
    });

    const text = response.text || "{}";
    const resultJson = JSON.parse(text);
    return res.json(resultJson);

  } catch (error) {
    console.error("Roster AI Assistant Error:", error);
    const apiErrorMessage = error instanceof Error ? error.message : String(error);
    
    // Check for common issues like invalid key, quota, etc.
    let userFriendlySuggestion = "Sorry lekker friend, I ran into an issue communicating with my brain.";
    if (apiErrorMessage.toLowerCase().includes("key") || apiErrorMessage.toLowerCase().includes("api")) {
      userFriendlySuggestion = "It looks like there might be an issue with your `GEMINI_API_KEY` secret. Please verify that it is correctly copied in the Settings menu (gears icon in the top right of Google AI Studio) and has no extra spaces. Sharp sharp!";
    } else if (apiErrorMessage.toLowerCase().includes("quota") || apiErrorMessage.toLowerCase().includes("exhausted") || apiErrorMessage.toLowerCase().includes("rate limit")) {
      userFriendlySuggestion = "My brain's free quota limit was reached. Please wait a minute before sending your request again! Sharp sharp!";
    }

    return res.status(500).json({
      reply: `${userFriendlySuggestion}\n\n(Technical Details: ${apiErrorMessage})`,
      actions: []
    });
  }
});

// Serve frontend assets
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`ShiftWise Namibia running on port ${PORT}`);
  });
}

startServer();
