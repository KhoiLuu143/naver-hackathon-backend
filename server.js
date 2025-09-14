import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config();

const app = express();
app.use(cors()); // allow all origins during dev; adjust in prod
app.use(express.json({ limit: "1mb" }));

const port = process.env.PORT || 3001;
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// simple health check
app.get("/api/health", (req, res) => res.json({ ok: true }));

app.post("/api/analyzeTasks", async (req, res) => {
  try {
    const { tasks } = req.body || {};
    if (!Array.isArray(tasks) || tasks.length === 0) {
      return res.status(400).json({ error: "No tasks provided" });
    }

    const taskText = tasks
      .map(t => {
        const title = t.title ?? "(no title)";
        const completed = t.completed ? "Hoàn thành" : "Chưa xong";
        const due = t.dueDate ?? "no-deadline";
        const priority = t.priority ?? "medium";
        return `- ${title} | ${completed} | Priority: ${priority} | Deadline: ${due}`;
      })
      .join("\n");

    const prompt = `Bạn là một trợ lý năng suất. Dưới đây là danh sách tasks. Hãy:
- Tóm tắt các điểm chính (1-2 câu).
- Đưa ra 3 gợi ý cải thiện năng suất (cụ thể).
- Gợi ý khung thời gian học/làm hiệu quả (ví dụ 20:00-22:00).
Danh sách:
${taskText}
`;

    const model = process.env.OPENAI_MODEL || "gpt-3.5-turbo";

    const completion = await client.chat.completions.create({
      model,
      messages: [
        { role: "system", content: "Bạn là trợ lý chuyên phân tích tasks và năng suất." },
        { role: "user", content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 600
    });

    const analysis = completion?.choices?.[0]?.message?.content ?? "Không có phản hồi từ AI.";
    return res.status(200).json({ analysis });
  } catch (err) {
    console.error("AI backend error:", err);
    return res.status(500).json({ error: "AI request failed", details: err?.message || err });
  }
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});