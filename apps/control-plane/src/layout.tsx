import { html } from 'hono/html';

export const Layout = ({ title, children }: { title: string, children: any }) => html`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://unpkg.com/htmx.org@1.9.10"></script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Outfit:wght@300;400;500;600&display=swap" rel="stylesheet">
  <style>
    :root {
      --oats-beige: #FDF8F1;
      --blueberry-blue: #1D4ED8;
    }
    body {
      background-color: var(--oats-beige);
      color: var(--blueberry-blue);
      font-family: 'Outfit', sans-serif;
    }
    .pulse-dot {
      width: 12px;
      height: 12px;
      background-color: var(--blueberry-blue);
      border-radius: 50%;
      position: relative;
    }
    .pulse-dot::after {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: var(--blueberry-blue);
      border-radius: 50%;
      animation: pulse 2s infinite;
    }
    @keyframes pulse {
      0% {
        transform: scale(1);
        opacity: 0.6;
      }
      100% {
        transform: scale(2.5);
        opacity: 0;
      }
    }
    .glass {
      background: rgba(255, 255, 255, 0.4);
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.2);
    }
  </style>
</head>
<body class="min-h-screen">
  <nav class="p-6 flex justify-between items-center border-b border-blue-100 glass sticky top-0 z-50">
    <div class="flex items-center gap-3">
      <div class="pulse-dot"></div>
      <h1 class="text-xl font-bold tracking-tight text-blue-900 lowercase italic">apex control plane</h1>
    </div>
    <div class="flex gap-4 text-sm font-medium">
      <a href="/" class="hover:underline">signals</a>
      <a href="/harvest" class="hover:underline">harvest</a>
      <a href="/scout" class="opacity-50 pointer-events-none cursor-not-allowed">scout (agent)</a>
    </div>
  </nav>
  <main class="max-w-5xl mx-auto p-8">
    ${children}
  </main>
</body>
</html>
`;
