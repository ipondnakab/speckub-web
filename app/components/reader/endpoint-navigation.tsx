"use client";

import { useState } from "react";
import type { Spec } from "../../../src/discovery";
import {
  pathTree,
  branchEndpoints,
  navigationLabel,
  type PathBranch,
} from "../../../src/path-tree";
import type { NavigationPreferences } from "../../../src/navigation-preferences";

export function EndpointNavigation({
  specs,
  selected,
  preferences,
  filterKey,
  onSelect,
}: {
  specs: Spec[];
  selected: Spec | undefined;
  preferences: NavigationPreferences;
  filterKey: string;
  onSelect: (id: string) => void;
}) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [filterCollapsed, setFilterCollapsed] = useState({
    key: "",
    paths: new Set<string>(),
  });
  const filtered = Boolean(filterKey);
  const { view, depth } = preferences;
  const [revealed, setRevealed] = useState({ selected, view, depth });
  if (
    revealed.selected !== selected ||
    revealed.view !== view ||
    revealed.depth !== depth
  ) {
    setRevealed({ selected, view, depth });
    setFilterCollapsed({ key: "", paths: new Set() });
    setCollapsed((previous) => {
      const next = new Set(previous);
      for (const path of next) {
        if (path === selected?.path || selected?.path.startsWith(path + "/"))
          next.delete(path);
      }
      return next.size === previous.size ? previous : next;
    });
  }

  function endpoint(spec: Spec, prefix = "") {
    return (
      <button
        key={spec.id}
        type="button"
        className={`endpoint ${spec.id === selected?.id ? "active" : ""}`}
        aria-current={spec.id === selected?.id ? "true" : "false"}
        title={`${spec.method} ${spec.path}`}
        aria-label={`${spec.method} ${spec.path} ${spec.summary}`}
        onClick={() => onSelect(spec.id)}
      >
        <span className={`method ${spec.method}`}>{spec.method}</span>
        <strong>{navigationLabel(spec.path, prefix)}</strong>
        <small>{spec.summary}</small>
      </button>
    );
  }
  function branch(node: PathBranch<Spec>, level = 0): React.ReactNode {
    if (level >= depth)
      return branchEndpoints(node).map((spec) => endpoint(spec, node.path));
    return (
      <>
        {node.endpoints.map((spec) => endpoint(spec, node.path))}
        {[...node.children.values()].map((child) => {
          if (!child.children.size)
            return child.endpoints.map((spec) => endpoint(spec, node.path));
          const open = filtered
            ? filterCollapsed.key !== filterKey ||
              !filterCollapsed.paths.has(child.path)
            : !collapsed.has(child.path);
          return (
            <details
              key={child.path}
              className="path-group"
              data-path={child.path}
              data-depth={level + 1}
              open={open}
            >
              <summary
                className="path-group-label"
                title={child.path}
                onClick={(event) => {
                  // Keep the native toggle and React state from racing with search updates.
                  event.preventDefault();
                  if (filtered) {
                    setFilterCollapsed((previous) => {
                      const paths = new Set(
                        previous.key === filterKey ? previous.paths : [],
                      );
                      if (open) paths.add(child.path);
                      else paths.delete(child.path);
                      return { key: filterKey, paths };
                    });
                    return;
                  }
                  setCollapsed((previous) => {
                    const next = new Set(previous);
                    if (open) next.add(child.path);
                    else next.delete(child.path);
                    return next;
                  });
                }}
              >
                <span className="path-segment">{child.segment || "/"}</span>
                <span className="path-count">{child.count}</span>
              </summary>
              <div className="path-children">{branch(child, level + 1)}</div>
            </details>
          );
        })}
      </>
    );
  }
  const tree = pathTree(specs);
  return (
    <nav id="endpoints" aria-label="Endpoints" data-view={view}>
      {!specs.length
        ? filtered
          ? "No matching endpoints."
          : "No specs discovered."
        : view === "tree"
          ? branch(tree)
          : branchEndpoints(tree).map((spec) => endpoint(spec))}
    </nav>
  );
}
