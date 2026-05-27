import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataPath = path.resolve(__dirname, '../../../dayshift-jobs-ref/src/data/platforms.json');
const platforms = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

const mapCategory = (cat) => {
    switch (cat) {
        case "Australian & Dayshift VA": return "australian-dayshift";
        case "Global VA & Outsourcing": return "global-va";
        case "E-commerce & Marketing": return "ecommerce";
        case "BPO & Professional Services": return "bpo";
        case "Technology & Specialized": return "tech";
        default: return "job-boards"; // job boards & resources, etc.
    }
};

let sql = `DELETE FROM va_directory;\n`;

const escapeSql = (str) => {
    if (!str) return '';
    return str.replace(/'/g, "''");
};

const CHUNK_SIZE = 100; // to avoid D1 999 var limit

for (let i = 0; i < platforms.length; i += CHUNK_SIZE) {
    const chunk = platforms.slice(i, i + CHUNK_SIZE);
    
    sql += `INSERT INTO va_directory (company_name, niche, is_dayshift, is_verified, is_remote, is_marketplace, website) VALUES\n`;
    
    const values = chunk.map(p => {
        const companyName = escapeSql(p.name);
        const website = escapeSql(p.url);
        const niche = mapCategory(p.category);
        
        // Infer booleans from category or tags
        let isDayshift = 0;
        if (p.category === "Australian & Dayshift VA" || (p.tags && p.tags.includes("Dayshift"))) isDayshift = 1;
        
        let isVerified = 1; // Base assumption from vetted list
        let isRemote = 1;   // Base assumption for VA list
        let isMarketplace = 0;
        if (p.name.toLowerCase().includes('upwork') || p.name.toLowerCase().includes('fiverr') || (p.tags && p.tags.includes('Marketplace'))) {
            isMarketplace = 1;
        }

        return `('${companyName}', '${niche}', ${isDayshift}, ${isVerified}, ${isRemote}, ${isMarketplace}, '${website}')`;
    });

    sql += values.join(",\n") + ";\n\n";
}

fs.writeFileSync(path.join(__dirname, 'seed3.sql'), sql);
console.log(`Generated seed3.sql with ${platforms.length} entries`);
