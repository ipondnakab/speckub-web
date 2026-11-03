import Link from "next/link";
import { CodeBlock } from "./code-block";

export function HomeContent() {
  return (
    <main id="main" className="site-main">
      <section className="landing-hero">
        <div className="hero-copy">
          <p className="site-eyebrow">
            <span className="status-dot"></span> OPEN-SOURCE API DOCUMENTATION
          </p>
          <h1>
            Your code.
            <br />
            Your APIs.
            <br />
            <em>Your source of truth.</em>
          </h1>
          <p className="hero-description">
            Turn the APIs you already have into Markdown your team can
            understand. Let your coding agent discover the routes, connect the
            services, and write the docs. Keep it all in Git.
          </p>
          <div className="site-actions">
            <Link className="primary-link" href="/docs">
              Start documenting <span>→</span>
            </Link>
            <Link className="text-link" href="/explorer">
              Explore a public repo ↗
            </Link>
          </div>
          <p className="hero-footnote">
            Any language. Your coding agent. Your repository.
          </p>
        </div>
        <div className="spec-preview" aria-label="Example API documentation">
          <div className="preview-bar">
            <span className="preview-dots" aria-hidden="true">
              ● ● ●
            </span>
            <span>docs/api/users/read.md</span>
            <span className="preview-git">M</span>
          </div>
          <div className="preview-code">
            <div>
              <span className="code-muted">---</span>
              <br />
              <span className="code-key">speckub:</span>
              true
              <br />
              <span className="code-key">specVersion:</span> 1<br />
              <span className="code-key">id:</span>
              users.read
              <br />
              <span className="code-key">kind:</span> http
              <br />
              <span className="code-key">method:</span>
              GET
              <br />
              <span className="code-key">path:</span> /users/{"{id}"}
              <br />
              <span className="code-key">summary:</span>
              Read a user
              <br />
              <span className="code-muted">---</span>
            </div>
          </div>
          <div className="preview-document">
            <span className="preview-badge">GET</span>
            <code>/users/{"{id}"}</code>
            <h2>A contract anyone can read.</h2>
            <p>
              Requests, responses, errors, relationships, and request-flow
              diagrams. Written in Markdown. Reviewed with your code.
            </p>
            <div className="preview-flow">
              <span>Client</span>
              <span aria-hidden="true">→</span>
              <span>API</span>
              <span aria-hidden="true">→</span>
              <span>Service</span>
            </div>
          </div>
          <div className="preview-bottom">
            <span className="status-dot"></span> Same file. Human-readable.
            Agent-ready.
          </div>
        </div>
      </section>
      <div className="principles">
        <span>Markdown, not another database</span>
        <span>Framework-independent discovery</span>
        <span>Customizable templates</span>
        <span>Public or private repositories</span>
      </div>
      <section className="site-section" id="workflow">
        <div className="section-heading">
          <div>
            <p className="site-eyebrow">FROM SOURCE TO SPEC</p>
            <h2>
              A clear path to
              <br />
              docs that explain your API.
            </h2>
          </div>
          <p>
            Small, reviewable steps. Source evidence at every stage. You stay in
            control of what gets documented.
          </p>
        </div>
        <div className="workflow-grid">
          <Link href="/docs#scan">
            <span className="step-number">01</span>
            <h3>Discover</h3>
            <p>
              Find HTTP endpoints and the code behind them. Review an inventory
              before creating specs.
            </p>
            <code>scan</code>
          </Link>
          <Link href="/docs#relations">
            <span className="step-number">02</span>
            <h3>Connect</h3>
            <p>
              Trace callers and downstream services. Make the relationships
              visible.
            </p>
            <code>relations</code>
          </Link>
          <Link href="/docs#create">
            <span className="step-number">03</span>
            <h3>Document</h3>
            <p>
              Create detailed Markdown using your template, examples, and
              diagrams.
            </p>
            <code>create</code>
          </Link>
          <Link href="/docs#read-and-share">
            <span className="step-number">04</span>
            <h3>Read &amp; share</h3>
            <p>
              Open a local reader or explore specs in a public GitHub
              repository.
            </p>
            <code>ui</code>
          </Link>
        </div>
        <p className="section-note">
          Discovery and writing run in your coding agent. The CLI installs
          skills, checks structure and source references, and exports the
          reader.
        </p>
      </section>
      <section className="quickstart-panel">
        <div>
          <p className="site-eyebrow">START WITH YOUR PROJECT</p>
          <h2>
            Install once.
            <br />
            Document any repo.
          </h2>
          <p>
            Install the CLI globally, then initialize each API project. No
            project dependency needed. Requires Node.js 22+ and a supported
            coding agent.
          </p>
          <Link className="text-link" href="/docs#quickstart">
            Follow the complete walkthrough →
          </Link>
        </div>
        <div className="terminal-card">
          <div className="terminal-label">TERMINAL · PROJECT ROOT</div>
          <CodeBlock
            language="sh"
            code={
              "npm install --global @speckub/cli\nspeckub init --agent codex"
            }
          />
          <div className="terminal-label">THEN, IN YOUR AGENT CHAT</div>
          <CodeBlock
            language="text"
            code="$speckub-scan Find the HTTP APIs in this project."
          />
          <p>
            Using Claude or Cursor? Use <code>/speckub.scan</code> in agent
            chat.
          </p>
        </div>
      </section>
      <section className="site-section">
        <div className="section-heading">
          <div>
            <p className="site-eyebrow">MADE FOR REAL PROJECTS</p>
            <h2>
              Meet your code
              <br />
              where it lives.
            </h2>
          </div>
        </div>
        <div className="usecase-grid">
          <div>
            <span className="usecase-label">EXISTING SERVICES</span>
            <h3>Make onboarding easier.</h3>
            <p>
              Give a new teammate contracts, examples, and a map of service
              calls instead of a tour through every handler.
            </p>
          </div>
          <div>
            <span className="usecase-label">MONOREPOS &amp; TEAMS</span>
            <h3>Your structure. Your template.</h3>
            <p>
              Keep docs next to services or in one folder. Customize the
              Markdown body while preserving a small metadata contract.
            </p>
            <Link href="/docs#custom-templates">Design your template →</Link>
          </div>
          <div>
            <span className="usecase-label">PRIVATE REPOSITORIES</span>
            <h3>Read locally. Share deliberately.</h3>
            <p>
              Export a standalone reader for your internal APIs. Keep it local
              or host it behind your own access controls.
            </p>
            <Link href="/docs#private-repositories">
              Use the offline reader →
            </Link>
          </div>
        </div>
      </section>
      <section className="closing-panel">
        <p className="site-eyebrow">LET YOUR DOCS LIVE WITH YOUR CODE</p>
        <h2>
          Start with one endpoint.
          <br />
          Build a shared understanding.
        </h2>
        <div className="site-actions">
          <Link className="primary-link" href="/docs">
            Get started →
          </Link>
          <Link className="text-link" href="/explorer">
            Open the explorer ↗
          </Link>
        </div>
      </section>
    </main>
  );
}
