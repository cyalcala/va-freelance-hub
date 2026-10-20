import { Database } from "bun:sqlite";
import { join } from "node:path";
const path = join(import.meta.dir, "native-change-metadata-probe.json");
if (await Bun.file(path).exists()) throw new Error("Preserve existing metadata probe");
const db = new Database(":memory:");
try {
  db.exec("CREATE TABLE item(id INTEGER PRIMARY KEY,url TEXT UNIQUE);CREATE TABLE audit(item_id INTEGER);CREATE TRIGGER item_audit AFTER INSERT ON item BEGIN INSERT INTO audit(item_id) VALUES(new.id); END;");
  const write = db.query("INSERT INTO item(url) VALUES(?) ON CONFLICT DO NOTHING");
  const first = write.run("https://example.test/item");
  const afterFirst = db.query("SELECT changes() AS sqlChanges,total_changes() AS sqlTotalChanges,(SELECT count(*) FROM item) AS physicalItems,(SELECT count(*) FROM audit) AS auditItems").get();
  const duplicate = write.run("https://example.test/item");
  const afterDuplicate = db.query("SELECT changes() AS sqlChanges,total_changes() AS sqlTotalChanges,(SELECT count(*) FROM item) AS physicalItems,(SELECT count(*) FROM audit) AS auditItems").get();
  const receipt = {scope:"PINNED_NATIVE_BUN_SQLITE_IN_MEMORY_DRIVER_OBSERVATION_NOT_CLOUDFLARE_D1",recordedAt:new Date().toISOString(),bun:Bun.version,
    sqlite:db.query("SELECT sqlite_version() AS version").get(),first,afterFirst,duplicate,afterDuplicate,
    fixtureContract:"native-workable-publication.ts returns meta.changes = statement.run(...params).changes; it does not call SELECT total_changes()",
    limitation:"This native driver observation does not establish Cloudflare D1 trigger accounting or production publication counts"};
  await Bun.write(path,JSON.stringify(receipt,null,2)+"\n");
  console.log(JSON.stringify(receipt));
}finally{db.close();}
