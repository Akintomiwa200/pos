import { PageHero } from "../../../components/site/PageHero";

export default function TermsPage() {
  return (
    <>
      <PageHero
        kicker="Legal"
        title="Terms"
        copy="Use of the till, HQ, price check, and API is governed by the project licence and your till subscription."
      />
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-12 text-sm leading-relaxed text-neutral-600 sm:px-6">
        <p>
          The software is provided under the MIT Licence in the repository
          unless you replace it with a commercial agreement.
        </p>
        <p>
          A till may be online on one device at a time. Activating the same code
          elsewhere signs the previous device out. The subscription lasts one
          year from first activation and is renewed by entering the code again.
        </p>
        <p>
          You are responsible for securing HQ accounts, till codes, and the
          machine that hosts the API.
        </p>
      </div>
    </>
  );
}
