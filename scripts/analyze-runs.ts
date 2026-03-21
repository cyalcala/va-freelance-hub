const key = process.env.TRIGGER_SECRET_KEY;
async function analyze() {
  const res = await fetch("https://api.trigger.dev/api/v1/runs?status=COMPLETED&limit=10", {
    headers: { "Authorization": `Bearer ${key}` }
  });
  const data: any = await res.json();
  data.data.forEach((r: any) => {
    if (r.taskIdentifier === "harvest-opportunities") {
      console.log(`RUN: ${r.id} | AT: ${r.createdAt} | OUT: ${JSON.stringify(r.output)}`);
    }
  });
}
analyze();
