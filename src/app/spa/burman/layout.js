"use client";

import { AnimatePresence, motion } from "framer-motion";

export default function SpaLayout({ children }) {

  return (
    <AnimatePresence mode="wait">

      <motion.div
        initial={{
          opacity: 0,
          y: 8
        }}
        animate={{
          opacity: 1,
          y: 0
        }}
        exit={{
          opacity: 0,
          y: -8
        }}
        transition={{
          duration: 0.45,
          ease: "easeOut"
        }}
      >
        {children}
      </motion.div>

    </AnimatePresence>
  );

}