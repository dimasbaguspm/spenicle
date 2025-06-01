import { RouterProvider, createRouter } from '@tanstack/react-router';
import ReactDOM from 'react-dom/client';

import { App } from './core/app.tsx';
import { getQueryClientInstance } from './providers/tanstack-query/index.tsx';
import { routeTree } from './routeTree.gen';

import './styles.css';

// Create a new router instance
const router = createRouter({
  routeTree,
  context: {
    ...getQueryClientInstance(),
  },
  defaultPreload: 'intent',
  scrollRestoration: true,
  defaultStructuralSharing: true,
  defaultPreloadStaleTime: 0,
});

const rootElement = document.getElementById('app');
if (rootElement && !rootElement.innerHTML) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <App>
      <RouterProvider router={router} />
    </App>
  );
}
