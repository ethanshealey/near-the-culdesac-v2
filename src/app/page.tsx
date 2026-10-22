import { isFirebaseConfigured } from "@/lib/firebase";
import Wordmark from "@/components/brand/Wordmark";
import Hero from "@/components/Hero";
import Members from "@/components/Members";
import Gigs from "@/components/Gigs";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <main>
      <Header />
      <Hero />
      <Members />
      <Gigs />
      <Footer />
    </main>
  );
}
