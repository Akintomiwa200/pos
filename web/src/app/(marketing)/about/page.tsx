import { AboutEditorial } from "../../../components/site/AboutEditorial";
import { AboutHero } from "../../../components/site/AboutHero";
import { AboutPodium } from "../../../components/site/AboutPodium";
import { AboutSocial } from "../../../components/site/AboutSocial";
import { AboutValues } from "../../../components/site/AboutValues";
import { MarketingCtaBand } from "../../../components/site/MarketingChrome";

export default function AboutPage() {
  return (
    <>
      <AboutHero />
      <AboutValues />
      <AboutPodium />
      <AboutEditorial />
      <AboutSocial />
      <MarketingCtaBand
        title="Ready to run HQ and the till together?"
        copy="Register your company, set up the catalog, and issue your first till code from one console."
      />
    </>
  );
}
