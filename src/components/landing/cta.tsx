import Image from "next/image";


export default function Cta() {
  return (
    <section className="relative overflow-hidden">
      <div
        className="pointer-events-none absolute bottom-0 left-1/2 -z-10 -mb-24 ml-20 -translate-x-1/2"
        aria-hidden="true"
      >
        <Image
          className="max-w-none"
          src="/images/blurred-shape.svg"
          width={760}
          height={668}
          alt="Blurred shape"
        />
      </div>
      <div className="max-w6xl mx-auto px-4 sm:px-6">
        <div className="bg-linear-to-r from-transparent via-gray-800/50 py-12 md:py-20">
          <div className="mx-auto max-w-3xl text-center">
            <h2
              className="animate-[gradient_6s_linear_infinite] bg-[linear-gradient(to_right,var(--color-gray-200),var(--color-indigo-200),var(--color-gray-50),var(--color-indigo-300),var(--color-gray-200))] bg-[length:200%_auto] bg-clip-text pb-8 font-nacelle text-3xl font-semibold text-transparent md:text-4xl"
              data-aos="fade-up"
            >
              Start your AI-powered learning journey with EdClarity.ai
            </h2>
            <div className="mx-auto max-w-xs sm:flex sm:max-w-none sm:justify-center">
              <div data-aos="fade-up" data-aos-delay={400}>
                <a
                  className="btn group mb-4 inline-flex min-h-13 w-full items-center justify-center px-8 py-4 text-lg font-semibold sm:w-auto bg-linear-to-t from-indigo-600 to-indigo-500 text-white shadow-lg hover:scale-105 transition-transform duration-200"
                  href="/login"
                >
                  <span className="relative inline-flex items-center">
                    Join the Waitlist
                    <span className="ml-2 text-white/70 transition-transform group-hover:translate-x-1">
                      →
                    </span>
                  </span>
                </a>
              </div>
              
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
