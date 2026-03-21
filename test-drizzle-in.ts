import { sql } from "drizzle-orm";

const ids = [1, 2, 3];
const query = sql`SELECT * FROM users WHERE id IN (${sql.join(ids.map(id => sql`${id}`), sql`, `)})`;
console.log(query);
