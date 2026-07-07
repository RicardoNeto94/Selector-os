"use client";

export default function BurmanPillowMenu() {
  const pillows = [
    {
      name: "Memory Foam",
      type: "ADJUSTABLE SUPPORT",
      feel: "Medium · Supportive",
      desc: "Adjustable memory foam for personalised height, firmness and breathable support.",
      ideal: "Side & back sleepers",
    },
    {
      name: "Down & Feather",
      type: "BALANCED COMFORT",
      feel: "Soft · Balanced",
      desc: "An equal blend of down and feather balancing softness with gentle support.",
      ideal: "All-round comfort",
    },
    {
      name: "German-Style Down & Feather",
      type: "CLASSIC SOFTNESS",
      feel: "Soft · Restorative",
      desc: "Delicately padded with subtle structure for a calm and restorative night's sleep.",
      ideal: "Back sleepers",
    },
    {
      name: "Chamomile & Buckwheat",
      type: "NATURAL RELAXATION",
      feel: "Firm · Natural",
      desc: "Calming chamomile and supportive buckwheat husks for natural alignment and relaxation.",
      ideal: "Structured support",
    },
    {
      name: "Lavender & Buckwheat",
      type: "AROMATIC CALM",
      feel: "Firm · Aromatic",
      desc: "Soothing lavender and supportive buckwheat designed to encourage deeper relaxation.",
      ideal: "Relaxation",
    },
  ];

  return (
    <div className="vx-pillow-experience">
      <div className="vx-pillow-intro">
        <span>SLEEP CONCIERGE</span>

        <p>
          Discover our pillow collection and choose the comfort
          best suited to your preferred sleeping style.
        </p>
      </div>

      <div className="vx-pillow-grid">
        {pillows.map((pillow, index) => (
          <article
            key={pillow.name}
            className="vx-pillow-card"
          >
            <div className="vx-pillow-card-top">
              <span className="vx-pillow-number">
                {String(index + 1).padStart(2, "0")}
              </span>

              <span className="vx-pillow-type">
                {pillow.type}
              </span>
            </div>

            <div className="vx-pillow-card-content">
              <h4>{pillow.name}</h4>

              <span className="vx-pillow-feel">
                {pillow.feel}
              </span>

              <p>{pillow.desc}</p>
            </div>

            <div className="vx-pillow-card-footer">
              <span>{pillow.ideal}</span>
            </div>
          </article>
        ))}
      </div>

      <div className="vx-pillow-request">
        <div>
          <span>FOUND YOUR PREFERRED PILLOW?</span>
          <strong>Contact Reception</strong>
        </div>

        <p>
          Our team will be pleased to arrange delivery to your room.
        </p>
      </div>

      <p className="vx-pillow-note">
        Pillow selection is subject to availability.
      </p>
    </div>
  );
}