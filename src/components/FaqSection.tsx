"use client";

import { motion } from "motion/react";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqData = [
  {
    value: "item-1",
    question: "Quem nós somos?",
    answer:
      "Somos um serviço online de revenda de citizens, mods de som, configs e etc para Fivem, com a disponibilidade de vendas de contas Rockstar para os que não tem e para os 'banidinhos', oferecendo o melhor preço e melhor serviço desde 2020.",
  },
  {
    value: "item-2",
    question: "Onde estamos localizados?",
    answer:
      "📍 Av. H, 1991A – Conjunto Ceará - https://maps.google.com/?q=-3.776456,-38.615921",
  },
  {
    value: "item-3",
    question: "Como recebo meu produto?",
    answer:
      "Caso more muito longe, enviamos a correspondência por correio, o frete é por conta do CLIENTE. Caso more mais perto, você pode pedir um uber moto que nós entregamos para ele.",
  },
  {
    value: "item-4",
    question: "E se eu tiver algum problema com a compra ou produto?",
    answer:
      "Em caso de problemas ou defeito no produto, nós fazemos o rembolso. Em caso de troca de tamanho para as roupas nós fazemos, basta entregar a peça com a etiqueta.",
  },
];

const FaqSection = () => {
  return (
    <section className="relative my-20 bg-[#010000] py-10">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          viewport={{ once: true }}
          className="mx-auto mb-12 flex max-w-[600px] flex-col items-center text-center"
        >
          <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
            Perguntas Frequentes
          </h2>
          <p className="text-muted-foreground mt-4 text-lg">
            Algumas perguntas básicas sobre a loja e sobre nós.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.7 }}
          viewport={{ once: true }}
          className="mx-auto max-w-2xl"
        >
          <Accordion type="single" collapsible className="w-full">
            {faqData.map((item) => (
              <AccordionItem key={item.value} value={item.value}>
                <AccordionTrigger className="text-left text-lg font-medium">
                  {item.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground text-base leading-relaxed">
                  {item.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </motion.div>
      </div>
    </section>
  );
};

export default FaqSection;
