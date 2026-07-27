"use client";

import { AnimatePresence, motion } from "framer-motion";

export default function SpaTransition({
  children
}) {

  return (

    <AnimatePresence mode="wait">

      <motion.div
        initial={{
  opacity: 0,
  y: 12,
  filter: "blur(6px)"
}}
        animate={{
          opacity: 1,
          y: 0,
          filter: "blur(0px)"
        }}
        exit={{
          opacity: 0,
          y: -8,
          filter: "blur(6px)"
        }}
        transition={{
  duration: 0.65,
  ease: [0.22, 1, 0.36, 1]
}}
      >
        {children}
      </motion.div>

    </AnimatePresence>

  );

}