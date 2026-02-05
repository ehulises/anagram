import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ["'Poppins'", "ui-sans-serif", "system-ui"],
        body: ["'Nunito'", "ui-sans-serif", "system-ui"]
      },
      keyframes: {
        float: {
          "0%": { transform: "translateY(0px)", opacity: "0.6" },
          "50%": { transform: "translateY(-14px)", opacity: "1" },
          "100%": { transform: "translateY(0px)", opacity: "0.6" }
        },
        pop: {
          "0%": { transform: "scale(0.95)", opacity: "0" },
          "100%": { transform: "scale(1)", opacity: "1" }
        }
      },
      animation: {
        float: "float 5s ease-in-out infinite",
        pop: "pop 0.3s ease-out"
      },
      boxShadow: {
        glow: "0 10px 30px rgba(244, 114, 182, 0.35)"
      }
    }
  },
  plugins: []
};

export default config;
