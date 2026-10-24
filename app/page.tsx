import { Nav } from "@/components/Nav/Nav";
import { Hero } from "@/components/Hero/Hero";
import { Statement } from "@/components/Statement/Statement";
import { Kardashev } from "@/components/Kardashev/Kardashev";
import { Sun } from "@/components/Sun/Sun";
import { Builders } from "@/components/Builders/Builders";
import { Factory } from "@/components/Factory/Factory";
import { Scaling } from "@/components/Scaling/Scaling";
import { Output } from "@/components/Output/Output";
import { Chips } from "@/components/Chips/Chips";
import { Space } from "@/components/Space/Space";
import { MassDriver } from "@/components/MassDriver/MassDriver";
import { Footer } from "@/components/Footer/Footer";
import { Reveals } from "@/components/ui/Reveals";

export default function Home() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <Statement />
        <Kardashev />
        <Sun />
        <Builders />
        <Factory />
        <Scaling />
        <Output />
        <Chips />
        <Space />
        <MassDriver />
      </main>
      <Footer />
      <Reveals />
    </>
  );
}
