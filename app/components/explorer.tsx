"use client";

import Link from "next/link";

import { useState } from "react";
import { useNavigationPreferences } from "./reader/use-navigation-preferences";
import { EndpointNavigation } from "./reader/endpoint-navigation";
import { SpecDocument } from "./reader/spec-document";
import { useReader } from "./reader/use-reader";

function ExplorerIntroduction() {
  return (
    <section id="intro" className="intro">
      <div>
        <span className="step">01 / CONNECT</span>
        <h3>One link. Every endpoint.</h3>
        <p>
          Discover SpecKub Markdown across your repository, wherever your team
          keeps it.
        </p>
      </div>
      <div>
        <span className="step">02 / EXPLORE</span>
        <h3>Follow the right branch.</h3>
        <p>
          Read contracts, service relationships, and sequence diagrams for a
          specific revision.
        </p>
      </div>
      <div>
        <span className="step">03 / SHARE</span>
        <h3>Keep everyone in sync.</h3>
        <p>
          Share a link to an endpoint. Your Markdown stays in Git, alongside the
          code.
        </p>
      </div>
    </section>
  );
}

export function Explorer() {
  const {
    snapshot,
    notice,
    busy,
    input,
    setInput,
    connect,
    readBranch,
    select,
  } = useReader();
  const { preferences, updateNavigation } = useNavigationPreferences();
  const [search, setSearch] = useState("");
  const [method, setMethod] = useState("");
  const specs = snapshot?.specs ?? [];
  const methods = [...new Set(specs.map((spec) => spec.method))].sort();
  if (method && !specs.some((spec) => spec.method === method)) setMethod("");
  const effectiveMethod = methods.includes(method as (typeof methods)[number])
    ? method
    : "";
  const query = search.trim().toLowerCase();
  const filtered = specs.filter(
    (spec) =>
      (!effectiveMethod || spec.method === effectiveMethod) &&
      `${spec.id} ${spec.path} ${spec.summary} ${spec.body}`
        .toLowerCase()
        .includes(query),
  );
  const selected = specs.find((spec) => spec.id === snapshot?.selected);

  return (
    <div className={snapshot ? "has-repo" : undefined}>
      <main id="main">
        <section className="hero">
          <div className="eyebrow">
            <span className="dot" /> YOUR CODE. YOUR SPECS. EVERY BRANCH.
          </div>
          <h1>
            Your APIs,
            <br />
            <span>an open book.</span>
          </h1>
          <p>
            Turn a public repository into a readable API reference.
            <br />
            Choose a branch. Explore the specs. Stay close to the code.
          </p>
          <form
            id="repo-form"
            onSubmit={(event) => {
              event.preventDefault();
              void connect(input);
            }}
          >
            <label htmlFor="repo-input">PUBLIC GITHUB REPOSITORY</label>
            <div className="input-row">
              <span aria-hidden="true">⌘</span>
              <input
                id="repo-input"
                placeholder="github.com/owner/repository"
                autoComplete="off"
                required
                aria-label="Public GitHub repository"
                value={input}
                onChange={(event) => setInput(event.target.value)}
              />
              <button type="submit" disabled={busy}>
                Open repository <span>↗</span>
              </button>
            </div>
          </form>
          <div className="try">
            Try it with{" "}
            <Link
              id="example"
              href="/explorer?repo=ipondnakab%2Fspeckub&branch=feat%2Fcrud-deep-path-playground&endpoint=projects.list"
            >
              Playground · projects.list ↗
            </Link>
            <span>Public repos · No sign-in needed</span>
          </div>
        </section>
        <div
          id="status"
          role="status"
          aria-live="polite"
          className={notice.kind}
        >
          {notice.message}
        </div>
        {snapshot && (
          <section id="workspace">
            <div className="repo-bar">
              <div>
                <span className="eyebrow">REPOSITORY</span>
                <h2 id="repo-name">{snapshot.repo.full}</h2>
              </div>
              <div className="branch-control">
                <label htmlFor="branch">Branch</label>
                <select
                  id="branch"
                  value={snapshot.branch}
                  onChange={(event) => void readBranch(event.target.value)}
                >
                  {snapshot.branches.map((branch) => (
                    <option key={branch} value={branch}>
                      {branch}
                    </option>
                  ))}
                </select>
                <button
                  id="refresh"
                  className="secondary"
                  disabled={busy}
                  onClick={() => void readBranch(undefined, true)}
                >
                  Refresh
                </button>
              </div>
            </div>
            <div id="snapshot">{`${specs.length} endpoints · ${snapshot.filesRead} Markdown files read · commit ${snapshot.sha.slice(0, 7)} · branch ${snapshot.branch} · ${snapshot.fromCache ? "cached, " : ""}checked ${new Date(snapshot.checkedAt).toLocaleTimeString()}`}</div>
            {snapshot.issues.length > 0 && (
              <details id="issues">
                <summary>
                  {snapshot.issues.length} discovery issues — results may be
                  incomplete
                </summary>
                <ul>
                  {snapshot.issues.map((issue, index) => (
                    <li key={index}>{issue}</li>
                  ))}
                </ul>
              </details>
            )}
            <div className="reader">
              <aside>
                <label className="eyebrow" htmlFor="search">
                  API REFERENCE
                </label>
                <input
                  id="search"
                  type="search"
                  placeholder="Search endpoints…"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
                <label className="sr-only" htmlFor="method">
                  HTTP method
                </label>
                <select
                  id="method"
                  value={effectiveMethod}
                  onChange={(event) => setMethod(event.target.value)}
                >
                  <option value="">All methods</option>
                  {methods.map((method) => (
                    <option key={method} value={method}>
                      {method}
                    </option>
                  ))}
                </select>
                <div className="navigation-settings">
                  <div>
                    <label htmlFor="navigation-view">View</label>
                    <select
                      id="navigation-view"
                      value={preferences.view}
                      onChange={(event) =>
                        updateNavigation({
                          ...preferences,
                          view: event.target.value === "tree" ? "tree" : "list",
                        })
                      }
                    >
                      <option value="list">List</option>
                      <option value="tree">Tree</option>
                    </select>
                  </div>
                  <div
                    id="tree-depth-setting"
                    hidden={preferences.view !== "tree"}
                  >
                    <label htmlFor="tree-depth">Max tree layers</label>
                    <input
                      id="tree-depth"
                      type="number"
                      min="1"
                      max="12"
                      step="1"
                      value={preferences.depth}
                      title="Maximum visible folder levels (1–12)"
                      onChange={(event) =>
                        updateNavigation({
                          ...preferences,
                          depth: Math.min(
                            12,
                            Math.max(
                              1,
                              Math.trunc(Number(event.target.value)) || 2,
                            ),
                          ),
                        })
                      }
                    />
                  </div>
                </div>
                <div id="count">{filtered.length} endpoints</div>
                <EndpointNavigation
                  specs={filtered}
                  selected={selected}
                  preferences={preferences}
                  filterKey={
                    query || effectiveMethod
                      ? JSON.stringify([query, effectiveMethod])
                      : ""
                  }
                  onSelect={select}
                />
              </aside>
              <SpecDocument
                key={`${snapshot.repo.full}@${snapshot.sha}:${snapshot.selected}`}
                snapshot={snapshot}
                spec={selected}
              />
            </div>
          </section>
        )}
        {!snapshot && <ExplorerIntroduction />}
      </main>
    </div>
  );
}
