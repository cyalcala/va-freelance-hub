import { handle } from 'hono/vercel';
import app from '../src/index.js'; // Ensure .js for NodeNext

export const config = {
  runtime: 'edge', // Titanium Performance
};

export default handle(app);
