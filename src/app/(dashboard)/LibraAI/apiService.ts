const BASE_URL = "https://overkind-phrenologic-delilah.ngrok-free.dev";

export const chatWithAgent = async (query: string, sessionId: string) => {
  const response = await fetch(`${BASE_URL}/api/chat`, {
    method: "POST",
    headers: { 
      "Content-Type": "application/json",
      "ngrok-skip-browser-warning": "true" 
    },
    body: JSON.stringify({ query, session_id: sessionId, stream: false }),
  });
  if (!response.ok) throw new Error("Network response was not ok");
  return await response.json();
};

export const triggerIngestion = async () => {
  const response = await fetch(`${BASE_URL}/api/ingest`, { 
    method: "POST",
    headers: { "ngrok-skip-browser-warning": "true" }
  });
  return await response.json();
};

export const checkHealth = async () => {
  try {
    const response = await fetch(`${BASE_URL}/health`, {
      headers: { "ngrok-skip-browser-warning": "true" }
    });
    if (!response.ok) return { status: "error", pipeline_ready: false };
    return await response.json();
  } catch (e) {
    return { status: "error", pipeline_ready: false };
  }
};
