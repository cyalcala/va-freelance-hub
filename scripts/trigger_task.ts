const key = process.env.TRIGGER_SECRET_KEY;
if (!key) { console.error("Missing TRIGGER_SECRET_KEY"); process.exit(1); }

async function trigger() {
  try {
    const res = await fetch("https://api.trigger.dev/api/v1/tasks/harvest-opportunities/trigger", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${key}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        payload: { source: "manual-remediation" }
      })
    });
    console.log("TRIGGER_STATUS:", res.status);
    const data = await res.json();
    console.log("TRIGGER_RESPONSE:", JSON.stringify(data));
  } catch (e: any) {
    console.error("TRIGGER_FAIL:", e.message);
  }
}
trigger();
