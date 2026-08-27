import Link from "next/link";
export default function NotFound() {
  return <main className="shell centered"><h1>Page not found</h1><Link className="primary-button compact" href="/checkout">Return to checkout</Link></main>;
}
