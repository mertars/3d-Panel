/** Sabit arka plan: 3 bulanık renk lekesi + baskı tablası ızgarası + noise */
export function Backdrop() {
  return (
    <div className="app-backdrop" aria-hidden>
      <div className="blob blob-1" />
      <div className="blob blob-2" />
      <div className="blob blob-3" />
      <div className="grid" />
      <div className="noise" />
    </div>
  )
}
