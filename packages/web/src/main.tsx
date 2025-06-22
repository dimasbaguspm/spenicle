import { RouterProvider, createRouter, parseSearchWith, stringifySearchWith } from '@tanstack/react-router';
import qs from 'query-string';
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
  parseSearch: parseSearchWith((value) => qs.parse(value)),
  stringifySearch: stringifySearchWith((value) => {
    console.log('stringifySearch', value);
    return qs.stringify(value);
  }),
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
