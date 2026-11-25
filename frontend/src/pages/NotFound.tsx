/** Explicit 404 (QA-3): never silently render the wrong page under a bogus URL. */

import { Link, useLocation } from "react-router-dom";

import { usePageTitle } from "../lib/usePageTitle";

export default function NotFound() {
  const { pathname } = useLocation();
  usePageTitle("Not found");
  return (
    <div className="card mx-auto mt-12 max-w-md px-6 py-8 text-center">
      <h1 className="text-lg font-semibold text-tx-primary">Nothing on this frequency</h1>
      <p className="num mt-1 break-all text-meta text-tx-muted">{pathname}</p>
      <p className="mt-2 text-base text-tx-secondary">That page doesn't exist.</p>
      <Link to="/" className="mt-4 inline-block text-sm text-accent hover:underline">
        Back to the watch board
      </Link>
    </div>
  );
}
