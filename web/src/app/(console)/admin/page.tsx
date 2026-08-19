export default function AdminPage() {
  return (
    <section>
      <h1 className="text-2xl font-semibold">Admin</h1>
      <p className="mt-1 text-neutral-500">
        Tenant onboarding, locations, users, and vertical feature flags
        (supermarket, hotel, restaurant, dark kitchen).
      </p>
      <ul className="mt-6 list-disc space-y-1 pl-5 text-sm text-neutral-700">
        <li>Organizations and store locations</li>
        <li>Roles: admin, procurement, audit, IT, cashier</li>
        <li>GDPR deletion requests</li>
      </ul>
    </section>
  );
}
