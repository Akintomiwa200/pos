export function PaymentOverlay({
  visible,
  label,
}: {
  visible: boolean;
  label?: string;
}) {
  if (!visible) return null;
  return (
    <div className="overlay">
      <div>
        <div className="spinner" />
        <h2>Payment in Progress....</h2>
        {label ? <p className="pay-sub">{label}</p> : null}
      </div>
    </div>
  );
}
