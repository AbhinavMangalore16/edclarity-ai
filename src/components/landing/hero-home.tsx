import VideoThumb from "@/public/images/hero-image-01.jpg";
import ModalVideo from "@/components/landing/modal-video";

export default function HeroHome() {
  return (
    <section>
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        {/* Hero content */}
        <div className="py-12 md:py-20">
          {/* Section header */}
          <div className="pb-12 text-center md:pb-20">
            <h1
              className="animate-[gradient_6s_linear_infinite] bg-[linear-gradient(to_right,var(--color-gray-200),var(--color-indigo-200),var(--color-gray-50),var(--color-indigo-300),var(--color-gray-200))] bg-[length:200%_auto] bg-clip-text pb-5 font-nacelle text-4xl font-semibold text-transparent md:text-5xl"
              data-aos="fade-up"
            >
              AI-powered learning infrastructure for modern education
            </h1>
            <div className="mx-auto max-w-3xl">
              <p
                className="mb-8 text-xl text-indigo-200/65"
                data-aos="fade-up"
                data-aos-delay={200}
              >
                Launch live doubt-solving sessions, personalized AI tutoring,
                and secure student access with a single platform built for
                learners, educators, and teams.
              </p>
              <div className="mx-auto max-w-xs sm:flex sm:max-w-none sm:justify-center">
                <div data-aos="fade-up" data-aos-delay={400}>
                  <a
                  className="btn group mb-4 inline-flex min-h-13 w-full items-center justify-center px-8 py-4 text-lg font-semibold bg-linear-to-t from-indigo-600 to-indigo-500 bg-[length:100%_100%] bg-[bottom] text-white shadow-[inset_0px_1px_0px_0px_--theme(--color-white/.16)] hover:bg-[length:100%_150%] sm:mb-0 sm:w-auto"
                  href="/login"
                >
                  <span className="relative inline-flex items-center">
                    Join the Beta
                    <span className="ml-1 tracking-normal text-white/50 transition-transform group-hover:translate-x-0.5">
                      -&gt;
                    </span>
                  </span>
                </a>
                </div>
                
              </div>
            </div>
          </div>

          <ModalVideo
            thumb="/images/hero-image-01.jpg"
            thumbWidth={1104}
            thumbHeight={576}
            thumbAlt="Modal video thumbnail"
            video="videos//videoplayback.mp4"
            videoWidth={1920}
            videoHeight={1080}
          />
        </div>
      </div>
    </section>
  );
}
