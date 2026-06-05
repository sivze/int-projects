import { ArrowRight, CheckCircle2, Github, Rocket } from "lucide-react";

const checks = [
  "Next.js app router",
  "Vercel-ready config",
  "Supabase configured",
  "GitHub-ready repo"
];

export default function Home() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const hasSupabaseUrl = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const hasSupabaseKey = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  return (
    <main className="shell">
      <section className="intro">
        <div className="eyebrow">
          <Rocket size={16} aria-hidden="true" />
          Project template
        </div>
        <h1>Hello from the project template.</h1>
        <p>
          A clean deployable base with Next.js, Vercel, Supabase, and GitHub
          already wired together.
        </p>
        <div className="actions">
          <a href={siteUrl} className="primary">
            Open app
            <ArrowRight size={18} aria-hidden="true" />
          </a>
          <a
            href="https://github.com"
            className="secondary"
            target="_blank"
            rel="noreferrer"
          >
            <Github size={18} aria-hidden="true" />
            GitHub
          </a>
        </div>
      </section>

      <section className="panel" aria-label="Project status">
        <h2>Ready checks</h2>
        <ul>
          {checks.map((check) => (
            <li key={check}>
              <CheckCircle2 size={18} aria-hidden="true" />
              {check}
            </li>
          ))}
        </ul>
        <div className="envGrid">
          <div>
            <span>Supabase URL</span>
            <strong>{hasSupabaseUrl ? "Configured" : "Missing"}</strong>
          </div>
          <div>
            <span>Supabase key</span>
            <strong>{hasSupabaseKey ? "Configured" : "Missing"}</strong>
          </div>
        </div>
      </section>
    </main>
  );
}
