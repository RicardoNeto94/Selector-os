export default function BurmanSpaOffer() {
  return (
    <section className="vx-spa-september-offer" aria-labelledby="september-offer-title">
      <div className="vx-spa-offer-story">
        <p className="vx-spa-offer-eyebrow">September spa special</p>
        <h3 id="september-offer-title">Autumn Serenity <em>Ritual</em></h3>
        <p className="vx-spa-offer-description">
          A specialised face massage and full-body massage, brought together
          in one restorative ritual.
        </p>
        <p className="vx-spa-offer-inclusion">Completed with a glass of champagne.</p>
      </div>

      <div className="vx-spa-offer-booking">
        <dl className="vx-spa-offer-details">
          <div><dt>Duration</dt><dd>90 <span>minutes</span></dd></div>
          <div><dt>The ritual</dt><dd>€225</dd></div>
        </dl>
        <button
          type="button"
          className="vx-spa-offer-contact"
          onClick={() => window.alert("Please contact Reception, Extension 800, to book your spa treatment.")}
        >
          Contact reception <span aria-hidden="true">→</span>
        </button>
        <p className="vx-spa-offer-note">
          Book through hotel or spa reception.<br />
          Extension <strong>800</strong>
        </p>
      </div>
    </section>
  );
}
