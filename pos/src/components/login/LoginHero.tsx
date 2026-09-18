type Props = {
  brand: string;
};

export function LoginHero({ brand }: Props) {
  return (
    <aside className="login-hero" aria-hidden="true">
      <div className="login-hero-blob login-hero-blob-a" />
      <div className="login-hero-blob login-hero-blob-b" />
      <h1 className="login-hero-title">
        Transform Your Business with
        <span>{brand}</span>
      </h1>
      <div className="login-hero-stage">
        <div className="login-hero-photo">
          <img
            src="https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&w=1200&q=80"
            alt=""
          />
        </div>
        <div className="login-hero-pos">
          <div className="login-hero-pos-bar">
            <span />
            <span />
            <em />
          </div>
          <div className="login-hero-pos-grid">
            {Array.from({ length: 8 }, (_, index) => (
              <div key={index} className={`login-hero-sku tone-${index % 4}`}>
                <i />
                <b />
                <b />
              </div>
            ))}
          </div>
        </div>
      </div>
      <p className="login-hero-tagline">
        Your journey to faster transactions and smoother operations starts here.
      </p>
    </aside>
  );
}
