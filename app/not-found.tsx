import Link from "next/link";

export default function NotFound() {
  return (
    <main className="error-page">
      <span className="eyebrow">404 / Missing page</span>
      <h1>Nothing to cut out here.</h1>
      <p>That page does not exist.</p>
      <Link className="button button-dark" href="/">
        Go to studio
      </Link>
    </main>
  );
}
