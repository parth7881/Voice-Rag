export function GoaMiniScene() {
  return (
    <div className="goa-mini-scene" aria-hidden="true">
      <svg viewBox="0 0 360 150" role="presentation">
        <circle cx="173" cy="73" r="31" className="mini-sun" />
        <path className="mini-wave" d="M0 93c32-13 50 10 82 0s50-13 82 0 50 13 82 0 50-13 82 0 32 6 32 6v51H0Z" />
        <path className="mini-sand" d="M0 112c44-8 73 7 111 0s76-8 116 0 82 8 133 0v38H0Z" />
        <g className="mini-palm" transform="translate(30 10)">
          <path d="M58 42C48 77 45 105 43 135" />
          <path d="M58 43C34 25 17 25 5 30M58 43C41 11 37 2 38-5M58 43C69 16 82 7 98 2M58 43C82 30 99 31 116 41M58 43C36 49 24 61 13 76" />
        </g>
        <g className="mini-palm" transform="translate(283 24) scale(.74)">
          <path d="M58 42C48 77 45 105 43 135" />
          <path d="M58 43C34 25 17 25 5 30M58 43C41 11 37 2 38-5M58 43C69 16 82 7 98 2M58 43C82 30 99 31 116 41M58 43C36 49 24 61 13 76" />
        </g>
        <g className="mini-house" transform="translate(206 91)">
          <path d="M0 20 28 0l31 20" />
          <path d="M8 20h44v37H8z" />
          <path d="M16 30h11v12H16zM34 28h10v29H34z" />
        </g>
        <g className="mini-person" transform="translate(157 109)">
          <circle cx="8" cy="4" r="4" />
          <path d="M8 9v18M8 14 0 21M8 14l9 7M8 27l-6 11M8 27l7 11" />
        </g>
      </svg>
    </div>
  );
}

export function ReceiptShield() {
  return (
    <svg viewBox="0 0 110 110" role="presentation">
      <rect x="27" y="19" width="56" height="72" rx="9" className="receipt-paper" />
      <path className="receipt-outline" d="M35 21V15h40v6M30 31 20 42v40l12 12h46l12-12V42L79 31" />
      <path className="receipt-check" d="M44 54l8 8 15-18" />
      <path className="receipt-shield" d="M55 39c9 5 16 4 16 4v16c0 12-8 20-16 24-8-4-16-12-16-24V43s7 1 16-4Z" />
    </svg>
  );
}
