/** Latar aurora di belakang semua halaman (ADR-0009). Murni hiasan; gaya dan gerakannya ada di globals.css. */
export function Aurora() {
  return (
    <div aria-hidden="true" className="aurora">
      <span />
      <span />
      <span />
    </div>
  );
}
