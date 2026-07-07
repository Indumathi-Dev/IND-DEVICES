import React from 'react';
import ReactDOMClient from 'react-dom/client';
import singleSpaReact from 'single-spa-react';
import Root from './root.component';

const lifecycles = singleSpaReact({
  React, ReactDOMClient, rootComponent: Root,
  errorBoundary: (err) => (
    <div role="alert" style={{ color: '#C53030', padding: 24 }}>Devices failed to load: {err.message}</div>
  ),
});
export const { bootstrap, mount, unmount } = lifecycles;
