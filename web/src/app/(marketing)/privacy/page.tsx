import { PageHero } from "../../../components/site/PageHero";

export default function PrivacyPage() {
  return (
    <>
      <PageHero
        kicker="Legal"
        title="Privacy"
        copy="This HQ site and the till process store operations data on the API host you run. We do not sell that data."
      />
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-12 text-sm leading-relaxed text-neutral-600 sm:px-6">
        <p>
          Accounts, till codes, sales, and hardware hex stay on your API server
          (`backend/data` in development). Do not commit those files or paste
          them into public issues.
        </p>
        <p>
          The public pages on this site store no customer baskets. HQ login uses
          a session token in the browser after you sign in.
        </p>
        <p>
          Contact us from the Contact page if you need a store’s data removed
          from a hosted instance you control.
        </p>
      </div>
    </>
  );
}
