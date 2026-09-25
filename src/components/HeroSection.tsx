"use client";

import { motion } from "framer-motion";
import { ChevronsRight } from "lucide-react";
import Link from "next/link";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { BannerCarousel } from "@/components/BannerCarousel";
import { Header } from "@/components/Header";
import LogoLoop from "@/components/LogoLoop";
import { ShinyButton } from "@/components/ui/shiny-button";

import { ClientBadge } from "./ClientBadge";
import { FadeInAnimate } from "./FadeInAnimate";
import { RevealBlockText } from "./RevealBlockText";
import Silk from "./Silk";

const PARTNER_LOGOS = [
  {
    src: "/images/icons/belica.svg",
    alt: "Blica",
    href: "https://sub-mind-sand.vercel.app/jogos/belica",
  },
  {
    src: "/images/icons/foxboy.svg",
    alt: "Fox Boy",
    href: "https://sub-mind-sand.vercel.app/jogos/foxboy",
  },
  {
    src: "/images/icons/socoldres.png",
    alt: "Só Coldres",
    href: "https://sub-mind-sand.vercel.app/jogos/socoldres",
  },
  {
    src: "/images/icons/comanfy.svg",
    alt: "Comanfy",
    href: "https://sub-mind-sand.vercel.app/jogos/comanfy",
  },
  {
    src: "/images/icons/resgate.svg",
    alt: "Resgate",
    href: "https://sub-mind-sand.vercel.app/jogos/resgate",
  },
  {
    src: "/images/icons/hyper.svg",
    alt: "Hyper",
    href: "https://sub-mind-sand.vercel.app/jogos/hyper",
  },
];

export default function HeroSection() {
  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-hidden">
      {/* --- CAMADA DE FUNDO (SILK) COM FADE-IN ATRASADO --- */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{
          duration: 1.5, // Leva 2.5 segundos para aparecer totalmente (bem suave)
          delay: 1, // Espera 1.2 segundos antes de começar (aparece por último)
          ease: "easeInOut",
        }}
        className="pointer-events-none absolute inset-0 z-0"
      >
        <Silk
          speed={12}
          scale={1}
          color="#1c2116"
          noiseIntensity={0.8}
          rotation={0}
        />
      </motion.div>

      <div className="z-[100] w-full">
        <div className="mx-auto flex w-full items-center justify-center">
          <Header />
        </div>
      </div>

      <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-4 pt-38 text-center">
        <FadeInAnimate
          className="mb-6 flex justify-center" // Controla posição e margem
          direction="down"
          delay={1}
        >
          <ClientBadge />
        </FadeInAnimate>

        {/* <BannerCarousel /> */}

        {/* Texto para telas de computador */}
        <div className="hidden flex-col items-center md:flex">
          <RevealBlockText boxColor="#1c2116">
            <h1 className="font-clash-display max-w-7xl text-[70px] leading-[1.1] font-medium tracking-wide text-white drop-shadow-xl">
              A melhor loja de Coldres, Mochilas,
            </h1>
          </RevealBlockText>
          <RevealBlockText boxColor="#1c2116" delay={0.3}>
            <h1 className="font-clash-display max-w-4xl text-[70px] leading-[1.1] font-medium tracking-wide text-white drop-shadow-xl">
              Botas e Kits Táticos.
            </h1>
          </RevealBlockText>
        </div>

        {/* Texto para telas de celular */}
        <div className="flex flex-col items-center md:hidden">
          <RevealBlockText boxColor="#1c2116" width="100%">
            <h1 className="font-clash-display max-w-4xl text-center text-2xl leading-[1.1] font-medium tracking-wide text-white drop-shadow-xl">
              A melhor loja de Coldres, Mochilas,
            </h1>
          </RevealBlockText>
          <RevealBlockText boxColor="#1c2116" delay={0.3} width="100%">
            <h1 className="font-clash-display max-w-4xl text-center text-2xl leading-[1.1] font-medium tracking-wide text-white drop-shadow-xl">
              Botas e Kits Táticos.
            </h1>
          </RevealBlockText>
        </div>

        <FadeInAnimate
          className="flex justify-center" // Adicione isso para centralizar o filho
          direction="up"
          delay={0.8}
        >
          <p className="font-montserrat md:text-md text-md mt-2 max-w-md leading-relaxed text-neutral-500 drop-shadow-md md:max-w-4xl">
            Acesso a marcas premium e produtos táticos para a missão. Airsofts
            com peças raras e Cilindros, Facas com bainha, além de Mochilas,
            Artigos de Caça, Coldres e Coletes Táticos.
          </p>
        </FadeInAnimate>

        {/* <div className="mt-14 flex items-center gap-4">
          <Link href="https://discord.com/invite/RTahhx6Pvp">
            <button className="group flex cursor-pointer items-center justify-center gap-2 rounded-md border border-neutral-800/30 bg-black/30 px-6 py-[12px] backdrop-blur-md duration-300 hover:scale-[1.03]">
              Servidor{" "}
              <ChevronsRight className="h-5 w-5 duration-500 group-hover:-rotate-90" />
            </button>
          </Link>
          <ShinyButton
            className="font-montserrat font-light"
            onClick={() =>
              document
                .getElementById("catalogo")
                ?.scrollIntoView({ behavior: "smooth" })
            }
          >
            Ver o Catálogo
          </ShinyButton>
        </div> */}

        <div className="font-montserrat mt-16 text-xs font-medium text-neutral-500">
          <p>Marcas que Vendemos:</p>
        </div>

        <div className="mt-4 mb-10 w-full max-w-5xl opacity-60 brightness-200 grayscale transition-all duration-500 hover:opacity-100 hover:brightness-100 hover:grayscale-0">
          <LogoLoop
            className="py-2"
            logos={PARTNER_LOGOS} // <--- Usando a constante externa
            speed={60}
            direction="left"
            logoHeight={40}
            gap={60}
            hoverSpeed={10}
            scaleOnHover
            fadeOut
            fadeOutColor="#050505"
            ariaLabel="Tecnologias e Parceiros"
          />
        </div>
      </main>

      <div className="pointer-events-none absolute bottom-0 left-0 z-20 h-48 w-full bg-gradient-to-t from-[#010000] to-transparent" />
    </div>
  );
}
